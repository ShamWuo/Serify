import { useState, useEffect, useRef } from 'react';
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
    ChevronRight,
    ChevronLeft,
    Target,
    Brain,
    SkipForward,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { z } from 'zod';

const conceptSchema = z.object({
    id: z.string(),
    name: z.string(),
    definition: z.string(),
    difficulty: z.enum(['simple', 'moderate', 'complex']),
    estimatedMinutes: z.coerce.number(),
    isPrerequisite: z.boolean(),
    prerequisiteFor: z.array(z.string()).default([]),
    alreadyInVault: z.boolean(),
    vaultMasteryState: z.string().nullable(),
    whyIncluded: z.string(),
    misconceptionRisk: z.enum(['low', 'medium', 'high']),
    orderIndex: z.coerce.number()
});
const unitSchema = z.object({
    unitNumber: z.coerce.number(),
    unitTitle: z.string(),
    unitSummary: z.string(),
    concepts: z.array(conceptSchema).default([])
});
const curriculumSchema = z
    .object({
        title: z.string().default(''),
        target_description: z.string().default(''),
        outcomes: z.array(z.string()).default([]),
        units: z.array(unitSchema).default([]),
        recommended_start_index: z.coerce.number().default(0),
        scope_note: z.string().nullable().default(null)
    })
    .default({
        title: '',
        target_description: '',
        outcomes: [],
        units: [],
        recommended_start_index: 0,
        scope_note: null
    });

type Step = 'input' | 'context' | 'generating';

