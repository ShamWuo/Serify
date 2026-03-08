import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/sparks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, concept_ids } = req.body;
    if (!name || !concept_ids || !Array.isArray(concept_ids) || concept_ids.length === 0) {
        return res.status(400).json({ error: 'Invalid payload' });
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { data, error } = await supabaseAdmin
            .from('study_sets')
            .insert({
                user_id: userId,
                name,
                concept_ids,
                last_studied_at: null
            })
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ studySet: data });
    } catch (e) {
        console.error('[study-sets create error]', e);
        return res.status(500).json({ error: 'Failed to create study set' });
    }
}
