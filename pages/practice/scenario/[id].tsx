import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Activity, ArrowRight, CheckCircle, Loader2, Award, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import GeneratingAnimation from '@/components/GeneratingAnimation';

export default function ScenarioSession() {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();
    
    const [session, setSession] = useState<any>(null);
    const [question, setQuestion] = useState<any>(null);
    const [answer, setAnswer] = useState('');
    
    // Evaluation state
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
                // Fetch Session
                const { data: sessionData, error: sessionErr } = await supabase
                    .from('practice_sessions')
                    .select('*')
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .single();

                if (sessionErr || !sessionData) throw new Error("Session not found");

                setSession(sessionData);

                // Fetch Question (Scenario is typically 1 response record)
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, router.isReady, id]);

    useEffect(() => {
        // Auto-resize text area
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
            // we have the question combined dynamically, but /api/practice/scenario/evaluate
            // requires scenarioText and questionText separately. We combined them with [SCENARIO] and [TASK] 
            // tags in generate.ts. Let's send the full text as scenarioText and '' as questionText or vice versa.
            // Wait, Evaluate endpoint passes them together into prompt anyway.
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

            // Fetch the updated question to get question-level feedback
            const { data: finalQ } = await supabase
                .from('practice_responses')
                .select('*')
                .eq('id', question.id)
                .single();
                
            if (finalQ) setQuestion(finalQ);

            // Re-fetch session to get the AI summary exactly
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
            <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-6">
                <div className="w-full max-w-xl">
                    <p className="text-center text-xl font-display text-[var(--text)] mb-8">Loading scenario...</p>
                    <GeneratingAnimation type="text" />
                </div>
            </div>
        );
    }

    if (!session || !question) return null;

    // Split for rendering
    const fullText = question.question_text || '';
    const scenarioPart = fullText.split('[TASK]')[0]?.replace('[SCENARIO]', '').trim() || fullText;
    const taskPart = fullText.split('[TASK]')[1]?.trim() || '';

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col relative overflow-hidden">
            <Head>
                <title>Real Scenario | Serify</title>
            </Head>

            {/* Top Navigation */}
            <header className="absolute top-0 inset-x-0 h-16 border-b border-[var(--border)] z-20 flex items-center justify-between px-6 bg-[var(--surface)]">
                <div className="flex items-center gap-2">
                    <Activity size={18} className="text-purple-600" />
                    <span className="font-medium text-[var(--text)]">Real Scenario</span>
                    <span className="text-[var(--muted)] text-sm ml-2 hidden sm:inline">
                        {session.custom_topic || 'Concept Application'}
                    </span>
                </div>
                {isCompleted && (
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${
                            results?.score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            results?.score > 40 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-700 border-red-100'
                        }`}>
                            Score: {results?.score}/100
                        </span>
                    </div>
                )}
            </header>

            <main className="flex-1 pt-24 pb-32 overflow-y-auto px-4">
                <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Scenario Column */}
                    <div className={`space-y-6 ${isCompleted ? 'lg:col-span-12' : 'lg:col-span-5'}`}>
                        <div className="bg-white border text-[var(--text)] p-6 md:p-8 rounded-2xl shadow-sm border-[var(--border)] space-y-6 animate-fade-in-up">
                            <h2 className="text-xl font-display tracking-tight text-purple-700 flex items-center gap-2">
                                <Activity size={20} /> The Scenario
                            </h2>
                            <div className="prose prose-slate max-w-none text-[var(--text)] leading-relaxed text-sm md:text-base">
                                <ReactMarkdown>{scenarioPart}</ReactMarkdown>
                            </div>
                            
                            {taskPart && (
                                <div className="mt-6 pt-6 border-t border-[var(--border)]">
                                    <h3 className="font-bold text-[var(--text)] mb-2 uppercase tracking-wider text-xs flex items-center gap-2 text-purple-600">
                                        <Zap size={14} /> Your Task
                                    </h3>
                                    <p className="font-medium text-lg text-[var(--text)] leading-snug">
                                        {taskPart}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Answer / Feedback Column */}
                    <div className={`space-y-8 animate-fade-in-up delay-100 ${isCompleted ? 'lg:col-span-12' : 'lg:col-span-7'}`}>
                        
                        {isCompleted ? (
                            <div className="space-y-6">
                                <div className="bg-white border text-[var(--text)] p-6 md:p-8 rounded-2xl shadow-sm border-[var(--border)] space-y-6">
                                    <h2 className="text-xl font-display tracking-tight text-emerald-700 flex items-center gap-2">
                                        <CheckCircle size={20} /> Expert Feedback
                                    </h2>
                                    
                                    <div className="prose prose-slate max-w-none text-[var(--text)] leading-relaxed text-sm md:text-base">
                                        <ReactMarkdown>{results?.feedback || 'No feedback provided.'}</ReactMarkdown>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-[var(--border)] space-y-4">
                                        <h4 className="font-medium text-[var(--muted)] uppercase tracking-wider text-xs">
                                            Your Submission
                                        </h4>
                                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm whitespace-pre-wrap">
                                            {answer}
                                        </div>
                                    </div>
                                    
                                    <div className="pt-4 flex justify-end">
                                        <button 
                                            onClick={() => router.push('/practice')}
                                            className="px-6 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition"
                                        >
                                            Return to Practice
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 flex flex-col h-full">
                                <div className="flex-1 flex flex-col relative group">
                                    <textarea
                                        ref={textAreaRef}
                                        value={answer}
                                        onChange={handleAnswerChange}
                                        placeholder="Identify the core issues and propose your solution..."
                                        className="w-full flex-1 min-h-[300px] p-6 bg-white border-2 border-[var(--border)] rounded-2xl resize-none
                                                text-base leading-relaxed text-[var(--text)] placeholder-[var(--muted)]
                                                focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all
                                                group-hover:border-purple-300"
                                    />
                                    <div className="absolute bottom-4 right-4 text-xs font-medium text-[var(--muted)]">
                                        {answer.length} characters
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !answer.trim()}
                                        className="px-8 py-3 flex items-center justify-center gap-2 rounded-xl text-white font-medium bg-purple-600 hover:bg-purple-700 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait transition-all"
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 size={18} className="animate-spin" /> Evaluating...</>
                                        ) : (
                                            <><ArrowRight size={18} /> Submit Solution</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                        
                    </div>

                </div>
            </main>
        </div>
    );
}
