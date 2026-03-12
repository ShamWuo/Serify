/**
 * home-chat.ts
 * Purpose: Edge API route for the dashboard's AI Tutor chat interface.
 * Key Logic: Authenticates requests, verifies usage limits, and streams responses from 
 * Gemini. Uses a specialized system prompt to handle intent classification and trigger 
 * learning or analysis modes via structured action blocks.
 */

import { streamText, convertToModelMessages } from 'ai';
import { google } from '@ai-sdk/google';
import { authenticateApiRequest, consumeTokens, processAssistantMessage } from '@/lib/usage';

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
        
        const lastUserMessage = messages.filter((m: { role: string; content: string }) => m.role === 'user').pop()?.content || '';
        const usageCheck = await processAssistantMessage(user, lastUserMessage, false, false);
        
        if (!usageCheck.allowed) {
            return new Response(
                JSON.stringify({
                    error: 'limit_reached',
                    message: 'You have reached your unified token limit. Upgrade to Pro+ for unlimited AI.',
                    tier: usageCheck.tier,
                    remaining: usageCheck.remaining
                }),
                { status: 403 }
            );
        }

        const result = await streamText({
            model: google('gemini-2.5-flash'),
            system: `You are Serify's intelligent intake assistant. Your goal is to figure out exactly what the user wants to learn or analyze, and then trigger the right action.

Serify has two main features:
1. LEARN MODE: For generating a custom curriculum spanning multiple concepts. Used when a user wants to learn a general topic ("calculus", "neural networks"), build a "roadmap", or prepare for a "practice exam" on a subject.
2. ANALYZE MODE: For breaking down and analyzing a specific piece of content (YouTube URL, article URL, or pasted notes/text). Used when a user wants to "generate flashcards", "summarize", or "test themselves" on a specific file or link.

INTENT CLASSIFICATION:
- If the user provides a LINK or PASTE-CONTENT: Trigger [ACTION:START_ANALYZE]. 
- If the user provides a TOPIC but NO content: Trigger [ACTION:START_LEARN].

FLASHCARDS & EXAMS:
- If a user wants to generate flashcards or practice tests from a SPECIFIC LINK/TEXT, prioritize START_ANALYZE.
- If a user wants to learn a TOPIC and then get tested, prioritize START_LEARN.

ACTION BLOCK FORMATS:
1. START_ANALYZE: [ACTION:START_ANALYZE]{ "content": "user's url or text here" }[/ACTION]
2. START_LEARN: [ACTION:START_LEARN]{ "q": "the topic to learn", "priorKnowledge": "what they know", "focusGoal": "their goal", "skipTopics": "what to skip" }[/ACTION]

GUIDELINES:
- Briefly confirm their request.
- NEVER write out the analysis or study material yourself.
- For START_LEARN, you can ask 1-2 clarifying questions about their background/goal if they haven't provided it, but don't be pushy.
- Never output markdown code blocks (like \`\`\`json) around the ACTION blocks. Just raw text.

Tone: Friendly, helpful, concise, probing. Do not be overly chatty.`,
            messages: await convertToModelMessages(messages),
            onFinish: async (event) => {
                if (usageCheck.tier === 'tier1' || (event as any).isAborted) {
                    return;
                }

                const action = usageCheck.tier === 'tier3' ? 'ai_message_tier3' : 'ai_message_tier2';
                try {
                    await consumeTokens(user, action);
                } catch (billingError) {
                    console.error('[home-chat] Failed to consume tokens after streaming:', billingError);
                }
            }
        });

        return result.toUIMessageStreamResponse();
    } catch (error: unknown) {
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), { status: 500 });
    }
}
