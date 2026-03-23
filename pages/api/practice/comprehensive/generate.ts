import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest, consumeTokens } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { generateComprehensiveTest } from '@/lib/serify-ai';

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
  
  const { conceptIds, topic, difficulty = 'Auto' } = req.body;

  const isVaultMode = conceptIds && Array.isArray(conceptIds) && conceptIds.length > 0;
  const isTopicMode = !!topic && topic.trim().length > 0;

  if (!isVaultMode && !isTopicMode) {
    return res.status(400).json({ error: 'Either concepts or a topic must be provided' });
  }

  try {
    
    const usageResult = await consumeTokens(userId, 'practice_comprehensive_generation'); 
    
    if (!usageResult.allowed) {
        return res.status(403).json({ 
            error: 'Usage limit reached.',
            tokensUsed: usageResult.tokensUsed,
            monthlyLimit: usageResult.monthlyLimit,
            percentUsed: usageResult.percentUsed
        });
    }

    const { plan: subscription_plan } = usageResult;

    let formattedConcepts: { id: string; name: string; description: string }[] = [];
    if (isVaultMode) {
        const { data: qNodes, error: qNodesError } = await supabase
            .from('knowledge_nodes')
            .select('id, display_name, definition')
            .in('id', conceptIds)
            .eq('user_id', userId);

        if (qNodesError || !qNodes) {
            throw new Error('Failed to fetch concepts');
        }

        formattedConcepts = qNodes.map(c => ({
            id: c.id,
            name: (c as any).display_name,
            description: (c as any).definition || 'No description available'
        }));
    }

    const testData = await generateComprehensiveTest(formattedConcepts, subscription_plan || 'free', topic, difficulty as any);

    
    const { data: sessionData, error: sessionError } = await supabase
        .from('practice_sessions')
        .insert({
            user_id: userId,
            tool: 'comprehensive',
            source_concept_ids: isVaultMode ? conceptIds : null,
            topic: isTopicMode ? topic : null,
            difficulty: difficulty.toLowerCase(),
            status: 'in_progress',
            started_at: new Date().toISOString()
        })
        .select('id')
        .single();

    if (sessionError || !sessionData) {
        throw new Error('Failed to create practice session: ' + (sessionError?.message || 'Unknown error'));
    }

    
    const inserts: any[] = [];
    let qNum = 1;

    
    testData.mcqs.forEach(q => {
        inserts.push({
            practice_session_id: sessionData.id,
            user_id: userId,
            target_concept: q.conceptId || (isVaultMode ? conceptIds[0] : null), 
            question_text: q.text,
            question_type: 'multiple_choice',
            question_number: qNum++,
            ai_feedback: JSON.stringify({
                expected_answer: q.answer,
                options: q.options,
                explanation: q.explanation
            })
        });
    });

    
    testData.saqs.forEach(q => {
        inserts.push({
            practice_session_id: sessionData.id,
            user_id: userId,
            target_concept: q.conceptId || (isVaultMode ? conceptIds[0] : null), 
            question_text: q.text,
            question_type: q.type === 'retrieval' ? 'recall' : 'application',
            question_number: qNum++,
            ai_feedback: null 
        });
    });

    
    inserts.push({
        practice_session_id: sessionData.id,
        user_id: userId,
        target_concept: testData.scenario.conceptId || (isVaultMode ? conceptIds[0] : null), 
        question_text: `[SCENARIO] ${testData.scenario.scenarioText} [TASK] ${testData.scenario.questionText}`,
        question_type: 'scenario',
        question_number: qNum++,
        ai_feedback: null
    });

    const { error: qError } = await supabase
      .from('practice_responses')
      .insert(inserts);

    if (qError) {
        throw new Error('Failed to insert practice questions: ' + qError.message);
    }

    
    await supabase.rpc('record_ai_message', {
       p_user_id: userId,
       p_message_type: 'practice_comprehensive_generated',
       p_token_count: 15
    });

    res.status(200).json({ 
        sessionId: sessionData.id 
    });
  } catch (error: any) {
    console.error('API Error /api/practice/comprehensive/generate:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
