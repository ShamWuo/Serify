import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { evaluateExam } from '@/lib/serify-ai';
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
  const { sessionId, answers, timeSpentSeconds } = req.body;

  if (!sessionId || !answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
     // Fetch user plan
    const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', userId)
        .single();
    
    // 1. Fetch existing session to verify ownership and status
    const { data: practiceSession, error: fetchSessionError } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

    if (fetchSessionError || !practiceSession) {
        return res.status(404).json({ error: 'Session not found' });
    }

    if (practiceSession.status !== 'in_progress') {
        return res.status(400).json({ error: 'Session is not in progress' });
    }

    // 2. Fetch questions for this session to map answers
    const { data: practiceResponses, error: responsesError } = await supabase
        .from('practice_responses')
        .select('*, knowledge_nodes(display_name)')
        .eq('practice_session_id', sessionId)
        .order('question_number', { ascending: true });

    if (responsesError || !practiceResponses) {
        throw new Error('Failed to fetch questions');
    }

    // Merge provided answers with questions
    const questionsForEval = practiceResponses.map(pr => {
        const providedAnswer = answers.find(a => a.questionId === pr.id)?.answer || '';
        const diffMatrix: Record<string, number> = { 'auto': 3, 'easy': 1, 'medium': 3, 'hard': 5 };
        return {
            id: pr.id,
            questionText: pr.question_text,
            answer: providedAnswer,
            conceptId: pr.concept_id!,
            conceptName: (pr.knowledge_nodes as any)?.display_name || 'Unknown',
            difficulty: diffMatrix[practiceSession.difficulty_level || 'auto'] || 3
        };
    });

    // 3. Evaluate via AI
    const evaluation = await evaluateExam(questionsForEval, profile?.subscription_plan || 'free');

    // 4. Update Practice Responses with feedback
    // Perform sequentially or batch update
    const scoreMatrix: Record<string, number> = { 'strong': 100, 'developing': 60, 'shaky': 30, 'blank': 0 };
    let totalScore = 0;

    for (let i = 0; i < questionsForEval.length; i++) {
        const q = questionsForEval[i];
        // Ensure feedback array matches length or map safely
        const feedbackObj = evaluation.questionFeedback[i] || { score: 'blank', feedback: 'No feedback generated.' };
        const points = scoreMatrix[feedbackObj.score] || 0;
        totalScore += points;

        await supabase
            .from('practice_responses')
            .update({
                user_response: q.answer,
                response_quality: feedbackObj.score,
                ai_feedback: feedbackObj.feedback,
                time_spent_seconds: timeSpentSeconds ? Math.floor(timeSpentSeconds / questionsForEval.length) : null
            })
            .eq('id', q.id);
    }

    const finalScore = Math.round(totalScore / questionsForEval.length);

    // 5. Update Practice Session status
    await supabase
        .from('practice_sessions')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            time_spent_seconds: timeSpentSeconds,
            overall_performance: String(finalScore),
            results: {
                overallPerformance: evaluation.overallPerformance,
                conceptPerformances: evaluation.conceptPerformances
            }
        })
        .eq('id', sessionId);

    // 6. Handle Vault Regressions vs Progressions
    // Exam mode is primarily diagnostic. We downgrade if shaky, but don't upgrade unless it's spaced repetition.
    for (const [conceptId, perf] of Object.entries(evaluation.conceptPerformances)) {
         // Fetch current state
         const { data: node } = await supabase
             .from('knowledge_nodes')
             .select('current_mastery')
             .eq('id', conceptId)
             .single();
         
         if (node && (node as any).current_mastery) {
             const currentState = (node as any).current_mastery;
             let newStateStr = currentState;

             if (perf === 'shaky' && (currentState === 'solid' || currentState === 'mastered')) {
                 newStateStr = 'shaky';
                 
                 // Log Regression
                 await supabase.from('vault_regressions').insert({
                     user_id: userId,
                     concept_id: conceptId,
                     practice_session_id: sessionId,
                     previous_state: currentState,
                     new_state: newStateStr,
                     regression_note: 'Performance degraded during practice exam.'
                 });
                 
                 // Downgrade
                 await supabase
                     .from('knowledge_nodes')
                     .update({ current_mastery: newStateStr })
                     .eq('id', conceptId);
             }
         }
    }


    res.status(200).json({ success: true, evaluation });
  } catch (error: any) {
    console.error('API Error /api/practice/exam/submit:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
