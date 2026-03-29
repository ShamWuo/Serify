import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { refineRoadmapTopics } from '@/lib/serify-ai';

/**
 * Endpoint to REFINE an existing DRAFT roadmap via conversation.
 */
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

  const { goal, currentTopics, instruction, plan = 'free' } = req.body;

  if (!goal || !currentTopics || !instruction) {
    return res.status(400).json({ error: 'Missing goal, topics, or instruction' });
  }

  try {
    // Generate refined topics via AI
    const refinedData = await refineRoadmapTopics(goal, currentTopics, instruction, plan);

    return res.status(200).json({
      title: refinedData.title,
      target_description: refinedData.target_description,
      topics: refinedData.topics
    });
  } catch (error: any) {
    console.error('Error in refine-roadmap:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
