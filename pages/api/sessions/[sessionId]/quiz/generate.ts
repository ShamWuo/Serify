import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, hasEnoughSparks, deductSparks, SPARK_COSTS } from '@/lib/sparks';
import { createClient } from '@supabase/supabase-js';
import { parseJSON } from '@/lib/serify-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== 'string')
        return res.status(400).json({ error: 'Missing or invalid sessionId' });

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(sessionId)) {
        return res
            .status(400)
            .json({
                error: 'Invalid session: this session was created before the current format and cannot be used with this feature.'
            });
    }
    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const sparkCost = SPARK_COSTS.PRACTICE_QUIZ_GEN;
    const hasSparks = await hasEnoughSparks(userId, sparkCost);
    if (!hasSparks) {
        return res
            .status(403)
            .json({
                error: 'out_of_sparks',
                message: `You need ${sparkCost} Spark to generate practice quizzes.`
            });
    }

    const { concepts } = req.body;

    if (!concepts || concepts.length === 0) {
        return res.status(400).json({ error: 'Missing concepts' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                responseMimeType: 'application/json',
                maxOutputTokens: 2000
            },
            systemInstruction: `You are a quiz master. Generate 1-2 MCQs per concept.
Rules:
- Test application/depth.
- 4 options, one correct.
- Distractors should represent misconceptions if listed.
- Brief "explanation" for all options.

Return JSON:
[
  {
    "id": "uuid",
    "conceptId": "string",
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "correctIndex": number,
    "explanation": "string"
  }
]`
        });

        const promptText = `
Generate MCQs for the following concepts. For each question, you MUST return the EXACT same conceptId provided for that concept. Generate a random unique UUID for each question's "id" field. Pay special attention to their feedback so you can target their specific weak spots or misconceptions:

${concepts.map((c: any) => `- Concept: ${c.name} (ID: ${c.id})\n  Mastery State: ${c.masteryState}\n  Feedback: ${c.feedbackNote || 'None'}`).join('\n\n')}
`;

        const deduction = await deductSparks(userId, sparkCost, 'practice_quiz_gen');
        if (!deduction.success) {
            return res
                .status(403)
                .json({
                    error: 'out_of_sparks',
                    message: `You need ${sparkCost} Spark to generate practice quizzes.`
                });
        }

        const result = await model.generateContent(promptText);
        const text = result.response.text();

        let generatedQuestions = [];
        try {
            generatedQuestions = parseJSON<any[]>(text);

            generatedQuestions = generatedQuestions.map((q: any) => ({
                id: q.id || crypto.randomUUID(),
                conceptId: q.conceptId,
                type: 'application',
                text: q.question,
                options: q.options,
                correctIndex: q.correctIndex,
                explanation: q.explanation,
                strongAnswerIndicators: [],
                attempts: []
            }));
        } catch (parseError) {
            console.error('Failed to parse Gemini Practice Quiz output:', text);
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }

        const { data: existingQuiz } = await supabase
            .from('practice_quizzes')
            .select('*')
            .eq('session_id', sessionId)
            .maybeSingle();

        let finalQuiz;

        const quizData = {
            questions: generatedQuestions,
            question_count: generatedQuestions.length,
            attempts: [
                {
                    attemptNumber: existingQuiz ? existingQuiz.generation_count + 1 : 1,
                    startedAt: new Date().toISOString(),
                    completedAt: null,
                    results: { strong: 0, partial: 0, weak: 0, skipped: 0 }
                }
            ]
        };

        if (existingQuiz) {
            const { data, error } = await supabase
                .from('practice_quizzes')
                .update({
                    ...quizData,
                    regenerated_at: new Date().toISOString(),
                    generation_count: existingQuiz.generation_count + 1
                })
                .eq('session_id', sessionId)
                .select()
                .single();

            if (error) throw error;
            finalQuiz = data;
        } else {
            const { data, error } = await supabase
                .from('practice_quizzes')
                .insert({
                    session_id: sessionId,
                    user_id: userId,
                    generation_count: 1,
                    ...quizData
                })
                .select()
                .single();

            if (error) throw error;
            finalQuiz = data;
        }

        return res.status(200).json(finalQuiz);
    } catch (error: any) {
        console.error('Error generating practice questions:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
