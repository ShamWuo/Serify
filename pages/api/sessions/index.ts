import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/sparks';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Use a user-scoped client for fetching to respect RLS
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    if (req.method === 'GET') {
        try {
            const [reflectionRes, flowRes] = await Promise.all([
                supabaseUser
                    .from('reflection_sessions')
                    .select('id, title, content_type, status, created_at, completed_at, session_type')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false }),
                supabaseUser
                    .from('flow_sessions')
                    .select(
                        'id, status, initial_plan, started_at, completed_at, created_at, total_sparks_spent, concepts_completed, source_type, source_session_id'
                    )
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
            ]);

            if (reflectionRes.error) {
                console.error('[sessions GET] reflectionRes error:', reflectionRes.error);
                throw reflectionRes.error;
            }
            if (flowRes.error) {
                console.error('[sessions GET] flowRes error:', flowRes.error);
                throw flowRes.error;
            }

            const reflectionSessions = (reflectionRes.data || []).map((s: any) => ({
                id: s.id,
                type: 'reflection' as const,
                title: s.title && s.title !== 'No Learning Material Provided' ? s.title : 'Untitled Analysis',
                contentType: s.content_type,
                status: s.status,
                createdAt: s.created_at,
                completedAt: s.completed_at,
                session_type: s.session_type || 'analysis'
            }));

            const flowSessions = (flowRes.data || []).map((s: any) => {
                const concepts = s.initial_plan?.concepts || [];
                const conceptNames = concepts.map((c: any) => c.conceptName).join(', ');
                const completedCount = (s.concepts_completed || []).length;
                const totalCount = concepts.length;

                return {
                    id: s.id,
                    type: 'flow' as const,
                    sourceType: s.source_type,
                    sourceId: s.source_session_id,
                    title: conceptNames
                        ? `Flow: ${conceptNames.substring(0, 60)}${conceptNames.length > 60 ? '…' : ''}`
                        : 'Flow Mode Session',
                    contentType: 'flow',
                    status: s.status,
                    createdAt: s.created_at,
                    completedAt: s.completed_at,
                    completedCount,
                    totalCount,
                    sparksSpent: s.total_sparks_spent
                };
            });

            const all = [...reflectionSessions, ...flowSessions].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            return res.status(200).json({ sessions: all });
        } catch (err: any) {
            console.error('[sessions GET]', err);
            return res.status(500).json({ error: 'Failed to fetch sessions' });
        }
    }

    if (req.method === 'DELETE') {
        const { sessionId, sessionType } = req.body;
        if (!sessionId || !sessionType) {
            return res.status(400).json({ error: 'Missing sessionId or sessionType' });
        }

        try {
            if (sessionType === 'flow') {
                const { data: session } = await supabaseAdmin
                    .from('flow_sessions')
                    .select('id, user_id')
                    .eq('id', sessionId)
                    .single();

                if (!session || session.user_id !== userId) {
                    return res.status(403).json({ error: 'Forbidden' });
                }

                const { error } = await supabaseAdmin
                    .from('flow_sessions')
                    .delete()
                    .eq('id', sessionId);

                if (error) throw error;
            } else if (sessionType === 'reflection') {
                const { data: session } = await supabaseAdmin
                    .from('reflection_sessions')
                    .select('id, user_id')
                    .eq('id', sessionId)
                    .single();

                if (!session || session.user_id !== userId) {
                    return res.status(403).json({ error: 'Forbidden' });
                }

                await supabaseAdmin
                    .from('flow_sessions')
                    .update({ source_session_id: null })
                    .eq('source_session_id', sessionId)
                    .eq('user_id', userId);

                const { error } = await supabaseAdmin
                    .from('reflection_sessions')
                    .delete()
                    .eq('id', sessionId);

                if (error) throw error;
            } else {
                return res
                    .status(400)
                    .json({ error: 'Invalid sessionType. Must be "flow" or "reflection"' });
            }

            return res.status(200).json({ success: true });
        } catch (err: any) {
            console.error('[sessions DELETE]', err);
            return res.status(500).json({ error: 'Failed to delete session' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
