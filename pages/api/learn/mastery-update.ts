import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { updateConceptMastery } from '@/lib/vault';
import { MasteryState } from '@/types/serify';
import { authenticateApiRequest } from '@/lib/sparks';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }


    const authenticatedUserId = await authenticateApiRequest(req);
    if (!authenticatedUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { conceptId, mode, outcome, sessionId } = req.body;

    if (!conceptId || !mode || !outcome || !sessionId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }


    const validStates: MasteryState[] = ['solid', 'developing', 'shaky', 'revisit'];
    if (!validStates.includes(outcome)) {
        return res.status(400).json({ error: 'Invalid outcome value' });
    }

    try {

        let source: 'session' | 'flashcards' | 'quiz' | 'feynman' | 'tutor' | 'explain' | 'deepdive' = 'flashcards';
        if (['session', 'flashcards', 'quiz', 'feynman', 'tutor', 'explain', 'deepdive'].includes(mode)) {
            source = mode;
        }

        await updateConceptMastery(
            supabase,
            authenticatedUserId,
            conceptId,
            outcome as MasteryState,
            source,
            sessionId
        );

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Error updating mastery:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
