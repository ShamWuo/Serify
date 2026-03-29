import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateApiRequest } from '@/lib/usage';

const MASTERY_ORDER: Record<string, number> = { revisit: 0, shaky: 1, developing: 2, solid: 3, mastered: 4 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase admin client not initialized' });
    }

    const { tab = 'all', sort = 'last_seen', topics: topicsParam } = req.query;

    try {
        let query = supabaseAdmin.from('knowledge_nodes').select('*').eq('user_id', userId);

        if (topicsParam && typeof topicsParam === 'string') {
            const categoryIds = topicsParam.split(',').filter(Boolean);
            if (categoryIds.length > 0) {
                query = query.in('category_id', categoryIds);
            }
        }

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

        let filteredNodes = (nodes || []).filter(n => n.is_archived !== true);

        // DEMO MOCK DATA
        if (userId === 'd85252ae-32c2-4a82-a630-46812ed7f5ec' && filteredNodes.length === 0) {
            filteredNodes = [
                { id: 'demo-1', display_name: 'Backpropagation', current_mastery: 'solid', last_seen_at: new Date().toISOString(), session_count: 4, definition: 'Primary algorithm for training NNs.' },
                { id: 'demo-2', display_name: 'Stochastic Gradient Descent', current_mastery: 'developing', last_seen_at: new Date(Date.now() - 86400000).toISOString(), session_count: 2, definition: 'Iterative optimization method.' },
                { id: 'demo-3', display_name: 'Transformer Architecture', current_mastery: 'shaky', last_seen_at: new Date(Date.now() - 172800000).toISOString(), session_count: 1, definition: 'Self-attention based model.' },
                { id: 'demo-4', display_name: 'Attention Mechanism', current_mastery: 'mastered', last_seen_at: new Date(Date.now() - 432000000).toISOString(), session_count: 8, definition: 'Weighting significance of inputs.' }
            ] as any[];
        }

        const sorted = filteredNodes.sort((a, b) => {
            if (sort === 'alpha') return (a.display_name || '').localeCompare(b.display_name || '');
            if (sort === 'session_count') return (b.session_count || 0) - (a.session_count || 0);
            if (sort === 'mastery') return (MASTERY_ORDER[a.current_mastery] || 0) - (MASTERY_ORDER[b.current_mastery] || 0);
            return new Date(b.last_seen_at || 0).getTime() - new Date(a.last_seen_at || 0).getTime();
        });

        const { data: categories } = await supabaseAdmin
            .from('vault_categories')
            .select('*')
            .eq('user_id', userId)
            .order('display_order', { ascending: true });

        const { data: studySets } = await supabaseAdmin
            .from('study_sets')
            .select('*')
            .eq('user_id', userId)
            .order('last_studied_at', { ascending: false });

        return res.status(200).json({
            nodes: sorted,
            categories: categories || [],
            studySets: studySets || [],
            debug: { rawNodes: nodes?.length || 0, filtered: filteredNodes.length, userId }
        });
    } catch (error: any) {
        console.error('Error fetching vault nodes:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

