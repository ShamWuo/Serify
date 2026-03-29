import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Activity, ArrowRight, ArrowLeft, CheckCircle, Loader2, Award, Zap, Info, Target, Timer, BarChart3, ChevronRight, PenTool } from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import toast from 'react-hot-toast';

export default function ScenarioSession() {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();
    
    const [session, setSession] = useState<any>(null);
    const [question, setQuestion] = useState<any>(null);
    const [answer, setAnswer] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [results, setResults] = useState<any>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [startTime, setStartTime] = useState(0);

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
                    .order('question_number', { ascending: true })
                    .limit(1)
                    .single();

                if (qErr || !qData) throw new Error("Failed to load scenario data");

                setQuestion(qData);
                if (qData.user_answer) setAnswer(qData.user_answer);

                if (sessionData.status === 'completed') {
                    setIsCompleted(true);
                    setResults({
                        score: sessionData.score,
                        ai_summary: sessionData.ai_summary ? JSON.parse(sessionData.ai_summary) : null,
                        feedback: qData.ai_feedback
                    });
                } else {
                    setStartTime(Date.now());
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

    useEffect(() => {
        if (textAreaRef.current && !isCompleted) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
        }
    }, [answer, isCompleted]);

    const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setAnswer(e.target.value);
    };

    const handleSubmit = async () => {
        if (!answer.trim()) {
            toast.error("Please provide an answer to the scenario.");
            return;
        }

        setIsSubmitting(true);
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);

        try {
            const fullText = question.question_text || '';
            const scenarioPart = fullText.split('[TASK]')[0]?.replace('[SCENARIO]', '').trim() || fullText;
            const taskPart = fullText.split('[TASK]')[1]?.trim() || '';

            const { data: authData } = await supabase.auth.getSession();
            const res = await fetch('/api/practice/scenario/evaluate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authData.session?.access_token}`
                },
                body: JSON.stringify({ 
                    sessionId: id, 
                    responseId: question.id,
                    userAnswer: answer,
                    timeSpentSeconds: timeSpent,
                    scenarioText: scenarioPart,
                    questionText: taskPart
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const { data: finalQ } = await supabase
                .from('practice_responses')
                .select('*')
                .eq('id', question.id)
                .single();
                
            if (finalQ) setQuestion(finalQ);

            const { data: finalSession } = await supabase
                .from('practice_sessions')
                .select('*')
                .eq('id', id)
                .single();

            if (finalSession) {
                setResults({
                    score: finalSession.score,
                    ai_summary: finalSession.ai_summary ? JSON.parse(finalSession.ai_summary) : null,
                    feedback: finalQ?.ai_feedback
                });
            }
            setIsCompleted(true);

        } catch (err: any) {
            toast.error(err.message || 'Failed to submit scenario');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] bg-dot-grid flex flex-col items-center justify-center p-6 text-center">
                <div className="space-y-4">
                    <Loader2 size={40} className="animate-spin text-purple-500 mx-auto" />
                    <p className="text-sm font-mono text-[var(--muted)] uppercase tracking-widest">Initialising Scenario Simulation...</p>
                </div>
            </div>
        );
    }

    if (!session || !question) return null;

    const fullText = question.question_text || '';
    const scenarioPart = fullText.split('[TASK]')[0]?.replace('[SCENARIO]', '').trim() || fullText;
    const taskPart = fullText.split('[TASK]')[1]?.trim() || '';

    return (
        <div className="min-h-screen bg-[var(--bg)] bg-dot-grid flex flex-col relative overflow-hidden font-sans">
            <Head>
                <title>Real Scenario | Serify</title>
            </Head>

            {/* Technical Header */}
            <header className="sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur-md border-b border-[var(--border)] px-4 py-3 md:px-8 font-sans">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => router.push('/practice')}
                            className="p-2 hover:bg-[var(--surface)] rounded-lg transition-colors border border-transparent hover:border-[var(--border)]"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-tighter flex items-center gap-2">
                                <Activity size={14} className="text-purple-600" />
                                Scenario Application Protocol
                            </h1>
                            <p className="text-[10px] font-mono text-[var(--muted)] leading-none uppercase tracking-widest">
                                {`${session.custom_topic || 'Concept Application'} // ID: ${id?.toString().slice(0, 8)}`}
                            </p>
                        </div>
                    </div>

                    {isCompleted && (
                        <div className="flex items-center gap-4">
                             <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-sm text-[10px] font-black uppercase tracking-widest">
                                Evaluated // {results?.score}%
                            </div>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* Scenario Narrative Column */}
                        <div className={`space-y-6 ${isCompleted ? 'lg:col-span-12' : 'lg:col-span-5'}`}>
                            <div className="paper-card p-8 border-t-4 border-t-purple-500 shadow-hard relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <PenTool size={60} />
                                </div>
                                
                                <h2 className="text-xs font-black text-purple-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                    <span className="w-6 h-px bg-purple-600/30" />
                                    The Scenario
                                </h2>
                                
                                <div className="prose prose-slate max-w-none text-[var(--text)] leading-relaxed font-medium text-base">
                                    <MarkdownRenderer>{scenarioPart}</MarkdownRenderer>
                                </div>
                                
                                {taskPart && (
                                    <div className="mt-8 pt-6 border-t border-[var(--border)]">
                                        <h3 className="text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                            <Zap size={14} className="text-amber-500" /> Current Objective
                                        </h3>
                                        <p className="text-lg md:text-xl font-display font-black text-[var(--text)] leading-tight tracking-tight">
                                            {taskPart}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Interactive Column */}
                        <div className={`space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 ${isCompleted ? 'lg:col-span-12' : 'lg:col-span-7'}`}>
                            
                            {isCompleted ? (
                                <div className="space-y-8">
                                    {/* Executive Report Summary */}
                                    <div className="paper-card p-10 bg-[var(--surface-raised)] border-2 border-[var(--text)]">
                                        <div className="flex flex-col md:flex-row gap-8 justify-between mb-8">
                                            <div>
                                                <h2 className="text-3xl font-black font-display uppercase tracking-tighter mb-2">Expert Evaluation</h2>
                                                <p className="font-mono text-[var(--muted)] text-[10px] uppercase tracking-widest">Generated by Serify AI Logic Engine</p>
                                            </div>
                                            <div className="flex flex-col items-center justify-center p-4 bg-[var(--bg)] border-2 border-[var(--text)] min-w-[120px] shadow-hard-sm">
                                                <p className="text-[9px] font-mono text-[var(--muted)] uppercase tracking-widest mb-1">Score Index</p>
                                                <p className="text-4xl font-black text-purple-600">{results?.score}%</p>
                                            </div>
                                        </div>

                                        <div className="prose prose-slate max-w-none text-[var(--text)] leading-relaxed font-sans text-[15px] border-l-4 border-l-purple-500 pl-6 mb-10">
                                            <MarkdownRenderer className="markdown-report">{results?.feedback || 'Analysis pending.'}</MarkdownRenderer>
                                        </div>

                                        <div className="space-y-4 mb-8">
                                            <h4 className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest border-b border-[var(--border)] pb-2 flex items-center gap-2">
                                                <BarChart3 size={14} /> Submitted Response
                                            </h4>
                                            <div className="p-6 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[14px] font-mono leading-relaxed text-[var(--muted)] whitespace-pre-wrap italic">
                                                &quot;{answer}&quot;
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-end gap-4 border-t border-[var(--border)] pt-8">
                                            <button 
                                                onClick={() => router.push('/practice')}
                                                className="px-8 py-3 bg-[var(--text)] text-[var(--bg)] rounded-xl font-bold hover:opacity-90 transition shadow-hard active:translate-y-1 active:shadow-none"
                                            >
                                                Return to Dashboard
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 flex flex-col h-full">
                                    <div className="relative group">
                                        <div className="absolute -top-3 left-4 px-2 bg-[var(--bg)] text-[10px] font-black text-purple-600 uppercase tracking-widest z-10">
                                            Response Interface
                                        </div>
                                        <textarea
                                            ref={textAreaRef}
                                            value={answer}
                                            onChange={handleAnswerChange}
                                            placeholder="Synthesise your solution based on the principles provided..."
                                            className="feynman-textarea w-full min-h-[400px] p-8 text-lg md:text-xl font-mono"
                                        />
                                        <div className="absolute bottom-4 right-4 text-[9px] font-mono text-[var(--muted)] uppercase tracking-widest">
                                            {`Char Count: ${answer.length} // Draft Active`}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-2">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 grayscale opacity-50">
                                                <Timer size={14} />
                                                <span className="text-[10px] font-mono uppercase tracking-widest">Simulation Running</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={isSubmitting || !answer.trim()}
                                            className="px-10 py-4 flex items-center justify-center gap-3 rounded-xl text-[var(--bg)] font-black uppercase tracking-widest text-[11px] bg-[var(--text)] hover:opacity-90 shadow-hard active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-wait"
                                        >
                                            {isSubmitting ? (
                                                <><Loader2 size={18} className="animate-spin" /> Verifying Protocol</>
                                            ) : (
                                                <><CheckCircle size={18} /> Submit Solution</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Background Architecture */}
            <div className="fixed bottom-4 left-4 pointer-events-none opacity-20 hidden lg:block">
                <div className="flex flex-col gap-1">
                    <div className="h-px w-32 bg-[var(--border)]" />
                    <div className="h-px w-24 bg-[var(--border)]" />
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--muted)] pt-2">Scenario Logic // SC-992</span>
                </div>
            </div>
        </div>
    );
}
