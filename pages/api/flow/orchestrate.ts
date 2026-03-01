import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, hasEnoughSparks, deductSparks, SPARK_COSTS } from '@/lib/sparks';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

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

    const sparkCost = SPARK_COSTS.FLOW_MODE_PLAN || 2;
    const hasSparks = await hasEnoughSparks(userId, sparkCost);
    if (!hasSparks)
        return res
            .status(403)
            .json({
                error: 'out_of_sparks',
                message: `You need ${sparkCost} Spark to orchestrate this concept.`
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
            systemInstruction: `You are Serify's Flow Mode teaching engine. You are about to teach one concept to a specific learner. Your job is to plan the full teaching arc for this concept before delivering the first step.

TEACHING ARC TO FOLLOW:
Orient → Build (layered) → Anchor → Check → Reinforce (if needed) → Confirm

Generate a complete teaching plan as JSON:
{
  "orient": { "text": "string" },
  "build": {
    "layers": [
      {
        "layerNumber": number,
        "layerType": "plain_language" | "mechanism" | "worked_example" | "connection",
        "text": "string"
      }
    ]
  },
  "anchor": {
    "form": "analogy" | "contrast" | "skip",
    "text": "string",
    "alternativeText": "string"
  },
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
  "anglesAvailable": ["string", "string", "string", "string"]
}

RULES YOU MUST FOLLOW:
- Application check questions ONLY included if learner level is 'strong' OR unlocksAfter includes both 'recall' and 'mechanism'.
- NEVER write an application check as the first or only check.
- Build layers must genuinely build on each other.
- Orient paragraph must not contain jargon from the mechanism layer.
- Confirm question must be harder than any check question.
- If a misconception is flagged, Anchor MUST use Form B (contrast) targeting that misconception.
- Connection layer (layer 4) must reference a concept from the learner's strong concepts list if provided.
- Minimum 4 angles available. Each must be genuinely different domain or framing.
- ACCELERATED PATH: If "Current mastery state" is 'solid' or 'developing', keep the build layers completely empty (0 layers) and skip the anchor. Jump straight from orient to checking their knowledge.`
        });

        const promptText = `
CONCEPT TO TEACH:
Name: ${currentConcept.conceptName}
Definition: ${currentConcept.definition || 'Not provided'}
Known misconceptions for this learner: ${currentConcept.prerequisiteCheck ? currentConcept.prerequisiteCheck : 'none'}
Current mastery state: ${currentConcept.currentMastery || 'Not started'}

LEARNER PROFILE:
Estimated level this session: ${learnerProfile.estimatedLevel}
Concepts already covered this session: ${sessionData.concepts_completed?.join(', ') || 'None'}
What this learner understands well (use as bridges): ${strongConcepts.join(', ') || 'None known yet'}
Reinforcements required so far this session: ${learnerProfile.reinforcementsRequired || 0}
`;

        await deductSparks(userId, sparkCost, 'flow_mode_plan');

        const result = await model.generateContent(promptText);
        const text = result.response.text();
        const cleanedText = text
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
        const orchestratorPlan = JSON.parse(cleanedText);

        const { data: existingProgress } = await supabaseAdmin
            .from('flow_concept_progress')
            .select('id')
            .eq('flow_session_id', sessionId)
            .eq('concept_id', conceptId)
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
                concept_id: conceptId,
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

        await supabaseAdmin
            .from('flow_sessions')
            .update({ total_sparks_spent: sessionData.total_sparks_spent + sparkCost })
            .eq('id', sessionId);

        return res
            .status(200)
            .json({
                orchestratorPlan,
                total_sparks_spent: sessionData.total_sparks_spent + sparkCost
            });
    } catch (error: any) {
        console.error('Error in flow orchestrator:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
