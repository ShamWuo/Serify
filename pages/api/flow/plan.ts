import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, hasEnoughSparks, deductSparks, SPARK_COSTS } from '@/lib/sparks';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const sparkCost = SPARK_COSTS.FLOW_MODE_PLAN || 1;
    const hasSparks = await hasEnoughSparks(userId, sparkCost);
    if (!hasSparks) {
        return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Spark to start Flow Mode.` });
    }

    const { targetConcepts, strongConcepts, feedbackSummary, sourceType, sourceSessionId } = req.body;

    if (!targetConcepts || targetConcepts.length === 0) {
        return res.status(400).json({ error: 'Missing target concepts' });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json' },
            systemInstruction: `You are Serify's Flow Mode learning coach. Your job is to build and execute a personalized learning path that takes this learner from their current understanding to genuine mastery of the target concepts.

Generate an initial learning plan as a strictly formatted JSON object:
{
  "concepts": [
    {
      "conceptId": "string-uuid-or-placeholder",
      "conceptName": "string",
      "priority": number (1 = highest),
      "estimatedSteps": number,
      "suggestedOpeningMove": "teach" | "misconception_correction" | "check_question",
      "prerequisiteCheck": "string name of concept or null",
      "definition": "string",
      "currentMastery": "shaky" | "revisit" | "solid" | "developing"
    }
  ],
  "overallStrategy": "string"
}

Rules:
- Order concepts from most critical gap to least
- Misconception concepts always get misconception_correction as opening move
- Revisit concepts always start with teach
- Shaky concepts can start with check_question to see what's there first
- Never plan more than one concept at a time — only plan the next one after the current is complete`
        });

        const promptText = `
TARGET CONCEPTS (what to teach):
${targetConcepts.map((c: any) => `
  - ${c.name || c.display_name} (ID: ${c.id || 'none'})
    Current mastery: ${c.currentMastery || c.current_mastery || 'Not started'}
    Definition: ${c.definition || 'none'}
    Known gaps: ${c.synthesis?.persistentGap || 'none detected'}
    Known misconceptions: ${c.misconceptions?.join(', ') || 'none detected'}
    Sessions covered: ${c.sessionCount || c.session_count || 0}
    Hint requested previously: ${c.hintRequestCount || c.hint_request_count || 0} times
`).join('\n')}

WHAT THIS LEARNER UNDERSTANDS WELL (use as bridges):
${(strongConcepts || []).map((c: any) => `- ${c.name || c.display_name}`).join('\n') || 'None provided'}

LEARNER'S SESSION HISTORY SUMMARY:
${feedbackSummary || 'No prior session context'}
`;

        const deduction = await deductSparks(userId, sparkCost, 'flow_mode_plan');
        if (!deduction.success) {
            return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Spark to start Flow Mode.` });
        }

        const result = await model.generateContent(promptText);
        const text = result.response.text();

        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const plan = JSON.parse(cleanedText);


        plan.concepts = plan.concepts.map((c: any, i: number) => {
            const original = targetConcepts.find((tc: any) => tc.id === c.conceptId || tc.name === c.conceptName || tc.display_name === c.conceptName);
            return {
                ...c,
                conceptId: original?.id || uuidv4()
            };
        });


        const sessionId = uuidv4();
        const { error: dbError } = await supabaseAdmin
            .from('flow_sessions')
            .insert({
                id: sessionId,
                user_id: userId,
                source_type: sourceType || 'standalone',
                source_session_id: sourceSessionId || null,
                initial_plan: plan,
                concepts_completed: [],
                concepts_in_progress: [],
                status: 'active',
                total_sparks_spent: sparkCost
            });

        if (dbError) {
            console.error('Error inserting flow session:', dbError);
            return res.status(500).json({ error: 'Failed to save session setup' });
        }

        return res.status(200).json({ plan, sessionId, total_sparks_spent: sparkCost });

    } catch (error: any) {
        console.error('Error in flow mode plan generation:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
