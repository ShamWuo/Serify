import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, hasEnoughSparks, deductSparks, SPARK_COSTS } from '@/lib/sparks';
import { parseJSON } from '@/lib/serify-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messages, sessionContext, isFinalAnalysis } = req.body;

    if (!messages || !sessionContext) {
        return res.status(400).json({ error: 'Missing messages or session context' });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: `You are Serify's AI Tutor — an expert, patient, and direct tutor having a one-on-one conversation with a student.

You have full context on this student's recent learning session:
SOURCE CONTENT: ${sessionContext.sourceContent?.title || 'Unknown'}

WHAT THEY UNDERSTOOD WELL:
${sessionContext.strongConcepts?.map((c: any) => `- ${c.name}`).join('\n') || 'None'}

WHAT WAS SHALLOW OR MISSING:
${sessionContext.weakConcepts?.map((c: any) => `- ${c.name}: ${c.feedbackNote || ''}`).join('\n') || 'None'}

MISCONCEPTIONS DETECTED:
${sessionContext.misconceptions?.map((m: any) => `- ${m.name}: ${m.feedbackNote || ''}`).join('\n') || 'None'}

Your role:
- Use this context to make the conversation specific and relevant — never generic
- Build on what they already know to explain what they missed
- Correct misconceptions carefully
- Ask follow-up questions to check understanding, don't just lecture
- Keep responses conversational and focused — 2-4 sentences per turn unless clearly needed
- If they ask you to quiz them, generate a retrieval question and evaluate their answer

Tone: direct, warm, intellectually engaged.`
        });

        if (isFinalAnalysis) {
            const analysisPrompt = `
Based on the following tutoring conversation, evaluate the student's final mastery of the concepts discussed.

Conversation Transcript:
${messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

Concepts to evaluate:
${sessionContext.weakConcepts?.map((c: any) => `- ${c.name} (id: ${c.id})`).join('\n') || ''}
${sessionContext.misconceptions?.map((m: any) => `- ${m.name} (id: ${m.id})`).join('\n') || ''}

Return a pure JSON array of mastery updates without markdown formatting. For each update, use the EXACT conceptId (the UUID) provided above:
[{"conceptId": "string", "outcome": "solid" | "developing" | "shaky" | "revisit"}]
Only include concepts that were actually discussed and demonstrated by the user in this conversation.
        `;

            const result = await model.generateContent(analysisPrompt);
            const text = result.response.text();
            try {
                const updates = parseJSON<any[]>(text);
                return res.status(200).json({ updates });
            } catch (e) {
                return res.status(500).json({ error: 'Failed to parse AI evaluation' });
            }
        }

        const isOpening = messages.length <= 1;
        const sparkCost = isOpening ? SPARK_COSTS.AI_TUTOR_OPEN : SPARK_COSTS.AI_TUTOR_MESSAGE;
        const hasSparks = await hasEnoughSparks(userId, sparkCost);
        if (!hasSparks) {
            return res
                .status(403)
                .json({
                    error: 'out_of_sparks',
                    message: `You need ${sparkCost} Spark to continue chatting.`
                });
        }

        const deduction = await deductSparks(
            userId,
            sparkCost,
            isOpening ? 'ai_tutor_open' : 'ai_tutor_message'
        );
        if (!deduction.success) {
            return res
                .status(403)
                .json({
                    error: 'out_of_sparks',
                    message: `You need ${sparkCost} Spark to continue chatting.`
                });
        }

        const chat = model.startChat({
            history: messages.slice(0, -1).map((m: any) => ({
                role: m.role === 'tutor' || m.role === 'model' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }))
        });

        const lastMessage = messages[messages.length - 1].content;
        const result = await chat.sendMessage(lastMessage);

        return res.status(200).json({ reply: result.response.text() });
    } catch (error: any) {
        console.error('Error in tutor chat:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
