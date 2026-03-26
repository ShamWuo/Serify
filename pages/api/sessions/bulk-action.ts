import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/usage';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { action, sessions } = req.body;
    // sessions should be an array of { id: string, type: 'flow' | 'reflection' }

    if (!action || !Array.isArray(sessions) || sessions.length === 0) {
        return res.status(400).json({ error: 'Missing action or sessions array' });
    }

    try {
        if (action === 'delete') {
            const flowIds = sessions.filter(s => s.type === 'flow').map(s => s.id);
            const reflectionIds = sessions.filter(s => s.type === 'reflection').map(s => s.id);

            // Verify ownership first (optional but safer)
            // Or just use userId in the delete query

            if (flowIds.length > 0) {
                const { error } = await supabaseAdmin
                    .from('flow_sessions')
                    .delete()
                    .in('id', flowIds)
                    .eq('user_id', userId);
                if (error) throw error;
            }

            if (reflectionIds.length > 0) {
                // Also clear source_session_id in flow_sessions if any
                await supabaseAdmin
                    .from('flow_sessions')
                    .update({ source_session_id: null })
                    .in('source_session_id', reflectionIds)
                    .eq('user_id', userId);

                const { error } = await supabaseAdmin
                    .from('reflection_sessions')
                    .delete()
                    .in('id', reflectionIds)
                    .eq('user_id', userId);
                if (error) throw error;
            }
        } else if (action === 'archive') {
            // Currently archive logic is just a status update if table supports it, 
            // but reflection_sessions doesn't have an 'archived' column usually.
            // For now, we'll just handle delete as requested.
            // If archive is needed, we'd need a migration.
            return res.status(400).json({ error: 'Archive action not implemented yet' });
        }

        return res.status(200).json({ success: true });
    } catch (err: any) {
        console.error('[sessions bulk-action]', err);
        return res.status(500).json({ error: 'Failed to perform bulk action' });
    }
}
