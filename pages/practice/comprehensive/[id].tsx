import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
    FileText, 
    ChevronRight, 
    ChevronLeft, 
    CheckCircle, 
    Zap, 
    Target, 
    Activity, 
    Loader2, 
    ArrowRight,
    X,
    Info,
    Check,
    Award
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import GeneratingAnimation from '@/components/GeneratingAnimation';

type Question = {
    id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'recall' | 'application' | 'scenario';
    question_number: number;
    options?: string[];
    user_answer?: string;
    ai_feedback?: any;
};

export default function ComprehensiveSession() {
    const router = useRouter();
    const { id } = router.query;
    const { user, token } = useAuth();
    
    const [isLoading, setIsLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    
    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [showIntro, setShowIntro] = useState(true);

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

                const formattedQs: Question[] = qData.map(q => {
                    const feedback = q.ai_feedback ? (typeof q.ai_feedback === 'string' ? JSON.parse(q.ai_feedback) : q.ai_feedback) : null;
                    return {
                        id: q.id,
                        question_text: q.question_text,
                        question_type: q.question_type as any,
                        question_number: q.question_number,
                        options: feedback?.options,
                        user_answer: q.user_answer,
                        ai_feedback: feedback
                    };
                });

                setQuestions(formattedQs);
                
                // Initialize answers from existing data if resuming
                const initialAnswers: Record<string, string> = {};
                formattedQs.forEach(q => {
                    if (q.user_answer) initialAnswers[q.id] = q.user_answer;
                });
                setAnswers(initialAnswers);

                if (sessionData.status === 'completed') {
                    setIsCompleted(true);
                    setShowIntro(false);
                    // Load results if needed, though they are usually per-question
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

    const currentQuestion = questions[currentIndex];

    const handleAnswerChange = (val: string) => {
        if (isCompleted) return;
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
    };

    const nextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Final submission
            handleSubmitAll();
        }
    };

    const prevQuestion = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleSubmitAll = async () => {
        // Validation: Ensure all are answered? Or allow skip?
        const unanswered = questions.filter(q => !answers[q.id]);
        if (unanswered.length > 0) {
            const proceed = confirm(`You have ${unanswered.length} unanswered questions. Submit anyway?`);
            if (!proceed) return;
        }

        setIsSubmitting(true);
        try {
            // Evaluate everything
            // Note: We need a combined evaluation API or call multiple small ones.
            // For now, let's call a new evaluation API that handles the whole session.
            
            const res = await fetch('/api/practice/comprehensive/evaluate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    sessionId: id,
                    answers: Object.entries(answers).map(([qId, val]) => ({
                        questionId: qId,
                        answer: val
                    }))
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setResults(data);
            setIsCompleted(true);
            toast.success("Practice Test Completed!");

        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 size={40} className="animate-spin text-indigo-600 mx-auto" />
                    <p className="text-[var(--muted)]">Loading your Practice Test...</p>
                </div>
            </div>
        );
    }

    if (showIntro) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6 bg-slate-50">
                <Head><title>Practice Test Intro | Serify</title></Head>
                <div className="max-w-2xl w-full bg-white rounded-[40px] shadow-xl shadow-indigo-100 border border-indigo-100 p-10 space-y-8 animate-fade-in-up">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                            <FileText size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-display text-[var(--text)]">Actual Practice Test</h1>
                            <p className="text-[var(--muted)] font-medium">Topic: {session.topic || session.custom_topic || 'Concept Mastery'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { icon: Zap, label: '3 MCQ Questions', color: 'text-yellow-600' },
                            { icon: Target, label: '2 Short Answer Questions', color: 'text-blue-600' },
                            { icon: Activity, label: '1 Real-world Scenario', color: 'text-purple-600' },
                            { icon: Info, label: 'Interactive Feedback', color: 'text-slate-600' }
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <item.icon size={20} className={item.color} />
                                <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 flex flex-col items-center gap-4">
                        <button 
                            onClick={() => setShowIntro(false)}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group"
                        >
                            Start Now <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button onClick={() => router.push('/practice')} className="text-sm text-[var(--muted)] font-medium hover:text-indigo-600">
                            Go back to dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (isCompleted) {
        return (
            <div className="min-h-screen bg-[var(--bg)] py-12 px-6">
                <Head><title>Experience Results | Serify</title></Head>
                <div className="max-w-4xl mx-auto space-y-10 animate-fade-in-up">
                    <header className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold uppercase tracking-widest border border-indigo-100">
                            <Award size={16} /> Final Results
                        </div>
                        <h1 className="text-4xl font-display text-[var(--text)]">Mastery Evaluation complete.</h1>
                    </header>

                    {/* Results Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                         {/* Performance Card */}
                         <div className="bg-white border rounded-3xl p-8 shadow-sm border-slate-100 flex flex-col items-center text-center space-y-6">
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center ring-8 ${
                                results?.overallPerformance === 'strong' ? 'bg-emerald-50 ring-emerald-50 text-emerald-600' :
                                results?.overallPerformance === 'shaky' ? 'bg-red-50 ring-red-50 text-red-600' :
                                'bg-indigo-50 ring-indigo-50 text-indigo-600'
                            }`}>
                                <h1 className="text-4xl font-display uppercase tracking-widest">{results?.overallPerformance || '...'}</h1>
                            </div>
                            <div>
                                <h2 className="text-2xl font-display text-slate-900 capitalize">{results?.overallPerformance} Performance</h2>
                                <p className="text-slate-500 mt-2">You\'ve completed a comprehensive evaluation of your knowledge.</p>
                            </div>
                         </div>
                    </div>

                    {/* Feedback List */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-display">Detailed Breakdown</h3>
                        <div className="space-y-4">
                            {questions.map((q, idx) => {
                                const feedback = results?.questionFeedback?.[idx];
                                return (
                                    <div key={q.id} className="bg-white border rounded-2xl p-6 border-slate-100 space-y-4 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question {idx + 1} — {q.question_type.replace('_', ' ')}</span>
                                            {feedback?.score && (
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                                    feedback.score === 'strong' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    feedback.score === 'shaky' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                }`}>
                                                    {feedback.score}
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-medium text-slate-900 leading-snug">{q.question_text.split('[TASK]')[1] || q.question_text.replace('[SCENARIO]', '')}</p>
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-600 italic">
                                            {feedback?.feedback || 'Evaluating results...'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-center pt-8">
                        <button 
                            onClick={() => router.push('/practice')}
                            className="px-10 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 hover:-translate-y-1 transition-all"
                        >
                            Continue to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col relative overflow-hidden font-sans">
            <Head>
                <title>Actual Practice Test | Serify</title>
            </Head>

            {/* Header */}
            <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-4 md:px-8">
                <button onClick={() => router.push('/practice')} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                    <X size={20} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Test in progress</span>
                    <div className="flex gap-1">
                        {questions.map((_, idx) => (
                            <div key={idx} className={`h-1 rounded-full transition-all ${
                                idx === currentIndex ? 'w-8 bg-indigo-600' : 
                                answers[questions[idx].id] ? 'w-2 bg-indigo-200' : 'w-2 bg-slate-200'
                            }`} />
                        ))}
                    </div>
                </div>
                <div className="w-10" /> {/* Spacer */}
            </header>

            <main className="flex-1 flex flex-col items-center px-4 py-12 md:py-20 animate-fade-in-up">
                <div className="w-full max-w-3xl space-y-10">
                    
                    {/* Progress Marker */}
                    <div className="flex items-center gap-4 text-indigo-600">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-display text-lg">
                            {currentIndex + 1}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Question {currentIndex + 1} of {questions.length}</span>
                            <span className="text-xs font-bold uppercase tracking-widest">
                                {currentQuestion.question_type === 'multiple_choice' ? 'Multiple Choice (MCQ)' :
                                 currentQuestion.question_type === 'scenario' ? 'Real-world Scenario' : 'Short Answer (SAQ)'}
                            </span>
                        </div>
                    </div>

                    {/* Question Content */}
                    <div className="space-y-8 min-h-[400px]">
                        <div className="space-y-6">
                            {currentQuestion.question_type === 'scenario' ? (
                                <div className="space-y-6">
                                    <div className="p-6 md:p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm space-y-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Contextual Scenario</h3>
                                        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed italic">
                                            <ReactMarkdown>{currentQuestion.question_text.split('[TASK]')[0]?.replace('[SCENARIO]', '') || ''}</ReactMarkdown>
                                        </div>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-display text-slate-900 leading-tight">
                                        {currentQuestion.question_text.split('[TASK]')[1]?.trim() || 'Analyze and solve.'}
                                    </h2>
                                </div>
                            ) : (
                                <h2 className="text-2xl md:text-3xl font-display text-slate-900 leading-tight">
                                    {currentQuestion.question_text}
                                </h2>
                            )}
                        </div>

                        {/* Answer Input */}
                        <div className="pt-4">
                            {currentQuestion.question_type === 'multiple_choice' ? (
                                <div className="grid grid-cols-1 gap-3">
                                    {currentQuestion.options?.map((option, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => handleAnswerChange(option)}
                                            className={`p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-4 group ${
                                                answers[currentQuestion.id] === option
                                                ? 'bg-indigo-50 border-indigo-600 shadow-md'
                                                : 'bg-white border-slate-100 hover:border-indigo-200'
                                            }`}
                                        >
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                answers[currentQuestion.id] === option
                                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                                : 'border-slate-200 group-hover:border-indigo-400'
                                            }`}>
                                                {answers[currentQuestion.id] === option && <Check size={14} strokeWidth={4} />}
                                            </div>
                                            <span className={`font-medium ${answers[currentQuestion.id] === option ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                {option}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="relative group">
                                    <textarea 
                                        ref={textAreaRef}
                                        value={answers[currentQuestion.id] || ''}
                                        onChange={(e) => handleAnswerChange(e.target.value)}
                                        placeholder="Write your answer here..."
                                        className="w-full min-h-[250px] p-8 bg-white border-2 border-slate-100 rounded-[32px] text-lg leading-relaxed text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all resize-none shadow-sm group-hover:border-slate-200"
                                    />
                                    <div className="absolute top-4 right-6 text-[10px] font-black text-slate-200 uppercase tracking-widest">
                                        Active Evaluation Enabled
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="pt-12 border-t border-slate-100 flex items-center justify-between">
                        <button 
                            onClick={prevQuestion}
                            disabled={currentIndex === 0}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all disabled:opacity-0"
                        >
                            <ChevronLeft size={20} /> Back
                        </button>
                        <button 
                            onClick={nextQuestion}
                            disabled={isSubmitting || (currentQuestion.question_type === 'multiple_choice' && !answers[currentQuestion.id])}
                            className="flex items-center gap-2 px-10 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-200 hover:bg-indigo-600 hover:shadow-indigo-200 hover:-translate-y-1 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <><Loader2 size={20} className="animate-spin" /> Finalizing...</>
                            ) : currentIndex === questions.length - 1 ? (
                                'Submit Test'
                            ) : (
                                <>Next <ChevronRight size={20} /></>
                            )}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
