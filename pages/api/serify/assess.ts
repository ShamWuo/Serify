import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { generateAssessment } from '@/lib/serify-ai';
import { Concept } from '@/types/serify';
import { deductSparks, hasEnoughSparks, SPARK_COSTS } from '@/lib/sparks';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        console.log('Assess API: Method not allowed:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('Assess API called');

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.log('Assess API: No authorization header');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });

    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser(token);

    if (authError) {
        console.error('Assess API: Auth error:', authError);
        return res.status(401).json({ error: `Unauthorized: ${authError.message}` });
    }

    if (!user) {
        console.log('Assess API: No user found');
        return res.status(401).json({ error: 'Unauthorized: No user found' });
    }

    console.log('Assess API: User authenticated:', user.id);

    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== 'string') {
        console.log('Assess API: Missing or invalid sessionId:', sessionId);
        return res.status(400).json({ error: 'Missing sessionId' });
    }

    console.log('Assess API: Loading session:', sessionId);

    try {
        const { data: session, error: sessionError } = await supabaseWithAuth
            .from('reflection_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (sessionError) {
            console.error('Assess API: Session query error:', sessionError);
            return res.status(404).json({
                error: 'Session not found',
                details: sessionError.message
            });
        }

        if (!session) {
            console.log('Assess API: Session not found for sessionId:', sessionId, 'userId:', user.id);
            return res.status(404).json({ error: 'Session not found' });
        }

        console.log('Assess API: Session found:', session.id, 'status:', session.status);

        const { data: conceptRows, error: conceptError } = await supabaseWithAuth
            .from('concepts')
            .select('*')
            .eq('session_id', sessionId);

        if (conceptError) {
            console.error('Assess API: Concepts query error:', conceptError);
            return res.status(500).json({
                error: 'Failed to load concepts',
                details: conceptError.message
            });
        }

        if (!conceptRows || conceptRows.length === 0) {
            console.log('Assess API: No concepts found for session:', sessionId);
            return res.status(404).json({ error: 'No concepts found for this session' });
        }

        console.log('Assess API: Found', conceptRows.length, 'concepts');

        const { data: existingQuestions, error: questionsError } = await supabaseWithAuth
            .from('assessment_questions')
            .select('*')
            .eq('session_id', sessionId);

        if (questionsError) {
            console.error('Assess API: Questions query error:', questionsError);
        }

        if (existingQuestions && existingQuestions.length > 0) {
            return res.status(200).json({
                questions: existingQuestions.map(q => ({
                    id: q.id,
                    type: q.type,
                    text: q.text,
                    relatedConcepts: q.related_concept_ids ?? [],
                }))
            });
        }

        const { data: profile, error: profileError } = await supabaseWithAuth
            .from('profiles')
            .select('preferences')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.warn('Assess API: Profile query error (using defaults):', profileError);
        }

        const preferences = profile?.preferences ?? { tone: 'supportive', questionCount: 6 };

        const concepts: Concept[] = conceptRows.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description ?? '',
            importance: c.importance ?? 'medium',
            relatedConcepts: c.related_concept_names ?? [],
        }));

        const sparkCost = SPARK_COSTS.QUESTION_GENERATION;
        const hasSparks = await hasEnoughSparks(user.id, sparkCost);
        if (!hasSparks) {
            return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Spark to generate questions.` });
        }

        const deduction = await deductSparks(user.id, sparkCost, 'question_generation', sessionId);
        if (!deduction.success) {
            return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Spark to generate questions.` });
        }

        console.log('Assess API: Generating questions via Gemini...');
        const questions = await generateAssessment(concepts, preferences);
        console.log('Assess API: Generated', questions.length, 'questions');

        const questionRows = questions.map(q => ({
            session_id: sessionId,
            type: q.type,
            text: q.text,
            related_concept_ids: [],
        }));

        const { data: savedQuestions, error: saveError } = await supabaseWithAuth
            .from('assessment_questions')
            .insert(questionRows)
            .select();

        if (saveError) {
            console.error('Assess API: Failed to save questions:', saveError);
            return res.status(500).json({
                error: 'Failed to save questions',
                details: saveError.message
            });
        }

        const responseQuestions = (savedQuestions ?? []).map((q, i) => ({
            id: q.id,
            type: q.type,
            text: q.text,
            relatedConcepts: questions[i]?.relatedConcepts ?? [],
        }));

        return res.status(200).json({ questions: responseQuestions });
    } catch (err) {
        console.error('Assess error:', err);
        return res.status(500).json({ error: 'Failed to generate assessment' });
    }
}
