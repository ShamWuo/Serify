import { GoogleGenerativeAI } from '@google/generative-ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import {
  AssessmentQuestion,
  CognitiveAnalysis,
  Concept,
  ContentSource,
  Curriculum,
  ReflectionSession
} from '../types/serify';

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
if (!geminiApiKey && typeof window === 'undefined') {
  console.warn('[Serify AI] Warning: No Gemini API key found in GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY');
}

const googleProvider = createGoogleGenerativeAI({
  apiKey: geminiApiKey,
});

export const MODEL_PRO = 'gemini-2.5-pro';
export const MODEL_FLASH = 'gemini-2.5-flash';

export function getGeminiModel(plan: string = 'free', systemInstruction?: string) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing AI configuration: Neither GEMINI_API_KEY nor GOOGLE_GENERATIVE_AI_API_KEY found in environment.');
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = plan === 'proplus' || plan === 'pro' ? MODEL_PRO : MODEL_FLASH;
  
  return genAI.getGenerativeModel({ 
    model: modelName,
    systemInstruction,
    generationConfig: {
      temperature: plan === 'free' ? 0.1 : 0.3,
      responseMimeType: 'application/json'
    }
  });
}

function getAISDKModel(plan: string = 'free') {
  const modelName = plan === 'proplus' || plan === 'pro' ? MODEL_PRO : MODEL_FLASH;
  return googleProvider(modelName);
}

function getDefaultModel() {
  return getGeminiModel('free');
}

export function parseJSON<T>(text: string): T {
  
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*(?:```|$)/);
  let toParse = jsonMatch ? jsonMatch[1] : text;

  
  let cleaned = toParse.replace(/^\s+/, '').replace(/\s+$/, '').trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').trim();
  if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').trim();
  if (cleaned.endsWith('```')) cleaned = cleaned.replace(/```$/, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse JSON cleanly, attempting aggressive subset extraction...');
    
    try {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      
      let first = -1;
      if (firstBrace !== -1 && firstBracket !== -1) first = Math.min(firstBrace, firstBracket);
      else if (firstBrace !== -1) first = firstBrace;
      else first = firstBracket;
      
      const last = Math.max(lastBrace, lastBracket);
      
      if (first !== -1 && last !== -1 && (last > first)) {
          const aggressive = cleaned.substring(first, last + 1);
          try {
            return JSON.parse(aggressive);
          } catch (aggressiveErr) {
            console.error('Aggressive JSON parse failed. Raw string:', aggressive);
            throw aggressiveErr;
          }
      }
      console.error('Could not find JSON bounds. Cleaned string:', cleaned);
      throw err;
    } catch (innerErr) {
      throw err;
    }
  }
}

