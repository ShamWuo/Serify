import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { analyzeAnswers } from '@/lib/serify-ai';
import { ReflectionSession, MasteryState } from '@/types/serify';
import { authenticateApiRequest, checkUsage, incrementUsage } from '@/lib/usage';
import { findOrCreateConceptNode, updateConceptMastery, updateVaultHierarchy } from '@/lib/vault';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        console.log('Analyze API: Method not allowed:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = req.headers.authorization?.split(' ').pop();

    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    });

    console.log('Analyze API: User authenticated:', userId);

    const { sessionId, answers, isBasicMode } = req.body;

    if (!sessionId || !answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Missing sessionId or answers' });
    }

    const { data: tracking } = await supabaseWithAuth
        .from('usage_tracking')
        .select('plan')
        .eq('user_id', userId)
        .single();

    const usage = await incrementUsage(userId, 'session_standard');
    if (!usage.allowed) {
        return res
            .status(403)
            .json({
                error: 'limit_reached',
                message: 'You have reached your feature limit.'
            });
    }

    try {
        console.log('Analyze API: Processing session:', sessionId);

        const { data: session, error: sessionError } = await supabaseWithAuth
            .from('reflection_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('user_id', userId)
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
        const answerRows = answers.map(
            (a: { questionId: string; answer: string; confidence: string }) => ({
                session_id: sessionId,
                question_id: a.questionId,
                answer: a.answer,
                confidence: a.confidence
            })
        );

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
            userId: userId,
            date: new Date(session.created_at),
            contentSource: {
                id: sessionId,
                type: session.content_type as any,
                title: session.title,
                content: session.content
            },
            extractedConcepts: conceptRows.map((c) => ({
                id: c.id,
                name: c.name,
                description: c.description ?? '',
                importance: c.importance ?? 'medium',
                relatedConcepts: c.related_concept_names ?? []
            })),
            assessmentQuestions: questionRows.map((q) => ({
                id: q.id,
                type: q.type,
                text: q.text,
                relatedConcepts: q.related_concept_ids ?? []
            })),
            userAnswers: answers.map((a: { questionId: string; answer: string }) => ({
                questionId: a.questionId,
                answer: a.answer
            })),
            status: 'feedback'
        };

        console.log('Analyze API: Analyzing answers via Gemini (Plan:', (tracking?.plan || 'free'), ')...');
        const { analysis, depthScore } = await analyzeAnswers(reflectionSession, tracking?.plan || 'free');

        if (isBasicMode) {
            console.log('Analyze API: Basic mode requested, stripping advanced fields');
            analysis.insights = [];
            analysis.focusSuggestions = [];
        }

        console.log('Analyze API: Analysis complete, depth score:', depthScore);

        const { error: analysisError } = await supabaseWithAuth.from('analyses').upsert(
            {
                session_id: sessionId,
                depth_score: depthScore,
                strength_map: analysis.strengthMap,
                insights: analysis.insights,
                focus_suggestions: analysis.focusSuggestions
            },
            { onConflict: 'session_id' }
        );

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

        
        console.log('Analyze API: Updating Concept Vault...');
        try {
            const allConceptNames = new Set([
                ...(analysis.strengthMap.strong || []),
                ...(analysis.strengthMap.weak || []),
                ...(analysis.strengthMap.missing || [])
            ]);
            
            console.log('Analyze API: Concepts to update:', Array.from(allConceptNames));

            // Process every concept extracted in this session
            for (const concept of conceptRows) {
                const name = concept.name;
                const description = concept.description || '';
                
                // Fuzzy match: Gemini's strengthMap names often differ slightly from extracted concept names
                const nameLower = name.toLowerCase();
                let mastery: MasteryState = 'revisit';
                const isStrong = analysis.strengthMap.strong?.some(
                    (s: string) => nameLower.includes(s.toLowerCase()) || s.toLowerCase().includes(nameLower)
                );
                const isWeak = analysis.strengthMap.weak?.some(
                    (w: string) => nameLower.includes(w.toLowerCase()) || w.toLowerCase().includes(nameLower)
                );
                if (isStrong) {
                    mastery = 'solid';
                } else if (isWeak) {
                    mastery = 'shaky';
                } else {
                    // Concept was seen but not evaluated — treat as developing rather than revisit
                    mastery = 'developing';
                }
                
                console.log(`Analyze API: Updating node "${name}" with mastery "${mastery}"`);

                const node = await findOrCreateConceptNode(supabaseWithAuth, userId, name, sessionId, description);
                if (node) {
                    await updateConceptMastery(supabaseWithAuth, userId, node.id, mastery, 'session', sessionId);
                    
                    // Handle hierarchy if parent info exists
                    const parentName = (concept.relationships as any)?.parentName;
                    if (parentName) {
                        const parentNode = await findOrCreateConceptNode(supabaseWithAuth, userId, parentName, sessionId, '');
                        if (parentNode && node.parent_concept_id !== parentNode.id) {
                            await supabaseWithAuth
                                .from('knowledge_nodes')
                                .update({ parent_concept_id: parentNode.id, is_sub_concept: true })
                                .eq('id', node.id);
                        }
                    }
                }
            }
            
            // Also process any names Gemini mentioned that weren't in our original conceptRows (hallucinations/inferences)
            for (const name of allConceptNames) {
                if (conceptRows.some(c => c.name.toLowerCase() === name.toLowerCase())) continue;
                
                const mastery = analysis.strengthMap.strong?.includes(name) ? 'solid' : 'shaky';
                console.log(`Analyze API: Updating inferred node "${name}" with mastery "${mastery}"`);
                const node = await findOrCreateConceptNode(supabaseWithAuth, userId, name, sessionId, '');
                if (node) {
                    await updateConceptMastery(supabaseWithAuth, userId, node.id, mastery, 'session', sessionId);
                }
            }

            await updateVaultHierarchy(supabaseWithAuth, userId);
        } catch (vaultErr) {
            console.error('Analyze API: Failed to update Vault:', vaultErr);
        }

        console.log('Analyze API: Complete, returning results');

        return res.status(200).json({ analysis, depthScore });
    } catch (err) {
        console.error('Analyze error:', err);
        return res.status(500).json({ error: 'Failed to analyze answers' });
    }
}

