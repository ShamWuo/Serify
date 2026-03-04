import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/sparks';
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

    const { curriculumId } = req.body;
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

        // Fetch the progress row (use maybeSingle to avoid crash when missing)
        let { data: progress } = await supabaseAdmin
            .from('curriculum_concept_progress')
            .select('*')
            .eq('curriculum_id', curriculumId)
            .eq('concept_id', currentConcept.id)
            .maybeSingle();

        // If no progress row exists, create one now
        if (!progress) {
            const newProgressId = uuidv4();
            const { data: createdProgress } = await supabaseAdmin
                .from('curriculum_concept_progress')
                .insert({
                    id: newProgressId,
                    curriculum_id: curriculumId,
                    user_id: userId,
                    concept_id: currentConcept.id,
                    concept_name: currentConcept.name,
                    status: 'not_started'
                })
                .select()
                .single();
            progress = createdProgress;
        }

        let flowSessionId = progress?.flow_session_id;

        // If no flow session exists for this concept, create one!
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
                    total_sparks_spent: 0,
                    status: 'active'
                })
                .select('id')
                .single();

            if (fsErr || !flowSession) {
                console.error('Failed creating flow session', fsErr);
                return res.status(500).json({ error: 'Failed to create flow session' });
            }

            flowSessionId = flowSession.id;

            // Update progress row with the session ID
            if (progress) {
                await supabaseAdmin
                    .from('curriculum_concept_progress')
                    .update({ flow_session_id: flowSessionId, status: 'in_progress' })
                    .eq('id', progress.id);
            }
        }

        return res.status(200).json({ flowSessionId });
    } catch (error: any) {
        console.error('Error starting curriculum flow:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
