import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { evaluatePracticeTest } from '@/lib/serify-ai';
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

  const { sessionId, userAnswers } = req.body;
  // userAnswers: { responseId: string, answer: string }[]

  if (!sessionId || !userAnswers || !Array.isArray(userAnswers)) {
    return res.status(400).json({ error: 'Missing sessionId or userAnswers' });
  }

  try {
    // 1. Fetch the session and its questions
    const { data: session, error: sessionError } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ error: 'Session already completed' });
    }

    const { data: questions, error: qError } = await supabase
      .from('practice_responses')
      .select('*')
      .eq('practice_session_id', sessionId)
      .order('question_number', { ascending: true });

    if (qError || !questions) {
      return res.status(500).json({ error: 'Failed to fetch questions' });
    }

    // Prepare payload for AI evaluation
    const aiPayload = questions.map((q) => {
      const uAnswer = userAnswers.find(ua => ua.responseId === q.id)?.answer || '';
      return {
        questionText: q.question_text || '',
        answer: uAnswer,
        conceptId: q.concept_id,
        type: q.question_type || 'retrieval'
      };
    });

    // We don't deduct tokens for evaluation to encourage completion
    // Just fetch plan for better model access
    const { data: profile } = await supabase.from('user_profiles').select('subscription_plan').eq('id', userId).single();
    const plan = profile?.subscription_plan || 'free';

    const evaluation = await evaluatePracticeTest(aiPayload, plan);

    // Note: This logic assumes lengths match. In a production app, robust mapping is needed.
    // Ensure we map feedback to specific question IDs.
    const feedbackList = evaluation.questionFeedback;
    
    // Calculate fractional score
    const scoreMap = { 'strong': 100, 'developing': 60, 'shaky': 30, 'blank': 0 };
    let totalScore = 0;

    // Update DB with feedback
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const fb = feedbackList[i];
      const uAnswer = userAnswers.find(ua => ua.responseId === q.id)?.answer || '';
      const feedbackScoreStr = fb?.score || 'blank';
      const points = scoreMap[fb?.score as keyof typeof scoreMap] || 0;
      totalScore += points;

      await supabase
        .from('practice_responses')
        .update({
          user_response: uAnswer,
          ai_feedback: fb?.feedback || 'No feedback provided.',
          response_quality: fb?.score || 'blank'
        })
        .eq('id', q.id);
    }

    const finalScore = Math.round(totalScore / questions.length);

    // Update Session
    await supabase
      .from('practice_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        overall_performance: String(finalScore),
        results: {
            overallPerformance: evaluation.overallPerformance,
            focusSuggestions: evaluation.focusSuggestions
        }
      })
      .eq('id', sessionId);
      
    // Track Analytics
    await supabase.rpc('record_ai_message', {
       p_user_id: userId,
       p_message_type: 'practice_test_evaluated',
       p_token_count: 0
    });

    res.status(200).json({
      success: true,
      score: finalScore,
      overallPerformance: evaluation.overallPerformance,
      focusSuggestions: evaluation.focusSuggestions
    });

  } catch (error: any) {
    console.error('API Error /api/practice/test/evaluate:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
