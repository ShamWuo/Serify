import { GoogleGenerativeAI } from '@google/generative-ai';
import { MODEL_FLASH, parseJSON } from './serify-ai';

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';

export interface ClarificationResponse {
  status: 'clear' | 'clarify';
  question?: string;
  suggestedOptions?: string[];
  suggestedMode?: 'learn' | 'roadmap';
}

export async function preAnalyzePrompt(
  content: string,
  contentType: string,
  currentMode?: 'learn' | 'roadmap'
): Promise<ClarificationResponse> {
  if (!geminiApiKey) {
    return { status: 'clear' };
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ 
    model: MODEL_FLASH,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  });

  const prompt = `
    You are an AI learning assistant. Your task is to analyze a user's learning prompt and decide if it's clear enough to start a session OR if it needs clarification to provide a better experience.

    User Prompt: "${content}"
    Content Type: ${contentType}
    Current Selected Mode: ${currentMode || 'unspecified'}

    CRITERIA FOR CLARIFICATION:
    1. VAGUENESS: If the prompt is just 1-2 generic words (e.g., "Math", "History", "Coding") without context.
    2. AMBIGUITY: If the prompt could mean multiple very different things.
    3. SCOPE: If the prompt is so broad that a "Quick Learn" session would be better than a full "Roadmap" (or vice versa), and you want to offer the choice.
    4. MISSING GOAL: If the user hasn't specified what they want to ACHIEVE with this knowledge (e.g., "I have an exam", "I want to build a project", "Just curious").

    SPECIAL CASE: Choice between "Learn Now" (Quick Learn - fast, interactive, single concept) vs "Generate Roadmap" (Comprehensive curriculum - multiple units, long term).
    If the user's prompt is specific but significant, ask if they want a 5-minute interactive "Learn Now" session or a full structured "Roadmap".

    INSTRUCTIONS:
    - If clear, return { "status": "clear", "suggestedMode": "learn|roadmap" }.
    - If clarification helps, return { "status": "clarify", "question": "A concise, supportive question to get more context.", "suggestedOptions": ["Option A", "Option B"] }.

    Return ONLY raw JSON.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return parseJSON<ClarificationResponse>(response.text());
  } catch (err) {
    console.error('[Clarification AI] Error:', err);
    return { status: 'clear' };
  }
}
