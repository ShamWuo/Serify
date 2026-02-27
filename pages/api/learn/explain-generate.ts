import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, hasEnoughSparks, deductSparks, SPARK_COSTS } from '@/lib/sparks';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const sparkCost = SPARK_COSTS.EXPLAIN_IT_TO_ME;
    const hasSparks = await hasEnoughSparks(userId, sparkCost);
    if (!hasSparks) {
        return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Spark for this explanation.` });
    }

    const { concept, strongConcepts = [] } = req.body;

    if (!concept) {
        return res.status(400).json({ error: 'Missing concept' });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: `You are explaining a concept to a student who struggled with it in a learning assessment.

Tone: clear, direct, intellectually engaging. You may use analogies here — this is the right place for them.
Length: 3-5 paragraphs.
Return plain text markdown.`
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

        const deduction = await deductSparks(userId, sparkCost, 'explain_it_to_me', concept?.id);
        if (!deduction.success) {
            return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Spark for this explanation.` });
        }

        const result = await model.generateContent(promptText);
        const text = result.response.text();

        return res.status(200).json({ explanation: text });

    } catch (error: any) {
        console.error('Error generating explanation:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