export async function extractConcepts(
  content: ContentSource, 
  plan: string = 'free', 
  transcript?: string, 
  vaultContext?: string,
  fileData?: { base64: string, mimeType: string }
): Promise<Concept[]> {
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
- DO NOT use full sentences, questions, or action-based names (e.g., use "DNS" instead of "Understanding DNS" or "How does DNS work?").
- AVOID generic names like "Concept", "Idea", "Basics", or "Introduction" unless they are part of a specific technical term.
- REUSE existing Pillar names from the provided context whenever possible.

Focus on breadth for the pillars (high-level themes) and depth for the sub-concepts (specific techniques/facts).`;

  let multimodalMessages: any[] | undefined = undefined;
  
  if (fileData) {
    const isImage = fileData.mimeType.startsWith('image/');
    const data = Buffer.from(fileData.base64, 'base64');
    
    multimodalMessages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          isImage 
            ? { type: 'image', image: data, mimeType: fileData.mimeType } 
            : { type: 'file', data: data, mimeType: fileData.mimeType }
        ]
      }
    ];
  }

  try {
    const model = getAISDKModel(plan);
    const schema = z.array(z.object({
      id: z.string().describe('Short semantic string like "pillar-1"'),
      name: z.string().describe('Concise noun or technical term. Max 3-4 words.'),
      description: z.string().describe('Broad, comprehensive definition (1-2 sentences)'),
      importance: z.enum(['high', 'medium', 'low']),
      relatedConcepts: z.array(z.string()).describe('IDs of other extracted pillars this one builds upon'),
      subConcepts: z.array(z.object({
        name: z.string().describe('Concise sub-concept name. Max 3-4 words.'),
        description: z.string().describe('Concise explanation of how this fits into the pillar')
      }))
    }));

    let result;
    if (multimodalMessages) {
      result = await generateObject({
        model,
        schema,
        messages: multimodalMessages,
        temperature: plan === 'free' ? 0.1 : 0.3,
      });
    } else {
      result = await generateObject({
        model,
        schema,
        prompt,
        temperature: plan === 'free' ? 0.1 : 0.3,
      });
    }

    return result.object as Concept[];
  } catch (err) {
    console.error('[Serify AI] generateObject Error:', err);
    throw err;
  }
}

export async function generateSessionTitle(content: string, type: string): Promise<string> {
  const prompt = `Given the following ${type} content, generate a concise, professional title (2-4 words) that captures the core subject matter. 
  
  RULES:
  - Focus on the technical subject or core concept.
  - AVOID generic prefixes like "Understanding...", "Introduction to...", "Lecture on...", "Notes about...".
  - DO NOT use "Learning about X" if X is the subject. Just use "X".
  
  CONTENT SNIPPET:
  ${content.substring(0, 2000)}`;

  const { object } = await generateObject({
    model: getAISDKModel('free'),
    schema: z.object({
      title: z.string().describe('A 2-4 word concise subject title')
    }),
    prompt,
  });

  return object.title.trim().replace(/^"|"$/g, '').replace(/\.$/, '');
}

export type MessageTier = 'tier1' | 'tier2' | 'tier3';

export const classifyMessage = async (message: string, isFollowUpInTier3: boolean = false): Promise<MessageTier> => {
  
  
  if (message.length > 200) {
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

User message: "${message}"`;

  try {
    const { object } = await generateObject({
      model: getAISDKModel('free'),
      schema: z.object({
        tier: z.enum(['tier1', 'tier2', 'tier3'])
      }),
      prompt,
    });
    
    let tier = object.tier;

    
    if (tier === 'tier3' && isFollowUpInTier3) {
      return 'tier2';
    }

    return tier;
  } catch (error) {
    console.error('Failed to classify message tier:', error);
    return 'tier2'; 
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

Rules:
- Retrieval: recall/explain. Application: scenario. Misconception: fix wrong framing.
- One clear sentence per question.
- Answers should require a few sentences.`;

  const { object } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.array(z.object({
      id: z.string().describe('Short semantic string like "q-1"'),
      type: z.enum(['retrieval', 'application', 'misconception']),
      text: z.string(),
      relatedConcepts: z.array(z.string())
    })),
    prompt,
  });

  return object as AssessmentQuestion[];
}

export async function analyzeAnswers(
  session: ReflectionSession,
  plan: string = 'free'
): Promise<{ analysis: CognitiveAnalysis; depthScore: number }> {
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

Rules:
- Score: 85+ (excellent), 70-84 (good), 50-69 (surface), <50 (gaps).
- 3-5 insights, 2-4 focusSuggestions (start with verb).
- Constructive tone.`;

  const { object } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.object({
      depthScore: z.number().describe('0-100 score'),
      strengthMap: z.object({
        strong: z.array(z.string()),
        weak: z.array(z.string()),
        missing: z.array(z.string())
      }),
      insights: z.array(z.object({
        type: z.enum(['strength', 'weakness', 'misconception', 'gap']),
        message: z.string(),
        relatedConcepts: z.array(z.string())
      })),
      focusSuggestions: z.array(z.string())
    }),
    prompt,
  });

  const { depthScore, ...analysis } = object;

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

