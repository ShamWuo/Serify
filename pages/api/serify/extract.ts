import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { extractConcepts, generateSessionTitle } from '@/lib/serify-ai';
import { ContentSource } from '@/types/serify';
import { authenticateApiRequest, consumeTokens } from '@/lib/usage';
import { YoutubeTranscript } from 'youtube-transcript';
import { supabaseAdmin } from '@/lib/supabase';
import { sendError } from '@/lib/api-utils';
import { z } from 'zod';
 
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

const extractRequestSchema = z.object({
    contentType: z.enum(['youtube', 'article', 'pdf', 'text', 'file']),
    content: z.string().optional(),
    url: z.string().optional(),
    title: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    mode: z.enum(['study', 'learn', 'analyze']).optional(),
    fileData: z.object({
        base64: z.string(),
        mimeType: z.string()
    }).optional()
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

    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!geminiApiKey) {
        return sendError(res, 'AI service is not configured. Please add GEMINI_API_KEY to your environment.', 500, 'Configuration Error');
    }

    const validatedBody = extractRequestSchema.safeParse(req.body);
    if (!validatedBody.success) {
        return res.status(400).json({
            error: 'Invalid request body',
            details: validatedBody.error.format()
        });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return sendError(res, 'Unauthorized', 401, 'Unauthorized');
    }

    const token = req.headers.authorization?.split(' ').pop();

    if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase admin client not initialized' });
    }

    let { contentType, content, url, title, difficulty, fileData } = validatedBody.data;

    
    const action = contentType === 'pdf' ? 'session_pdf' : 'session_standard';
    const usageResult = await consumeTokens(userId, action);
    if (!usageResult.allowed) {
        return res.status(403).json({
            error: 'limit_reached',
            message: 'You have reached your feature limit.'
        });
    }

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
                let errorResponse = 'Could not extract transcript from this video. Please ensure the URL is correct.';
                
                if (msg.includes('Transcript is disabled') || msg.includes('No transcript found')) {
                    errorResponse = 'This video has no available transcript. Please try a different video or paste the content manually.';
                }
                
                return res.status(400).json({
                    error: 'transcript_unavailable',
                    message: errorResponse
                });
            }
        }

        
        if (!title || title === 'New Session' || title === 'pasted notes' || title.length < 5 || title.length > 70 || title.toLowerCase().includes('no concepts')) {
            try {
                console.log('Generating session title...');
                const contentForTitle = (processedTranscript || content || url || '').substring(0, 1000);
                title = await generateSessionTitle(contentForTitle, contentType);
                console.log('Generated title:', title);

                // If the generated title still looks like an error message, use a fallback
                if (title.toLowerCase().includes('no concepts') || title.toLowerCase().includes('failed')) {
                    throw new Error('AI returned error-like title');
                }
            } catch (e) {
                // Better fallback based on source
                if (contentType === 'youtube') title = 'YouTube Session';
                else if (contentType === 'pdf') title = 'PDF Session';
                else if (contentType === 'article') title = 'Article Review';
                else title = 'Study Session';
            }
        }

        const contentSource: ContentSource = {
            id: Date.now().toString(),
            type: contentType,
            title,
            content: content || (fileData ? '[File Upload]' : ''),
            url: url || ''
        };

        const targetContent = content ?? url;

        let cachedConcepts = null;

        const { data: existingSession, error: checkErr } = await (supabaseAdmin as any)
            .from('reflection_sessions')
            .select('id, status')
            .eq('user_id', userId)
            .eq('content', targetContent || '')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        
        if (existingSession && !checkErr) {
            console.log('Found existing session for this content:', existingSession.id);

            
            if (!['feedback', 'complete'].includes(existingSession.status)) {
                console.log('Resuming existing session:', existingSession.id);
                return res.status(200).json({
                    sessionId: existingSession.id,
                    resumed: true,
                    message: 'Resuming existing session for this content.'
                });
            }

            
            if (['assessment', 'feedback', 'complete'].includes(existingSession.status!)) {
                const { data: existingConcepts } = await (supabaseAdmin as any)
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
        const { data: session, error: sessionError } = await (supabaseAdmin as any)
            .from('reflection_sessions')
            .insert({
                user_id: userId,
                title,
                content_type: contentType,
                content: content ?? url ?? '',
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

        

        
        let vaultContextString = '';
        try {
            const { data: categories } = await supabaseAdmin
                .from('vault_categories')
                .select('id, name')
                .eq('user_id', userId);
            
            if (categories && categories.length > 0) {
                const categoryIds = categories.map(c => c.id);
                const { data: nodes } = await supabaseAdmin
                    .from('knowledge_nodes')
                    .select('display_name, category_id')
                    .eq('user_id', userId)
                    .in('category_id', categoryIds)
                    .is('is_archived', false);
                
                vaultContextString = categories.map(cat => {
                    const catNodes = nodes?.filter(n => n.category_id === cat.id) || [];
                    const nodeNames = catNodes.map(n => n.display_name).join(', ');
                    return `- ${cat.name}${nodeNames ? `: ${nodeNames}` : ''}`;
                }).join('\n');
            }
        } catch (vErr) {
            console.error('Error fetching vault context:', vErr);
        }

        const { data: tracking } = await (supabaseAdmin as any)
            .from('usage_tracking')
            .select('plan')
            .eq('user_id', userId)
            .single();

        
        let finalConcepts: any[] = [];

        if (cachedConcepts) {
            console.log('Cloning cached concepts...');
            finalConcepts = cachedConcepts;
            const conceptsToSave = cachedConcepts.map((c: any) => ({
                session_id: session.id, 
                name: c.name,
                description: c.description,
                importance: c.importance,
                related_concept_names: c.related_concept_names, 
                misconception_risk: c.misconception_risk,
                relationships: c.relationships 
            }));

            console.log('Saving cached concepts...');
            const { error: conceptError } = await supabaseAdmin
                .from('concepts')
                .insert(conceptsToSave);

            if (conceptError) {
                console.error('Cached concept save error:', conceptError);
                
                
            }
        } else {
            console.log('Extracting concepts via Gemini (Plan:', (tracking?.plan || 'free'), ')...');
            const extracted = await extractConcepts(contentSource, tracking?.plan || 'free', processedTranscript, vaultContextString, fileData);
            
            if (!extracted || extracted.length === 0) {
                console.log('Zero concepts extracted. Marking session as failed.');
                await supabaseAdmin
                    .from('reflection_sessions')
                    .update({ 
                        status: 'failed',
                        title: 'No Concepts Extracted' 
                    })
                    .eq('id', session.id);
                
                return res.status(400).json({
                    error: 'no_concepts',
                    message: 'We couldn\'t extract any distinct concepts from this material. Try a different source or more specific text.'
                });
            }

            console.log('Concepts extracted:', extracted.length);
            finalConcepts = extracted;

            const flattenedConcepts: any[] = [];
            extracted.forEach((pillar: any) => {
                
                flattenedConcepts.push({
                    session_id: session.id,
                    name: pillar.name,
                    description: pillar.description || '',
                    importance: pillar.importance || 'medium',
                    related_concept_names: pillar.relatedConcepts || [],
                    relationships: { isPillar: true }
                });

                
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
            const { error: conceptError } = await supabaseAdmin
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

        await supabaseAdmin
            .from('reflection_sessions')
            .update({ status: 'assessment' })
            .eq('id', session.id);

        console.log('Extraction complete, returning sessionId:', session.id);
        return res
            .status(200)
            .json({ sessionId: session.id, concepts: finalConcepts, cached: !!cachedConcepts });
    } catch (err: any) {
        console.error(' [EXTRACT ERROR] Final Catch Block:', err);
        const errorMessage = err.message || 'Failed to extract concepts';
        
        
        if (err.stack) {
            console.error(' [EXTRACT ERROR] Stack Trace:', err.stack);
        }

        return res.status(500).json({
            error: errorMessage,
            details: typeof err === 'object' ? {
                message: err.message,
                name: err.name,
                code: err.code,
                stack: err.stack
            } : err
        });
    }
}
