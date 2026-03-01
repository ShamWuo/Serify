import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, deductSparks, hasEnoughSparks, SPARK_COSTS } from '@/lib/sparks';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { question, concept } = req.body;

    if (!question || !concept) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = await authenticateApiRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const sparkCost = SPARK_COSTS.HINT_REQUEST || 1;
    const hasSparks = await hasEnoughSparks(user, sparkCost);
    if (!hasSparks) {
        return res
            .status(403)
            .json({ error: 'out_of_sparks', message: `You need ${sparkCost} Sparks for a hint.` });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash'
        });

        const prompt = `
You are helping a student who requested an explanation while answering a question.

Your goal is to briefly activate their existing knowledge of the concept — not teach it from scratch.

RULES:
- Use only precise, literal language. No analogies, no metaphors, no real-world comparisons.
- Maximum 2 sentences. No more.
- Do not reveal, imply, or lead toward the answer to the question below.
- If the concept involves a formula or relationship, you may state it plainly.
- Write as if the student has studied this before and just needs a nudge.

Target Concept: ${concept.name}
Concept Definition: ${concept.definition}

The question being asked (DO NOT ANSWER OR HINT TOWARD THIS):
"${question.text}"
Return plain text only. No markdown, no bullet points.
        `;

        const result = await model.generateContent(prompt);
        const explanation = result.response.text().trim();

        await deductSparks(user, sparkCost, 'hint_request');

        res.status(200).json({ explanation });
    } catch (error) {
        console.error('Error generating explanation:', error);
        res.status(500).json({ message: 'Failed to generate explanation' });
    }
}
