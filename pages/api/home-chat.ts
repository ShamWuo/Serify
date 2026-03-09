/**
 * home-chat.ts
 * Purpose: Edge API route for the dashboard's AI Tutor chat interface.
 * Key Logic: Authenticates requests, verifies spark balance, and streams responses from 
 * Gemini. Uses a specialized system prompt to handle intent classification and trigger 
 * learning or analysis modes via structured action blocks.
 */

import { streamText, convertToModelMessages } from 'ai';
import { google } from '@ai-sdk/google';
import { authenticateApiRequest, checkUsage, incrementUsage } from '@/lib/usage';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const body = await req.json();
        const { messages } = body;

        if (!messages || messages.length === 0) {
            return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
        }

        const authHeader = req.headers.get('authorization');

        const user = await authenticateApiRequest(req);
        if (!user) {
            console.error('[home-chat] Authentication failed. No user identified.');
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        const hasSparks = (await checkUsage(user, 'ai_messages')).allowed;
        if (!hasSparks) {
            return new Response(
                JSON.stringify({
                    error: 'limit_reached',
                    message: 'You have reached your feature limit.'
                }),
                { status: 403 }
            );
        }

        const result = await streamText({
            model: google('gemini-2.5-flash'),
            system: `You are Serify's intelligent intake assistant. Your goal is to figure out exactly what the user wants to learn or analyze, and then trigger the right action.

Serify has two main features:
1. LEARN MODE: For generating a custom curriculum spanning multiple concepts. Used when a user wants to learn "calculus", "how neural networks work", "related rates", etc.
2. ANALYZE MODE: For breaking down and analyzing a specific piece of content (like a YouTube URL, article URL, or pasted notes/text). 

If the user gives you a link or chunk of text and says "analyze this", "summarize", "help me study this":
- Briefly confirm you can do that.
- NEVER write out the analysis yourself.
- Instead, output a block formatted EXACTLY like this at the end of your message:
[ACTION:START_ANALYZE]{ "content": "user's url or text here" }[/ACTION]

If the user wants to LEARN a topic (e.g., "help me learn related rates"):
- ASK them for 3 pieces of context unless they already provided them:
  1. What do they already know about this topic or underlying foundations?
  2. Is there anything specific they want to skip?
  3. What is their specific goal?
- You can ask these naturally over 1-2 turns.
- Once you have a good sense of their context (or they seem eager to just start), output a block formatted EXACTLY like this at the end of your message:
[ACTION:START_LEARN]{ "q": "the topic to learn", "priorKnowledge": "what they know", "focusGoal": "their goal", "skipTopics": "what to skip" }[/ACTION]
- Do NOT output the action block until you've tried to get the context. But don't interrogate them if they don't want to provide it.
- Never output markdown code blocks (like \`\`\`json) around the ACTION blocks. Just raw text.

Tone: Friendly, helpful, concise, probing. Do not be overly chatty.`,
            messages: await convertToModelMessages(messages),
            onFinish: async () => {
                (await incrementUsage(user, 'ai_messages').then(() => ({ success: true })));
            }
        });

        return result.toUIMessageStreamResponse();
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500 });
    }
}
