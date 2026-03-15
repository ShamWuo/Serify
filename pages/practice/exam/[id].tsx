import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Clock, ArrowRight, ArrowLeft, CheckCircle, Loader2, Award, Zap, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExamSession() {
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
    const [results, setResults] = useState<any>(null);

    const [isLoading, setIsLoading] = useState(true);
    
    // Timer state
    const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);

    const textAreaRef = useRef<HTMLTextAreaElement>(null);

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
                    setResults({
                        score: sessionData.overall_performance ? parseInt(sessionData.overall_performance) : 0,
                        ai_summary: sessionData.results || null
                    });
                } else if (sessionData.time_limit_minutes) {
                     // Calculate elapsed time from started_at
                     const startedAt = new Date(sessionData.started_at).getTime();
                     const now = Date.now();
                     const elapsedSeconds = Math.floor((now - startedAt) / 1000);
                     const totalSeconds = sessionData.time_limit_minutes * 60;
                     const remaining = Math.max(0, totalSeconds - elapsedSeconds);
                     setTimeLeftSeconds(remaining);
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

    // Timer effect
    useEffect(() => {
        if (isCompleted || timeLeftSeconds === null || timeLeftSeconds <= 0) return;

        const timer = setInterval(() => {
            setTimeLeftSeconds(prev => {
                if (prev !== null && prev <= 1) {
                    clearInterval(timer);
                    handleSubmit(); // Auto-submit when time is perfectly up
                    return 0;
                }
                return prev ? prev - 1 : 0;
            });
        }, 1000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLeftSeconds, isCompleted]);


    useEffect(() => {
        if (textAreaRef.current && !isCompleted && questions[currentIndex]?.question_type === 'open_ended') {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
        }
    }, [answers, currentIndex, isCompleted, questions]);

    const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const qId = questions[currentIndex].id;
        setAnswers(prev => ({ ...prev, [qId]: e.target.value }));
    };

    const handleMcqSelect = (option: string) => {
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
        if (isSubmitting || isCompleted) return;
        setIsSubmitting(true);
        try {
            const payloadArray = questions.map(q => ({
                questionId: q.id, // Exam submit uses questionId based on our refactor earlier! Wait, actually I rewrote submit.ts: it uses questionId in answers array.
                answer: answers[q.id] || ''
            }));

            // Calculate exact time spent
            const startedAt = new Date(session.started_at).getTime();
            const timeSpentSeconds = Math.floor((Date.now() - startedAt) / 1000);

            const { data: authData } = await supabase.auth.getSession();
            const res = await fetch('/api/practice/exam/submit', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authData.session?.access_token}`
                },
                body: JSON.stringify({ 
                    sessionId: id, 
                    answers: payloadArray,
                    timeSpentSeconds
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Fetch final questions for feedback
            const { data: finalQs } = await supabase
                .from('practice_responses')
                .select('*')
                .eq('practice_session_id', id)
                .order('question_number', { ascending: true });
                
            if (finalQs) {
                setQuestions(finalQs);
            }

            // Refetch session for score
            const { data: finalSession } = await supabase
                .from('practice_sessions')
                .select('*')
                .eq('id', id)
                .single();

            if (finalSession) {
                setResults({
                    score: finalSession.score,
                    ai_summary: finalSession.ai_summary ? JSON.parse(finalSession.ai_summary) : null
                });
            }

            setIsCompleted(true);
            setTimeLeftSeconds(null);
            setCurrentIndex(0); 

        } catch (err: any) {
            toast.error(err.message || 'Failed to submit exam');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <Loader2 size={32} className="text-[var(--accent)] animate-spin" />
            </div>
        );
    }

    if (!session || questions.length === 0) return null;

    const currentQuestion = questions[currentIndex];
    const progressPercent = ((currentIndex + 1) / questions.length) * 100;

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col relative overflow-hidden">
            <Head>
                <title>Timed Exam | Serify</title>
            </Head>

            {/* Top Navigation */}
            <header className="fixed top-0 inset-x-0 h-16 bg-[var(--surface)] border-b border-[var(--border)] z-20 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Clock size={18} className="text-orange-600" />
                        <span className="font-bold text-[var(--text)] tracking-tight">EXAM</span>
                        <span className="text-[var(--muted)] text-sm ml-2 hidden sm:inline uppercase tracking-widest">
                            {session.custom_topic || 'SIMULATION'}
                        </span>
                    </div>
                </div>

                {!isCompleted && (
                    <div className="flex items-center gap-6">
                        <span className="text-sm font-medium text-[var(--muted)]">
                            {currentIndex + 1} of {questions.length}
                        </span>
                        
                        {timeLeftSeconds !== null && (
                            <div className={`px-4 py-1.5 rounded-full font-bold flex items-center gap-2 border shadow-sm ${
                                timeLeftSeconds < 60 ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}>
                                <Clock size={16} /> {formatTime(timeLeftSeconds)}
                            </div>
                        )}
                    </div>
                )}
            </header>

            {/* Progress Bar */}
            <div className="fixed top-16 inset-x-0 h-1 bg-[var(--border)] z-20">
                <div 
                    className="h-full bg-orange-500 transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            <main className="flex-1 pt-24 pb-32 overflow-y-auto px-4">
                <div className="max-w-4xl mx-auto space-y-8">
                    
                    {isCompleted ? (
                        <div className="space-y-10 animate-fade-in-up">
                            {currentIndex === 0 && (
                                <div className="bg-white border text-center p-8 rounded-2xl shadow-sm border-[var(--border)] space-y-6">
                                    <div className="w-20 h-20 rounded-full bg-orange-50 text-orange-600 mx-auto flex items-center justify-center border-4 border-orange-100">
                                        <Award size={36} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-display text-[var(--text)] tracking-tight">
                                            Exam Completed
                                        </h2>
                                        <p className="text-[var(--muted)] mt-2">
                                            Final Score: <span className="font-bold text-xl text-[var(--text)]">{results?.score}/100</span>
                                        </p>
                                    </div>
                                    
                                    {results?.ai_summary?.overallPerformance && (
                                        <div className="text-left bg-slate-50 p-6 rounded-xl border border-slate-200 mt-6">
                                            <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                                <Zap size={18} className="text-orange-500" /> AI Executive Summary
                                            </h4>
                                            <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">
                                                {results.ai_summary.overallPerformance}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex gap-4 justify-center pt-4">
                                        <button 
                                            // TODO: Trigger PDF Export from results
                                            onClick={() => toast.success("PDF report feature coming soon!")}
                                            className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition"
                                        >
                                            Export Report PDF
                                        </button>
                                        <button 
                                            onClick={() => router.push('/practice')}
                                            className="px-6 py-2 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition"
                                        >
                                            Return to Dashboard
                                        </button>
                                    </div>
                                </div>
                            )}

                             {/* Review Questions */}
                             <div className="space-y-6">
                                <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                                    <h3 className="font-display text-xl text-[var(--text)]">
                                        Question Review ({currentIndex + 1}/{questions.length})
                                    </h3>
                                    <div className="flex items-center gap-2">
                                         <button onClick={handlePrev} disabled={currentIndex === 0} className="p-2 border rounded-lg disabled:opacity-50 hover:bg-slate-50"><ArrowLeft size={16}/></button>
                                         <button onClick={() => setCurrentIndex(prev => Math.min(prev + 1, questions.length - 1))} disabled={currentIndex === questions.length - 1} className="p-2 border rounded-lg disabled:opacity-50 hover:bg-slate-50"><ArrowRight size={16}/></button>
                                    </div>
                                </div>

                                <div className="p-6 bg-white border border-[var(--border)] rounded-2xl shadow-sm text-lg text-[var(--text)] leading-relaxed font-serif">
                                    {currentQuestion.question_text}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-slate-500 uppercase tracking-widest text-xs">Your Answer</h4>
                                        <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-[var(--text)] whitespace-pre-wrap text-sm leading-relaxed min-h-[120px]">
                                            {currentQuestion.user_response || <span className="italic text-slate-400">Blank</span>}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-emerald-700 uppercase tracking-widest text-xs flex justify-between items-center">
                                            <span>AI Feedback</span>
                                            <span className="bg-white px-2 py-0.5 rounded border text-slate-600">Rating: <span className="capitalize font-bold">{currentQuestion.response_quality || 'blank'}</span></span>
                                        </h4>
                                        <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-900 leading-relaxed whitespace-pre-wrap text-sm min-h-[120px]">
                                            {currentQuestion.ai_feedback || "No feedback."}
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in-up">
                            
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase tracking-widest border border-slate-200">
                                Question {currentIndex + 1}
                            </div>

                            <h2 className="text-xl md:text-2xl font-serif text-[var(--text)] leading-relaxed">
                                {currentQuestion.question_text}
                            </h2>

                            <div className="pt-4">
                                {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options ? (
                                    <div className="space-y-3">
                                        {(currentQuestion.options as string[]).map((option, idx) => {
                                            const isSelected = answers[currentQuestion.id] === option;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleMcqSelect(option)}
                                                    className={`w-full text-left p-5 rounded-xl border-2 transition-all ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-[var(--border)] bg-gray-50/50 hover:bg-white hover:border-orange-300'}`}
                                                >
                                                    <div className="flex gap-4 items-start">
                                                        <div className={`w-5 h-5 rounded-full border flex-shrink-0 mt-0.5 ${isSelected ? 'border-orange-500 bg-orange-500 border-4' : 'border-slate-300'}`} />
                                                        <span className="text-base text-[var(--text)]">{option}</span>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="relative group">
                                        <textarea
                                            ref={textAreaRef}
                                            value={answers[currentQuestion.id] || ''}
                                            onChange={handleAnswerChange}
                                            placeholder="Compose your final answer..."
                                            className="w-full min-h-[280px] p-6 bg-white border border-[var(--border)] rounded-xl resize-none
                                                    text-base leading-relaxed text-[var(--text)] placeholder-[var(--muted)]
                                                    focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-sm font-serif"
                                        />
                                        <div className="absolute bottom-4 right-4 text-xs font-medium text-[var(--muted)]">
                                            {answers[currentQuestion.id]?.length || 0} characters
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center pt-8 border-t border-[var(--border)]">
                                <button
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="px-5 py-3 flex flex-row-reverse items-center justify-center gap-2 rounded-xl text-[var(--text)] font-medium hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    Prev
                                </button>

                                <button
                                    onClick={handleNext}
                                    disabled={isSubmitting}
                                    className="px-8 py-3 flex items-center justify-center gap-2 rounded-xl text-white font-bold tracking-wide bg-slate-900 hover:bg-black shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait transition-all"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 size={18} className="animate-spin" /> Processing...</>
                                    ) : currentIndex === questions.length - 1 ? (
                                        <><CheckCircle size={18} /> Submit Exam</>
                                    ) : (
                                        <>Next Question</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}
