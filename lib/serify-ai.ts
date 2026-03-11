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

export function getGeminiModel(plan: string = 'free', systemInstruction?: string) {
  let modelName = 'gemini-2.5-flash';
  
  if (plan === 'pro') {
    modelName = 'gemini-2.5-pro';
  } else if (plan === 'proplus') {
    modelName = 'gemini-2.5-pro'; // Or gemini-1.5-pro-latest if preferred for Pro+
  }

  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      temperature: plan === 'free' ? 0.1 : 0.3,
      responseMimeType: 'application/json'
    }
  });
}

const defaultModel = getGeminiModel('free');

export function parseJSON<T>(text: string): T {
  // Try to extract JSON between markdown code blocks if they exist
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const toParse = jsonMatch ? jsonMatch[1] : text;

  const cleaned = toParse.replace(/^\s+/, '').replace(/\s+$/, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse JSON from AI response:', text);
    // If it's a common "AI added a comment" error, try one last aggressive strip
    try {
      const aggressive = cleaned.substring(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1);
      return JSON.parse(aggressive);
    } catch (innerErr) {
      throw err;
    }
  }
}

export async function extractConcepts(content: ContentSource, plan: string = 'free', transcript?: string, vaultContext?: string): Promise<Concept[]> {
  const contextInstruction = vaultContext 
    ? `EXISTING KNOWLEDGE STRUCTURE:
The user already has the following broad categories (Pillars) and sub-concepts in their vault:
${vaultContext}

REUSE EXISTING CATEGORIES: If the new material fits into any of the existing Pillars above, you MUST reuse them by name exactly. Only create a NEW Pillar if the content covers a thematic domain that is fundamentally different from what is already in the vault.`
    : `The user's knowledge vault is currently empty. Create a fresh, logical structure of themes.`;

  const contentDescription =
    content.type === 'text'
      ? `Here are the user's notes:\n\n${content.content}`
      : transcript
        ? `The user submitted a ${content.type} (${content.title}).\n\nTRANSCRIPT/CONTENT:\n${transcript}`
        : `The user submitted a ${content.type} from this URL: ${content.url ?? content.content}\n\nBased on the URL and title "${content.title}", infer the likely topic and extract concepts as if you had watched/read the content.`;

  const prompt = `You are an expert knowledge analyst.
${contentDescription}

${contextInstruction}

Your task is to extract 3 to 5 broad "Mastery Pillars" (Broad Categories) that represent the major themes or domains of this material. 
For each pillar, identify 2 to 4 specific sub-categories (sub-concepts) that fall under it.

Refinement Rules:
- A Mastery Pillar must be a broad, high-level theme (e.g., "Calculus Fundamentals", "Derivatives", "Quantum Mechanics").
- Sub-concepts must be specific, actionable components of that pillar (e.g., "Related Rates", "Implicit Differentiation", "Wave-Particle Duality").
- If the content is very narrow, you might only extract 1-2 pillars, but ensure they are correctly categorized.
- REUSE existing Pillar names from the provided context whenever possible.

Return a JSON array of Mastery Pillars.

Format:
[
  {
    "id": "pillar-1", 
    "name": "Pillar Name",
    "description": "A broad, comprehensive definition of this knowledge pillar (1-2 sentences).",
    "importance": "high" | "medium" | "low",
    "relatedConcepts": ["pillar-2"],
    "subConcepts": [
      {
        "name": "Sub-concept name",
        "description": "A concise explanation of how this fits into the pillar."
      }
    ]
  }
]

Rules:
- "id": Use short semantic strings like "pillar-1", "pillar-2".
- "description": Provide a high-quality definition.
- "importance": "high" for the most central pillars.
- "relatedConcepts": valid IDs of other extracted pillars that this one builds upon or connects to.
- Focus on breadth for the pillars (high-level themes) and depth for the sub-concepts (specific techniques/facts).`;

  const result = await defaultModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2000 }
  });
  const text = result.response.text();

  const concepts = parseJSON<Concept[]>(text);
  return concepts;
}

export async function generateSessionTitle(content: string, type: string): Promise<string> {
  const prompt = `Given the following ${type} content, generate a concise, professional title (3-5 words) that captures the core subject. 
  
  CONTENT:
  ${content.substring(0, 2000)}
  
  Return ONLY the title string as a JSON object: {"title": "The Title Here"}`;

  const model = getGeminiModel('free');
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 100 }
  });

  const parsed = parseJSON<{ title: string }>(result.response.text());
  return parsed.title.trim().replace(/^"|"$/g, '');
}

export async function generateAssessment(
  concepts: Concept[],
  plan: string = 'free',
  preferences?: { tone?: string; questionCount?: number }
): Promise<AssessmentQuestion[]> {
  const tone = preferences?.tone ?? 'supportive';
  const count = preferences?.questionCount ?? 6;
  const conceptList = concepts.map((c) => {
    const subText = c.subConcepts?.map(sc => `  - ${sc.name}: ${sc.description}`).join('\n') || '';
    return `- ${c.name} (ID: ${c.id}): ${c.description}${subText ? `\n${subText}` : ''}`;
  }).join('\n');

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
    "id": "q-1",
    "type": "retrieval" | "application" | "misconception",
    "text": "Question text",
    "relatedConcepts": ["pillar-1"]
  }
]

Rules:
- "id": Use short semantic strings like "q-1", "q-2".
- Retrieval: recall/explain. Application: scenario. Misconception: fix wrong framing.
- One clear sentence per question.
- Answers should require a few sentences.`;

  const model = getGeminiModel(plan);
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 1500 }
  });
  const text = result.response.text();

  const questions = parseJSON<AssessmentQuestion[]>(text);
  return questions;
}

export async function analyzeAnswers(
  session: ReflectionSession,
  plan: string = 'free'
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

  const model = getGeminiModel(plan);
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
  userProfile?: { userType?: string; learningContext?: string },
  plan: string = 'free'
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
Strong: ${strongConcepts.map((c) => c.name).join(', ') || 'none'}
Shaky: ${shakyConcepts.map((c) => c.name).join(', ') || 'none'}
Revisit: ${revisitConcepts.map((c) => c.name).join(', ') || 'none'}
User type: ${userType || 'not specified'}
Learning context: ${learningContext || 'not specified'}

JSON Format:
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
          "id": "intro",
          "name": string,
          "definition": string,
          "difficulty": "simple" | "moderate" | "complex",
          "estimatedMinutes": number,
          "isPrerequisite": boolean,
          "prerequisiteFor": ["advanced-concept"],
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

RULES:
- "id": Use short semantic strings (e.g. "unit1-concept1", "foundations").
- Order concepts foundational to advanced.
- Max 20 concepts total across all units.
- estimatedMinutes: simple (5-8), moderate (8-15), complex (12-20).
`;

  const model = getGeminiModel(plan);
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 8000 }
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
