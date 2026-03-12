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
            const { data: tracking } = await (client as any)
                .from('usage_tracking')
                .select('*')
                .eq('user_id', userId)
                .single();
            
            if (!tracking) {
                return res.status(200).json({ 
                    tokensUsed: 0, 
                    monthlyLimit: 100, 
                    percentUsed: 0, 
                    plan: 'free' 
                });
            }

            return res.status(200).json({ 
                tokensUsed: tracking.tokens_used,
                monthlyLimit: tracking.monthly_limit,
                percentUsed: tracking.monthly_limit ? (tracking.tokens_used / tracking.monthly_limit) * 100 : 0,
                plan: tracking.plan,
                breakdown: {
                    sessions: tracking.tokens_from_sessions,
                    aiMessages: tracking.tokens_from_ai_messages,
                    practice: tracking.tokens_from_practice,
                    flowMode: tracking.tokens_from_flow_mode,
                    learnMode: tracking.tokens_from_learn_mode,
                    flashcards: tracking.tokens_from_flashcards,
                    deepDives: tracking.tokens_from_deep_dives,
                    other: tracking.tokens_from_other
                }
            });
        }
    } catch (error) {
        console.error('Usage API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
