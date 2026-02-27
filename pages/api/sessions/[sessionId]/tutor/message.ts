import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, hasEnoughSparks, deductSparks, SPARK_COSTS } from '@/lib/sparks';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== 'string') return res.status(400).json({ error: 'Missing or invalid sessionId' });


    if (!sessionId) {
        return res.status(400).json({ error: 'Missing sessionId' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messages, sessionContext } = req.body;
    if (!messages || !sessionContext) {
        return res.status(400).json({ error: 'Missing messages or session context' });
    }

    const sparkCost = SPARK_COSTS.AI_TUTOR_MESSAGE;
    const hasSparks = await hasEnoughSparks(userId, sparkCost);
    if (!hasSparks) {
        return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Spark to continue chatting.` });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    try {
        const { data: conversation, error: fetchError } = await supabase
            .from('tutor_conversations')
            .select('*')
            .eq('session_id', sessionId)
            .single();

        if (fetchError || !conversation) {
            return res.status(404).json({ error: 'Tutor conversation not found. Call start first.' });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: `You are Serify's AI Tutor.
Source: ${sessionContext.sourceContent?.title || 'Unknown'}
Strong: ${sessionContext.strongConcepts?.map((c: any) => c.name).join(', ') || 'None'}
Weak: ${sessionContext.weakConcepts?.map((c: any) => `${c.name}: ${c.feedbackNote || ''}`).join('; ') || 'None'}
Misconceptions: ${sessionContext.misconceptions?.map((m: any) => `${m.name}: ${m.feedbackNote || ''}`).join('; ') || 'None'}

Role:
- Build on strengths to fix weaknesses
- Correct misconceptions, don't just lecture
- Conversational, 2-4 sentences max
- If asked, generate a retrieval question to check understanding`
        });

        const deduction = await deductSparks(userId, sparkCost, 'ai_tutor_message');
        if (!deduction.success) {
            return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Spark to continue chatting.` });
        }


        const historyLimit = 10;
        const prunedMessages = messages.length > historyLimit ? messages.slice(-historyLimit) : messages;

        const chat = model.startChat({
            history: prunedMessages.slice(0, -1).map((m: any) => ({
                role: m.role === 'tutor' || m.role === 'model' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }))
        });

        const lastMessage = messages[messages.length - 1].content;
        const result = await chat.sendMessage(lastMessage);
        const replyText = result.response.text();

        const updatedMessages = [
            ...messages,
            { role: 'tutor', content: replyText, timestamp: new Date().toISOString() }
        ];

        const { data: updatedDoc, error: updateError } = await supabase
            .from('tutor_conversations')
            .update({
                messages: updatedMessages,
                last_message_at: new Date().toISOString()
            })
            .eq('session_id', sessionId)
            .select()
            .single();

        if (updateError) throw updateError;

        return res.status(200).json({ reply: replyText, conversation: updatedDoc });

    } catch (error: any) {
        console.error('Error in tutor chat:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
