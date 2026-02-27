import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/sparks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== 'string') return res.status(400).json({ error: 'Missing or invalid sessionId' });


    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(sessionId)) {
        return res.status(404).json({ error: 'Practice quiz not found' });
    }
    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    try {
        const { data: quiz, error } = await supabase
            .from('practice_quizzes')
            .select('*')
            .eq('session_id', sessionId)
            .maybeSingle();

        if (error) throw error;
        if (!quiz) return res.status(404).json({ error: 'Practice quiz not found' });

        return res.status(200).json(quiz);
    } catch (error: any) {
        console.error('Error fetching practice quiz:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
