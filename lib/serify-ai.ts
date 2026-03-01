import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    AssessmentQuestion,
    CognitiveAnalysis,
    Concept,
    ContentSource,
    Curriculum,
    ReflectionSession
} from '../types/serify';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
    }
});

export function parseJSON<T>(text: string): T {
    // Try to extract JSON between markdown code blocks if they exist
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const toParse = jsonMatch ? jsonMatch[1] : text;

    const cleaned = toParse.replace(/^\s+/, '').replace(/\s+$/, '').trim();

    try {
        return JSON.parse(cleaned);
    } catch (err) {
        console.error('Failed to parse JSON from AI response:', text);
        throw err;
    }
}

export async function extractConcepts(content: ContentSource): Promise<Concept[]> {
    const contentDescription =
        content.type === 'text'
            ? `Here are the user's notes:\n\n${content.content}`
            : `The user submitted a ${content.type} from this URL: ${content.url ?? content.content}\n\nBased on the URL and title "${content.title}", infer the likely topic and extract concepts as if you had watched/read the content.`;

    const prompt = `You are an expert knowledge analyst.
${contentDescription}

Extract 4 to 6 key concepts. Return a JSON array.

Format:
[
  {
    "id": "c1",
    "name": "Concept Name",
    "description": "One or two sentence explanation.",
    "importance": "high" | "medium" | "low",
    "relatedConcepts": ["c2"]
  }
]

Rules:
- Use concept IDs c1, c2, c3, etc.
- Importance: high if significant time spent.
- relatedConcepts: IDs of connected concepts.`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 800 }
    });
    const text = result.response.text();

    const concepts = parseJSON<Concept[]>(text);
    return concepts;
}

export async function generateAssessment(
    concepts: Concept[],
    preferences?: { tone?: string; questionCount?: number }
): Promise<AssessmentQuestion[]> {
    const tone = preferences?.tone ?? 'supportive';
    const count = preferences?.questionCount ?? 6;
    const conceptList = concepts.map((c) => `- ${c.name}: ${c.description}`).join('\n');

    const toneInstruction =
        tone === 'challenging'
            ? 'Use a Socratic style — push back on common assumptions and ask questions that reveal hidden misconceptions.'
            : tone === 'direct'
              ? 'Be concise and direct. No fluff.'
              : 'Be encouraging and thoughtful. Frame questions as invitations to reflect.';

    const prompt = `You are a learning coach. Generate ${count} open-ended diagnostic questions for these concepts:
${conceptList}

Tone: ${toneInstruction}

JSON Format:
[
  {
    "id": "q1",
    "type": "retrieval" | "application" | "misconception",
    "text": "Question text",
    "relatedConcepts": ["c1"]
  }
]

Rules:
- Retrieval: recall/explain. Application: scenario. Misconception: fix wrong framing.
- One clear sentence per question.
- Answers should require a few sentences.`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1200 }
    });
    const text = result.response.text();

    const questions = parseJSON<AssessmentQuestion[]>(text);
    return questions;
}

export async function analyzeAnswers(
    session: ReflectionSession
): Promise<{ analysis: CognitiveAnalysis; depthScore: number }> {
    const conceptMap = Object.fromEntries(session.extractedConcepts.map((c) => [c.id, c.name]));
    const qAndA = session.assessmentQuestions
        .map((q) => {
            const answer =
                session.userAnswers.find((a) => a.questionId === q.id)?.answer ?? '(no answer)';
            return `Q (${q.type}): ${q.text}\nA: ${answer}`;
        })
        .join('\n\n');

    const prompt = `Analyze this reflection session.
Topic: ${session.contentSource.title}
Concepts:
${session.extractedConcepts.map((c) => `- ${c.id} = ${c.name}: ${c.description}`).join('\n')}

Answers:
${qAndA}

Return JSON:
{
  "depthScore": number,
  "strengthMap": { "strong": string[], "weak": string[], "missing": string[] },
  "insights": [{ "type": "strength" | "weakness" | "misconception" | "gap", "message": "string", "relatedConcepts": string[] }],
  "focusSuggestions": ["action string"]
}

Rules:
- Score: 85+ (excellent), 70-84 (good), 50-69 (surface), <50 (gaps).
- 3-5 insights, 2-4 focusSuggestions (start with verb).
- Constructive tone.`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1500 }
    });
    const text = result.response.text();

    const parsed = parseJSON<{ depthScore: number } & CognitiveAnalysis>(text);
    const { depthScore, ...analysis } = parsed;

    return { analysis, depthScore };
}

