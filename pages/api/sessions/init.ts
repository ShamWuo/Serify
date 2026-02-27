import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/sparks';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const user = await authenticateApiRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, contentType, content, difficulty = 'medium' } = req.body;

    if (!title || !contentType) {
        return res.status(400).json({ message: 'Title and content type are required' });
    }


    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });

    try {
        const { data, error } = await supabase
            .from('reflection_sessions')
            .insert({
                user_id: user,
                title,
                content_type: contentType,
                content: content || null,
                difficulty,
                status: 'processing'
            })
            .select()
            .single();

        if (error) {
            console.error('Failed to initialize session:', error);
            return res.status(500).json({ message: 'Failed to initialize session' });
        }

        return res.status(200).json({ session: data });
    } catch (error) {
        console.error('Init session error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
