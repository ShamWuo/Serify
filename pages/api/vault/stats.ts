import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/sparks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    try {
        const { data: nodes, error } = await supabase
            .from('knowledge_nodes')
            .select('current_mastery')
            .eq('user_id', userId);

        if (error) throw error;

        const stats = { solid: 0, developing: 0, shaky: 0, revisit: 0 };
        (nodes || []).forEach((n) => {
            const m = n.current_mastery as keyof typeof stats;
            if (m in stats) stats[m]++;
        });

        const needsWork = stats.shaky + stats.revisit;
        return res.status(200).json({ stats, needsWork });
    } catch (error: any) {
        console.error('Error fetching vault stats:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
