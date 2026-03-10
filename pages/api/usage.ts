import { NextApiRequest, NextApiResponse } from 'next';
import { checkUsage, authenticateApiRequest, FeatureName } from '@/lib/usage';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { feature } = req.query;

    try {
        if (feature) {
            const result = await checkUsage(userId, feature as FeatureName);
            return res.status(200).json(result);
        } else {
            // Return all usage stats for the user
            const client = supabaseAdmin || supabase;
            const { data: tracking } = await client
                .from('usage_tracking')
                .select('*')
                .eq('user_id', userId)
                .single();
            
            const { data: limits } = await client
                .from('plan_limits')
                .select('*')
                .eq('plan', tracking?.plan || 'free')
                .single();

            return res.status(200).json({ tracking, limits });
        }
    } catch (error) {
        console.error('Usage API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
