import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function DeepDiveMode() {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<any>(null);
    const [targetConcept, setTargetConcept] = useState<any>(null);

    const [deepDive, setDeepDive] = useState<any>(null);
    const [generating, setGenerating] = useState(false);

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
                const criticalGap = strengthMap.find((item: any) => item.mastery_state === 'revisit' || item.mastery_state === 'skipped') ||
                    strengthMap.find((item: any) => item.mastery_state === 'developing' || item.mastery_state === 'shaky');

                if (!criticalGap) {
                    router.push(`/session/${id}/feedback`);
                    return;
                }

                const concept = {
                    id: criticalGap.concept_id,
                    name: parsed.concepts?.find((c: any) => c.id === criticalGap.concept_id)?.name || 'Concept',
                    masteryState: criticalGap.mastery_state,
                    feedbackNote: criticalGap.feedback_text
                };

                setSessionData({
                    userId: user?.id || 'placeholder-user-id',
                    sessionId: id as string,
                    concepts: parsed.concepts || []
                });

                setTargetConcept(concept);

                generateDeepDive(concept);

            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };

        if (id) {
            initMode();
        }
    }, [id, router]);

    const generateDeepDive = async (concept: any) => {
        setGenerating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const isRegenerating = router.query.regenerate === 'true';

            const res = await fetch(`/api/sessions/${id}/deepdive/${concept.id}/generate${isRegenerating ? '?regenerate=true' : ''}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ concept })
            });

            if (res.ok) {
                const data = await res.json();
                setDeepDive(data.content);
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

                const { data: { session } } = await supabase.auth.getSession();
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
                <h3 className="text-xl font-display text-[var(--text)]">Synthesizing Deep Dive...</h3>
                <p className="text-[var(--muted)] mt-2 text-sm text-center max-w-sm px-6">
                    Cross-referencing your specific gaps to build a customized guide for <br /><strong>{targetConcept?.name}</strong>.
                </p>
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

    if (!deepDive) return null;

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--text)] flex flex-col pt-16 md:pt-20">
            <Head>
                <title>Deep Dive | Serify</title>
            </Head>

            { }
            <div className="max-w-[800px] w-full mx-auto px-6 mb-8 flex items-center justify-between">
                <Link href={`/session/${id}/feedback`} className="text-[var(--muted)] hover:text-[var(--text)] transition-colors text-sm font-medium flex items-center gap-2">
                    &larr; Exit Deep Dive
                </Link>
                <span className="text-[10px] uppercase tracking-widest text-[var(--muted)] font-black">Serify Intelligence</span>
            </div>

            <main className="flex-1 w-full max-w-[800px] mx-auto p-6 md:p-8 pb-32">

                { }
                <div className="mb-16 border-b-2 border-[var(--text)] pb-8">
                    <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold uppercase tracking-widest rounded-full mb-6 relative">
                        Deep Dive Guide
                    </div>
                    <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight tracking-tight text-[var(--text)]">
                        {deepDive.title}
                    </h1>
                </div>

                { }
                <div className="space-y-16">
                    {deepDive.sections?.map((section: any, idx: number) => (
                        <section key={idx} className="relative">
                            <h2 className="text-2xl font-display font-medium text-[var(--text)] mb-6 flex items-center gap-4">
                                <span className="text-indigo-400 font-serif italic text-3xl">{(idx + 1).toString().padStart(2, '0')}</span>
                                {section.heading}
                            </h2>
                            <div className="prose prose-lg prose-indigo prose-a:text-indigo-600 prose-p:leading-relaxed text-[var(--text)] max-w-none ml-0 md:ml-12 bg-white/50 p-6 rounded-2xl border border-[var(--border)] shadow-sm">
                                <ReactMarkdown>{section.content}</ReactMarkdown>
                            </div>
                        </section>
                    ))}
                </div>

                { }
                <div className="mt-24 pt-16 border-t border-[var(--border)]">
                    <div className="max-w-2xl mx-auto bg-white border border-[var(--border)] rounded-3xl p-8 md:p-12 shadow-xl shadow-black/5 relative overflow-hidden">

                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                        <h3 className="text-xl font-bold uppercase tracking-wider text-[var(--muted)] mb-4 flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Check Your Understanding
                        </h3>
                        <p className="text-2xl font-display text-[var(--text)] leading-snug mb-8">
                            {deepDive.confirmatoryQuestion}
                        </p>

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
                                    <span className="text-[13px] text-[var(--muted)] font-medium">Be specific based on what you just read.</span>
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
                                        <h4 className="font-bold text-rose-700 mb-2">Not quite right...</h4>
                                        <p className="text-rose-900 leading-relaxed text-[15px]">{feedback.feedback}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="animate-fade-in text-center py-6">
                                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-4xl mb-6 shadow-inner">✓</div>
                                <h4 className="font-display text-3xl mb-4 text-[var(--text)]">Nailed it.</h4>
                                <p className="text-[var(--text)] leading-relaxed mb-10 text-lg opacity-80">{feedback?.feedback}</p>
                                <Link href={`/session/${id}/feedback`} className="inline-block px-10 py-4 bg-[var(--text)] text-[var(--background)] rounded-xl font-bold hover:bg-black/80 dark:hover:bg-white/90 transition-all text-lg shadow-xl shadow-black/10">
                                    Return to Report &rarr;
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}
