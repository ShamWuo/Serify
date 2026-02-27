import type { NextApiRequest, NextApiResponse } from 'next';
import { getSparkAdminClient } from '@/lib/sparks';

const PLAN_SPARK_ALLOWANCE: Record<string, number> = {
    free: 20,
    pro: 150,
    teams: 150,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const cronSecret = req.headers['x-cron-secret'];
    if (cronSecret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const sparkAdminClient = getSparkAdminClient();
        const { data: balances, error: fetchError } = await sparkAdminClient
            .from('spark_balances')
            .select('user_id, subscription_sparks, updated_at');

        if (fetchError) {
            console.error('Error fetching balances for refresh:', fetchError);
            return res.status(500).json({ error: 'Failed to fetch balances' });
        }

        if (!balances || balances.length === 0) {
            return res.status(200).json({ message: 'No users to process', processed: 0 });
        }

        let processed = 0;
        let totalForfeited = 0;

        for (const balance of balances) {

            const { data: profile } = await sparkAdminClient
                .from('profiles')
                .select('subscription_tier')
                .eq('id', balance.user_id)
                .single();

            const plan = profile?.subscription_tier || 'free';
            const monthlyAllowance = PLAN_SPARK_ALLOWANCE[plan] || 20;
            const rolloverCap = monthlyAllowance * 2;

            const currentSubs = balance.subscription_sparks;

            const maxRollover = rolloverCap - monthlyAllowance;
            const rolledOver = Math.min(currentSubs, maxRollover);
            const forfeited = Math.max(0, currentSubs - maxRollover);
            const newBalance = rolledOver + monthlyAllowance;

            await sparkAdminClient
                .from('spark_balances')
                .update({
                    subscription_sparks: newBalance,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', balance.user_id);

            await sparkAdminClient
                .from('spark_transactions')
                .insert({
                    user_id: balance.user_id,
                    amount: monthlyAllowance,
                    pool: 'subscription',
                    transaction_type: 'subscription_refresh',
                    action: 'monthly_subscription_refresh',
                    balance_after: newBalance,
                    created_at: new Date().toISOString(),
                });

            if (forfeited > 0) {
                await sparkAdminClient
                    .from('spark_transactions')
                    .insert({
                        user_id: balance.user_id,
                        amount: -forfeited,
                        pool: 'subscription',
                        transaction_type: 'rollover_cap_forfeiture',
                        action: 'rollover_cap_exceeded',
                        balance_after: newBalance,
                        created_at: new Date().toISOString(),
                    });
                totalForfeited += forfeited;
            }

            processed++;
        }

        console.log(`Subscription refresh: processed ${processed} users, forfeited ${totalForfeited} sparks`);
        return res.status(200).json({
            message: 'Subscription refresh complete',
            processed,
            totalForfeited,
        });
    } catch (error) {
        console.error('Subscription refresh job failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
