import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    try {
        const { input } = req.body;

        if (!input) {
            return res.status(400).json({ error: 'Missing input text' });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
            You are an intent classifier for Serify, a diagnostic learning platform.
            Your job is to determine if the user wants to "analyze" existing material (like a link, text, or a specific topic they just learned) 
            or if they want to "learn" a new subject from scratch (a curriculum path).

            Rules:
            - If the user provides a topic name with no context (e.g., "Linear Algebra", "Photosynthesis", "How to bake a cake"), the intent is "learn".
            - If the user describes something they just did or want an analysis of (e.g., "Explain what I just read about X", "Check my understanding of Y"), the intent is "analyze".
            - If it's ambiguous, default to "analyze".

            Input: "${input}"

            Return ONLY a JSON object with a single key "intent" which is either "analyze" or "learn".
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if Gemini includes them
        const cleanedJson = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanedJson);

        return res.status(200).json({ intent: data.intent || 'analyze' });
    } catch (error: any) {
        console.error('Intent classification error:', error);
        // Fallback to analyze on error
        return res.status(200).json({ intent: 'analyze' });
    }
}
