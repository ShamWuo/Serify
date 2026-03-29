import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextApiRequest, NextApiResponse } from 'next';
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

export const config = {
    api: {
        bodyParser: true,
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { sessionId, conceptId } = req.body;
    if (!sessionId || !conceptId) return res.status(400).json({ error: 'Missing sessionId or conceptId' });

    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendUpdate = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        sendUpdate({ status: 'Initializing...', progress: 5 });

        const usage = await incrementUsage(userId, 'flow_sessions');
        if (!usage.allowed) {
            sendUpdate({ error: 'limit_reached', message: 'You have reached your feature limit.' });
            return res.end();
        }

        sendUpdate({ status: 'Connecting to Serify Engine...', progress: 15 });

        const { data: sessionData, error: sessionError } = await supabaseAdmin
            .from('flow_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (sessionError || !sessionData) {
            sendUpdate({ error: 'Session not found' });
            return res.end();
        }

        const planConcepts = sessionData.initial_plan?.concepts || [];
        const currentConcept = planConcepts.find((c: any) => c.conceptId === conceptId) || {
            conceptName: 'Unknown Topic'
        };
        const conceptName = currentConcept.conceptName || 'Unknown Topic';

        sendUpdate({ status: `Preparing vault for ${conceptName}...`, progress: 25 });

        let vaultConceptId: string;
        try {
            const node = await findOrCreateConceptNode(
                supabaseAdmin as any,
                userId,
                conceptName,
                sessionId,
                `Learning path: ${conceptName}`
            );
            if (!node || !node.id) {
                throw new Error(`Failed to ensure concept node in vault for "${conceptName}"`);
            }
            vaultConceptId = node.id;
            console.log(`[orchestrate-stream] Vault ID: ${vaultConceptId} for concept: ${conceptId} (${conceptName})`);
        } catch (err: any) {
            console.error('[orchestrate-stream] Vault error:', err);
            sendUpdate({ error: `Vault error: ${err.message}` });
            return res.end();
        }

        
        
        let { data: existingProgress } = await supabaseAdmin
            .from('flow_concept_progress')
            .select('*')
            .eq('flow_session_id', sessionId)
            .eq('concept_id', vaultConceptId)
            .maybeSingle();

        if (!existingProgress && vaultConceptId !== conceptId) {
            console.log(`[orchestrate-stream] Progress not found by VaultID (${vaultConceptId}). Trying PlanID (${conceptId})`);
            const { data: fallbackProgress } = await supabaseAdmin
                .from('flow_concept_progress')
                .select('*')
                .eq('flow_session_id', sessionId)
                .eq('concept_id', conceptId)
                .maybeSingle();
            existingProgress = fallbackProgress;

            if (existingProgress) {
                console.log(`[orchestrate-stream] Found existing progress by PlanID. Aligning to VaultID: ${vaultConceptId}`);
                await supabaseAdmin.from('flow_concept_progress').update({ concept_id: vaultConceptId }).eq('id', existingProgress.id);
            }
        }

        if (existingProgress?.orchestrator_plan) {
            console.log(`[orchestrate-stream] Restoring existing plan for ${conceptName} (ID: ${existingProgress.concept_id})`);
            sendUpdate({
                status: 'Restoring your path...',
                progress: 100,
                orchestratorPlan: existingProgress.orchestrator_plan
            });
            return res.end();
        }

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

        sendUpdate({ status: 'Deeply analyzing learner profile...', progress: 40 });

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
  "anglesAvailable": ["string", "string", "string", "string"],
  "accelerated": boolean
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
- ACCELERATED PATH: If mastery is 'solid', keep teach short, 1 quickCheck, and go to confirm, AND set "accelerated": true.

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

        sendUpdate({ status: `Generating custom curriculum for ${conceptName}...`, progress: 60 });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        let result: Awaited<ReturnType<typeof model.generateContent>>;
        try {
            result = await model.generateContent(promptText, { signal: controller.signal } as any);
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError' || err.message?.includes('abort')) {
                sendUpdate({ error: 'Flow Mode is taking too long. Please try again.' });
                res.end();
                return;
            }
            throw err;
        }
        clearTimeout(timeoutId);
        const text = result.response.text();

        
        const usageMetadata = result.response.usageMetadata;
        if (usageMetadata) {
            const inputTokens = usageMetadata.promptTokenCount ?? 0;
            const outputTokens = usageMetadata.candidatesTokenCount ?? 0;
            const costUsd = (inputTokens / 1_000_000) * 0.075 + (outputTokens / 1_000_000) * 0.30;
            console.log(
                `[orchestrate-stream] tokens — in: ${inputTokens}, out: ${outputTokens}` +
                ` | est. cost: $${costUsd.toFixed(6)} | concept: ${conceptId}`
            );
        }

        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        sendUpdate({ status: 'Structuring your learning path...', progress: 85 });

        let orchestratorPlan: any;
        try {
            orchestratorPlan = JSON.parse(cleanedText);
        } catch (e) {
            const reescaped = cleanedText.replace(/\\(?!["\\\/bfnrtu])/g, '\\\\');
            orchestratorPlan = JSON.parse(reescaped);
        }

        let progressId = existingProgress?.id;

        if (!progressId) {
            const { data: newProgress } = await supabaseAdmin.from('flow_concept_progress').insert({
                id: uuidv4(),
                flow_session_id: sessionId,
                concept_id: vaultConceptId,
                user_id: userId,
                orchestrator_plan: orchestratorPlan,
                status: 'in_progress'
            }).select().single();
            progressId = newProgress?.id;
        } else {
            await supabaseAdmin
                .from('flow_concept_progress')
                .update({ orchestrator_plan: orchestratorPlan, status: 'in_progress' })
                .eq('id', progressId);
        }

        sendUpdate({
            status: 'Ready!',
            progress: 100,
            done: true,
            orchestratorPlan
        });

    } catch (error: any) {
        console.error('SSE Flow Error:', error);
        sendUpdate({ error: error.message || 'Orchestration failed' });
    } finally {
        res.end();
    }
}
