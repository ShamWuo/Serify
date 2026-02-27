import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/sparks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PATCH') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== 'string') return res.status(400).json({ error: 'Missing or invalid sessionId' });



    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { cardId, status } = req.body;
    if (!cardId || !['got_it', 'still_shaky'].includes(status)) {
        return res.status(400).json({ error: 'Invalid cardId or status. Status must be got_it or still_shaky.' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    try {
        const { data: deck, error } = await supabase
            .from('flashcard_decks')
            .select('*')
            .eq('session_id', sessionId)
            .single();

        if (error || !deck) {
            return res.status(404).json({ error: 'Flashcard deck not found' });
        }

        const cards = deck.cards.map((card: any) => {
            if (card.id !== cardId) return card;
            return {
                ...card,
                status,
                lastReviewedAt: new Date().toISOString(),
                gotItCount: status === 'got_it' ? card.gotItCount + 1 : card.gotItCount,
                stillShakyCount: status === 'still_shaky' ? card.stillShakyCount + 1 : card.stillShakyCount
            };
        });

        const gotItCount = cards.filter((c: any) => c.status === 'got_it').length;
        const stillShakyCount = cards.filter((c: any) => c.status === 'still_shaky').length;
        const allRetired = cards.every((c: any) => c.gotItCount >= 3);

        const progress = {
            ...deck.progress,
            lastActivityAt: new Date().toISOString(),
            gotItCount,
            stillShakyCount,
            completedAt: allRetired ? new Date().toISOString() : deck.progress?.completedAt
        };

        const { error: updateError } = await supabase
            .from('flashcard_decks')
            .update({
                cards,
                progress
            })
            .eq('session_id', sessionId);

        if (updateError) throw updateError;

        return res.status(200).json({ success: true, progress, cards });
    } catch (error: any) {
        console.error('Error updating flashcard progress:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
