import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { evaluateScenario } from '@/lib/serify-ai';
import { Database } from '@/types/db_types_new';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await authenticateApiRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { sessionId, responseId, userAnswer, timeSpentSeconds, scenarioText, questionText } = req.body;

  if (!sessionId || !responseId || !userAnswer || !scenarioText || !questionText) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
     // Fetch user plan
    const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', userId)
        .single();
    
    // 1. Fetch Practice Session and verify
    const { data: practiceSession, error: fetchSessionError } = await supabase
        .from('practice_sessions')
        .select('*, knowledge_nodes(id, display_name, definition)')
        // We need to fetch the concepts involved to pass to AI
        // However, knowledge_nodes is joined differently (via array). We'll query them separately.
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

    if (fetchSessionError || !practiceSession) {
        return res.status(404).json({ error: 'Session not found' });
    }

    if (practiceSession.status !== 'in_progress') {
        return res.status(400).json({ error: 'Session is not in progress' });
    }

    // Default to empty array if no concepts
    const conceptIds = practiceSession.concept_ids || [];
    let targetConcepts: { name: string; description: string; id: string }[] = [];

    if (conceptIds.length > 0) {
        const { data: concepts } = await supabase
            .from('knowledge_nodes')
            .select('id, display_name, definition')
            .in('id', conceptIds)
            .eq('user_id', userId);
        
        targetConcepts = concepts?.map((c: any) => ({
            id: c.id,
            name: (c as any).display_name,
            description: (c as any).definition || 'No description available'
        })) || [];
    }

    // 2. Evaluate via AI
    const evaluation = await evaluateScenario(
        scenarioText,
        questionText,
        targetConcepts,
        userAnswer,
        profile?.subscription_plan || 'free'
    );

    // 3. Update Practice Response with feedback
    await supabase
        .from('practice_responses')
        .update({
            user_response: userAnswer,
            response_quality: evaluation.score,
            ai_feedback: evaluation.feedback,
            time_spent_seconds: timeSpentSeconds
        })
        .eq('id', responseId)
        .eq('practice_session_id', sessionId); // Extra safety

    // 4. Update Practice Session status
    await supabase
        .from('practice_sessions')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            time_spent_seconds: timeSpentSeconds,
            overall_performance: evaluation.score,
            performance_report: { 
                scenarioText,
                questionText,
                evaluation
            }
        })
        .eq('id', sessionId);

    // 5. Handle Vault Regressions vs Progressions
    // Scenario tests application. A 'strong' performance could upgrade 'developing' to 'solid'.
    // A 'weak' performance might downgrade 'solid' to 'shaky'.
    for (const concept of targetConcepts) {
        const { data: node } = await supabase
            .from('knowledge_nodes')
            .select('current_mastery')
            .eq('id', concept.id)
            .single();
        
        if (node && (node as any).current_mastery) {
            const currentState = (node as any).current_mastery;
            let newStateStr = currentState;

            if (evaluation.score === 'weak' && (currentState === 'solid' || currentState === 'mastered')) {
                newStateStr = 'shaky';
            } else if (evaluation.score === 'strong' && (currentState === 'developing' || currentState === 'shaky')) {
                newStateStr = 'solid'; // Upgrades to solid. Only Spaced Repetition upgrades to Mastered.
            }

            if (currentState !== newStateStr) {
                // Log Regression / Progression
                await supabase.from('vault_regressions').insert({
                    user_id: userId,
                    concept_id: concept.id,
                    practice_session_id: sessionId,
                    previous_state: currentState,
                    new_state: newStateStr,
                    regression_note: `Performance changed to ${evaluation.score} during scenario practice.`
                });
                
                // Update state
                await supabase
                    .from('knowledge_nodes')
                    .update({ current_mastery: newStateStr })
                    .eq('id', concept.id);
            }
        }
    }

    res.status(200).json({ success: true, evaluation });
  } catch (error: any) {
    console.error('API Error /api/practice/scenario/evaluate:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
