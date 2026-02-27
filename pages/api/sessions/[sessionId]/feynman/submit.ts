import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, hasEnoughSparks, deductSparks, SPARK_COSTS } from '@/lib/sparks';
import { createClient } from '@supabase/supabase-js';
import { parseJSON } from '@/lib/serify-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== 'string') return res.status(400).json({ error: 'Missing or invalid sessionId' });


    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const sparkCost = SPARK_COSTS.FEYNMAN_SUBMISSION;
    const hasSparks = await hasEnoughSparks(userId, sparkCost);
    if (!hasSparks) {
        return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Sparks to evaluate this explanation.` });
    }

    const { concept, userExplanation } = req.body;

    if (!concept || !userExplanation) {
        return res.status(400).json({ error: 'Missing concept or userExplanation' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    try {
        const { data: pastAttempts, error: fetchError } = await supabase
            .from('feynman_attempts')
            .select('attempt_number')
            .eq('session_id', sessionId)
            .eq('concept_id', concept.id)
            .order('attempt_number', { ascending: false });


        const maxAttemptNumber = pastAttempts && pastAttempts.length > 0 ? pastAttempts[0].attempt_number : 0;
        const currentAttemptNumber = maxAttemptNumber + 1;

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: `You are evaluating a student's Feynman-method explanation of a concept.
Evaluate this explanation as if you are checking whether a non-expert would understand it.

Return as a pure JSON object with no markdown formatting:
{
  "clearParts": "paragraph describing what was explained well and would land with a non-expert",
  "breakdownPoints": "paragraph describing specific moments the explanation would lose a non-expert, with direct quotes from their text",
  "strongExample": "what a strong Feynman explanation of this concept would look like (3-5 sentences)",
  "overallAssessment": "solid" | "developing" | "shaky" | "revisit"
}`
        });

        const promptText = `
Concept: ${concept.name}
Correct understanding (context): ${concept.feedbackNote || 'No specific feedback context.'}

Student's Feynman explanation:
"${userExplanation}"
`;

        const deduction = await deductSparks(userId, sparkCost, 'feynman_evaluate', concept.id);
        if (!deduction.success) {
            return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Sparks to evaluate this explanation.` });
        }

        const result = await model.generateContent(promptText);
        const text = result.response.text();

        let evaluation;
        try {
            evaluation = parseJSON<any>(text);
        } catch (parseError) {
            console.error("Failed to parse Gemini Feynman output:", text);
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }

        const { data: newAttempt, error: insertError } = await supabase
            .from('feynman_attempts')
            .insert({
                session_id: sessionId,
                concept_id: concept.id,
                user_id: userId,
                attempt_number: currentAttemptNumber,
                explanation_text: userExplanation,
                evaluation: evaluation
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return res.status(200).json({ attempt: newAttempt });

    } catch (error: any) {
        console.error('Error evaluating Feynman explanation:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
