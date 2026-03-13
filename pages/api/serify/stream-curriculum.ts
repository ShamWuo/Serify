import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { checkUsage, incrementUsage } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const curriculumSchema = z.object({
    title: z.string(),
    target_description: z.string(),
    outcomes: z.array(z.string()),
    units: z.array(
        z.object({
            unitNumber: z.number(),
            unitTitle: z.string(),
            unitSummary: z.string(),
            concepts: z.array(
                z.object({
                    id: z.string(),
                    name: z.string(),
                    definition: z.string(),
                    difficulty: z.enum(['simple', 'moderate', 'complex']),
                    estimatedMinutes: z.number(),
                    isPrerequisite: z.boolean(),
                    prerequisiteFor: z.array(z.string()),
                    alreadyInVault: z.boolean(),
                    vaultMasteryState: z.string().nullable(),
                    whyIncluded: z.string(),
                    misconceptionRisk: z.enum(['low', 'medium', 'high']),
                    orderIndex: z.number()
                })
            )
        })
    ),
    recommended_start_index: z.number(),
    scope_note: z.string().nullable()
});

type Curriculum = z.infer<typeof curriculumSchema>;

export default async function handler(req: Request) {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    try {
        const { userInput, inputType, priorKnowledge, skipTopics, focusGoal } = await req.json();

        if (!userInput || !inputType) {
            return new Response(JSON.stringify({ message: 'Missing inputs' }), { status: 400 });
        }

        const userId = await authenticateApiRequest(req);
        if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

        const token = req.headers.get('authorization')?.split(' ').pop();

        const hasUsage = (await checkUsage(userId, 'curricula')).allowed;
        if (!hasUsage) {
            return new Response(
                JSON.stringify({
                    error: 'limit_reached',
                    message: 'You have reached your feature limit.'
                }),
                { status: 403 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: knowledgeNodes } = await supabase
            .from('knowledge_nodes')
            .select('canonical_name, current_mastery')
            .eq('user_id', userId);

        const vaultContext = {
            strongConcepts: [] as { name: string }[],
            shakyConcepts: [] as { name: string }[],
            revisitConcepts: [] as { name: string }[]
        };

        if (knowledgeNodes) {
            knowledgeNodes.forEach((n) => {
                const mastery = (n.current_mastery || '').toLowerCase();
                if (mastery.includes('strong') || mastery === 'solid') {
                    vaultContext.strongConcepts.push({ name: n.canonical_name });
                } else if (mastery.includes('shallow') || mastery === 'shaky') {
                    vaultContext.shakyConcepts.push({ name: n.canonical_name });
                } else if (mastery === 'revisit') {
                    vaultContext.revisitConcepts.push({ name: n.canonical_name });
                }
            });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('id', userId)
            .single();

        const userType = (profile?.preferences as any)?.userType || 'not specified';
        const learningContext = (profile?.preferences as any)?.learningContext || 'not specified';

        const priorKnowledgeBlock = priorKnowledge
            ? `\nUSER SELF-REPORTED PRIOR KNOWLEDGE: "${priorKnowledge}"\n- Do NOT include concepts the user says they already know well, unless they are direct prerequisites for what comes next.\n- Start from where the user is, not from the very beginning.`
            : '';
        const skipBlock = skipTopics
            ? `\nSKIP THESE TOPICS: "${skipTopics}"\n- Exclude these from the curriculum entirely.`
            : '';
        const focusBlock = focusGoal
            ? `\nFOCUS GOAL: "${focusGoal}"\n- The curriculum should converge toward this specific outcome above all else.`
            : '';

        const prompt = `You are Serify's curriculum architect. Your response must be ONLY a single JSON object: no markdown, no code block, no extra text. The "units" array is required and must contain at least one unit; each unit must have a non-empty "concepts" array. Never output an empty "units" array.

USER INPUT: "${userInput}"
INPUT TYPE: "${inputType}"

USER'S CURRENT KNOWLEDGE (from Concept Vault):
Strong: ${vaultContext.strongConcepts.map((c) => c.name).join(', ') || 'none'}
Shaky: ${vaultContext.shakyConcepts.map((c) => c.name).join(', ') || 'none'}
Revisit: ${vaultContext.revisitConcepts.map((c) => c.name).join(', ') || 'none'}
User type: ${userType}
Learning context: ${learningContext}
${priorKnowledgeBlock}${skipBlock}${focusBlock}

RULES:
- Output exactly one JSON object. First character must be { and last character must be }.
- Required keys: "title", "target_description", "outcomes" (array of strings), "units" (array with at least one unit), "recommended_start_index" (number), "scope_note" (string or null).
- Each unit: "unitNumber", "unitTitle", "unitSummary", "concepts" (array with at least one concept).
- Each concept: "id", "name", "definition", "difficulty" ("simple"|"moderate"|"complex"), "estimatedMinutes" (number), "isPrerequisite", "prerequisiteFor" (array), "alreadyInVault", "vaultMasteryState" (null or string), "whyIncluded", "misconceptionRisk" ("low"|"medium"|"high"), "orderIndex" (number).
- Order concepts from foundational to advanced. For narrow topics use one unit (3-7 concepts); for broad topics use 3-5 units. Use a short slug for concept ids like "related-rates" or "derivatives-intro".
- CRITICAL: Respect the user's prior knowledge. If they say they know something, skip it or mention it only as a brief reference.

Output the JSON object now:`;

        function makeFallbackCurriculum(partial?: Partial<Curriculum>): Curriculum {
            const title =
                partial?.title?.trim() || String(userInput).slice(0, 50) || 'Learning topic';
            return {
                title: partial?.title || title,
                target_description: partial?.target_description || `Introduction to ${title}`,
                outcomes: partial?.outcomes?.length ? partial.outcomes : [`Understand ${title}`],
                units: [
                    {
                        unitNumber: 1,
                        unitTitle: title,
                        unitSummary: `Foundational concepts for ${title}.`,
                        concepts: [
                            {
                                id: crypto.randomUUID(),
                                name: title,
                                definition: `Core concept: ${title}.`,

                                difficulty: 'simple',
                                estimatedMinutes: 5,
                                isPrerequisite: false,
                                prerequisiteFor: [],
                                alreadyInVault: false,
                                vaultMasteryState: null,
                                whyIncluded: 'Starting point for the curriculum.',
                                misconceptionRisk: 'low',
                                orderIndex: 0
                            }
                        ]
                    }
                ],
                recommended_start_index: 0,
                scope_note: partial?.scope_note ?? null
            };
        }

        let object: Curriculum;
        try {
            let result = await generateObject({
                model: google('gemini-2.5-flash'),
                temperature: 0,
                maxOutputTokens: 8192,
                prompt,
                schema: curriculumSchema
            });
            object = result.object as Curriculum;

            if (!object.units?.length) {
                result = await generateObject({
                    model: google('gemini-2.5-flash'),
                    temperature: 0.3,
                    maxOutputTokens: 8192,
                    prompt:
                        prompt +
                        '\n\nIMPORTANT: Output at least one unit in "units", each with at least one concept in "concepts". Never empty units array.',
                    schema: curriculumSchema
                });
                object = result.object as Curriculum;
            }

            if (!object.units?.length) {
                object = makeFallbackCurriculum(object);
            }
        } catch (genError: unknown) {
            console.error('Curriculum generation error:', genError);
            object = makeFallbackCurriculum();
        }

        // Map all AI-generated string IDs to valid UUIDs before returning
        const idMap = new Map<string, string>();
        object.units.forEach((unit: any) => {
            unit.concepts.forEach((concept: any) => {
                const newId = crypto.randomUUID();
                idMap.set(concept.id, newId);
                concept.id = newId;
            });
        });
        object.units.forEach((unit: any) => {
            unit.concepts.forEach((concept: any) => {
                if (concept.prerequisiteFor && Array.isArray(concept.prerequisiteFor)) {
                    concept.prerequisiteFor = concept.prerequisiteFor.map((oldId: string) => idMap.get(oldId) || oldId);
                }
            });
        });

        const body = JSON.stringify(object);
        return new Response(body, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    } catch (error: unknown) {
        console.error('Curriculum API error:', error);
        const message = error instanceof Error ? error.message : 'Failed to generate curriculum';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
