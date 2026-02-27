import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { checkSessionAllowance } from '@/lib/usage';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized: No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });

    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser(token);

    if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    try {
        const allowance = await checkSessionAllowance(user.id);
        return res.status(200).json(allowance);
    } catch (err: any) {
        console.error('Allowance error:', err);
        return res.status(500).json({ error: 'Failed to check allowance' });
    }
}
