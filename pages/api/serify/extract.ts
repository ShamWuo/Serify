import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { extractConcepts } from '@/lib/serify-ai';
import { ContentSource } from '@/types/serify';
import { deductSparks, hasEnoughSparks, SPARK_COSTS } from '@/lib/sparks';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(userId);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
        return true;
    }
    if (entry.count >= 10) return false;
    entry.count++;
    return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        console.log('Method not allowed:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('Extract API called');

    if (!process.env.GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY is not set');
        return res
            .status(500)
            .json({
                error: 'GEMINI_API_KEY is not configured. Please set it in your .env.local file.'
            });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.log('No authorization header');
        return res.status(401).json({ error: 'Unauthorized: No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    });

    const {
        data: { user },
        error: authError
    } = await supabaseWithAuth.auth.getUser(token);

    if (authError) {
        console.error('Auth error:', authError);
        return res.status(401).json({ error: `Unauthorized: ${authError.message}` });
    }

    if (!user) {
        console.log('No user found');
        return res.status(401).json({ error: 'Unauthorized: No user found' });
    }

    const sparkCost = SPARK_COSTS.SESSION_INGESTION;
    const hasSparks = await hasEnoughSparks(user.id, sparkCost);
    if (!hasSparks) {
        return res.status(403).json({
            error: 'out_of_sparks',
            message: `You need ${sparkCost} Sparks to extract concepts.`
        });
    }

    console.log('User authenticated:', user.id);

    if (!checkRateLimit(user.id)) {
        console.log('Rate limit exceeded for user:', user.id);
        return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
    }

    const { contentType, content, url, title, difficulty } = req.body;
    console.log('Request body:', {
        contentType,
        hasContent: !!content,
        hasUrl: !!url,
        title,
        difficulty
    });

    if (!contentType || !title) {
        return res.status(400).json({ error: 'Missing contentType or title' });
    }

    if (contentType === 'text' && !content) {
        return res.status(400).json({ error: 'Content is required for text type' });
    }

    if ((contentType === 'youtube' || contentType === 'article') && !url) {
        return res.status(400).json({ error: 'URL is required for youtube/article type' });
    }

    try {
        const contentSource: ContentSource = {
            id: Date.now().toString(),
            type: contentType,
            title,
            content,
            url
        };

        const targetContent = content ?? url;

        const { data: existingSession, error: checkErr } = await supabaseWithAuth
            .from('reflection_sessions')
            .select('id, status')
            .eq('user_id', user.id)
            .eq('content', targetContent)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingSession && !checkErr) {
            console.log('Found existing session for this content:', existingSession.id);

            if (['assessment', 'feedback', 'complete'].includes(existingSession.status)) {
                const { data: existingConcepts } = await supabaseWithAuth
                    .from('concepts')
                    .select('*')
                    .eq('session_id', existingSession.id);

                if (existingConcepts && existingConcepts.length > 0) {
                    console.log('Reusing concepts from session:', existingSession.id);
                    return res.status(200).json({
                        sessionId: existingSession.id,
                        concepts: existingConcepts,
                        reused: true
                    });
                }
            }
        }

        console.log('Creating session in database...');
        const { data: session, error: sessionError } = await supabaseWithAuth
            .from('reflection_sessions')
            .insert({
                user_id: user.id,
                title,
                content_type: contentType,
                content: content ?? url,
                difficulty: difficulty ?? 'intermediate',
                status: 'processing'
            })
            .select()
            .single();

        if (sessionError) {
            console.error('Session creation error:', sessionError);
            return res.status(500).json({
                error: `Failed to create session: ${sessionError.message}`,
                details: sessionError
            });
        }

        if (!session) {
            console.error('No session returned from insert');
            return res.status(500).json({ error: 'Failed to create session: No session returned' });
        }

        console.log('Session created:', session.id);

        const deduction = await deductSparks(user.id, sparkCost, 'session_ingestion', session.id);
        if (!deduction.success) {
            return res
                .status(403)
                .json({
                    error: 'out_of_sparks',
                    message: `You need ${sparkCost} Sparks to extract concepts.`
                });
        }

        console.log('Extracting concepts via Gemini...');

        const concepts = await extractConcepts(contentSource);
        console.log('Concepts extracted:', concepts.length);

        const conceptRows = concepts.map((c) => ({
            session_id: session.id,
            name: c.name,
            description: c.description,
            importance: c.importance,
            related_concept_names: c.relatedConcepts
        }));

        console.log('Saving concepts to database...');
        const { error: conceptError } = await supabaseWithAuth.from('concepts').insert(conceptRows);

        if (conceptError) {
            console.error('Concept insert error:', conceptError);
            return res.status(500).json({
                error: `Failed to save concepts: ${conceptError.message}`,
                details: conceptError
            });
        }

        await supabaseWithAuth
            .from('reflection_sessions')
            .update({ status: 'assessment' })
            .eq('id', session.id);

        console.log('Extraction complete, returning sessionId:', session.id);
        return res.status(200).json({ sessionId: session.id, concepts });
    } catch (err: any) {
        console.error('Extract error:', err);
        const errorMessage = err.message || 'Failed to extract concepts';
        return res.status(500).json({
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
}