export default function LearnIndex() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('input');
    const [inputValue, setInputValue] = useState('');
    const [priorKnowledge, setPriorKnowledge] = useState('');
    const [skipTopics, setSkipTopics] = useState('');
    const [focusGoal, setFocusGoal] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [curricula, setCurricula] = useState<any[]>([]);
    const [loadingCurricula, setLoadingCurricula] = useState(true);
    const [authToken, setAuthToken] = useState<string>('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [curriculumToDelete, setCurriculumToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { balance, loading: sparksLoading } = useSparks();

    const tokenRef = useRef<string>('');

    useEffect(() => {
        fetchCurricula();
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                const t = session?.access_token || '';
                tokenRef.current = t;
                setAuthToken(t);
            }
        );
        supabase.auth.getSession().then(({ data }) => {
            const t = data.session?.access_token || '';
            tokenRef.current = t;
            setAuthToken(t);
        });
        return () => { authListener.subscription.unsubscribe(); };
    }, []);

    useEffect(() => {
        if (router.query.q) setInputValue(router.query.q as string);
        if (router.query.priorKnowledge) setPriorKnowledge(router.query.priorKnowledge as string);
        if (router.query.skipTopics) setSkipTopics(router.query.skipTopics as string);
        if (router.query.focusGoal) setFocusGoal(router.query.focusGoal as string);

        if (router.query.autoStart === 'true' && router.query.q) {
            // Ensure token is fresh before auto-generating
            supabase.auth.getSession().then(({ data }) => {
                const freshToken = data.session?.access_token || '';
                tokenRef.current = freshToken;
                setAuthToken(freshToken);

                const qVal = router.query.q as string;
                const pkVal = (router.query.priorKnowledge as string) || '';
                const stVal = (router.query.skipTopics as string) || '';
                const fgVal = (router.query.focusGoal as string) || '';

                const inputType = guessInputType(qVal);
                const payload = {
                    userInput: qVal,
                    inputType,
                    priorKnowledge: pkVal.trim() || undefined,
                    skipTopics: stVal.trim() || undefined,
                    focusGoal: fgVal.trim() || undefined,
                };

                lastSubmitRef.current = payload;
                setStep('generating');
                setIsGenerating(true);
                submit(payload);
            });
        }
    }, [router.query]);

    const fetchCurricula = async () => {
        setLoadingCurricula(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data, error } = await supabase
            .from('curricula')
            .select('*')
            .order('last_activity_at', { ascending: false });
        if (!error && data) setCurricula(data);
        setLoadingCurricula(false);
    };

    const handleDelete = async (curriculum: any) => {
        setCurriculumToDelete(curriculum);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!curriculumToDelete) return;
        setIsDeleting(true);
        try {
            await supabase.from('curricula').delete().eq('id', curriculumToDelete.id);
            setCurricula((prev) => prev.filter((c) => c.id !== curriculumToDelete.id));
            setDeleteModalOpen(false);
            setCurriculumToDelete(null);
        } catch (err) {
            console.error('Error deleting curriculum:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    function guessInputType(text: string) {
        const lower = text.toLowerCase();
        if (lower.includes('?') || lower.startsWith('how') || lower.startsWith('why')) return 'question';
        if (lower.startsWith('i want to') || lower.includes('understand how') || lower.includes('learn how')) return 'goal';
        if (text.trim().split(' ').length <= 3) return 'concept';
        return 'topic';
    }

    const curriculumInitialValue = {
        title: '', target_description: '', outcomes: [] as string[],
        units: [] as any[], recommended_start_index: 0, scope_note: null as string | null
    };

    const curriculumDataRef = useRef<z.infer<typeof curriculumSchema>>(curriculumInitialValue);
    const lastSubmitRef = useRef<any>(null);
    const retryCountRef = useRef(0);
    const isSavingRef = useRef(false);

    const { submit, object: curriculumData, isLoading: isStreaming, error: streamError } = useObject({
        api: '/api/serify/stream-curriculum',
        schema: curriculumSchema,
        initialValue: curriculumInitialValue,
        fetch: (input, init) => {
            const headers = new Headers(init?.headers);
            const token = tokenRef.current;
            if (token) headers.set('Authorization', `Bearer ${token}`);
            return fetch(input, { ...init, headers });
        },
        onError: (e) => {
            console.error(e);
            setErrorMsg(e.message || 'Failed to generate curriculum.');
            setIsGenerating(false);
            setStep('context');
        },
        onFinish: async ({ object, error }) => {
            if (isSavingRef.current) return;
            isSavingRef.current = true;

            const hasValid = (o: typeof curriculumInitialValue) =>
                o && typeof o.title === 'string' && o.title.trim() !== '' &&
                Array.isArray(o.units) && o.units.length > 0;

            let toSave = (object as any) ?? curriculumDataRef.current;
            for (const delayMs of [0, 100, 250, 500]) {
                if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
                toSave = (object as any) ?? curriculumDataRef.current;
                if (hasValid(toSave)) break;
            }

            if (error) {
                setErrorMsg(error?.message || 'Failed to finalize curriculum.');
                setIsGenerating(false);
                setStep('context');
                return;
            }

            if (!hasValid(toSave)) {
                if (toSave?.title?.trim() && Array.isArray(toSave?.units) && toSave.units.length === 0 &&
                    lastSubmitRef.current && retryCountRef.current < 1) {
                    retryCountRef.current += 1;
                    submit(lastSubmitRef.current);
                    return;
                }
                setErrorMsg('Curriculum stream finished but no valid data was received. Please try again.');
                setIsGenerating(false);
                setStep('context');
                return;
            }
            retryCountRef.current = 0;
            isSavingRef.current = true;

            try {
                const token = tokenRef.current || (await supabase.auth.getSession()).data.session?.access_token;
                const res = await fetch('/api/serify/save-curriculum', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ ...toSave, user_input: lastSubmitRef.current?.userInput ?? '' })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || data.message || 'Failed to save curriculum');
                if (data.curriculumId) {
                    router.push(`/learn/curriculum/${data.curriculumId}`);
                } else {
                    throw new Error('Invalid response while saving.');
                }
            } catch (err: any) {
                console.error(err);
                setErrorMsg(err?.message || 'Failed to save curriculum to database.');
                setIsGenerating(false);
                setStep('context');
                isSavingRef.current = false;
            }
        }
    });

    curriculumDataRef.current = (curriculumData as any) ?? curriculumInitialValue;

    const handleNext = () => {
        if (!inputValue.trim()) return;
        setErrorMsg('');
        setStep('context');
    };

    const handleBuildCurriculum = async () => {
        if (!inputValue.trim()) return;
        setErrorMsg('');

        // Always fetch a fresh token before submitting to avoid stale auth
        const { data } = await supabase.auth.getSession();
        const freshToken = data.session?.access_token || '';
        tokenRef.current = freshToken;
        setAuthToken(freshToken);

        setIsGenerating(true);
        setStep('generating');
        retryCountRef.current = 0;
        isSavingRef.current = false;

        const inputType = guessInputType(inputValue);
        const payload = {
            userInput: inputValue,
            inputType,
            priorKnowledge: priorKnowledge.trim() || undefined,
            skipTopics: skipTopics.trim() || undefined,
            focusGoal: focusGoal.trim() || undefined,
        };
        lastSubmitRef.current = payload;
        submit(payload);
    };

    const renderCurriculumCard = (curriculum: any) => {
        const isCompleted = curriculum.status === 'completed';
        const isAbandoned = curriculum.status === 'abandoned';
        const conceptsCompleted = curriculum.completed_concept_ids?.length || 0;
        const totalConcepts = curriculum.concept_count || 1;
        const progressPercent = Math.min(100, Math.round((conceptsCompleted / totalConcepts) * 100));

        return (
            <div
                key={curriculum.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 relative flex flex-col shadow-sm hover:shadow-md transition-shadow"
            >
                <div className="flex justify-between items-start mb-1.5">
                    <h3 className="font-semibold text-base text-[var(--text)] line-clamp-2 pr-3 leading-snug">
                        {curriculum.title}
                    </h3>
                    <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isCompleted ? 'bg-emerald-100 text-emerald-700' :
                        isAbandoned ? 'bg-[var(--border)] text-[var(--muted)]' :
                            'bg-[var(--accent)]/10 text-[var(--accent)]'
                        }`}>
                        {isCompleted ? 'Done' : isAbandoned ? 'Paused' : 'Active'}
                    </span>
                </div>

                <p className="text-[var(--muted)] text-xs mb-4">
                    {conceptsCompleted}/{totalConcepts} concepts
                </p>

                <div className="w-full h-1 bg-[var(--border)] rounded-full mb-4 overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${progressPercent}%`,
                            background: isCompleted ? '#10b981' : 'var(--accent)'
                        }}
                    />
                </div>

                <div className="mt-auto flex items-center gap-2">
                    <Link
                        href={`/learn/curriculum/${curriculum.id}`}
                        className="flex-1 text-center px-4 py-2 rounded-xl text-sm font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 transition-colors"
                    >
                        {isCompleted ? 'Review' : 'Continue'} →
                    </Link>
                    <button
                        onClick={() => handleDelete(curriculum)}
                        className="p-2 text-[var(--muted)] hover:text-red-500 rounded-xl border border-[var(--border)] hover:border-red-200 hover:bg-red-50 transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>
        );
    };

    const hasEnoughSparks = !sparksLoading && balance && balance.total_sparks >= 2;

    return (
        <DashboardLayout>
            <Head><title>Learn Mode | Serify</title></Head>

            {/* Delete Modal */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => !isDeleting && setDeleteModalOpen(false)}
                    />
                    <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
                            <AlertTriangle className="text-red-600" size={32} />
                        </div>
                        <h3 className="text-2xl font-display text-[var(--text)] mb-2">Delete Curriculum?</h3>
                        <p className="text-[var(--muted)] mb-8">
                            Are you sure you want to delete &quot;{curriculumToDelete?.title}&quot;? This will permanently remove all your progress within this learning path. This action cannot be undone.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setDeleteModalOpen(false)}
                                disabled={isDeleting}
                                className="flex-1 px-6 py-3 rounded-xl border border-[var(--border)] font-medium hover:bg-[var(--bg)] transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-red-200"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete Path'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6 md:p-10 max-w-4xl mx-auto min-h-[calc(100vh-64px)]">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-[var(--text)] mb-1">Learn Mode</h1>
                    <p className="text-[var(--muted)] text-sm">Build a tailored curriculum and master it concept by concept.</p>
                </div>

                {/* Generator Card */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm mb-10 overflow-hidden">

                    {/* Step: Topic Input */}
                    {step === 'input' && (
                        <div className="p-6 md:p-8">
                            <label className="block text-xs font-bold text-[var(--accent)] uppercase tracking-widest mb-3">
                                What do you want to learn?
                            </label>
                            <div className="flex gap-3">
                                <input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                                    type="text"
                                    placeholder="e.g. Related rates, How neural networks learn, Calculus..."
                                    className="flex-1 h-12 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors text-base"
                                    autoFocus
                                />
                                <button
                                    onClick={handleNext}
                                    disabled={!inputValue.trim()}
                                    className="h-12 px-5 rounded-xl font-medium bg-[var(--accent)] text-white flex items-center gap-2 hover:bg-[var(--accent)]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    Next <ChevronRight size={16} />
                                </button>
                            </div>

                            {/* Suggestions */}
                            <div className="mt-5 flex flex-wrap gap-2">
                                <span className="text-xs text-[var(--muted)] self-center">Try:</span>
                                {['Related rates', 'Transformers from scratch', 'Compounding interest', 'How DNS works'].map((sug) => (
                                    <button
                                        key={sug}
                                        onClick={() => { setInputValue(sug); }}
                                        className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                                    >
                                        {sug}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step: Context Questions */}
                    {step === 'context' && (
                        <div className="p-6 md:p-8">
                            <div className="flex items-center gap-2 mb-1">
                                <button
                                    onClick={() => setStep('input')}
                                    className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <div>
                                    <p className="text-xs text-[var(--muted)] font-medium">Learning</p>
                                    <h2 className="font-bold text-[var(--text)] leading-tight">"{inputValue}"</h2>
                                </div>
                            </div>

                            <p className="text-sm text-[var(--muted)] mb-6 ml-6">
                                Help us tailor this curriculum to exactly what you need. All fields are optional.
                            </p>

                            <div className="space-y-5">
                                {/* Prior knowledge */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text)] mb-1.5">
                                        <Brain size={15} className="text-[var(--accent)]" />
                                        What do you already know?
                                    </label>
                                    <textarea
                                        value={priorKnowledge}
                                        onChange={(e) => setPriorKnowledge(e.target.value)}
                                        placeholder="e.g. I know derivatives and limits, but not related rates specifically"
                                        rows={2}
                                        className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors text-sm resize-none"
                                    />
                                    <p className="text-xs text-[var(--muted)] mt-1">
                                        Topics you already know will be skipped or used only as brief references.
                                    </p>
                                </div>

                                {/* Skip topics */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text)] mb-1.5">
                                        <SkipForward size={15} className="text-[var(--accent)]" />
                                        Anything to skip?
                                    </label>
                                    <input
                                        value={skipTopics}
                                        onChange={(e) => setSkipTopics(e.target.value)}
                                        placeholder="e.g. history, basic algebra, proofs"
                                        className="w-full h-11 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors text-sm"
                                    />
                                </div>

                                {/* Focus goal */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text)] mb-1.5">
                                        <Target size={15} className="text-[var(--accent)]" />
                                        What's your specific goal?
                                    </label>
                                    <input
                                        value={focusGoal}
                                        onChange={(e) => setFocusGoal(e.target.value)}
                                        placeholder="e.g. Solve optimization word problems on my exam next week"
                                        className="w-full h-11 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors text-sm"
                                    />
                                </div>
                            </div>

                            {errorMsg && (
                                <div className="mt-4 bg-[var(--warn-light)] border border-[var(--warn)]/30 text-[var(--warn)] px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            <div className="mt-6 flex items-center justify-between">
                                <div className="text-xs text-[var(--muted)] flex items-center gap-1">
                                    <Zap size={12} className="text-[var(--accent)]" />
                                    Costs 2 Sparks · You have {balance?.total_sparks ?? '...'}
                                </div>
                                <button
                                    onClick={handleBuildCurriculum}
                                    disabled={!hasEnoughSparks}
                                    className="h-11 px-6 rounded-xl font-semibold bg-[var(--accent)] text-white flex items-center gap-2 hover:bg-[var(--accent)]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-[var(--accent)]/20"
                                >
                                    <Sparkles size={16} />
                                    Build Curriculum
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step: Generating */}
                    {step === 'generating' && (
                        <div className="p-6 md:p-8">
                            <div className="mb-6 text-center">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    {isStreaming ? (
                                        <Sparkles className="text-[var(--accent)] animate-pulse" size={20} />
                                    ) : (
                                        <Loader2 className="text-[var(--accent)] animate-spin" size={20} />
                                    )}
                                    <h2 className="text-lg font-bold text-[var(--text)]">
                                        {isStreaming ? 'Building your curriculum...' : 'Saving...'}
                                    </h2>
                                </div>
                                {curriculumData?.title && (
                                    <p className="text-[var(--accent)] font-medium">{curriculumData.title}</p>
                                )}
                                {curriculumData?.target_description && (
                                    <p className="text-[var(--muted)] text-sm mt-1">{curriculumData.target_description}</p>
                                )}
                            </div>

                            {curriculumData?.units && curriculumData.units.length > 0 && (
                                <div className="space-y-3">
                                    {curriculumData.units.map((unit, i) => (
                                        <div key={i} className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="bg-[var(--accent)] text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded">
                                                    {unit?.unitNumber || i + 1}
                                                </span>
                                                <span className="font-semibold text-sm text-[var(--text)]">
                                                    {unit?.unitTitle || 'Drafting...'}
                                                </span>
                                            </div>
                                            {unit?.concepts?.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {unit.concepts.map((c: any, j: number) => (
                                                        <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]">
                                                            {c?.name || '...'}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {isStreaming && (
                                <div className="mt-4 flex justify-center gap-1.5">
                                    {[0, 150, 300].map((delay) => (
                                        <div key={delay} className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Curricula List */}
                <div>
                    <h2 className="text-base font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                        <BookOpen size={16} className="text-[var(--muted)]" />
                        Your Curricula
                    </h2>

                    {loadingCurricula ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-40 bg-[var(--surface)] border border-[var(--border)] rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : curricula.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {curricula.map(renderCurriculumCard)}
                        </div>
                    ) : (
                        <div className="text-center py-14 bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-2xl">
                            <BookOpen size={28} className="mx-auto text-[var(--muted)]/40 mb-3" />
                            <p className="font-medium text-[var(--text)] text-sm mb-1">No curricula yet</p>
                            <p className="text-[var(--muted)] text-xs">Build your first one above.</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
