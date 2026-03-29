
import { RoadmapTopic, RoadmapSession } from '../types/serify';

/**
 * Study session types
 */
export type RoadmapSessionType = 'main' | 'warmup' | 'followup' | 'review' | 'exam_day';

/**
 * Distributes sessions across available study days until the exam date.
 * Logic:
 * 1. Calculate total available days between today and (examDate - buffer).
 * 2. Assign topics to days according to study_days_per_week.
 * 3. If too many sessions for the time, compact them (multiple per day).
 * 4. Add 'review' sessions in the buffer period.
 * 5. Add an 'exam_day' session for the target date.
 */
export function generateInitialSchedule(
  params: {
    roadmapId: string;
    userId: string;
    topics: { id: string; sessions_allocated: number }[];
    examDate: string | Date;
    studyDaysPerWeek: number;
    bufferDays: number;
    startDate?: Date;
  }
): Partial<RoadmapSession>[] {
  const { roadmapId, userId, topics, examDate, studyDaysPerWeek, bufferDays } = params;
  const sessions: Partial<RoadmapSession>[] = [];
  const targetExamDate = new Date(examDate);
  const startAt = params.startDate ? new Date(params.startDate) : new Date();
  
  // Set startAt to tomorrow morning if it's already late today or just start tomorrow
  startAt.setDate(startAt.getDate() + 1);
  startAt.setHours(0, 0, 0, 0);

  const bufferStartDate = new Date(targetExamDate);
  bufferStartDate.setDate(bufferStartDate.getDate() - bufferDays);

  // Total topics to schedule
  const totalRequiredSessions = topics.reduce((sum, t) => sum + t.sessions_allocated, 0);

  let currentDate = new Date(startAt);
  let topicIdx = 0;
  let sessionsAllocatedForCurrentTopic = 0;

  // Study day bitmask simplification (default 5 days = Mon-Fri)
  const isStudyDay = (date: Date) => {
    if (studyDaysPerWeek >= 7) return true;
    const day = date.getDay(); // 0 is Sunday, 6 is Saturday
    if (studyDaysPerWeek === 5) return day >= 1 && day <= 5;
    if (studyDaysPerWeek === 6) return day >= 1 && day <= 6;
    return day >= 1 && day <= studyDaysPerWeek;
  };

  while (topicIdx < topics.length && currentDate < bufferStartDate) {
    if (isStudyDay(currentDate)) {
      const currentTopic = topics[topicIdx];
      
      sessions.push({
        roadmap_id: roadmapId,
        topic_id: currentTopic.id,
        user_id: userId,
        session_type: 'main',
        scheduled_date: new Date(currentDate).toISOString().split('T')[0],
        status: 'scheduled'
      });

      sessionsAllocatedForCurrentTopic++;
      if (sessionsAllocatedForCurrentTopic >= currentTopic.sessions_allocated) {
        topicIdx++;
        sessionsAllocatedForCurrentTopic = 0;
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Handle remaining topics if we ran out of time before buffer
  while (topicIdx < topics.length) {
    const currentTopic = topics[topicIdx];
    // Squish into the last available study day before buffer
    const lastDay = new Date(bufferStartDate);
    lastDay.setDate(lastDay.getDate() - 1);
    
    sessions.push({
      roadmap_id: roadmapId,
      topic_id: currentTopic.id,
      user_id: userId,
      session_type: 'main',
      scheduled_date: lastDay.toISOString().split('T')[0],
      status: 'scheduled'
    });
    
    topicIdx++;
  }

  // Add Review sessions in buffer period
  let bufferDate = new Date(bufferStartDate);
  while (bufferDate < targetExamDate) {
    sessions.push({
      roadmap_id: roadmapId,
      topic_id: topics[topics.length - 1].id, // Associate with last topic or create a generic one
      user_id: userId,
      session_type: 'review',
      scheduled_date: new Date(bufferDate).toISOString().split('T')[0],
      status: 'scheduled'
    });
    bufferDate.setDate(bufferDate.getDate() + 1);
  }

  // Add Exam Day
  sessions.push({
    roadmap_id: roadmapId,
    topic_id: topics[topics.length - 1].id,
    user_id: userId,
    session_type: 'exam_day',
    scheduled_date: new Date(targetExamDate).toISOString().split('T')[0],
    status: 'scheduled'
  });

  return sessions;
}

/**
 * Handles missed sessions by shifting remaining schedule.
 * Better strategy: Filter for remaining work and regenerate schedule from today.
 */
export function adaptiveReschedule(
  params: {
    roadmapId: string;
    userId: string;
    remainingTopics: { id: string; sessions_remaining: number }[];
    examDate: string | Date;
    studyDaysPerWeek: number;
    bufferDays: number;
    startDate?: Date; // Usually today for rescheduling
  }
): Partial<RoadmapSession>[] {
  const { roadmapId, userId, remainingTopics, examDate, studyDaysPerWeek, bufferDays } = params;
  
  // Transform remainingTopics into the format expected by generateInitialSchedule
  const topicsForSchedule = remainingTopics.map(t => ({
    id: t.id,
    sessions_allocated: t.sessions_remaining
  }));

  return generateInitialSchedule({
    roadmapId,
    userId,
    topics: topicsForSchedule,
    examDate,
    studyDaysPerWeek,
    bufferDays,
    startDate: params.startDate || new Date()
  });
}
