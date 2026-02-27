import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest } from '@/lib/sparks';
import { createClient } from '@supabase/supabase-js';
import { parseJSON } from '@/lib/serify-ai';

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


    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionContext } = req.body;
    if (!sessionContext) {
        return res.status(400).json({ error: 'Missing session context' });
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
            return res.status(404).json({ error: 'Tutor conversation not found.' });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: `You are evaluating a student's conversation with an AI tutor.`
        });


        const analysisPrompt = `
Based on the following tutoring conversation, evaluate the student's final mastery of the concepts discussed.

Conversation Transcript:
${conversation.messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

Concepts to evaluate:
${sessionContext.weakConcepts?.map((c: any) => `- ${c.name} (id: ${c.id})`).join('\n') || ''}
${sessionContext.misconceptions?.map((m: any) => `- ${m.name} (id: ${m.id})`).join('\n') || ''}

Return a pure JSON array of mastery updates without markdown formatting. For each update, use the EXACT conceptId (the UUID) provided above:
[{"conceptId": "string", "outcome": "solid" | "developing" | "shaky" | "revisit"}]
Only include concepts that were actually discussed and demonstrated by the user in this conversation.
`;

        const result = await model.generateContent(analysisPrompt);
        const text = result.response.text();
        let updates = [];
        try {
            updates = parseJSON<any[]>(text);
        } catch (e) {
            console.error("Failed to parse AI evaluation:", text);
            return res.status(500).json({ error: 'Failed to parse AI evaluation' });
        }

        const { data: updatedDoc, error: updateError } = await supabase
            .from('tutor_conversations')
            .update({
                is_completed: true,
                completed_at: new Date().toISOString()
            })
            .eq('session_id', sessionId)
            .select()
            .single();

        if (updateError) throw updateError;

        return res.status(200).json({ updates, conversation: updatedDoc });

    } catch (error: any) {
        console.error('Error in tutor chat evaluation:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
