import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, deductSparks, hasEnoughSparks, SPARK_COSTS } from '@/lib/sparks';
import { parseJSON } from '@/lib/serify-ai';
import { updateConceptMastery, findOrCreateConceptNode } from '@/lib/vault';
import { MasteryState } from '@/types/serify';
import { createClient } from '@supabase/supabase-js';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { answerText, question, concept, explanationRequested, skipped } = req.body;

    if ((!answerText && !skipped) || !question || !concept) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    if (skipped) {
        return res.status(200).json({
            assessment: {
                analysis_text:
                    "You couldn't retrieve this during the session — this is one of your clearest gaps.",
                mastery_state: 'revisit' as MasteryState,
                misconception: null,
                overconfident: false
            }
        });
    }

    const user = await authenticateApiRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const sparkCost = SPARK_COSTS.SESSION_ANSWER_ANALYSIS || 1;
    const hasSparks = await hasEnoughSparks(user, sparkCost);
    if (!hasSparks) {
        return res
            .status(403)
            .json({
                error: 'out_of_sparks',
                message: `You need ${sparkCost} Sparks to analyze an answer.`
            });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `
    You are evaluating a student's answer to a free-text question. Your job is to assess their true understanding of the underlying concept.

    Target Concept: ${concept.name} (${concept.definition})
    Question: ${question.text}
    Student Answer: "${answerText}"
    Explanation Requested Before Answering: ${explanationRequested ? 'Yes' : 'No'}

    Assess factual accuracy, conceptual depth, misconception detection, and confidence calibration.

    Return a single JSON object with these fields:
    - analysis_text: 1-2 sentences of specific feedback pointing out what was strong or missing. Do not grade it, just analyze it.
    - mastery_state: MUST be exactly one of: "solid", "developing", "shaky", "revisit".
        - "solid" = Great answer, confident, deep understanding
        - "developing" = Good answer but needed explanation or lacked total depth
        - "shaky" = Surface familiarity detected but mechanism or depth missing
        - "revisit" = Completely wrong, blank, or significant misconception.
        - If they were completely wrong, blank, or admitted they don't know: use 'revisit'
    - misconception: if a fundamental error is made, explain the misconception here concisely. Else null.
    - overconfident: boolean. True if the student answered at length with high certainty but was fundamentally wrong.
    `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        const assessment = parseJSON<{
            analysis_text: string;
            mastery_state: MasteryState;
            misconception: string | null;
            overconfident: boolean;
        }>(responseText);

        await deductSparks(user, sparkCost, 'session_answer_analysis');

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const node = await findOrCreateConceptNode(
            supabase,
            user,
            concept.name,
            question.session_id,
            concept.definition || ''
        );

        if (node) {
            let finalState: MasteryState = assessment.mastery_state;
            if (assessment.misconception) finalState = 'revisit';

            await updateConceptMastery(
                supabase,
                user,
                node.id,
                finalState,
                'session',
                question.session_id
            );
        }

        res.status(200).json({ assessment });
    } catch (error) {
        console.error('Error analyzing answer:', error);
        res.status(500).json({ message: 'Failed to analyze answer' });
    }
}
