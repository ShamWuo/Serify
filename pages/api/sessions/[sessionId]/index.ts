import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/sparks';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'Missing sessionId' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    });

    try {
        const [sessionRes, conceptsRes, questionsRes] = await Promise.all([
            supabase
                .from('reflection_sessions')
                .select('*')
                .eq('id', sessionId)
                .single(),
            supabase
                .from('concepts')
                .select('*')
                .eq('session_id', sessionId),
            supabase
                .from('assessment_questions')
                .select('*')
                .eq('session_id', sessionId)
        ]);

        if (sessionRes.error || !sessionRes.data) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const session = sessionRes.data;
        if (session.user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        return res.status(200).json({
            id: session.id,
            title: session.title,
            contentType: session.content_type,
            content: session.content,
            difficulty: session.difficulty,
            status: session.status,
            concepts: (conceptsRes.data || []).map(c => ({
                id: c.id,
                name: c.name,
                definition: c.definition,
                importance: c.importance,
                misconception_risk: c.misconception_risk
            })),
            questions: (questionsRes.data || []).map(q => ({
                id: q.id,
                target_concept_id: q.target_concept_id,
                type: q.type,
                text: q.text
            }))
        });
    } catch (error) {
        console.error('Fetch session error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
