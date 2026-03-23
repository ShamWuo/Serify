import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { evaluateComprehensiveTest } from '@/lib/serify-ai';

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

  const { sessionId, answers } = req.body;
  

  if (!sessionId || !answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Missing sessionId or answers' });
  }

  try {
    
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

    
    const aiPayload = questions.map((q) => {
      const uAnswer = answers.find(ua => ua.questionId === q.id)?.answer || '';
      
      let isCorrectMCQ: boolean | undefined;
      let explanation: string | undefined;

      if (q.question_type === 'multiple_choice') {
          const feedback = q.ai_feedback ? (typeof q.ai_feedback === 'string' ? JSON.parse(q.ai_feedback) : q.ai_feedback) : {};
          isCorrectMCQ = uAnswer === feedback.expected_answer;
          explanation = feedback.explanation;
      }

      return {
        questionText: q.question_text || '',
        answer: uAnswer,
        conceptId: q.target_concept,
        type: q.question_type || 'retrieval',
        isCorrectMCQ,
        explanation
      };
    });

    const { data: profile } = await supabase.from('user_profiles').select('subscription_plan').eq('id', userId).single();
    const plan = profile?.subscription_plan || 'free';

    const evaluation = await evaluateComprehensiveTest(aiPayload, plan);

    
    const scoreMap = { 'strong': 100, 'developing': 60, 'shaky': 30, 'blank': 0 };
    let totalScore = 0;

    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const fb = evaluation.questionFeedback[i];
      const uAnswer = answers.find(ua => ua.questionId === q.id)?.answer || '';
      const points = scoreMap[fb?.score as keyof typeof scoreMap] || 0;
      totalScore += points;

      await supabase
        .from('practice_responses')
        .update({
          user_response: uAnswer,
          ai_feedback: fb?.feedback || 'No feedback provided.',
          response_quality: fb?.score || 'blank'
        } as any)
        .eq('id', q.id);
    }

    const finalScore = Math.round(totalScore / questions.length);

    
    await supabase
      .from('practice_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        overall_performance: String(finalScore),
        results: {
            overallPerformance: evaluation.overallPerformance,
            focusSuggestions: evaluation.focusSuggestions,
            questionFeedback: evaluation.questionFeedback 
        }
      } as any)
      .eq('id', sessionId);
      
    
    await supabase.rpc('record_ai_message', {
       p_user_id: userId,
       p_message_type: 'practice_comprehensive_evaluated',
       p_token_count: 0
    });

    res.status(200).json({
      success: true,
      score: finalScore,
      overallPerformance: evaluation.overallPerformance,
      focusSuggestions: evaluation.focusSuggestions,
      questionFeedback: evaluation.questionFeedback
    });

  } catch (error: any) {
    console.error('API Error /api/practice/comprehensive/evaluate:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
