import { streamObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { authenticateApiRequest, deductSparks, hasEnoughSparks, SPARK_COSTS } from '@/lib/sparks';
import { YoutubeTranscript } from 'youtube-transcript';

export const config = {
    runtime: 'edge'
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const { content, contentType } = await req.json();

        if (!content) {
            return new Response(JSON.stringify({ message: 'Content is required' }), {
                status: 400
            });
        }

        const user = await authenticateApiRequest(req);
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const sparkCost = SPARK_COSTS.SESSION_INGESTION || 2;
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

        let processedContent = content;
        if (contentType === 'youtube') {
            try {
                const transcriptData = await YoutubeTranscript.fetchTranscript(content);
                processedContent = transcriptData.map((t: any) => t.text).join(' ');
            } catch (err) {
                console.error('YouTube transcript error:', err);
                return new Response(
                    JSON.stringify({ message: 'Could not extract transcript from this video.' }),
                    { status: 400 }
                );
            }
        }

        const prompt = `
    You are an expert tutor extracting a concept map from the following learning material.
    Read the material and identify the core concepts. Also determine a short, descriptive title (3-5 words) for this material.

    Learning Material:
    ${processedContent.substring(0, 15000)}
    `;

        const result = await streamObject({
            model: google('gemini-2.5-flash'),
            temperature: 0.1,
            // @ts-ignore
            maxTokens: 8192,
            prompt,
            schema: z.object({
                title: z.string().describe('A short descriptive title (3-5 words)'),
                concepts: z.array(
                    z.object({
                        id: z.string().describe("a unique short string like 'c1'"),
                        name: z.string(),
                        definition: z.string().describe('a 1-sentence definition'),
                        importance: z.enum(['primary', 'secondary', 'contextual']),
                        misconception_risk: z.boolean().describe('true if commonly misunderstood')
                    })
                )
            }),
            onFinish: async ({ object }) => {
                if (object) {
                    await deductSparks(user, sparkCost, 'session_ingestion');
                }
            }
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error('API Error:', error);
        return new Response(
            JSON.stringify({ message: 'Internal server error while processing content.' }),
            { status: 500 }
        );
    }
}
