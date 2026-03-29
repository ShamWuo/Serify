import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Target, ArrowRight, ArrowLeft, CheckCircle, Loader2, Award, Zap, AlertTriangle, RefreshCw, X, Sparkles, FileText, BrainCircuit } from 'lucide-react';
import toast from 'react-hot-toast';
import GeneratingAnimation from '@/components/GeneratingAnimation';

interface ReviewFeedback {
    score: string;
    feedback: string;
}

export default function PracticeTestSession() {
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
                        ai_summary: sessionData.results ? (typeof sessionData.results === 'string' ? JSON.parse(sessionData.results) : sessionData.results) : null
                    });
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
        if (textAreaRef.current && !isCompleted) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
        }
    }, [answers, currentIndex, isCompleted]);

    const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const qId = questions[currentIndex].id;
        setAnswers(prev => ({ ...prev, [qId]: e.target.value }));
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
        setIsSubmitting(true);
        try {
            const payloadArray = questions.map(q => ({
                responseId: q.id,
                answer: answers[q.id] || ''
            }));

            const { data: authData } = await supabase.auth.getSession();
            const res = await fetch('/api/practice/test/evaluate', {
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
                setQuestions(finalQs);
            }

            setResults({
                score: data.score,
                ai_summary: {
                    overallPerformance: data.overallPerformance,
                    focusSuggestions: data.focusSuggestions
                }
            });
            setIsCompleted(true);
            setCurrentIndex(0); 

        } catch (err: any) {
            toast.error(err.message || 'Failed to submit test');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-6">
                <div className="w-full max-w-2xl text-center space-y-8">
                     <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">{'//'} Accessing Repository</p>
                    <h1 className="text-3xl font-display font-bold text-[var(--text)]">Loading SAQ Session...</h1>
                    <GeneratingAnimation type="exam" />
                </div>
            </div>
        );
    }

    if (!session || questions.length === 0) return null;

    const currentQuestion = questions[currentIndex];
    const progressPercent = ((currentIndex + 1) / questions.length) * 100;

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col relative overflow-hidden font-mono text-[var(--text)]">
            <Head>
                <title>SAQ Session | Serify</title>
            </Head>

            {/* Dot Grid Layer */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
                 style={{ 
                    backgroundImage: `radial-gradient(circle, var(--ink) 1.5px, transparent 1.5px)`,
                    backgroundSize: `24px 24px`
                 }} 
            />

            {/* Navigation Header */}
            <header className="fixed top-0 inset-x-0 h-16 bg-[var(--surface)] border-b-2 border-[var(--ink)] z-20 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push('/practice')}
                        className="p-2 border-2 border-transparent hover:border-[var(--ink)] hover:bg-[var(--bg)] transition-all"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--ink)] text-[var(--bg)] flex items-center justify-center shadow-hard-sm">
                            <Target size={18} />
                        </div>
                        <div>
                            <span className="font-display font-bold text-[14px] text-[var(--text)] uppercase tracking-tight">SAQ SESSION</span>
                            <div className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-widest leading-none mt-0.5">
                                {session.custom_topic || 'Diagnostic Assessment'}
                            </div>
                        </div>
                    </div>
                </div>

                {!isCompleted && (
                    <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-[var(--bg)] border-2 border-[var(--ink)] shadow-hard-sm text-[10px] font-bold">
                            {currentIndex + 1} / {questions.length} ITEM
                        </div>
                    </div>
                )}
            </header>

            {/* Progress Bar (Architect's Style) */}
            <div className="fixed top-16 inset-x-0 h-4 bg-[var(--surface)] border-b-2 border-[var(--ink)] z-20">
                <div className="h-full bg-[var(--accent)] border-r-2 border-[var(--ink)] transition-all duration-500 ease-out"
                     style={{ width: `${progressPercent}%` }} />
                <div className="absolute top-0 right-0 h-full flex items-center px-2 pointer-events-none">
                    <span className="text-[10px] font-bold text-[var(--ink)]">{Math.round(progressPercent)}%</span>
                </div>
            </div>

            <main className="flex-1 pt-32 pb-32 overflow-y-auto px-4 relative z-10">
                <div className="max-w-4xl mx-auto">
                    
                    {isCompleted ? (
                        <div className="space-y-12 animate-fade-in-up">
                            {/* RESULTS SUMMARY CARD */}
                            {currentIndex === 0 && (
                                <div className="paper-card border-4 p-10 space-y-8 bg-[var(--surface-raised)]">
                                    <div className="flex flex-col md:flex-row items-center gap-10">
                                        <div className="relative">
                                            <div className="w-32 h-32 rounded-full border-4 border-[var(--ink)] flex flex-col items-center justify-center shadow-hard bg-[var(--bg)]">
                                                <span className="text-3xl font-display font-bold leading-none">{results?.score}</span>
                                                <span className="text-[10px] uppercase font-bold text-[var(--muted)] mt-1">PERCENT</span>
                                            </div>
                                            <Award size={32} className="absolute -top-2 -right-2 text-[var(--accent)]" />
                                        </div>
                                        
                                        <div className="flex-1 space-y-4 text-center md:text-left">
                                            <div className="space-y-1">
                                                <h1 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.3em]">Neural Recalibration Summary</h1>
                                                <h2 className="text-4xl font-display font-bold text-[var(--text)]">Session Finalized</h2>
                                            </div>
                                            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                                <div className="washi-tape washi-solid font-bold">
                                                    Performance: {results?.ai_summary?.overallPerformance || 'Evaluating'}
                                                </div>
                                                <div className="washi-tape washi-developing font-bold">
                                                    Concepts Tracked: {questions.length}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {results?.ai_summary?.focusSuggestions?.length > 0 && (
                                        <div className="bg-[var(--bg)] border-2 border-[var(--ink)] p-6 shadow-hard-sm">
                                            <div className="flex items-center gap-2 mb-4 border-b-2 border-[var(--ink)] pb-2">
                                                <Zap size={16} className="text-[var(--accent)]" />
                                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text)]">Focus Trajectories</h4>
                                            </div>
                                            <ul className="space-y-3">
                                                {results.ai_summary.focusSuggestions.map((sug: string, i: number) => (
                                                    <li key={i} className="flex gap-4 text-sm leading-relaxed">
                                                        <span className="text-[var(--accent)] font-bold">[{i+1}]</span>
                                                        <span className="text-[var(--text)] font-medium italic">{sug}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-4 pt-4 border-t-2 border-dashed border-[var(--border-soft)]">
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
                                                        body: JSON.stringify({ sessionId: id, answerSpace: 'none' })
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
                                            className="btn-secondary flex-1"
                                        >
                                            <FileText size={18} /> EXPORT DOCUMENT
                                        </button>
                                        <button 
                                            onClick={() => router.push('/practice')}
                                            className="btn-primary flex-1"
                                        >
                                            RETURN TO ARENA <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* REVIEW NAVIGATION */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b-4 border-[var(--ink)] pb-4">
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-display font-bold text-[var(--text)] uppercase tracking-tight">
                                            REVIEW: ITEM {currentIndex + 1}
                                        </h3>
                                        <p className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-widest opacity-60">Verification Stage</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                         <button onClick={handlePrev} disabled={currentIndex === 0} className="p-3 border-2 border-[var(--ink)] bg-[var(--surface)] shadow-hard-sm disabled:opacity-20 transition-all hover:-translate-y-0.5 active:translate-y-0.5"><ArrowLeft size={18}/></button>
                                         <button onClick={() => setCurrentIndex(prev => Math.min(prev + 1, questions.length - 1))} disabled={currentIndex === questions.length - 1} className="p-3 border-2 border-[var(--ink)] bg-[var(--surface)] shadow-hard-sm disabled:opacity-20 transition-all hover:-translate-y-0.5 active:translate-y-0.5"><ArrowRight size={18}/></button>
                                    </div>
                                </div>

                                <div className="paper-card p-10 bg-[var(--surface)] text-xl font-display leading-relaxed border-2">
                                    <div className="washi-tape washi-revisit mb-6 py-1 px-3 text-[10px] !border-[var(--ink)]">QUESTION PROMPT</div>
                                    {currentQuestion.question_text}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest flex items-center gap-2">
                                            <Target size={14} /> Recorded Answer
                                        </h4>
                                        <div className="paper-card p-6 bg-[var(--bg)] border-2 text-sm leading-relaxed min-h-[120px] shadow-hard-sm italic">
                                            {currentQuestion.user_response || "No submission recorded."}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest flex items-center justify-between">
                                            <span className="flex items-center gap-2"><Sparkles size={14} /> AI Analysis</span>
                                            <span className={`px-2 py-0.5 text-[9px] border-2 uppercase font-black ${
                                                currentQuestion.response_quality === 'strong' ? 'bg-[var(--accent)-soft] border-[var(--accent)] text-[var(--accent)]' :
                                                currentQuestion.response_quality === 'developing' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-red-50 border-red-500 text-red-700'
                                            }`}>
                                                {currentQuestion.response_quality || 'BLANK'}
                                            </span>
                                        </h4>
                                        <div className="paper-card p-6 bg-[var(--surface-raised)] border-2 border-[var(--ink)] text-sm leading-relaxed min-h-[120px] shadow-hard-sm">
                                            {currentQuestion.ai_feedback || "Analysis unavailable."}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        
                        <div className="space-y-10 animate-fade-in-up">
                            {/* ACTIVE SESSION UI */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-[var(--ink)]" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--muted)]">Prompt Matrix {currentIndex + 1}</p>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-display font-medium text-[var(--text)] leading-tight tracking-tight max-w-3xl">
                                    {currentQuestion.question_text}
                                </h2>
                            </div>

                            <div className="relative paper-card border-4 p-8 !transform-none !shadow-hard-lg">
                                <div className="absolute -top-3 left-8 washi-tape washi-mastered !bg-yellow-200 !text-black !border-black shadow-none flex items-center gap-2">
                                    <BrainCircuit size={12} /> DRAFTING AREA
                                </div>
                                <textarea
                                    ref={textAreaRef}
                                    value={answers[currentQuestion.id] || ''}
                                    onChange={handleAnswerChange}
                                    placeholder="Execute your explanation... Detail creates depth."
                                    className="feynman-textarea min-h-[280px] text-lg border-none bg-transparent !p-0 !shadow-none ring-0 focus:ring-0 overflow-hidden"
                                    style={{ 
                                        backgroundImage: `linear-gradient(transparent, transparent 27px, var(--border-soft) 27px)`,
                                        backgroundSize: `100% 28px`,
                                        lineHeight: `28px`
                                    }}
                                />
                                <div className="mt-8 pt-4 border-t-2 border-dashed border-[var(--border-soft)] flex justify-between items-center text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
                                    <span>STAT: {answers[currentQuestion.id]?.split(/\s+/).filter(Boolean).length || 0} WORDS</span>
                                    <span>TICKER: {answers[currentQuestion.id]?.length || 0} CHARS</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-8">
                                <button
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="btn-secondary h-14"
                                >
                                    <ArrowLeft size={18} /> PREVIOUS
                                </button>

                                <button
                                    onClick={handleNext}
                                    disabled={isSubmitting}
                                    className="btn-primary h-14 min-w-[220px]"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 size={18} className="animate-spin" /> SYNCHRONIZING...</>
                                    ) : currentIndex === questions.length - 1 ? (
                                        <><CheckCircle size={18} /> SUBMIT ARTIFACTS</>
                                    ) : (
                                        <>NEXT PROMPT <ArrowRight size={18} /></>
                                    )}
                                </button>
                            </div>

                            <div className="pt-20 text-center">
                                <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.2em] opacity-30">
                                    {'//'} Drafted explanation directly affects mastery score {'//'}
                                </p>
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}
