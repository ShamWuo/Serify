import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/sparks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid sessionId' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    try {
        const [
            { data: flashcardDeck },
            { data: practiceQuiz },
            { data: deepDive },
            { data: conceptExplanations },
            { data: tutorConversation },
            { data: feynmanAttempts }
        ] = await Promise.all([
            supabase.from('flashcard_decks').select('*').eq('session_id', sessionId).maybeSingle(),
            supabase.from('practice_quizzes').select('*').eq('session_id', sessionId).maybeSingle(),
            supabase
                .from('deep_dive_lessons')
                .select('*')
                .eq('session_id', sessionId)
                .maybeSingle(),
            supabase.from('concept_explanations').select('concept_id').eq('session_id', sessionId),
            supabase
                .from('tutor_conversations')
                .select('*')
                .eq('session_id', sessionId)
                .maybeSingle(),
            supabase
                .from('feynman_attempts')
                .select('feedback')
                .eq('session_id', sessionId)
                .order('attempt_number', { ascending: true })
        ]);

        const materials = {
            flashcards: flashcardDeck
                ? {
                      exists: true,
                      cardCount: flashcardDeck.card_count,
                      generatedAt: flashcardDeck.generated_at,
                      progress: flashcardDeck.progress,
                      generationCount: flashcardDeck.generation_count
                  }
                : { exists: false },

            practiceQuiz: practiceQuiz
                ? {
                      exists: true,
                      questionCount: practiceQuiz.question_count,
                      generatedAt: practiceQuiz.generated_at,
                      attempts: practiceQuiz.attempts,
                      generationCount: practiceQuiz.generation_count
                  }
                : { exists: false },

            deepDive: deepDive
                ? {
                      exists: true,
                      conceptName: deepDive.target_concept_name,
                      generatedAt: deepDive.generated_at,
                      readAt: deepDive.read_at,
                      generationCount: deepDive.generation_count
                  }
                : { exists: false },

            conceptExplanations: {
                exists: (conceptExplanations && conceptExplanations.length > 0) || false,
                count: conceptExplanations?.length || 0,
                conceptIds: conceptExplanations?.map((e) => e.concept_id) || []
            },

            tutorConversation: tutorConversation
                ? {
                      exists: true,
                      messageCount: tutorConversation.message_count,
                      lastMessageAt: tutorConversation.last_message_at
                  }
                : { exists: false },

            feynman: {
                exists: (feynmanAttempts && feynmanAttempts.length > 0) || false,
                attemptCount: feynmanAttempts?.length || 0,
                latestAssessment:
                    feynmanAttempts && feynmanAttempts.length > 0
                        ? feynmanAttempts[feynmanAttempts.length - 1]?.feedback?.overallAssessment
                        : null
            }
        };

        return res.status(200).json(materials);
    } catch (error: any) {
        console.error('Error fetching session materials:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
