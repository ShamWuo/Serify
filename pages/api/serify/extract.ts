import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { extractConcepts, generateSessionTitle } from '@/lib/serify-ai';
import { ContentSource } from '@/types/serify';
import { checkUsage, incrementUsage } from '@/lib/usage';
import { YoutubeTranscript } from 'youtube-transcript';
import { sendError } from '@/lib/api-utils';
import { z } from 'zod';

const extractRequestSchema = z.object({
    contentType: z.enum(['youtube', 'article', 'pdf', 'text']),
    content: z.string().optional(),
    url: z.string().optional(),
    title: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional()
});

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
        return sendError(res, 'Method not allowed', 405, 'Method Not Allowed');
    }

    if (!process.env.GEMINI_API_KEY) {
        return sendError(res, 'AI service is not configured', 500, 'Configuration Error');
    }

    const validatedBody = extractRequestSchema.safeParse(req.body);
    if (!validatedBody.success) {
        return res.status(400).json({
            error: 'Invalid request body',
            details: validatedBody.error.format()
        });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return sendError(res, 'Unauthorized', 401, 'Unauthorized');
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

    if (authError || !user) {
        return sendError(res, 'Unauthorized', 401, 'Unauthorized');
    }

    const hasSparks = (await checkUsage(user.id, 'sessions')).allowed;
    if (!hasSparks) {
        return sendError(res, `You need ${sparkCost} Sparks.`, 403, 'out_of_sparks');
    }

    if (!checkRateLimit(user.id)) {
        return sendError(res, 'Too many requests. Try again in a minute.', 429, 'Rate Limit Exceeded');
    }

    let { contentType, content, url, title, difficulty } = validatedBody.data;
    console.log('Request body:', {
        contentType,
        hasContent: !!content,
        hasUrl: !!url,
        title,
        difficulty
    });

    if (!contentType) {
        return res.status(400).json({ error: 'Missing contentType' });
    }

    if (contentType === 'text' && !content) {
        return res.status(400).json({ error: 'Content is required for text type' });
    }

    if ((contentType === 'youtube' || contentType === 'article') && !url) {
        return res.status(400).json({ error: 'URL is required for youtube/article type' });
    }

    try {
        let processedTranscript = undefined;
        if (contentType === 'youtube') {
            try {
                console.log('Fetching YouTube transcript for:', url);
                const transcriptData = await YoutubeTranscript.fetchTranscript(url as string);
                processedTranscript = transcriptData.map((t: any) => t.text).join(' ');
                console.log('YouTube transcript fetched successfully');
            } catch (err: any) {
                console.error('YouTube transcript error:', err);
                const msg = err.message || '';
                if (msg.includes('Transcript is disabled') || msg.includes('No transcript found')) {
                    throw new Error('This video has no available transcript. Please try a different video or paste the content manually.');
                }
                throw new Error('Could not extract transcript from this video. Please ensure the URL is correct.');
            }
        }

        // Generate a better title if needed
        if (!title || title === 'New Session' || title === 'pasted notes' || title.length < 5) {
            try {
                console.log('Generating session title...');
                const contentForTitle = processedTranscript || content || url;
                title = await generateSessionTitle(contentForTitle || '', contentType);
                console.log('Generated title:', title);
            } catch (e) {
                title = title || 'Untitled Session';
            }
        }

        const contentSource: ContentSource = {
            id: Date.now().toString(),
            type: contentType,
            title,
            content: content || '',
            url: url || ''
        };

        const targetContent = content ?? url;

        let cachedConcepts = null;

        const { data: existingSession, error: checkErr } = await supabaseWithAuth
            .from('reflection_sessions')
            .select('id, status')
            .eq('user_id', user.id)
            .eq('content', targetContent)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        // 1. Check if we have a viable cache hit or an existing session to resume
        if (existingSession && !checkErr) {
            console.log('Found existing session for this content:', existingSession.id);

            // If it's a "live" session (not complete), just return it
            if (!['feedback', 'complete'].includes(existingSession.status)) {
                console.log('Resuming existing session:', existingSession.id);
                return res.status(200).json({
                    sessionId: existingSession.id,
                    resumed: true,
                    message: 'Resuming existing session for this content.'
                });
            }

            // If it's complete, we still try to use its concepts
            if (['assessment', 'feedback', 'complete'].includes(existingSession.status)) {
                const { data: existingConcepts } = await supabaseWithAuth
                    .from('concepts')
                    .select('*')
                    .eq('session_id', existingSession.id);

                if (existingConcepts && existingConcepts.length > 0) {
                    console.log('CACHE HIT: Sourced exact concepts from session:', existingSession.id);
                    cachedConcepts = existingConcepts;
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

        const deduction = (await incrementUsage(user.id, 'sessions').then(() => ({ success: true })));
        if (!deduction.success) {
            return res
                .status(403)
                .json({
                    error: 'limit_reached',
                    message: 'You have reached your feature limit.'
                });
        }

        // 3. Either clone cached concepts or call Gemini
        let finalConcepts: any[] = [];

        if (cachedConcepts) {
            console.log('Cloning cached concepts...');
            finalConcepts = cachedConcepts;
            const conceptsToSave = cachedConcepts.map((c: any) => ({
                session_id: session.id, // attach to the NEW session
                name: c.name,
                description: c.description,
                importance: c.importance,
                related_concept_names: c.related_concept_names, // cloned exactly
                misconception_risk: c.misconception_risk,
                relationships: c.relationships // Preserve hierarchy metadata
            }));

            console.log('Saving cached concepts...');
            const { error: conceptError } = await supabaseWithAuth
                .from('concepts')
                .insert(conceptsToSave);

            if (conceptError) {
                console.error('Cached concept save error:', conceptError);
                // Decide how to handle this error: return 500 or just log and continue?
                // For now, we'll log and proceed, assuming the session is still valid.
            }
        } else {
            console.log('Extracting concepts via Gemini...');
            const extracted = await extractConcepts(contentSource, processedTranscript);
            console.log('Concepts extracted:', extracted.length);
            finalConcepts = extracted;

            const flattenedConcepts: any[] = [];
            extracted.forEach((pillar: any) => {
                // Add the pillar itself
                flattenedConcepts.push({
                    session_id: session.id,
                    name: pillar.name,
                    description: pillar.description || '',
                    importance: pillar.importance || 'medium',
                    related_concept_names: pillar.relatedConcepts || [],
                    relationships: { isPillar: true }
                });

                // Add sub-concepts if they exist
                if (pillar.subConcepts && Array.isArray(pillar.subConcepts)) {
                    pillar.subConcepts.forEach((sub: any) => {
                        flattenedConcepts.push({
                            session_id: session.id,
                            name: sub.name,
                            description: sub.description || '',
                            importance: pillar.importance || 'medium',
                            related_concept_names: [pillar.name],
                            relationships: {
                                isSub: true,
                                parentName: pillar.name
                            }
                        });
                    });
                }
            });

            console.log('Saving concepts to database...');
            const { error: conceptError } = await supabaseWithAuth
                .from('concepts')
                .insert(flattenedConcepts);

            if (conceptError) {
                console.error('Concept insert error:', conceptError);
                return res.status(500).json({
                    error: `Failed to save concepts: ${conceptError.message}`,
                    details: conceptError
                });
            }
        }

        await supabaseWithAuth
            .from('reflection_sessions')
            .update({ status: 'assessment' })
            .eq('id', session.id);

        console.log('Extraction complete, returning sessionId:', session.id);
        return res
            .status(200)
            .json({ sessionId: session.id, concepts: finalConcepts, cached: !!cachedConcepts });
    } catch (err: any) {
        console.error('Extract error:', err);
        const errorMessage = err.message || 'Failed to extract concepts';
        return res.status(500).json({
            error: errorMessage,
            details: err
        });
    }
}
