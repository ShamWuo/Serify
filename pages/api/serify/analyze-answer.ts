import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { authenticateApiRequest, incrementUsage } from '@/lib/usage';
import { updateConceptMastery, findOrCreateConceptNode } from '@/lib/vault';
import { MasteryState } from '@/types/serify';
import { createErrorResponse } from '@/lib/api-utils';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export const config = {
    runtime: 'edge'
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return createErrorResponse('Method Not Allowed', 405, 'Method Not Allowed');
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { answerText, question, concept, explanationRequested, skipped, confidenceScore } = body;

        if ((!answerText && !skipped) || !question || !concept) {
            return createErrorResponse('Missing required fields', 400, 'Bad Request');
        }

        const userId = await authenticateApiRequest(req);
        if (!userId) {
            return createErrorResponse('Unauthorized', 401, 'Unauthorized');
        }

        if (skipped) {
            const assessment = {
                feedbackText: "You couldn't retrieve this during the session — this is one of your clearest gaps.",
                masteryState: 'revisit',
                depthScore: 0,
                strengths: [],
                gaps: ["No retrieval attempted"],
                overconfident: false
            };

            // Vault update
            try {
                const db = supabaseAdmin || (supabase as any);
                const node = await findOrCreateConceptNode(db, userId, concept.name, question.session_id || 'manual', concept.definition);
                if (node) {
                    await updateConceptMastery(db, userId, node.id, 'revisit', 'session', question.session_id || 'manual');
                }
            } catch (e) {
                console.error('Vault update failed:', e);
            }

            return new Response(JSON.stringify({ assessment }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const usage = await incrementUsage(userId, 'session_standard');
        if (!usage.allowed) {
            return createErrorResponse('You have reached your limit for analyzing answers.', 403, 'limit_reached');
        }

        const prompt = `
    You are evaluating a student's answer to a free-text question. Your job is to assess their true understanding of the underlying concept.

    Target Concept: ${concept.name} (${concept.definition})
    Question: ${question.text}
    Student Answer: "${answerText}"
    Explanation Requested Before Answering: ${explanationRequested ? 'Yes' : 'No'}
    Student Reported Confidence (1-5): ${confidenceScore || 'Not provided'} 
      (1 = Wild Guess, 5 = Very Confident)

    Assess factual accuracy, conceptual depth, misconception detection, and confidence calibration.
    If the student reports absolute high confidence (4 or 5) but their answer is fundamentally flawed or shallow, flag this as "overconfident" (an illusion of competence).
    `;

        const { object } = await generateObject({
            model: google('gemini-2.0-flash'),
            temperature: 0.1,
            prompt,
            schema: z.object({
                assessment: z.object({
                    feedbackText: z
                        .string()
                        .describe(
                            '1-3 sentences of specific feedback pointing out what was strong or missing. Direct, encouraging but precise.'
                        ),
                    masteryState: z.enum(['solid', 'developing', 'shaky', 'revisit']),
                    depthScore: z.number().min(0).max(100).describe('A percentage representing overall conceptual depth.'),
                    strengths: z.array(z.string()).describe('List of 1-3 specific correct points or techniques used.'),
                    gaps: z.array(z.string()).describe('List of 1-3 specific missing points or misconceptions.'),
                    overconfident: z
                        .boolean()
                        .describe(
                            'true if student answered at length with certainty but was fundamentally wrong.'
                        )
                })
            })
        });

        const assessment = object.assessment;

        // Vault update
        try {
            const db = supabaseAdmin || (supabase as any);
            const node = await findOrCreateConceptNode(db, userId, concept.name, question.session_id || 'manual', concept.definition);
            if (node) {
                await updateConceptMastery(db, userId, node.id, assessment.masteryState as MasteryState, 'session', question.session_id || 'manual');
            }
        } catch (e) {
            console.error('Vault update failed:', e);
        }

        return new Response(JSON.stringify({ assessment }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error('Error analyzing answer:', error);
        return createErrorResponse(error.message || 'Failed to analyze answer', 500, 'Internal Server Error');
    }
}
