import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/usage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let userId: string | null = null;
    try {
        userId = await authenticateApiRequest(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Mock data for demo user
        if (userId === 'demo-user') {
            return res.status(200).json({ 
                stats: { solid: 18, developing: 24, shaky: 12, revisit: 6 }, 
                needsWork: 18 
            });
        }

        const token = req.headers.authorization?.split(' ').pop();
        
        if (!token) {
             return res.status(401).json({ error: 'Missing token' });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase configuration missing');
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: nodes, error } = await supabase
            .from('knowledge_nodes')
            .select('current_mastery')
            .eq('user_id', userId);

        if (error) {
            console.error('Database error in vault stats:', error);
            throw error;
        }

        const stats = { solid: 0, developing: 0, shaky: 0, revisit: 0 };
        (nodes || []).forEach((n: any) => {
            const m = n.current_mastery as string;
            if (m === 'solid') stats.solid++;
            else if (m === 'developing') stats.developing++;
            else if (m === 'shaky') stats.shaky++;
            else if (m === 'revisit') stats.revisit++;
            else if (m === 'mastered') stats.solid++; // Backup for common alias
        });

        const needsWork = stats.shaky + stats.revisit;
        return res.status(200).json({ stats, needsWork });
    } catch (error: any) {
        console.error('Error fetching vault stats:', {
            message: error.message,
            userId,
            stack: error.stack
        });
        return res.status(500).json({ 
            error: 'Failed to fetch vault stats',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    }
}
