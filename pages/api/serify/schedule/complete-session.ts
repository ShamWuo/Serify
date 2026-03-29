
import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateApiRequest } from '@/lib/usage';

/**
 * Finalizes a roadmap study session after the interactive flow is completed.
 * Updates both the specific session record and the aggregate topic progress.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database admin client not configured' });
  }

  try {
    const userId = await authenticateApiRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { roadmapSessionId, flowSessionId, mastery } = req.body;
    if (!roadmapSessionId) {
      return res.status(400).json({ error: 'Missing roadmapSessionId' });
    }

    // 1. Fetch the session to get the topic and roadmap references
    const { data: session, error: sErr } = await supabaseAdmin
      .from('roadmap_sessions')
      .select('*, roadmap_topics(*), exam_roadmaps(*)')
      .eq('id', roadmapSessionId)
      .single();

    if (sErr || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'completed') {
      return res.status(200).json({ success: true, message: 'Already completed' });
    }

    if (!session.topic_id || !session.roadmap_id) {
      return res.status(400).json({ error: 'Session is missing topic or roadmap association' });
    }

    const topic = (session as any).roadmap_topics;
    const roadmap = (session as any).exam_roadmaps;

    // 2. Update the session record
    const { error: upErr } = await supabaseAdmin
      .from('roadmap_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        reflection_session_id: flowSessionId, // Link back to the flow audit trail
        mastery_after: mastery || 'developing'
      } as any)
      .eq('id', roadmapSessionId);

    if (upErr) throw upErr;

    // 3. Update the topic aggregate progress
    const { error: topErr } = await supabaseAdmin
      .from('roadmap_topics')
      .update({
        sessions_completed: Number(topic.sessions_completed || 0) + 1,
        status: (Number(topic.sessions_completed || 0) + 1 >= Number(topic.sessions_allocated || 1)) ? 'complete' : 'in_progress',
        mastery_at_completion: mastery || topic.mastery_at_completion
      } as any)
      .eq('id', session.topic_id);

    if (topErr) throw topErr;

    // 4. Update roadmap aggregate (sessions_completed)
    const { error: roadErr } = await supabaseAdmin
      .from('exam_roadmaps')
      .update({
        completed_sessions: Number(roadmap.completed_sessions || 0) + 1,
        last_activity_at: new Date().toISOString(),
        current_streak: Number(roadmap.current_streak || 0) + 1 // Simple increment for now
      } as any)
      .eq('id', session.roadmap_id);

    if (roadErr) throw roadErr;

    return res.status(200).json({ 
      success: true, 
      roadmapId: session.roadmap_id,
      topicTitle: topic.title
    });

  } catch (error: any) {
    console.error('[Complete Roadmap Session] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
