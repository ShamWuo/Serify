import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, hasEnoughSparks, deductSparks, SPARK_COSTS } from '@/lib/sparks';
import { createClient } from '@supabase/supabase-js';
import { SessionLearnerProfile } from '@/types/serify';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { stepId, userResponse } = req.body;
    if (!stepId || !userResponse) return res.status(400).json({ error: 'Missing stepId or userResponse' });

    try {
        const { data: step, error: stepError } = await supabaseAdmin
            .from('flow_steps')
            .select('*')
            .eq('id', stepId)
            .single();

        if (stepError || !step) return res.status(404).json({ error: 'Step not found' });

        await supabaseAdmin
            .from('flow_steps')
            .update({
                user_response: userResponse,
                responded_at: new Date().toISOString()
            })
            .eq('id', stepId);

        if (step.step_type !== 'check' && step.step_type !== 'confirm') {
            return res.status(200).json({ success: true });
        }

        const sessionId = step.flow_session_id;
        const conceptId = step.concept_id;

        const { data: sessionData } = await supabaseAdmin
            .from('flow_sessions')
            .select('learner_profile, initial_plan, total_sparks_spent')
            .eq('id', sessionId)
            .single();

        if (!sessionData) return res.status(404).json({ error: 'Session not found' });

        const { data: previousSteps } = await supabaseAdmin
            .from('flow_steps')
            .select('*')
            .eq('flow_session_id', sessionId)
            .eq('concept_id', conceptId)
            .order('step_number', { ascending: true });

        const planConcepts = sessionData.initial_plan?.concepts || [];
        const currentConcept = planConcepts.find((c: any) => c.conceptId === conceptId) || { conceptName: 'Unknown Topic' };

        let learnerProfile: SessionLearnerProfile = sessionData.learner_profile || {
            estimatedLevel: 'average',
            checkHistory: [],
            anglesUsed: [],
            reinforcementsRequired: 0
        };

        const teachingHistory = (previousSteps || [])
            .filter(s => ['orient', 'build_layer', 'anchor', 'reinforce'].includes(s.step_type))
            .map(s => `[${s.step_type}]: ${s.content?.text || s.content?.explanationText || JSON.stringify(s.content)}`);

        let sparkCost = SPARK_COSTS.FLOW_MODE_EVAL || 1;
        const hasSparks = await hasEnoughSparks(userId, sparkCost);
        if (!hasSparks) return res.status(403).json({ error: 'out_of_sparks' });
        await deductSparks(userId, sparkCost, 'flow_mode_eval');
        let totalSparksSpent = sessionData.total_sparks_spent + sparkCost;


        const evaluatorModel = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json' },
            systemInstruction: `You are evaluating a learner's answer to a check question in a Flow Mode session.
Return JSON strictly:
{
  "outcome": "strong" | "partial" | "weak",
  "path": "A" | "B" | "C",
  "whatWasCorrect": "string",
  "whatWasMissing": "string | null",
  "misconceptionDetected": boolean,
  "misconceptionDescription": "string | null",
  "feedbackText": "string",
  "reinforcementNeeded": boolean,
  "reinforcementAngle": "string | null",
  "masterySignal": "solid" | "developing" | "shaky" | "revisit",
  "levelAdjustment": "up" | "down" | "none"
}
Rules:
- feedbackText must be shown to the learner. 2-4 sentences max.
- Path A: confirm + add nuance. Path B: acknowledge right + explain missing. Path C: natural transition without failure.
- NEVER say "great job", "incorrect", "unfortunately", or "however".
- Evaluate against WHAT WAS ACTUALLY TAUGHT. Do not penalize for missing info not taught.`
        });

        const anglesUsedStr = learnerProfile.anglesUsed.filter((a: any) => a.conceptId === conceptId).map((a: any) => a.angle).join(', ') || 'none used yet';

        const promptText = `
CONCEPT: ${currentConcept.conceptName}
TEACHING HISTORY so far:
${teachingHistory.join('\n')}

CHECK QUESTION: "${step.content?.questionText}"
CHECK TYPE: ${step.content?.checkType || 'unknown'}
STRONG INDICATORS: ${step.content?.strongAnswerIndicators?.join(', ') || 'N/A'}
WEAK INDICATORS: ${step.content?.weakAnswerIndicators?.join(', ') || 'N/A'}

LEARNER'S ANSWER: "${userResponse}"
USED ANGLES FOR THIS CONCEPT: ${anglesUsedStr}
`;

        const result = await evaluatorModel.generateContent(promptText);
        const evalText = result.response.text();
        const evaluation = JSON.parse(evalText.replace(/```json/g, '').replace(/```/g, '').trim());

        let nextReinforceContent: string | null = null;

        if (evaluation.path === 'B' || evaluation.path === 'C') {
            const reinforceCost = SPARK_COSTS.FLOW_MODE_TEACH_NEW || 1;
            const hasSparksForReinforce = await hasEnoughSparks(userId, reinforceCost);

            if (hasSparksForReinforce) {
                await deductSparks(userId, reinforceCost, 'flow_mode_teach_new');
                sparkCost += reinforceCost;
                totalSparksSpent += reinforceCost;

                const reinforceModel = genAI.getGenerativeModel({
                    model: 'gemini-2.5-flash',
                    systemInstruction: `A learner needs a targeted re-explanation."
Return the re-explanation text only. No JSON. No preamble.`
                });

                const { data: progressData } = await supabaseAdmin
                    .from('flow_concept_progress')
                    .select('orchestrator_plan')
                    .eq('flow_session_id', sessionId)
                    .eq('concept_id', conceptId)
                    .single();

                const anglesAvailable = progressData?.orchestrator_plan?.anglesAvailable || [];

                const reinforcePromptText = `
CONCEPT: ${currentConcept.conceptName}
ALL ANGLES ALREADY USED: ${anglesUsedStr}
WHAT SPECIFICALLY THEY ARE MISSING: "${evaluation.whatWasMissing || 'Core concept understanding'}"
MISCONCEPTION DETECTED: ${evaluation.misconceptionDetected ? evaluation.misconceptionDescription : 'none'}

Generate an explanation that:
1. Uses a completely different angle from any already used.
2. Targets ONLY what was missing.
3. Is shorter than the original (3-5 sentences max).
4. If a misconception exists, corrects it directly without being condescending.
5. Ends with a natural bridge back to a question.
Available unused angles: ${anglesAvailable.filter((a: string) => !anglesUsedStr.includes(a)).join(', ')}
`;
                const reinforceResult = await reinforceModel.generateContent(reinforcePromptText);
                nextReinforceContent = reinforceResult.response.text().trim();

                if (evaluation.reinforcementAngle) {
                    learnerProfile.anglesUsed.push({
                        conceptId: conceptId,
                        angle: evaluation.reinforcementAngle,
                        timestamp: new Date().toISOString()
                    });
                }
                learnerProfile.reinforcementsRequired = (learnerProfile.reinforcementsRequired || 0) + 1;
            } else {
                nextReinforceContent = "I wanted to explain that from a new angle, but you're out of Sparks. Let's try the question again.";
            }
        }


        evaluation.nextReinforceContent = nextReinforceContent;


        learnerProfile.checkHistory.push({
            conceptId: conceptId,
            outcome: evaluation.outcome,
            pathTaken: evaluation.path,
            timestamp: new Date().toISOString()
        });

        if (evaluation.levelAdjustment === 'up' && learnerProfile.estimatedLevel !== 'advanced') {
            learnerProfile.estimatedLevel = learnerProfile.estimatedLevel === 'beginner' ? 'intermediate' : 'advanced';
        } else if (evaluation.levelAdjustment === 'down' && learnerProfile.estimatedLevel !== 'beginner') {
            learnerProfile.estimatedLevel = learnerProfile.estimatedLevel === 'advanced' ? 'intermediate' : 'beginner';
        }

        await supabaseAdmin.from('flow_sessions').update({
            learner_profile: learnerProfile,
            total_sparks_spent: totalSparksSpent
        }).eq('id', sessionId);

        await supabaseAdmin.from('flow_steps').update({ evaluation }).eq('id', stepId);

        return res.status(200).json({ evaluation, total_sparks_spent: totalSparksSpent });

    } catch (error: any) {
        console.error('Error in flow mode evaluate:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
