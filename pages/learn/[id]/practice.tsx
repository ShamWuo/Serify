import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function PracticeMode() {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [stats, setStats] = useState({ correct: 0, total: 0 });
    const [isComplete, setIsComplete] = useState(false);

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

                const wk = (parsed.report?.strength_map || []).filter(
                    (item: any) => ['revisit', 'shaky', 'skipped', 'developing'].includes(item.mastery_state)
                ).map((item: any) => ({
                    id: item.concept_id,
                    name: parsed.concepts?.find((c: any) => c.id === item.concept_id)?.name || 'Concept',
                    masteryState: item.mastery_state,
                    feedbackNote: item.feedback_text
                }));

                const ctx = {
                    userId: user?.id || 'placeholder-user-id',
                    sessionId: id as string,
                    concepts: parsed.concepts || []
                };
                setSessionData(ctx);

                const { data: { session } } = await supabase.auth.getSession();
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


                const res = await fetch(`/api/sessions/${id}/quiz/generate`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ concepts: wk })
                });

                if (res.ok) {
                    const data = await res.json();
                    setQuestions(data.questions || []);
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    setError(errorData.error || 'Failed to generate practice quiz.');
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'An unexpected error occurred.');
            } finally {
                setLoading(false);
            }
        };

        initQuiz();
    }, [id, router]);

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
            setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
        }
        setStats(prev => ({ ...prev, total: prev.total + 1 }));

        if (sessionData) {
            fetch('/api/learn/mastery-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(sessionData.authToken ? { 'Authorization': `Bearer ${sessionData.authToken}` } : {}) },
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
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswered(false);
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

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--text)] flex flex-col pt-12">
                <div className="max-w-[600px] mx-auto w-full px-6 flex-1 flex flex-col items-center pt-24 text-center">
                    <div className="w-20 h-20 rounded-full bg-[var(--warn-light)] text-[var(--warn)] flex items-center justify-center mb-6 text-3xl">⚠️</div>
                    <h2 className="text-3xl font-display mb-4">Generation Failed</h2>
                    <p className="text-[var(--muted)] mb-8 text-lg">
                        {error}
                    </p>
                    <Link href={`/session/${id}/feedback`} className="px-6 py-3 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-xl font-medium hover:bg-black/5 transition-colors">
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
                    <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-6 text-3xl">🎯</div>
                    <h2 className="text-3xl font-display mb-4">Quiz Complete</h2>
                    <p className="text-[var(--muted)] text-center mb-8 text-lg">
                        You scored {stats.correct} out of {stats.total}. Your Concept Vault has been updated.
                    </p>
                    <Link href={`/session/${id}/feedback`} className="px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-medium hover:-translate-y-0.5 transition-all shadow-sm">
                        Return to Report &rarr;
                    </Link>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--text)] flex flex-col">
            <Head>
                <title>Practice Quiz | Serify</title>
            </Head>

            { }
            <header className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                <Link href={`/session/${id}/feedback`} className="text-[var(--muted)] hover:text-[var(--text)] transition-colors text-sm font-medium flex items-center gap-2">
                    &larr; Back to Report
                </Link>
                <div className="font-medium text-sm text-[var(--text)] flex items-center gap-4">
                    <span className="hidden sm:inline text-[var(--muted)] font-bold">{getConceptName(currentQ.conceptId)}</span>
                    <span className="px-3 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-full text-xs font-bold tracking-wider">
                        {currentIndex + 1} / {questions.length}
                    </span>
                </div>
                <div className="w-24 border-b-2 border-[var(--border)] h-1 relative rounded-full overflow-hidden self-center">
                    <div
                        className="absolute top-0 left-0 h-full bg-[var(--accent)] transition-all duration-300"
                        style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
                    />
                </div>
            </header>

            { }
            <main className="flex-1 w-full max-w-[700px] mx-auto p-6 md:p-8 pb-32 flex flex-col">

                <h2 className="text-2xl md:text-[28px] font-display mb-8 text-[var(--text)] leading-snug">
                    {currentQ.question}
                </h2>

                <div className="space-y-3 mb-10">
                    {currentQ.options.map((opt: string, idx: number) => {
                        let stateClass = "border-[var(--border)] bg-white hover:bg-[var(--surface)]";
                        let ringClass = "ring-0";

                        if (selectedOption === idx) {
                            stateClass = "border-blue-500 bg-blue-50/50";
                            ringClass = "ring-2 ring-blue-500/20";
                        }

                        if (isAnswered) {
                            if (idx === currentQ.correctIndex) {
                                stateClass = "border-emerald-500 bg-emerald-50";
                                ringClass = "ring-2 ring-emerald-500/30";
                            } else if (idx === selectedOption) {
                                stateClass = "border-rose-500 bg-rose-50 opacity-80";
                                ringClass = "ring-0";
                            } else {
                                stateClass = "border-[var(--border)] bg-black/5 opacity-50";
                                ringClass = "ring-0";
                            }
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleSelectOption(idx)}
                                disabled={isAnswered}
                                className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${stateClass} ${ringClass} group flex items-start gap-4`}
                            >
                                <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${isAnswered && idx === currentQ.correctIndex ? 'border-emerald-500 bg-emerald-500 text-white' :
                                    isAnswered && idx === selectedOption ? 'border-rose-500 bg-rose-500 text-white' :
                                        selectedOption === idx ? 'border-blue-500 bg-blue-500 text-white' : 'border-[var(--muted)] text-transparent'
                                    }`}>
                                    {isAnswered && idx === currentQ.correctIndex && <span>✓</span>}
                                    {isAnswered && idx === selectedOption && idx !== currentQ.correctIndex && <span>×</span>}
                                </div>
                                <span className="text-lg leading-relaxed pt-px">{opt}</span>
                            </button>
                        );
                    })}
                </div>

                {isAnswered && (
                    <div className="animate-fade-in bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 md:p-8 mb-8">
                        <h4 className={`font-bold text-lg mb-2 ${selectedOption === currentQ.correctIndex ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {selectedOption === currentQ.correctIndex ? 'Correct!' : 'Not quite.'}
                        </h4>
                        <p className="text-[16px] leading-relaxed text-[var(--muted)]">
                            {currentQ.explanation}
                        </p>
                    </div>
                )}

                <div className="mt-auto flex justify-end">
                    {!isAnswered ? (
                        <button
                            onClick={handleCheckAnswer}
                            disabled={selectedOption === null}
                            className="px-8 py-3.5 bg-[var(--accent)] text-white font-medium rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                        >
                            Check
                        </button>
                    ) : (
                        <button
                            onClick={nextQuestion}
                            className="px-8 py-3.5 bg-[var(--text)] text-[var(--background)] font-medium rounded-xl hover:bg-black/90 dark:hover:bg-white/90 transition-all shadow-sm min-w-[140px]"
                        >
                            Next &rarr;
                        </button>
                    )}
                </div>

            </main>
        </div>
    );
}
