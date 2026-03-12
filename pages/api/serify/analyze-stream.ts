import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { authenticateApiRequest, checkUsage, incrementUsage } from '@/lib/usage';
import { YoutubeTranscript } from 'youtube-transcript';
import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge'
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const conceptSchema = z.object({
    title: z.string().describe('A short descriptive title (3-5 words)'),
    concepts: z.array(
        z.object({
            id: z.string().describe("a unique short string like 'p1' for pillar, 's1' for sub-concept"),
            name: z.string().describe('The canonical name of the concept'),
            definition: z.string().describe('A clear, standalone definition (1-2 sentences).'),
            importance: z.enum(['primary', 'secondary', 'contextual']),
            misconception_risk: z.boolean().describe('True if beginners often misunderstand this specific point'),
            is_sub_concept: z.boolean().describe('True if this is a detailed sub-concept of a larger pillar'),
            parent_id: z.string().optional().describe('The ID of the pillar this concept belongs to (if it is a sub-concept)')
        })
    )
});

const questionSchema = z.object({
    questions: z.array(
        z.object({
            id: z.string().describe("a unique short string like 'q1'"),
            target_concept_id: z.string().describe('the id of the concept this tests'),
            type: z.enum(['RETRIEVAL', 'APPLICATION', 'MISCONCEPTION PROBE']),
            text: z
                .string()
                .describe(
                    'The actual question text (must be open-ended, no multiple choice)'
                )
        })
    )
});

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), { status: 405 });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                const { content, contentType, isBasicMode } = await req.json();

                if (!content || !contentType) {
                    send({ error: 'Content and contentType are required' });
                    controller.close();
                    return;
                }

                // Check usage
                const hasUsage = (await checkUsage(userId, 'session_standard')).allowed;
                if (!hasUsage) {
                    send({ error: 'limit_reached', message: 'You have reached your feature limit.' });
                    controller.close();
                    return;
                }

                // Step 1: Content Extraction
                send({ progress: 10, status: 'extracting', message: 'Fetching content...' });
                let processedContent = content;
                if (contentType === 'youtube') {
                    try {
                        const transcriptData = await YoutubeTranscript.fetchTranscript(content);
                        processedContent = transcriptData.map((t: any) => t.text).join(' ');
                    } catch (err) {
                        console.error('YouTube transcript error:', err);
                        send({ error: 'Could not extract transcript from this video.' });
                        controller.close();
                        return;
                    }
                }

                // Step 2: Concept Mapping
                send({ progress: 25, status: 'concepts', message: 'Mapping concepts...' });
                const conceptPrompt = `You are an expert knowledge analyst. Your goal is to extract a hierarchical concept map from the following material.
                
                Identify 2-3 broad "Mastery Pillars" (general domains) and 3-5 specific "Sub-concepts" that fall under them.
                In total, extract ${isBasicMode ? '5' : '6-8'} items.
                
                Return a JSON array where each item has:
                - id: unique string
                - name: canonical name
                - definition: 1-2 sentence definition
                - is_sub_concept: boolean
                - parent_id: id of the pillar (null if this is a pillar)
                - importance: primary (pillars), secondary/contextual (sub-concepts)

                Also determine a concise, professional title (3-5 words) for this material.
                
                Learning Material (${contentType}):
                ${processedContent.substring(0, 15000)}
                `;

                const { object: conceptData } = await generateObject({
                    // @ts-ignore
                    model: google('gemini-2.5-flash'),
                    temperature: 0.1,
                    prompt: conceptPrompt,
                    schema: conceptSchema
                });

                send({ progress: 45, status: 'concepts_done', data: conceptData });

                // Step 3: Question Generation
                send({ progress: 60, status: 'questions', message: 'Drafting questions...' });
                const questionCount = isBasicMode ? 6 : 5;
                const questionPrompt = `
                You are an expert tutor. I am giving you a Hierarchical Concept Map extracted from learning material.
                I need you to generate a set of open-ended free-text questions to diagnose a student's true understanding.
                Generate exactly ${questionCount} questions. Prioritize testing Sub-concepts, as mastering them proves mastery of the Pillar.
                
                Concept Map:
                ${JSON.stringify(conceptData.concepts, null, 2)}
                `;

                const { object: questionData } = await generateObject({
                    // @ts-ignore
                    model: google('gemini-2.5-flash'),
                    temperature: 0.1,
                    prompt: questionPrompt,
                    schema: questionSchema
                });

                send({ progress: 80, status: 'questions_done', data: questionData });

                // Step 4: Database Save
                send({ progress: 90, status: 'saving', message: 'Finalizing session...' });

                // Deduct usage first
                (await incrementUsage(userId, 'session_standard').then(() => ({ success: true })));

                // 1. Create the session
                const { data: session, error: sessionError } = await supabase
                    .from('reflection_sessions')
                    .insert({
                        user_id: userId,
                        title: conceptData.title,
                        content_type: contentType,
                        content: content || null,
                        difficulty: 'medium',
                        status: 'assessment',
                        session_type: 'analysis'
                    })
                    .select()
                    .single();

                if (sessionError || !session) {
                    throw new Error(sessionError?.message || 'Failed to initialize session');
                }

                // 2. Save concepts
                const conceptsToInsert = conceptData.concepts.map((c: any) => {
                    const parent = c.parent_id ? conceptData.concepts.find(p => p.id === c.parent_id) : null;
                    return {
                        session_id: session.id,
                        name: c.name,
                        definition: c.definition,
                        importance: c.importance,
                        misconception_risk: !!c.misconception_risk,
                        // We store hierarchy in related_concept_names: [ParentName, is_sub_concept_flag]
                        related_concept_names: c.is_sub_concept && parent ? [parent.name, "IS_SUB"] : []
                    };
                });

                const { data: insertedConcepts, error: conceptError } = await supabase
                    .from('concepts')
                    .insert(conceptsToInsert)
                    .select();

                if (conceptError) console.error('Concept insertion error:', conceptError);

                const conceptIdMap: Record<string, string> = {};
                if (insertedConcepts) {
                    conceptData.concepts.forEach((c: any, index: number) => {
                        if (c.id && insertedConcepts[index]) {
                            conceptIdMap[c.id] = insertedConcepts[index].id;
                        }
                    });
                }

                // 3. Save questions
                let questionsForFrontend: { id: string, target_concept_id: string, type: string, text: string }[] = [];
                if (questionData.questions && questionData.questions.length > 0) {
                    const questionsToInsert = questionData.questions.map((q: any) => ({
                        session_id: session.id,
                        target_concept_id: conceptIdMap[q.target_concept_id] || null,
                        type: q.type,
                        text: q.text
                    }));

                    const { data: insertedQuestions, error: qErr } = await supabase
                        .from('assessment_questions')
                        .insert(questionsToInsert)
                        .select();

                    if (qErr) console.error('Question insertion error:', qErr);

                    if (insertedQuestions) {
                        questionsForFrontend = insertedQuestions.map(q => ({
                            id: q.id,
                            target_concept_id: q.target_concept_id,
                            type: q.type,
                            text: q.text
                        }));
                    }
                }

                if (questionsForFrontend.length === 0) {
                    // Fallback if DB insert failed but AI generated them
                    questionsForFrontend = questionData.questions.map((q: any) => ({
                        id: q.id,
                        target_concept_id: conceptIdMap[q.target_concept_id] || q.target_concept_id,
                        type: q.type,
                        text: q.text
                    }));
                }

                // Step 5: DONE
                send({
                    progress: 100,
                    status: 'completed',
                    session: {
                        id: session.id,
                        title: session.title,
                        content: content,
                        concepts: insertedConcepts || conceptData.concepts,
                        questions: questionsForFrontend,
                        isBasicMode
                    }
                });
                controller.close();
            } catch (err: any) {
                console.error('SSE Error:', err);
                send({ error: err.message || 'Internal server error while processing stream.' });
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}
