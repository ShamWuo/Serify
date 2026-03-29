import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest, incrementUsage } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { findOrCreateConceptNode } from '@/lib/vault';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const userId = await authenticateApiRequest(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const usage = await incrementUsage(userId, 'curricula');
        if (!usage.allowed) {
            return res.status(403).json({
                error: 'limit_reached',
                message: 'You have reached your feature limit.'
            });
        }

        const curriculumData = req.body;

        if (!curriculumData || !curriculumData.title) {
            return res.status(400).json({ error: 'Invalid curriculum data' });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        const userInput =
            curriculumData.user_input || curriculumData.title || '';
        const units = Array.isArray(curriculumData.units) ? curriculumData.units : [];
        const originalUnits = Array.isArray(curriculumData.original_units)
            ? curriculumData.original_units
            : (units.length > 0 ? units : []);
        
        const { v4: uuidv4 } = await import('uuid');
        const conceptCount = units.reduce(
            (sum: number, u: { concepts?: unknown[] }) => sum + (u.concepts?.length ?? 0),
            0
        );

        // Pre-validate for DB constraints
        const safeUserInput = (userInput || '').trim() || 'Untitled Input';
        // title column is VARCHAR(255) in migration 20260226211850_add_learn_mode.sql
        const safeTitle = (curriculumData.title || safeUserInput).slice(0, 250); 
        
        if (!userInput || userInput.trim() === '') {
            console.warn('[SaveCurriculum] user_input was missing, using fallback:', safeUserInput);
        }

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

        if (curriculumData.schedule && Array.isArray(curriculumData.schedule)) {
            curriculumData.schedule.forEach((item: any) => {
                if (idMap.has(item.concept_id)) {
                    item.concept_id = idMap.get(item.concept_id);
                }
            });
        }

        const totalEstimatedMinutes = units.reduce(
            (sum: number, u: { concepts?: any[] }) => sum + (u.concepts?.reduce((s, c) => s + (c.estimated_minutes || 15), 0) ?? 0),
            0
        );

        const title = curriculumData.title || userInput || 'Untitled Curriculum';

        console.log('[SaveCurriculum] Attempting insert with:', {
            user_id: userId,
            user_input: safeUserInput,
            title: safeTitle,
            unitCount: units.length,
            conceptCount
        });

        const { data: savedCurriculum, error: saveError } = await supabase
            .from('curricula')
            .insert({
                user_id: userId,
                user_input: safeUserInput,
                title: safeTitle,
                target_description: curriculumData.target_description || `Learning path for ${safeTitle}`,
                scope_note: curriculumData.scope_note || null,
                outcomes: curriculumData.outcomes ?? [],
                units,
                original_units: originalUnits,
                concept_count: conceptCount,
                estimated_minutes: totalEstimatedMinutes,
                recommended_start_index: curriculumData.recommended_start_index ?? 0,
                deadline: curriculumData.deadline || null,
                schedule: curriculumData.schedule || null,
                status: 'draft',
                input_type: curriculumData.input_type || 'text'
            })
            .select()
            .single();

        if (saveError || !savedCurriculum) {
            console.error('[SaveCurriculum] Error saving base curriculum:', saveError);
            return res.status(500).json({ error: 'Failed to save curriculum', details: saveError });
        }

        // Initialize progress rows for concepts
        const progressRows: any[] = [];
        const seenConceptIds = new Set<string>();
        
        units.forEach((unit: any) => {
            (unit.concepts || []).forEach((concept: any) => {
                const conceptId = concept.id || concept.name?.toLowerCase().replace(/\s+/g, '_');
                if (conceptId && !seenConceptIds.has(conceptId)) {
                    seenConceptIds.add(conceptId);
                    progressRows.push({
                        id: uuidv4(),
                        curriculum_id: savedCurriculum.id,
                        user_id: userId,
                        concept_id: conceptId,
                        concept_name: concept.name || 'Unnamed Concept',
                        status: 'not_started'
                    });
                }
            });
        });

        if (progressRows.length > 0) {
            const { error: progressError } = await supabase
                .from('curriculum_concept_progress')
                .insert(progressRows);
            if (progressError) {
                console.error('[SaveCurriculum] Error creating concept progress rows:', progressError);
            }
        }

        
        try {
            for (const unit of units) {
                for (const concept of (unit.concepts || [])) {
                    await findOrCreateConceptNode(
                        supabase as any, 
                        userId, 
                        concept.name, 
                        savedCurriculum.id, 
                        concept.definition || ''
                    );
                }
            }
        } catch (vaultErr) {
            console.error('Error populating vault from curriculum:', vaultErr);
            
        }

        res.status(200).json({ curriculumId: savedCurriculum.id });
    } catch (error: any) {
        console.error('Error saving curriculum:', error);
        res.status(500).json({ message: 'Failed to save curriculum' });
    }
}
