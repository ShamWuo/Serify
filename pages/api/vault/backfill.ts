import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/usage';
import { updateVaultHierarchy } from '@/lib/vault';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // 1. Fetch Reflection Sessions concepts
        const { data: sessions, error: sessErr } = await supabaseAdmin
            .from('reflection_sessions')
            .select('id')
            .eq('user_id', userId);

        let reflectionConcepts: any[] = [];
        if (!sessErr && sessions && sessions.length > 0) {
            const sessionIds = sessions.map((s: any) => s.id);
            const { data: rConcepts, error: rConceptErr } = await supabaseAdmin
                .from('concepts')
                .select('id, session_id, name, description')
                .in('session_id', sessionIds);
            if (!rConceptErr && rConcepts) {
                reflectionConcepts = rConcepts;
            }
        }

        // 2. Fetch Flow Sessions concepts
        const { data: flowSessions, error: flowErr } = await supabaseAdmin
            .from('flow_mode_session')
            .select('id, initial_plan, concepts_completed')
            .eq('user_id', userId);

        let flowConcepts: any[] = [];
        if (!flowErr && flowSessions) {
            flowSessions.forEach((fs: any) => {
                const completedIds = fs.concepts_completed || [];
                const allConcepts = fs.initial_plan?.concepts || [];
                allConcepts.forEach((c: any) => {
                    if (completedIds.includes(c.conceptId)) {
                        flowConcepts.push({
                            id: c.conceptId,
                            session_id: fs.id,
                            name: c.conceptName,
                            description: c.definition || ''
                        });
                    }
                });
            });
        }

        const allAvailableConcepts = [...reflectionConcepts, ...flowConcepts];

        if (allAvailableConcepts.length === 0) {
            return res.status(200).json({ backfilled: 0, message: 'No concepts found in sessions' });
        }

        const { data: existingNodes } = await supabaseAdmin
            .from('knowledge_nodes')
            .select('canonical_name')
            .eq('user_id', userId);

        const existingNames = new Set((existingNodes || []).map((n: any) => n.canonical_name));

        const now = new Date().toISOString();
        const toInsert = allAvailableConcepts
            .filter((c: any) => !existingNames.has(c.name.toLowerCase()))
            .map((c: any) => ({
                id: crypto.randomUUID(),
                user_id: userId,
                canonical_name: c.name.toLowerCase(),
                display_name: c.name,
                definition: c.description || '',
                current_mastery: 'revisit',
                mastery_history: [],
                session_count: 1,
                session_ids: [c.session_id] as any,
                hint_request_count: 0,
                skip_count: 0,
                first_seen_at: now,
                last_seen_at: now,
                created_at: now,
                updated_at: now
            }));

        if (toInsert.length === 0) {
            return res.status(200).json({ backfilled: 0, message: 'Vault already up to date' });
        }

        let written = 0;
        const BATCH = 25;
        for (let i = 0; i < toInsert.length; i += BATCH) {
            const batch = toInsert.slice(i, i + BATCH);
            const { error: insertErr } = await supabaseAdmin.from('knowledge_nodes').insert(batch);
            if (insertErr) {
                console.error('Batch insert error:', insertErr);
            } else {
                written += batch.length;
            }
        }

        if (written > 0) {
            updateVaultHierarchy(supabaseAdmin, userId).catch(console.error);
        }

        return res.status(200).json({ backfilled: written, total: toInsert.length });
    } catch (err: any) {
        console.error('Vault backfill error:', err);
        return res.status(500).json({ error: err.message || 'Backfill failed' });
    }
}
