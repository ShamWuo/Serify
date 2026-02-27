import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { analyzeAnswers } from '@/lib/serify-ai';
import { ReflectionSession } from '@/types/serify';
import { canAccess } from '@/lib/gates';
import { deductSparks, hasEnoughSparks, SPARK_COSTS } from '@/lib/sparks';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        console.log('Analyze API: Method not allowed:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('Analyze API called');

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.log('Analyze API: No authorization header');
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
        console.error('Analyze API: Auth error:', authError);
        return res.status(401).json({ error: `Unauthorized: ${authError.message}` });
    }

    if (!user) {
        console.log('Analyze API: No user found');
        return res.status(401).json({ error: 'Unauthorized: No user found' });
    }

    console.log('Analyze API: User authenticated:', user.id);

    const { sessionId, answers, isBasicMode } = req.body;

    if (!sessionId || !answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Missing sessionId or answers' });
    }

    const reportCost = isBasicMode ? SPARK_COSTS.BASIC_FEEDBACK_REPORT : (SPARK_COSTS.BASIC_FEEDBACK_REPORT + SPARK_COSTS.FULL_FEEDBACK_UPGRADE);
    const sparkCost = (answers.length * SPARK_COSTS.SESSION_ANSWER_ANALYSIS) + reportCost;

    const hasSparks = await hasEnoughSparks(user.id, sparkCost);
    if (!hasSparks) {
        return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Sparks to complete this session.` });
    }

    const deduction = await deductSparks(user.id, sparkCost, isBasicMode ? 'session_basic_analysis' : 'session_full_analysis', sessionId);
    if (!deduction.success) {
        return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Sparks to complete this session.` });
    }

    try {
        console.log('Analyze API: Processing session:', sessionId);

        const { data: session, error: sessionError } = await supabaseWithAuth
            .from('reflection_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (sessionError) {
            console.error('Analyze API: Session query error:', sessionError);
            return res.status(404).json({
                error: 'Session not found',
                details: sessionError.message
            });
        }

        if (!session) {
            console.log('Analyze API: Session not found');
            return res.status(404).json({ error: 'Session not found' });
        }

        console.log('Analyze API: Session found, loading concepts and questions...');

        const { data: conceptRows, error: conceptError } = await supabaseWithAuth
            .from('concepts')
            .select('*')
            .eq('session_id', sessionId);

        const { data: questionRows, error: questionError } = await supabaseWithAuth
            .from('assessment_questions')
            .select('*')
            .eq('session_id', sessionId);

        if (conceptError || questionError) {
            console.error('Analyze API: Data load error:', { conceptError, questionError });
            return res.status(500).json({
                error: 'Failed to load session data',
                details: conceptError?.message || questionError?.message
            });
        }

        if (!conceptRows || !questionRows) {
            return res.status(404).json({ error: 'Session data incomplete' });
        }

        console.log('Analyze API: Saving', answers.length, 'answers...');
        const answerRows = answers.map((a: { questionId: string; answer: string; confidence: string }) => ({
            session_id: sessionId,
            question_id: a.questionId,
            answer: a.answer,
            confidence: a.confidence,
        }));

        const { error: answerError } = await supabaseWithAuth
            .from('user_answers')
            .upsert(answerRows, { onConflict: 'session_id,question_id' });

        if (answerError) {
            console.error('Analyze API: Failed to save answers:', answerError);
            return res.status(500).json({
                error: 'Failed to save answers',
                details: answerError.message
            });
        }

        const reflectionSession: ReflectionSession = {
            id: sessionId,
            userId: user.id,
            date: new Date(session.created_at),
            contentSource: {
                id: sessionId,
                type: session.content_type as any,
                title: session.title,
                content: session.content,
            },
            extractedConcepts: conceptRows.map(c => ({
                id: c.id,
                name: c.name,
                description: c.description ?? '',
                importance: c.importance ?? 'medium',
                relatedConcepts: c.related_concept_names ?? [],
            })),
            assessmentQuestions: questionRows.map(q => ({
                id: q.id,
                type: q.type,
                text: q.text,
                relatedConcepts: q.related_concept_ids ?? [],
            })),
            userAnswers: answers.map((a: { questionId: string; answer: string }) => ({
                questionId: a.questionId,
                answer: a.answer,
            })),
            status: 'feedback',
        };

        console.log('Analyze API: Analyzing answers via Gemini...');
        const { analysis, depthScore } = await analyzeAnswers(reflectionSession);

        if (isBasicMode) {
            console.log('Analyze API: Basic mode requested, stripping advanced fields');
            analysis.insights = [];
            analysis.focusSuggestions = [];
        }

        console.log('Analyze API: Analysis complete, depth score:', depthScore);

        const { error: analysisError } = await supabaseWithAuth
            .from('analyses')
            .upsert({
                session_id: sessionId,
                depth_score: depthScore,
                strength_map: analysis.strengthMap,
                insights: analysis.insights,
                focus_suggestions: analysis.focusSuggestions,
            }, { onConflict: 'session_id' });

        if (analysisError) {
            console.error('Analyze API: Failed to save analysis:', analysisError);
            return res.status(500).json({
                error: 'Failed to save analysis',
                details: analysisError.message
            });
        }

        const { error: updateError } = await supabaseWithAuth
            .from('reflection_sessions')
            .update({ depth_score: depthScore, status: 'feedback' })
            .eq('id', sessionId);

        if (updateError) {
            console.error('Analyze API: Failed to update session:', updateError);
        }

        console.log('Analyze API: Complete, returning results');

        return res.status(200).json({ analysis, depthScore });
    } catch (err) {
        console.error('Analyze error:', err);
        return res.status(500).json({ error: 'Failed to analyze answers' });
    }
}
