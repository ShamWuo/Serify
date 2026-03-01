import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest, deductSparks, SPARK_COSTS } from '@/lib/sparks';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const user = await authenticateApiRequest(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const curriculumData = req.body;

        if (!curriculumData || !curriculumData.title || !curriculumData.units) {
            return res.status(400).json({ error: 'Invalid curriculum data' });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        const sparkCost = SPARK_COSTS.CURRICULUM_GENERATION || 2;
        await deductSparks(user, sparkCost, 'curriculum_generation');

        const { data: savedCurriculum, error: saveError } = await supabase
            .from('curricula')
            .insert({
                user_id: user,
                title: curriculumData.title,
                target_description: curriculumData.target_description,
                scope_note: curriculumData.scope_note || null,
                outcomes: curriculumData.outcomes,
                recommended_start_index: curriculumData.recommended_start_index || 0,
                status: 'draft'
            })
            .select()
            .single();

        if (saveError) {
            console.error('Save curriculum error:', saveError);
            throw saveError;
        }

        const unitPromises = curriculumData.units.map(async (unit: any) => {
            const { data: savedUnit, error: unitError } = await supabase
                .from('curriculum_units')
                .insert({
                    curriculum_id: savedCurriculum.id,
                    unit_number: unit.unitNumber,
                    title: unit.unitTitle,
                    summary: unit.unitSummary
                })
                .select()
                .single();

            if (unitError) throw unitError;

            const nodePromises = unit.concepts.map(async (concept: any) => {
                let nodeState = concept.vaultMasteryState || 'none';
                if (nodeState === 'strong') nodeState = 'solid';

                return supabase.from('curriculum_nodes').insert({
                    curriculum_id: savedCurriculum.id,
                    unit_id: savedUnit.id,
                    concept_name: concept.name,
                    definition: concept.definition,
                    difficulty: concept.difficulty,
                    estimated_minutes: concept.estimatedMinutes,
                    is_prerequisite: concept.isPrerequisite,
                    prerequisite_for: concept.prerequisiteFor || [],
                    why_included: concept.whyIncluded,
                    warning_note:
                        concept.misconceptionRisk === 'high' ? 'High misconception risk' : null,
                    order_index: concept.orderIndex,
                    status: nodeState === 'solid' ? 'mastered' : 'pending'
                });
            });

            await Promise.all(nodePromises);
        });

        await Promise.all(unitPromises);

        res.status(200).json({ curriculumId: savedCurriculum.id });
    } catch (error: any) {
        console.error('Error saving curriculum:', error);
        res.status(500).json({ message: 'Failed to save curriculum' });
    }
}