RULES:
- "id": Use short semantic strings (e.g. "unit1-concept1", "foundations").
- CRITICAL NAMING RULE: Concept "name" MUST be a concise noun or short technical term (e.g., "Domains", "DNS", "Derivatives"). 
- NEVER use questions or descriptive sentences like "How DNS works" or "What is a domain name?".
- Order concepts foundational to advanced.
- Max 8-12 concepts TOTAL across the entire curriculum.
- Cap the curriculum at 3 to 4 units maximum.
- Consolidate highly related sub-topics into a single, comprehensive concept rather than splitting them into tiny sequential steps (e.g., combine "Derivative as Slope" and "Instantaneous Rate of Change" into one).
- estimatedMinutes: simple (5-8), moderate (8-15), complex (12-20).
`;

  const { object: curriculumData } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.object({
      title: z.string(),
      target_description: z.string(),
      outcomes: z.array(z.string()),
      units: z.array(z.object({
        unitNumber: z.number(),
        unitTitle: z.string(),
        unitSummary: z.string(),
        concepts: z.array(z.object({
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
        }))
      })),
      recommended_start_index: z.number(),
      scope_note: z.string().nullable()
    }),
    prompt,
  });

  
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
    original_units: JSON.parse(JSON.stringify(curriculumData.units || [])), 
    edit_count: 0,
    recommended_start_index: curriculumData.recommended_start_index || 0,
    current_concept_index: curriculumData.recommended_start_index || 0,
    completed_concept_ids: [],
    skipped_concept_ids: []
  };
}

export async function generatePracticeTest(
  concepts: { id: string; name: string; description: string }[],
  plan: string = 'free',
  topic?: string,
  difficulty: 'Auto' | 'Easy' | 'Medium' | 'Hard' = 'Auto'
): Promise<{ 
  id: string; 
  type: 'retrieval' | 'application' | 'misconception'; 
  text: string; 
  conceptId: string | null; 
  answer?: string; 
  options?: string[]; 
  explanation?: string; 
  distractors?: string[]; 
}[]> {
  const conceptList = concepts.length > 0 
    ? concepts.map(c => `- ${c.name} (ID: ${c.id}): ${c.description}`).join('\n')
    : `AD-HOC TOPIC: ${topic || 'General knowledge'}`;
  
  const scopeType = concepts.length > 0 ? "specific Vault concepts" : "this broad topic";

  const difficultyInstruction = difficulty === 'Easy' ? 'Keep it simple and foundational.' 
    : difficulty === 'Hard' ? 'Make it challenging, highly analytical, and nuanced.' 
    : 'Adapt the difficulty starting with foundational and moving to application.';

  const prompt = `You are a learning coach. Generate exactly 6 open-ended diagnostic questions for ${scopeType}:
${conceptList}

Difficulty focus: ${difficultyInstruction}

Rules:
- Retrieval: recall/explain. Application: scenario. Misconception: fix wrong framing.
- Mix all three question types.
- Ensure the questions map exactly to the provided concepts (use their IDs).`;

  const { object } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.array(z.object({
      id: z.string().describe('Short semantic string like "q-1"'),
      type: z.enum(['retrieval', 'application', 'misconception']),
      text: z.string(),
      conceptId: z.string().nullable().describe('ID of the primary concept, or null if ad-hoc topic')
    })),
    prompt,
  });
  
  return object as any[];
}

export async function evaluatePracticeTest(
  questions: { questionText: string; answer: string; conceptId: string | null; type: string }[],
  plan: string = 'free'
): Promise<{
  overallPerformance: 'strong' | 'developing' | 'shaky';
  questionFeedback: { score: 'strong' | 'developing' | 'shaky' | 'blank'; feedback: string }[];
  focusSuggestions: string[];
}> {
  const qnaText = questions.map((q, i) => 
    `Q${i+1} (${q.type}): ${q.questionText}\nUser Answer: ${q.answer || '(blank)'}`
  ).join('\n\n');

  const prompt = `Grade this Practice Test.
Answers:
${qnaText}

Evaluate mechanism accuracy and misconceptions.
If an answer is mostly correct but misses a nuance, it's 'developing'. Blank is 'blank'.`;

  const { object } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.object({
      overallPerformance: z.enum(['strong', 'developing', 'shaky']),
      questionFeedback: z.array(z.object({
        score: z.enum(['strong', 'developing', 'shaky', 'blank']),
        feedback: z.string().describe('2-3 concise sentences justifying the score.')
      })),
      focusSuggestions: z.array(z.string()).describe('Actionable advice')
    }),
    prompt,
  });

  return object;
}

