import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { authenticateApiRequest } from '@/lib/usage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
        display_name,
        definition,
        category_id,
        parent_concept_id,
        is_sub_concept,
        importance = 'medium'
    } = req.body;

    if (!display_name) {
        return res.status(400).json({ error: 'Concept name is required' });
    }

    // Generate a simple canonical name (lowercase, no special chars)
    const canonical_name = display_name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const { data, error } = await supabase
        .from('knowledge_nodes')
        .insert({
            user_id: userId,
            canonical_name,
            display_name,
            definition,
            category_id: category_id || null,
            parent_concept_id: parent_concept_id || null,
            is_sub_concept: !!is_sub_concept,
            current_mastery: 'developing', // Default for manually added
            added_manually: true,
            importance,
            last_seen_at: new Date().toISOString(),
            first_seen_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('[add-node] Error:', error);
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
}
