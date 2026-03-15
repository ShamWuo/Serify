import { streamObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { authenticateApiRequest, checkUsage, incrementUsage } from '@/lib/usage';
import { updateConceptMastery, findOrCreateConceptNode } from '@/lib/vault';
import { MasteryState } from '@/types/serify';
import { createClient } from '@supabase/supabase-js';
import { createErrorResponse } from '@/lib/api-utils';

export const config = {
    runtime: 'edge'
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return createErrorResponse('Method Not Allowed', 405, 'Method Not Allowed');
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { answerText, question, concept, explanationRequested, skipped } = body;

        if ((!answerText && !skipped) || !question || !concept) {
            return createErrorResponse('Missing required fields', 400, 'Bad Request');
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

        const userId = await authenticateApiRequest(req);
        if (!userId) {
            return createErrorResponse('Unauthorized', 401, 'Unauthorized');
        }

        const hasUsage = (await checkUsage(userId, 'session_standard')).allowed;
        if (!hasUsage) {
            return createErrorResponse('You have reached your limit for analyzing answers.', 403, 'limit_reached');
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
                    (await incrementUsage(userId, 'session_standard').then(() => ({ success: true })));

                    const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.SUPABASE_SERVICE_ROLE_KEY!
                    );

                    let parentNodeId: string | undefined = undefined;

                    // Hierarchical Graduation Check
                    if (concept.related_concept_names &&
                        Array.isArray(concept.related_concept_names) &&
                        concept.related_concept_names.length >= 2 &&
                        concept.related_concept_names[1] === "IS_SUB") {

                        const parentName = concept.related_concept_names[0];
                        const parentNode = await findOrCreateConceptNode(
                            supabase as any,
                            userId,
                            parentName,
                            question.session_id,
                            `Mastery Pillar for ${parentName}.`
                        );
                        if (parentNode) {
                            parentNodeId = parentNode.id;
                        }
                    }

                    const node = await findOrCreateConceptNode(
                        supabase as any,
                        userId,
                        concept.name,
                        question.session_id,
                        concept.definition || '',
                        parentNodeId
                    );

                    if (node) {
                        let finalState: MasteryState = object.assessment
                            .mastery_state as MasteryState;
                        if (object.assessment.misconception) finalState = 'revisit';

                        await updateConceptMastery(
                            supabase as any,
                            userId,
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
    } catch (error: any) {
        console.error('Error analyzing answer:', error);
        return createErrorResponse(error.message || 'Failed to analyze answer', 500, 'Internal Server Error');
    }
}
