import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest, checkUsage, incrementUsage } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { getGeminiModel } from '@/lib/serify-ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== 'string')
        return res.status(400).json({ error: 'Missing or invalid sessionId' });

    if (!sessionId) {
        return res.status(400).json({ error: 'Missing sessionId' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messages, sessionContext, proMode } = req.body;
    if (!messages || !sessionContext) {
        return res.status(400).json({ error: 'Missing messages or session context' });
    }

    const hasUsage = (await checkUsage(userId, 'ai_message_tier1')).allowed;
    if (!hasUsage) {
        return res
            .status(403)
            .json({
                error: 'limit_reached',
                message: 'You have reached your feature limit.'
            });
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
            return res
                .status(404)
                .json({ error: 'Tutor conversation not found. Call start first.' });
        }

        const model = getGeminiModel(
            proMode,
            `You are Serify's AI Tutor — an expert, patient, and direct tutor having a one-on-one conversation with a student.

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
- Build on strengths to fix weaknesses
- Correct misconceptions carefully, don't just lecture
- Ask follow-up questions to check understanding
- Keep responses conversational and focused — 2-4 sentences max
- If they ask you to quiz them, generate a retrieval question and evaluate their answer

Tone: direct, warm, intellectually engaged.`
        );

        const deduction = (await incrementUsage(userId, 'ai_message_tier1').then(() => ({ success: true })));
        if (!deduction.success) {
            return res
                .status(403)
                .json({
                    error: 'limit_reached',
                    message: 'You have reached your feature limit.'
                });
        }

        const historyLimit = 10;
        const prunedMessages =
            messages.length > historyLimit ? messages.slice(-historyLimit) : messages;

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
