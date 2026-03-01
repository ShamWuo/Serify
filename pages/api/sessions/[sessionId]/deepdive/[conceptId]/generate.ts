import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, hasEnoughSparks, deductSparks, SPARK_COSTS } from '@/lib/sparks';
import { createClient } from '@supabase/supabase-js';
import { parseJSON } from '@/lib/serify-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId, conceptId } = req.query;
    if (!sessionId || typeof sessionId !== 'string')
        return res.status(400).json({ error: 'Missing or invalid sessionId' });
    if (!conceptId || typeof conceptId !== 'string')
        return res.status(400).json({ error: 'Missing or invalid conceptId' });

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { concept } = req.body;
    if (!concept) {
        return res.status(400).json({ error: 'Missing concept' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: existing } = await supabase
        .from('deep_dive_lessons')
        .select('*')
        .eq('session_id', sessionId)
        .eq('concept_id', conceptId)
        .maybeSingle();

    if (existing) {
        return res.status(200).json(existing);
    }

    const sparkCost = SPARK_COSTS.CONCEPT_DEEP_DIVE;
    const hasSparks = await hasEnoughSparks(userId, sparkCost);
    if (!hasSparks) {
        return res
            .status(403)
            .json({
                error: 'out_of_sparks',
                message: `You need ${sparkCost} Sparks for a Concept Deep Dive.`
            });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json' },
            systemInstruction: `You are a master teacher generating a 'Deep Dive' guide.
Return JSON:
{
  "title": "string",
  "sections": [{ "heading": "string", "content": "markdown string" }],
  "confirmatoryQuestion": "short-answer question"
}

Sections:
1. "The Core Idea": 2-sentence definition.
2. "Why it Matters": Real-world payoff.
3. "The Mental Model": Analogy/visualization.
4. "Where You Got Stuck": Address misconception.
5. "Component Breakdown": Deconstruction.`
        });

        const promptText = `
Concept: ${concept.name}
Student's struggle/misconception: ${concept.feedbackNote || 'No specific feedback recorded. Treat as a missing concept.'}

Generate the deep dive JSON.
`;

        const deduction = await deductSparks(userId, sparkCost, 'concept_deep_dive', conceptId);
        if (!deduction.success) {
            return res
                .status(403)
                .json({
                    error: 'out_of_sparks',
                    message: `You need ${sparkCost} Sparks for a Concept Deep Dive.`
                });
        }

        const result = await model.generateContent(promptText);
        const text = result.response.text();

        let generatedLesson;
        try {
            generatedLesson = parseJSON<any>(text);
        } catch (parseError) {
            console.error('Failed to parse Gemini Deep Dive output:', text);
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }

        const { data: newDeepDive, error } = await supabase
            .from('deep_dive_lessons')
            .insert({
                session_id: sessionId,
                user_id: userId,
                concept_id: conceptId,
                concept_name: concept.name,
                content: generatedLesson,
                is_completed: false
            })
            .select()
            .single();

        if (error) throw error;
        return res.status(200).json(newDeepDive);
    } catch (error: any) {
        console.error('Error generating deep dive:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
