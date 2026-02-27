import type { NextApiRequest, NextApiResponse } from 'next';
import { sparkAdminClient } from '@/lib/sparks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    const cronSecret = req.headers['x-cron-secret'];
    if (cronSecret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {

        const { data: expiredGrants, error: fetchError } = await sparkAdminClient
            .from('spark_grants')
            .select('*')
            .lt('expires_at', new Date().toISOString())
            .gt('sparks_remaining', 0);

        if (fetchError) {
            console.error('Error fetching expired grants:', fetchError);
            return res.status(500).json({ error: 'Failed to fetch expired grants' });
        }

        if (!expiredGrants || expiredGrants.length === 0) {
            return res.status(200).json({ message: 'No expired trial sparks to process', processed: 0 });
        }

        let processed = 0;

        for (const grant of expiredGrants) {
            const amountToExpire = grant.sparks_remaining;

            const { data: currentBalance } = await sparkAdminClient
                .from('spark_balances')
                .select('trial_sparks')
                .eq('user_id', grant.user_id)
                .single();

            if (currentBalance) {
                const newTrialSparks = Math.max(0, currentBalance.trial_sparks - amountToExpire);

                await sparkAdminClient
                    .from('spark_balances')
                    .update({ trial_sparks: newTrialSparks, updated_at: new Date().toISOString() })
                    .eq('user_id', grant.user_id);
            }

            await sparkAdminClient
                .from('spark_grants')
                .update({ sparks_remaining: 0 })
                .eq('id', grant.id);

            await sparkAdminClient
                .from('spark_transactions')
                .insert({
                    user_id: grant.user_id,
                    amount: -amountToExpire,
                    pool: 'trial',
                    transaction_type: 'expiry_forfeiture',
                    action: 'trial_spark_expiry',
                    reference_id: grant.id,
                    balance_after: currentBalance ? Math.max(0, currentBalance.trial_sparks - amountToExpire) : 0,
                    created_at: new Date().toISOString(),
                });

            processed++;
        }

        console.log(`Expired trial sparks: processed ${processed} grants`);
        return res.status(200).json({ message: 'Trial spark expiry complete', processed });
    } catch (error) {
        console.error('Trial spark expiry job failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
