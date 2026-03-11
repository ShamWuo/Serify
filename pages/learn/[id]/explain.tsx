/**
 * explain.tsx
 * Purpose: Provides a personalized "Explain It To Me" mode for reviewing difficult concepts.
 * Key Logic: Generates AI-driven explanations for weak concepts using existing knowledge 
 * as context. Updates concept mastery based on user feedback on the explanation's clarity.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SEO from '@/components/Layout/SEO';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { CheckCircle2 } from 'lucide-react';

export default function ExplainMode() {
    const router = useRouter();
    const { id } = router.query;
    const { user, token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<any>(null);
    const [weakConcepts, setWeakConcepts] = useState<any[]>([]);
    const [strongConcepts, setStrongConcepts] = useState<any[]>([]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentExplanation, setCurrentExplanation] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    const generateExplanation = useCallback(async (concept: any, strong: any[]) => {
        setGenerating(true);
        setCurrentExplanation(null);
        try {
            const {
                data: { session }
            } = await supabase.auth.getSession();
            const token = session?.access_token;
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const isRegenerating = router.query.regenerate === 'true';

            const res = await fetch(
                `/api/sessions/${id}/explanations/${concept.id}/generate${isRegenerating ? '?regenerate=true' : ''}`,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ concept, strongConcepts: strong })
                }
            );

            if (res.ok) {
                const data = await res.json();
                setCurrentExplanation(data.content);
            } else {
                const errorData = await res.json().catch(() => ({}));
                setError(errorData.error || 'Failed to generate explanation.');
            }
        } catch (e: any) {
            setError(e.message || 'An unexpected error occurred.');
        } finally {
            setGenerating(false);
        }
    }, [id, router]);

    useEffect(() => {
        if (!id) return;

        const initDeck = async () => {
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

                const st = (parsed.report?.strength_map || [])
                    .filter((item: any) => ['solid'].includes(item.mastery_state))
                    .map((item: any) => ({
                        id: item.concept_id,
                        name:
                            parsed.concepts?.find((c: any) => c.id === item.concept_id)?.name ||
                            'Concept'
                    }));

                setSessionData({
                    userId: user?.id || 'placeholder-user-id',
                    sessionId: id as string,
                    concepts: parsed.concepts || []
                });

                setWeakConcepts(wk);
                setStrongConcepts(st);

                if (wk.length === 0) {
                    setIsComplete(true);
                } else {
                    generateExplanation(wk[0], st);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        initDeck();
    }, [id, router, user, generateExplanation]);

    const handleResponse = async (gotIt: boolean) => {
        const currentConcept = weakConcepts[currentIndex];

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
                    conceptId: currentConcept.id,
                    mode: 'explain',
                    outcome: gotIt ? 'developing' : 'shaky',
                    sessionId: sessionData.sessionId
                })
            }).catch(console.error);
        }

        if (currentIndex < weakConcepts.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            generateExplanation(weakConcepts[nextIndex], strongConcepts);
        } else {
            setIsComplete(true);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin"></div>
            </div>
        );
    }

    if (isComplete) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--text)] flex flex-col pt-12">
                <div className="max-w-[600px] mx-auto w-full px-6 flex-1 flex flex-col items-center pt-24">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 text-3xl">
                        ✓
                    </div>
                    <h2 className="text-3xl font-display mb-4">
                        You&apos;ve reviewed all your gaps
                    </h2>
                    <p className="text-[var(--muted)] text-center mb-8 text-lg">
                        The Concept Vault has been updated. If you still have shaky concepts, the AI
                        Tutor can help you drill down further.
                    </p>
                    <Link
                        href={`/session/${id}/feedback`}
                        className="px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-medium hover:-translate-y-0.5 transition-all"
                    >
                        Return to Report &rarr;
                    </Link>
                </div>
            </div>
        );
    }

    const currentConcept = weakConcepts[currentIndex];

    return (
        <DashboardLayout
            backLink={`/session/${id}/feedback`}
            sidebarContent={
                <div className="space-y-4">
                    <div className="px-3 mb-2">
                        <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
                            Review Progress
                        </h3>
                    </div>
                    <div className="space-y-1">
                        {weakConcepts.map((c: any, idx: number) => {
                            const isCurrent = currentIndex === idx;
                            const isPast = idx < currentIndex;
                            return (
                                <div
                                    key={c.id}
                                    onClick={() => setCurrentIndex(idx)}
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
                                    <span className="text-sm truncate">{c.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            }
        >
            <SEO title="Explain It To Me" />

            <main className="max-w-[700px] mx-auto p-6 md:p-12 pb-32">
                <h1 className="text-3xl md:text-4xl font-display mb-8 text-[var(--text)]">
                    {currentConcept?.name}
                </h1>

                {generating ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-[var(--border)] rounded w-3/4"></div>
                        <div className="h-4 bg-[var(--border)] rounded w-full"></div>
                        <div className="h-4 bg-[var(--border)] rounded w-5/6"></div>
                        <div className="h-4 bg-[var(--border)] rounded w-full"></div>
                        <div className="h-4 bg-[var(--border)] rounded w-2/3"></div>
                    </div>
                ) : (
                    <div className="prose prose-lg text-[var(--text)] prose-p:leading-relaxed prose-headings:font-display prose-a:text-[var(--accent)] max-w-none">
                        <MarkdownRenderer>{currentExplanation || ''}</MarkdownRenderer>
                    </div>
                )}

                {!generating && currentExplanation && (
                    <div className="mt-16 pt-8 border-t border-[var(--border)]">
                        <h4 className="font-bold text-lg mb-6 text-center">Did this make sense?</h4>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => handleResponse(true)}
                                className="w-full sm:w-auto px-8 py-3.5 bg-[var(--accent)] text-white font-medium rounded-xl hover:-translate-y-0.5 transition-all shadow-sm"
                            >
                                Yes, got it
                            </button>
                            <button
                                onClick={() => handleResponse(false)}
                                className="w-full sm:w-auto px-8 py-3.5 border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-medium rounded-xl hover:bg-black/5 transition-colors"
                            >
                                Still unclear
                            </button>
                        </div>
                    </div>
                )}

                {error && !generating && (
                    <div className="mt-8 p-6 bg-[var(--warn-light)] text-[var(--warn)] rounded-xl border border-[var(--warn)]/20 animate-fade-in text-center">
                        <h4 className="font-bold text-lg mb-2">Generation Failed</h4>
                        <p className="mb-6">{error}</p>
                        <button
                            onClick={() => {
                                setError(null);
                                generateExplanation(weakConcepts[currentIndex], strongConcepts);
                            }}
                            className="px-6 py-2 bg-[var(--warn)] text-white rounded-lg font-medium hover:bg-[var(--warn)]/90 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                )}
            </main>
        </DashboardLayout>
    );
}
