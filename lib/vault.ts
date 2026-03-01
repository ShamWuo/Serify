import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/db_types_new';
import { MasteryHistoryEntry, MasteryState, ConceptSynthesis } from '../types/serify';
import { parseJSON } from './serify-ai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function callFlashAI(prompt: string, jsonMode: boolean = true): Promise<string> {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: jsonMode
            ? {
                  responseMimeType: 'application/json',
                  maxOutputTokens: 1000,
                  temperature: 0.1
              }
            : { temperature: 0.1 }
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
}

async function callProAI(prompt: string, jsonMode: boolean = true): Promise<string> {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: jsonMode
            ? {
                  responseMimeType: 'application/json',
                  maxOutputTokens: 1000,
                  temperature: 0.1
              }
            : { temperature: 0.1 }
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
}

type DbClient = SupabaseClient<Database>;

export function calculateMasteryState(history: MasteryHistoryEntry[]): MasteryState {
    if (history.length === 0) return 'revisit';

    const weights = history.map((_, index) => {
        const recencyWeight = Math.pow(1.5, index);
        return recencyWeight;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);

    const stateScores = { solid: 0, developing: 0, shaky: 0, revisit: 0 };
    const stateValues = { solid: 3, developing: 2, shaky: 1, revisit: 0 };

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
    if (weightedScore >= 2.5) calcState = 'solid';
    else if (weightedScore >= 1.5) calcState = 'developing';
    else if (weightedScore >= 0.75) calcState = 'shaky';
    else calcState = 'revisit';

    if (calcState === 'solid' && history.filter((h) => h.state === 'solid').length < 2) {
        return 'developing';
    }

    const lastThree = history.slice(-3);
    if (lastThree.length === 3 && lastThree.every((h) => h.state === 'solid')) {
        return 'solid';
    }

    return calcState;
}

export async function findSimilarConcept(
    db: DbClient,
    userId: string,
    conceptName: string
): Promise<any | null> {
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
    definition: string
): Promise<any> {
    const { data: exact } = await db
        .from('knowledge_nodes')
        .select('*')
        .eq('user_id', userId)
        .eq('canonical_name', conceptName.toLowerCase())
        .single();

    if (exact) return exact;

    const similar = await findSimilarConcept(db, userId, conceptName);

    if (similar) {
        const updatedSessionIds = [...(similar.session_ids || []), sessionId];
        const { data: updated } = await db
            .from('knowledge_nodes')
            .update({
                display_name: conceptName,
                session_count: (similar.session_count || 0) + 1,
                session_ids: updatedSessionIds,
                last_seen_at: new Date().toISOString()
            })
            .eq('id', similar.id)
            .select()
            .single();
        if (updated) return updated;
    }

    const { data: inserted, error } = await db
        .from('knowledge_nodes')
        .insert({
            id: crypto.randomUUID(),
            user_id: userId,
            canonical_name: conceptName.toLowerCase(),
            display_name: conceptName,
            definition,
            current_mastery: 'revisit',
            mastery_history: JSON.parse(JSON.stringify([])),
            session_count: 1,
            session_ids: [sessionId] as any,
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) console.error('Error creating concept node:', error);
    return inserted;
}

export async function upsertTopic(db: DbClient, userId: string, topicName: string): Promise<any> {
    const { data: existing } = await db
        .from('concept_topics')
        .select('*')
        .eq('user_id', userId)
        .eq('name', topicName)
        .single();

    if (existing) return existing;

    const { data: inserted } = await db
        .from('concept_topics')
        .insert({
            id: crypto.randomUUID(),
            user_id: userId,
            name: topicName,
            concept_count: 0
        })
        .select()
        .single();

    return inserted;
}

export async function refreshTopicCounts(db: DbClient, userId: string) {
    const { data: topics } = await db.from('concept_topics').select('id').eq('user_id', userId);

    if (!topics) return;

    for (const topic of topics) {
        const { count, data } = await db
            .from('knowledge_nodes')
            .select('current_mastery', { count: 'exact' })
            .eq('topic_id', topic.id);

        let dominant_mastery = null;
        if (data && data.length > 0) {
            const counts: Record<string, number> = {
                solid: 0,
                developing: 0,
                shaky: 0,
                revisit: 0
            };
            data.forEach((d) => counts[d.current_mastery]++);
            dominant_mastery = Object.keys(counts).reduce((a, b) =>
                counts[a] > counts[b] ? a : b
            );
        }

        await db
            .from('concept_topics')
            .update({
                concept_count: count || 0,
                dominant_mastery,
                last_updated_at: new Date().toISOString()
            })
            .eq('id', topic.id);
    }
}

export async function updateTopicClusters(db: DbClient, userId: string) {
    const { data: concepts } = await db
        .from('knowledge_nodes')
        .select('id, canonical_name, definition, topic_id')
        .eq('user_id', userId);

    if (!concepts || concepts.length < 3) return;

    const unclassified = concepts.filter((c) => !c.topic_id);
    if (unclassified.length < 1) {
        console.log(`[vault] Skipping clustering: no unclassified concepts`);
        return;
    }

    try {
        const prompt = `
            Group these concepts into logical topics.
            JSON Format: [{ "topicName": "Topic Name", "conceptIds": ["id1", "id2"] }]

            Concepts:
            ${concepts.map((c) => `- ${c.canonical_name}: ${c.definition}`).join('\n')}
        `;

        const responseString = await callFlashAI(prompt);
        // Clean markdown block matching standard lib/serify-ai format
        const cleanJsonString = responseString
            .replace(/^```json\s*/m, '')
            .replace(/```$/m, '')
            .trim();
        const clusters = JSON.parse(cleanJsonString) as {
            topicName: string;
            conceptIds: string[];
        }[];

        // Upsert topics and assign concepts
        for (const cluster of clusters) {
            const topic = await upsertTopic(db, userId, cluster.topicName);

            await db
                .from('knowledge_nodes')
                .update({
                    topic_id: topic.id,
                    topic_name: topic.name
                })
                .in('id', cluster.conceptIds);
        }

        // Update concept counts per topic
        await refreshTopicCounts(db, userId);
    } catch (err) {
        console.error('Failed to update topic clusters', err);
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

        // Switch to Flash for cost savings
        const responseString = await callFlashAI(prompt);
        const cleanJsonString = responseString
            .replace(/^```json\s*/m, '')
            .replace(/```$/m, '')
            .trim();
        const synthesisResult = JSON.parse(cleanJsonString);

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
