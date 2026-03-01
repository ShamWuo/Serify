import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, hasEnoughSparks, deductSparks, SPARK_COSTS } from '@/lib/sparks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!process.env.GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY is missing');
        return res.status(500).json({ error: 'AI features are not configured on the server' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const sparkCost = SPARK_COSTS.FEYNMAN_SUBMISSION;
    const hasSparks = await hasEnoughSparks(userId, sparkCost);
    if (!hasSparks) {
        return res
            .status(403)
            .json({
                error: 'out_of_sparks',
                message: `You need ${sparkCost} Sparks to evaluate this explanation.`
            });
    }

    const { concept, userExplanation } = req.body;

    if (!concept || !userExplanation) {
        return res.status(400).json({ error: 'Missing concept or userExplanation' });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: `You are evaluating a student's Feynman-method explanation of a concept.
Evaluate this explanation as if you are checking whether a non-expert would understand it.

Return as a pure JSON object with no markdown formatting:
{
  "clearParts": "paragraph describing what was explained well and would land with a non-expert",
  "breakdownPoints": "paragraph describing specific moments the explanation would lose a non-expert, with direct quotes from their text",
  "strongExample": "what a strong Feynman explanation of this concept would look like (3-5 sentences)",
  "overallAssessment": "developing" | "strong" | "still_shaky"
}`
        });

        const promptText = `
Concept: ${concept.name}
Correct understanding (context): ${concept.feedbackNote || 'No specific feedback context.'}

Student's Feynman explanation:
"${userExplanation}"
`;

        const deduction = await deductSparks(userId, sparkCost, 'feynman_evaluate', concept?.id);
        if (!deduction.success) {
            return res
                .status(403)
                .json({
                    error: 'out_of_sparks',
                    message: `You need ${sparkCost} Sparks to evaluate this explanation.`
                });
        }

        const result = await model.generateContent(promptText);
        const text = result.response.text();

        try {
            const cleanedText = text
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            const evaluation = JSON.parse(cleanedText);
            return res.status(200).json({ evaluation });
        } catch (parseError) {
            console.error('Failed to parse Gemini Feynman output:', text);
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }
    } catch (error: any) {
        console.error('Error evaluating Feynman explanation:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
