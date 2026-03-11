import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SEO from '@/components/Layout/SEO';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { CheckCircle2, AlertTriangle, ArrowRight, Brain, Check } from 'lucide-react';
import { useUsage } from '@/hooks/useUsage';
import { UsageGate, UsageWarning } from '@/components/billing/UsageEnforcement';

export default function DeepDiveMode() {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();
    const { isAllowed, increment, refresh } = useUsage('deep_dives');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<any>(null);
    const [targetConcept, setTargetConcept] = useState<any>(null);
    const [weakConcepts, setWeakConcepts] = useState<any[]>([]);

    const [deepDive, setDeepDive] = useState<any>(null);
    const [generating, setGenerating] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);

    const [answer, setAnswer] = useState('');
    const [evaluating, setEvaluating] = useState(false);
    const [feedback, setFeedback] = useState<any>(null);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (!id) return;

        const initMode = async () => {
            try {
                const stored = localStorage.getItem('serify_feedback_report');
                if (!stored) {
                    router.push('/analyze');
                    return;
                }

                const parsed = JSON.parse(stored);

                const strengthMap = parsed.report?.strength_map || [];
                const criticalGap =
                    strengthMap.find(
                        (item: any) =>
                            item.mastery_state === 'revisit' || item.mastery_state === 'skipped'
                    ) ||
                    strengthMap.find(
                        (item: any) =>
                            item.mastery_state === 'developing' || item.mastery_state === 'shaky'
                    );

                if (!criticalGap) {
                    router.push(`/session/${id}/feedback`);
                    return;
                }

                const concept = {
                    id: criticalGap.concept_id,
                    name:
                        parsed.concepts?.find((c: any) => c.id === criticalGap.concept_id)?.name ||
                        'Concept',
                    masteryState: criticalGap.mastery_state,
                    feedbackNote: criticalGap.feedback_text
                };

                setSessionData({
                    userId: user?.id || 'placeholder-user-id',
                    sessionId: id as string,
                    concepts: parsed.concepts || []
                });

                setWeakConcepts(strengthMap.filter((item: any) =>
                    ['revisit', 'shaky', 'skipped', 'developing'].includes(item.mastery_state)
                ).map((item: any) => ({
                    id: item.concept_id,
                    name: parsed.concepts?.find((c: any) => c.id === item.concept_id)?.name || 'Concept',
                    isComplete: false // Deep dive is active
                })));

                setTargetConcept(concept);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };

        if (id) {
            initMode();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, router]);

    const generateDeepDive = async (concept: any) => {
        if (!isAllowed) return;

        setGenerating(true);
        try {
            const {
                data: { session }
            } = await supabase.auth.getSession();
            const token = session?.access_token;
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const isRegenerating = router.query.regenerate === 'true';

            const res = await fetch(
                `/api/sessions/${id}/deepdive/${concept.id}/generate${isRegenerating ? '?regenerate=true' : ''}`,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ concept })
                }
            );

            if (res.ok) {
                const data = await res.json();
                setDeepDive(data.content);
                // Increment usage
                increment();
                refresh();
            } else {
                const errorData = await res.json().catch(() => ({}));
                setError(errorData.error || 'Failed to generate deep dive.');
            }
        } catch (e: any) {
            console.error(e);
            setError(e.message || 'An unexpected error occurred.');
        } finally {
            setGenerating(false);
            setLoading(false);
        }
    };

    const handleSubmitAnswer = async () => {
        if (!answer.trim() || !deepDive) return;

        setEvaluating(true);
        try {
            const res = await fetch('/api/learn/deepdive-evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: deepDive.confirmatoryQuestion,
                    answer: answer
                })
            });

            if (res.ok) {
                const data = await res.json();
                setFeedback(data.evaluation);
                setIsComplete(data.evaluation?.isCorrect || false);

                const {
                    data: { session }
                } = await supabase.auth.getSession();
                const token = session?.access_token;
                const headers: any = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                if (data.evaluation?.isCorrect) {
                    fetch(`/api/sessions/${id}/deepdive/${targetConcept.id}/confirm`, {
                        method: 'PATCH',
                        headers
                    }).catch(console.error);
                }

                if (sessionData && data.evaluation) {
                    fetch('/api/learn/mastery-update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...headers },
                        body: JSON.stringify({
                            conceptId: targetConcept.id,
                            mode: 'deepdive',
                            outcome: data.evaluation.isCorrect ? 'developing' : 'shaky',
                            sessionId: sessionData.sessionId
                        })
                    }).catch(console.error);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setEvaluating(false);
        }
    };

    if (loading || generating) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)]">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mb-6"></div>
                <h3 className="text-xl font-display text-[var(--text)]">
                    Synthesizing Deep Dive...
                </h3>
                <p className="text-[var(--muted)] mt-2 text-sm text-center max-w-sm px-6">
                    Cross-referencing your specific gaps to build a customized guide for <br />
                    <strong>{targetConcept?.name}</strong>.
                </p>
            </div>
        );
    }

    if (!hasStarted && targetConcept) {
        return (
            <div className="flex flex-col items-center pt-32 min-h-screen bg-[var(--background)] px-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center mb-6 text-3xl shadow-lg">
                    <Brain size={40} />
                </div>
                <h2 className="text-3xl font-display mb-4 text-center text-[var(--text)]">
                    Deep Dive: {targetConcept.name}
                </h2>
                <p className="text-[var(--muted)] text-center mb-8 text-lg max-w-[500px]">
                    Let&apos;s break down this concept and fix the exact areas you struggled with.
                </p>

                <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                    <UsageGate feature="deep_dives">
                        <button
                            onClick={() => {
                                setHasStarted(true);
                                generateDeepDive(targetConcept);
                            }}
                            className="w-full px-8 py-4 bg-[var(--text)] text-[var(--background)] rounded-xl font-bold hover:bg-black/80 dark:hover:bg-white/90 transition-all text-lg shadow-xl shadow-black/10 flex items-center justify-center gap-2"
                        >
                            Generate Deep Dive
                            <ArrowRight size={20} />
                        </button>
                    </UsageGate>

                    <UsageWarning feature="deep_dives" />
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

    if (!deepDive) return null;

    return (
        <DashboardLayout
            backLink={`/session/${id}/feedback`}
            sidebarContent={
                <div className="space-y-4">
                    <div className="px-3 mb-2">
                        <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
                            Deep Dive Progress
                        </h3>
                    </div>
                    <div className="space-y-1">
                        {weakConcepts.map((c: any, idx: number) => {
                            const isCurrent = targetConcept?.id === c.id;
                            return (
                                <div
                                    key={c.id}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-default ${isCurrent
                                        ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-semibold border border-[var(--accent)]/20'
                                        : 'text-[var(--muted)]'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${isCurrent
                                        ? 'border-[var(--accent)] text-[var(--accent)]'
                                        : 'border-[var(--border)]'
                                        }`}>
                                        <span className="text-[10px]">{idx + 1}</span>
                                    </div>
                                    <span className="text-sm truncate">{c.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            }
        >
            <SEO title="Deep Dive" />

            <main className="max-w-[800px] mx-auto p-6 md:p-8 pb-32">

                <div className="mb-12 border-b-2 border-[var(--text)] pb-8">
                    <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold uppercase tracking-widest rounded-full mb-6 relative">
                        Deep Dive Guide
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display font-bold leading-tight tracking-tight text-[var(--text)]">
                        {deepDive.title}
                    </h1>
                </div>


                <div className="space-y-12">
                    {deepDive.sections?.map((section: any, idx: number) => (
                        <section key={idx} className="relative">
                            <h2 className="text-2xl font-display font-medium text-[var(--text)] mb-6 flex items-center gap-4">
                                <span className="text-indigo-400 font-serif italic text-3xl">
                                    {(idx + 1).toString().padStart(2, '0')}
                                </span>
                                {section.heading}
                            </h2>
                            <div className="prose prose-lg prose-indigo prose-a:text-indigo-600 prose-p:leading-relaxed text-[var(--text)] max-w-none bg-white/50 p-6 rounded-2xl border border-[var(--border)] shadow-sm">
                                <MarkdownRenderer>{section.content}</MarkdownRenderer>
                            </div>
                        </section>
                    ))}
                </div>


                <div className="mt-24 pt-16 border-t border-[var(--border)]">
                    <div className="max-w-2xl mx-auto bg-white border border-[var(--border)] rounded-3xl p-8 md:p-12 shadow-xl shadow-black/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                        <h3 className="text-xl font-bold uppercase tracking-wider text-[var(--muted)] mb-4 flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Check Your
                            Understanding
                        </h3>
                        <div className="text-2xl font-display text-[var(--text)] leading-snug mb-8">
                            <MarkdownRenderer className="inline-markdown">{deepDive.confirmatoryQuestion}</MarkdownRenderer>
                        </div>

                        {!isComplete ? (
                            <div className="space-y-6">
                                <textarea
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    placeholder="Type your answer here..."
                                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 min-h-[120px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-lg resize-y transition-shadow"
                                    disabled={evaluating}
                                />

                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <span className="text-[13px] text-[var(--muted)] font-medium">
                                        Be specific based on what you just read.
                                    </span>
                                    <button
                                        onClick={handleSubmitAnswer}
                                        disabled={!answer.trim() || evaluating}
                                        className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 text-white font-medium rounded-xl hover:-translate-y-0.5 transition-all shadow-sm disabled:opacity-50 min-w-[140px]"
                                    >
                                        {evaluating ? 'Checking...' : 'Check Answer'}
                                    </button>
                                </div>

                                {feedback && !feedback.isCorrect && (
                                    <div className="mt-6 p-5 bg-rose-50 border border-rose-200 rounded-xl animate-fade-in">
                                        <h4 className="font-bold text-rose-700 mb-2">
                                            Not quite right...
                                        </h4>
                                        <div className="text-rose-900 leading-relaxed text-[15px]">
                                            <MarkdownRenderer className="inline-markdown">{feedback.feedback}</MarkdownRenderer>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="animate-fade-in text-center py-6">
                                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-4xl mb-6 shadow-inner">
                                    <Check size={40} />
                                </div>
                                <h4 className="font-display text-3xl mb-4 text-[var(--text)]">
                                    Nailed it.
                                </h4>
                                <div className="text-[var(--text)] leading-relaxed mb-10 text-lg opacity-80">
                                    <MarkdownRenderer className="inline-markdown">{feedback?.feedback}</MarkdownRenderer>
                                </div>
                                <Link
                                    href={`/session/${id}/feedback`}
                                    className="inline-block px-10 py-4 bg-[var(--text)] text-[var(--background)] rounded-xl font-bold hover:bg-black/80 dark:hover:bg-white/90 transition-all text-lg shadow-xl shadow-black/10"
                                >
                                    Return to Report &rarr;
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </DashboardLayout>
    );
}
