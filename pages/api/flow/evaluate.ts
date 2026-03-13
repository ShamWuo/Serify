import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, checkUsage, incrementUsage } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { SessionLearnerProfile, MasteryState } from '@/types/serify';
import { findOrCreateConceptNode, updateConceptMastery } from '@/lib/vault';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
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

    const { stepId, userResponse } = req.body;
    if (!stepId || !userResponse)
        return res.status(400).json({ error: 'Missing stepId or userResponse' });

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
            .from('flow_mode_session')
            .select('learner_profile, initial_plan')
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

        // Search for the concept in the plan using both the current ID (might be UUID) 
        // and its name (if we can find it in the vault)
        let currentConcept = planConcepts.find((c: any) => c.conceptId === conceptId);

        if (!currentConcept) {
            // If not found by ID, try to find by name from the Vault
            const { data: vaultNode } = await supabaseAdmin
                .from('knowledge_nodes')
                .select('display_name')
                .eq('id', conceptId)
                .maybeSingle();

            if (vaultNode) {
                currentConcept = planConcepts.find((c: any) =>
                    c.conceptName.toLowerCase() === vaultNode.display_name.toLowerCase()
                );
            }
        }

        if (!currentConcept) {
            currentConcept = { conceptName: 'Unknown Topic' };
        }

        let learnerProfile: SessionLearnerProfile = sessionData.learner_profile || {
            estimatedLevel: 'average',
            checkHistory: [],
            anglesUsed: [],
            reinforcementsRequired: 0
        };

        const teachingHistory = (previousSteps || [])
            .filter((s) => ['orient', 'build_layer', 'anchor', 'reinforce'].includes(s.step_type))
            .map(
                (s) =>
                    `[${s.step_type}]: ${s.content?.text || s.content?.explanationText || JSON.stringify(s.content)}`
            );

        const hasUsage = (await checkUsage(userId, 'flow_sessions')).allowed;
        if (!hasUsage) return res.status(403).json({ error: 'limit_reached' });
        (await incrementUsage(userId, 'flow_sessions').then(() => ({ success: true })));

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

        const anglesUsedStr =
            learnerProfile.anglesUsed
                .filter((a: any) => a.conceptId === conceptId)
                .map((a: any) => a.angle)
                .join(', ') || 'none used yet';

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

        // ── Token / cost logging ──────────────────────────────
        const evalUsage = result.response.usageMetadata;
        if (evalUsage) {
            const i = evalUsage.promptTokenCount ?? 0;
            const o = evalUsage.candidatesTokenCount ?? 0;
            console.log(
                `[evaluate] tokens — in: ${i}, out: ${o}` +
                ` | est. cost: $${((i / 1_000_000) * 0.075 + (o / 1_000_000) * 0.30).toFixed(6)}` +
                ` | step: ${stepId}`
            );
        }
        const cleanedText = evalText
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
        let evaluation: any;
        try {
            evaluation = JSON.parse(cleanedText);
        } catch (_firstErr) {
            const reescaped = cleanedText.replace(/\\(?!["\\\/bfnrtu])/g, '\\\\');
            try {
                evaluation = JSON.parse(reescaped);
            } catch (finalErr: any) {
                console.error('Failed to parse evaluation JSON:', finalErr.message);
                return res.status(500).json({ error: 'Evaluation engine returned malformed JSON.' });
            }
        }

        let nextReinforceContent: string | null = null;

        if (evaluation.path === 'B' || evaluation.path === 'C') {
            const hasUsageForReinforce = (await checkUsage(userId, 'flow_sessions')).allowed;

            if (hasUsageForReinforce) {
                (await incrementUsage(userId, 'flow_sessions').then(() => ({ success: true })));

                const reinforceModel = genAI.getGenerativeModel({
                    model: 'gemini-2.5-flash',
                    systemInstruction: `You are Serify's adaptive reinforcement engine. Provide a targeted re-explanation of a specific concept area where the learner is struggling.
                    
                    RULES:
                    - Return ONLY the re-explanation text. No JSON, no conversational filler.
                    - MANDATORY: Use LaTeX for ALL math ($...$ for inline, $$...$$ for block).
                    - STRUCTURE: Use bolding (**concept**) for emphasis and bullet points for lists to improve scannability.
                    - TONE: Professional, supportive, but extremely concise. 3-5 sentences total.
                    - No preamble (do not say "Sure", "Let's look at this", etc.).`
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

                // ── Token / cost logging (reinforce) ─────────
                const rUsage = reinforceResult.response.usageMetadata;
                if (rUsage) {
                    const i = rUsage.promptTokenCount ?? 0;
                    const o = rUsage.candidatesTokenCount ?? 0;
                    console.log(
                        `[evaluate/reinforce] tokens — in: ${i}, out: ${o}` +
                        ` | est. cost: $${((i / 1_000_000) * 0.075 + (o / 1_000_000) * 0.30).toFixed(6)}`
                    );
                }

                if (evaluation.reinforcementAngle) {
                    learnerProfile.anglesUsed.push({
                        conceptId: conceptId,
                        angle: evaluation.reinforcementAngle,
                        timestamp: new Date().toISOString()
                    });
                }
                learnerProfile.reinforcementsRequired =
                    (learnerProfile.reinforcementsRequired || 0) + 1;
            } else {
                nextReinforceContent =
                    "I wanted to explain that from a new angle, but you've reached your feature limit for this period. Let's try the question again.";
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
            learnerProfile.estimatedLevel =
                learnerProfile.estimatedLevel === 'beginner' ? 'intermediate' : 'advanced';
        } else if (
            evaluation.levelAdjustment === 'down' &&
            learnerProfile.estimatedLevel !== 'beginner'
        ) {
            learnerProfile.estimatedLevel =
                learnerProfile.estimatedLevel === 'advanced' ? 'intermediate' : 'beginner';
        }

        await supabaseAdmin
            .from('flow_mode_session')
            .update({
                learner_profile: learnerProfile
            })
            .eq('id', sessionId);

        await supabaseAdmin.from('flow_steps').update({ evaluation }).eq('id', stepId);

        // PROACTIVE MASTERY UPDATE:
        // Record this mastery signal in the knowledge vault in real-time.
        try {
            const masteryState: MasteryState = evaluation.masterySignal || 'revisit';
            const conceptName = currentConcept?.conceptName || 'Unknown Concept';

            // 1. Ensure node exists
            const node = await findOrCreateConceptNode(
                supabaseAdmin as any,
                userId,
                conceptName,
                sessionId,
                `Identified via Flow session: ${conceptName}`
            );

            if (node) {
                // 2. Record this specific mastery event
                await updateConceptMastery(
                    supabaseAdmin as any,
                    userId,
                    node.id,
                    masteryState,
                    'session', // Treated as a session event for history
                    sessionId
                );
            }
        } catch (vaultErr) {
            console.error('[vault] Proactive mastery update failed:', vaultErr);
        }

        return res.status(200).json({ evaluation });
    } catch (error: any) {
        console.error('Error in flow mode evaluate:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
