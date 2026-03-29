import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, incrementUsage } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { findOrCreateConceptNode } from '@/lib/vault';

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

    const usage = await incrementUsage(userId, 'flow_sessions');
    if (!usage.allowed)
        return res
            .status(403)
            .json({
                error: 'limit_reached',
                message: 'You have reached your feature limit.'
            });

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

        const planConcepts = sessionData.initial_plan?.concepts || [];
        const currentConcept = planConcepts.find((c: any) => c.conceptId === conceptId) || {
            conceptName: 'Unknown Topic'
        };
        const conceptName = currentConcept.conceptName || 'Unknown Topic';

        
        const node = await findOrCreateConceptNode(
            supabaseAdmin as any,
            userId,
            conceptName,
            sessionId,
            `Learning path: ${conceptName}`
        );
        const vaultConceptId = node?.id || conceptId;

        const { data: strongNodes } = await supabaseAdmin
            .from('knowledge_nodes')
            .select('canonical_name')
            .eq('user_id', userId)
            .eq('current_mastery', 'solid')
            .limit(10);
        const strongConcepts = strongNodes?.map((n) => n.canonical_name) || [];

        const defaultProfile = {
            estimatedLevel: 'average',
            checkHistory: [],
            anglesUsed: [],
            reinforcementsRequired: 0
        };
        const learnerProfile = sessionData.learner_profile || defaultProfile;

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json' },
            systemInstruction: `You are Serify's Flow Mode teaching engine. Plan a robust, multi-part teaching experience for one concept that emphasizes active application.

TEACHING ARC:
Lesson Section (Content + 2-3 Interactive MCQs) → Application Step (Specific task using the concept) → Deep Check (Open-ended reasoning) → Confirm

Generate a complete teaching plan as JSON:
{
  "teach": {
    "text": "string — full combined lesson. Use markdown headings (## What is X?, ## How it works, ## Example). Cover definition + mechanism + worked example.",
    "reinforcementText": "string — a shorter, more targeted version of the lesson text.",
    "quickChecks": [
      {
        "question": "string — short factual question about what was just taught",
        "options": ["string", "string", "string", "string"],
        "correctIndex": number
      }
    ]
  },
  "application": {
    "taskPrompt": "string — a specific, challenging task where they must USE what they learned. e.g. 'Given a circuit with X and Y, calculate Z' or 'Write a function that...'",
    "hint": "string — subtle guidance if they get stuck",
    "evaluationCriteria": ["string"]
  },
  "checks": [
    {
      "checkType": "comprehensive",
      "questionText": "string - Exactly ONE comprehensive open-ended question that tests mechanism AND application together.",
      "unlocksAfter": ["recall", "mechanism", "application"],
      "strongAnswerIndicators": ["string"],
      "weakAnswerIndicators": ["string"]
    }
  ],
  "confirmQuestion": {
    "questionText": "string",
    "whyThisIsHarder": "string"
  },
  "anglesAvailable": ["string", "string", "string", "string"]
}

RULES YOU MUST FOLLOW:

STYLE & TONE:
- Be concise and precise. No filler, no metaphors.
- USE ## headings for teach text.
- Start with a ## heading.

APPLICATION TASK:
- This is a new MANDATORY step. It should feel like a "mini-project" or a "problem set" item.
- It must require the learner to apply the core mechanism, not just recall it.

QUICK CHECKS:
- Generate 2–3 inline MCQ questions for the lesson section.

CHECKS (Deep Evaluation):
- Generate EXACTLY ONE item in the "checks" array. Do not generate multiple checks. Make it comprehensive.

LOGIC:
- ACCELERATED PATH: If mastery is 'solid', keep teach short, 1 quickCheck, and go to confirm.

FORMATTING:
1. ALL math must use LaTeX: inline $...$, block $$...$$.
2. NO triple backticks for prose.`
        });

        const promptText = `
CONCEPT TO TEACH:
Name: ${conceptName}
Definition: ${currentConcept.definition || 'Not provided'}
Known misconceptions for this learner: ${currentConcept.prerequisiteCheck ? currentConcept.prerequisiteCheck : 'none'}
Current mastery state: ${currentConcept.currentMastery || 'Not started'}

LEARNER PROFILE:
Estimated level this session: ${learnerProfile.estimatedLevel}
Concepts already covered this session: ${sessionData.concepts_completed?.join(', ') || 'None'}
What this learner understands well (use as bridges): ${strongConcepts.join(', ') || 'None known yet'}
Reinforcements required so far this session: ${learnerProfile.reinforcementsRequired || 0}
`;

        const result = await model.generateContent(promptText);
        const text = result.response.text();

        
        const usage = result.response.usageMetadata;
        if (usage) {
            const inputTokens = usage.promptTokenCount ?? 0;
            const outputTokens = usage.candidatesTokenCount ?? 0;
            const costUsd = (inputTokens / 1_000_000) * 0.075 + (outputTokens / 1_000_000) * 0.30;
            console.log(
                `[orchestrate] tokens — in: ${inputTokens}, out: ${outputTokens}` +
                ` | est. cost: $${costUsd.toFixed(6)} | concept: ${conceptId}`
            );
        }
        const cleanedText = text
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
        let orchestratorPlan: any;
        try {
            orchestratorPlan = JSON.parse(cleanedText);
        } catch (_firstErr) {
            
            
            const reescaped = cleanedText.replace(/\\(?!["\\\/bfnrtu])/g, '\\\\');
            try {
                orchestratorPlan = JSON.parse(reescaped);
            } catch (finalErr: any) {
                console.error('Failed to parse orchestrator plan JSON:', finalErr.message);
                console.error('Raw text:', cleanedText.slice(0, 500));
                return res.status(500).json({ error: 'AI returned malformed JSON. Please try again.' });
            }
        }

        const { data: existingProgress } = await supabaseAdmin
            .from('flow_concept_progress')
            .select('id')
            .eq('flow_session_id', sessionId)
            .eq('concept_id', vaultConceptId)
            .maybeSingle();

        let updateError;
        if (existingProgress) {
            const { error } = await supabaseAdmin
                .from('flow_concept_progress')
                .update({
                    orchestrator_plan: orchestratorPlan,
                    status: 'in_progress'
                })
                .eq('id', existingProgress.id);
            updateError = error;
        } else {
            const progressId = uuidv4();
            const { error } = await supabaseAdmin.from('flow_concept_progress').insert({
                id: progressId,
                flow_session_id: sessionId,
                concept_id: vaultConceptId,
                user_id: userId,
                orchestrator_plan: orchestratorPlan,
                status: 'in_progress'
            });
            updateError = error;
        }

        if (updateError) {
            console.error('Error updating orchestrator plan:', updateError);
            return res.status(500).json({ error: 'Failed to save orchestrator plan' });
        }

        return res
            .status(200)
            .json({
                orchestratorPlan
            });
    } catch (error: any) {
        console.error('Error in flow orchestrator:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
