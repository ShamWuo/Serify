import { streamObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { authenticateApiRequest, deductSparks, hasEnoughSparks, SPARK_COSTS } from '@/lib/sparks';
import { updateConceptMastery, findOrCreateConceptNode } from '@/lib/vault';
import { MasteryState } from '@/types/serify';
import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge'
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const { answerText, question, concept, explanationRequested, skipped } = await req.json();

        if ((!answerText && !skipped) || !question || !concept) {
            return new Response(JSON.stringify({ message: 'Missing required fields' }), {
                status: 400
            });
        }

        if (skipped) {
            return new Response(
                JSON.stringify({
                    assessment: {
                        analysis_text:
                            "You couldn't retrieve this during the session — this is one of your clearest gaps.",
                        mastery_state: 'revisit' as MasteryState,
                        misconception: null,
                        overconfident: false
                    }
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        const user = await authenticateApiRequest(req);
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const sparkCost = SPARK_COSTS.SESSION_ANSWER_ANALYSIS || 1;
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
    You are evaluating a student's answer to a free-text question. Your job is to assess their true understanding of the underlying concept.

    Target Concept: ${concept.name} (${concept.definition})
    Question: ${question.text}
    Student Answer: "${answerText}"
    Explanation Requested Before Answering: ${explanationRequested ? 'Yes' : 'No'}

    Assess factual accuracy, conceptual depth, misconception detection, and confidence calibration.
    `;

        const result = await streamObject({
            model: google('gemini-2.5-flash'),
            temperature: 0.1,
            // @ts-ignore
            maxTokens: 1024,
            prompt,
            schema: z.object({
                assessment: z.object({
                    analysis_text: z
                        .string()
                        .describe(
                            '1-2 sentences of specific feedback pointing out what was strong or missing. Do not grade it, just analyze it.'
                        ),
                    mastery_state: z.enum(['solid', 'developing', 'shaky', 'revisit']),
                    misconception: z
                        .string()
                        .nullable()
                        .describe(
                            'if a fundamental error is made, explain it concisely here. Else null.'
                        ),
                    overconfident: z
                        .boolean()
                        .describe(
                            'true if student answered at length with certainty but was fundamentally wrong.'
                        )
                })
            }),
            onFinish: async ({ object }) => {
                if (object?.assessment) {
                    await deductSparks(user, sparkCost, 'session_answer_analysis');

                    const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.SUPABASE_SERVICE_ROLE_KEY!
                    );

                    const node = await findOrCreateConceptNode(
                        supabase,
                        user,
                        concept.name,
                        question.session_id,
                        concept.definition || ''
                    );

                    if (node) {
                        let finalState: MasteryState = object.assessment
                            .mastery_state as MasteryState;
                        if (object.assessment.misconception) finalState = 'revisit';

                        await updateConceptMastery(
                            supabase,
                            user,
                            node.id,
                            finalState,
                            'session',
                            question.session_id
                        );
                    }
                }
            }
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error('Error analyzing answer:', error);
        return new Response(JSON.stringify({ message: 'Failed to analyze answer' }), {
            status: 500
        });
    }
}
