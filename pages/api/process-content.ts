import { streamObject, generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { authenticateApiRequest, checkUsage, incrementUsage } from '@/lib/usage';
import { YoutubeTranscript } from 'youtube-transcript';

export const config = {
    runtime: 'edge'
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error('Failed to parse request JSON:', e);
            return new Response(JSON.stringify({ message: 'Invalid JSON payload' }), { status: 400 });
        }

        const { content, contentType: providedType, type: legacyType, stream = true } = body;
        const contentType = providedType || legacyType;

        if (!content || !contentType) {
            return new Response(JSON.stringify({ message: 'Content is required' }), {
                status: 400
            });
        }

        const user = await authenticateApiRequest(req);
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const isAllowed = (await checkUsage(user, 'sessions')).allowed;
        if (!isAllowed) {
            return new Response(
                JSON.stringify({
                    error: 'limit_reached',
                    message: 'You have reached your feature limit.'
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

        const prompt = `You are an expert knowledge analyst. Your task is to extract a concept map from the following material.
        
        Identify the most important 4-6 concepts that form the foundation of this content. For each concept, provide a clear, 1-2 sentence definition that is accurate and educational.
        
        Also determine a concise, professional title (3-5 words) for this material.
        
        Learning Material (${contentType}):
        ${processedContent.substring(0, 15000)}
        `;


        const schema = z.object({
            title: z.string().describe('A short descriptive title (3-5 words)'),
            concepts: z.array(
                z.object({
                    id: z.string().describe("a unique short string like 'c1'"),
                    name: z.string().describe('The canonical name of the concept'),
                    definition: z.string().describe('A clear, standalone definition (1-2 sentences).'),
                    importance: z.enum(['primary', 'secondary', 'contextual']),
                    misconception_risk: z.boolean().describe('True if beginners often misunderstand this specific point')
                })
            )
        });


        if (!stream) {
            const { object } = await generateObject({
                model: google('gemini-2.5-flash'),
                temperature: 0.1,
                prompt,
                schema
            });

            if (object) {
                (await incrementUsage(user, 'sessions').then(() => ({ success: true })));
            }

            return new Response(JSON.stringify(object), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const result = await streamObject({
            model: google('gemini-2.5-flash'),
            temperature: 0.1,
            system: "You are an expert knowledge extraction agent. You excel at distilling complex material into its constituent concepts. Ensure definitions are high-quality and standalone.",
            prompt,
            schema,
            onFinish: async ({ object }) => {
                if (object) {
                    (await incrementUsage(user, 'sessions').then(() => ({ success: true })));
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
