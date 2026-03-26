import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { conductInterviewTurn } from '../../../lib/serify-ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database admin not initialized' });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { scenario, history, userResponse, targetConcepts, plan = 'free', sessionId } = req.body;

  if (!scenario || !history || !userResponse || !targetConcepts) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const turnResult = await conductInterviewTurn(scenario, history, userResponse, targetConcepts, plan);

    // If we have a sessionId, we can update the interview_sessions table
    if (sessionId) {
      const newHistory = [...history, { role: 'user', content: userResponse }, { role: 'ai', content: turnResult.aiResponse }];
      
      const updateData: any = {
        history: newHistory,
        status: turnResult.status
      };

      if (turnResult.status !== 'in_progress') {
        updateData.completed_at = new Date().toISOString();
        // optionally save the feedback into the history or a new field
        if (turnResult.feedback) {
          updateData.history.push({ role: 'system', content: JSON.stringify(turnResult.feedback) });
        }
      }

      await supabaseAdmin.from('interview_sessions').update(updateData).eq('id', sessionId);
    }

    return res.status(200).json(turnResult);
  } catch (error: any) {
    console.error('Error in interview-turn:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
