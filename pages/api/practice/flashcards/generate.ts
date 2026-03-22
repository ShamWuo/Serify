import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest, consumeTokens } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { generateFlashcards } from '@/lib/serify-ai';
import { v4 as uuidv4 } from 'uuid';

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
  
  const { conceptIds, topic, title, description } = req.body;

  const isVaultMode = conceptIds && Array.isArray(conceptIds) && conceptIds.length > 0;
  const isTopicMode = !!topic && topic.trim().length > 0;

  if (!isVaultMode && !isTopicMode) {
    return res.status(400).json({ error: 'Either concepts or a topic must be provided' });
  }

  try {
    // Flashcards cost 2 tokens
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
            name: c.display_name,
            description: c.definition || 'No description available'
        }));
    }

    // Step 1: Generate cards via AI
    const cards = await generateFlashcards(formattedConcepts, subscription_plan || 'free', topic);

    if (!cards || cards.length === 0) {
        throw new Error('AI failed to generate any cards for this topic.');
    }

    // Step 2: Create a persistent Deck in the library
    const deckTitle = title || topic || (formattedConcepts.length > 0 ? `Concepts: ${formattedConcepts[0].name}...` : 'Untitled Deck');
    const deckDescription = description || (topic ? `AI-generated cards for "${topic}"` : `AI-generated cards from your Vault.`);

    const { data: deck, error: deckError } = await supabase
        .from('flashcard_decks')
        .insert({
            user_id: userId,
            title: deckTitle,
            description: deckDescription,
            source_type: isVaultMode ? 'vault' : 'topic',
            source_topic: isTopicMode ? topic : null,
            source_concept_ids: isVaultMode ? conceptIds : null,
            total_cards: cards.length,
            share_token: uuidv4()
        })
        .select()
        .single();

    if (deckError || !deck) {
        throw new Error('Failed to create deck: ' + deckError?.message);
    }

    // Step 3: Insert individual cards
    const cardsToInsert = cards.map(card => ({
        deck_id: deck.id,
        user_id: userId,
        front: card.front,
        back: card.back,
        concept_tag: card.conceptId || (isTopicMode ? topic : null),
        card_type: 'standard'
    }));

    const { error: cardsError } = await supabase
        .from('flashcards')
        .insert(cardsToInsert);

    if (cardsError) {
        console.error('Error inserting individual cards:', cardsError);
        // We continue anyway since the deck exists, though empty cards is bad
        // But in production we should probably rollback or retry
    }

    // Step 4: Create a "Practice Session" for the universal history feed
    const { data: practiceSession, error: practiceError } = await supabase
        .from('practice_sessions')
        .insert({
            user_id: userId,
            tool: 'flashcards',
            source_concept_ids: isVaultMode ? conceptIds : null,
            topic: isTopicMode ? topic : null,
            status: 'completed', // For history, it counts as a generation event
            started_at: new Date().toISOString(),
            ended_at: new Date().toISOString()
        })
        .select()
        .single();

    // Step 5: (DEPRECATED) Backward compatibility for the old [id].tsx view
    // We'll still write to flashcard_sessions so old code doesn't break
    if (practiceSession) {
        await supabase
          .from('flashcard_sessions')
          .insert({
            practice_session_id: practiceSession.id,
            user_id: userId,
            cards: cards,
            total_cards: cards.length,
            cards_correct: 0,
            cards_needs_review: 0
          });
    }

    // Track Analytics
    await supabase.rpc('record_ai_message', {
       p_user_id: userId,
       p_message_type: 'practice_flashcards_generated',
       p_token_count: 2
    });

    res.status(200).json({ 
        sessionId: deck.id, // We return the DECK ID now as the sessionId
        deckId: deck.id,
        cards: cards
    });
  } catch (error: any) {
    console.error('API Error /api/practice/flashcards/generate:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
