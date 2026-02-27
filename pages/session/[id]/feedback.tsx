import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Youtube, Target, ArrowRight, BookOpen, MessageSquare, BrainCircuit, Bot, Edit3, Search, PlayCircle } from 'lucide-react';
import { InlineUpgradeCard } from '@/components/billing/InlineUpgradeCard';
import { useAuth } from '@/contexts/AuthContext';
import { useSparks } from '@/hooks/useSparks';
import { useSessionMaterials } from '@/hooks/useSessionMaterials';
import { Zap, RotateCcw } from 'lucide-react';

export default function FeedbackReport() {
    const router = useRouter();
    const { id } = router.query;
    const [title, setTitle] = useState("How Transformer Models Work");
    const [report, setReport] = useState<any>(null);
    const [concepts, setConcepts] = useState<any[]>([]);
    const [assessments, setAssessments] = useState<any[]>([]);
    const { user } = useAuth();
    const { balance } = useSparks();
    const { materials, refetch } = useSessionMaterials(id as string);

    const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
    const [regenerateTarget, setRegenerateTarget] = useState<{ type: string, cost: number, name: string } | null>(null);

    const openRegenerateModal = (e: React.MouseEvent, type: string, cost: number, name: string) => {
        e.preventDefault();
        e.stopPropagation();
        setRegenerateTarget({ type, cost, name });
        setIsRegenerateModalOpen(true);
    };

    const handleConfirmRegenerate = () => {
        if (!regenerateTarget) return;
        setIsRegenerateModalOpen(false);

        router.push(`/learn/${id}/${regenerateTarget.type}?regenerate=true`);
    };

    useEffect(() => {
        const stored = localStorage.getItem('serify_feedback_report');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.report) {
                    setReport(parsed.report);
                    setTitle(parsed.title || "Your Session");
                    setConcepts(parsed.concepts || []);
                    setAssessments(parsed.assessments || []);
                }
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    const getConceptName = (id: string) => {
        const c = concepts.find(c => c.id === id);
        return c ? c.name : 'Concept';
    };

    if (!report) {
        return (
            <DashboardLayout>
                <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <Head>
                <title>Feedback Report | Serify</title>
            </Head>

            <div className="max-w-[900px] mx-auto w-full px-6 md:px-8 py-8 space-y-16 pb-24">

                <header className="space-y-6 pt-4">
                    <div className="flex items-center gap-3 text-[var(--muted)]">
                        <Youtube size={18} className="text-red-500" />
                        <h3 className="font-medium text-sm">{title}</h3>
                        <span className="text-xs opacity-60">• Today</span>
                    </div>

                    <p className="text-2xl md:text-3xl font-display leading-[1.4] text-[var(--text)]">
                        &quot;{report.summary_sentence}&quot;
                    </p>

                    <div className="flex flex-wrap items-center gap-4">
                        {report.overall_counts?.['solid'] > 0 && (
                            <span className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-light)] text-[var(--accent)] rounded-lg text-sm font-bold">
                                <span className="w-2 h-2 rounded-full bg-[var(--accent)]" /> {report.overall_counts['solid']} Solid
                            </span>
                        )}
                        {report.overall_counts?.['developing'] > 0 && (
                            <span className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold">
                                <span className="w-2 h-2 rounded-full bg-blue-500" /> {report.overall_counts['developing']} Developing
                            </span>
                        )}
                        {report.overall_counts?.['skipped'] > 0 && (
                            <span className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">
                                <span className="w-2 h-2 rounded-full bg-gray-500" /> {report.overall_counts['skipped']} Skipped
                            </span>
                        )}
                        {report.overall_counts?.['shaky'] > 0 && (
                            <span className="flex items-center gap-2 px-3 py-1.5 bg-[var(--shallow-light)] text-[var(--shallow)] rounded-lg text-sm font-bold">
                                <span className="w-2 h-2 rounded-full bg-[var(--shallow)]" /> {report.overall_counts['shaky']} Shaky
                            </span>
                        )}
                        {report.overall_counts?.['revisit'] > 0 && (
                            <span className="flex items-center gap-2 px-3 py-1.5 bg-[var(--missing-light)] text-[var(--missing)] rounded-lg text-sm font-bold">
                                <span className="w-2 h-2 rounded-full bg-[var(--missing)]" /> {report.overall_counts['revisit']} Revisit
                            </span>
                        )}
                    </div>
                </header>

                <section className="space-y-6">
                    <h2 className="text-3xl font-display text-[var(--text)] border-b border-[var(--border)] pb-4">Strength Map</h2>

                    <div className="space-y-5">
                        {report.strength_map?.map((item: any, idx: number) => {
                            let barColor = 'bg-[var(--accent)]';
                            let barWidth = 'w-full';
                            let badgeClass = 'bg-[var(--accent-light)] text-[var(--accent)]';

                            if (item.mastery_state === 'developing') {
                                barColor = 'bg-blue-500';
                                barWidth = 'w-3/4';
                                badgeClass = 'bg-blue-50 text-blue-600';
                            } else if (item.mastery_state === 'shaky') {
                                barColor = 'bg-[var(--shallow)]';
                                barWidth = 'w-1/2';
                                badgeClass = 'bg-[var(--shallow-light)] text-[var(--shallow)]';
                            } else if (item.mastery_state === 'skipped') {
                                barColor = 'bg-gray-400';
                                barWidth = 'w-[10%]';
                                badgeClass = 'bg-gray-100 text-gray-700';
                            } else if (item.mastery_state === 'revisit') {
                                barColor = 'bg-[var(--missing)]';
                                barWidth = 'w-1/4';
                                badgeClass = 'bg-[var(--missing-light)] text-[var(--missing)]';
                            }

                            return (
                                <div key={idx} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                                    <div className="flex flex-wrap md:flex-nowrap justify-between items-start gap-4 mb-4">
                                        <div>
                                            <h4 className="font-bold text-lg text-[var(--text)] mb-2">{getConceptName(item.concept_id)}</h4>
                                            <div className="w-32 bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
                                                <div className={`${barColor} ${barWidth} h-full`}></div>
                                            </div>
                                        </div>
                                        <div className={`shrink-0 px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${badgeClass}`}>
                                            {item.mastery_state}
                                        </div>
                                    </div>
                                    <p className="text-[var(--text)] text-[15px] leading-relaxed">
                                        {item.feedback_text}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {assessments.length > 0 && assessments.filter(a => a.explanation_requested).length > 0 && (
                        <div className="mt-8 p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
                            <h4 className="font-bold text-[var(--text)] mb-2 flex items-center gap-2">
                                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">?</span>
                                Help Me Understand
                            </h4>
                            <p className="text-[var(--text)] leading-relaxed text-[15px]">
                                You requested explanations on <strong>{assessments.filter(a => a.explanation_requested).length} of {assessments.length} questions</strong>. This is completely normal and useful — it means you&apos;re engaging honestly rather than guessing. Concepts where you needed support before answering are marked above and are good candidates for your next review session.
                            </p>
                        </div>
                    )}

                    {assessments.filter(a => a.skipped).length > 0 && (
                        <div className="mt-4 p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
                            <h4 className="font-bold text-[var(--text)] mb-2 flex items-center gap-2">
                                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-700 text-xs font-bold">!</span>
                                Missing Retrieval
                            </h4>
                            <p className="text-[var(--text)] leading-relaxed text-[15px]">
                                You skipped <strong>{assessments.filter(a => a.skipped).length}</strong> questions because you couldn&apos;t recall the concept. This absence of retrieval is a strong diagnostic signal. Reviewing these topics is your highest priority.
                            </p>
                        </div>
                    )}

                    {concepts.length > (assessments?.length || 5) && (
                        <div className="mt-4 p-6 bg-blue-50/50 border border-blue-200 rounded-2xl">
                            <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-200 text-blue-800 text-xs font-bold">ℹ</span>
                                Concepts Saved to Vault
                            </h4>
                            <p className="text-blue-900/80 leading-relaxed text-[15px]">
                                To keep this session focused, we tested you on <strong>{assessments?.length || 5}</strong> primary concepts. The remaining <strong>{concepts.length - (assessments?.length || 5)}</strong> concepts from your material have been saved directly to your Concept Vault. You can review them anytime using Flow Mode or Flashcards.
                            </p>
                        </div>
                    )}
                </section>

                <section className="space-y-6">
                    <h2 className="text-3xl font-display text-[var(--text)] border-b border-[var(--border)] pb-4">Cognitive Analysis</h2>

                    {user?.plan === 'free' ? (
                        <InlineUpgradeCard
                            featureName="Cognitive Analysis"
                            description="See the full breakdown of your thinking patterns, overconfidence gaps, and exactly where your understanding breaks down."
                            onUpgradeClick={() => router.push('/pricing')}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <h4 className="font-bold text-[var(--accent)] text-lg flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] opacity-60" /> What you understand well
                                </h4>
                                <p className="text-[var(--text)] leading-relaxed text-[15px]">
                                    {report.cognitive_analysis?.strong_patterns || "You demonstrated solid intuition overall."}
                                </p>
                            </div>
                            <div className="space-y-3">
                                <h4 className="font-bold text-[var(--missing)] text-lg flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--missing)] opacity-60" /> Where understanding breaks down
                                </h4>
                                <p className="text-[var(--text)] leading-relaxed text-[15px]">
                                    {report.cognitive_analysis?.weak_patterns || "No major weak patterns detected."}
                                </p>
                            </div>
                        </div>
                    )}
                </section>

                { }
                {user?.plan === 'free' ? (
                    <section className="space-y-6 mb-8">
                        <h2 className="text-3xl font-display text-[var(--text)] border-b border-[var(--border)] pb-4">Misconceptions Detected</h2>
                        <InlineUpgradeCard
                            featureName="Misconception Detection"
                            description="See hidden, deep-rooted flaws in your mental models."
                            onUpgradeClick={() => router.push('/pricing')}
                        />
                    </section>
                ) : (
                    report.misconception_report && report.misconception_report.length > 0 && (
                        <section className="space-y-6">
                            <h2 className="text-3xl font-display text-[var(--text)] border-b border-[var(--border)] pb-4">Misconceptions Detected</h2>
                            {report.misconception_report.map((misc: any, idx: number) => (
                                <div key={idx} className="bg-[var(--missing-light)] border border-[var(--missing)]/20 rounded-2xl p-6 mb-4">
                                    <h4 className="font-bold text-xl text-[var(--missing)] mb-4">{getConceptName(misc.concept_id)}</h4>
                                    <div className="space-y-4 text-[15px]">
                                        <div>
                                            <span className="font-bold text-[var(--text)]">Your answer suggests:</span>
                                            <p className="text-[var(--text)]/80 mt-1">{misc.implied_belief}</p>
                                        </div>
                                        <div>
                                            <span className="font-bold text-[var(--accent)]">The actual reality:</span>
                                            <p className="text-[var(--text)] mt-1">{misc.actual_reality}</p>
                                        </div>
                                        {misc.why_it_matters && (
                                            <div className="bg-white/40 p-3 rounded-lg mt-2 shadow-sm border border-white/50">
                                                <span className="font-bold text-[var(--missing)]">Why this matters:</span>
                                                <p className="text-[var(--text)] mt-1 text-sm">{misc.why_it_matters}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </section>
                    )
                )}

                { }
                {user?.plan === 'free' ? (
                    <section className="space-y-6 mb-8 mt-8">
                        <h2 className="text-3xl font-display text-[var(--text)] border-b border-[var(--border)] pb-4">What to Do Next</h2>
                        <InlineUpgradeCard
                            featureName="Personalized Action Plan"
                            description="Get AI-generated focus suggestions to guide your next study steps."
                            onUpgradeClick={() => router.push('/pricing')}
                        />
                    </section>
                ) : (
                    <section className="space-y-6">
                        <h2 className="text-3xl font-display text-[var(--text)] border-b border-[var(--border)] pb-4">What to Do Next</h2>
                        <ul className="space-y-4">
                            {report.focus_suggestions?.filter((s: any) => s.title || s.reason).map((suggestion: any, idx: number) => (
                                <li key={idx} className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0 font-display text-xl">{idx + 1}</div>
                                    <div>
                                        <h4 className="font-bold text-[var(--text)]">{suggestion.title || 'Next Step'}</h4>
                                        {suggestion.reason && <p className="text-[var(--muted)] text-[15px] mt-1">{suggestion.reason}</p>}
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <div className="pt-6 flex flex-wrap items-center gap-4">
                            <Link href="/" className="px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-medium hover:bg-[var(--accent)]/90 shadow-sm transition-all hover:-translate-y-0.5">
                                Go to Dashboard &rarr;
                            </Link>
                        </div>
                    </section>
                )}

                { }
                <section className="mt-16 pt-8 border-t-2 border-[var(--border)]">
                    <div className="mb-8">
                        <h2 className="text-[22px] font-display text-[var(--text)]">Fix these gaps now</h2>
                        {(() => {
                            const counts = report.overall_counts || {};
                            const hasRevisit = counts['revisit'] > 0;
                            const hasShaky = counts['shaky'] > 0;

                            let recommendationText = "Based on your session, we recommend starting with Flashcards.";
                            let recommendedMode = "Flashcards";

                            if (hasRevisit) {
                                recommendationText = "Based on your results, Flow Mode will coach you through each gap concept interactively. Highly recommended!";
                                recommendedMode = "Flow Mode";
                            } else if (hasShaky) {
                                recommendationText = "Based on your results, Flow Mode or Flashcards can help solidify what's fuzzy.";
                                recommendedMode = "Flow Mode";
                            }

                            return <p className="text-[13.5px] text-[var(--muted)] mt-1">{recommendationText}</p>;
                        })()}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {}
                        {(report.overall_counts?.['shaky'] > 0 || report.overall_counts?.['revisit'] > 0) && (
                            <div className={`group p-5 bg-gradient-to-br from-[#7c3aed15] to-[#4f46e510] border border-[#7c3aed55] hover:border-[#7c3aed] rounded-2xl transition-all relative overflow-hidden flex flex-col ${!balance || balance.total_sparks < 1 ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div className="flex items-start justify-between mb-3 relative z-10">
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                                        <PlayCircle size={20} />
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-md shadow-sm">New</span>
                                </div>
                                <h3 className="font-bold text-[var(--text)] text-lg mb-1 relative z-10">Flow Mode</h3>
                                <p className="text-[14px] text-[var(--muted)] mb-4 flex-1 relative z-10">AI-coached step-by-step learning on your exact gaps. Interactive and adaptive.</p>
                                <div className="flex items-center justify-between mt-auto relative z-10">
                                    <Link href={`/flow?session=${id}`} className="text-[13px] font-medium text-purple-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        Start Flow &rarr;
                                    </Link>
                                    <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                        <Zap size={10} fill="currentColor" /> 1 Spark
                                    </span>
                                </div>
                                <Link href={`/flow?session=${id}`} className="absolute inset-0 z-0" aria-label="Flow Mode" />
                            </div>
                        )}

                        { }
                        <div
                            className={`group p-5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-2xl transition-all relative overflow-hidden flex flex-col ${(!balance || balance.total_sparks < 1) && !materials?.flashcards?.exists ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-3 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center">
                                    <BookOpen size={20} />
                                </div>
                            </div>
                            <h3 className="font-bold text-[var(--text)] text-lg mb-1 relative z-10">Flashcards</h3>
                            <p className="text-[14px] text-[var(--muted)] mb-4 flex-1 relative z-10">Rapid-fire cards on your weak concepts. Mark what sticks.</p>
                            <div className="flex items-center justify-between mt-auto relative z-10">
                                <Link href={`/learn/${id}/flashcards`} className="text-[13px] font-medium text-[var(--accent)] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    {materials?.flashcards?.exists ? 'Review \u2192' : 'Start \u2192'}
                                </Link>
                                <div className="flex items-center gap-2">
                                    {materials?.flashcards?.exists && (
                                        <button onClick={(e) => openRegenerateModal(e, 'flashcards', 1, 'Flashcards')} className="p-1 hover:bg-black/5 rounded text-[var(--muted)] hover:text-[var(--text)] transition-colors" title="Regenerate">
                                            <RotateCcw size={14} />
                                        </button>
                                    )}
                                    {materials?.flashcards?.exists ? (
                                        <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                            Saved
                                        </span>
                                    ) : (
                                        <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                            <Zap size={10} fill="currentColor" /> 1 Spark
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Link href={`/learn/${id}/flashcards`} className="absolute inset-0 z-0" aria-label="Flashcards" />
                        </div>

                        { }
                        <div
                            className={`group p-5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-2xl transition-all relative overflow-hidden flex flex-col ${!balance || balance.total_sparks < 1 ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-3 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <MessageSquare size={20} />
                                </div>
                            </div>
                            <h3 className="font-bold text-[var(--text)] text-lg mb-1 relative z-10">Explain It To Me</h3>
                            <p className="text-[14px] text-[var(--muted)] mb-4 flex-1 relative z-10">Serify teaches each gap concept clearly, no pressure.</p>
                            <div className="flex items-center justify-between mt-auto relative z-10">
                                <Link href={`/learn/${id}/explain`} className="text-[13px] font-medium text-[var(--accent)] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    {materials?.conceptExplanations?.exists ? 'Review \u2192' : 'Start \u2192'}
                                </Link>
                                <div className="flex items-center gap-2">
                                    {materials?.conceptExplanations?.exists && (
                                        <button onClick={(e) => openRegenerateModal(e, 'explain', 1, 'Explain It To Me')} className="p-1 hover:bg-black/5 rounded text-[var(--muted)] hover:text-[var(--text)] transition-colors" title="Regenerate">
                                            <RotateCcw size={14} />
                                        </button>
                                    )}
                                    {materials?.conceptExplanations?.exists ? (
                                        <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                            Saved
                                        </span>
                                    ) : (
                                        <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                            <Zap size={10} fill="currentColor" /> 1 Spark
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Link href={`/learn/${id}/explain`} className="absolute inset-0 z-0" aria-label="Explain It To Me" />
                        </div>

                        { }
                        <div
                            className={`group p-5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-2xl transition-all relative overflow-hidden flex flex-col ${!balance || balance.total_sparks < 2 ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-3 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                    <BrainCircuit size={20} />
                                </div>
                            </div>
                            <h3 className="font-bold text-[var(--text)] text-lg mb-1 relative z-10">Feynman Method</h3>
                            <p className="text-[14px] text-[var(--muted)] mb-4 flex-1 relative z-10">Explain the concept back as if teaching someone else.</p>
                            <div className="flex items-center justify-between mt-auto relative z-10">
                                <Link href={`/learn/${id}/feynman`} className="text-[13px] font-medium text-[var(--accent)] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    {materials?.feynman?.exists ? 'Continue \u2192' : 'Start \u2192'}
                                </Link>
                                <div className="flex items-center gap-2">
                                    {materials?.feynman?.exists ? (
                                        <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                            {materials.feynman.attemptCount} Attempts
                                        </span>
                                    ) : (
                                        <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                            <Zap size={10} fill="currentColor" /> 2 Sparks
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Link href={`/learn/${id}/feynman`} className="absolute inset-0 z-0" aria-label="Feynman Method" />
                        </div>

                        { }
                        {user?.plan === 'free' ? (
                            <div className="group p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl transition-all relative overflow-hidden opacity-70">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center">
                                        <Bot size={20} />
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-md shadow-sm">Pro</span>
                                </div>
                                <h3 className="font-bold text-[var(--text)] text-lg mb-1">AI Tutor</h3>
                                <p className="text-[14px] text-[var(--muted)] mb-4">Conversation with a tutor targeting your gaps.</p>
                                <Link href="/pricing" className="text-[13px] font-medium text-blue-600 flex items-center gap-1 hover:underline">
                                    Upgrade to unlock &rarr;
                                </Link>
                            </div>
                        ) : (
                            <div
                                className={`group p-5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-2xl transition-all relative overflow-hidden flex flex-col ${(!balance || balance.total_sparks < 1) && !materials?.tutorConversation?.exists ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <div className="flex items-start justify-between mb-3 relative z-10">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Bot size={20} />
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-md shadow-sm">Pro</span>
                                </div>
                                <h3 className="font-bold text-[var(--text)] text-lg mb-1 relative z-10">AI Tutor</h3>
                                <p className="text-[14px] text-[var(--muted)] mb-4 flex-1 relative z-10">Have a conversation with a tutor who knows your exact gaps.</p>
                                <div className="flex items-center justify-between mt-auto relative z-10">
                                    <Link href={`/learn/${id}/tutor`} className="text-[13px] font-medium text-[var(--accent)] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        {materials?.tutorConversation?.exists ? 'Resume \u2192' : 'Start \u2192'}
                                    </Link>
                                    <div className="flex items-center gap-2">
                                        {materials?.tutorConversation?.exists && (
                                            <button onClick={(e) => openRegenerateModal(e, 'tutor', 1, 'AI Tutor')} className="p-1 hover:bg-black/5 rounded text-[var(--muted)] hover:text-[var(--text)] transition-colors" title="Restart">
                                                <RotateCcw size={14} />
                                            </button>
                                        )}
                                        {materials?.tutorConversation?.exists ? (
                                            <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                                In Progress
                                            </span>
                                        ) : (
                                            <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                                <Zap size={10} fill="currentColor" /> 1 Spark
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Link href={`/learn/${id}/tutor`} className="absolute inset-0 z-0" aria-label="AI Tutor" />
                            </div>
                        )}

                        { }
                        {user?.plan === 'free' ? (
                            <div className="group p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl transition-all relative overflow-hidden opacity-70">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center">
                                        <Edit3 size={20} />
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-[var(--border)] text-[var(--muted)] rounded-md shadow-sm">Pro</span>
                                </div>
                                <h3 className="font-bold text-[var(--text)] text-lg mb-1">Practice Quiz</h3>
                                <p className="text-[14px] text-[var(--muted)] mb-4">New questions targeting only your weak concepts.</p>
                                <Link href="/pricing" className="text-[13px] font-medium text-[var(--accent)] flex items-center gap-1 hover:underline">
                                    Upgrade to unlock &rarr;
                                </Link>
                            </div>
                        ) : (
                            <div
                                className={`group p-5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-2xl transition-all relative overflow-hidden flex flex-col ${(!balance || balance.total_sparks < 1) && !materials?.practiceQuiz?.exists ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <div className="flex items-start justify-between mb-3 relative z-10">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <Edit3 size={20} />
                                    </div>
                                </div>
                                <h3 className="font-bold text-[var(--text)] text-lg mb-1 relative z-10">Practice Quiz</h3>
                                <p className="text-[14px] text-[var(--muted)] mb-4 flex-1 relative z-10">New questions targeting only your weak concepts.</p>
                                <div className="flex items-center justify-between mt-auto relative z-10">
                                    <Link href={`/learn/${id}/practice`} className="text-[13px] font-medium text-[var(--accent)] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        {materials?.practiceQuiz?.exists ? 'Review \u2192' : 'Start \u2192'}
                                    </Link>
                                    <div className="flex items-center gap-2">
                                        {materials?.practiceQuiz?.exists && (
                                            <button onClick={(e) => openRegenerateModal(e, 'practice', 1, 'Practice Quiz')} className="p-1 hover:bg-black/5 rounded text-[var(--muted)] hover:text-[var(--text)] transition-colors" title="Regenerate">
                                                <RotateCcw size={14} />
                                            </button>
                                        )}
                                        {materials?.practiceQuiz?.exists ? (
                                            <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                                Saved
                                            </span>
                                        ) : (
                                            <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                                <Zap size={10} fill="currentColor" /> 1 Spark
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Link href={`/learn/${id}/practice`} className="absolute inset-0 z-0" aria-label="Practice Quiz" />
                            </div>
                        )}

                        { }
                        {user?.plan === 'free' ? (
                            <div className="group p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl transition-all relative overflow-hidden opacity-70">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center">
                                        <Search size={20} />
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-[var(--border)] text-[var(--muted)] rounded-md shadow-sm">Pro</span>
                                </div>
                                <h3 className="font-bold text-[var(--text)] text-lg mb-1">Concept Deep Dive</h3>
                                <p className="text-[14px] text-[var(--muted)] mb-4">A structured mini-lesson on your most critical gap.</p>
                                <Link href="/pricing" className="text-[13px] font-medium text-[var(--accent)] flex items-center gap-1 hover:underline">
                                    Upgrade to unlock &rarr;
                                </Link>
                            </div>
                        ) : (
                            <div
                                className={`group p-5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-2xl transition-all relative overflow-hidden flex flex-col ${(!balance || balance.total_sparks < 2) && !materials?.deepDive?.exists ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <div className="flex items-start justify-between mb-3 relative z-10">
                                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                        <Search size={20} />
                                    </div>
                                </div>
                                <h3 className="font-bold text-[var(--text)] text-lg mb-1 relative z-10">Concept Deep Dive</h3>
                                <p className="text-[14px] text-[var(--muted)] mb-4 flex-1 relative z-10">A structured mini-lesson on your most critical gap.</p>
                                <div className="flex items-center justify-between mt-auto relative z-10">
                                    <Link href={`/learn/${id}/deepdive`} className="text-[13px] font-medium text-[var(--accent)] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        {materials?.deepDive?.exists ? 'Review \u2192' : 'Start \u2192'}
                                    </Link>
                                    <div className="flex items-center gap-2">
                                        {materials?.deepDive?.exists && (
                                            <button onClick={(e) => openRegenerateModal(e, 'deepdive', 2, 'Concept Deep Dive')} className="p-1 hover:bg-black/5 rounded text-[var(--muted)] hover:text-[var(--text)] transition-colors" title="Regenerate">
                                                <RotateCcw size={14} />
                                            </button>
                                        )}
                                        {materials?.deepDive?.exists ? (
                                            <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                                Saved
                                            </span>
                                        ) : (
                                            <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                                <Zap size={10} fill="currentColor" /> 2 Sparks
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Link href={`/learn/${id}/deepdive`} className="absolute inset-0 z-0" aria-label="Concept Deep Dive" />
                            </div>
                        )}
                    </div>
                </section>

                <section className="pt-8 border-t border-[var(--border)] flex items-center justify-between">
                    <div className="text-[var(--muted)] text-sm font-medium">Share your results</div>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-black/5 transition-colors">
                        Generate Report Card
                    </button>
                </section>

            </div>

            {/* Spark Action Confirmation Modal */}
            {isRegenerateModalOpen && regenerateTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-xl animate-scale-in">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                                <Zap size={20} fill="currentColor" />
                            </div>
                            <h3 className="text-xl font-display text-[var(--text)]">Confirm Action</h3>
                        </div>
                        <p className="text-[var(--text)] text-[15px] leading-relaxed mb-6">
                            Are you sure you want to regenerate <strong>{regenerateTarget.name}</strong>? This action will cost <strong className="text-amber-600">{regenerateTarget.cost} Spark{regenerateTarget.cost > 1 ? 's' : ''}</strong> and cannot be undone.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsRegenerateModalOpen(false)}
                                className="px-4 py-2 text-[var(--muted)] hover:text-[var(--text)] font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmRegenerate}
                                className="px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-xl hover:bg-[var(--accent)]/90 transition-all shadow-sm"
                            >
                                Confirm & Pay
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
