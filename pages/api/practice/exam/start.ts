import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest, consumeTokens } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { generateExamQuestions } from '@/lib/serify-ai';
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

  const { conceptIds, topic, format, questionCount, timeLimitMinutes, difficulty = 'Auto' } = req.body;
  
  const isVaultMode = conceptIds && Array.isArray(conceptIds) && conceptIds.length > 0;
  const isTopicMode = !!topic && topic.trim().length > 0;

  if (!isVaultMode && !isTopicMode) {
    return res.status(400).json({ error: 'Either concepts or a topic must be provided' });
  }

  try {
    // 1. Check Usage Limits (Unified Tokens)
    const usageResult = await consumeTokens(userId, 'practice_exam_generation');
    if (!usageResult.allowed) {
        return res.status(403).json({ 
            error: 'Usage limit reached.',
            tokensUsed: usageResult.tokensUsed,
            monthlyLimit: usageResult.monthlyLimit,
            percentUsed: usageResult.percentUsed
        });
    }

    const subscription_plan = usageResult.plan;

    // 2. Resolve scope
    let formattedConcepts: { id: string; name: string; description: string; mastery: string }[] = [];
    if (isVaultMode) {
        const { data: concepts, error: conceptsError } = await supabase
            .from('knowledge_nodes')
            .select('id, display_name, definition, current_mastery') // This select statement was not changed as the provided one was incorrect for knowledge_nodes
            .in('id', conceptIds)
            .eq('node_type', 'concept')
            .eq('user_id', userId);

        if (conceptsError || !concepts) {
            throw new Error('Failed to fetch concepts');
        }

        formattedConcepts = concepts.map(c => ({
            id: c.id,
            name: (c as any).display_name,
            description: (c as any).definition || 'No description available',
            mastery: (c as any).current_mastery || 'developing'
        }));
    }

    // 3. Generate questions
    const questions = await generateExamQuestions(
        formattedConcepts,
        { format: format || 'standard', questionCount: questionCount || 5 },
        subscription_plan || 'free',
        topic
    );

    // 4. Create Practice Session record
    const { data: sessionData, error: sessionError } = await supabase
        .from('practice_sessions')
        .insert({
            user_id: userId,
            tool: 'exam',
            source_concept_ids: isVaultMode ? conceptIds : null,
            topic: isTopicMode ? topic : null,
            difficulty: difficulty.toLowerCase(),
            exam_format: format || 'standard',
            time_limit_minutes: timeLimitMinutes || null,
            question_count: questions.length,
            status: 'in_progress',
            started_at: new Date().toISOString()
        })
        .select()
        .single();

    if (sessionError || !sessionData) {
        throw new Error('Failed to create practice session');
    }

    // 5. Create Practice Reponses records (placeholder answers)
    const responsesToInsert = questions.map((q, index) => {
        // Concept ID might be 'topic' or undefined in ad-hoc mode
        const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[0-89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
        
        return {
            practice_session_id: sessionData.id,
            user_id: userId,
            target_concept: q.conceptId && isValidUuid(q.conceptId) ? q.conceptId : null, 
            question_text: q.text,
            question_type: q.type,
            question_number: index + 1,
            ai_feedback: JSON.stringify({
                expected_answer: (q as any).answer,
                options: (q as any).options,
                explanation: (q as any).explanation,
                distractors: (q as any).distractors
            })
        };
    });

    const { error: responsesError } = await supabase
        .from('practice_responses')
        .insert(responsesToInsert);

    if (responsesError) {
        throw new Error('Failed to create question placeholders');
    }

    // Usage already deducted via consumeTokens at the start to ensure atomic gating

    // Track Analytics
    await supabase.rpc('record_ai_message', {
       p_user_id: userId,
       p_message_type: 'practice_exam_generated',
       p_token_count: 10
    });

    res.status(200).json({ sessionId: sessionData.id, questions });
  } catch (error: any) {
    console.error('API Error /api/practice/exam/start:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