export async function generateQuickQuiz(
  concepts: { id: string; name: string; description: string }[],
  plan: string = 'free',
  topic?: string,
  difficulty: 'Auto' | 'Easy' | 'Medium' | 'Hard' = 'Auto'
): Promise<{ text: string; options: string[]; answer: string; explanation: string; conceptId: string | null }[]> {
  const conceptList = concepts.length > 0 
    ? concepts.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')
    : `AD-HOC TOPIC: ${topic || 'General knowledge'}`;
  
  const scopeType = concepts.length > 0 ? "specific Vault concepts" : "this broad topic";

  const prompt = `Generate a 5-question multiple choice Quick Quiz for ${scopeType}:
${conceptList}

Difficulty: ${difficulty}. 
Make sure the distractors are plausible misconceptions, not obviously wrong filler.`;

  const { object } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.array(z.object({
      text: z.string().describe('The question string'),
      options: z.array(z.string()),
      answer: z.string().describe('The exact string from the options array that is correct'),
      explanation: z.string().describe('1-2 sentences explaining why the answer is correct.'),
      conceptId: z.string().nullable().describe('ID of the specific concept tested, or null if ad-hoc topic')
    })),
    prompt,
  });
  return object;
}

export async function generateFlashcards(
  concepts: { id: string; name: string; description: string }[],
  plan: string = 'free',
  topic?: string
): Promise<{ front: string; back: string; conceptId: string | null }[]> {
  const conceptList = concepts.length > 0 
    ? concepts.map(c => `- ${c.name} (ID: ${c.id}): ${c.description}`).join('\n')
    : `AD-HOC TOPIC: ${topic || 'General knowledge'}`;
    
  let prompt = '';
  if (concepts.length > 0) {
    prompt = `Generate exactly 10 high-yield flashcards covering these concepts:
${conceptList}
Use a mix of standard "Definition" cards, and "Fill in the blank" cards. Make them atomic (one idea per card).`;
  } else {
    prompt = `The user wants to study this topic: "${topic}".
Generate exactly 10 high-yield, foundational flashcards covering the most important facts, principles, or formulas of this topic.
Make them atomic (one idea per card).`;
  }

  const { object } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.array(z.object({
      front: z.string().describe('Front of card text'),
      back: z.string().describe('Back of card text'),
      conceptId: z.string().nullable()
    })),
    prompt,
  });
  return object;
}

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
`;

  const { object } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.array(z.object({
      text: z.string().describe('The phrasing of the exam question'),
      type: z.enum(['explain', 'apply', 'synthesize', 'edge_case', 'scenario']),
      conceptId: z.string().describe('ID of the PRIMARY concept (or "topic" if ad-hoc)'),
      expectedLength: z.enum(['short', 'medium', 'long']),
      difficulty: z.number().min(1).max(5)
    })),
    prompt,
  });
  
  return object;
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
If an answer is mostly correct but misses a key nuance for its difficulty level, it's 'developing'. Blank is 'blank'.`;

  const { object } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.object({
      overallPerformance: z.enum(['strong', 'developing', 'shaky']),
      conceptPerformances: z.record(z.enum(['strong', 'developing', 'shaky'])),
      questionFeedback: z.array(z.object({
        score: z.enum(['strong', 'developing', 'shaky', 'blank']),
        feedback: z.string().describe('2-3 concise sentences justifying the score and pointing out exact gaps or strengths.')
      }))
    }),
    prompt,
  });
  return object;
}

export async function generateScenario(
  concepts: { id: string; name: string; description: string }[],
  plan: string = 'free',
  topic?: string
): Promise<{ scenarioText: string; questionText: string }> {
  
  const conceptNames = concepts.length > 0 
    ? concepts.slice(0, 2).map(c => c.name).join(' and ')
    : topic || 'this subject';

  const prompt = `Write a realistic, real-world scenario designed to test the application of: ${conceptNames}.
${!concepts.length ? `TOPIC CONTEXT: ${topic}` : ''}
Do not ask for a definition. Present a situation where these concepts matter, and ask the user to solve, diagnose, or strategize.`;

  const { object } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.object({
      scenarioText: z.string().describe('The background context of the situation (3-5 sentences).'),
      questionText: z.string().describe('The call to action')
    }),
    prompt,
  });
  return object;
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
4. Solution viability: Is the answer workable?`;

  const { object } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.object({
      score: z.enum(['strong', 'developing', 'weak']),
      feedback: z.string().describe('Write a 3-4 sentence paragraph. Authoritative but helpful.')
    }),
    prompt,
  });
  return object;
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

Grade them harshly to prevent false confidence. If they just give a surface response without addressing the prompt angle, it's 'weak'. If they get the core idea but miss nuance, 'developing'. If they nail the mechanism, 'strong'.`;

  const { object } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.object({
      score: z.enum(['strong', 'developing', 'weak']),
      feedback: z.string().describe('2-3 sentences max.')
    }),
    prompt,
  });
  return object;
}

