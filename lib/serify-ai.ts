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
- A Mastery Pillar must be a broad, high-level theme (e.g., "DNS", "Derivatives", "Quantum Mechanics").
- Sub-concepts must be specific, actionable components of that pillar (e.g., "DNS Resolution", "Implicit Differentiation", "Wave-Particle Duality").
- CRITICAL NAMING RULE: Concept names MUST be concise nouns or short technical terms. 
- DO NOT use full sentences or questions (e.g., use "DNS" instead of "The problem DNS solves").
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

export type MessageTier = 'tier1' | 'tier2' | 'tier3';

export const classifyMessage = async (message: string, isFollowUpInTier3: boolean = false): Promise<MessageTier> => {
  // Edge cases
  // Message contains likely pasted content (long + structured/non-question text) -> Tier 3
  const trimmedMessage = message.trim();
  const looksQuestionLike =
    /\?/.test(trimmedMessage) ||
    /^(what|why|how|can|could|would|should|is|are|do|does|did|where|when)\b/i.test(trimmedMessage);
  const looksPasted = /```|\n|https?:\/\/|www\./i.test(trimmedMessage);
  if (trimmedMessage.length > 200 && (looksPasted || !looksQuestionLike)) {
    return 'tier3';
  }

  const prompt = `You are classifying a user message sent to an AI learning assistant.
Classify into exactly one tier:

tier1 — Simple navigation, UI help, or clarification question.
  No personal data lookup needed. No real AI generation needed.
  Examples: "what does X mean", "how do I do Y", "where is Z"

tier2 — Standard question requiring personal context.
  Needs Vault lookup, session history, or short contextual response.
  Examples: "what should I study", "summarize my session", "show my gaps"

tier3 — Deep explanation, concept teaching, or content generation.
  Requires substantial AI generation. User wants to learn something or
  have something explained in depth. Usually contains "explain", "teach",
  "walk me through", "why does", "how does", or pasted content.

User message: "${message}"

Return only valid JSON: { "tier": "tier1" | "tier2" | "tier3" }
No preamble. No explanation.`;

  const model = getGeminiModel('free');
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 20 }
    });
    const parsed = parseJSON<{ tier: MessageTier }>(result.response.text());
    
    // Fallback classification logic
    let tier = parsed.tier;
    if (!['tier1', 'tier2', 'tier3'].includes(tier)) {
      tier = 'tier2'; // Default to tier2 on ambiguity
    }

    // Message is a follow-up in an existing Tier 3 conversation -> Tier 2
    if (tier === 'tier3' && isFollowUpInTier3) {
      return 'tier2';
    }

    return tier;
  } catch (error) {
    console.error('Failed to classify message tier:', error);
    return 'tier2'; // Default to error
  }
};

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
- CRITICAL NAMING RULE: Concept "name" MUST be a concise noun or short technical term (e.g., "Domains", "DNS", "Derivatives"). 
- NEVER use questions or descriptive sentences like "How DNS works" or "What is a domain name?".
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

// ----------------------------------------------------------------------------
// Practice Mode Integrations
// ----------------------------------------------------------------------------

export interface ExamQuestionConfig {
  format: 'standard' | 'problem_set' | 'essay' | 'case_study' | 'technical';
  questionCount: number;
}

export async function generateExamQuestions(
  concepts: { id: string; name: string; description: string; mastery: string }[],
  config: ExamQuestionConfig,
  plan: string = 'free',
  topic?: string
): Promise<{ text: string; type: string; conceptId: string; expectedLength: string; difficulty: number }[]> {
  const conceptList = concepts.length > 0 
    ? concepts.map(c => `- ${c.name} (ID: ${c.id}) [Mastery: ${c.mastery}]\n  Desc: ${c.description}`).join('\n')
    : `AD-HOC TOPIC: ${topic || 'General knowledge'}`;
  
  const scopeType = concepts.length > 0 ? "specific Vault concepts" : "this broad topic";
  
  const formatInstructions = {
    standard: `Mixed questions ranging from explanations to short scenarios to compare/contrast.`,
    problem_set: `Stepped difficulty "problems" or technical questions that require showing working. The final problem MUST synthesize multiple concepts.`,
    essay: `1 to 3 long-form essay prompts. E.g. "Argue for or against..." or "Explain to a CEO..."`,
    case_study: `Multiple sub-questions revolving around one large cohesive real-world setting. Must test application over recitation.`,
    technical: `Problem-solving focusing on algorithms, mechanisms, pseudo-code, or debugging intentionally flawed architectures.`
  };

  const prompt = `You are designing a high-pressure, closed-book exam to test genuine mastery and expose the "illusion of competence". 
Generate exactly ${config.questionCount} questions covering ${scopeType}:
${conceptList}
${!concepts.length ? '\nNote: Since this is a topic-based exam without specific nodes, generate questions that cover the most critical technical foundations and common misconceptions of this subject.' : ''}

EXAM FORMAT: ${config.format}
FORMAT RULES: ${formatInstructions[config.format]}

DIFFICULTY RULES:
- Revisit/Shaky concepts -> Level 1 (Foundation - "what is X")
- Developing -> Level 2 (Mechanism - "how does X work")
- Solid -> Level 3 (Application to scenario) or 4 (Synthesis with other concepts)
- Mastered -> Level 4 (Synthesis) or 5 (Edge Cases / limitations)

JSON Format:
[
  {
    "text": "The phrasing of the exam question",
    "type": "explain" | "apply" | "synthesize" | "edge_case" | "scenario",
    "conceptId": "ID of the PRIMARY concept (or 'topic' if ad-hoc)",
    "expectedLength": "short" | "medium" | "long",
    "difficulty": number (1-5)
  }
]
`;

  const model = getGeminiModel(plan);
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2500 }
  });
  
  return parseJSON<any[]>(result.response.text());
}

export async function evaluateExam(
  questions: { questionText: string; answer: string; conceptId: string; conceptName: string; difficulty: number }[],
  plan: string = 'free'
): Promise<{ 
  overallPerformance: 'strong' | 'developing' | 'shaky';
  conceptPerformances: Record<string, 'strong' | 'developing' | 'shaky'>; 
  questionFeedback: { score: 'strong' | 'developing' | 'shaky' | 'blank'; feedback: string }[] 
}> {
  const qnaText = questions.map((q, i) => 
    `Q${i+1} [Testing: ${q.conceptName}, Diff: ${q.difficulty}]: ${q.questionText}\nUser Answer: ${q.answer || '(blank)'}`
  ).join('\n\n');

  const prompt = `You are grading a high-pressure written exam to evaluate true mastery.
Here are the user's answers:
${qnaText}

Evaluate each question strictly based on mechanism accuracy, correct application, and presence of misconceptions.
If an answer is mostly correct but misses a key nuance for its difficulty level, it's 'developing'. Blank is 'blank'.

JSON Format required:
{
  "overallPerformance": "strong" | "developing" | "shaky",
  "conceptPerformances": {
    "conceptId_here": "strong" | "developing" | "shaky"
  },
  "questionFeedback": [
    {
      "score": "strong" | "developing" | "shaky" | "blank",
      "feedback": "2-3 concise sentences justifying the score and pointing out exact gaps or strengths."
    }
  ]
}
`;

  const model = getGeminiModel(plan);
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2500 }
  });
  return parseJSON<any>(result.response.text());
}

export async function generateScenario(
  concepts: { id: string; name: string; description: string }[],
  plan: string = 'free',
  topic?: string
): Promise<{ scenarioText: string; questionText: string }> {
  // Scenario focus
  const conceptNames = concepts.length > 0 
    ? concepts.slice(0, 2).map(c => c.name).join(' and ')
    : topic || 'this subject';

  const prompt = `Write a realistic, real-world scenario designed to test the application of: ${conceptNames}.
${!concepts.length ? `TOPIC CONTEXT: ${topic}` : ''}
Do not ask for a definition. Present a situation where these concepts matter, and ask the user to solve, diagnose, or strategize.

Return JSON:
{
  "scenarioText": "The background context of the situation (3-5 sentences).",
  "questionText": "The call to action ('Using your knowledge of X, what is the best way to handle this...?')"
}
`;

  const model = getGeminiModel(plan);
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 1000 }
  });
  return parseJSON<any>(result.response.text());
}

export async function evaluateScenario(
  scenarioText: string,
  questionText: string,
  targetConcepts: { name: string; description: string }[],
  userAnswer: string,
  plan: string = 'free'
): Promise<{ 
  score: 'strong' | 'developing' | 'weak';
  feedback: string;
}> {
  const prompt = `Evaluate the user's attempt to apply practical knowledge to a scenario.
SCENARIO: ${scenarioText}
TASK: ${questionText}
TARGET CONCEPTS EXPECTED: ${targetConcepts.map(c => c.name).join(', ')}

USER'S RESPONSE: ${userAnswer}

Dimensions to evaluate:
1. Concept identification: Did they use the right concept?
2. Mechanism accuracy: Did they explain it correctly?
3. Application quality: Was it applied properly to exactly this scenario?
4. Solution viability: Is the answer workable?

Return JSON:
{
  "score": "strong" | "developing" | "weak",
  "feedback": "Write a 3-4 sentence paragraph. Start with evaluating the Strengths, then note the Developing aspects, then explicitly note Missed things if any. Tone is authoritative but helpful."
}
`;
  const model = getGeminiModel(plan);
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 800 }
  });
  return parseJSON<any>(result.response.text());
}

export async function evaluateReview(
  conceptName: string,
  conceptDesc: string,
  promptUsed: string,
  userAnswer: string,
  plan: string = 'free'
): Promise<{ 
  score: 'strong' | 'developing' | 'weak';
  feedback: string;
}> {
  const prompt = `You are evaluating a Spaced Repetition explanation from a user.
CONCEPT: ${conceptName} (Definition reference: ${conceptDesc})
THE PROMPT THEY WERE GIVEN: "${promptUsed}"
USER'S EXPLANATION: "${userAnswer}"

Grade them harshly to prevent false confidence. If they just give a surface response without addressing the prompt angle, it's 'weak'. If they get the core idea but miss nuance, 'developing'. If they nail the mechanism, 'strong'.

Return JSON:
{
  "score": "strong" | "developing" | "weak",
  "feedback": "2-3 sentences max. If strong, congratulate implicitly and perhaps note a minor nuance. If weak, explain exactly what core component was missing from their explanation."
}
`;
  const model = getGeminiModel(plan);
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 600 }
  });
  return parseJSON<any>(result.response.text());
}
