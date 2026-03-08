import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useSparks } from '@/hooks/useSparks';
import {
    Clock,
    CheckCircle2,
    Circle,
    Edit3,
    X,
    GripVertical,
    AlertTriangle,
    Zap,
    ArrowRight,
    Share2,
    Check,
    ChevronDown,
    ChevronUp,
    BookOpen,
    PlayCircle,
    Lock
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import CurriculumSidebar from '@/components/dashboard/CurriculumSidebar';

export default function CurriculumView() {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();

    const [curriculum, setCurriculum] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [expandedUnits, setExpandedUnits] = useState<Set<number>>(new Set([0]));

    const { balance } = useSparks();
    const isProPlus = user?.subscriptionTier === 'pro';

    useEffect(() => {
        if (id) fetchCurriculum();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (curriculum) {
            // Auto-expand the unit containing the current concept
            const allConcepts = curriculum.units.flatMap((u: any) => u.concepts);
            const currentIndex = curriculum.current_concept_index || 0;
            const currentConcept = allConcepts[currentIndex];
            if (currentConcept) {
                const unitIdx = curriculum.units.findIndex((u: any) =>
                    u.concepts.some((c: any) => c.id === currentConcept.id)
                );
                if (unitIdx !== -1) setExpandedUnits(new Set([unitIdx]));
            }
        }
    }, [curriculum]);

    const fetchCurriculum = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('curricula').select('*').eq('id', id).single();
        if (error || !data) {
            setErrorMsg('Curriculum not found or you do not have permission to view it.');
        } else {
            setCurriculum(data);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)]">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    if (errorMsg || !curriculum) {
        return (
            <DashboardLayout>
                <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[calc(100vh-64px)]">
                    <AlertTriangle size={32} className="text-[var(--warn)] mb-4" />
                    <h2 className="text-xl font-display text-[var(--text)] mb-2">Error loading curriculum</h2>
                    <p className="text-[var(--muted)] mb-6">{errorMsg}</p>
                    <Link href="/learn" className="text-[var(--accent)] hover:underline">Return to Learn Mode</Link>
                </div>
            </DashboardLayout>
        );
    }

    const allConcepts = curriculum.units.flatMap((u: any) => u.concepts);
    const currentIndex = curriculum.current_concept_index || 0;
    const startConcept = allConcepts[currentIndex];
    const completedCount = curriculum.completed_concept_ids?.length || 0;
    const totalCount = curriculum.concept_count || 1;
    const progressPct = Math.min(100, Math.round((completedCount / totalCount) * 100));
    const sparkCostPerConcept = 8;
    const remainingSparkCost = (totalCount - currentIndex) * sparkCostPerConcept;

    const handleShare = () => {
        navigator.clipboard.writeText(`${window.location.origin}/share/curriculum/${curriculum.id}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleStart = () => router.push(`/learn/curriculum/${curriculum.id}/flow`);

    const toggleUnit = (idx: number) => {
        setExpandedUnits(prev => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });
    };

    const getMasteryBadge = (state: string | null) => {
        if (!state) return null;
        const map: Record<string, { cls: string; label: string }> = {
            solid: { cls: 'bg-emerald-100 text-emerald-700', label: 'Solid' },
            developing: { cls: 'bg-blue-100 text-blue-700', label: 'Developing' },
            shaky: { cls: 'bg-amber-100 text-amber-700', label: 'Shaky' },
            revisit: { cls: 'bg-rose-100 text-rose-700', label: 'Revisit' },
        };
        const m = map[state];
        if (!m) return null;
        return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${m.cls}`}>{m.label}</span>;
    };

    return (
        <DashboardLayout
            backLink="/learn"
            sidebarContent={
                <CurriculumSidebar
                    concepts={allConcepts}
                    currentIndex={currentIndex}
                    conceptStatuses={allConcepts.reduce((acc: any, c: any) => {
                        acc[c.id || c.conceptId] = curriculum.completed_concept_ids?.includes(c.id || c.conceptId)
                            ? 'completed'
                            : (allConcepts.indexOf(c) === currentIndex ? 'in_progress' : 'not_started');
                        return acc;
                    }, {})}
                    title={curriculum.title}
                    onConceptClick={(idx) => {
                        if (allConcepts[idx]?.completed || idx === currentIndex) {
                            router.push(`/learn/curriculum/${curriculum.id}/flow`);
                        }
                    }}
                />
            }
        >
            <Head><title>{curriculum.title} | Serify</title></Head>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-32">

                {/* ── HERO ── */}
                <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden mb-6 shadow-sm">
                    {/* Progress bar stripe at top */}
                    <div className="h-1 bg-[var(--border)]">
                        <div
                            className="h-full bg-[var(--accent)] transition-all duration-700"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>

                    <div className="p-6 sm:p-8">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] bg-[var(--accent)]/10 px-2.5 py-1 rounded-full">
                                        Learning Path
                                    </span>
                                    {curriculum.status === 'completed' && (
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                                            Completed
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-display text-[var(--text)] leading-tight">
                                    {curriculum.title}
                                </h1>
                            </div>

                            {/* Mini progress ring */}
                            <div className="shrink-0 relative w-16 h-16">
                                <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
                                    <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4" stroke="var(--border)" />
                                    <circle
                                        cx="22" cy="22" r="18" fill="none" strokeWidth="4"
                                        stroke="var(--accent)"
                                        strokeDasharray={`${2 * Math.PI * 18}`}
                                        strokeDashoffset={`${2 * Math.PI * 18 * (1 - progressPct / 100)}`}
                                        strokeLinecap="round"
                                        className="transition-all duration-700"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-sm font-bold text-[var(--text)] leading-none">{progressPct}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats row */}
                        <div className="flex flex-wrap gap-4 mb-6 text-sm text-[var(--muted)]">
                            <div className="flex items-center gap-1.5">
                                <BookOpen size={14} />
                                <span>{totalCount} concepts · {curriculum.units.length} units</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock size={14} />
                                <span>~{Math.round((curriculum.estimated_minutes || totalCount * 15) / 60 * 10) / 10}h total</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span>{completedCount} done</span>
                            </div>
                        </div>

                        {/* Outcomes */}
                        {curriculum.outcomes?.length > 0 && (
                            <div className="bg-[var(--bg)] rounded-2xl p-4 mb-6 border border-[var(--border)]">
                                <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-2">You&apos;ll be able to</p>
                                <ul className="space-y-1">
                                    {curriculum.outcomes.slice(0, 3).map((o: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text)]">
                                            <span className="text-[var(--accent)] mt-0.5 shrink-0">→</span>
                                            {o}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* CTA row */}
                        <div className="flex flex-wrap gap-3 items-center">
                            <button
                                onClick={handleStart}
                                className="flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white font-bold rounded-2xl hover:bg-[var(--accent)]/90 transition-all shadow-lg shadow-[var(--accent)]/20 hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <PlayCircle size={18} />
                                {currentIndex === 0 ? 'Start Learning' : `Resume — ${startConcept?.name}`}
                                <ArrowRight size={16} />
                            </button>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-3 border border-[var(--border)] rounded-2xl text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--text)]/30 transition-all"
                            >
                                <Edit3 size={15} />
                                Edit
                            </button>
                            <button
                                onClick={handleShare}
                                className={`flex items-center gap-2 px-4 py-3 border rounded-2xl text-sm font-medium transition-all ${copied ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--text)]/30'}`}
                            >
                                {copied ? <><Check size={15} />Copied!</> : <><Share2 size={15} />Share</>}
                            </button>

                            {/* Spark cost chip */}
                            {!isProPlus && (
                                <div className="ml-auto flex items-center gap-1.5 text-xs text-[var(--muted)]">
                                    <Zap size={12} className="text-[var(--accent)]" />
                                    ~{remainingSparkCost} sparks remaining
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── CONCEPT LIST ── */}
                <div className="space-y-3">
                    {curriculum.units.map((unit: any, uIdx: number) => {
                        const isExpanded = expandedUnits.has(uIdx);
                        const unitCompleted = unit.concepts.every((c: any) =>
                            curriculum.completed_concept_ids?.includes(c.id)
                        );
                        const unitInProgress = unit.concepts.some((c: any) =>
                            allConcepts.indexOf(c) === currentIndex
                        );

                        return (
                            <div key={uIdx} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl relative">
                                {/* Unit header */}
                                <button
                                    onClick={() => toggleUnit(uIdx)}
                                    className={`w-full flex items-center gap-3 px-5 py-4 hover:bg-[var(--bg)] transition-colors text-left ${!isExpanded ? 'rounded-2xl' : 'rounded-t-2xl'}`}
                                >
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${unitCompleted ? 'bg-emerald-500 text-white' :
                                        unitInProgress ? 'bg-[var(--accent)] text-white' :
                                            'bg-[var(--border)] text-[var(--muted)]'
                                        }`}>
                                        {unitCompleted ? '✓' : unit.unitNumber}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm text-[var(--text)] truncate">{unit.unitTitle}</div>
                                        <div className="text-xs text-[var(--muted)]">
                                            {unit.concepts.filter((c: any) => curriculum.completed_concept_ids?.includes(c.id)).length}/{unit.concepts.length} concepts
                                        </div>
                                    </div>
                                    {isExpanded ? <ChevronUp size={16} className="text-[var(--muted)] shrink-0" /> : <ChevronDown size={16} className="text-[var(--muted)] shrink-0" />}
                                </button>

                                {/* Concepts */}
                                {isExpanded && (
                                    <div className="border-t border-[var(--border)]">
                                        {unit.concepts.map((concept: any, cIdx: number) => {
                                            const globalIdx = allConcepts.findIndex((c: any) => c.name === concept.name);
                                            const isCompleted = curriculum.completed_concept_ids?.includes(concept.id);
                                            const isCurrent = globalIdx === currentIndex;
                                            const isLocked = globalIdx > currentIndex && !isCompleted;

                                            return (
                                                <div
                                                    key={concept.id || cIdx}
                                                    className={`flex items-center gap-4 px-5 py-3.5 border-b border-[var(--border)] last:border-0 last:rounded-b-2xl group transition-colors relative ${isCurrent ? 'bg-[var(--accent)]/5' : 'hover:bg-[var(--bg)]'}`}
                                                >
                                                    {/* Status icon */}
                                                    <div className="shrink-0">
                                                        {isCompleted ? (
                                                            <CheckCircle2 size={18} className="text-emerald-500" />
                                                        ) : isCurrent ? (
                                                            <div className="w-5 h-5 relative flex items-center justify-center">
                                                                <div className="w-3 h-3 rounded-full bg-[var(--accent)] animate-pulse" />
                                                                <div className="absolute w-5 h-5 rounded-full border-2 border-[var(--accent)]/30" />
                                                            </div>
                                                        ) : (
                                                            <Circle size={18} className="text-[var(--border)]" />
                                                        )}
                                                    </div>

                                                    {/* Number */}
                                                    <span className="w-6 text-xs text-[var(--muted)] font-mono shrink-0 text-right">{globalIdx + 1}</span>

                                                    {/* Name + definition tooltip */}
                                                    <div className="flex-1 min-w-0 relative">
                                                        <button
                                                            onClick={() => !isLocked && handleStart()}
                                                            disabled={isLocked}
                                                            className={`text-sm font-medium truncate block text-left w-full transition-colors ${isLocked ? 'text-[var(--muted)] cursor-default' :
                                                                isCurrent ? 'text-[var(--accent)]' :
                                                                    'text-[var(--text)] hover:text-[var(--accent)]'
                                                                }`}
                                                        >
                                                            {concept.name}
                                                        </button>
                                                        {concept.definition && (
                                                            <div className="absolute left-0 bottom-full mb-3 w-72 p-4 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-xs rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 hidden md:block backdrop-blur-xl translate-y-1 group-hover:translate-y-0">
                                                                <div className="flex items-center gap-2 mb-2 text-[var(--accent)]">
                                                                    <BookOpen size={12} />
                                                                    <p className="font-bold uppercase tracking-widest text-[10px]">Concept Definition</p>
                                                                </div>
                                                                <p className="font-semibold mb-1.5 text-sm">{concept.name}</p>
                                                                <p className="opacity-80 leading-relaxed text-[13px]">{concept.definition}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Right side badges */}
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {getMasteryBadge(concept.vaultMasteryState)}
                                                        {isCurrent && (
                                                            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-full">
                                                                Up Next
                                                            </span>
                                                        )}
                                                        {isLocked && <Lock size={13} className="text-[var(--border)]" />}
                                                        <span className="text-xs text-[var(--muted)] hidden sm:block">~{concept.estimatedMinutes}m</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── EDIT DRAWER ── */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[var(--surface)] h-full border-l border-[var(--border)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
                            <h3 className="font-display text-xl text-[var(--text)]">Edit Curriculum</h3>
                            <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-[var(--bg)] rounded-lg transition-colors">
                                <X size={20} className="text-[var(--muted)]" />
                            </button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                            <p className="text-sm text-[var(--muted)] mb-6">Drag to reorder. Click × to remove. Edits are cosmetic only.</p>
                            <div className="space-y-2">
                                {allConcepts.map((c: any, idx: number) => (
                                    <div key={idx} className="flex items-center bg-[var(--bg)] border border-[var(--border)] p-3 rounded-xl group">
                                        <GripVertical size={16} className="text-[var(--muted)] mr-3 shrink-0" />
                                        <div className="w-6 text-xs text-[var(--muted)] font-mono shrink-0">{idx + 1}</div>
                                        <div className="flex-1 truncate text-sm font-medium text-[var(--text)]">{c.name}</div>
                                        <button className="p-1.5 text-[var(--muted)] hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 border-t border-[var(--border)] flex justify-end">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-2.5 bg-[var(--accent)] text-white font-medium rounded-xl hover:bg-[var(--accent)]/90 transition-colors"
                            >
                                Done →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