export async function generateComprehensiveTest(
  concepts: { id: string; name: string; description: string }[],
  plan: string = 'free',
  topic?: string,
  difficulty: 'Auto' | 'Easy' | 'Medium' | 'Hard' = 'Auto'
): Promise<{
  mcqs: { text: string; options: string[]; answer: string; explanation: string; conceptId: string | null }[];
  saqs: { text: string; type: 'retrieval' | 'application'; conceptId: string | null }[];
  scenario: { scenarioText: string; questionText: string; conceptId: string | null };
}> {
  const conceptList = concepts.length > 0 
    ? concepts.map(c => `- ${c.name} (ID: ${c.id}): ${c.description}`).join('\n')
    : `AD-HOC TOPIC: ${topic || 'General knowledge'}`;
  
  const scopeType = concepts.length > 0 ? "specific Vault concepts" : "this broad topic";

  const prompt = `You are a master learning architect. Generate a comprehensive "Actual Practice Test" for ${scopeType}:
${conceptList}

Difficulty: ${difficulty}.

The test must contain EXACTLY:
1. Three (3) Multiple Choice Questions (MCQs) - Plausible distractors.
2. Two (2) Short Answer Questions (SAQs) - One retrieval, one application.
3. One (1) Real-world Scenario - A complex problem-solving task.`;

  const { object } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.object({
      mcqs: z.array(z.object({
        text: z.string(),
        options: z.array(z.string()),
        answer: z.string(),
        explanation: z.string(),
        conceptId: z.string().nullable()
      })),
      saqs: z.array(z.object({
        text: z.string(),
        type: z.enum(['retrieval', 'application']),
        conceptId: z.string().nullable()
      })),
      scenario: z.object({
        scenarioText: z.string(),
        questionText: z.string(),
        conceptId: z.string().nullable()
      })
    }),
    prompt,
  });
  
  return object;
}

export async function evaluateComprehensiveTest(
  questions: { questionText: string; answer: string; type: string; conceptId: string | null; isCorrectMCQ?: boolean; explanation?: string }[],
  plan: string = 'free'
): Promise<{
  overallPerformance: 'strong' | 'developing' | 'shaky';
  questionFeedback: { score: 'strong' | 'developing' | 'shaky' | 'blank'; feedback: string }[];
  focusSuggestions: string[];
}> {
  const qnaText = questions.map((q, i) => {
    if (q.type === 'multiple_choice') {
      return `Q${i+1} (MCQ): ${q.questionText}\nUser Answer: ${q.answer}\nResult: ${q.isCorrectMCQ ? 'CORRECT' : 'INCORRECT'}\nExplanation: ${q.explanation}`;
    }
    return `Q${i+1} (${q.type}): ${q.questionText}\nUser Answer: ${q.answer || '(blank)'}`;
  }).join('\n\n');

  const prompt = `Grade this Comprehensive Practice Test (Mixed MCQ, SAQ, Scenario).
Answers:
${qnaText}

Evaluate strictly based on mechanism accuracy and application quality.
For MCQs, simple acknowledge the result. For SAQs and Scenarios, provide deep diagnostic feedback.`;

  const { object } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.object({
      overallPerformance: z.enum(['strong', 'developing', 'shaky']),
      questionFeedback: z.array(z.object({
        score: z.enum(['strong', 'developing', 'shaky', 'blank']),
        feedback: z.string().describe('Concise feedback sentence(s).')
      })),
      focusSuggestions: z.array(z.string()).describe('Actionable advice')
    }),
    prompt,
  });

  return object;
}

