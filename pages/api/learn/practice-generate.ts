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

    const sparkCost = SPARK_COSTS.PRACTICE_QUIZ_GEN;
    const hasSparks = await hasEnoughSparks(userId, sparkCost);
    if (!hasSparks) {
        return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Spark to generate practice quizzes.` });
    }

    const { concepts } = req.body;

    if (!concepts || concepts.length === 0) {
        return res.status(400).json({ error: 'Missing concepts' });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: `You are a quiz master creating targeted practice questions for a student based on their learning gaps.

For each concept provided, generate 1-2 multiple choice questions (MCQs).
Rules:
- Questions should test application or deeper understanding, not just rote definitions
- Provide 4 options per question
- Only ONE option should be correct
- The distractors (wrong answers) should represent common misconceptions, especially if one is mentioned in the feedback
- Provide a brief 'explanation' for why the correct answer is right and the others are wrong

Return a pure JSON array with no markdown formatting:
[
  {
    "conceptId": "string",
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "correctIndex": number (0-3),
    "explanation": "string"
  }
]`
        });

        const promptText = `
Generate MCQs for the following concepts. For each question, you MUST return the EXACT same conceptId provided for that concept. Pay special attention to their feedback so you can target their specific weak spots or misconceptions:

${concepts.map((c: any) => `- Concept: ${c.name} (ID: ${c.id})\n  Mastery State: ${c.masteryState}\n  Feedback: ${c.feedbackNote || 'None'}`).join('\n\n')}
`;

        const deduction = await deductSparks(userId, sparkCost, 'practice_quiz_gen');
        if (!deduction.success) {
            return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Spark to generate practice quizzes.` });
        }

        const result = await model.generateContent(promptText);
        const text = result.response.text();

        try {
            const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const questions = JSON.parse(cleanedText);
            return res.status(200).json({ questions });
        } catch (parseError) {
            console.error("Failed to parse Gemini Practice Quiz output:", text);
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }

    } catch (error: any) {
        console.error('Error generating practice questions:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
