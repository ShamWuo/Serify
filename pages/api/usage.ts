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
            
            const client = supabaseAdmin || supabase;
            const { data: tracking, error: fetchError } = await (client as any)
                .from('usage_tracking')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();
            
            if (fetchError || !tracking) {
                console.warn('[Usage API] No tracking found or error, returning default:', fetchError);
                return res.status(200).json({ 
                    tokensUsed: 0, 
                    monthlyLimit: 100, 
                    percentUsed: 0, 
                    plan: 'free',
                    breakdown: {
                        sessions: 0,
                        aiMessages: 0,
                        practice: 0,
                        flowMode: 0,
                        learnMode: 0,
                        flashcards: 0,
                        deepDives: 0,
                        other: 0
                    }
                });
            }

            return res.status(200).json({ 
                tokensUsed: tracking.tokens_used ?? 0,
                monthlyLimit: tracking.monthly_limit ?? 100,
                percentUsed: tracking.monthly_limit ? (tracking.tokens_used / tracking.monthly_limit) * 100 : 0,
                plan: tracking.plan || 'free',
                breakdown: {
                    sessions: tracking.tokens_from_sessions ?? 0,
                    aiMessages: tracking.tokens_from_ai_messages ?? 0,
                    practice: tracking.tokens_from_practice ?? 0,
                    flowMode: tracking.tokens_from_flow_mode ?? 0,
                    learnMode: tracking.tokens_from_learn_mode ?? 0,
                    flashcards: tracking.tokens_from_flashcards ?? 0,
                    deepDives: tracking.tokens_from_deep_dives ?? 0,
                    other: tracking.tokens_from_other ?? 0
                }
            });
        }
    } catch (error: any) {
        console.error('Usage API error:', {
            message: error.message,
            stack: error.stack,
            error: error
        });
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message,
            stack: error.stack
        });
    }
}
