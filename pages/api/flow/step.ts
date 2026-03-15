import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { findOrCreateConceptNode } from '@/lib/vault';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { sessionId, conceptId, forcePhase } = req.body;
    if (!sessionId || !conceptId)
        return res.status(400).json({ error: 'Missing sessionId or conceptId' });

    try {
        const { data: sessionData, error: sessionError } = await supabaseAdmin
            .from('flow_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (sessionError || !sessionData)
            return res.status(404).json({ error: 'Session not found' });

        // ── Look up the concept name from the plan ────────────────
        const planConcepts = sessionData.initial_plan?.concepts || [];
        const currentConceptMeta = planConcepts.find((c: any) => c.conceptId === conceptId);
        const conceptName = currentConceptMeta?.conceptName || 'Unknown Concept';

        // ── Ensure concept exists in vault (FK requirement) ───────
        const node = await findOrCreateConceptNode(
            supabaseAdmin as any,
            userId,
            conceptName,
            sessionId,
            `Learning path: ${conceptName}`
        );
        const vaultConceptId = node?.id || conceptId;

        let { data: progressData } = await supabaseAdmin
            .from('flow_concept_progress')
            .select('*')
            .eq('flow_session_id', sessionId)
            .eq('concept_id', vaultConceptId)
            .maybeSingle();

        // FALLBACK: If not found by vault ID, try original plan conceptId
        if (!progressData && vaultConceptId !== conceptId) {
            console.log(`[step] Progress not found by VaultID (${vaultConceptId}). Trying PlanID (${conceptId})`);
            const { data: fallbackData } = await supabaseAdmin
                .from('flow_concept_progress')
                .select('*')
                .eq('flow_session_id', sessionId)
                .eq('concept_id', conceptId)
                .maybeSingle();
            progressData = fallbackData;
        }

        // FALLBACK 2: If still not found, try looking up by Name match in existing progress
        if (!progressData) {
            const { data: allProgress } = await supabaseAdmin
                .from('flow_concept_progress')
                .select('*')
                .eq('flow_session_id', sessionId);

            if (allProgress) {
                // This is slow but better than a crash. Find a plan where the orchestrator_plan 
                // matches this concept name.
                const matchedProgress = allProgress.find((p: any) =>
                    p.orchestrator_plan?.teach?.text?.toLowerCase().includes(conceptName.toLowerCase().slice(0, 20))
                );
                if (matchedProgress) {
                    console.log(`[step] Progress found by content match. Aligning to VaultID: ${vaultConceptId}`);
                    progressData = matchedProgress;
                }
            }
        }

        if (!progressData || !progressData.orchestrator_plan) {
            console.error(`[step] Plan not found. Session: ${sessionId}, IDs checked: ${vaultConceptId}, ${conceptId}`);
            return res
                .status(400)
                .json({
                    error: 'Orchestrator plan not initialized. Call /api/flow/orchestrate first.'
                });
        }

        const plan = progressData.orchestrator_plan;

        const { data: previousSteps, error: stepsError } = await supabaseAdmin
            .from('flow_steps')
            .select('*')
            .eq('flow_session_id', sessionId)
            .eq('concept_id', vaultConceptId)
            .order('step_number', { ascending: true });

        const lastStep =
            previousSteps && previousSteps.length > 0
                ? previousSteps[previousSteps.length - 1]
                : null;

        // If last step is not answered yet, or is a check/confirm step that failed to evaluate, 
        // return it so the user can try again.
        const isCheckMissingEval = lastStep && (lastStep.step_type === 'check' || lastStep.step_type === 'confirm') && !lastStep.evaluation;

        if (lastStep && (!lastStep.user_response || isCheckMissingEval) && lastStep.step_type !== 'completed' && !forcePhase) {
            return res.status(200).json({
                step: lastStep,
                stepHistory: previousSteps
            });
        }

        let nextStepType = '';
        let content: any = {};

        if (forcePhase === 'teach') {
            nextStepType = 'teach';
            const isFirstRead = !previousSteps || previousSteps.length === 0;
            content = {
                text: isFirstRead
                    ? plan.teach?.text || ''
                    : `### Let's reinforce: ${conceptName}\n\n${plan.teach?.reinforcementText || plan.teach?.text || ''}`,
                quickChecks: plan.quickChecks || [],
                isReinforcement: !isFirstRead
            };
        } else if (forcePhase === 'check') {
            nextStepType = 'check';
            content = plan.checks?.[0] || {
                questionText: 'How would you summarize what you just read?',
                checkType: 'recall'
            };
        } else if (!lastStep) {
            // Always start with the combined teach card
            nextStepType = 'teach';
            content = {
                text: plan.teach?.text || '',
                quickChecks: plan.quickChecks || []
            };
        } else if (lastStep.step_type === 'teach') {
            // After teach, go to first open-ended check
            nextStepType = 'check';
            content = plan.checks?.[0] || {
                questionText: 'How would you summarize what you just read?',
                checkType: 'recall'
            };
        } else if (lastStep.step_type === 'check') {
            if (
                ['A', 'strong'].includes(lastStep.evaluation?.path) ||
                lastStep.evaluation?.outcome === 'strong'
            ) {
                const currentCheckIndex =
                    plan.checks?.findIndex(
                        (c: any) => c.questionText === lastStep.content.questionText
                    ) ?? 0;
                const nextCheck = plan.checks?.[currentCheckIndex + 1];

                if (nextCheck) {
                    nextStepType = 'check';
                    content = nextCheck;
                } else {
                    nextStepType = 'confirm';
                    content = plan.confirmQuestion;
                }
            } else {
                if (lastStep.evaluation.nextReinforceContent) {
                    nextStepType = 'reinforce';
                    content = {
                        text: lastStep.evaluation.nextReinforceContent,
                        path: lastStep.evaluation.path
                    };
                } else {
                    nextStepType = 'check';
                    content = lastStep.content;
                }
            }
        } else if (lastStep.step_type === 'reinforce') {
            const revSteps = [...(previousSteps || [])].reverse();
            const lastQuestion = revSteps.find((s) => ['check', 'confirm'].includes(s.step_type));

            if (lastQuestion) {
                nextStepType = lastQuestion.step_type;
                content = lastQuestion.content;
            } else {
                nextStepType = 'check';
                content = plan.checks?.[0];
            }
        } else if (lastStep.step_type === 'confirm') {
            if (!lastStep.evaluation)
                return res.status(400).json({ error: 'Confirm step not evaluated yet' });

            if (
                ['A', 'strong'].includes(lastStep.evaluation.path) ||
                lastStep.evaluation.outcome === 'strong' ||
                lastStep.evaluation.masterySignal === 'solid' ||
                lastStep.evaluation.masterySignal === 'developing'
            ) {
                await supabaseAdmin
                    .from('flow_concept_progress')
                    .update({ status: 'completed' })
                    .eq('id', progressData.id);
                nextStepType = 'completed';
                content = { text: 'Concept sequence completed!' };
            } else {
                const confirmAttempts =
                    previousSteps?.filter((s) => s.step_type === 'confirm').length || 1;
                if (confirmAttempts >= 2) {
                    await supabaseAdmin
                        .from('flow_concept_progress')
                        .update({ status: 'completed' })
                        .eq('id', progressData.id);
                    nextStepType = 'completed';
                    content = { text: 'Concept sequence completed (moving forward).' };
                } else {
                    if (lastStep.evaluation.nextReinforceContent) {
                        nextStepType = 'reinforce';
                        content = { text: lastStep.evaluation.nextReinforceContent, path: 'C' };
                    } else {
                        nextStepType = 'confirm';
                        content = lastStep.content;
                    }
                }
            }
        } else if (lastStep.step_type === 'completed') {
            return res.status(200).json({
                action: 'concept_complete',
                stepHistory: previousSteps
            });
        } else {
            nextStepType = 'completed';
            content = { text: 'Fallback completion state.' };
        }

        if (nextStepType === 'completed') {
            // ── Look up the concept name from the plan ────────────────
            const planConcepts = sessionData.initial_plan?.concepts || [];
            const currentConceptMeta = planConcepts.find((c: any) => c.conceptId === conceptId);
            const conceptName = currentConceptMeta?.conceptName || 'Unknown Concept';

            if (sessionData.source_type === 'curriculum' && sessionData.source_session_id) {
                const curriculumId = sessionData.source_session_id;

                const { data: curr } = await supabaseAdmin
                    .from('learn_mode_curriculum')
                    .select('*')
                    .eq('id', curriculumId)
                    .single();
                if (curr) {
                    const completed = curr.completed_concept_ids || [];
                    if (!completed.includes(conceptId)) {
                        completed.push(conceptId);

                        await supabaseAdmin
                            .from('learn_mode_curriculum')
                            .update({
                                completed_concept_ids: completed,
                                current_concept_index: completed.length,
                                status:
                                    completed.length >= curr.concept_count ? 'completed' : 'active',
                                last_activity_at: new Date().toISOString()
                            })
                            .eq('id', curriculumId);

                        await supabaseAdmin
                            .from('curriculum_concept_progress')
                            .update({
                                status: 'completed',
                                completed_at: new Date().toISOString()
                            })
                            .eq('curriculum_id', curriculumId)
                            .eq('concept_id', conceptId);
                    }
                }
            }

            // ── VAULT UPDATE: runs for ALL session types ──────────────
            // Ensure this concept exists in the vault AND gets promoted to 'solid' mastery.
            try {
                const nodeResult = await findOrCreateConceptNode(
                    supabaseAdmin as any,
                    userId,
                    conceptName,
                    sessionId,
                    `Mastered via Flow session: ${conceptName}`
                );
                // Promote mastery to 'solid' for completed concepts
                if (nodeResult) {
                    await supabaseAdmin
                        .from('knowledge_nodes')
                        .update({ current_mastery: 'solid' })
                        .eq('user_id', userId)
                        .ilike('canonical_name', conceptName);
                }
            } catch (vaultErr) {
                console.error('[vault] Concept mastery update failed:', vaultErr);
            }

            return res.status(200).json({
                action: 'concept_complete',
                stepHistory: previousSteps
            });
        }

        const stepId = uuidv4();
        const stepNumber = (previousSteps?.length || 0) + 1;

        const { data: newStep, error: insertError } = await supabaseAdmin
            .from('flow_steps')
            .insert({
                id: stepId,
                flow_session_id: sessionId,
                user_id: userId,
                concept_id: vaultConceptId, // Use Vault UUID
                step_number: stepNumber,
                step_type: nextStepType,
                content: content,
                ai_reasoning: 'Strict deterministic routing'
            })
            .select()
            .single();

        if (insertError) {
            console.error('Insert error', insertError);
            return res.status(500).json({ error: 'Failed to save next step' });
        }

        const updatedHistory = [...(previousSteps || []), newStep];

        return res.status(200).json({
            step: newStep,
            stepHistory: updatedHistory
        });
    } catch (error: any) {
        console.error('Error in flow deterministic next step:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
