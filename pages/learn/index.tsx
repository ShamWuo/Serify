import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useSparks } from '@/hooks/useSparks';
import {
    Sparkles,
    ArrowRight,
    BookOpen,
    Trash2,
    AlertTriangle,
    Zap,
    CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { z } from 'zod';

const curriculumSchema = z.object({
    title: z.string(),
    target_description: z.string(),
    outcomes: z.array(z.string()),
    units: z.array(
        z.object({
            unitNumber: z.number(),
            unitTitle: z.string(),
            unitSummary: z.string(),
            concepts: z.array(
                z.object({
                    id: z.string(),
                    name: z.string(),
                    definition: z.string(),
                    difficulty: z.enum(['simple', 'moderate', 'complex']),
                    estimatedMinutes: z.number(),
                    isPrerequisite: z.boolean(),
                    prerequisiteFor: z.array(z.string()),
                    alreadyInVault: z.boolean(),
                    vaultMasteryState: z.string().nullable(),
                    whyIncluded: z.string(),
                    misconceptionRisk: z.enum(['low', 'medium', 'high']),
                    orderIndex: z.number()
                })
            )
        })
    ),
    recommended_start_index: z.number(),
    scope_note: z.string().nullable()
});

export default function LearnIndex() {
    const router = useRouter();
    const [inputValue, setInputValue] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [curricula, setCurricula] = useState<any[]>([]);
    const [loadingCurricula, setLoadingCurricula] = useState(true);
    const [authToken, setAuthToken] = useState<string>('');

    const { balance, loading: sparksLoading } = useSparks();

    useEffect(() => {
        fetchCurricula();
        // Subscribe to auth state changes to keep token fresh
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setAuthToken(session?.access_token || '');
            }
        );

        supabase.auth.getSession().then(({ data }) => {
            setAuthToken(data.session?.access_token || '');
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (router.query.q) {
            setInputValue(router.query.q as string);
        }
    }, [router.query.q]);

    const fetchCurricula = async () => {
        setLoadingCurricula(true);
        const {
            data: { session }
        } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase
            .from('curricula')
            .select('*')
            .order('last_activity_at', { ascending: false });

        if (!error && data) {
            setCurricula(data);
        }
        setLoadingCurricula(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this curriculum?')) return;
        await supabase.from('curricula').delete().eq('id', id);
        setCurricula((prev) => prev.filter((c) => c.id !== id));
    };

    function guessInputType(text: string) {
        const lower = text.toLowerCase();
        if (lower.includes('?') || lower.startsWith('how') || lower.startsWith('why'))
            return 'question';
        if (
            lower.startsWith('i want to') ||
            lower.includes('understand how') ||
            lower.includes('learn how')
        )
            return 'goal';
        if (text.trim().split(' ').length <= 3) return 'concept';
        return 'topic';
    }

    const {
        submit,
        object: curriculumData,
        isLoading: isStreaming,
        error: streamError
    } = useObject({
        api: '/api/serify/stream-curriculum',
        schema: curriculumSchema,
        headers: {
            Authorization: `Bearer ${authToken}`
        },
        onError: (e) => {
            console.error(e);
            setErrorMsg(e.message || 'Failed to generate curriculum.');
            setIsGenerating(false);
        },
        onFinish: async ({ object, error }) => {
            if (error || !object) {
                setErrorMsg(error?.message || 'Failed to finalize curriculum.');
                setIsGenerating(false);
                return;
            }

            try {
                // Now save to Postgres
                const res = await fetch('/api/serify/save-curriculum', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authToken}`
                    },
                    body: JSON.stringify(object)
                });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Failed to save curriculum');
                }

                if (data.curriculumId) {
                    router.push(`/learn/curriculum/${data.curriculumId}`);
                } else {
                    throw new Error('Invalid response while saving.');
                }
            } catch (err: any) {
                console.error(err);
                setErrorMsg(err.message || 'Failed to save curriculum to database.');
                setIsGenerating(false);
            }
        }
    });

    const handleBuildCurriculum = async () => {
        if (!inputValue.trim()) return;
        setErrorMsg('');
        setIsGenerating(true);

        const inputType = guessInputType(inputValue);

        // The token is automatically injected into the useObject fetch via the headers config.
        submit({ userInput: inputValue, inputType });
    };

    const renderCurriculumCard = (curriculum: any) => {
        const isCompleted = curriculum.status === 'completed';
        const isAbandoned = curriculum.status === 'abandoned';
        const conceptsCompleted = curriculum.completed_concept_ids?.length || 0;
        const totalConcepts = curriculum.concept_count || 1;
        const progressPercent = Math.min(
            100,
            Math.round((conceptsCompleted / totalConcepts) * 100)
        );
        const lastActivityFormatted = new Date(curriculum.last_activity_at).toLocaleDateString(
            'en-US',
            { month: 'short', day: 'numeric' }
        );

        return (
            <div
                key={curriculum.id}
                className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden flex flex-col ${isAbandoned ? 'opacity-75 relative bg-black/5' : 'shadow-sm'}`}
            >
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-display text-xl text-[var(--text)] line-clamp-1 pr-4">
                        {curriculum.title}
                    </h3>
                    <div className="flex items-center text-xs font-bold uppercase tracking-widest text-[var(--muted)] shrink-0">
                        {isCompleted && (
                            <span className="text-emerald-500 flex items-center gap-1">
                                Complete{' '}
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            </span>
                        )}
                        {isAbandoned && <span>Abandoned</span>}
                        {!isCompleted && !isAbandoned && <span>In Progress</span>}
                    </div>
                </div>

                <div className="text-[var(--muted)] text-sm mb-5">
                    {conceptsCompleted} of {totalConcepts} concepts · Last studied{' '}
                    {lastActivityFormatted}
                </div>

                {!isCompleted && (
                    <div className="w-full h-1.5 bg-[var(--border)] rounded-full mb-6 overflow-hidden">
                        <div
                            className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                )}

                <div className="mt-auto flex items-center gap-3">
                    <Link
                        href={`/learn/curriculum/${curriculum.id}`}
                        className={`px-4 py-2 rounded-xl text-sm font-medium flex-1 text-center transition-colors ${isCompleted
                            ? 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:text-[var(--accent)] hover:border-[var(--accent)]'
                            : 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90'
                            }`}
                    >
                        {isCompleted ? 'Review \u2192' : 'Resume \u2192'}
                    </Link>

                    {isAbandoned && (
                        <button
                            onClick={() => handleDelete(curriculum.id)}
                            className="p-2 text-[var(--muted)] hover:text-[var(--warn)] rounded-xl border border-transparent hover:border-[var(--warn)]/20 hover:bg-[var(--warn)]/10 transition-colors"
                            title="Delete curriculum"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout>
            <Head>
                <title>Learn Mode | Serify</title>
            </Head>

            <div className="p-6 md:p-10 max-w-5xl mx-auto min-h-[calc(100vh-64px)]">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display text-[var(--text)]">Learn Mode</h1>
                        <p className="text-[var(--muted)] text-sm">
                            Build a curriculum from scratch and master it in Flow Mode.
                        </p>
                    </div>
                </div>

                <section className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 md:p-8 mb-8 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                    {isGenerating ? (
                        <div className="animate-fade-in relative z-10 max-w-2xl mx-auto">
                            <div className="mb-8 text-center">
                                <h2 className="text-2xl font-display text-[var(--accent)] flex items-center justify-center gap-3 mb-2">
                                    <Sparkles className="animate-pulse" size={24} />
                                    {isStreaming
                                        ? 'Architecting your curriculum...'
                                        : 'Saving curriculum...'}
                                </h2>
                                <p className="text-[var(--text)] text-lg font-medium">
                                    {curriculumData?.title || 'Mapping concepts...'}
                                </p>
                                {curriculumData?.target_description && (
                                    <p className="text-[var(--muted)] text-sm mt-2 font-mono bg-[var(--bg)] p-3 rounded-lg text-left">
                                        {curriculumData.target_description}
                                    </p>
                                )}
                            </div>

                            {curriculumData?.units && curriculumData.units.length > 0 && (
                                <div className="space-y-6 text-left">
                                    {curriculumData.units.map((unit, i) => (
                                        <div
                                            key={i}
                                            className="animate-fade-in-up bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5 shadow-sm"
                                        >
                                            <div className="flex items-center justify-between mb-3 border-b border-[var(--border)] pb-3">
                                                <h3 className="font-bold text-[var(--text)] text-sm uppercase tracking-widest flex items-center gap-2">
                                                    <span className="bg-[var(--accent)] text-white w-6 h-6 flex items-center justify-center rounded-md">
                                                        {unit?.unitNumber || i + 1}
                                                    </span>
                                                    {unit?.unitTitle || 'Drafting Unit...'}
                                                </h3>
                                            </div>
                                            <p className="text-[var(--muted)] text-sm mb-4 leading-relaxed">
                                                {unit?.unitSummary || '...'}
                                            </p>

                                            {unit?.concepts && unit.concepts.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {unit.concepts.map((concept, j) => (
                                                        <span
                                                            key={j}
                                                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
                                                        >
                                                            {concept?.name || '...'}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {isStreaming && (
                                <div className="mt-6 flex justify-center">
                                    <div className="flex space-x-2">
                                        <div
                                            className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce"
                                            style={{ animationDelay: '0ms' }}
                                        />
                                        <div
                                            className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce"
                                            style={{ animationDelay: '150ms' }}
                                        />
                                        <div
                                            className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce"
                                            style={{ animationDelay: '300ms' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="relative z-10 max-w-xl mx-auto">
                            <label className="block text-[10px] uppercase font-bold text-[var(--accent)] tracking-widest mb-3">
                                What do you want to learn?
                            </label>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleBuildCurriculum()}
                                    type="text"
                                    placeholder="Type a concept, topic, goal, or question..."
                                    className="flex-1 h-14 px-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors text-base"
                                />
                                <button
                                    onClick={handleBuildCurriculum}
                                    disabled={
                                        sparksLoading ||
                                        !balance ||
                                        balance.total_sparks < 2 ||
                                        !inputValue.trim()
                                    }
                                    className={`h-14 px-6 rounded-xl font-medium transition-colors flex flex-col items-center justify-center whitespace-nowrap ${inputValue.trim() ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-md shadow-[var(--accent)]/20 hover:-translate-y-0.5' : 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed'}`}
                                >
                                    <span className="flex items-center">
                                        Build Curriculum <ArrowRight size={18} className="ml-2" />
                                    </span>
                                    {inputValue.trim() &&
                                        !sparksLoading &&
                                        balance &&
                                        balance.total_sparks >= 2 && (
                                            <span className="text-xs opacity-80 mt-0.5 flex items-center gap-1 font-normal">
                                                <Zap size={12} fill="currentColor" /> 2 Sparks
                                            </span>
                                        )}
                                </button>
                            </div>

                            {errorMsg && (
                                <div className="mt-4 bg-[var(--warn-light)] border border-[var(--warn)]/30 text-[var(--warn)] px-4 py-3 rounded-xl text-sm font-medium flex items-center shadow-sm">
                                    <AlertTriangle size={16} className="mr-2 shrink-0" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {!errorMsg && balance && balance.total_sparks < 2 && (
                                <div className="mt-4 text-sm text-[var(--warn)] flex items-center">
                                    <Zap size={14} className="mr-1" />
                                    You need 2 Sparks to build a curriculum. You have{' '}
                                    {balance.total_sparks}.
                                </div>
                            )}

                            <div className="mt-8 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                                <span className="mr-2">Or try:</span>
                                {[
                                    'Machine learning fundamentals',
                                    'How transformers work',
                                    'Calculus from the beginning'
                                ].map((sug) => (
                                    <button
                                        key={sug}
                                        onClick={() => setInputValue(sug)}
                                        className="px-3 py-1.5 rounded-full bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text)] transition-colors text-xs"
                                    >
                                        {sug}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                <div>
                    <h2 className="text-xl font-display text-[var(--text)] mb-6 flex items-center">
                        <BookOpen size={20} className="mr-2 text-[var(--muted)]" />
                        Your Curricula
                    </h2>

                    {loadingCurricula ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="h-48 bg-[var(--surface)] border border-[var(--border)] rounded-2xl animate-pulse"
                                ></div>
                            ))}
                        </div>
                    ) : curricula.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {curricula.map(renderCurriculumCard)}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-[var(--surface)] border border-[var(--border)] border-dashed rounded-3xl">
                            <BookOpen size={32} className="mx-auto text-[var(--muted)]/50 mb-3" />
                            <h3 className="text-[var(--text)] font-medium mb-1">
                                No curricula yet
                            </h3>
                            <p className="text-[var(--muted)] text-sm">
                                Build your first curriculum above to get started.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
