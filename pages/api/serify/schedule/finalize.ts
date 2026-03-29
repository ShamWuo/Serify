
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { generateInitialSchedule } from '@/lib/roadmap-logic';
import { consumeTokens } from '@/lib/usage';

/**
 * Finalizes the schedule creation (Step 4).
 * Saves all entities to the database and deducts tokens.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use the admin client to bypass RLS for initial setup 
  // (though policies should allow it if we set user_id correctly)
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database admin not initialized' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabaseAdmin!.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { 
    title, 
    examType, 
    examName, 
    examDate, 
    topics, 
    studyDaysPerWeek, 
    sessionLength, 
    preferredTime, 
    bufferDays 
  } = req.body;

  if (!title || !examDate || !topics || topics.length === 0) {
    return res.status(400).json({ error: 'Missing required schedule details' });
  }

  try {
    // 1. Deduct tokens
    const action = examType === 'custom' ? 'create_roadmap_custom' : 'create_roadmap_preset';
    const usage = await consumeTokens(user.id, action as any);
    if (!usage.allowed) {
      return res.status(403).json({ error: 'Insufficient tokens' });
    }

    // 2. Create Schedule record
    const { data: schedule, error: scheduleError } = await supabaseAdmin!
      .from('exam_roadmaps')
      .insert({
        user_id: user.id,
        title,
        exam_type: examType,
        exam_name: examName,
        exam_date: examDate,
        study_days_per_week: Number(studyDaysPerWeek || 5),
        session_length_minutes: Number(sessionLength || 60),
        preferred_time: preferredTime || 'afternoon',
        buffer_days: Number(bufferDays || 3),
        total_topics: topics.length,
        status: 'active'
      } as any)
      .select()
      .single();

    if (scheduleError) throw scheduleError;

    // 3. Create Topics
    const topicsToInsert = topics.map((t: any, idx: number) => ({
      roadmap_id: schedule.id,
      user_id: user.id,
      title: t.title,
      unit: t.unit,
      position: idx,
      weight: t.importance === 'high' ? 1.5 : (t.importance === 'low' ? 0.7 : 1.0),
      sessions_allocated: Number(t.estimatedSessions || 1),
      status: 'not_started'
    }));

    const { data: savedTopics, error: topicsError } = await supabaseAdmin!
      .from('roadmap_topics')
      .insert(topicsToInsert as any)
      .select();

    if (topicsError) throw topicsError;

    // 4. Generate Schedule
    const initialSessions = generateInitialSchedule({
      roadmapId: schedule.id,
      userId: user.id,
      topics: savedTopics.map(t => ({ id: t.id, sessions_allocated: Number(t.sessions_allocated || 1) })),
      examDate,
      studyDaysPerWeek: Number(studyDaysPerWeek || 5),
      bufferDays: Number(bufferDays || 3)
    });

    // 5. Save Sessions
    const { error: sessionsError } = await supabaseAdmin!
      .from('roadmap_sessions')
      .insert(initialSessions as any);

    if (sessionsError) throw sessionsError;

    // 6. Update schedule with total sessions count
    await supabaseAdmin!
      .from('exam_roadmaps')
      .update({ total_sessions: initialSessions.length } as any)
      .eq('id', schedule.id);

    return res.status(200).json({ scheduleId: schedule.id });
  } catch (error: any) {
    console.error('Error finalizing schedule:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
