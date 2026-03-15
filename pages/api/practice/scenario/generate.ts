import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest, consumeTokens } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { generateScenario } from '@/lib/serify-ai';
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
  const { conceptIds, topic, difficulty = 'Auto' } = req.body;

  const isVaultMode = conceptIds && Array.isArray(conceptIds) && conceptIds.length > 0;
  const isTopicMode = !!topic && topic.trim().length > 0;

  if (!isVaultMode && !isTopicMode) {
    return res.status(400).json({ error: 'Either concepts or a topic must be provided' });
  }

  try {
    // 1. Check Usage Limits (Unified Tokens)
    const usageResult = await consumeTokens(userId, 'practice_scenario_generation');
    if (!usageResult.allowed) {
        return res.status(403).json({ 
            error: 'Usage limit reached.',
            tokensUsed: usageResult.tokensUsed,
            monthlyLimit: usageResult.monthlyLimit,
            percentUsed: usageResult.percentUsed
        });
    }

    const { plan: subscription_plan } = usageResult;

    // 2. Resolve scope
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

    // 3. Generate Scenario
    const scenario = await generateScenario(formattedConcepts, subscription_plan || 'free', topic);

    // 4. Create Practice Session record
    const { data: sessionData, error: sessionError } = await supabase
        .from('practice_sessions')
        .insert({
            user_id: userId,
            tool: 'scenario',
            source_concept_ids: isVaultMode ? conceptIds : null,
            topic: isTopicMode ? topic : null,
            difficulty: difficulty.toLowerCase(),
            status: 'in_progress',
            started_at: new Date().toISOString()
        })
        .select()
        .single();

    if (sessionError || !sessionData) {
        throw new Error('Failed to create practice session: ' + (sessionError?.message || 'Unknown error'));
    }

    const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[0-89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const { data: responseData, error: responsesError } = await supabase
        .from('practice_responses')
        .insert({
            practice_session_id: sessionData.id,
            user_id: userId,
            concept_id: isVaultMode && isValidUuid(conceptIds[0]) ? conceptIds[0] : null, 
            question_text: `[SCENARIO] ${scenario.scenarioText}\n\n[TASK] ${scenario.questionText}`,
            question_type: 'scenario',
            question_number: 1
        })
        .select()
        .single();

    if (responsesError || !responseData) {
        throw new Error('Failed to create scenario question placeholder');
    }

    // Usage already deducted via consumeTokens at the start to ensure atomic gating

    // Track Analytics
    await supabase.rpc('record_ai_message', {
       p_user_id: userId,
       p_message_type: 'practice_scenario_generated',
       p_token_count: 5
    });

    res.status(200).json({ 
        sessionId: sessionData.id, 
        responseId: responseData.id,
        scenarioText: scenario.scenarioText,
        questionText: scenario.questionText
    });
  } catch (error: any) {
    console.error('API Error /api/practice/scenario/generate:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
