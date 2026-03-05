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

        // Map AI-generated string IDs to valid UUIDs
        const { v4: uuidv4 } = await import('uuid');
        const idMap = new Map<string, string>();

        curriculumData.units.forEach((unit: any) => {
            unit.concepts.forEach((concept: any) => {
                const newId = uuidv4();
                idMap.set(concept.id, newId);
                concept.id = newId;
            });
        });

        curriculumData.units.forEach((unit: any) => {
            unit.concepts.forEach((concept: any) => {
                if (concept.prerequisiteFor && Array.isArray(concept.prerequisiteFor)) {
                    concept.prerequisiteFor = concept.prerequisiteFor.map((oldId: string) => idMap.get(oldId) || oldId);
                }
            });
        });

        // Update original_units to match the mapped IDs
        curriculumData.original_units = JSON.parse(JSON.stringify(curriculumData.units));

        // Deduct sparks
        const deduction = await deductSparks(user.id, sparkCost, 'curriculum_generation');
        if (!deduction.success) return res.status(403).json({ error: 'out_of_sparks' });

        return res.status(200).json({ curriculum: curriculumData });
    } catch (err: any) {
        console.error('Curriculum generation error:', err);
        return res.status(500).json({ error: err.message || 'Failed to generate curriculum' });
    }
}
