import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Clock, ArrowRight, ArrowLeft, CheckCircle, Loader2, Award, Zap, AlertTriangle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExamSession() {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();
    
    const [session, setSession] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [results, setResults] = useState<any>(null);

    const [isLoading, setIsLoading] = useState(true);
    
    
    const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);

    const textAreaRef = useRef<HTMLTextAreaElement>(null);

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

    
    useEffect(() => {
        if (isCompleted || timeLeftSeconds === null || timeLeftSeconds <= 0) return;

        const timer = setInterval(() => {
            setTimeLeftSeconds(prev => {
                if (prev !== null && prev <= 1) {
                    clearInterval(timer);
                    handleSubmit(); 
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
                questionId: q.id, 
                answer: answers[q.id] || ''
            }));

            
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

            
            const { data: finalQs } = await supabase
                .from('practice_responses')
                .select('*')
                .eq('practice_session_id', id)
                .order('question_number', { ascending: true });
                
            if (finalQs) {
                setQuestions(finalQs);
            }

            
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

            {}
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

            {}
            <div className="fixed top-16 inset-x-0 h-1 bg-[var(--border)] z-20">
                <div 
                    className="h-full bg-orange-500 transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            <main className="flex-1 pt-20 pb-24 overflow-y-auto px-4 md:px-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    
                    {isCompleted ? (
                        <div className="space-y-10 animate-fade-in-up">
                            {currentIndex === 0 && (
                                <div className="bg-white border text-center p-8 rounded-3xl shadow-sm border-[var(--border)] space-y-6">
                                    <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-600 mx-auto flex items-center justify-center border-4 border-orange-100">
                                        <Award size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-display text-[var(--text)] tracking-tight">
                                            Exam Completed
                                        </h2>
                                        <p className="text-[var(--muted)] mt-1">
                                            Final Score: <span className="font-bold text-xl text-[var(--text)]">{results?.score}/100</span>
                                        </p>
                                    </div>
                                    
                                    {results?.ai_summary?.overallPerformance && (
                                        <div className="text-left bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-6">
                                            <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                                <Zap size={14} className="text-orange-500" /> Executive Analysis
                                            </h4>
                                            <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap font-medium">
                                                {results.ai_summary.overallPerformance}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex gap-4 justify-center pt-4">
                                        <button 
                                            onClick={async () => {
                                                try {
                                                    const { data: authData } = await supabase.auth.getSession();
                                                    const res = await fetch('/api/practice/export', {
                                                        method: 'POST',
                                                        headers: { 
                                                            'Content-Type': 'application/json',
                                                            Authorization: `Bearer ${authData.session?.access_token}`
                                                        },
                                                        body: JSON.stringify({ sessionId: id, answerSpace: 'medium' })
                                                    });
                                                    const data = await res.json();
                                                    if (data.html) {
                                                        const printWindow = window.open('', '_blank');
                                                        if (printWindow) {
                                                            printWindow.document.write(data.html);
                                                            printWindow.document.close();
                                                            printWindow.print();
                                                        }
                                                    }
                                                } catch (err) {
                                                    toast.error("Failed to generate export");
                                                }
                                            }}
                                            className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition flex items-center gap-2"
                                        >
                                            <FileText size={16} /> PDF Report
                                        </button>
                                        <button 
                                            onClick={() => router.push('/practice')}
                                            className="px-6 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition shadow-lg shadow-orange-600/20"
                                        >
                                            Return to Dashboard
                                        </button>
                                    </div>
                                </div>
                            )}

                             {}
                             <div className="space-y-6">
                                <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                                    <h3 className="font-display text-lg text-[var(--text)]">
                                        Reviewing: {currentIndex + 1}/{questions.length}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                         <button onClick={handlePrev} disabled={currentIndex === 0} className="p-2 border rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-all"><ArrowLeft size={16}/></button>
                                         <button onClick={() => setCurrentIndex(prev => Math.min(prev + 1, questions.length - 1))} disabled={currentIndex === questions.length - 1} className="p-2 border rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-all"><ArrowRight size={16}/></button>
                                    </div>
                                </div>

                                <div className="p-6 bg-white border border-[var(--border)] rounded-2xl shadow-sm text-lg text-[var(--text)] leading-relaxed font-serif">
                                    {currentQuestion.question_text}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <h4 className="font-black text-slate-400 uppercase tracking-[0.2em] text-[9px]">Your Submission</h4>
                                        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-[var(--text)] whitespace-pre-wrap text-sm leading-relaxed min-h-[100px]">
                                            {currentQuestion.user_response || <span className="italic text-slate-400 opacity-50">No response provided</span>}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-black text-orange-600 uppercase tracking-[0.2em] text-[9px] flex justify-between items-center">
                                            <span>AI Feedback</span>
                                            <span className="bg-white px-2 py-0.5 rounded border border-orange-100 text-orange-700">Level: <span className="capitalize font-black">{currentQuestion.response_quality || 'N/A'}</span></span>
                                        </h4>
                                        <div className="p-5 bg-orange-50/50 border border-orange-100 rounded-2xl text-orange-950 leading-relaxed whitespace-pre-wrap text-sm min-h-[100px] font-medium">
                                            {currentQuestion.ai_feedback || "No feedback generated."}
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in-up">
                            
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-700 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border border-orange-100">
                                Simulation Item {currentIndex + 1}
                            </div>

                            <h2 className="text-xl md:text-2xl font-serif text-[var(--text)] leading-relaxed max-w-3xl">
                                {currentQuestion.question_text}
                            </h2>

                            <div className="pt-2">
                                {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {(currentQuestion.options as string[]).map((option, idx) => {
                                            const isSelected = answers[currentQuestion.id] === option;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleMcqSelect(option)}
                                                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3 group relative overflow-hidden ${isSelected ? 'border-orange-500 bg-orange-50/50 shadow-md ring-4 ring-orange-500/5' : 'border-[var(--border)] bg-[var(--surface)] hover:border-orange-300 hover:-translate-y-0.5'}`}
                                                >
                                                    <div className={`w-8 h-8 rounded-xl border-2 shrink-0 flex items-center justify-center text-[11px] font-black transition-all ${isSelected ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-200 text-slate-400 group-hover:border-orange-400 group-hover:text-orange-600'}`}>
                                                        {String.fromCharCode(65 + idx)}
                                                    </div>
                                                    <span className={`text-[15px] font-medium leading-tight flex-1 ${isSelected ? 'text-orange-900' : 'text-[var(--text)]'}`}>{option}</span>
                                                    {isSelected && (
                                                        <CheckCircle size={18} className="text-orange-600 shrink-0" />
                                                    )}
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
                                            className="w-full min-h-[220px] p-6 bg-white border-2 border-[var(--border)] rounded-2xl resize-none
                                                    text-base leading-relaxed text-[var(--text)] placeholder-[var(--muted)]/40
                                                    focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all shadow-sm font-serif"
                                        />
                                        <div className="absolute bottom-4 right-6 text-[10px] font-black text-[var(--muted)]/50 uppercase tracking-widest">
                                            {answers[currentQuestion.id]?.length || 0} CHRS
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center pt-6 border-t border-[var(--border)]">
                                <button
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="px-5 py-2.5 flex items-center gap-2 rounded-xl text-[var(--muted)] font-bold text-sm hover:text-[var(--text)] hover:bg-[var(--surface)] transition-all disabled:opacity-0"
                                >
                                    <ArrowLeft size={16} /> Previous
                                </button>

                                <button
                                    onClick={handleNext}
                                    disabled={isSubmitting}
                                    className="px-8 py-2.5 flex items-center justify-center gap-2 rounded-xl text-white font-bold text-sm bg-slate-900 hover:bg-black shadow-lg shadow-slate-900/10 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait transition-all"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 size={18} className="animate-spin" /> Finalizing...</>
                                    ) : currentIndex === questions.length - 1 ? (
                                        <><CheckCircle size={18} /> Submit Exam</>
                                    ) : (
                                        <>Next Question <ArrowRight size={18} /></>
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
