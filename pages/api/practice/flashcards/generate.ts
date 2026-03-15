import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest, consumeTokens } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { generateFlashcards } from '@/lib/serify-ai';

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
  
  const { conceptIds, topic } = req.body;

  const isVaultMode = conceptIds && Array.isArray(conceptIds) && conceptIds.length > 0;
  const isTopicMode = !!topic && topic.trim().length > 0;

  if (!isVaultMode && !isTopicMode) {
    return res.status(400).json({ error: 'Either concepts or a topic must be provided' });
  }

  try {
    // Flashcards cost 2 tokens (cost handled in DB)
    const usageResult = await consumeTokens(userId, 'practice_flashcards_generation');
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

    const cards = await generateFlashcards(formattedConcepts, subscription_plan || 'free', topic);

    // Create session (Flashcards use flashcard_sessions table in the new schema)
    // Actually, wait, the schema we applied has a practice_sessions type='flashcards' 
    // AND a separate flashcard_sessions table. The spec said: "flashcard_sessions (tracks specific standard back/front cards)".
    
    // Let's create the master practice_session first for universal recent history tracking
    const { data: sessionData, error: sessionError } = await supabase
        .from('practice_sessions')
        .insert({
            user_id: userId,
            tool: 'flashcards',
            source_concept_ids: isVaultMode ? conceptIds : null,
            topic: isTopicMode ? topic : null,
            status: 'in_progress',
            started_at: new Date().toISOString()
        })
        .select()
        .single();

    if (sessionError || !sessionData) {
        throw new Error('Failed to create practice session: ' + (sessionError?.message || 'Unknown error'));
    }

    // Insert cards into flashcard_sessions
    const inserts = cards.map((c) => ({
      practice_session_id: sessionData.id,
      user_id: userId,
      concept_id: c.conceptId || (isVaultMode ? conceptIds[0] : null), 
      front_text: c.front,
      back_text: c.back,
      is_mastered: false
    }));

    const { data: insertedCards, error: qError } = await supabase
      .from('flashcard_sessions')
      .insert(inserts)
      .select('*');

    if (qError || !insertedCards) {
        throw new Error('Failed to insert flashcards');
    }

    // Track Analytics
    await supabase.rpc('record_ai_message', {
       p_user_id: userId,
       p_message_type: 'practice_flashcards_generated',
       p_token_count: 2
    });

    res.status(200).json({ 
        sessionId: sessionData.id,
        cards: insertedCards
    });
  } catch (error: any) {
    console.error('API Error /api/practice/flashcards/generate:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
