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

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { questionId, answerText } = req.body;
    if (!questionId || !answerText) {
        return res.status(400).json({ error: 'Missing questionId or answerText' });
    }

    const sparkCost = SPARK_COSTS.PRACTICE_QUIZ_EVAL;
    const hasSparks = await hasEnoughSparks(userId, sparkCost);
    if (!hasSparks) {
        return res
            .status(403)
            .json({
                error: 'out_of_sparks',
                message: `You need ${sparkCost} Spark to evaluate this answer.`
            });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    try {
        const { data: quiz, error } = await supabase
            .from('practice_quizzes')
            .select('*')
            .eq('session_id', sessionId)
            .single();

        if (error || !quiz) {
            return res.status(404).json({ error: 'Practice quiz not found' });
        }

        const question = quiz.questions.find((q: any) => q.id === questionId);
        if (!question) {
            return res.status(404).json({ error: 'Question not found in quiz' });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json' },
            systemInstruction: `You are a strict but encouraging teacher evaluating a student's answer to a quiz question.
The question was multiple choice or open-ended.
Evaluate the student's answer against the correct answer and explanation.

Return a pure JSON object containing:
- outcome: 'solid', 'developing', 'shaky', or 'revisit'
- feedbackText: A single concise sentence explaining why it's right/wrong or partially correct.
- correctUnderstanding: A short sentence on what the key takeaway should be.

Format: {"outcome": "string", "feedbackText": "string", "correctUnderstanding": "string"}
Do not include any formatting or markdown fences.`
        });

        const promptText = `
Question: ${question.text}
Correct Index/Options: ${question.correctIndex !== undefined ? `Correct option index is ${question.correctIndex} out of ${JSON.stringify(question.options)}` : 'Open ended'}
Explanation: ${question.explanation || 'None'}

Student's Answer: ${answerText}
`;

        const deduction = await deductSparks(userId, sparkCost, 'quiz_answer_evaluation');
        if (!deduction.success) {
            return res
                .status(403)
                .json({
                    error: 'out_of_sparks',
                    message: `You need ${sparkCost} Spark to evaluate this answer.`
                });
        }

        const result = await model.generateContent(promptText);
        const text = result.response.text();

        let evaluation;
        try {
            evaluation = parseJSON<any>(text);
        } catch (parseError) {
            console.error('Failed to parse Gemini Answer Eval output:', text);
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }

        const updatedQuestions = quiz.questions.map((q: any) => {
            if (q.id !== questionId) return q;
            return {
                ...q,
                attempts: [
                    ...(q.attempts || []),
                    {
                        attemptNumber: (q.attempts?.length || 0) + 1,
                        answerText,
                        submittedAt: new Date().toISOString(),
                        evaluation
                    }
                ]
            };
        });

        const latestAttempt = quiz.attempts[quiz.attempts.length - 1];
        if (latestAttempt) {
            latestAttempt.results[evaluation.outcome] =
                (latestAttempt.results[evaluation.outcome] || 0) + 1;
        }

        const { error: updateError } = await supabase
            .from('practice_quizzes')
            .update({
                questions: updatedQuestions,
                attempts: quiz.attempts
            })
            .eq('session_id', sessionId);

        if (updateError) throw updateError;

        return res.status(200).json({ evaluation });
    } catch (error: any) {
        console.error('Error recording quiz answer:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
