import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';

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
      .eq('practice_session_id', sessionId);

    if (qError || !questions) {
      return res.status(500).json({ error: 'Failed to fetch questions' });
    }

    // Evaluate answers
    // Since Quiz is purely checking expected_answer against user answer
    let totalScore = 0;
    
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const uAnswer = userAnswers.find(ua => ua.responseId === q.id)?.answer || '';
        
        // Ensure clean string comparison
        const isCorrect = uAnswer.trim().toLowerCase() === (q.expected_answer || '').trim().toLowerCase();
        const points = isCorrect ? 100 : 0;
        totalScore += points;

        await supabase
            .from('practice_responses')
            .update({
                user_response: uAnswer,
                response_quality: isCorrect ? 'strong' : 'weak'
            })
            .eq('id', q.id);
    }

    const finalScore = Math.round(totalScore / questions.length);

    // Update session
    await supabase
      .from('practice_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        overall_performance: String(finalScore),
        results: { score: finalScore }
      })
      .eq('id', sessionId);

    res.status(200).json({
      success: true,
      score: finalScore
    });

  } catch (error: any) {
    console.error('API Error /api/practice/quiz/evaluate:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
