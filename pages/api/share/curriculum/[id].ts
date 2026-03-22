import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS for public sharing, but ONLY return non-sensitive fields
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid curriculum ID' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('learn_mode_curriculum')
            .select('id, title, target_description, outcomes, units, concept_count, estimated_minutes, created_at')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Curriculum not found' });
        }

        // Strip any user_id or private metadata if strictly necessary, 
        // but the select already filters fields.

        return res.status(200).json({ curriculum: data });
    } catch (e) {
        console.error('Sharing API Error:', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
