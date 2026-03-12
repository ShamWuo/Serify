import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { evaluateReview } from '@/lib/serify-ai';
import { Database } from '@/types/db_types_new';

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
  // reviewId is the ID from the review_schedule table
  const { reviewId, conceptId, promptUsed, userAnswer } = req.body;

  if (!reviewId || !conceptId || !promptUsed || !userAnswer) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Fetch Concept details for AI Evaluation
    const { data: concept, error: conceptError } = await supabase
        .from('knowledge_nodes')
        .select('name, description, status')
        .eq('id', conceptId)
        .eq('user_id', userId)
        .single();

    if (conceptError || !concept) {
        return res.status(404).json({ error: 'Concept not found' });
    }

    // Fetch user plan
    const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', userId)
        .single();
    
    // 2. Fetch Review Schedule entry
    const { data: schedule, error: scheduleError } = await supabase
        .from('review_schedule')
        .select('*')
        .eq('id', reviewId)
        .eq('user_id', userId)
        .single();

    if (scheduleError || !schedule) {
        return res.status(404).json({ error: 'Review schedule not found' });
    }

    // 3. Evaluate via AI (Spaced Repetition doesn't cost an AI session according to spec)
    const evaluation = await evaluateReview(
        concept.name,
        concept.description || '',
        promptUsed,
        userAnswer,
        profile?.subscription_plan || 'free'
    );

    // 4. Calculate next Spaced Repetition interval
    // FSRS inspired or simple SRS
    let newInterval = schedule.review_interval_days;
    let newConsecutive = schedule.consecutive_successful_reviews || 0;
    let isMastered = false;
    let masteredAt = schedule.mastered_at;
    let newVaultStatus = concept.status;

    if (evaluation.score === 'strong') {
        newConsecutive += 1;
        newInterval = Math.max(3, newInterval * 2.5); // Increase interval
        if (newVaultStatus !== 'mastered') {
             newVaultStatus = 'solid'; // Move towards mastered
        }
        
        // Graduation rule: 3 consecutive strong reviews = Mastered
        if (newConsecutive >= 3) {
            isMastered = true;
            masteredAt = new Date().toISOString();
            newVaultStatus = 'mastered';
        }
    } else if (evaluation.score === 'developing') {
        newConsecutive = Math.max(0, newConsecutive - 1);
        newInterval = Math.max(1, newInterval * 1.2); // Slight increase or maintain
    } else {
        // Weak
        newConsecutive = 0;
        newInterval = 1; // Reset to tomorrow
        newVaultStatus = 'shaky';
    }

    // Round interval
    newInterval = Math.round(newInterval);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + newInterval);

    // 5. Update Review Schedule
    await supabase
        .from('review_schedule')
        .update({
            last_reviewed_at: new Date().toISOString(),
            last_response_quality: evaluation.score,
            next_review_date: nextDate.toISOString(),
            review_interval_days: newInterval,
            consecutive_successful_reviews: newConsecutive,
            total_reviews: (schedule.total_reviews || 0) + 1,
            is_mastered: isMastered,
            mastered_at: masteredAt
        })
        .eq('id', reviewId);

    // 6. Update Concept Vault Status if changed
    if (newVaultStatus !== concept.status) {
        await supabase
            .from('knowledge_nodes')
            .update({ status: newVaultStatus })
            .eq('id', conceptId);
            
        // Log progression/regression if needed, though usually reserved for exams/scenarios
        // We'll log it if it graduated to mastered
        if (newVaultStatus === 'mastered') {
             await supabase.from('vault_regressions').insert({
                user_id: userId,
                concept_id: conceptId,
                previous_state: concept.status,
                new_state: 'mastered',
                regression_note: 'Graduated via spaced repetition.'
            });
        } else if (newVaultStatus === 'shaky') {
            await supabase.from('vault_regressions').insert({
                user_id: userId,
                concept_id: conceptId,
                previous_state: concept.status,
                new_state: 'shaky',
                regression_note: 'Failed spaced repetition review.'
            });
        }
    }

    res.status(200).json({ success: true, evaluation, newInterval, isMastered });
  } catch (error: any) {
    console.error('API Error /api/practice/review/evaluate:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
