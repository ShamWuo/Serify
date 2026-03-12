import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/db_types_new';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await authenticateApiRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date().toISOString();

    // 1. Fetch concepts from review_schedule where next_review_date <= today
    const { data: dueReviews, error: scheduleError } = await supabase
        .from('review_schedule')
        .select(`
            *,
            knowledge_nodes (
                id, display_name, definition, current_mastery
            )
        `)
        .eq('user_id', userId)
        .eq('is_mastered', false)
        .lte('next_review_date', today)
        .order('next_review_date', { ascending: true }); // Most overdue first

    if (scheduleError) {
        throw new Error('Failed to fetch review schedule');
    }

    res.status(200).json({ dueReviews: dueReviews || [] });
  } catch (error: any) {
    console.error('API Error /api/practice/review/due:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
