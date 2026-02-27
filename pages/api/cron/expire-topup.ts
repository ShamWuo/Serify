import type { NextApiRequest, NextApiResponse } from 'next';
import { getSparkAdminClient } from '@/lib/sparks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const cronSecret = req.headers['x-cron-secret'];
    if (cronSecret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const sparkAdminClient = getSparkAdminClient();
        const { data: expiredPurchases, error: fetchError } = await sparkAdminClient
            .from('spark_purchases')
            .select('*')
            .lt('expires_at', new Date().toISOString())
            .gt('sparks_remaining', 0);

        if (fetchError) {
            console.error('Error fetching expired purchases:', fetchError);
            return res.status(500).json({ error: 'Failed to fetch expired purchases' });
        }

        if (!expiredPurchases || expiredPurchases.length === 0) {
            return res.status(200).json({ message: 'No expired top-up sparks to process', processed: 0 });
        }

        let processed = 0;
        let totalBreakageRevenueCents = 0;

        for (const purchase of expiredPurchases) {
            const amountToExpire = purchase.sparks_remaining;

            const { data: currentBalance } = await sparkAdminClient
                .from('spark_balances')
                .select('topup_sparks')
                .eq('user_id', purchase.user_id)
                .single();

            if (currentBalance) {
                const newTopupSparks = Math.max(0, currentBalance.topup_sparks - amountToExpire);

                await sparkAdminClient
                    .from('spark_balances')
                    .update({ topup_sparks: newTopupSparks, updated_at: new Date().toISOString() })
                    .eq('user_id', purchase.user_id);
            }

            await sparkAdminClient
                .from('spark_purchases')
                .update({ sparks_remaining: 0 })
                .eq('id', purchase.id);

            await sparkAdminClient
                .from('spark_transactions')
                .insert({
                    user_id: purchase.user_id,
                    amount: -amountToExpire,
                    pool: 'topup',
                    transaction_type: 'expiry_forfeiture',
                    action: 'topup_spark_expiry',
                    reference_id: purchase.id,
                    stripe_payment_intent_id: purchase.stripe_payment_intent_id,
                    balance_after: currentBalance ? Math.max(0, currentBalance.topup_sparks - amountToExpire) : 0,
                    created_at: new Date().toISOString(),
                });

            if (purchase.price_cents && purchase.sparks_granted > 0) {
                const breakagePerSpark = purchase.price_cents / purchase.sparks_granted;
                totalBreakageRevenueCents += Math.round(breakagePerSpark * amountToExpire);
            }

            processed++;
        }

        console.log(`Expired top-up sparks: processed ${processed} purchases, breakage revenue: $${(totalBreakageRevenueCents / 100).toFixed(2)}`);
        return res.status(200).json({
            message: 'Top-up spark expiry complete',
            processed,
            breakageRevenueCents: totalBreakageRevenueCents,
        });
    } catch (error) {
        console.error('Top-up spark expiry job failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
