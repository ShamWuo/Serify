import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, hasEnoughSparks, deductSparks, SPARK_COSTS } from '@/lib/sparks';
import { createClient } from '@supabase/supabase-js';
import { parseJSON } from '@/lib/serify-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== 'string') return res.status(400).json({ error: 'Missing or invalid sessionId' });


    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(sessionId)) {
        return res.status(400).json({ error: 'Invalid session: this session was created before the current format and cannot be used with this feature.' });
    }
    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const sparkCost = SPARK_COSTS.FLASHCARD_DECK;
    const hasSparks = await hasEnoughSparks(userId, sparkCost);
    if (!hasSparks) {
        return res.status(403).json({
            error: 'out_of_sparks',
            message: `You do not have enough Sparks to generate a new flashcard deck. This action costs ${sparkCost} Spark. Please top up your balance.`
        });
    }

    const { weakConcepts = [] } = req.body;

    if (!weakConcepts || weakConcepts.length === 0) {
        return res.status(400).json({ error: 'Missing weakConcepts' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                responseMimeType: 'application/json',
                maxOutputTokens: 2000
            },
            systemInstruction: `You are generating flashcards.
For each concept, generate:
1. Front: retrieval question (recall, not recognition).
2. Back: concise explanation (2-4 sentences, plain language). Correct misconceptions if listed.

Format: [{"front": "string", "back": "string", "conceptId": "string", "id": "uuid"}]`
        });

        const promptText = `
The student showed the following understanding of each concept. For each one, generate a flashcard and return the EXACT same conceptId provided. Generate a random unique UUID for each card's "id" field:
${weakConcepts.map((c: any) => `- ${c.name} (ID: ${c.id}): ${c.masteryState} — ${c.feedbackNote || ''}`).join('\n')}
    `;

        const deduction = await deductSparks(userId, sparkCost, 'flashcard_deck');
        if (!deduction.success) {
            return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Spark to generate flashcards.` });
        }

        const result = await model.generateContent(promptText);
        const text = result.response.text();

        let generatedCards = [];
        try {
            generatedCards = parseJSON<any[]>(text);

            generatedCards = generatedCards.map((card: any) => ({
                id: card.id || crypto.randomUUID(),
                conceptId: card.conceptId,
                conceptName: weakConcepts.find((c: any) => c.id === card.conceptId)?.name || 'Concept',
                front: card.front,
                back: card.back,
                status: 'unseen',
                lastReviewedAt: null,
                gotItCount: 0,
                stillShakyCount: 0
            }));
        } catch (parseError) {
            console.error("Failed to parse Gemini Flashcards output:", text);
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }

        const { data: existingDeck } = await supabase
            .from('flashcard_decks')
            .select('*')
            .eq('session_id', sessionId)
            .maybeSingle();

        let finalDeck;

        if (existingDeck) {
            const { data, error } = await supabase
                .from('flashcard_decks')
                .update({
                    cards: generatedCards,
                    card_count: generatedCards.length,
                    regenerated_at: new Date().toISOString(),
                    generation_count: existingDeck.generation_count + 1,
                    progress: {
                        startedAt: null,
                        lastActivityAt: null,
                        currentCardIndex: 0,
                        gotItCount: 0,
                        stillShakyCount: 0,
                        completedAt: null,
                        attemptCount: (existingDeck.progress?.attemptCount || 0) + 1
                    }
                })
                .eq('session_id', sessionId)
                .select()
                .single();

            if (error) throw error;
            finalDeck = data;
        } else {
            const { data, error } = await supabase
                .from('flashcard_decks')
                .insert({
                    session_id: sessionId,
                    user_id: userId,
                    card_count: generatedCards.length,
                    cards: generatedCards,
                    progress: {
                        startedAt: new Date().toISOString(),
                        lastActivityAt: new Date().toISOString(),
                        currentCardIndex: 0,
                        gotItCount: 0,
                        stillShakyCount: 0,
                        completedAt: null,
                        attemptCount: 1
                    }
                })
                .select()
                .single();

            if (error) throw error;
            finalDeck = data;
        }

        return res.status(200).json(finalDeck);

    } catch (error: any) {
        console.error('Error generating flashcards:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
