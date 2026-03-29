import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SEO from '@/components/Layout/SEO';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { CheckCircle2, AlertTriangle, ArrowRight, Brain, Check, Search, BookOpen, Target, Sparkles, Loader2, Send } from 'lucide-react';
import { useUsage } from '@/hooks/useUsage';
import { UsageGate, UsageWarning } from '@/components/billing/UsageEnforcement';
import GeneratingAnimation from '@/components/GeneratingAnimation';

export default function DeepDiveMode() {
    const router = useRouter();
    const { id } = router.query;
    const { user, token, loading: authLoading } = useAuth();
    const { isAllowed, increment, refresh } = useUsage('deep_dive');

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
                    isComplete: false 
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
            const headers: any = { 
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            };

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

                const headers: any = { 
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                };

                if (data.evaluation?.isCorrect) {
                    fetch(`/api/sessions/${id}/deepdive/${targetConcept.id}/confirm`, {
                        method: 'PATCH',
                        headers
                    }).catch(console.error);
                }

                if (sessionData && data.evaluation) {
                    fetch('/api/learn/mastery-update', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {})
                        },
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
            <div className="flex flex-col justify-center min-h-screen bg-[var(--bg)] px-6 py-16">
                <div className="w-full max-w-2xl mx-auto space-y-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100 animate-pulse">
                                <Search size={22} />
                            </div>
                            <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">Deep Dive Engine</h3>
                        </div>
                        <h3 className="text-3xl font-display text-[var(--text)]">
                            Synthesizing Analysis
                        </h3>
                        <p className="text-[var(--muted)] text-lg max-w-lg">
                            Constructing a personalized cognitive guide for <strong>{targetConcept?.name}</strong> based on your specific gaps.
                        </p>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-12 flex flex-col items-center justify-center gap-6 shadow-sm">
                        <GeneratingAnimation type="text" />
                    </div>
                </div>
            </div>
        );
    }

    if (!hasStarted && targetConcept) {
        return (
            <div className="flex flex-col items-center pt-24 min-h-screen bg-[var(--bg)] px-6">
                <div className="w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-rose-500 to-indigo-600 text-white flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/20 rotate-3">
                    <Search size={40} strokeWidth={2.5} />
                </div>
                
                <div className="max-w-xl text-center space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.25em]">Cognitive Intervention</h3>
                        <h2 className="text-4xl md:text-5xl font-display text-[var(--text)] tracking-tight">
                            {targetConcept.name}
                        </h2>
                    </div>
                    
                    <p className="text-[var(--muted)] text-lg leading-relaxed">
                        We noticed a conceptual gap here. Let&apos;s deconstruct this idea and build a stronger mental model from the ground up.
                    </p>

                    <div className="pt-6 flex flex-col items-center gap-4 w-full">
                        <UsageGate feature='deep_dive'>
                            <button
                                onClick={() => {
                                    setHasStarted(true);
                                    generateDeepDive(targetConcept);
                                }}
                                className="w-full py-5 bg-rose-600 text-white rounded-[2rem] font-black text-lg hover:bg-rose-700 hover:shadow-xl hover:shadow-rose-600/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                <Sparkles size={20} />
                                Generate Deep Dive
                                <ArrowRight size={20} />
                            </button>
                        </UsageGate>
                        <UsageWarning feature='deep_dive' />
                        
                        <Link 
                            href={`/session/${id}/feedback`}
                            className="text-xs font-bold text-[var(--muted)] hover:text-[var(--text)] uppercase tracking-widest transition-colors"
                        >
                            Return to Report
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col pt-12">
                <div className="max-w-[600px] mx-auto w-full px-6 flex-1 flex flex-col items-center pt-24 text-center space-y-6">
                    <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shadow-inner">
                        <AlertTriangle size={40} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-display">Generation Failed</h2>
                        <p className="text-[var(--muted)] text-lg">{error}</p>
                    </div>
                    <Link
                        href={`/session/${id}/feedback`}
                        className="px-8 py-3 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-xl font-bold hover:bg-black/5 transition-all"
                    >
                        Return to Report
                    </Link>
                </div>
            </div>
        );
    }

    if (!deepDive) return null;

    const sidebar = (
        <div className="space-y-8">
            <div className="space-y-4">
                <div className="px-3 flex items-center gap-2">
                    <Target size={14} className="text-rose-600" />
                    <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
                        Focus Target
                    </h3>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
                    <p className="text-sm font-bold leading-tight mb-1">{targetConcept?.name}</p>
                    <p className="text-[11px] text-[var(--muted)] leading-relaxed">Addressing recorded misconceptions.</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="px-3 flex items-center gap-2">
                    <BookOpen size={14} className="text-[var(--muted)]" />
                    <h3 className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">
                        Learning Path
                    </h3>
                </div>
                <div className="space-y-2">
                    {weakConcepts.map((c: any, idx: number) => {
                        const isCurrent = targetConcept?.id === c.id;
                        return (
                            <div
                                key={c.id}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isCurrent
                                    ? 'bg-rose-600/5 text-rose-600 font-bold border border-rose-600/10'
                                    : 'text-[var(--muted)] hover:bg-[var(--bg)]'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all ${isCurrent
                                    ? 'border-rose-600 bg-rose-600 text-white'
                                    : 'border-[var(--border)] bg-transparent'
                                    }`}>
                                    <span className="text-[9px] font-black">{idx + 1}</span>
                                </div>
                                <span className="text-[13px] truncate font-medium">{c.name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <DashboardLayout
            backLink={`/session/${id}/feedback`}
            sidebarContent={sidebar}
            replaceNav={true}
        >
            <SEO title={`Deep Dive: ${deepDive.title}`} />

            <main className="max-w-3xl mx-auto px-6 py-12 md:py-16 pb-32">
                {}
                <header className="mb-16 space-y-6 border-b border-[var(--border)] pb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-rose-100">
                        <Sparkles size={12} fill="currentColor" /> Concept Deep Dive
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display font-black leading-[1.1] tracking-tight text-[var(--text)]">
                        {deepDive.title}
                    </h1>
                </header>

                {}
                <div className="space-y-16">
                    {deepDive.sections?.map((section: any, idx: number) => (
                        <section key={idx} className="relative scroll-reveal">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center font-display text-lg font-bold text-rose-600 shadow-sm">
                                    {idx + 1}
                                </div>
                                <h2 className="text-xl md:text-2xl font-display font-bold text-[var(--text)] tracking-tight">
                                    {section.heading}
                                </h2>
                            </div>
                            <div className="prose prose-lg prose-rose prose-p:leading-relaxed text-[var(--text)] max-w-none bg-[var(--surface)] p-8 rounded-[2rem] border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
                                <MarkdownRenderer>{section.content}</MarkdownRenderer>
                            </div>
                        </section>
                    ))}
                </div>

                {}
                <div className="mt-24 pt-16 border-t border-[var(--border)]">
                    <div className="max-w-2xl mx-auto bg-[var(--surface)] border-2 border-[var(--border)] rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-black/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 via-indigo-500 to-purple-600"></div>

                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
                                <Target size={16} />
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600">
                                Comprehension Check
                            </h3>
                        </div>

                        <div className="text-2xl font-display text-[var(--text)] leading-tight mb-10 font-medium">
                            <MarkdownRenderer className="inline-markdown">{deepDive.confirmatoryQuestion}</MarkdownRenderer>
                        </div>

                        {!isComplete ? (
                            <div className="space-y-6">
                                <div className="relative group">
                                    <textarea
                                        value={answer}
                                        onChange={(e) => setAnswer(e.target.value)}
                                        placeholder="Type your explanation here..."
                                        className="w-full bg-[var(--bg)] border-2 border-[var(--border)] rounded-2xl p-6 min-h-[160px] focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 outline-none text-lg resize-none transition-all placeholder:text-[var(--muted)]/40 leading-relaxed"
                                        disabled={evaluating}
                                    />
                                    <div className="absolute top-4 right-6 text-[9px] font-black text-rose-600/30 uppercase tracking-widest">
                                        Evaluation Active
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                                    <div className="flex items-center gap-2 text-[13px] text-[var(--muted)] font-medium italic">
                                        <BookOpen size={14} />
                                        Focus on the core mechanics described above.
                                    </div>
                                    <button
                                        onClick={handleSubmitAnswer}
                                        disabled={!answer.trim() || evaluating}
                                        className="w-full sm:w-auto px-10 py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 hover:-translate-y-1 transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        {evaluating ? (
                                            <><Loader2 size={18} className="animate-spin" /> Evaluating...</>
                                        ) : (
                                            <><Send size={18} /> Submit Answer</>
                                        )}
                                    </button>
                                </div>

                                {feedback && !feedback.isCorrect && (
                                    <div className="mt-8 p-6 bg-rose-50 border border-rose-200 rounded-2xl animate-fade-in-up border-l-8 border-l-rose-500">
                                        <div className="flex items-center gap-2 mb-3">
                                            <AlertTriangle size={18} className="text-rose-600" />
                                            <h4 className="font-black text-rose-700 text-xs uppercase tracking-widest">
                                                Cognitive Gap Detected
                                            </h4>
                                        </div>
                                        <div className="text-rose-950 leading-relaxed text-[15px] font-medium">
                                            <MarkdownRenderer className="inline-markdown">{feedback.feedback}</MarkdownRenderer>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="animate-fade-in text-center py-6">
                                <div className="w-20 h-20 rounded-[2rem] bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center text-4xl mb-8 border-2 border-emerald-100 shadow-sm rotate-6">
                                    <CheckCircle2 size={44} strokeWidth={2.5} />
                                </div>
                                <div className="space-y-3 mb-10">
                                    <h4 className="font-display text-4xl font-black text-[var(--text)] tracking-tight">
                                        Mastery Attained.
                                    </h4>
                                    <div className="text-[var(--text)] leading-relaxed text-lg font-medium max-w-md mx-auto opacity-80">
                                        <MarkdownRenderer className="inline-markdown">{feedback?.feedback}</MarkdownRenderer>
                                    </div>
                                </div>
                                <Link
                                    href={`/session/${id}/feedback`}
                                    className="inline-flex items-center justify-center gap-3 px-12 py-5 bg-slate-900 text-white rounded-[2rem] font-black hover:bg-black hover:shadow-2xl transition-all text-lg active:scale-95 group"
                                >
                                    Finish & Return <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </DashboardLayout>
    );
}
