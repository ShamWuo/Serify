import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/sparks';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const user = await authenticateApiRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    let { 
        title, 
        contentType, 
        content, 
        difficulty = 'medium', 
        session_type = 'analysis',
        concepts = [],
        questions = []
    } = req.body;

    if (!contentType) {
        return res.status(400).json({ message: 'Content type is required' });
    }

    if (!title || title === 'New Session') {
        if (content && typeof content === 'string') {
            title = content.split(' ').slice(0, 4).join(' ') + '...';
        } else {
            title = `New ${contentType.charAt(0).toUpperCase() + contentType.slice(1)} Session`;
        }
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    });

    try {
        // 1. Create the session
        const { data: session, error: sessionError } = await supabase
            .from('reflection_sessions')
            .insert({
                user_id: user,
                title,
                content_type: contentType,
                content: content || null,
                difficulty,
                status: (concepts.length > 0) ? 'assessment' : 'processing',
                session_type
            })
            .select()
            .single();

        if (sessionError || !session) {
            console.error('Failed to initialize session:', sessionError);
            return res.status(500).json({ message: 'Failed to initialize session' });
        }

        // 2. If we have concepts, save them
        let savedConcepts = [];
        const conceptIdMap: Record<string, string> = {};

        if (concepts.length > 0) {
            const conceptsToInsert = concepts.map((c: any) => ({
                session_id: session.id,
                name: c.name,
                definition: c.definition || c.description,
                importance: c.importance || 'medium',
                misconception_risk: !!c.misconception_risk
            }));

            const { data: insertedConcepts, error: conceptError } = await supabase
                .from('concepts')
                .insert(conceptsToInsert)
                .select();

            if (conceptError) {
                console.error('Failed to save concepts:', conceptError);
            } else if (insertedConcepts) {
                savedConcepts = insertedConcepts;
                // Map original IDs (like 'c1') to new UUIDs
                concepts.forEach((c: any, index: number) => {
                    if (c.id && insertedConcepts[index]) {
                        conceptIdMap[c.id] = insertedConcepts[index].id;
                    }
                });
            }
        }

        // 3. If we have questions, save them
        let savedQuestions = [];
        if (questions.length > 0) {
            const questionsToInsert = questions.map((q: any) => ({
                session_id: session.id,
                target_concept_id: conceptIdMap[q.target_concept_id] || null,
                type: q.type,
                text: q.text
            }));

            const { data: insertedQuestions, error: questionError } = await supabase
                .from('assessment_questions')
                .insert(questionsToInsert)
                .select();

            if (questionError) {
                console.error('Failed to save questions:', questionError);
            } else if (insertedQuestions) {
                savedQuestions = insertedQuestions;
            }
        }

        return res.status(200).json({ 
            session,
            concepts: savedConcepts,
            questions: savedQuestions
        });
    } catch (error) {
        console.error('Init session error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
