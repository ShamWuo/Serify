import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/sparks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { action, concept_ids } = req.body;
    if (!action || !concept_ids || !Array.isArray(concept_ids) || concept_ids.length === 0) {
        return res.status(400).json({ error: 'Invalid payload' });
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        if (action === 'delete') {
            const { error } = await supabaseAdmin
                .from('knowledge_nodes')
                .delete()
                .in('id', concept_ids)
                .eq('user_id', userId);
            if (error) throw error;
        } else if (action === 'archive') {
            const { error } = await supabaseAdmin
                .from('knowledge_nodes')
                .update({ is_archived: true })
                .in('id', concept_ids)
                .eq('user_id', userId);
            if (error) throw error;
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        return res.status(200).json({ success: true });
    } catch (e) {
        console.error('[bulk-action error]', e);
        return res.status(500).json({ error: 'Failed to perform bulk action' });
    }
}
