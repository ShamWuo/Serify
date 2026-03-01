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

    const { concept, deepDiveText } = req.body;

    if (!concept) {
        return res.status(400).json({ error: 'Missing concept' });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json' },
            systemInstruction: `You are a master teacher generating a comprehensive 'Deep Dive' guide for a single concept a student is struggling to grasp.

Structure the response as a JSON object:
{
  "title": "A catchy title for the concept",
  "sections": [
    {
      "heading": "string",
      "content": "markdown string (use bolding, bullet points, but keep it readable)"
    }
  ],
  "confirmatoryQuestion": "A single, highly specific short-answer question at the very end to check if they actually read and understood the guide."
}

Rules for Sections:
1. "The Core Idea" - A 2-sentence stripped-down definition.
2. "Why it Matters" - The real-world or theoretical payoff of knowing this.
3. "The Mental Model" - A strong analogy or visualization.
4. "Where You Got Stuck" - explicitly address their misconception (provided in prompt).
5. "Step-by-Step" or "Component Breakdown" - Deconstruct it.

Keep the tone expert, engaging, and highly structured.`
        });

        const promptText = `
Concept: ${concept.name}
Student's struggle/misconception: ${concept.feedbackNote || 'No specific feedback recorded. Treat as a missing concept.'}

Generate the deep dive JSON.
`;

        const deduction = await deductSparks(userId, sparkCost, 'concept_deep_dive', concept?.id);
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

        try {
            const cleanedText = text
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            const deepDive = JSON.parse(cleanedText);
            return res.status(200).json({ deepDive });
        } catch (parseError) {
            console.error('Failed to parse Gemini Deep Dive output:', text);
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }
    } catch (error: any) {
        console.error('Error generating deep dive:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
