import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SEO from '@/components/Layout/SEO';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/Layout/DashboardLayout';

export default function FeynmanMode() {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [sessionData, setSessionData] = useState<any>(null);
    const [targetConcept, setTargetConcept] = useState<any>(null);
    const [weakConcepts, setWeakConcepts] = useState<any[]>([]);
    const [explanation, setExplanation] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [feedback, setFeedback] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
                })));

                setTargetConcept(concept);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        initMode();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, router]);

    const handleSubmit = async () => {
        if (!explanation.trim()) return;

        setAnalyzing(true);
        setErrorMsg(null);
        try {
            const {
                data: { session }
            } = await supabase.auth.getSession();
            const token = session?.access_token;
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`/api/sessions/${id}/feynman/submit`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ concept: targetConcept, userExplanation: explanation })
            });

            if (res.ok) {
                const data = await res.json();
                setFeedback(data.attempt.evaluation);

                if (sessionData && data.attempt.evaluation?.overallAssessment) {
                    fetch('/api/learn/mastery-update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...headers },
                        body: JSON.stringify({
                            conceptId: targetConcept.id,
                            mode: 'feynman',
                            outcome: data.attempt.evaluation.overallAssessment,
                            sessionId: sessionData.sessionId
                        })
                    }).catch(console.error);
                }
            } else {
                const errorData = await res.json().catch(() => ({}));
                setErrorMsg(errorData.message || errorData.error || 'Failed to submit explanation');
            }
        } catch (e) {
            console.error(e);
            setErrorMsg('A network error occurred');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleTryAgain = () => {
        setExplanation('');
        setFeedback(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin"></div>
            </div>
        );
    }

    if (!targetConcept) return null;

    return (
        <DashboardLayout
            backLink={`/session/${id}/feedback`}
            sidebarContent={
                <div className="space-y-4">
                    <div className="px-3 mb-2">
                        <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
                            Feynman Progress
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
            <SEO title="Feynman Method" />

            <main className="max-w-[800px] mx-auto p-6 md:p-8 pb-32">
                {!feedback && !analyzing && (
                    <div className="animate-fade-in">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 mb-8 border-l-4 border-l-purple-500 shadow-sm">
                            <p className="text-[15px] leading-relaxed text-[var(--text)] font-medium">
                                Explain{' '}
                                <strong className="text-purple-600 inline-block">
                                    <MarkdownRenderer className="inline-markdown">{targetConcept.name}</MarkdownRenderer>
                                </strong> as
                                if you&apos;re teaching it to someone who has never heard of it. Use
                                your own words. Don&apos;t look anything up. Write until you feel
                                like you&apos;ve covered it fully.
                            </p>
                        </div>

                        {errorMsg && (
                            <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl">
                                {errorMsg}
                            </div>
                        )}

                        <textarea
                            value={explanation}
                            onChange={(e) => setExplanation(e.target.value)}
                            placeholder="Start explaining..."
                            className="w-full min-h-[300px] sm:min-h-[400px] p-6 text-lg bg-white border border-[var(--border)] rounded-2xl resize-y focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-sm transition-shadow leading-relaxed"
                        />
                        <p className="text-xs text-[var(--muted)] mt-3 ml-2">
                            No hints in Feynman mode — the struggle is the point.
                        </p>

                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={handleSubmit}
                                disabled={!explanation.trim()}
                                className="px-8 py-3.5 bg-[var(--accent)] text-white font-medium rounded-xl hover:-translate-y-0.5 transition-all shadow-sm disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                            >
                                Submit Explanation &rarr;
                            </button>
                        </div>
                    </div>
                )}

                {analyzing && (
                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                        <div className="w-12 h-12 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin mb-6"></div>
                        <h3 className="text-xl font-display text-[var(--text)]">
                            Analyzing your explanation...
                        </h3>
                        <p className="text-[var(--muted)] mt-2 text-sm">
                            Checking for clarity and logic gaps
                        </p>
                    </div>
                )}

                {feedback && (
                    <div className="animate-fade-in space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            { }
                            <div className="bg-emerald-50/50 border border-emerald-200/50 rounded-2xl p-6">
                                <h4 className="font-bold text-emerald-700 flex items-center gap-2 mb-4">
                                    <span className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-xs">
                                        ✓
                                    </span>
                                    What came through clearly
                                </h4>
                                <div className="text-[15px] leading-relaxed text-emerald-900/80">
                                    <MarkdownRenderer>{feedback.clearParts}</MarkdownRenderer>
                                </div>
                            </div>

                            { }
                            <div className="bg-rose-50/50 border border-rose-200/50 rounded-2xl p-6">
                                <h4 className="font-bold text-rose-700 flex items-center gap-2 mb-4">
                                    <span className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center text-xs">
                                        !
                                    </span>
                                    Where the explanation breaks down
                                </h4>
                                <div className="text-[15px] leading-relaxed text-rose-900/80">
                                    <MarkdownRenderer>{feedback.breakdownPoints}</MarkdownRenderer>
                                </div>
                            </div>
                        </div>

                        { }
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 md:p-8">
                            <h4 className="font-bold text-[var(--text)] text-sm uppercase tracking-wider mb-4 border-b border-[var(--border)] pb-4">
                                A Strong Feynman Explanation
                            </h4>
                            <div className="text-[16px] leading-relaxed text-[var(--text)] prose prose-a:text-[var(--accent)] max-w-none">
                                <MarkdownRenderer>{feedback.strongExample}</MarkdownRenderer>
                            </div>
                        </div>

                        { }
                        <div className="flex flex-wrap items-center justify-end gap-4 pt-4">
                            <button
                                onClick={handleTryAgain}
                                className="px-6 py-3 border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-medium rounded-xl hover:bg-black/5 transition-colors"
                            >
                                Try Again
                            </button>
                            <Link
                                href={`/session/${id}/feedback`}
                                className="px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-medium hover:-translate-y-0.5 transition-all shadow-sm"
                            >
                                Return to Report &rarr;
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </DashboardLayout>
    );
}
