import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, hasEnoughSparks, deductSparks, SPARK_COSTS } from '@/lib/sparks';
import { createClient } from '@supabase/supabase-js';

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

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: existing } = await supabase
        .from('concept_explanations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('concept_id', conceptId)
        .maybeSingle();

    if (existing) {
        const { data, error } = await supabase
            .from('concept_explanations')
            .update({
                view_count: existing.view_count + 1,
                last_viewed_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) throw error;
        return res.status(200).json(data);
    }

    const sparkCost = SPARK_COSTS.EXPLAIN_IT_TO_ME;
    const hasSparks = await hasEnoughSparks(userId, sparkCost);
    if (!hasSparks) {
        return res
            .status(403)
            .json({
                error: 'out_of_sparks',
                message: `You need ${sparkCost} Spark for this explanation.`
            });
    }

    const { concept, strongConcepts = [] } = req.body;

    if (!concept) {
        return res.status(400).json({ error: 'Missing concept' });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: `Explain the concept.
Tone: clear, direct, engaging. Use analogies. Length: 3-5 paragraphs.
Return markdown text.`
        });

        const promptText = `
Concept: ${concept.name}
What the student got wrong or missed: ${concept.feedbackNote || 'No specific feedback recorded.'}
Concepts the student understood well (use these as bridges if possible): ${strongConcepts.map((c: any) => c.name).join(', ')}

Write a clear, thorough explanation of this concept. Structure it as:
1. What it is (precise definition)
2. How it works (the mechanism, step by step if applicable)
3. Why it matters
4. How it connects to: [strongest concept the student already knows, if any]
5. The most common misconception about it and why it's wrong
`;

        const deduction = await deductSparks(
            userId,
            sparkCost,
            'explanation_generation',
            conceptId
        );
        if (!deduction.success) {
            return res
                .status(403)
                .json({
                    error: 'out_of_sparks',
                    message: `You need ${sparkCost} Spark for this explanation.`
                });
        }

        const result = await model.generateContent(promptText);
        const content = result.response.text();

        const { data: newExplanation, error } = await supabase
            .from('concept_explanations')
            .insert({
                session_id: sessionId,
                user_id: userId,
                concept_id: conceptId,
                concept_name: concept.name,
                content: content,
                view_count: 1,
                first_viewed_at: new Date().toISOString(),
                last_viewed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json(newExplanation);
    } catch (error: any) {
        console.error('Error generating explanation:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
