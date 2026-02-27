import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/sparks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PATCH') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId, conceptId } = req.query;
    if (!sessionId || typeof sessionId !== 'string') return res.status(400).json({ error: 'Missing or invalid sessionId' });
    if (!conceptId || typeof conceptId !== 'string') return res.status(400).json({ error: 'Missing or invalid conceptId' });

    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { response } = req.body;
    if (!response || !['got_it', 'still_unclear'].includes(response)) {
        return res.status(400).json({ error: 'Invalid response. Must be got_it or still_unclear.' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    try {
        const { data: updated, error } = await supabase
            .from('concept_explanations')
            .update({
                user_response: response,
                responded_at: new Date().toISOString()
            })
            .eq('session_id', sessionId)
            .eq('concept_id', conceptId)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ success: true, explanation: updated });
    } catch (error: any) {
        console.error('Error updating concept explanation response:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
