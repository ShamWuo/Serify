import { GoogleGenerativeAI } from '@google/generative-ai';
import { AssessmentQuestion, CognitiveAnalysis, Concept, ContentSource, ReflectionSession } from '../types/serify';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 1000,
    responseMimeType: 'application/json'
  },
});

export function parseJSON<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
  return JSON.parse(cleaned);
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
  const conceptList = concepts.map(c => `- ${c.name}: ${c.description}`).join('\n');

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

export async function analyzeAnswers(session: ReflectionSession): Promise<{ analysis: CognitiveAnalysis; depthScore: number }> {
  const conceptMap = Object.fromEntries(session.extractedConcepts.map(c => [c.id, c.name]));
  const qAndA = session.assessmentQuestions.map(q => {
    const answer = session.userAnswers.find(a => a.questionId === q.id)?.answer ?? '(no answer)';
    return `Q (${q.type}): ${q.text}\nA: ${answer}`;
  }).join('\n\n');

  const prompt = `Analyze this reflection session.
Topic: ${session.contentSource.title}
Concepts:
${session.extractedConcepts.map(c => `- ${c.id} = ${c.name}: ${c.description}`).join('\n')}

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
