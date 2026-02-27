import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/sparks';
import { generateConceptSynthesis } from '@/lib/vault';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { nodeId } = req.query;
    if (!nodeId || typeof nodeId !== 'string') return res.status(400).json({ error: 'Missing nodeId' });

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );


    if (req.method === 'GET') {
        try {
            const { data: node, error } = await supabase
                .from('knowledge_nodes')
                .select('*')
                .eq('id', nodeId)
                .eq('user_id', userId)
                .single();

            if (error || !node) return res.status(404).json({ error: 'Node not found' });


            let sessions: any[] = [];
            if (node.session_ids && node.session_ids.length > 0) {
                const { data: sessionRows } = await supabase
                    .from('reflection_sessions')
                    .select('id, title, content_type, created_at, status')
                    .in('id', node.session_ids)
                    .order('created_at', { ascending: false });
                sessions = sessionRows || [];
            }


            const synthesisStale = !node.synthesis_generated_at;
            if (synthesisStale && node.session_count >= 2) {
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );
                generateConceptSynthesis(supabaseAdmin, userId, nodeId).catch(console.error);
            }

            return res.status(200).json({ node, sessions });
        } catch (error: any) {
            console.error('Error fetching vault node:', error);
            return res.status(500).json({ error: error.message || 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
