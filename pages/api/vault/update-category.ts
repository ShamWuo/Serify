import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { authenticateApiRequest } from '@/lib/usage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id, updates } = req.body;

    if (!id) return res.status(400).json({ error: 'Category ID is required' });

    const { data, error } = await supabase
        .from('vault_categories')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error('[update-category] Error:', error);
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
}
