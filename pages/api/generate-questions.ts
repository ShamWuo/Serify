import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, deductSparks, hasEnoughSparks, SPARK_COSTS } from '@/lib/sparks';
import { parseJSON } from '@/lib/serify-ai';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { concepts, method = 'standard' } = req.body;

    if (!concepts || !Array.isArray(concepts)) {
        return res.status(400).json({ message: 'Concepts array is required' });
    }

    const user = await authenticateApiRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const sparkCost = SPARK_COSTS.QUESTION_GENERATION || 1;
    const hasSparks = await hasEnoughSparks(user, sparkCost);
    if (!hasSparks) {
        return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Sparks.` });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: 'application/json',
                maxOutputTokens: 4096,
                temperature: 0.1
            },
        });

        const prompt = `
    You are an expert tutor. I am giving you a Concept Map extracted from learning material.
    I need you to generate a set of open-ended free-text questions to diagnose a student's true understanding.

    The learning method selected is: ${method}
    (If standard: balanced mix. If socratic: deep probing. If feynman: ask them to explain simply).

    For each question, provide:
    - id: a unique short string like 'q1'
    - target_concept_id: the id of the concept this tests
    - type: 'RETRIEVAL', 'APPLICATION', or 'MISCONCEPTION PROBE'
    - text: The actual question text (must be open-ended, no multiple choice)

    Generate exactly ${Math.min(concepts.length, 5)} questions, focusing on the primary concepts.
    Structure the output as a JSON array of question objects.

    Concept Map:
    ${JSON.stringify(concepts, null, 2)}
    `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        const questions = parseJSON<any>(responseText);

        await deductSparks(user, sparkCost, 'question_generation');

        res.status(200).json({ questions });
    } catch (error) {
        console.error('Error generating questions:', error);
        res.status(500).json({ message: 'Failed to generate questions' });
    }
}
