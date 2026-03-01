import { streamObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { authenticateApiRequest, deductSparks, hasEnoughSparks, SPARK_COSTS } from '@/lib/sparks';

export const config = {
    runtime: 'edge'
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const { concepts, method = 'standard' } = await req.json();

        if (!concepts || !Array.isArray(concepts)) {
            return new Response(JSON.stringify({ message: 'Concepts array is required' }), {
                status: 400
            });
        }

        const user = await authenticateApiRequest(req);
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const sparkCost = SPARK_COSTS.QUESTION_GENERATION || 1;
        const hasSparks = await hasEnoughSparks(user, sparkCost);
        if (!hasSparks) {
            return new Response(
                JSON.stringify({
                    error: 'out_of_sparks',
                    message: `You need ${sparkCost} Sparks.`
                }),
                { status: 403 }
            );
        }

        const prompt = `
    You are an expert tutor. I am giving you a Concept Map extracted from learning material.
    I need you to generate a set of open-ended free-text questions to diagnose a student's true understanding.

    The learning method selected is: ${method}
    (If standard: balanced mix. If socratic: deep probing. If feynman: ask them to explain simply).

    Generate exactly ${Math.min(concepts.length, 5)} questions, focusing on the primary concepts.

    Concept Map:
    ${JSON.stringify(concepts, null, 2)}
    `;

        const result = await streamObject({
            model: google('gemini-2.5-flash'),
            temperature: 0.1,
            // @ts-ignore
            maxTokens: 4096,
            prompt,
            schema: z.object({
                questions: z.array(
                    z.object({
                        id: z.string().describe("a unique short string like 'q1'"),
                        target_concept_id: z.string().describe('the id of the concept this tests'),
                        type: z.enum(['RETRIEVAL', 'APPLICATION', 'MISCONCEPTION PROBE']),
                        text: z
                            .string()
                            .describe(
                                'The actual question text (must be open-ended, no multiple choice)'
                            )
                    })
                )
            }),
            onFinish: async ({ object }) => {
                if (object) {
                    await deductSparks(user, sparkCost, 'question_generation');
                }
            }
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error('Error generating questions:', error);
        return new Response(JSON.stringify({ message: 'Failed to generate questions' }), {
            status: 500
        });
    }
}
