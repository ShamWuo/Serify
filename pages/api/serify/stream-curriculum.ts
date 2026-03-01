import { streamObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { authenticateApiRequest, hasEnoughSparks, SPARK_COSTS } from '@/lib/sparks';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    try {
        const { userInput, inputType } = await req.json();

        if (!userInput || !inputType) {
            return new Response(JSON.stringify({ message: 'Missing inputs' }), { status: 400 });
        }

        const authHeader = req.headers.get('authorization');
        const isDemoHeader = req.headers.get('x-serify-demo') === 'true';
        let user: string | null = null;

        if (!authHeader) {
            user = isDemoHeader ? 'd3300000-0000-0000-0000-000000000000' : null;
        } else {
            const token = authHeader.replace('Bearer ', '');
            if (token === 'demo-token' || isDemoHeader) {
                user = 'd3300000-0000-0000-0000-000000000000';
            } else {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
                const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
                const authClient = createClient(supabaseUrl, supabaseAnonKey, {
                    global: { headers: { Authorization: `Bearer ${token}` } }
                });
                const { data: { user: supabaseUser } } = await authClient.auth.getUser();
                user = supabaseUser?.id || null;
            }
        }

        if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

        const sparkCost = SPARK_COSTS.CURRICULUM_GENERATION || 2;
        const hasSparks = await hasEnoughSparks(user, sparkCost);
        if (!hasSparks) {
            return new Response(
                JSON.stringify({
                    error: 'out_of_sparks',
                    message: `You need ${sparkCost} Sparks.`
                }),
                { status: 403 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const token = req.headers.get('authorization')?.replace('Bearer ', '');

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: knowledgeNodes } = await supabase
            .from('knowledge_nodes')
            .select('canonical_name, current_mastery')
            .eq('user_id', user);

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
            .eq('id', user)
            .single();

        const userType = profile?.preferences?.userType || 'not specified';
        const learningContext = profile?.preferences?.learningContext || 'not specified';

        const prompt = `
You are Serify's curriculum architect. A user wants to learn something.
Your job is to build a complete, ordered curriculum that will take them
from their current understanding to genuine mastery of their goal.

USER INPUT: "${userInput}"
INPUT TYPE: "${inputType}" 

USER'S CURRENT KNOWLEDGE (from Concept Vault):
Strong concepts: ${vaultContext.strongConcepts.map((c) => c.name).join(', ') || 'none yet'}
Shaky concepts: ${vaultContext.shakyConcepts.map((c) => c.name).join(', ') || 'none'}
Revisit concepts: ${vaultContext.revisitConcepts.map((c) => c.name).join(', ') || 'none'}
User type: ${userType}
Learning context: ${learningContext}

CURRICULUM DESIGN RULES:
- Order concepts from foundational to advanced — never introduce a concept before its prerequisites
- For a single concept input: include the concept + 2-4 prerequisites if needed + 1-2 natural extensions. Total: 3-7 concepts. One unit, no grouping needed.
- For a broad topic: break into 3-5 units of 3-5 concepts each. Total: 10-20 concepts.
- For a goal: include exactly the concepts needed to achieve that goal. No extras.
- For a question: treat the answer as the goal. Build the minimum curriculum that gives the user the conceptual foundation to genuinely understand the answer.
- Never include a concept the user already has Solid mastery on UNLESS it's a direct prerequisite that needs reinforcement before continuing.
- estimatedMinutes should reflect Flow Mode pacing: simple concepts 5-8 min, moderate 8-15 min, complex 12-20 min.
- misconceptionRisk should be high for concepts that are commonly misunderstood.
- For 'id' inside concepts, generate a stable unique string (like a clean slug).
`;

        const result = await streamObject({
            model: google('gemini-2.5-flash'),
            temperature: 0.1,
            // @ts-ignore
            maxTokens: 8192,
            prompt,
            schema: z.object({
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
            })
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error('Curriculum stream error:', error);
        return new Response('Failed to stream curriculum', { status: 500 });
    }
}
