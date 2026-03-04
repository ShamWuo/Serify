import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest } from '@/lib/sparks';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { auth: { persistSession: false, autoRefreshToken: false } }
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { sessionId, conceptId } = req.query;
    if (!sessionId || !conceptId) {
        return res.status(400).json({ error: 'Missing sessionId or conceptId' });
    }

    const { data, error } = await supabaseAdmin
        .from('flow_steps')
        .select('*')
        .eq('flow_session_id', sessionId as string)
        .eq('concept_id', conceptId as string)
        .order('step_number', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ steps: data || [] });
}
