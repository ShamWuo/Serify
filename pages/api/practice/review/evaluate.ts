import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function calculateSM2(quality: number, interval: number, easeFactor: number, consecutiveCorrect: number) {
    
    
    
    
    
    let q = 4;
    if (quality === 1) q = 1;
    if (quality === 2) q = 3;
    if (quality === 3) q = 4;
    if (quality === 4) q = 5;

    let newEaseFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (newEaseFactor < 1.3) newEaseFactor = 1.3;

    let newInterval = interval;
    let newConsecutive = consecutiveCorrect;

    if (q < 3) {
        
        newConsecutive = 0;
        newInterval = 1;
    } else {
        
        newConsecutive += 1;
        if (newConsecutive === 1) {
            newInterval = 1;
        } else if (newConsecutive === 2) {
            newInterval = 6;
        } else {
            newInterval = Math.round(interval * newEaseFactor);
        }
    }

    return {
        intervalDays: newInterval,
        easeFactor: newEaseFactor,
        consecutiveCorrect: newConsecutive
    };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { conceptId, rating } = req.body;

    if (!conceptId || !rating || rating < 1 || rating > 4) {
        return res.status(400).json({ error: 'Invalid conceptId or rating' });
    }

    try {
        
        let { data: schedule, error: scheduleError } = await supabase
            .from('review_schedule')
            .select('*')
            .eq('user_id', userId)
            .eq('concept_id', conceptId)
            .single();

        if (scheduleError && scheduleError.code !== 'PGRST116') {
            throw scheduleError;
        }

        let newScheduleData;

        if (!schedule) {
            
            const sm2 = calculateSM2(rating, 0, 2.5, 0);
            
            newScheduleData = {
                user_id: userId,
                concept_id: conceptId,
                interval_days: sm2.intervalDays,
                ease_factor: sm2.easeFactor,
                consecutive_correct: sm2.consecutiveCorrect,
                next_review: new Date(Date.now() + sm2.intervalDays * 24 * 60 * 60 * 1000).toISOString()
            };

            const { error: insertError } = await supabase
                .from('review_schedule')
                .insert(newScheduleData);

            if (insertError) throw insertError;
        } else {
            
            const sm2 = calculateSM2(rating, schedule.interval_days, schedule.ease_factor, schedule.consecutive_correct);
            
            newScheduleData = {
                interval_days: sm2.intervalDays,
                ease_factor: sm2.easeFactor,
                consecutive_correct: sm2.consecutiveCorrect,
                next_review: new Date(Date.now() + sm2.intervalDays * 24 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date().toISOString()
            };

            const { error: updateError } = await supabase
                .from('review_schedule')
                .update(newScheduleData)
                .eq('id', schedule.id);

            if (updateError) throw updateError;
        }

        
        let isMastered = false;
        if (newScheduleData.consecutive_correct && newScheduleData.consecutive_correct >= 3) {
            isMastered = true;
            await supabase
                .from('knowledge_nodes')
                .update({ current_mastery: 'mastered' })
                .eq('id', conceptId);
        }

        res.status(200).json({ success: true, nextReview: newScheduleData.next_review, isMastered });
    } catch (error: any) {
        console.error('API Error /api/practice/review/evaluate:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
