
import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { adaptiveReschedule } from '@/lib/roadmap-logic';

/**
 * API Handler for adaptive roadmap rescheduling.
 * Shifts future sessions to accommodate missed or delayed work.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database admin client not configured' });
  }

  const { roadmapId } = req.body;

  if (!roadmapId) {
    return res.status(400).json({ error: 'Missing roadmapId' });
  }

  try {
    // 1. Fetch roadmap details
    const { data: roadmap, error: rErr } = await supabaseAdmin
      .from('exam_roadmaps')
      .select('*')
      .eq('id', roadmapId)
      .single();

    if (rErr || !roadmap) {
      console.error('Error fetching roadmap:', rErr);
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    // 2. Fetch topics to calculate remaining work
    const { data: topics, error: tErr } = await supabaseAdmin
      .from('roadmap_topics')
      .select('*')
      .eq('roadmap_id', roadmapId);

    if (tErr || !topics) {
      console.error('Error fetching topics:', tErr);
      return res.status(500).json({ error: 'Failed to fetch roadmap topics' });
    }

    // 3. Identify topics that still need study sessions
    const remainingTopics = topics
      .filter(t => (t.sessions_allocated || 0) > (t.sessions_completed || 0))
      .map(t => ({
        id: t.id,
        sessions_remaining: (t.sessions_allocated || 0) - (t.sessions_completed || 0)
      }))
      .sort((a, b) => {
        // Find positions from original topics to maintain order
        const topicA = topics.find(tp => tp.id === a.id);
        const topicB = topics.find(tp => tp.id === b.id);
        return (topicA?.position || 0) - (topicB?.position || 0);
      });

    if (remainingTopics.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No uncompleted sessions found to reschedule. Roadmap is on track or complete.' 
      });
    }

    // 4. Generate new optimized schedule starting from today
    const newSessions = adaptiveReschedule({
      roadmapId,
      userId: roadmap.user_id,
      remainingTopics,
      examDate: roadmap.exam_date,
      studyDaysPerWeek: roadmap.study_days_per_week || 5,
      bufferDays: roadmap.buffer_days || 3,
      startDate: new Date() 
    });

    // 5. Atomic-ish update: Clear future scheduled sessions and insert new ones
    // We strictly only delete 'scheduled' sessions to avoid data loss for started/completed work
    const { error: dErr } = await supabaseAdmin
      .from('roadmap_sessions')
      .delete()
      .eq('roadmap_id', roadmapId)
      .eq('status', 'scheduled');

    if (dErr) {
      console.error('Error clearing old sessions:', dErr);
      throw new Error(`Failed to clear old sessions: \${dErr.message}`);
    }

    // 6. Insert the new optimized timeline
    const { error: iErr } = await supabaseAdmin
      .from('roadmap_sessions')
      .insert(newSessions as any);

    if (iErr) {
      console.error('Error inserting new sessions:', iErr);
      throw new Error(`Failed to insert new sessions: \${iErr.message}`);
    }

    // 7. Log activity
    await supabaseAdmin
      .from('exam_roadmaps')
      .update({ 
        last_activity_at: new Date().toISOString(),
        sessions_missed: 0 // Reset missed count after re-optimization
      } as any)
      .eq('id', roadmapId);

    return res.status(200).json({ 
      success: true, 
      sessionsCount: newSessions.length,
      message: 'Schedule redistributed successfully based on your exam date and study preferences.'
    });

  } catch (error: any) {
    console.error('[Roadmap Reschedule API] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error during rescheduling logic',
      details: error.message 
    });
  }
}
