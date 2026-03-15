import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest, checkUsage, incrementUsage } from '@/lib/usage';
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

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendUpdate = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        sendUpdate({ status: 'Initializing...', progress: 5 });

        const hasUsage = (await checkUsage(userId, 'flow_sessions')).allowed;
        if (!hasUsage) {
            sendUpdate({ error: 'limit_reached', message: 'You have reached your feature limit.' });
            return res.end();
        }

        sendUpdate({ status: 'Connecting to Serify Engine...', progress: 15 });

        const { data: sessionData, error: sessionError } = await supabaseAdmin
            .from('flow_mode_session')
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

        // STRATEGY: We use the vaultConceptId as the primary key for flow_concept_progress.
        // However, we check for Plan ID fallback to handle legacy/mismatched records.
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
            systemInstruction: `You are Serify's Flow Mode teaching engine. Plan a tight teaching experience for one concept that reads like a coherent lesson page, not a series of disconnected steps.

TEACHING ARC:
Teach (one cohesive page) → Quick Checks (2–3 inline MCQ) → Deep Check (open-ended) → Confirm

Generate a complete teaching plan as JSON:
{
  "teach": {
    "text": "string — full combined lesson. Use markdown headings (## What is X?, ## How it works, ## Example) to break the content into readable sections. Cover definition + mechanism + worked example in one flowing piece.",
    "reinforcementText": "string — a shorter, more targeted version of the lesson text to be used if the learner needs a second pass or reinforcement. Focus on the core mechanism."
  },
  "quickChecks": [
    {
      "question": "string — short factual question about what was just taught",
      "options": ["string", "string", "string", "string"],
      "correctIndex": number
    }
  ],
  "checks": [
    {
      "checkType": "recall" | "mechanism" | "application",
      "questionText": "string",
      "unlocksAfter": ["recall", "mechanism"],
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
- Be concise and precise. No filler sentences, no rhetorical build-up.
- NO metaphors or analogies.
- The teach text MUST start with a ## heading that names the concept, then deliver the full explanation.
  Example structure for "Linearization":
  ## What is Linearization?
  Linearization approximates $f(x)$ near $x = a$ using the tangent line at that point.

  ## The Formula
  $$L(x) = f(a) + f'(a)(x - a)$$

  ## Worked Example
  To approximate $\\sqrt{4.1}$, let $f(x) = \\sqrt{x}$, $a = 4$...
- Use ## headings to separate definition, formula, and worked example sections. Do NOT use a single wall of text.
- NEVER begin with filler like "Let's explore..." or "Think of it like...".
- NEVER add unsolicited misconception warnings or "some learners think..." commentary.

QUICK CHECKS:
- Generate exactly 2–3 inline MCQ questions that test recall of what was just taught.
- Keep questions short (one sentence). Options should be plausible but clearly distinguishable.
- Questions should test different aspects: e.g., one on definition, one on formula, one on application setup.

LOGIC:
- Application checks ONLY if learner level is 'strong' OR unlocksAfter includes both 'recall' and 'mechanism'.
- NEVER write an application check as the first or only check.
- Confirm question must be harder than any check question.
- ACCELERATED PATH: If mastery state is 'solid' or 'developing', keep teach very short (just the key formula/definition), use only 1 quickCheck, go straight to confirm, AND set "accelerated": true. Otherwise set it to false.

FORMATTING — MANDATORY:
1. ALL math must use LaTeX: inline $...$, block $$...$$ on its own line. NEVER write math as plain text.
2. Do NOT wrap prose in code blocks (triple backticks). Only use code blocks for actual programming code.`
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

        (await incrementUsage(userId, 'flow_sessions').then(() => ({ success: true })));

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

        // ── Token / cost logging ──────────────────────────────
        const usage = result.response.usageMetadata;
        if (usage) {
            const inputTokens = usage.promptTokenCount ?? 0;
            const outputTokens = usage.candidatesTokenCount ?? 0;
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
