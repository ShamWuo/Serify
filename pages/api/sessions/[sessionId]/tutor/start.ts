import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest, hasEnoughSparks, deductSparks, SPARK_COSTS } from '@/lib/sparks';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== 'string')
        return res.status(400).json({ error: 'Missing or invalid sessionId' });

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(sessionId)) {
        return res
            .status(400)
            .json({
                error: 'Session ID is not a valid UUID. This session predates AI Tutor support.'
            });
    }

    if (!sessionId) {
        return res.status(400).json({ error: 'Missing sessionId' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    try {
        const { data: existing } = await supabase
            .from('tutor_conversations')
            .select('*')
            .eq('session_id', sessionId)
            .maybeSingle();

        if (existing) {
            return res.status(200).json(existing);
        }

        const sparkCost = SPARK_COSTS.AI_TUTOR_OPEN;
        const hasSparks = await hasEnoughSparks(userId, sparkCost);
        if (!hasSparks) {
            return res
                .status(403)
                .json({
                    error: 'out_of_sparks',
                    message: `You need ${sparkCost} Spark to start an AI Tutor session.`
                });
        }

        const deduction = await deductSparks(userId, sparkCost, 'ai_tutor_start');
        if (!deduction.success) {
            return res
                .status(403)
                .json({
                    error: 'out_of_sparks',
                    message: `You need ${sparkCost} Spark to start an AI Tutor session.`
                });
        }

        const initialMessages: any[] = [];

        const { data: newTutor, error } = await supabase
            .from('tutor_conversations')
            .insert({
                session_id: sessionId,
                user_id: userId,
                messages: initialMessages
            })
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json(newTutor);
    } catch (error: any) {
        console.error('Error starting tutor chat:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
