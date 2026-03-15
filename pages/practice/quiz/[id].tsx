import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Zap, ArrowRight, ArrowLeft, CheckCircle, Loader2, Award, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import GeneratingAnimation from '@/components/GeneratingAnimation';

export default function QuickQuizSession() {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();
    
    const [session, setSession] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    
    // Evaluation state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [score, setScore] = useState<number | null>(null);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || !router.isReady || !id) return;

        const loadSession = async () => {
            setIsLoading(true);
            try {
                // Fetch Session
                const { data: sessionData, error: sessionErr } = await supabase
                    .from('practice_sessions')
                    .select('*')
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .single();

                if (sessionErr || !sessionData) throw new Error("Session not found");

                setSession(sessionData);

                // Fetch Questions
                const { data: qData, error: qErr } = await supabase
                    .from('practice_responses')
                    .select('*')
                    .eq('practice_session_id', id)
                    .order('question_number', { ascending: true });

                if (qErr || !qData) throw new Error("Failed to load questions");

                setQuestions(qData);

                const initialAnswers: Record<string, string> = {};
                qData.forEach(q => {
                    if (q.user_response) {
                        initialAnswers[q.id] = q.user_response;
                    }
                });
                setAnswers(initialAnswers);

                if (sessionData.status === 'completed') {
                    setIsCompleted(true);
                    setScore(sessionData.overall_performance ? parseInt(sessionData.overall_performance) : 0);
                }

            } catch (err: any) {
                console.error(err);
                toast.error(err.message);
                router.push('/practice');
            } finally {
                setIsLoading(false);
            }
        };

        loadSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, router.isReady, id]);

    const handleAnswerSelect = (option: string) => {
        if (isCompleted) return;
        const qId = questions[currentIndex].id;
        setAnswers(prev => ({ ...prev, [qId]: option }));
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        const currentQId = questions[currentIndex].id;
        if (!answers[currentQId]) {
             toast.error("Please select an answer before submitting.");
             return;
        }

        setIsSubmitting(true);
        try {
            const payloadArray = questions.map(q => ({
                responseId: q.id,
                answer: answers[q.id] || ''
            }));

            const { data: authData } = await supabase.auth.getSession();
            const res = await fetch('/api/practice/quiz/evaluate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authData.session?.access_token}`
                },
                body: JSON.stringify({ sessionId: id, userAnswers: payloadArray })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Fetch the updated questions to get evaluations (is_correct, ai_feedback contains correct answer and explanation)
            const { data: finalQs } = await supabase
                .from('practice_responses')
                .select('*')
                .eq('practice_session_id', id)
                .order('question_number', { ascending: true });
                
            if (finalQs) {
                setQuestions(finalQs);
            }

            setScore(data.sessionScore);
            setIsCompleted(true);
            setCurrentIndex(0); 

        } catch (err: any) {
            toast.error(err.message || 'Failed to submit quiz');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-6">
                <div className="w-full max-w-lg">
                    <p className="text-center text-xl font-display text-[var(--text)] mb-8">Loading your quiz...</p>
                    <GeneratingAnimation type="cards" />
                </div>
            </div>
        );
    }

    if (!session || questions.length === 0) return null;

    const currentQuestion = questions[currentIndex];
    const progressPercent = ((currentIndex + 1) / questions.length) * 100;

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col relative overflow-hidden">
            <Head>
                <title>Quick Quiz | Serify</title>
            </Head>

            {/* Top Navigation */}
            <header className="fixed top-0 inset-x-0 h-16 bg-[var(--surface)] border-b border-[var(--border)] z-20 flex items-center justify-center px-6">
                <div className="flex items-center gap-2">
                    <Zap size={18} className="text-yellow-600" />
                    <span className="font-medium text-[var(--text)]">Quick Quiz</span>
                    <span className="text-[var(--muted)] text-sm ml-2 hidden sm:inline">
                        {session.custom_topic || 'Concept Check'}
                    </span>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="fixed top-16 inset-x-0 h-1 bg-[var(--border)] z-20">
                <div 
                    className="h-full bg-yellow-500 transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            <main className="flex-1 pt-24 pb-32 overflow-y-auto px-4">
                <div className="max-w-2xl mx-auto space-y-8">
                    
                    {isCompleted && currentIndex === 0 && (
                        <div className="bg-white border text-center p-8 rounded-2xl shadow-sm border-[var(--border)] space-y-6 animate-fade-in-up">
                            <div className="w-20 h-20 rounded-full bg-yellow-50 text-yellow-600 mx-auto flex items-center justify-center border-4 border-yellow-100">
                                <Award size={36} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-display text-[var(--text)] tracking-tight">
                                    Quiz Completed
                                </h2>
                                <p className="text-[var(--muted)] mt-2">
                                    You scored <span className="font-semibold text-[var(--text)]">{score}/100</span>
                                </p>
                            </div>

                            <button 
                                onClick={() => router.push('/practice')}
                                className="px-6 py-2 bg-yellow-600 text-white rounded-xl font-medium hover:bg-yellow-700 transition"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    )}

                    <div className="space-y-8 animate-fade-in-up">
                        <div className="flex items-center justify-between">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-800 rounded-full text-xs font-bold uppercase tracking-widest border border-yellow-100">
                                Question {currentIndex + 1} of {questions.length}
                            </div>
                            {isCompleted && (
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${
                                    currentQuestion.response_quality === 'strong' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                                }`}>
                                    {currentQuestion.response_quality === 'strong' ? 'Correct' : 'Incorrect'}
                                </div>
                            )}
                        </div>

                        <h2 className="text-2xl md:text-3xl font-display text-[var(--text)] leading-tight">
                            {currentQuestion.question_text}
                        </h2>

                        <div className="space-y-3">
                            {(currentQuestion.options as string[])?.map((option, idx) => {
                                const isSelected = answers[currentQuestion.id] === option;
                                
                                // In review mode, highlight correct answer vs selected answer
                                let optionStyle = "border-[var(--border)] bg-gray-50/50 hover:bg-gray-50 text-[var(--text)]";
                                
                                if (!isCompleted) {
                                    if (isSelected) {
                                        optionStyle = "border-yellow-500 bg-yellow-50 text-yellow-900 shadow-[0_0_0_1px_rgba(234,179,8,1)]";
                                    }
                                } else {
                                    const fbData = currentQuestion.ai_feedback ? JSON.parse(currentQuestion.ai_feedback) : null;
                                    const isCorrectOpt = fbData && fbData.correctAnswer === option;
                                    
                                    if (isCorrectOpt) {
                                        optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-900";
                                    } else if (isSelected && !isCorrectOpt) {
                                        optionStyle = "border-red-500 bg-red-50 text-red-900";
                                    } else {
                                        optionStyle = "border-[var(--border)] bg-white opacity-60";
                                    }
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswerSelect(option)}
                                        disabled={isCompleted}
                                        className={`w-full text-left p-5 rounded-xl border-2 transition-all ${optionStyle} ${!isCompleted && !isSelected ? 'hover:border-yellow-300' : ''}`}
                                    >
                                        <div className="flex gap-4 items-start">
                                            <div className={`w-6 h-6 rounded-full border flex-shrink-0 flex items-center justify-center mt-0.5 ${
                                                isSelected ? (!isCompleted ? 'border-yellow-500 bg-yellow-500 text-white' : (currentQuestion.response_quality === 'strong' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-red-500 bg-red-500 text-white')) : 'border-gray-300'
                                            }`}>
                                                {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                                {isCompleted && currentQuestion.ai_feedback && JSON.parse(currentQuestion.ai_feedback).correctAnswer === option && !isSelected && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                                            </div>
                                            <span className="text-lg leading-snug">{option}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        
                        {isCompleted && currentQuestion.ai_feedback && (
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex gap-4 mt-6">
                                <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
                                <div className="space-y-2">
                                    <p className="font-semibold text-slate-800">Explanation</p>
                                    <p className="text-slate-700 leading-relaxed text-sm">
                                        {JSON.parse(currentQuestion.ai_feedback).explanation}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-8 border-t border-[var(--border)]">
                            <button
                                onClick={handlePrev}
                                disabled={currentIndex === 0}
                                className="px-5 py-3 flex flex-row-reverse items-center justify-center gap-2 rounded-xl text-[var(--text)] font-medium bg-[var(--surface)] hover:bg-[var(--border)] border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                Previous <ArrowLeft size={18} className="translate-y-px" />
                            </button>

                            <button
                                onClick={handleNext}
                                disabled={isSubmitting || (!answers[currentQuestion.id] && !isCompleted)}
                                className="px-6 py-3 flex items-center justify-center gap-2 rounded-xl text-white font-medium bg-yellow-600 hover:bg-yellow-700 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait transition-all"
                            >
                                {isSubmitting ? (
                                    <><Loader2 size={18} className="animate-spin" /> Next...</>
                                ) : currentIndex === questions.length - 1 ? (
                                    isCompleted ? <><ArrowRight size={18} /> Finish</> : <><CheckCircle size={18} /> Submit Quiz</>
                                ) : (
                                    <>Next <ArrowRight size={18} className="translate-y-px" /></>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
