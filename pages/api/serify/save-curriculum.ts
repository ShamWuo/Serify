import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest, deductSparks, SPARK_COSTS } from '@/lib/sparks';
import { createClient } from '@supabase/supabase-js';
import { findOrCreateConceptNode } from '@/lib/vault';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const user = await authenticateApiRequest(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const curriculumData = req.body;

        if (!curriculumData || !curriculumData.title) {
            return res.status(400).json({ error: 'Invalid curriculum data' });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        const sparkCost = SPARK_COSTS.CURRICULUM_GENERATION || 2;
        await deductSparks(user, sparkCost, 'curriculum_generation');

        const userInput =
            curriculumData.user_input ?? curriculumData.title ?? '';
        const units = Array.isArray(curriculumData.units) ? curriculumData.units : [];
        const originalUnits = Array.isArray(curriculumData.original_units)
            ? curriculumData.original_units
            : units;
        const { v4: uuidv4 } = await import('uuid');
        const conceptCount = units.reduce(
            (sum: number, u: { concepts?: unknown[] }) => sum + (u.concepts?.length ?? 0),
            0
        );

        // Safety net: remap any non-UUID concept IDs to valid UUIDs
        const idMap = new Map<string, string>();
        units.forEach((unit: any) => {
            (unit.concepts || []).forEach((concept: any) => {
                if (!concept.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(concept.id)) {
                    const newId = uuidv4();
                    idMap.set(concept.id, newId);
                    concept.id = newId;
                }
            });
        });
        units.forEach((unit: any) => {
            (unit.concepts || []).forEach((concept: any) => {
                if (concept.prerequisiteFor && Array.isArray(concept.prerequisiteFor)) {
                    concept.prerequisiteFor = concept.prerequisiteFor.map((oldId: string) => idMap.get(oldId) || oldId);
                }
            });
        });

        const totalEstimatedMinutes = units.reduce(
            (sum: number, u: { concepts?: any[] }) => sum + (u.concepts?.reduce((s, c) => s + (c.estimated_minutes || 15), 0) ?? 0),
            0
        );

        const { data: savedCurriculum, error: saveError } = await supabase
            .from('curricula')
            .insert({
                user_id: user,
                user_input: userInput,
                title: curriculumData.title,
                target_description: curriculumData.target_description,
                scope_note: curriculumData.scope_note || null,
                outcomes: curriculumData.outcomes ?? [],
                units,
                original_units: originalUnits,
                concept_count: conceptCount,
                estimated_minutes: totalEstimatedMinutes,
                recommended_start_index: curriculumData.recommended_start_index ?? 0,
                status: 'draft'
            })
            .select()
            .single();

        if (saveError) {
            console.error('Save curriculum error:', saveError);
            throw saveError;
        }

        // Create curriculum_concept_progress rows for each concept
        const progressRows: any[] = [];
        units.forEach((unit: any) => {
            (unit.concepts || []).forEach((concept: any) => {
                progressRows.push({
                    id: uuidv4(),
                    curriculum_id: savedCurriculum.id,
                    user_id: user,
                    concept_id: concept.id,
                    concept_name: concept.name,
                    status: 'not_started'
                });
            });
        });

        if (progressRows.length > 0) {
            const { error: progressError } = await supabase
                .from('curriculum_concept_progress')
                .insert(progressRows);
            if (progressError) {
                console.error('Error creating progress rows:', progressError);
                // Non-fatal: the curriculum itself was saved, progress rows can be recovered
            }
        }

        // --- POPULATE CONCEPT VAULT (KNOWLEDGE NODES) ---
        try {
            for (const unit of units) {
                for (const concept of (unit.concepts || [])) {
                    await findOrCreateConceptNode(
                        supabase, 
                        user, 
                        concept.name, 
                        savedCurriculum.id, 
                        concept.definition || ''
                    );
                }
            }
        } catch (vaultErr) {
            console.error('Error populating vault from curriculum:', vaultErr);
            // Non-fatal
        }

        res.status(200).json({ curriculumId: savedCurriculum.id });
    } catch (error: any) {
        console.error('Error saving curriculum:', error);
        res.status(500).json({ message: 'Failed to save curriculum' });
    }
}
