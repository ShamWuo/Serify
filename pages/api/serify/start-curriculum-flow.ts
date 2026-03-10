import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest, checkUsage, incrementUsage } from '@/lib/usage';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const hasUsage = (await checkUsage(userId, 'flow_sessions')).allowed;
    if (!hasUsage) {
        return res.status(403).json({
            error: 'limit_reached',
            message: 'You have reached your feature limit.'
        });
    }

    const { curriculumId, conceptId } = req.body;
    if (!curriculumId) return res.status(400).json({ error: 'Missing curriculumId' });

    try {
        // Fetch curriculum
        const { data: curriculum, error: currErr } = await supabaseAdmin
            .from('curricula')
            .select('*')
            .eq('id', curriculumId)
            .eq('user_id', userId)
            .maybeSingle();

        if (currErr || !curriculum) {
            console.error('Curriculum not found or error:', currErr);
            return res.status(404).json({ error: 'Curriculum not found' });
        }

        // Get uncompleted concepts
        const allConcepts = curriculum.units.flatMap((u: any) => u.concepts);
        const completedIds = curriculum.completed_concept_ids || [];
        const pendingConcepts = allConcepts.filter((c: any) => !completedIds.includes(c.id));

        if (pendingConcepts.length === 0) {
            return res.status(400).json({ error: 'Curriculum already completed' });
        }

        const currentConcept = pendingConcepts[0];

        // STRATEGY: Try to find any EXISTING active flow session for this curriculum 
        // that the user might have started previously.
        const { data: existingSession } = await supabaseAdmin
            .from('flow_sessions')
            .select('id')
            .eq('user_id', userId)
            .eq('source_type', 'curriculum')
            .eq('source_session_id', curriculumId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        let flowSessionId = existingSession?.id;

        // If no global session for curriculum, check if this specific concept has one
        if (!flowSessionId) {
            const { data: conceptProgress } = await supabaseAdmin
                .from('curriculum_concept_progress')
                .select('flow_session_id')
                .eq('curriculum_id', curriculumId)
                .eq('concept_id', currentConcept.id)
                .maybeSingle();
            flowSessionId = conceptProgress?.flow_session_id;
        }

        // If we STILL don't have a session ID, create a fresh one
        if (!flowSessionId) {
            // Build the plan for Flow Mode
            const planNodes = pendingConcepts.map((c: any) => ({
                conceptId: c.id,
                conceptName: c.name,
                prerequisiteCheck: c.definition,
                currentMastery: c.vaultMasteryState || 'not_started'
            }));

            const sessionId = uuidv4();
            const { data: flowSession, error: fsErr } = await supabaseAdmin
                .from('flow_sessions')
                .insert({
                    id: sessionId,
                    user_id: userId,
                    source_type: 'curriculum',
                    source_session_id: curriculumId,
                    initial_plan: {
                        concepts: planNodes,
                        overallStrategy: `Curriculum: ${curriculum.title}`
                    },
                    concepts_completed: [],
                    status: 'active'
                })
                .select('id')
                .single();

            if (fsErr || !flowSession) {
                console.error('Failed creating flow session', fsErr);
                return res.status(500).json({ error: 'Failed to create flow session' });
            }

            flowSessionId = flowSession.id;

            // Deduct usage once per new session start
            (await incrementUsage(userId, 'flow_sessions').then(() => ({ success: true })));

            // Link this session to the current concept progress
            // (Wait, we should ideally link it to ALL concepts in this flow if we wanted total persistence, 
            // but linking at least the current one is good)
            await supabaseAdmin
                .from('curriculum_concept_progress')
                .upsert({
                    curriculum_id: curriculumId,
                    user_id: userId,
                    concept_id: currentConcept.id,
                    flow_session_id: flowSessionId,
                    status: 'in_progress',
                    concept_name: currentConcept.name
                }, { onConflict: 'curriculum_id,concept_id' });
        }

        return res.status(200).json({ flowSessionId });
    } catch (error: any) {
        console.error('Error starting curriculum flow:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
