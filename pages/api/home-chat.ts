import { streamText, convertToModelMessages } from 'ai';
import { google } from '@ai-sdk/google';
import { authenticateApiRequest, deductSparks, hasEnoughSparks, SPARK_COSTS } from '@/lib/sparks';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { messages } = await req.json();

        if (!messages) {
            return new Response(JSON.stringify({ error: 'Missing messages' }), { status: 400 });
        }

        const user = await authenticateApiRequest(req);
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const sparkCost = SPARK_COSTS.AI_TUTOR_MESSAGE || 1;
        const hasSparks = await hasEnoughSparks(user, sparkCost);
        if (!hasSparks) {
            return new Response(
                JSON.stringify({
                    error: 'out_of_sparks',
                    message: `You need ${sparkCost} Spark for this interaction.`
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
                await deductSparks(user, sparkCost, 'ai_tutor_message');
            }
        });

        return result.toUIMessageStreamResponse();
    } catch (error: any) {
        console.error('Error in home chat:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500 });
    }
}
