import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { generateScheduledRoadmap } from '../../../lib/serify-ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database admin not initialized' });
  }

  const { data: { user }, error: authError } = await supabaseAdmin!.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { goal, targetDate, plan = 'free' } = req.body;

  if (!goal || !targetDate) {
    return res.status(400).json({ error: 'Missing goal or targetDate' });
  }

  try {
    // 1. Fetch user's vault context
    const { data: strongConcepts } = await supabaseAdmin!
      .from('concepts')
      .select('name')
      .eq('user_id', user.id)
      .in('mastery_state', ['mastered', 'solid'])
      .limit(20);

    const { data: shakyConcepts } = await supabaseAdmin!
      .from('concepts')
      .select('name')
      .eq('user_id', user.id)
      .in('mastery_state', ['shaky', 'developing'])
      .limit(20);

    const { data: revisitConcepts } = await supabaseAdmin!
      .from('concepts')
      .select('name')
      .eq('user_id', user.id)
      .eq('mastery_state', 'revisit')
      .limit(20);

    const vaultContext = {
      strongConcepts: strongConcepts || [],
      shakyConcepts: shakyConcepts || [],
      revisitConcepts: revisitConcepts || [],
    };

    // 2. Generate roadmap via AI
    const roadmapData = await generateScheduledRoadmap(goal, targetDate, vaultContext, plan);

    // 3. Save roadmap to database
    const { data: savedRoadmap, error: insertError } = await supabaseAdmin!
      .from('roadmaps')
      .insert({
        user_id: user.id,
        goal,
        target_date: targetDate,
        curriculum_data: roadmapData,
        status: 'active'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving roadmap:', insertError);
      return res.status(500).json({ error: 'Failed to save roadmap to database.' });
    }

    return res.status(200).json({ roadmap: savedRoadmap });
  } catch (error: any) {
    console.error('Error in generate-roadmap:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
