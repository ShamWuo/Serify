import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const cronSecret = req.headers['x-cron-secret'];
    if (cronSecret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { data, error } = await supabase.rpc('reset_expired_usage');

        if (error) {
            console.error('Error resetting expired usage:', error);
            return res.status(500).json({ error: 'Failed to reset usage' });
        }

        return res.status(200).json({ message: 'Usage reset complete' });
    } catch (error) {
        console.error('Usage reset job failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
