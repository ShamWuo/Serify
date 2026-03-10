import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SEO from '@/components/Layout/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { CheckCircle2, ChevronLeft, ChevronRight, AlertTriangle, Target, ArrowRight } from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useUsage } from '@/hooks/useUsage';
import { UsageGate, UsageWarning } from '@/components/billing/UsageEnforcement';

export default function PracticeMode() {
    const router = useRouter();
    const { id } = router.query;
    const { user, token } = useAuth();
    const { isAllowed, increment, refresh } = useUsage('quizzes');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [stats, setStats] = useState({ correct: 0, total: 0 });
    const [isComplete, setIsComplete] = useState(false);
    const [carouselIndex, setCarouselIndex] = useState(0);

    useEffect(() => {
        if (!id) return;

        const initQuiz = async () => {
            try {
                const stored = localStorage.getItem('serify_feedback_report');
                if (!stored) {
                    router.push('/analyze');
                    return;
                }

                const parsed = JSON.parse(stored);

                const wk = (parsed.report?.strength_map || [])
                    .filter((item: any) =>
                        ['revisit', 'shaky', 'skipped', 'developing'].includes(item.mastery_state)
                    )
                    .map((item: any) => ({
                        id: item.concept_id,
                        name:
                            parsed.concepts?.find((c: any) => c.id === item.concept_id)?.name ||
                            'Concept',
                        masteryState: item.mastery_state,
                        feedbackNote: item.feedback_text
                    }));

                const ctx = {
                    userId: user?.id || 'placeholder-user-id',
                    sessionId: id as string,
                    concepts: parsed.concepts || []
                };
                setSessionData(ctx);

                const {
                    data: { session }
                } = await supabase.auth.getSession();
                const token = session?.access_token;
                const headers: any = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const isRegenerating = router.query.regenerate === 'true';

                if (!isRegenerating) {
                    const getRes = await fetch(`/api/sessions/${id}/quiz`, { headers });
                    if (getRes.ok) {
                        const data = await getRes.json();
                        if (data.questions && data.questions.length > 0) {
                            setQuestions(data.questions);
                            setLoading(false);
                            return;
                        }
                    }
                }

                if (wk.length === 0) {
                    setIsComplete(true);
                    setLoading(false);
                    return;
                }

                // If we need to generate, check if allowed
                if (!isAllowed) {
                    setLoading(false);
                    return;
                }

                const res = await fetch(`/api/sessions/${id}/quiz/generate`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ concepts: wk })
                });

                if (res.ok) {
                    const data = await res.json();
                    setQuestions(data.questions || []);
                    // Increment usage
                    increment();
                    refresh();
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    setError(errorData.error || 'Failed to generate practice quiz.');
                }
            } catch (err: any) {
                setError(err.message || 'An unexpected error occurred.');
            } finally {
                setLoading(false);
            }
        };

        if (isAllowed !== undefined) {
            initQuiz();
        }
    }, [id, router, user, isAllowed]);

    const handleSelectOption = (index: number) => {
        if (isAnswered) return;
        setSelectedOption(index);
    };

    const handleCheckAnswer = async () => {
        if (selectedOption === null || isAnswered) return;

        setIsAnswered(true);
        const currentQ = questions[currentIndex];
        const isCorrect = selectedOption === currentQ.correctIndex;

        if (isCorrect) {
            setStats((prev) => ({ ...prev, correct: prev.correct + 1 }));
        }
        setStats((prev) => ({ ...prev, total: prev.total + 1 }));

        if (sessionData) {
            fetch('/api/learn/mastery-update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token
                        ? { Authorization: `Bearer ${token}` }
                        : {})
                },
                body: JSON.stringify({
                    conceptId: currentQ.conceptId,
                    mode: 'practice',
                    outcome: isCorrect ? 'developing' : 'shaky',
                    sessionId: sessionData.sessionId
                })
            }).catch(console.error);
        }
    };

    const nextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            setSelectedOption(null);
            setIsAnswered(false);
            setCarouselIndex(0);
        } else {
            setIsComplete(true);
        }
    };

    const getConceptName = (conceptId?: string) => {
        if (!conceptId || !sessionData) return 'Concept';
        return sessionData.concepts.find((c: any) => c.id === conceptId)?.name || 'Concept';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin"></div>
            </div>
        );
    }

    if (!isAllowed && questions.length === 0 && !isComplete) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
                <div className="max-w-md w-full">
                    <UsageGate feature="quizzes" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--text)] flex flex-col pt-12">
                <div className="max-w-[600px] mx-auto w-full px-6 flex-1 flex flex-col items-center pt-24 text-center">
                    <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-6 text-3xl">
                        <AlertTriangle size={40} />
                    </div>
                    <h2 className="text-3xl font-display mb-4">Generation Failed</h2>
                    <p className="text-[var(--muted)] mb-8 text-lg">{error}</p>
                    <Link
                        href={`/session/${id}/feedback`}
                        className="px-6 py-3 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-xl font-medium hover:bg-black/5 transition-colors"
                    >
                        Return to Report
                    </Link>
                </div>
            </div>
        );
    }

    if (isComplete || questions.length === 0) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--text)] flex flex-col pt-12">
                <div className="max-w-[600px] mx-auto w-full px-6 flex-1 flex flex-col items-center pt-24">
                    <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-6 text-3xl">
                        <Target size={40} />
                    </div>
                    <h2 className="text-3xl font-display mb-4">Quiz Complete</h2>
                    <p className="text-[var(--muted)] text-center mb-8 text-lg">
                        You scored {stats.correct} out of {stats.total}. Your Concept Vault has been
                        updated.
                    </p>
                    <Link
                        href={`/session/${id}/feedback`}
                        className="px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-medium hover:-translate-y-0.5 transition-all shadow-sm"
                    >
                        Return to Report &rarr;
                    </Link>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <DashboardLayout
            backLink={`/session/${id}/feedback`}
            sidebarContent={
                <div className="space-y-4">
                    <div className="px-3 mb-2">
                        <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
                            Practice Progress
                        </h3>
                    </div>
                    <div className="space-y-1">
                        {questions.map((q: any, idx: number) => {
                            const isCurrent = currentIndex === idx;
                            const isPast = idx < currentIndex;
                            return (
                                <div
                                    key={idx}
                                    onClick={() => !isAnswered && setCurrentIndex(idx)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${isCurrent
                                        ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-semibold border border-[var(--accent)]/20'
                                        : 'text-[var(--muted)] hover:bg-black/5'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${isPast
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : isCurrent
                                            ? 'border-[var(--accent)] text-[var(--accent)]'
                                            : 'border-[var(--border)]'
                                        }`}>
                                        {isPast ? (
                                            <CheckCircle2 size={12} />
                                        ) : (
                                            <span className="text-[10px]">{idx + 1}</span>
                                        )}
                                    </div>
                                    <span className="text-sm truncate">Question {idx + 1}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="px-3 mt-4">
                        <UsageWarning feature="quizzes" />
                    </div>
                </div>
            }
        >
            <SEO title="Practice Quiz" />

            <main className="max-w-[700px] mx-auto p-6 md:p-8 pb-32 flex flex-col min-h-[calc(100vh-120px)]">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[32px] p-6 md:p-10 shadow-xl shadow-black/5 relative overflow-hidden glass-premium">

                    <div
                        className="absolute top-0 left-0 h-1 bg-[var(--accent)]/30 transition-all duration-500"
                        style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />

                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <span className="px-3 py-1 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-full text-[10px] font-bold tracking-widest text-[var(--accent)] uppercase">
                                {getConceptName(currentQ.conceptId)}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-widest">
                                Step {currentIndex + 1} / {questions.length}
                            </span>
                        </div>

                        <div className="text-2xl md:text-[32px] font-display text-[var(--text)] leading-tight">
                            <MarkdownRenderer className="inline-markdown">{currentQ.question}</MarkdownRenderer>
                        </div>
                    </div>


                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentQ.options.map((opt: string, idx: number) => {
                            const isSelected = selectedOption === idx;
                            const isCorrect = isAnswered && idx === currentQ.correctIndex;
                            const isWrong = isAnswered && isSelected && !isCorrect;

                            let cls = 'p-5 rounded-2xl border-2 text-left transition-all duration-200 flex items-start gap-3 ';
                            if (isCorrect) cls += 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 ring-4 ring-emerald-500/10';
                            else if (isWrong) cls += 'border-rose-500 bg-rose-50 dark:bg-rose-500/10';
                            else if (isSelected) cls += 'border-[var(--accent)] bg-[var(--accent)]/5 ring-4 ring-[var(--accent)]/10 scale-[1.01]';
                            else if (isAnswered) cls += 'border-[var(--border)] bg-[var(--surface)] opacity-50';
                            else cls += 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 hover:scale-[1.01]';

                            return (
                                <button
                                    key={idx}
                                    onClick={() => !isAnswered && handleSelectOption(idx)}
                                    disabled={isAnswered}
                                    className={cls}
                                >
                                    <div className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${isCorrect ? 'bg-emerald-500 border-emerald-500 text-white' :
                                        isWrong ? 'bg-rose-500 border-rose-500 text-white' :
                                            isSelected ? 'bg-[var(--accent)] border-[var(--accent)] text-white' :
                                                'border-[var(--border)] text-[var(--muted)]'
                                        }`}>
                                        {isCorrect ? '✓' : isWrong ? '✗' : String.fromCharCode(65 + idx)}
                                    </div>
                                    <div className="text-sm leading-relaxed pointer-events-none flex-1 pt-0.5">
                                        <MarkdownRenderer className="inline-markdown">{opt}</MarkdownRenderer>
                                    </div>
                                </button>
                            );
                        })}
                    </div>


                    {isAnswered && (
                        <div className="mt-6 pt-6 border-t border-[var(--border)] animate-in fade-in slide-in-from-bottom-2">
                            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold mb-3 ${selectedOption === currentQ.correctIndex ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {selectedOption === currentQ.correctIndex ? 'Correct' : 'Not quite right'}
                            </div>
                            <div className="text-base leading-relaxed text-[var(--muted)]">
                                <MarkdownRenderer>{currentQ.explanation}</MarkdownRenderer>
                            </div>
                        </div>
                    )}


                    <div className="mt-8 flex items-center justify-between gap-3">
                        <button
                            onClick={() => {
                                if (currentIndex > 0) {
                                    setCurrentIndex(prev => prev - 1);
                                    setSelectedOption(null);
                                    setIsAnswered(false);
                                }
                            }}
                            disabled={currentIndex === 0}
                            className="w-10 h-10 rounded-full border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)]/40 transition-all disabled:opacity-30"
                        >
                            <ChevronLeft size={20} />
                        </button>


                        <div className="flex gap-1.5 items-center">
                            {questions.map((_: any, i: number) => {
                                let dot = 'h-2 rounded-full transition-all duration-200 ';
                                if (i === currentIndex) dot += 'w-5 bg-[var(--accent)]';
                                else if (i < currentIndex) dot += 'w-2 bg-emerald-500';
                                else dot += 'w-2 bg-[var(--border)]';
                                return <div key={i} className={dot} />;
                            })}
                        </div>

                        {!isAnswered ? (
                            <button
                                onClick={handleCheckAnswer}
                                disabled={selectedOption === null}
                                className="px-6 py-2.5 bg-[var(--accent)] text-white font-bold rounded-2xl transition-all shadow-lg shadow-[var(--accent)]/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none text-sm"
                            >
                                Check
                            </button>
                        ) : (
                            <button
                                onClick={nextQuestion}
                                className="px-6 py-2.5 bg-[var(--text)] text-[var(--background)] font-bold rounded-2xl hover:bg-black/90 dark:hover:bg-white/90 transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 text-sm flex items-center gap-1.5"
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </main>
        </DashboardLayout>
    );
}
