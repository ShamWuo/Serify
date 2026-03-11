import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(455).json({ error: 'Method not allowed' });

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { id, updates } = req.body;

    if (!id) return res.status(400).json({ error: 'Category ID is required' });

    const { data, error } = await supabase
        .from('vault_categories')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) {
        console.error('[update-category] Error:', error);
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
}
