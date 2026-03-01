import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { authenticateApiRequest } from '@/lib/sparks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { curriculumId } = req.body;
    if (!curriculumId) return res.status(400).json({ error: 'Missing curriculumId' });

    try {
        // Fetch curriculum
        const { data: curriculum, error: currErr } = await supabase
            .from('curricula')
            .select('*')
            .eq('id', curriculumId)
            .eq('user_id', userId)
            .single();

        if (currErr || !curriculum) return res.status(404).json({ error: 'Curriculum not found' });

        // Get uncompleted concepts
        const allConcepts = curriculum.units.flatMap((u: any) => u.concepts);
        const completedIds = curriculum.completed_concept_ids || [];
        const pendingConcepts = allConcepts.filter((c: any) => !completedIds.includes(c.id));

        if (pendingConcepts.length === 0) {
            return res.status(400).json({ error: 'Curriculum already completed' });
        }

        const currentConcept = pendingConcepts[0];

        // Fetch the progress row
        const { data: progress, error: progErr } = await supabase
            .from('curriculum_concept_progress')
            .select('*')
            .eq('curriculum_id', curriculumId)
            .eq('concept_path_id', currentConcept.id)
            .single();

        let flowSessionId = progress?.flow_session_id;

        // If no flow session exists for this concept, create one!
        if (!flowSessionId) {
            // Build the plan for Flow Mode
            const planNodes = pendingConcepts.map((c: any) => ({
                conceptId: c.id, // Using the local ID from curriculum UI as pseudo-concept ID
                conceptName: c.name,
                prerequisiteCheck: c.definition,
                currentMastery: c.vaultMasteryState || 'not_started'
            }));

            const { data: flowSession, error: fsErr } = await supabase
                .from('flow_sessions')
                .insert({
                    user_id: userId,
                    source_type: 'curriculum',
                    source_id: curriculumId,
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
                await supabase
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
