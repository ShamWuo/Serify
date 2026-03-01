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
    PlayCircle,
    Edit3,
    X,
    GripVertical,
    AlertTriangle,
    Zap,
    ArrowRight,
    ShieldCheck,
    BookOpen
} from 'lucide-react';
import Link from 'next/link';

export default function CurriculumView() {
    const router = useRouter();
    const { id } = router.query;

    const [curriculum, setCurriculum] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const { balance } = useSparks();
    const isProPlus = false; // simplistic check, subscription_tier is not in type

    useEffect(() => {
        if (id) fetchCurriculum();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

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
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (errorMsg || !curriculum) {
        return (
            <DashboardLayout>
                <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[calc(100vh-64px)]">
                    <AlertTriangle size={32} className="text-[var(--warn)] mb-4" />
                    <h2 className="text-xl font-display text-[var(--text)] mb-2">
                        Error loading curriculum
                    </h2>
                    <p className="text-[var(--muted)] mb-6">{errorMsg}</p>
                    <Link href="/learn" className="text-[var(--accent)] hover:underline">
                        Return to Learn Mode
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    // Flatten all concepts to easily find start/index stuff
    const allConcepts = curriculum.units.flatMap((u: any) => u.concepts);
    const currentIndex = curriculum.current_concept_index || 0;
    const startConcept = allConcepts[currentIndex];

    // Find concepts already in vault
    const vaultConcepts = allConcepts.filter((c: any) => c.vaultMasteryState);

    // Calculate spark costs
    const sparkCostPerConcept = 8;
    const totalSparkCost = curriculum.concept_count * sparkCostPerConcept;
    const remainingSparkCost = (curriculum.concept_count - currentIndex) * sparkCostPerConcept;

    const handleStart = () => {
        router.push(`/learn/curriculum/${curriculum.id}/flow`);
    };

    const getMasteryColor = (state: string | null) => {
        switch (state) {
            case 'solid':
                return 'bg-emerald-500 border-emerald-500';
            case 'developing':
                return 'bg-blue-500 border-blue-500';
            case 'shaky':
                return 'bg-amber-400 border-amber-400';
            case 'revisit':
                return 'bg-amber-500 border-amber-500';
            default:
                return 'bg-transparent border-[var(--border)]';
        }
    };

    const getMasteryText = (state: string | null) => {
        if (!state) return 'Not started';
        return state.charAt(0).toUpperCase() + state.slice(1);
    };

    return (
        <DashboardLayout>
            <Head>
                <title>{curriculum.title} | Serify</title>
            </Head>

            <div className="max-w-7xl mx-auto p-6 lg:p-10 min-h-[calc(100vh-64px)] relative">
                <div className="mb-8">
                    <Link
                        href="/learn"
                        className="text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-4 inline-flex items-center"
                    >
                        &larr; Back to Learn Mode
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-display text-[var(--text)] mb-2">
                        {curriculum.title}
                    </h1>
                    <p className="text-[var(--muted)] text-base">
                        Generated for you · {curriculum.concept_count} concepts
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative">
                    {/* LEFT COLUMN: THE CURRICULUM */}
                    <div className="flex-[0_0_65%] min-w-0">
                        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-6 md:p-8">
                            <div className="flex justify-between items-center mb-6 pb-6 border-b border-[var(--border)]">
                                <div>
                                    <div className="text-xs uppercase font-bold tracking-widest text-[var(--accent)] mb-1">
                                        Curriculum Map
                                    </div>
                                    <h2 className="text-xl font-medium text-[var(--text)]">
                                        Learning Path
                                    </h2>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-light text-[var(--text)]">
                                        {Math.round(
                                            (currentIndex / Math.max(1, curriculum.concept_count)) *
                                                100
                                        )}
                                        %
                                    </div>
                                    <div className="text-xs text-[var(--muted)]">
                                        {currentIndex} of {curriculum.concept_count} complete
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-10">
                                {curriculum.units.map((unit: any, uIdx: number) => (
                                    <div key={uIdx} className="relative">
                                        <div className="mb-4">
                                            <h3 className="text-[var(--text)] font-semibold uppercase tracking-wider text-xs bg-[var(--surface)] inline-block px-3 py-1 rounded-full border border-[var(--border)]">
                                                UNIT {unit.unitNumber} &mdash; {unit.unitTitle}
                                            </h3>
                                        </div>

                                        <div className="space-y-1">
                                            {unit.concepts.map((concept: any, cIdx: number) => {
                                                const globalIdx = allConcepts.findIndex(
                                                    (c: any) => c.name === concept.name
                                                );
                                                const isStartHere = globalIdx === currentIndex;
                                                const isCompleted =
                                                    curriculum.completed_concept_ids?.includes(
                                                        concept.id
                                                    );

                                                return (
                                                    <div
                                                        key={concept.id || cIdx}
                                                        className={`group flex items-center p-3 rounded-xl transition-colors relative cursor-default ${isStartHere ? 'bg-[var(--accent)]/5 border border-[var(--accent)]/20' : 'hover:bg-[var(--surface)]'}`}
                                                    >
                                                        <div className="w-6 text-right mr-4 text-[var(--muted)] font-mono text-sm">
                                                            {globalIdx + 1}
                                                        </div>

                                                        <div className="mr-4 relative flex items-center justify-center">
                                                            {isCompleted ? (
                                                                <CheckCircle2
                                                                    size={18}
                                                                    className="text-emerald-500"
                                                                />
                                                            ) : (
                                                                <div
                                                                    className={`w-3.5 h-3.5 rounded-full border-2 ${getMasteryColor(concept.vaultMasteryState)}`}
                                                                ></div>
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[var(--text)] font-medium truncate pr-4 group-hover:text-[var(--accent)] transition-colors inline-block relative">
                                                                {concept.name}

                                                                {/* Tooltip on hover */}
                                                                <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-black text-white text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 hidden md:block">
                                                                    <p className="font-semibold mb-1">
                                                                        {concept.name}
                                                                    </p>
                                                                    <p>{concept.definition}</p>
                                                                    <p className="mt-2 pt-2 border-t border-white/20 text-white/70 italic">
                                                                        {concept.whyIncluded}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="text-[var(--muted)] text-sm whitespace-nowrap hidden sm:block">
                                                            ~{concept.estimatedMinutes} min
                                                        </div>

                                                        {isStartHere && (
                                                            <div className="absolute -left-3 md:-left-8 top-1/2 -translate-y-1/2 flex items-center pr-2 text-[var(--accent)] font-medium text-xs">
                                                                <ArrowRight
                                                                    size={16}
                                                                    className="mr-1 animate-pulse"
                                                                />
                                                                <span className="hidden md:inline">
                                                                    Start here
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-10 pt-6 border-t border-[var(--border)] flex justify-between items-center">
                                <button
                                    onClick={handleStart}
                                    className="px-8 py-4 bg-[var(--text)] text-[var(--surface)] rounded-2xl font-medium hover:bg-black/80 transition-all shadow-md flex items-center"
                                >
                                    {currentIndex === 0
                                        ? 'Start from the beginning'
                                        : `Resume — ${startConcept?.name}`}
                                    <ArrowRight size={18} className="ml-2" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: CONTEXT */}
                    <div className="flex-[0_0_35%] min-w-0">
                        <div className="sticky top-6 space-y-6">
                            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                                <h3 className="font-display text-xl text-[var(--text)] mb-4">
                                    {curriculum.title}
                                </h3>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center text-[var(--muted)]">
                                        <BookOpen size={16} className="mr-3" />
                                        <span>
                                            {curriculum.concept_count} concepts across{' '}
                                            {curriculum.units.length} units
                                        </span>
                                    </div>
                                    <div className="flex items-center text-[var(--muted)]">
                                        <Clock size={16} className="mr-3" />
                                        <span>
                                            ~
                                            {Math.round((curriculum.estimated_minutes / 60) * 10) /
                                                10}{' '}
                                            hours total at your pace
                                        </span>
                                    </div>
                                </div>

                                {curriculum.outcomes && curriculum.outcomes.length > 0 && (
                                    <div className="mb-6 pt-6 border-t border-[var(--border)]">
                                        <h4 className="text-sm font-bold text-[var(--text)] mb-3">
                                            What you&apos;ll be able to do:
                                        </h4>
                                        <ul className="space-y-2">
                                            {curriculum.outcomes.map(
                                                (outcome: string, idx: number) => (
                                                    <li
                                                        key={idx}
                                                        className="flex items-start text-sm text-[var(--muted)]"
                                                    >
                                                        <span className="mr-2 text-[var(--text)]">
                                                            &middot;
                                                        </span>
                                                        <span>{outcome}</span>
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </div>
                                )}

                                {vaultConcepts.length > 0 && (
                                    <div className="mb-6 pt-6 border-t border-[var(--border)]">
                                        <h4 className="text-sm font-bold text-[var(--text)] mb-3 flex items-center">
                                            <ShieldCheck
                                                size={16}
                                                className="mr-2 text-[var(--accent)]"
                                            />
                                            Already in your Vault:
                                        </h4>
                                        <div className="space-y-2 mb-3">
                                            {vaultConcepts
                                                .slice(0, 3)
                                                .map((vc: any, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        className="flex justify-between items-center text-sm"
                                                    >
                                                        <span className="text-[var(--text)] font-medium truncate mr-2">
                                                            {vc.name}
                                                        </span>
                                                        <span className="text-[var(--muted)] bg-[var(--bg)] px-2 py-0.5 rounded-md text-xs border border-[var(--border)]">
                                                            {getMasteryText(vc.vaultMasteryState)}
                                                        </span>
                                                    </div>
                                                ))}
                                            {vaultConcepts.length > 3 && (
                                                <div className="text-xs text-[var(--muted)] italic">
                                                    + {vaultConcepts.length - 3} more concepts
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-[var(--muted)] italic">
                                            Serify will skip these or go deeper based on your
                                            mastery.
                                        </p>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-[var(--border)]">
                                    <h4 className="text-sm font-bold text-[var(--text)] mb-3">
                                        Spark cost:
                                    </h4>

                                    {isProPlus ? (
                                        <div className="flex items-start text-sm text-[var(--muted)]">
                                            <Zap
                                                size={16}
                                                className="mr-2 mt-0.5 text-amber-500 fill-amber-500"
                                            />
                                            <span>
                                                Flow Mode is included with your Pro+ plan. Train
                                                without limits.
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 text-sm text-[var(--muted)]">
                                            <div className="flex justify-between">
                                                <span className="flex items-center">
                                                    <Zap
                                                        size={14}
                                                        className="mr-1.5 fill-current text-[var(--accent)]"
                                                    />{' '}
                                                    {sparkCostPerConcept} Sparks
                                                </span>
                                                <span>per new concept</span>
                                            </div>
                                            <div className="flex justify-between font-medium text-[var(--text)]">
                                                <span className="flex items-center">
                                                    <Zap
                                                        size={14}
                                                        className="mr-1.5 fill-current text-[var(--accent)]"
                                                    />{' '}
                                                    ~{remainingSparkCost} Sparks
                                                </span>
                                                <span>for remainder</span>
                                            </div>
                                            {vaultConcepts.length > 0 && (
                                                <p className="text-xs mt-2 italic border-t border-[var(--border)] pt-2">
                                                    Concepts you already know cost fewer sparks (2-4
                                                    instead of 8).
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleStart}
                                    className="flex-1 bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 py-3 rounded-xl font-medium transition-colors text-center"
                                >
                                    Start &rarr;
                                </button>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex-1 bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--border)]/20 border border-[var(--border)] py-3 rounded-xl font-medium transition-colors text-center flex items-center justify-center"
                                >
                                    <Edit3 size={16} className="mr-2" /> Edit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* EDIT SIDEBAR / OVERLAY */}
                {isEditing && (
                    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className="w-full max-w-md bg-[var(--surface)] h-full border-l border-[var(--border)] shadow-2xl flex flex-col animate-slide-in-right">
                            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg)]">
                                <h3 className="font-display text-xl text-[var(--text)]">
                                    Edit Your Curriculum
                                </h3>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="p-2 hover:bg-[var(--surface)] rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-[var(--text)]" />
                                </button>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto">
                                <p className="text-sm text-[var(--muted)] mb-6">
                                    Drag to reorder. Click × to remove. Edits save automatically.
                                </p>

                                <div className="space-y-2">
                                    {allConcepts.map((c: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="flex items-center bg-[var(--bg)] border border-[var(--border)] p-3 rounded-xl group cursor-grab active:cursor-grabbing"
                                        >
                                            <GripVertical
                                                size={16}
                                                className="text-[var(--muted)] mr-3 shrink-0"
                                            />
                                            <div className="w-6 text-xs text-[var(--muted)] font-mono shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 truncate text-sm font-medium text-[var(--text)]">
                                                {c.name}
                                            </div>
                                            <button className="p-1.5 text-[var(--muted)] hover:text-[var(--warn)] hover:bg-[var(--warn)]/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 pt-6 border-t border-[var(--border)]">
                                    <h4 className="text-sm font-bold text-[var(--text)] mb-3">
                                        + Add a concept
                                    </h4>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Type concept name..."
                                            className="flex-1 h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm outline-none focus:border-[var(--accent)]"
                                        />
                                        <button className="px-4 h-10 bg-[var(--text)] text-[var(--surface)] rounded-lg text-sm font-medium hover:bg-black/80">
                                            Add
                                        </button>
                                    </div>
                                    <p className="text-xs text-[var(--muted)] mt-2">
                                        Serify will automatically place it in the correct learning
                                        order.
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 border-t border-[var(--border)] bg-[var(--bg)] flex justify-between items-center">
                                <button className="text-sm text-[var(--muted)] hover:text-[var(--text)] font-medium transition-colors">
                                    Reset to original
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-2 bg-[var(--accent)] text-white font-medium rounded-xl hover:bg-[var(--accent)]/90"
                                >
                                    Done &rarr;
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
