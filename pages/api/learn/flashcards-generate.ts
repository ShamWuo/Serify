import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, hasEnoughSparks, deductSparks, SPARK_COSTS } from '@/lib/sparks';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const sparkCost = SPARK_COSTS.FLASHCARD_DECK;
    const hasSparks = await hasEnoughSparks(userId, sparkCost);
    if (!hasSparks) {
        return res
            .status(403)
            .json({
                error: 'out_of_sparks',
                message: `You need ${sparkCost} Spark to generate flashcards.`
            });
    }

    const { weakConcepts = [] } = req.body;

    if (!weakConcepts || weakConcepts.length === 0) {
        return res.status(400).json({ error: 'Missing weakConcepts' });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: `You are generating flashcards for a student based on their session results.
For each concept below, generate:
1. A retrieval prompt for the front of the card (one clear question)
2. A concise correct explanation for the back (2-4 sentences, plain language, no analogies)

Rules:
- Front: a question that requires recall, not recognition
- Back: precise, literal explanation — no metaphors
- Do not make the front question answerable from the concept name alone
- If a misconception was detected, the back must explicitly correct it

Return as a pure JSON array with no markdown formatting: [{"front": "string", "back": "string", "conceptId": "string"}]`
        });

        const promptText = `
The student showed the following understanding of each concept. For each one, generate a flashcard and return the EXACT same conceptId provided:
${weakConcepts.map((c: any) => `- ${c.name} (ID: ${c.id}): ${c.masteryState} — ${c.feedbackNote || ''}`).join('\n')}
    `;

        const deduction = await deductSparks(userId, sparkCost, 'flashcard_deck');
        if (!deduction.success) {
            return res
                .status(403)
                .json({
                    error: 'out_of_sparks',
                    message: `You need ${sparkCost} Spark to generate flashcards.`
                });
        }

        const result = await model.generateContent(promptText);
        const text = result.response.text();

        try {
            const cleanedText = text
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            const cards = JSON.parse(cleanedText);
            return res.status(200).json({ cards });
        } catch (parseError) {
            console.error('Failed to parse Gemini Flashcards output:', text);
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }
    } catch (error: any) {
        console.error('Error generating flashcards:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
