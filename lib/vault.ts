import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/db_types_new';
import { MasteryHistoryEntry, MasteryState, ConceptSynthesis } from '../types/serify';
import { parseJSON, getGeminiModel } from './serify-ai';

type DbClient = SupabaseClient<Database>;

export function calculateMasteryState(history: MasteryHistoryEntry[]): MasteryState {
    if (history.length === 0) return 'revisit';

    const weights = history.map((_, index) => {
        const recencyWeight = Math.pow(1.5, index);
        return recencyWeight;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);

    const stateScores: Record<MasteryState, number> = { mastered: 0, solid: 0, developing: 0, shaky: 0, revisit: 0 };
    const stateValues: Record<MasteryState, number> = { mastered: 4, solid: 3, developing: 2, shaky: 1, revisit: 0 };

    history.forEach((entry, index) => {
        stateScores[entry.state] += weights[index];
    });

    let weightedScore = 0;
    Object.entries(stateScores).forEach(([state, score]) => {
        weightedScore += (score / totalWeight) * stateValues[state as MasteryState];
    });

    const lastEntry = history[history.length - 1];

    if (lastEntry.sourceType === 'session' && lastEntry.state === 'revisit') {
        return 'revisit';
    }

    let calcState: MasteryState = 'revisit';
    if (weightedScore >= 3.5) calcState = 'mastered';
    else if (weightedScore >= 2.5) calcState = 'solid';
    else if (weightedScore >= 1.5) calcState = 'developing';
    else if (weightedScore >= 0.75) calcState = 'shaky';
    else calcState = 'revisit';

    if (calcState === 'mastered' && history.filter((h) => h.state === 'mastered').length < 2) {
        return 'solid';
    }

    if (calcState === 'solid' && history.filter((h) => h.state === 'solid').length < 2) {
        return 'developing';
    }

    const lastThree = history.slice(-3);
    if (lastThree.length === 3 && lastThree.every((h) => h.state === 'mastered')) {
        return 'mastered';
    }
    if (lastThree.length === 3 && lastThree.every((h) => h.state === 'solid')) {
        return 'solid';
    }

    return calcState;
}

export async function findSimilarConcept(
    db: DbClient,
    userId: string,
    conceptName: string
): Promise<Database['public']['Tables']['knowledge_nodes']['Row'] | null> {
    const { data } = await db
        .from('knowledge_nodes')
        .select('*')
        .eq('user_id', userId)
        .ilike('canonical_name', `%${conceptName}%`)
        .limit(1)
        .single();

    return data;
}

export async function findOrCreateConceptNode(
    db: DbClient,
    userId: string,
    conceptName: string,
    sessionId: string,
    definition: string,
    parentConceptId?: string
): Promise<Database['public']['Tables']['knowledge_nodes']['Row'] | null> {
    try {
        const { data: exact, error: exactError } = await db
            .from('knowledge_nodes')
            .select('*')
            .eq('user_id', userId)
            .eq('canonical_name', conceptName.toLowerCase())
            .maybeSingle();

        if (exact) {
            // If it exists but lacks a parent and we have one, update it
            if (!exact.parent_concept_id && parentConceptId) {
                await db.from('knowledge_nodes')
                    .update({ parent_concept_id: parentConceptId, is_sub_concept: true })
                    .eq('id', exact.id);
            }
            return exact;
        }

        const similar = await findSimilarConcept(db, userId, conceptName);

        if (similar) {
            const updatedSessionIds = Array.from(new Set([...(similar.session_ids || []), sessionId]));
            const updatePayload: Partial<Database['public']['Tables']['knowledge_nodes']['Update']> = {
                display_name: conceptName,
                session_count: (similar.session_count || 0) + 1,
                session_ids: updatedSessionIds,
                last_seen_at: new Date().toISOString()
            };

            if (!similar.parent_concept_id && parentConceptId) {
                updatePayload.parent_concept_id = parentConceptId;
                updatePayload.is_sub_concept = true;
            }

            const { data: updated } = await db
                .from('knowledge_nodes')
                .update(updatePayload)
                .eq('id', similar.id)
                .select()
                .maybeSingle();
            if (updated) return updated;
        }

        const newNodeId = crypto.randomUUID();
        const { data: inserted, error } = await db
            .from('knowledge_nodes')
            .insert({
                id: newNodeId,
                user_id: userId,
                canonical_name: conceptName.toLowerCase(),
                display_name: conceptName,
                definition,
                current_mastery: 'revisit',
                mastery_history: [],
                session_count: 1,
                session_ids: [sessionId],
                first_seen_at: new Date().toISOString(),
                last_seen_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                parent_concept_id: parentConceptId || null,
                is_sub_concept: !!parentConceptId
            })
            .select()
            .maybeSingle();

        if (error) {
            console.error('Error creating concept node:', error);
            // If insert failed (maybe race condition), try one last fetch
            const { data: retryFetch } = await db
                .from('knowledge_nodes')
                .select('*')
                .eq('user_id', userId)
                .eq('canonical_name', conceptName.toLowerCase())
                .maybeSingle();
            return retryFetch;
        }
        return inserted!;
    } catch (err) {
        console.error('Critical error in findOrCreateConceptNode:', err);
        return null;
    }
}

export async function upsertCategory(db: DbClient, userId: string, categoryName: string): Promise<Database['public']['Tables']['vault_categories']['Row']> {
    const { data: existing } = await db
        .from('vault_categories')
        .select('*')
        .eq('user_id', userId)
        .eq('name', categoryName)
        .single();

    if (existing) return existing;

    const { data: inserted } = await db
        .from('vault_categories')
        .insert({
            id: crypto.randomUUID(),
            user_id: userId,
            name: categoryName
        })
        .select()
        .single();

    return inserted!;
}

export async function upsertParentConcept(db: DbClient, userId: string, categoryId: string, parentName: string, parentDefinition: string): Promise<Database['public']['Tables']['knowledge_nodes']['Row']> {
    const { data: existing } = await db
        .from('knowledge_nodes')
        .select('*')
        .eq('user_id', userId)
        .eq('is_sub_concept', false)
        .eq('canonical_name', parentName.toLowerCase())
        .single();

    if (existing) {
        if (existing.category_id !== categoryId) {
            await db.from('knowledge_nodes').update({ category_id: categoryId }).eq('id', existing.id);
        }
        return existing;
    }

    const { data: inserted } = await db
        .from('knowledge_nodes')
        .insert({
            id: crypto.randomUUID(),
            user_id: userId,
            canonical_name: parentName.toLowerCase(),
            display_name: parentName,
            definition: parentDefinition,
            category_id: categoryId,
            is_sub_concept: false,
            current_mastery: 'revisit',
            mastery_history: JSON.parse(JSON.stringify([])),
            session_count: 0,
            session_ids: [] as any,
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    return inserted!;
}

export async function updateVaultHierarchy(db: DbClient, userId: string) {
    // Get ALL sub-concepts that need organizing (we re-cluster unorganized ones, but provide context of existing structured ones)
    const { data: concepts } = await db
        .from('knowledge_nodes')
        .select('id, display_name, canonical_name, definition, category_id, parent_concept_id')
        .eq('user_id', userId)
        // Only target sub-concepts (or unclassified ones that should become sub-concepts)
        .neq('is_sub_concept', false);

    if (!concepts || concepts.length < 2) return;

    // We focus on assigning unclassified concepts. For now, let's just pick those that lack a parent_concept_id.
    const unclassified = concepts.filter((c) => !c.parent_concept_id);
    if (unclassified.length === 0) {
        console.log(`[vault] Hierarchy is up to date.`);
        return;
    }

    try {
        const { data: existingCategories } = await db.from('vault_categories').select('name').eq('user_id', userId);
        const { data: existingParents } = await db.from('knowledge_nodes').select('display_name').eq('user_id', userId).eq('is_sub_concept', false);

        const catList = (existingCategories || []).map((c: { name: string }) => c.name).join(', ');
        const parentList = (existingParents || []).map(p => p.display_name).join(', ');

        const prompt = `
            Your goal is to organize granular concepts into a 2-level hierarchy: 
            Category -> General Parent Concept -> [List of Granular Concept IDs]

            Existing Categories: [${catList || 'None yet'}]
            Existing General Concepts: [${parentList || 'None yet'}]

            INSTRUCTIONS:
            1. Group the provided concepts into General Parent Concepts (e.g., "Transformer Architecture"). Sub-concepts should be specific details.
            2. Assign each General Parent Concept to a broad Category (e.g., "Machine Learning", "Mathematics"). 
            3. Use predefined broad categories if possible: Science & Mathematics, Technology & Engineering, Humanities & Arts, Business & Economics, Health & Medicine, Social Sciences, Languages & Communication, Practical & Life Skills. If a concept doesn't fit, put it in "Other".
            4. If a concept belongs to an existing General Concept or Category from the lists above, reuse the exact name.
            5. Return a JSON array.

            JSON Format:
            [
              {
                "categoryName": "Machine Learning",
                "parentConcepts": [
                  {
                    "parentName": "Transformer Architecture",
                    "parentDefinition": "A neural network architecture based on self-attention mechanisms.",
                    "subConceptIds": ["id1", "id2"]
                  }
                ]
              }
            ]

            CONCEPTS TO GROUP:
            ${unclassified.map((c) => `- ${c.display_name} (ID: ${c.id}): ${c.definition}`).join('\n')}
        `;

        const model = getGeminiModel('free');
        const result = await model.generateContent(prompt);
        const hierarchy = parseJSON<any>(result.response.text()) as {
            categoryName: string;
            parentConcepts: {
                parentName: string;
                parentDefinition: string;
                subConceptIds: string[];
            }[];
        }[];

        for (const cat of hierarchy) {
            const categoryObj = await upsertCategory(db, userId, cat.categoryName);
            for (const parent of cat.parentConcepts) {
                const parentObj = await upsertParentConcept(db, userId, categoryObj.id, parent.parentName, parent.parentDefinition);

                // Update children
                if (parent.subConceptIds && parent.subConceptIds.length > 0) {
                    await db.from('knowledge_nodes')
                        .update({
                            category_id: categoryObj.id,
                            parent_concept_id: parentObj.id,
                            is_sub_concept: true
                        })
                        .in('id', parent.subConceptIds);
                }
            }
        }
    } catch (err) {
        console.error('Failed to update vault hierarchy', err);
    }
}

export async function getSessionsForConcept(
    db: DbClient,
    userId: string,
    conceptId: string
): Promise<any[]> {
    const { data: node } = await db
        .from('knowledge_nodes')
        .select('*')
        .eq('id', conceptId)
        .single();

    if (!node || !node.session_ids || node.session_ids.length === 0) return [];

    const { data: sessions } = await db
        .from('reflection_sessions')
        .select('*')
        .in('id', node.session_ids)
        .order('created_at', { ascending: false });

    // Format them logically
    const formattedSessions = [];
    if (sessions) {
        for (const session of sessions) {
            // For synthesis, we pull the specific user answer and assessment for this concept.
            // This can be expanded based on the table structure (e.g., querying user_answers)
            // I'm putting placeholders for those details since they require deeper querying
            formattedSessions.push({
                date: session.created_at,
                userAnswer: 'See answer in session',
                masteryState: 'See mastery in session',
                feedbackNote: 'See feedback in session',
                hintRequested: 0,
                skipped: 0
            });
        }
    }
    return formattedSessions;
}

export async function generateConceptSynthesis(
    db: DbClient,
    userId: string,
    conceptId: string
): Promise<ConceptSynthesis | null> {
    const { data: node } = await db
        .from('knowledge_nodes')
        .select('*')
        .eq('id', conceptId)
        .single();

    if (!node) return null;

    const sessions = await getSessionsForConcept(db, userId, conceptId);

    if (sessions.length < 2) {
        // Not enough data for synthesis yet
        return null;
    }

    try {
        const prompt = `
        Synthesize student understanding for concept: ${node.display_name}
        Definition: ${node.definition}

        Session history:
        ${sessions.map((s) => `Date: ${s.date}, Answer: "${s.userAnswer}", Assessment: ${s.masteryState}, Feedback: "${s.feedbackNote}"`).join('\n---\n')}

        Return JSON:
        {
          "summary": "2-3 sentences in second person ('You have...')",
          "persistentGap": "one sentence or null",
          "improvement": "one sentence or null"
        }
      `;

        const model = getGeminiModel('free');
        const result = await model.generateContent(prompt);
        const synthesisResult = parseJSON<any>(result.response.text());

        const synthesis: ConceptSynthesis = {
            ...synthesisResult,
            generatedAt: new Date().toISOString(),
            sessionCount: sessions.length
        };

        await db
            .from('knowledge_nodes')
            .update({
                synthesis: JSON.parse(JSON.stringify(synthesis)),
                synthesis_generated_at: new Date().toISOString()
            })
            .eq('id', conceptId);

        return synthesis;
    } catch (err) {
        console.error('error generating synthesis', err);
        return null;
    }
}

export async function updateConceptMastery(
    db: DbClient,
    userId: string,
    conceptId: string,
    newState: MasteryState,
    sourceType: MasteryHistoryEntry['sourceType'],
    sourceId: string
) {
    const { data: node } = await db
        .from('knowledge_nodes')
        .select('*')
        .eq('id', conceptId)
        .single();

    if (!node) return;

    const newEntry: MasteryHistoryEntry = {
        date: new Date().toISOString(),
        state: newState,
        sourceType,
        sourceId
    };

    const updatedHistory = [...((node.mastery_history as any) || []), newEntry];
    const calculatedMastery = calculateMasteryState(updatedHistory);

    await db
        .from('knowledge_nodes')
        .update({
            mastery_history: JSON.parse(JSON.stringify(updatedHistory)),
            current_mastery: calculatedMastery,
            updated_at: new Date().toISOString()
        })
        .eq('id', conceptId)
        .eq('user_id', userId);

    if (node.synthesis_generated_at) {
        await db
            .from('knowledge_nodes')
            .update({ synthesis_generated_at: null })
            .eq('id', conceptId);
    }
}
