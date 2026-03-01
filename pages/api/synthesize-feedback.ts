import { streamObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { authenticateApiRequest, deductSparks, hasEnoughSparks, SPARK_COSTS } from '@/lib/sparks';
import { createClient } from '@supabase/supabase-js';
import { findOrCreateConceptNode, updateTopicClusters } from '@/lib/vault';

export const config = {
    runtime: 'edge'
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const { sessionData, assessments, concepts, isBasicMode } = await req.json();

        if (!sessionData || !assessments) {
            return new Response(
                JSON.stringify({ message: 'Missing required session or assessment data' }),
                { status: 400 }
            );
        }

        const user = await authenticateApiRequest(req);
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const sparkCost = isBasicMode
            ? SPARK_COSTS.BASIC_FEEDBACK_REPORT
            : SPARK_COSTS.BASIC_FEEDBACK_REPORT + (SPARK_COSTS.FULL_FEEDBACK_UPGRADE || 2);
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
    Synthesize the following answer assessments into a coherent student feedback report. The tone must be diagnostic and curious, never evaluative. First-person from Serify's perspective ("Your answers show...").

    Note: For misconception_report, only include real misconceptions found. For focus_suggestions, provide up to 3 actionable specific steps.

    Concepts from the session (For 'feedback_text', use the actual concept names from this list, NOT placeholders like "c1" or "Concept c2". BUT for 'concept_id' fields, still use the exact ID string like "c1"):
    ${JSON.stringify(concepts || sessionData?.concepts || [])}

    Assessments:
    ${JSON.stringify(assessments)}
    `;

        const result = await streamObject({
            model: google('gemini-2.5-flash'),
            temperature: 0.1,
            // @ts-ignore
            maxTokens: 2048,
            prompt,
            schema: z.object({
                summary_sentence: z
                    .string()
                    .describe('A 1-2 sentence high level summary of their grasp on the material.'),
                strength_map: z.array(
                    z.object({
                        concept_id: z.string(),
                        mastery_state: z.string(),
                        feedback_text: z.string()
                    })
                ),
                cognitive_analysis: z
                    .object({
                        strong_patterns: z.string(),
                        weak_patterns: z.string()
                    })
                    .nullable(),
                misconception_report: z
                    .array(
                        z.object({
                            concept_id: z.string(),
                            implied_belief: z.string(),
                            actual_reality: z.string(),
                            why_it_matters: z.string().nullable()
                        })
                    )
                    .nullable(),
                focus_suggestions: z
                    .array(
                        z.object({
                            title: z.string(),
                            reason: z.string(),
                            concept_id: z.string().nullable()
                        })
                    )
                    .nullable(),
                overall_counts: z.object({
                    solid: z.number(),
                    developing: z.number(),
                    shaky: z.number(),
                    revisit: z.number(),
                    skipped: z.number()
                })
            }),
            onFinish: async ({ object }) => {
                if (object) {
                    await deductSparks(
                        user,
                        sparkCost,
                        isBasicMode ? 'session_basic_analysis' : 'session_full_analysis'
                    );

                    const sessionId = sessionData?.sessionId || sessionData?.id;
                    const conceptsToWrite: { name: string; description: string }[] = (
                        concepts ||
                        sessionData?.concepts ||
                        []
                    )
                        .map((c: any) => ({
                            name: c.name || c.display_name || '',
                            description: c.description || c.definition || ''
                        }))
                        .filter((c: any) => c.name);

                    if (sessionId && conceptsToWrite.length > 0) {
                        const supabaseAdmin = createClient(
                            process.env.NEXT_PUBLIC_SUPABASE_URL!,
                            process.env.SUPABASE_SERVICE_ROLE_KEY ||
                                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                        );

                        Promise.all(
                            conceptsToWrite.map((c) =>
                                findOrCreateConceptNode(
                                    supabaseAdmin,
                                    user,
                                    c.name,
                                    sessionId,
                                    c.description
                                )
                            )
                        )
                            .then((results) => {
                                const newNodeCount = results.filter(Boolean).length;
                                if (newNodeCount >= 5) {
                                    updateTopicClusters(supabaseAdmin, user).catch(console.error);
                                }
                            })
                            .catch(console.error);
                    }
                }
            }
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error('Error synthesizing report:', error);
        return new Response(JSON.stringify({ message: 'Failed to synthesize report' }), {
            status: 500
        });
    }
}