export async function generateScheduledRoadmap(
  goal: string,
  targetDate: string,
  vaultContext: {
    strongConcepts: { name: string }[];
    shakyConcepts: { name: string }[];
    revisitConcepts: { name: string }[];
  },
  plan: string = 'free'
): Promise<{
  title: string;
  schedule: {
    dayOffset: number;
    date: string;
    focusArea: string;
    tasks: {
      type: 'learning' | 'practice' | 'review' | 'assessment';
      description: string;
      conceptName?: string;
      estimatedMinutes: number;
    }[];
  }[];
  milestones: string[];
}> {
  const { strongConcepts, shakyConcepts, revisitConcepts } = vaultContext;
  
  const today = new Date().toISOString().split('T')[0];

  const prompt = `You are Serify's curriculum architect.
The user's goal is: "${goal}".
The strict deadline is: ${targetDate}. Today is ${today}.

USER'S CURRENT KNOWLEDGE (from Concept Vault):
Strong: ${strongConcepts.map((c) => c.name).join(', ') || 'none'}
Shaky: ${shakyConcepts.map((c) => c.name).join(', ') || 'none'}
Revisit: ${revisitConcepts.map((c) => c.name).join(', ') || 'none'}

Create a structured, day-by-day learning roadmap that guarantees the user masters this goal by the deadline.
Focus heavily on active recall, practice, and repairing "shaky" and "revisit" concepts before introducing new complex material.

Rules:
- Give the roadmap a catchy title.
- Distribute tasks sensibly. Don't overload a single day (max 3-4 tasks, total ~45-90 mins per day).
- Every date from today up to the targetDate should ideally have some activity, or rest days if the timeline is long enough.
- 'dayOffset' is the number of days from today (0 = today, 1 = tomorrow).
- Return a few key 'milestones' to track macro progress.`;

  const { object } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.object({
      title: z.string(),
      schedule: z.array(z.object({
        dayOffset: z.number(),
        date: z.string().describe('YYYY-MM-DD'),
        focusArea: z.string().describe('High-level theme for the day'),
        tasks: z.array(z.object({
          type: z.enum(['learning', 'practice', 'review', 'assessment']),
          description: z.string().describe('Actionable task instruction'),
          conceptName: z.string().optional().describe('The primary concept this task targets, if applicable'),
          estimatedMinutes: z.number().describe('Realistic time estimate')
        }))
      })),
      milestones: z.array(z.string()).describe('3-5 major checkpoints achieved along this roadmap')
    }),
    prompt,
  });

  return object;
}

export async function conductInterviewTurn(
  scenario: string,
  history: { role: 'ai' | 'user'; content: string }[],
  userResponse: string,
  targetConcepts: { name: string; description: string }[],
  plan: string = 'free'
): Promise<{
  status: 'in_progress' | 'passed' | 'failed';
  aiResponse: string;
  feedback?: {
    strengths: string[];
    weaknesses: string[];
    overall: string;
  };
}> {
  const historyText = history.map(h => `${h.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${h.content}`).join('\n');
  const conceptNames = targetConcepts.map(c => c.name).join(', ');

  const prompt = `You are conducting a strict, high-pressure technical interview.
The overall scenario / role is: ${scenario}
The core concepts you are testing the candidate on are: ${conceptNames}

CONVERSATION HISTORY:
${historyText}

CANDIDATE'S LATEST RESPONSE:
${userResponse}

Your task:
1. Evaluate the candidate's latest response. Are they dodging the question? Are they showing true mastery or just surface-level recitation?
2. Decide the state of the interview:
   - 'in_progress': The interview continues. Ask the next probing question. Push back on weak answers.
   - 'passed': The candidate has convincingly demonstrated mastery of the target concepts. End the interview.
   - 'failed': The candidate fundamentally misunderstands the concepts or gave up. End the interview.
3. If 'in_progress', provide the 'aiResponse' as your next question or statement as the interviewer. Keep it conversational but firm. Do NOT break character.
4. If 'passed' or 'failed', provide a final 'aiResponse' wrapping up, AND provide the 'feedback' object detailing why they passed/failed.`;

  const { object } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.object({
      status: z.enum(['in_progress', 'passed', 'failed']),
      aiResponse: z.string().describe('What the interviewer says next.').max(1000),
      feedback: z.object({
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
        overall: z.string()
      }).optional().describe('Only provide if status is passed or failed.')
    }),
    prompt,
  });

  return object;
}

