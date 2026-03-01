import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest } from '@/lib/sparks';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

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

    const { sessionId, conceptId } = req.body;
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

        const { data: progressData } = await supabaseAdmin
            .from('flow_concept_progress')
            .select('*')
            .eq('flow_session_id', sessionId)
            .eq('concept_id', conceptId)
            .single();

        if (!progressData || !progressData.orchestrator_plan) {
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
            .eq('concept_id', conceptId)
            .order('step_number', { ascending: true });

        const lastStep =
            previousSteps && previousSteps.length > 0
                ? previousSteps[previousSteps.length - 1]
                : null;

        if (lastStep && !lastStep.user_response && lastStep.step_type !== 'completed') {
            return res.status(200).json({
                step: lastStep,
                stepHistory: previousSteps
            });
        }

        let nextStepType = '';
        let content: any = {};

        if (!lastStep) {
            nextStepType = 'orient';
            content = plan.orient;
        } else if (lastStep.step_type === 'orient') {
            if (plan.build?.layers && plan.build.layers.length > 0) {
                nextStepType = 'build_layer';
                content = plan.build.layers[0];
            } else {
                // Skip build layers and anchor if accelerated path
                nextStepType = 'check';
                content = plan.checks?.[0] || {
                    questionText: 'How would you summarize this?',
                    checkType: 'recall'
                };
            }
        } else if (lastStep.step_type === 'build_layer') {
            const currentLayerNum = lastStep.content.layerNumber || 1;
            const nextLayer = plan.build?.layers?.find((l: any) => l.layerNumber > currentLayerNum);

            if (nextLayer) {
                nextStepType = 'build_layer';
                content = nextLayer;
            } else {
                if (!plan.anchor || plan.anchor.form === 'skip') {
                    nextStepType = 'check';
                    content = plan.checks?.[0] || {
                        questionText: 'How would you summarize this?',
                        checkType: 'recall'
                    };
                } else {
                    nextStepType = 'anchor';
                    content = { text: plan.anchor.text, form: plan.anchor.form };
                }
            }
        } else if (lastStep.step_type === 'anchor') {
            if (
                lastStep.response_type === 'needs_work' &&
                plan.anchor.alternativeText &&
                !lastStep.content.isAlternative
            ) {
                nextStepType = 'anchor';
                content = {
                    text: plan.anchor.alternativeText,
                    form: plan.anchor.form,
                    isAlternative: true
                };
            } else {
                nextStepType = 'check';
                content = plan.checks?.[0] || {
                    questionText: 'How would you summarize this?',
                    checkType: 'recall'
                };
            }
        } else if (lastStep.step_type === 'check') {
            if (!lastStep.evaluation)
                return res.status(400).json({ error: 'Check step not evaluated yet' });

            if (
                ['A', 'strong'].includes(lastStep.evaluation.path) ||
                lastStep.evaluation.outcome === 'strong'
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
            return res
                .status(200)
                .json({
                    action: 'concept_complete',
                    totalSparksSpent: sessionData.total_sparks_spent
                });
        } else {
            nextStepType = 'completed';
            content = { text: 'Fallback completion state.' };
        }

        if (nextStepType === 'completed') {
            if (sessionData.source_type === 'curriculum' && sessionData.source_id) {
                const curriculumId = sessionData.source_id;

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

                        // We also need to update curriculum_concept_progress
                        // Note: conceptId here maps to the concept's specific ID inside the curriculum
                        await supabaseAdmin
                            .from('curriculum_concept_progress')
                            .update({
                                status: 'completed',
                                completed_at: new Date().toISOString()
                            })
                            .eq('curriculum_id', curriculumId)
                            .eq('concept_path_id', conceptId);
                    }
                }
            }

            return res.status(200).json({
                action: 'concept_complete',
                totalSparksSpent: sessionData.total_sparks_spent,
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
                concept_id: conceptId,
                step_number: stepNumber,
                step_type: nextStepType,
                content: content,
                ai_reasoning: 'Strict deterministic routing',
                spark_cost: 0
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
