import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, deductSparks, hasEnoughSparks, SPARK_COSTS } from '@/lib/sparks';
import { parseJSON } from '@/lib/serify-ai';
import { createClient } from '@supabase/supabase-js';
import { findOrCreateConceptNode, updateTopicClusters } from '@/lib/vault';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { sessionData, assessments, concepts, isBasicMode } = req.body;

    if (!sessionData || !assessments) {
        return res.status(400).json({ message: 'Missing required session or assessment data' });
    }

    const user = await authenticateApiRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const sparkCost = isBasicMode ? SPARK_COSTS.BASIC_FEEDBACK_REPORT : (SPARK_COSTS.BASIC_FEEDBACK_REPORT + (SPARK_COSTS.FULL_FEEDBACK_UPGRADE || 2));
    const hasSparks = await hasEnoughSparks(user, sparkCost);
    if (!hasSparks) {
        return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Sparks to generate this report.` });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: 'application/json',
                maxOutputTokens: 2000,
                temperature: 0.1
            },
        });

        const prompt = `
    Synthesize the following answer assessments into a coherent student feedback report. The tone must be diagnostic and curious, never evaluative. First-person from Serify's perspective ("Your answers show...").

    Provide a JSON object EXACTLY matching this structure:
    {
      "summary_sentence": "A 1-2 sentence high level summary of their grasp on the material.",
      "strength_map": [{"concept_id": "...", "mastery_state": "...", "feedback_text": "..."}],
      "cognitive_analysis": {
        "strong_patterns": "a paragraph",
        "weak_patterns": "a paragraph"
      },
      "misconception_report": [{"concept_id": "...", "implied_belief": "...", "actual_reality": "...", "why_it_matters": "..."}],
      "focus_suggestions": [{"title": "...", "reason": "...", "concept_id": "..."}],
      "overall_counts": {"solid": 0, "developing": 0, "shaky": 0, "revisit": 0, "skipped": 0}
    }

    Note: For misconception_report, only include real misconceptions found. For focus_suggestions, provide up to 3 actionable specific steps.

    Concepts from the session (For 'feedback_text', use the actual concept names from this list, NOT placeholders like "c1" or "Concept c2". BUT for 'concept_id' fields, still use the exact ID string like "c1"):
    ${JSON.stringify(concepts || sessionData?.concepts || [])}

    Assessments:
    ${JSON.stringify(assessments)}
    `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        const synthesis = parseJSON<any>(responseText);

        if (isBasicMode) {
            synthesis.cognitive_analysis = null;
            synthesis.focus_suggestions = [];
        }

        await deductSparks(user, sparkCost, isBasicMode ? 'session_basic_analysis' : 'session_full_analysis');


        const sessionId = sessionData?.sessionId || sessionData?.id;
        const conceptsToWrite: { name: string; description: string }[] =
            (concepts || sessionData?.concepts || []).map((c: any) => ({
                name: c.name || c.display_name || '',
                description: c.description || c.definition || ''
            })).filter((c: any) => c.name);

        if (sessionId && conceptsToWrite.length > 0) {
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            Promise.all(
                conceptsToWrite.map((c) =>
                    findOrCreateConceptNode(supabaseAdmin, user, c.name, sessionId, c.description)
                )
            ).then((results) => {
                const newNodeCount = results.filter(Boolean).length;
                if (newNodeCount >= 5) {
                    updateTopicClusters(supabaseAdmin, user).catch(console.error);
                }
            }).catch(console.error);
        }

        res.status(200).json({ report: synthesis });
    } catch (error) {
        console.error('Error synthesizing report:', error);
        res.status(500).json({ message: 'Failed to synthesize report' });
    }
}
