import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/sparks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId, conceptId } = req.query;
    if (!sessionId || typeof sessionId !== 'string')
        return res.status(400).json({ error: 'Missing or invalid sessionId' });

    if (!conceptId || typeof conceptId !== 'string')
        return res.status(400).json({ error: 'Missing or invalid conceptId' });

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
        const { data: deepDive, error } = await supabase
            .from('deep_dive_lessons')
            .select('*')
            .eq('session_id', sessionId)
            .eq('concept_id', conceptId)
            .maybeSingle();

        if (error) throw error;
        if (!deepDive) return res.status(404).json({ error: 'Deep dive lesson not found' });

        return res.status(200).json(deepDive);
    } catch (error: any) {
        console.error('Error fetching deep dive lesson:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