/**
 * Generates a high-yield topic list for an exam roadmap using AI.
 */
export async function generateRoadmapTopics(
  userInput: string,
  examType: 'standardized' | 'certification' | 'custom' = 'custom',
  examName?: string,
  plan: string = 'free'
): Promise<{
  title: string;
  target_description: string;
  topics: {
    title: string;
    unit: string;
    importance: 'high' | 'medium' | 'low';
    estimatedSessions: number;
    whyIncluded: string;
  }[];
}> {
  const prompt = `You are an expert exam preparation coach. Your goal is to reverse-engineer a high-yield study topic list for an upcoming exam.

EXAM GOAL: ${userInput}
EXAM TYPE: ${examType}
${examName ? `EXAM NAME: ${examName}` : ''}

RULES:
- Generate 8-15 distinct topics covering the most critical areas for this exam.
- Group topics into logical "Units" (e.g., "Foundations", "Advanced Theory", "Case Studies", "Practicals").
- title: Concise technical name for the topic.
- unit: Logical grouping for the topic.
- importance: 
  - 'high': Core concepts that appear frequently or have heavy weight.
  - 'medium': Standard concepts that are necessary but less central.
  - 'low': Minor details, edge cases, or elective topics.
- estimatedSessions: Number of study sessions (approx 1 hour each) to dedicate to this specific topic based on its complexity and high-yield nature. Range: 1 to 4.
- whyIncluded: A 1-sentence explanation of why this topic is essential for passing the exam or achieving mastery.
- The list should be ordered from foundational to advanced/applied.

Return a JSON object with title, target_description, and the list of topics.`;

  const { object: roadmapData } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.object({
      title: z.string(),
      target_description: z.string(),
      topics: z.array(z.object({
        title: z.string(),
        unit: z.string(),
        importance: z.enum(['high', 'medium', 'low']),
        estimatedSessions: z.number().min(1).max(5),
        whyIncluded: z.string()
      }))
    }),
    prompt,
  });

  return roadmapData as any;
}
/**
 * Refines an existing topic list based on conversational instructions.
 */
export async function refineRoadmapTopics(
  goal: string,
  currentTopics: { title: string; unit: string; importance: string; whyIncluded?: string }[],
  instruction: string,
  plan: string = 'free'
): Promise<{
  title: string;
  target_description: string;
  topics: {
    title: string;
    unit: string;
    importance: 'high' | 'medium' | 'low';
    estimatedSessions: number;
    whyIncluded: string;
  }[];
}> {
  const currentTopicsText = currentTopics.map((t, i) => 
    `${i+1}. [${t.unit}] ${t.title} (Importance: ${t.importance})`
  ).join('\n');

  const prompt = `You are a precision curriculum architect. You are refining an existing study roadmap.
  
EXAM GOAL: ${goal}

CURRENT TOPIC BLUEPRINT:
${currentTopicsText}

USER INSTRUCTION: "${instruction}"

YOUR TASK:
- Modify the current topics based on the user's specific feedback or instructions.
- You can ADD new topics, REMOVE existing ones, or EDIT titles and units as needed.
- Ensure the total number of topics stays between 8 and 18.
- Maintain a logical progression from foundational to advanced.
- Ensure 'estimatedSessions' (1 to 5) reflects the complexity.
- 'importance' must be 'high', 'medium', or 'low'.

Return a JSON object with title, target_description, and the refined list of topics.`;

  const { object: roadmapData } = await generateObject({
    model: getAISDKModel(plan),
    schema: z.object({
      title: z.string(),
      target_description: z.string(),
      topics: z.array(z.object({
        title: z.string(),
        unit: z.string(),
        importance: z.enum(['high', 'medium', 'low']),
        estimatedSessions: z.number().min(1).max(5),
        whyIncluded: z.string()
      }))
    }),
    prompt,
  });

  return roadmapData as any;
}
