import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Zap, ArrowRight, ArrowLeft, CheckCircle, Loader2, Award, Info, Target, Timer, BarChart3, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

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
    }, [user, router.isReady, id, router]);

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
            <div className="min-h-screen bg-[var(--bg)] bg-dot-grid flex flex-col items-center justify-center p-6 text-center">
                <div className="space-y-4">
                    <Loader2 size={40} className="animate-spin text-[var(--accent)] mx-auto" />
                    <p className="text-sm font-mono text-[var(--muted)] uppercase tracking-widest">Initialising Quiz Protocol...</p>
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
        <div className="min-h-screen bg-[var(--bg)] bg-dot-grid flex flex-col relative overflow-hidden font-sans">
            <Head>
                <title>MCQ Session | Serify</title>
            </Head>

            {/* Technical Header */}
            <header className="sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur-md border-b border-[var(--border)] px-4 py-3 md:px-8">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => router.push('/practice')}
                            className="p-2 hover:bg-[var(--surface)] rounded-lg transition-colors border border-transparent hover:border-[var(--border)]"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-tighter flex items-center gap-2">
                                <Zap size={14} className="text-[var(--accent)]" />
                                Quick Quiz Protocol
                            </h1>
                            <p className="text-[10px] font-mono text-[var(--muted)] leading-none uppercase tracking-widest">
                                {`ID: ${id?.toString().slice(0, 8)} // Session Active`}
                            </p>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-6">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-widest">Progress</span>
                            <span className="text-xs font-black">{currentIndex + 1} / {questions.length}</span>
                        </div>
                        <div className="w-32 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-[var(--accent)] transition-all duration-500 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
                <div className="max-w-3xl mx-auto">
                    {isCompleted && currentIndex === 0 ? (
                        /* Results Summary */
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                             <div className="paper-card p-10 text-center border-t-4 border-t-[var(--accent)]">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] mb-6 shadow-glow">
                                    <Award size={40} />
                                </div>
                                <h2 className="text-4xl font-black tracking-tighter mb-2 font-display uppercase">Protocol Complete</h2>
                                <p className="text-[var(--muted)] font-mono text-sm uppercase tracking-widest mb-8">Performance Analysis Summary</p>
                                
                                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-10">
                                    <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                                        <p className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-widest mb-1">Final Score</p>
                                        <p className="text-3xl font-black text-[var(--accent)]">{score}%</p>
                                    </div>
                                    <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                                        <p className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-widest mb-1">Status</p>
                                        <p className="text-xl font-black uppercase tracking-tighter pt-1">
                                            {(score ?? 0) >= 70 ? 'Optimal' : 'Developing'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <button 
                                        onClick={() => router.push('/practice')}
                                        className="px-8 py-3 bg-[var(--text)] text-[var(--bg)] rounded-xl font-bold hover:opacity-90 transition-all shadow-hard active:translate-y-1 active:shadow-none"
                                    >
                                        Return to Workshop
                                    </button>
                                    <button 
                                        onClick={() => router.reload()}
                                        className="px-8 py-3 bg-[var(--bg)] border-2 border-[var(--text)] text-[var(--text)] rounded-xl font-bold hover:bg-[var(--surface)] transition-all"
                                    >
                                        Retry Protocol
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Active Session */
                        <div className="space-y-8">
                            <div className="flex items-center justify-between mb-4">
                                <div className="washi-tape bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20 px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-[0.2em]">
                                    Module {currentIndex + 1}
                                </div>
                                {(showFeedback || isCompleted) && isAnswered && (
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] border ${
                                        isCorrect ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                    }`}>
                                        {isCorrect ? '✓ Verified' : '✗ Misalignment'}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                {currentQuestion.target_concept && (
                                    <p className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-[0.3em] flex items-center gap-2">
                                        <Target size={12} />
                                        Vector: {getConceptName(currentQuestion.target_concept)}
                                    </p>
                                )}
                                <h2 className="text-2xl md:text-3xl font-display font-black text-[var(--text)] leading-tight tracking-tight">
                                    {currentQuestion.question_text}
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 gap-4 pt-4">
                                {(currentQuestion.options as string[])?.map((option, idx) => {
                                    const isSelected = answers[currentQuestion.id] === option;
                                    const isCorrectOpt = fbData && fbData.expected_answer === option;
                                    
                                    let optionStyle = "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)] hover:bg-[var(--surface)]";
                                    let indicatorStyle = "border-[var(--border)] text-[var(--muted)]";
                                    
                                    if (!showFeedback && !isCompleted) {
                                        if (isSelected) {
                                            optionStyle = "border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]";
                                            indicatorStyle = "bg-[var(--accent)] border-[var(--accent)] text-white";
                                        }
                                    } else {
                                        if (isCorrectOpt) {
                                            optionStyle = "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500";
                                            indicatorStyle = "bg-emerald-500 border-emerald-500 text-white";
                                        } else if (isSelected && !isCorrectOpt) {
                                            optionStyle = "border-red-500 bg-red-500/5 ring-1 ring-red-500";
                                            indicatorStyle = "bg-red-500 border-red-500 text-white";
                                        } else {
                                            optionStyle = "border-[var(--border)] bg-[var(--bg)] opacity-40";
                                            indicatorStyle = "border-[var(--border)] text-[var(--muted)] opacity-50";
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswerSelect(option)}
                                            disabled={isCompleted || showFeedback}
                                            className={`paper-card group flex items-center gap-4 w-full p-5 text-left transition-all duration-200 ${optionStyle} ${!isCompleted && !showFeedback && !isSelected ? 'hover:-translate-y-1 hover:shadow-hard' : ''}`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-black transition-all shrink-0 font-mono ${indicatorStyle}`}>
                                                {String.fromCharCode(65 + idx)}
                                            </div>
                                            <span className="flex-1 font-medium text-[15px] leading-snug">{option}</span>
                                            {isCorrectOpt && (showFeedback || isCompleted) && (
                                                <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 scale-110">
                                                    <CheckCircle size={16} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {(showFeedback || isCompleted) && fbData?.explanation && (
                                <div className="paper-card bg-[var(--surface)] p-6 border-l-4 border-l-blue-500 animate-in fade-in slide-in-from-left-2 transition-all">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                            <Info className="text-blue-500" size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/70 mb-1">Intelligence Insight</h4>
                                            <p className="text-sm leading-relaxed text-[var(--text)] font-medium">
                                                {fbData.explanation}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Footer Navigation */}
                            <div className="flex h-16 items-center justify-between mt-12 pt-8 border-t border-[var(--border)]">
                                <button
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0 || isSubmitting}
                                    className="px-4 py-2 flex items-center gap-2 rounded-lg text-[var(--muted)] font-bold text-xs hover:text-[var(--text)] hover:bg-[var(--surface)] transition-all disabled:opacity-0"
                                >
                                    <ArrowLeft size={16} /> Previous
                                </button>

                                <button
                                    onClick={handleNext}
                                    disabled={isSubmitting || (!isAnswered && !isCompleted)}
                                    className="px-8 py-3 flex items-center justify-center gap-3 rounded-xl text-[var(--bg)] font-black uppercase tracking-widest text-[10px] bg-[var(--text)] hover:opacity-90 shadow-hard active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-wait"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 size={16} className="animate-spin" /> Analyzing</>
                                    ) : currentIndex === questions.length - 1 ? (
                                        isCompleted ? 'Finalise' : <><CheckCircle size={16} /> Submit</>
                                    ) : (
                                        <>Next <ArrowRight size={16} /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Background Architecture */}
            <div className="fixed bottom-4 left-4 pointer-events-none opacity-20 hidden lg:block">
                <div className="flex flex-col gap-1">
                    <div className="h-px w-32 bg-[var(--border)]" />
                    <div className="h-px w-24 bg-[var(--border)]" />
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--muted)] pt-2">Blueprint V2 // QC-101</span>
                </div>
            </div>
        </div>
    );
}
