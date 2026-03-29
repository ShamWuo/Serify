import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { findOrCreateConceptNode, updateConceptMastery } from '@/lib/vault';

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

    const { sessionId, conceptId, forcePhase, skipCurrent } = req.body;
    console.log(`[step] Handler entered. Session: ${sessionId}, Concept: ${conceptId}`);

    if (!sessionId || !conceptId) {
        console.warn(`[step] Missing required IDs. Returning init signal. Session: ${sessionId}, Concept: ${conceptId}`);
        return res.status(200).json({ 
            action: 'initialize', 
            message: 'Waiting for concept and session initialization.' 
        });
    }

    try {
        const { data: sessionData, error: sessionError } = await supabaseAdmin
            .from('flow_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (sessionError || !sessionData) {
            console.error(`[step] Session not found. ID: ${sessionId}`);
            return res.status(404).json({ error: 'Session not found' });
        }

        
        const planConcepts = sessionData.initial_plan?.concepts || [];
        const currentConceptMeta = planConcepts.find((c: any) => c.conceptId === conceptId);
        const conceptName = currentConceptMeta?.conceptName || 'Unknown Concept';

        
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

        
        if (!progressData) {
            const { data: allProgress } = await supabaseAdmin
                .from('flow_concept_progress')
                .select('*')
                .eq('flow_session_id', sessionId);

            if (allProgress) {
                
                
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
            console.log(`[step] Plan not initialized. IDs checked: ${vaultConceptId}, ${conceptId}. Returning initialization signal.`);
            return res
                .status(200)
                .json({
                    action: 'initialize',
                    message: 'Orchestrator plan not initialized. Call /api/flow/orchestrate first.'
                });
        }

        const plan = progressData.orchestrator_plan;

        const { data: previousSteps, error: stepsError } = await supabaseAdmin
            .from('flow_steps')
            .select('*')
            .eq('flow_session_id', sessionId)
            .eq('concept_id', vaultConceptId)
            .order('step_number', { ascending: true });

        // Calculate expected steps from plan
        let plannedSteps = 0;
        if (plan) {
            plannedSteps = 1; // Teach step
            if (plan.application) plannedSteps += 1; // Application step
            if (plan.checks?.length) plannedSteps += plan.checks.length; // Recall/Analysis checks
            if (plan.confirmQuestion) plannedSteps += 1; // Final confirm
        }

        const lastStep =
            previousSteps && previousSteps.length > 0
                ? previousSteps[previousSteps.length - 1]
                : null;

        
        const isSkipping = skipCurrent && lastStep && lastStep.step_type !== 'completed';

        
        
        const isCheckMissingEval = lastStep && (['check', 'confirm', 'application'].includes(lastStep.step_type)) && !lastStep.evaluation;

        if (lastStep && (!lastStep.user_response || isCheckMissingEval) && lastStep.step_type !== 'completed' && !forcePhase && !isSkipping) {
            return res.status(200).json({
                step: lastStep,
                stepHistory: previousSteps,
                plannedSteps
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
                quickChecks: plan.teach?.quickChecks || [],
                isReinforcement: !isFirstRead
            };
        } else if (forcePhase === 'application') {
            nextStepType = 'application';
            content = plan.application || {
                taskPrompt: 'Apply what you just learned to solve a related problem.',
                hint: 'Look back at the last section.'
            };
        } else if (forcePhase === 'check') {
            nextStepType = 'check';
            content = plan.checks?.[0] || {
                questionText: 'How would you summarize what you just read?',
                checkType: 'recall'
            };
        } else if (!lastStep) {
            
            nextStepType = 'teach';
            content = {
                text: plan.teach?.text || '',
                quickChecks: plan.teach?.quickChecks || []
            };
        } else if (lastStep.step_type === 'teach' || (isSkipping && lastStep.step_type === 'teach')) {
            
            if (plan.application) {
                nextStepType = 'application';
                content = plan.application;
            } else {
                nextStepType = 'check';
                content = plan.checks?.[0] || {
                    questionText: 'How would you summarize what you just read?',
                    checkType: 'recall'
                };
            }
        } else if (lastStep.step_type === 'application' || (isSkipping && lastStep.step_type === 'application')) {
            
            nextStepType = 'check';
            content = plan.checks?.[0] || {
                questionText: 'How would you summarize what you just read?',
                checkType: 'recall'
            };
        } else if (lastStep.step_type === 'check' || (isSkipping && lastStep.step_type === 'check')) {
            const currentCheckIndex =
                plan.checks?.findIndex(
                    (c: any) => c.questionText === lastStep.content.questionText
                ) ?? 0;
            const nextCheck = plan.checks?.[currentCheckIndex + 1];

            if (
                ['A', 'strong'].includes(lastStep.evaluation?.path) ||
                lastStep.evaluation?.outcome === 'strong' ||
                isSkipping
            ) {
                if (nextCheck) {
                    nextStepType = 'check';
                    content = nextCheck;
                } else {
                    nextStepType = 'confirm';
                    content = plan.confirmQuestion;
                }
            } else {
                if (lastStep.evaluation?.nextReinforceContent) {
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
            const lastQuestion = revSteps.find((s) => ['check', 'confirm', 'application'].includes(s.step_type));

            if (lastQuestion) {
                nextStepType = lastQuestion.step_type;
                content = lastQuestion.content;
            } else {
                nextStepType = 'check';
                content = plan.checks?.[0];
            }
        } else if (lastStep.step_type === 'confirm' || (isSkipping && lastStep.step_type === 'confirm')) {
            if (!lastStep.evaluation && !isSkipping)
                return res.status(200).json({ 
                    action: 'eval_pending', 
                    message: 'Confirm step evaluation in progress...' 
                });

            if (
                ['A', 'strong'].includes(lastStep.evaluation?.path) ||
                lastStep.evaluation?.outcome === 'strong' ||
                lastStep.evaluation?.masterySignal === 'solid' ||
                lastStep.evaluation?.masterySignal === 'developing' ||
                isSkipping
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
                    if (lastStep.evaluation?.nextReinforceContent) {
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
                stepHistory: previousSteps,
                plannedSteps
            });
        } else {
            nextStepType = 'completed';
            content = { text: 'Fallback completion state.' };
        }

        if (nextStepType === 'completed') {
            
            const planConcepts = sessionData.initial_plan?.concepts || [];
            const currentConceptMeta = planConcepts.find((c: any) => c.conceptId === conceptId);
            const conceptName = currentConceptMeta?.conceptName || 'Unknown Concept';

            if (sessionData.source_type === 'curriculum' && sessionData.source_session_id) {
                const curriculumId = sessionData.source_session_id;

                const { data: curr } = await supabaseAdmin
                    .from('curricula')
                    .select('*')
                    .eq('id', curriculumId)
                    .single();
                if (curr) {
                    const completed = curr.completed_concept_ids || [];
                    if (!completed.includes(conceptId)) {
                        completed.push(conceptId);

                        await supabaseAdmin
                            .from('curricula')
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

            
            
            try {
                const nodeResult = await findOrCreateConceptNode(
                    supabaseAdmin as any,
                    userId,
                    conceptName,
                    sessionId,
                    `Mastered via Flow session: ${conceptName}`
                );
                
                if (nodeResult) {
                    await updateConceptMastery(
                        supabaseAdmin as any,
                        userId,
                        nodeResult.id,
                        'solid',
                        'session',
                        sessionId
                    );
                }
            } catch (vaultErr) {
                console.error('[vault] Concept mastery update failed:', vaultErr);
            }

            return res.status(200).json({
                action: 'concept_complete',
                stepHistory: previousSteps,
                plannedSteps
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
                concept_id: vaultConceptId, 
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
            stepHistory: updatedHistory,
            plannedSteps
        });
    } catch (error: any) {
        console.error('Error in flow deterministic next step:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
