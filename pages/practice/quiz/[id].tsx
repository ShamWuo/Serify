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
    
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [score, setScore] = useState<number | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [concepts, setConcepts] = useState<any[]>([]);
    const [showFeedback, setShowFeedback] = useState(false);

    useEffect(() => {
        if (!user || !router.isReady || !id) return;

        const loadSession = async () => {
            setIsLoading(true);
            try {
                
                const { data: sessionData, error: sessionErr } = await supabase
                    .from('practice_sessions')
                    .select('*')
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .single();

                if (sessionErr || !sessionData) throw new Error("Session not found");

                setSession(sessionData);

                
                const { data: qData, error: qErr } = await supabase
                    .from('practice_responses')
                    .select('*')
                    .eq('practice_session_id', id)
                    .order('question_number', { ascending: true });

                if (qErr || !qData) throw new Error("Failed to load questions");

                
                const processedQuestions = qData.map(q => {
                    const feedback = q.ai_feedback ? JSON.parse(q.ai_feedback) : {};
                    return {
                        ...q,
                        options: feedback.options || []
                    };
                });

                setQuestions(processedQuestions);

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

                
                const stored = localStorage.getItem('serify_last_quiz_concepts');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        setConcepts(parsed);
                    } catch (e) { }
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
        if (isCompleted || showFeedback) return;
        const qId = questions[currentIndex].id;
        setAnswers(prev => ({ ...prev, [qId]: option }));
        setShowFeedback(true);
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setShowFeedback(false);
        } else {
            handleSubmit();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            
            
            setShowFeedback(!!answers[questions[currentIndex-1].id]);
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

            
            const { data: finalQs } = await supabase
                .from('practice_responses')
                .select('*')
                .eq('practice_session_id', id)
                .order('question_number', { ascending: true });
                
            if (finalQs) {
                const processedFinal = finalQs.map(q => {
                    const feedback = q.ai_feedback ? JSON.parse(q.ai_feedback) : {};
                    return {
                        ...q,
                        options: feedback.options || []
                    };
                });
                setQuestions(processedFinal);
            }

            setScore(data.score);
            setIsCompleted(true);
            setCurrentIndex(0); 
            setShowFeedback(true);

        } catch (err: any) {
            toast.error(err.message || 'Failed to submit quiz');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-6 text-center">
                <div className="w-full max-w-lg space-y-8">
                    <p className="text-xl font-display text-[var(--text)]">Loading your session...</p>
                    <Loader2 size={40} className="animate-spin text-yellow-500 mx-auto" />
                </div>
            </div>
        );
    }

    if (!session || questions.length === 0) return null;

    const currentQuestion = questions[currentIndex];
    const progressPercent = ((currentIndex + 1) / questions.length) * 100;
    const fbData = currentQuestion.ai_feedback ? JSON.parse(currentQuestion.ai_feedback) : null;
    const isAnswered = !!answers[currentQuestion.id];
    const isCorrect = isAnswered && fbData && (answers[currentQuestion.id] === fbData.expected_answer);

    const getConceptName = (id: string) => {
        const c = concepts.find((c) => c.id === id);
        return c ? (c.display_name || c.name) : 'Concept';
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col relative overflow-hidden">
            <Head>
                <title>MCQ Session | Serify</title>
            </Head>

            {/* Minimalist Progress Bar */}
            <div className="fixed top-0 inset-x-0 h-1.5 bg-[var(--border)] z-50">
                <div 
                    className="h-full bg-yellow-500 transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            <main className="flex-1 pt-8 pb-24 overflow-y-auto px-4 md:px-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    
                    {isCompleted && currentIndex === 0 && (
                        <div className="bg-white border text-center p-8 rounded-3xl shadow-sm border-[var(--border)] space-y-6 animate-fade-in-up">
                            <div className="w-16 h-16 rounded-full bg-yellow-50 text-yellow-600 mx-auto flex items-center justify-center border-4 border-yellow-100">
                                <Award size={28} />
                            </div>
                            <div className="flex flex-col gap-1 items-center">
                                <span className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-wider">Protocol Complete // Knowledge Secured</span>
                                <p className="text-[var(--muted)] mt-1">
                                    You scored <span className="font-bold text-[var(--text)] text-lg">{score}/100</span>
                                </p>
                            </div>

                            <button 
                                onClick={() => router.push('/practice')}
                                className="px-8 py-2.5 bg-yellow-600 text-white rounded-xl font-bold hover:bg-yellow-700 transition-all shadow-md shadow-yellow-600/20"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    )}

                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex items-center justify-between">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-800 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] border border-yellow-100">
                                Question {currentIndex + 1} of {questions.length}
                            </div>
                            {(showFeedback || isCompleted) && isAnswered && (
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] border ${
                                    isCorrect ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                                }`}>
                                    {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                             {currentQuestion.target_concept && (
                                 <p className="text-[10px] font-black text-yellow-700/50 uppercase tracking-[0.2em]">
                                     Focus Area: {getConceptName(currentQuestion.target_concept)}
                                 </p>
                             )}
                            <h2 className="text-xl md:text-2xl font-display text-[var(--text)] leading-tight max-w-3xl">
                                {currentQuestion.question_text}
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(currentQuestion.options as string[])?.map((option, idx) => {
                                const isSelected = answers[currentQuestion.id] === option;
                                const isCorrectOpt = fbData && fbData.expected_answer === option;
                                
                                let optionStyle = "border-[var(--border)] bg-[var(--surface)] hover:border-yellow-300 text-[var(--text)]";
                                
                                if (!showFeedback && !isCompleted) {
                                    if (isSelected) {
                                        optionStyle = "border-yellow-500 bg-yellow-50/50 text-yellow-900 shadow-[0_0_0_1px_rgba(234,179,8,1)]";
                                    }
                                } else {
                                    if (isCorrectOpt) {
                                        optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-900";
                                    } else if (isSelected && !isCorrectOpt) {
                                        optionStyle = "border-red-500 bg-red-50 text-red-900";
                                    } else {
                                        optionStyle = "border-[var(--border)] bg-white opacity-40 grayscale";
                                    }
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswerSelect(option)}
                                        disabled={isCompleted || showFeedback}
                                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 group relative overflow-hidden ${optionStyle} ${!isCompleted && !showFeedback && !isSelected ? 'hover:-translate-y-0.5 hover:shadow-md' : ''}`}
                                    >
                                        <div className="flex gap-3 items-center">
                                            <div className={`w-8 h-8 rounded-xl border-2 shrink-0 flex items-center justify-center text-xs font-black transition-all ${
                                                isSelected ? (!showFeedback && !isCompleted ? 'border-yellow-500 bg-yellow-500 text-white' : (isCorrectOpt ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-red-500 bg-red-500 text-white')) : 
                                                (isCorrectOpt && (showFeedback || isCompleted) ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 text-slate-400 group-hover:border-yellow-400 group-hover:text-yellow-600')
                                            }`}>
                                                {String.fromCharCode(65 + idx)}
                                            </div>
                                            <span className="text-[15px] leading-tight font-medium flex-1">{option}</span>
                                            {isCorrectOpt && (showFeedback || isCompleted) && (
                                                <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        
                        {(showFeedback || isCompleted) && fbData?.explanation && (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex gap-3 mt-4 animate-fade-in-up">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                    <Info className="text-blue-500" size={16} />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Learning Insight</p>
                                    <p className="text-slate-700 leading-relaxed text-[13.5px] font-medium">
                                        {fbData.explanation}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-6 border-t border-[var(--border)]">
                            <button
                                onClick={handlePrev}
                                disabled={currentIndex === 0 || isSubmitting}
                                className="px-5 py-2.5 flex items-center gap-2 rounded-xl text-[var(--muted)] font-bold text-sm hover:text-[var(--text)] hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border)] disabled:opacity-0 transition-all"
                            >
                                <ArrowLeft size={16} /> Previous
                            </button>

                            <button
                                onClick={handleNext}
                                disabled={isSubmitting || (!isAnswered && !isCompleted)}
                                className="px-8 py-2.5 flex items-center justify-center gap-2 rounded-xl text-white font-bold text-sm bg-yellow-600 hover:bg-yellow-700 shadow-lg shadow-yellow-600/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait transition-all"
                            >
                                {isSubmitting ? (
                                    <><Loader2 size={16} className="animate-spin" /> Analyzing...</>
                                ) : currentIndex === questions.length - 1 ? (
                                    isCompleted ? 'Finish Quiz' : <><CheckCircle size={16} /> Submit Quiz</>
                                ) : (
                                    <>Continue <ArrowRight size={16} /></>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