export async function generateCurriculum(
    userInput: string,
    inputType: 'concept' | 'topic' | 'goal' | 'question',
    vaultContext: {
        strongConcepts: { name: string }[];
        shakyConcepts: { name: string }[];
        revisitConcepts: { name: string }[];
    },
    userProfile?: { userType?: string; learningContext?: string }
): Promise<
    Omit<
        Curriculum,
        | 'id'
        | 'user_id'
        | 'created_at'
        | 'status'
        | 'started_at'
        | 'last_activity_at'
        | 'completed_at'
        | 'total_sparks_spent'
    >
> {
    const { strongConcepts, shakyConcepts, revisitConcepts } = vaultContext;
    const { userType, learningContext } = userProfile || {};

    const prompt = `
You are Serify's curriculum architect. A user wants to learn something.
Your job is to build a complete, ordered curriculum that will take them
from their current understanding to genuine mastery of their goal.

USER INPUT: "${userInput}"
INPUT TYPE: "${inputType}" 

USER'S CURRENT KNOWLEDGE (from Concept Vault):
Strong concepts: ${strongConcepts.map((c) => c.name).join(', ') || 'none yet'}
Shaky concepts: ${shakyConcepts.map((c) => c.name).join(', ') || 'none'}
Revisit concepts: ${revisitConcepts.map((c) => c.name).join(', ') || 'none'}
User type: ${userType || 'not specified'}
Learning context: ${learningContext || 'not specified'}

Generate a complete curriculum as JSON:
{
  "title": string,
  "target_description": string,
  "outcomes": string[],
  "units": [
    {
      "unitNumber": number,
      "unitTitle": string,
      "unitSummary": string,
      "concepts": [
        {
          "id": string,
          "name": string,
          "definition": string,
          "difficulty": "simple" | "moderate" | "complex",
          "estimatedMinutes": number,
          "isPrerequisite": boolean,
          "prerequisiteFor": string[],
          "alreadyInVault": boolean,
          "vaultMasteryState": string | null,
          "whyIncluded": string,
          "misconceptionRisk": "low" | "medium" | "high",
          "orderIndex": number
        }
      ]
    }
  ],
  "recommended_start_index": number,
  "scope_note": string | null
}

CURRICULUM DESIGN RULES:
- Order concepts from foundational to advanced — never introduce a concept
  before its prerequisites
- For a single concept input: include the concept + 2-4 prerequisites if needed
  + 1-2 natural extensions. Total: 3-7 concepts. One unit, no grouping needed.
- For a broad topic: break into 3-5 units of 3-5 concepts each. Total: 10-20 concepts.
- For a goal: include exactly the concepts needed to achieve that goal.
  No extras. No tangents. Be surgical.
- For a question: treat the answer as the goal. Build the minimum curriculum
  that gives the user the conceptual foundation to genuinely understand the answer.
- Never include a concept the user already has Solid mastery on UNLESS it's a
  direct prerequisite that needs reinforcement before continuing.
- estimatedMinutes should reflect Flow Mode pacing: simple concepts 5-8 min,
  moderate 8-15 min, complex 12-20 min.
- misconceptionRisk should be high for concepts that are commonly misunderstood
  or that build on misconception-prone prerequisites.
- For 'id' inside concepts, generate a stable unique string (like a clean slug or uuid).

SCOPING RULES:
- Input "derivatives" → 5-7 concepts (concept + prerequisites + extensions)
- Input "calculus" → 12-18 concepts (full foundations curriculum)
- Input "understand how neural networks learn" → 8-12 concepts (targeted)
- Input "why does compounding interest matter?" → 4-6 concepts (minimum to answer)
- If the scope would exceed 20 concepts, split into Part 1 and Part 2 and
  note this in scope_note. Never generate more than 20 concepts in one curriculum.

Return only valid JSON. No preamble.
`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8192, responseMimeType: 'application/json' } // curricula can be long, so allowing more tokens
    });

    const text = result.response.text();
    const curriculumData = parseJSON<any>(text);

    // Calculate conceptual metrics
    let totalConcepts = 0;
    let totalMinutes = 0;

    if (curriculumData.units) {
        for (const unit of curriculumData.units) {
            if (unit.concepts) {
                totalConcepts += unit.concepts.length;
                for (const concept of unit.concepts) {
                    totalMinutes += concept.estimatedMinutes || 10;
                }
            }
        }
    }

    return {
        title: curriculumData.title,
        user_input: userInput,
        input_type: inputType,
        target_description: curriculumData.target_description,
        outcomes: curriculumData.outcomes || [],
        scope_note: curriculumData.scope_note || null,
        units: curriculumData.units || [],
        concept_count: totalConcepts,
        estimated_minutes: totalMinutes,
        original_units: JSON.parse(JSON.stringify(curriculumData.units || [])), // deep copy
        edit_count: 0,
        recommended_start_index: curriculumData.recommended_start_index || 0,
        current_concept_index: curriculumData.recommended_start_index || 0,
        completed_concept_ids: [],
        skipped_concept_ids: []
    };
}
