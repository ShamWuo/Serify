import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { generateRoadmapTopics } from '@/lib/serify-ai';

/**
 * Endpoint to generate a DRAFT schedule (Step 1-2 in the creation flow).
 * Returns a list of topics and a title for the user to preview/edit.
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

  const { goal, examType, examName, plan = 'free' } = req.body;

  if (!goal) {
    return res.status(400).json({ error: 'Missing goal' });
  }

  try {
    // Generate draft topics via AI
    const scheduleData = await generateRoadmapTopics(goal, examType, examName, plan);

    // Return the preview data
    return res.status(200).json({
      title: scheduleData.title,
      target_description: scheduleData.target_description,
      topics: scheduleData.topics,
      examType,
      examName
    });
  } catch (error: any) {
    console.error('Error in generate-schedule:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
