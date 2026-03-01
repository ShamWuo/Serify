import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { generateCurriculum } from '@/lib/serify-ai';
import { deductSparks, hasEnoughSparks, SPARK_COSTS } from '@/lib/sparks';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (!process.env.GEMINI_API_KEY)
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: 'Unauthorized: No authorization header' });
    const token = authHeader.replace('Bearer ', '');

    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const {
        data: { user },
        error: authError
    } = await supabaseWithAuth.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const sparkCost = SPARK_COSTS.CURRICULUM_GENERATION;
    const hasSparks = await hasEnoughSparks(user.id, sparkCost);
    if (!hasSparks)
        return res
            .status(403)
            .json({
                error: 'out_of_sparks',
                message: `You need ${sparkCost} Sparks to build a curriculum.`
            });

    const { userInput, inputType } = req.body;
    if (!userInput || !inputType)
        return res.status(400).json({ error: 'Missing userInput or inputType' });

    try {
        // Fetch vault context
        const { data: knowledgeNodes } = await supabaseWithAuth
            .from('knowledge_nodes')
            .select('canonical_name, current_mastery')
            .eq('user_id', user.id);

        const vaultContext = {
            strongConcepts: [] as { name: string }[],
            shakyConcepts: [] as { name: string }[],
            revisitConcepts: [] as { name: string }[]
        };

        if (knowledgeNodes) {
            knowledgeNodes.forEach((n) => {
                const mastery = (n.current_mastery || '').toLowerCase();
                if (mastery.includes('strong') || mastery === 'solid') {
                    vaultContext.strongConcepts.push({ name: n.canonical_name });
                } else if (mastery.includes('shallow') || mastery === 'shaky') {
                    vaultContext.shakyConcepts.push({ name: n.canonical_name });
                } else if (mastery === 'revisit') {
                    vaultContext.revisitConcepts.push({ name: n.canonical_name });
                }
            });
        }

        const { data: profile } = await supabaseWithAuth
            .from('profiles')
            .select('preferences')
            .eq('id', user.id)
            .single();

        const userProfile = {
            userType: profile?.preferences?.userType,
            learningContext: profile?.preferences?.learningContext
        };

        // Generate curriculum
        const curriculumData = await generateCurriculum(
            userInput,
            inputType,
            vaultContext,
            userProfile
        );

        // Deduct sparks
        const deduction = await deductSparks(user.id, sparkCost, 'curriculum_generation');
        if (!deduction.success) return res.status(403).json({ error: 'out_of_sparks' });

        // Save curriculum
        const { data: savedCurriculum, error: saveError } = await supabaseWithAuth
            .from('curricula')
            .insert({
                user_id: user.id,
                title: curriculumData.title,
                user_input: curriculumData.user_input,
                input_type: curriculumData.input_type,
                target_description: curriculumData.target_description,
                outcomes: curriculumData.outcomes,
                scope_note: curriculumData.scope_note,
                units: curriculumData.units,
                concept_count: curriculumData.concept_count,
                estimated_minutes: curriculumData.estimated_minutes,
                original_units: curriculumData.original_units,
                edit_count: curriculumData.edit_count,
                status: 'active',
                recommended_start_index: curriculumData.recommended_start_index,
                current_concept_index: curriculumData.current_concept_index,
                completed_concept_ids: curriculumData.completed_concept_ids,
                skipped_concept_ids: curriculumData.skipped_concept_ids,
                total_sparks_spent: sparkCost
            })
            .select('id')
            .single();

        if (saveError || !savedCurriculum) {
            console.error('Error saving curriculum:', saveError);
            throw saveError || new Error('Failed to save curriculum');
        }

        // Create concept progress rows
        let progressRows: any[] = [];
        curriculumData.units.forEach((unit) => {
            unit.concepts.forEach((concept) => {
                progressRows.push({
                    curriculum_id: savedCurriculum.id,
                    user_id: user.id,
                    concept_id: concept.id,
                    concept_name: concept.name,
                    status: 'not_started'
                });
            });
        });

        if (progressRows.length > 0) {
            const { error: progressError } = await supabaseWithAuth
                .from('curriculum_concept_progress')
                .insert(progressRows);
            if (progressError) {
                console.error('Error saving curriculum progress rows:', progressError);
                // Non-fatal if we saved the top-level curriculum, but ideally we should retry or fail
            }
        }

        return res.status(200).json({ curriculumId: savedCurriculum.id });
    } catch (err: any) {
        console.error('Curriculum generation error:', err);
        return res.status(500).json({ error: err.message || 'Failed to generate curriculum' });
    }
}
