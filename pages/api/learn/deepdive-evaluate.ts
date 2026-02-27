import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ error: 'Missing question or answer' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are evaluating a student's answer to a short confirmatory question after they read a deep-dive explanation.

Return a pure JSON object:
{
  "isCorrect": boolean,
  "feedback": "1-2 sentences explaining why they are right, or gently explaining the gap if they are wrong."
}`
    });

    const promptText = `
Question asked: "${question}"
Student's answer: "${answer}"
    `;

    const result = await model.generateContent(promptText);
    const text = result.response.text();

    try {
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const evaluation = JSON.parse(cleanedText);
        return res.status(200).json({ evaluation });
    } catch (parseError) {
        console.error("Failed to parse Gemini Deep Dive Eval output:", text);
        return res.status(500).json({ error: 'Failed to parse AI response' });
    }

  } catch (error: any) {
    console.error('Error in deep dive eval:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
