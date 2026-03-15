import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Target, ArrowRight, ArrowLeft, CheckCircle, Loader2, Award, Zap, AlertTriangle, RefreshCw, X, Sparkles } from 'lucide-react';
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
    
    // Evaluation state
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

                // Initialize answers if revisiting an incomplete session or completed session
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

            // Fetch the updated questions to get question-level feedback
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
            setCurrentIndex(0); // Reset index to view results from start

        } catch (err: any) {
            toast.error(err.message || 'Failed to submit test');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-6">
                <div className="w-full max-w-2xl">
                    <p className="text-center text-xl font-display text-[var(--text)] mb-8">Loading your test questions...</p>
                    <GeneratingAnimation type="exam" />
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
                <title>Practice Test | Serify</title>
            </Head>

            {/* Top Navigation */}
            <header className="fixed top-0 inset-x-0 h-16 bg-[var(--surface)] border-b border-[var(--border)] z-20 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push('/practice')}
                        className="p-2 -ml-2 text-[var(--muted)] hover:text-[var(--text)] transition rounded-lg hover:bg-[var(--border)]"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Target size={18} className="text-blue-600" />
                        <span className="font-medium text-[var(--text)]">Practice Test</span>
                        <span className="text-[var(--muted)] text-sm ml-2 hidden sm:inline">
                            {session.custom_topic || 'Diagnostic Assessment'}
                        </span>
                    </div>
                </div>

                {!isCompleted && (
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-[var(--muted)]">
                            {currentIndex + 1} of {questions.length}
                        </span>
                    </div>
                )}
            </header>

            {/* Progress Bar */}
            <div className="fixed top-16 inset-x-0 h-1 bg-[var(--border)] z-20">
                <div 
                    className="h-full bg-blue-600 transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            <main className="flex-1 pt-24 pb-32 overflow-y-auto px-4">
                <div className="max-w-3xl mx-auto space-y-8">
                    
                    {isCompleted ? (
                        /* RESULTS VIEW */
                        <div className="space-y-10 animate-fade-in-up">
                            
                            {/* Summary Card */}
                            {currentIndex === 0 && (
                                <div className="bg-white border text-center p-8 rounded-2xl shadow-sm border-[var(--border)] space-y-6">
                                    <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center border-4 border-blue-100">
                                        <Award size={36} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-display text-[var(--text)] tracking-tight">
                                            Test Completed
                                        </h2>
                                        <p className="text-[var(--muted)] mt-2">
                                            Performance: <span className="font-semibold text-[var(--text)] capitalize">{results?.ai_summary?.overallPerformance}</span> • Score: {results?.score}/100
                                        </p>
                                    </div>
                                    
                                    {results?.ai_summary?.focusSuggestions?.length > 0 && (
                                        <div className="text-left bg-slate-50 p-5 rounded-xl border border-slate-100">
                                            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                                <Zap size={16} className="text-amber-500" /> Focus Suggestions
                                            </h4>
                                            <ul className="space-y-2 text-slate-700 text-sm">
                                                {results.ai_summary.focusSuggestions.map((sug: string, i: number) => (
                                                    <li key={i} className="flex gap-2">
                                                        <span className="text-blue-500">•</span> {sug}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <button 
                                        onClick={() => router.push('/practice')}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                                    >
                                        Return to Dashboard
                                    </button>
                                </div>
                            )}

                            {/* Individual Question Review */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                                    <h3 className="font-display text-xl text-[var(--text)]">
                                        Review Question {currentIndex + 1}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                         <button onClick={handlePrev} disabled={currentIndex === 0} className="p-2 border rounded-lg disabled:opacity-50"><ArrowLeft size={16}/></button>
                                         <button onClick={() => setCurrentIndex(prev => Math.min(prev + 1, questions.length - 1))} disabled={currentIndex === questions.length - 1} className="p-2 border rounded-lg disabled:opacity-50"><ArrowRight size={16}/></button>
                                    </div>
                                </div>

                                <div className="p-6 bg-white border border-[var(--border)] rounded-2xl shadow-sm text-lg text-[var(--text)] leading-relaxed">
                                    {currentQuestion.question_text}
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-medium text-[var(--muted)] uppercase tracking-wider text-sm flex items-center gap-2">
                                        Your Answer
                                    </h4>
                                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-[var(--text)] min-h-[100px] whitespace-pre-wrap">
                                        {currentQuestion.user_response || <span className="italic text-slate-400">No answer provided.</span>}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-medium text-emerald-700 uppercase tracking-wider text-sm flex items-center gap-2">
                                        <Sparkles size={16} /> AI Feedback 
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${
                                            currentQuestion.response_quality === 'strong' ? 'bg-emerald-100 text-emerald-800' :
                                            currentQuestion.response_quality === 'developing' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            Rating: {currentQuestion.response_quality || 'blank'}
                                        </span>
                                    </h4>
                                    <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-900 leading-relaxed whitespace-pre-wrap">
                                        {currentQuestion.ai_feedback || "No feedback available."}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ACTIVE SESSION VIEW */
                        <div className="space-y-8 animate-fade-in-up">
                            
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-widest border border-blue-100">
                                Question {currentIndex + 1}
                            </div>

                            <h2 className="text-2xl md:text-3xl font-display text-[var(--text)] leading-tight">
                                {currentQuestion.question_text}
                            </h2>

                            <div className="relative group">
                                <textarea
                                    ref={textAreaRef}
                                    value={answers[currentQuestion.id] || ''}
                                    onChange={handleAnswerChange}
                                    placeholder="Type your answer here. Be as detailed as possible to test true understanding..."
                                    className="w-full min-h-[220px] p-6 bg-white border-2 border-[var(--border)] rounded-2xl resize-none
                                             text-lg leading-relaxed text-[var(--text)] placeholder-[var(--muted)]
                                             focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all
                                             group-hover:border-blue-300"
                                />
                                <div className="absolute bottom-4 right-4 text-xs font-medium text-[var(--muted)]">
                                    {answers[currentQuestion.id]?.length || 0} characters
                                </div>
                            </div>

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
                                    disabled={isSubmitting}
                                    className="px-6 py-3 flex items-center justify-center gap-2 rounded-xl text-white font-medium bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait transition-all"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 size={18} className="animate-spin" /> Submitting...</>
                                    ) : currentIndex === questions.length - 1 ? (
                                        <><CheckCircle size={18} /> Submit Test</>
                                    ) : (
                                        <>Next <ArrowRight size={18} className="translate-y-px" /></>
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
