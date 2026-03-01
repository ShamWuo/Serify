import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/sparks';

const MASTERY_ORDER: Record<string, number> = { revisit: 0, shaky: 1, developing: 2, solid: 3 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { tab = 'all', sort = 'last_seen' } = req.query;

    try {
        let query = supabaseAdmin.from('knowledge_nodes').select('*').eq('user_id', userId);

        if (tab === 'needs_work') {
            query = query.in('current_mastery', ['shaky', 'revisit']);
        } else if (tab === 'solid') {
            query = query.eq('current_mastery', 'solid');
        }

        const { data: nodes, error } = await query;
        if (error) {
            console.error('knowledge_nodes fetch error:', error);
            throw error;
        }

        console.log(
            `[vault/nodes] userId=${userId} tab=${tab} sort=${sort} found=${nodes?.length ?? 0}`
        );

        const sorted = (nodes || []).sort((a, b) => {
            if (sort === 'alpha') {
                return (a.display_name || '').localeCompare(b.display_name || '');
            } else if (sort === 'session_count') {
                return (b.session_count || 0) - (a.session_count || 0);
            } else if (sort === 'mastery') {
                return (
                    (MASTERY_ORDER[a.current_mastery] || 0) -
                    (MASTERY_ORDER[b.current_mastery] || 0)
                );
            }

            return (
                new Date(b.last_seen_at || 0).getTime() - new Date(a.last_seen_at || 0).getTime()
            );
        });

        const { data: topics } = await supabaseAdmin
            .from('concept_topics')
            .select('*')
            .eq('user_id', userId)
            .order('last_updated_at', { ascending: false });

        return res.status(200).json({ nodes: sorted, topics: topics || [] });
    } catch (error: any) {
        console.error('Error fetching vault nodes:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
