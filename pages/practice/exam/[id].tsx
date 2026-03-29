import React, { useEffect, useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Clock, ArrowRight, ArrowLeft, CheckCircle, Loader2, Award, Zap, AlertTriangle, FileText, X, BrainCircuit, Target, Layout } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExamSession() {
    const router = useRouter();
    const { id } = router.query;
    const { user, token } = useAuth();
    
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
                        score: sessionData.score || 0,
                        ai_summary: sessionData.ai_summary ? JSON.parse(sessionData.ai_summary) : null
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
    }, [user, router.isReady, id, router]);

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

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

    const handleSubmit = useCallback(async () => {
        if (isSubmitting || isCompleted) return;
        setIsSubmitting(true);
        try {
            const payloadArray = questions.map(q => ({
                questionId: q.id, 
                answer: answers[q.id] || ''
            }));

            const startedAt = new Date(session.started_at).getTime();
            const timeSpentSeconds = Math.floor((Date.now() - startedAt) / 1000);

            const res = await fetch('/api/practice/exam/submit', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
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
                
            if (finalQs) setQuestions(finalQs);

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
    }, [id, token, questions, answers, session, isSubmitting, isCompleted]);

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
    }, [timeLeftSeconds, isCompleted, handleSubmit]);

    useEffect(() => {
        if (textAreaRef.current && !isCompleted && questions[currentIndex]?.question_type === 'open_ended') {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
        }
    }, [answers, currentIndex, isCompleted, questions]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center font-mono">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={32} className="text-orange-600 animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--muted)]">CALIBRATING NEURAL PROVES...</span>
                </div>
            </div>
        );
    }

    if (!session || questions.length === 0) return null;

    const currentQuestion = questions[currentIndex];
    const progressPercent = ((currentIndex + 1) / questions.length) * 100;

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col font-mono text-[var(--text)] relative overflow-hidden">
            <Head>
                <title>Exam Practice | Serify</title>
            </Head>

            {/* Dot Grid Background */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
                 style={{ 
                    backgroundImage: `radial-gradient(circle, var(--ink) 1.5px, transparent 1.5px)`,
                    backgroundSize: `24px 24px`
                 }} 
            />

            {/* Fixed Header */}
            <header className="h-16 bg-[var(--surface)] border-b-2 border-[var(--ink)] z-20 flex items-center justify-between px-6 shrink-0 shadow-hard-sm sticky top-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push('/practice')}
                        className="p-2 border-2 border-transparent hover:border-[var(--ink)] hover:bg-[var(--bg)] transition-all"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-600 text-white flex items-center justify-center shadow-hard-sm border border-black">
                            <Clock size={18} />
                        </div>
                        <div>
                            <span className="font-display font-bold text-[14px] text-[var(--text)] uppercase tracking-tight">EXAM SESSION</span>
                            <div className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-widest leading-none mt-0.5 max-w-[120px] truncate">
                                {session.custom_topic || 'GENERAL SIMULATION'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                     {!isCompleted && timeLeftSeconds !== null && (
                        <div className={`flex items-center gap-3 font-bold ${timeLeftSeconds < 60 ? 'text-red-600 animate-pulse' : 'text-orange-600'}`}>
                            <div className="text-[10px] uppercase tracking-widest hidden sm:block">TIME REMAINING</div>
                            <div className="text-xl px-3 py-1 bg-[var(--bg)] border-2 border-current shadow-hard-sm tabular-nums">
                                {formatTime(timeLeftSeconds)}
                            </div>
                        </div>
                    )}
                    
                    {!isCompleted && (
                        <div className="hidden md:flex items-center gap-4">
                             <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest leading-none">PROGRESS</span>
                                <span className="text-[12px] font-bold text-[var(--text)] leading-none">{currentIndex + 1} / {questions.length}</span>
                             </div>
                             <div className="w-48 h-3 border-2 border-[var(--ink)] bg-[var(--bg)] overflow-hidden relative">
                                <div 
                                    className="absolute inset-y-0 left-0 bg-orange-600 transition-all duration-500 ease-out" 
                                    style={{ width: `${progressPercent}%` }}
                                />
                             </div>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto z-10 p-6 md:p-12 relative">
                <div className="max-w-4xl mx-auto space-y-12 pb-24">
                    
                    {isCompleted ? (
                        <div className="space-y-12 animate-fade-in-up">
                            {/* Summary Card */}
                            <div className="paper-card border-4 p-10 bg-[var(--surface-raised)] relative">
                                <div className="absolute top-4 right-4 washi-tape washi-mastered !bg-green-600 text-white font-black uppercase text-[10px] tracking-widest">
                                    VERIFIED ARTIFACT
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                    <div className="col-span-1 border-r-2 border-dashed border-[var(--border-soft)] pr-10 flex flex-col justify-center items-center text-center">
                                        <div className="w-24 h-24 bg-orange-600 text-white border-2 border-black flex items-center justify-center shadow-hard-lg mb-4">
                                            <Award size={48} />
                                        </div>
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--muted)]">FINAL PERFORMANCE</h2>
                                        <div className="text-6xl font-display font-black text-[var(--text)] tracking-tighter mt-1">
                                            {results?.score}<span className="text-2xl text-[var(--muted)]">/100</span>
                                        </div>
                                    </div>

                                    <div className="col-span-2 space-y-4">
                                        <div className="flex items-center gap-2 text-orange-600">
                                            <Zap size={18} fill="currentColor" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">EXECUTIVE ANALYSIS</span>
                                        </div>
                                        <p className="text-sm text-[var(--text)] leading-relaxed font-bold">
                                            {results?.ai_summary?.overallPerformance || "No executive summary available for this session."}
                                        </p>
                                        
                                        <div className="pt-6 flex flex-wrap gap-4">
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        const res = await fetch('/api/practice/export', {
                                                            method: 'POST',
                                                            headers: { 
                                                                'Content-Type': 'application/json',
                                                                Authorization: `Bearer ${token}`
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
                                                className="btn-primary !py-2 !px-6 !text-xs !bg-[var(--surface)] !text-[var(--text)] hover:!bg-[var(--bg)] shadow-hard-sm"
                                            >
                                                <FileText size={14} /> EXPORT PDF
                                            </button>
                                            <button 
                                                onClick={() => router.push('/practice')}
                                                className="btn-primary !py-2 !px-6 !text-xs !bg-orange-600 shadow-hard-sm"
                                            >
                                                EXIT STATION
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detail List */}
                            <div className="space-y-12 pt-12">
                                <div className="flex items-center gap-4">
                                    <div className="h-0.5 flex-1 bg-[var(--ink)] opacity-10" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--muted)]">PROMPT REVIEW</span>
                                    <div className="h-0.5 flex-1 bg-[var(--ink)] opacity-10" />
                                </div>

                                {questions.map((q, idx) => (
                                    <div key={q.id} className="paper-card border-2 p-8 bg-[var(--surface)] space-y-6 relative overflow-hidden group">
                                        <div className="absolute top-0 right-10 w-24 h-1 bg-orange-600 opacity-20 group-hover:opacity-100 transition-opacity" />
                                        
                                        <div className="flex justify-between items-start gap-6">
                                            <div className="flex-1 space-y-6">
                                                <div className="space-y-2">
                                                    <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest italic">PROMPT 0{q.question_number}</span>
                                                    <h3 className="text-xl font-display font-medium leading-tight text-[var(--text)]">{q.question_text}</h3>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-[var(--muted)]">
                                                            <Target size={14} />
                                                            <span className="text-[9px] font-black uppercase tracking-widest">SUBMISSION</span>
                                                        </div>
                                                        <div className="p-4 bg-[var(--bg)] border-2 border-[var(--border-soft)] text-xs leading-relaxed font-bold italic text-[var(--text)]">
                                                            {q.user_response || <span className="opacity-40">[NO DATA RECORDED]</span>}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-orange-600">
                                                            <BrainCircuit size={14} />
                                                            <span className="text-[9px] font-black uppercase tracking-widest">AI ANALYSIS</span>
                                                        </div>
                                                        <div className="p-4 bg-orange-50 border-2 border-orange-200 text-xs leading-relaxed font-bold text-orange-950">
                                                            {q.ai_feedback || "Analysis pending."}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-center gap-2 pt-2">
                                                 <div className={`w-12 h-12 flex items-center justify-center font-display font-black text-xl border-2 shadow-hard-sm ${
                                                     q.response_quality === 'expert' ? 'bg-green-600 text-white border-black' :
                                                     q.response_quality === 'solid' ? 'bg-orange-500 text-white border-black' :
                                                     'bg-red-600 text-white border-black'
                                                 }`}>
                                                     {q.response_quality?.charAt(0).toUpperCase() || 'F'}
                                                 </div>
                                                 <span className="text-[8px] font-black uppercase tracking-widest opacity-40">GRADE</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-12 animate-fade-in-up">
                            <div className="space-y-6">
                                 <div className="flex items-center gap-3">
                                    <div className="px-2 py-0.5 bg-orange-600 text-white text-[9px] font-black uppercase tracking-[0.2em] border border-black shadow-hard-sm italic">
                                        PROMPT {currentIndex + 1}
                                    </div>
                                    <div className="h-px flex-1 bg-orange-600 opacity-20" />
                                 </div>
                                 <h2 className="text-4xl font-display font-medium tracking-tight text-[var(--text)] leading-tight">
                                    {currentQuestion.question_text}
                                 </h2>
                            </div>

                            <div className="pt-6">
                                {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options ? (
                                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                        {(currentQuestion.options as string[]).map((option, idx) => {
                                            const isSelected = answers[currentQuestion.id] === option;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleMcqSelect(option)}
                                                    className={`w-full text-left p-6 border-4 transition-all flex items-center gap-6 group relative overflow-hidden ${
                                                        isSelected 
                                                        ? 'border-[var(--ink)] bg-[var(--ink)] text-white shadow-hard scale-[1.01] z-10' 
                                                        : 'border-[var(--border-soft)] bg-[var(--surface)] hover:border-[var(--ink)] hover:translate-x-1'
                                                    }`}
                                                >
                                                    <div className={`w-10 h-10 border-2 shrink-0 flex items-center justify-center font-display font-black text-lg transition-all ${
                                                        isSelected ? 'border-white bg-white/20 text-white' : 'border-[var(--ink)] text-[var(--ink)] opacity-40'
                                                    }`}>
                                                        {String.fromCharCode(65 + idx)}
                                                    </div>
                                                    <span className={`text-lg font-bold leading-tight flex-1 ${isSelected ? 'text-white' : 'text-[var(--text)]'}`}>
                                                        {option}
                                                    </span>
                                                    {isSelected && <Zap size={20} className="text-orange-400 fill-orange-400" />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="relative group">
                                        <div className="absolute top-0 right-10 washi-tape washi-revisit !bg-[var(--ink)] text-white font-black uppercase tracking-widest text-[9px] z-10">
                                            RESPONSE CONSOLE
                                        </div>
                                        <textarea
                                            ref={textAreaRef}
                                            value={answers[currentQuestion.id] || ''}
                                            onChange={handleAnswerChange}
                                            placeholder="Awaiting technical elaboration..."
                                            className="feynman-textarea w-full min-h-[350px] p-10 bg-[var(--surface-raised)] border-4 border-[var(--ink)] 
                                                     text-lg leading-loose text-[var(--text)] placeholder-[var(--muted)]/20 shadow-hard
                                                     focus:outline-none focus:scale-[1.005] transition-transform font-bold italic"
                                        />
                                        <div className="absolute bottom-6 right-8 text-[10px] font-black text-[var(--muted)]/50 uppercase tracking-[0.3em]">
                                            [ SIGNAL QUALITY: {answers[currentQuestion.id]?.length > 20 ? 'HIGH' : 'UNSTABLE'} ]
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center pt-12 border-t-4 border-dotted border-[var(--border-soft)]">
                                <button
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="px-8 py-3 flex items-center gap-3 border-2 border-transparent hover:border-[var(--ink)] text-[var(--muted)] font-black text-xs uppercase tracking-widest transition-all disabled:opacity-0"
                                >
                                    <ArrowLeft size={16} /> PREVIOUS_STEP
                                </button>

                                <button
                                    onClick={handleNext}
                                    disabled={isSubmitting}
                                    className="px-12 py-4 bg-orange-600 text-white font-black text-sm uppercase tracking-[0.2em] border-2 border-black shadow-hard hover:shadow-hard-lg hover:-translate-y-1 active:translate-y-0 active:shadow-hard transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-wait ring-offset-4 ring-orange-600/10 focus:ring-4"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 size={18} className="animate-spin" /> SYNCHRONIZING...</>
                                    ) : currentIndex === questions.length - 1 ? (
                                        <><CheckCircle size={18} /> COMPLETE_SIMULATION</>
                                    ) : (
                                        <>NEXT_PROMPT <ArrowRight size={18} /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </main>

            {/* Footer Status Bar */}
            <footer className="h-10 bg-[var(--surface)] border-t-2 border-[var(--ink)] shrink-0 flex items-center justify-between px-6 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--muted)] z-20">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> SYSTEM_STABLE</span>
                    <span className="opacity-40">|</span>
                    <span>ENCRYPTION_ACTIVE</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>{new Date().toLocaleTimeString()}</span>
                    <span className="opacity-40">|</span>
                    <span>SESSION_ID: {id?.toString().substring(0, 8).toUpperCase()}</span>
                </div>
            </footer>
        </div>
    );
}
