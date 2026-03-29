import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/contexts/AuthContext';
import SEO from '@/components/Layout/SEO';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useUsage } from '@/hooks/useUsage';
import { UsageGate, UsageWarning } from '@/components/billing/UsageEnforcement';
import {
    Sparkles,
    ArrowRight,
    BookOpen,
    Trash2,
    AlertTriangle,
    ChevronRight,
    ChevronLeft,
    Target,
    Brain,
    SkipForward,
    Loader2,
    Lock,
    Clock,
    Calendar,
    Zap
} from 'lucide-react';
import Link from 'next/link';
import { normalizeTitle } from '@/lib/formatters';
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
        scope_note: z.string().nullable().default(null),
        deadline: z.string().nullable().default(null),
        schedule: z.array(z.any()).nullable().default(null)
    })
    .default({
        title: '',
        target_description: '',
        outcomes: [],
        units: [],
        recommended_start_index: 0,
        scope_note: null,
        deadline: null,
        schedule: null
    });

type Step = 'input' | 'context' | 'generating';

export default function LearnIndex() {
    const { user, token, loading } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState<Step>('input');
    const [inputValue, setInputValue] = useState('');
    const [priorKnowledge, setPriorKnowledge] = useState('');
    const [skipTopics, setSkipTopics] = useState('');
    const [focusGoal, setFocusGoal] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [sessions, setSessions] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [sortBy, setSortBy] = useState<'recent' | 'progress' | 'title'>('recent');
    const [isGateOpen, setIsGateOpen] = useState(false);
    const [isStartingQuick, setIsStartingQuick] = useState(false);

    const { usage, loading: usageLoading, refresh: refreshUsage } = useUsage('curricula');

    const curriculumInitialValue = {
        title: '', target_description: '', outcomes: [] as string[],
        units: [] as any[], recommended_start_index: 0, scope_note: null as string | null,
        deadline: null as string | null, schedule: null as any[] | null
    };

    const curriculumDataRef = useRef<z.infer<typeof curriculumSchema>>(curriculumInitialValue);
    const lastSubmitRef = useRef<any>(null);
    const retryCountRef = useRef(0);
    const isSavingRef = useRef(false);

    useEffect(() => {
        return () => {
            isSavingRef.current = false;
        };
    }, []);

    const { submit, object: curriculumData, isLoading: isStreaming, error: streamError } = useObject({
        api: '/api/serify/stream-curriculum',
        schema: curriculumSchema,
        initialValue: curriculumInitialValue,
        fetch: async (url, init) => {
            return fetch(url, {
                ...init,
                headers: {
                    ...init?.headers,
                    Authorization: token ? `Bearer ${token}` : '',
                    ...(router.query.demo === 'true' ? { 'x-serify-demo': 'true' } : {})
                }
            });
        },
        onError: (e: Error) => {
            setErrorMsg(e.message || 'Failed to generate curriculum.');
            setIsGenerating(false);
            setStep('context');
        },
        onFinish: async ({ object, error }: { object: any; error: Error | undefined }) => {
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
                const res = await fetch('/api/serify/save-curriculum', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        Authorization: token ? `Bearer ${token}` : '',
                        ...(router.query.demo === 'true' ? { 'x-serify-demo': 'true' } : {})
                    },
                    body: JSON.stringify({ ...toSave, user_input: lastSubmitRef.current?.userInput ?? '' })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || data.message || 'Failed to save curriculum');
                if (data.curriculumId) {
                    isSavingRef.current = false;
                    refreshUsage();
                    router.push(`/learn/curriculum/${data.curriculumId}`);
                } else {
                    throw new Error('Invalid response while saving.');
                }
            } catch (err: any) {
                setErrorMsg(err?.message || 'Failed to save curriculum to database.');
                setIsGenerating(false);
                setStep('context');
                isSavingRef.current = false;
            }
        }
    });

    curriculumDataRef.current = (curriculumData as any) ?? curriculumInitialValue;

    useEffect(() => {
        if (!loading && user) {
            fetchSessions();
        }
    }, [user, loading]);

    useEffect(() => {
        if (router.query.q) setInputValue(router.query.q as string);
        if (router.query.priorKnowledge) setPriorKnowledge(router.query.priorKnowledge as string);
        if (router.query.skipTopics) setSkipTopics(router.query.skipTopics as string);
        if (router.query.focusGoal) setFocusGoal(router.query.focusGoal as string);

        if (router.query.autoStart === 'true' && router.query.q && token) {
            const qVal = router.query.q as string;

            if (usage && !usage.allowed) {
                setIsGateOpen(true);
                return;
            }

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
                targetDate: targetDate || undefined,
            };

            lastSubmitRef.current = payload;
            setStep('generating');
            setIsGenerating(true);
            submit(payload);
        }
    }, [router.query, token, submit, usage, refreshUsage, targetDate]);

    const fetchSessions = async () => {
        setLoadingSessions(true);
        
        const [currRes, quickRes] = await Promise.all([
            supabase.from('curricula').select('*').order('last_activity_at', { ascending: false }),
            supabase.from('flow_sessions').select('*').eq('source_type', 'quick').order('created_at', { ascending: false })
        ]);
        
        const c = currRes.data || [];
        const q = quickRes.data || [];
        
        const taggedC = c.map((x: any) => ({ ...x, type: 'curriculum', sortDate: x.last_activity_at }));
        const taggedQ = q.map((x: any) => ({ ...x, type: 'quick', sortDate: x.created_at || x.updated_at }));
        
        setSessions([...taggedC, ...taggedQ]);
        setLoadingSessions(false);
    };

    const sortedSessions = [...sessions].sort((a, b) => {
        if (sortBy === 'recent') {
            return new Date(b.sortDate || 0).getTime() - new Date(a.sortDate || 0).getTime();
        }
        if (sortBy === 'title') {
            return (a.title || '').localeCompare(b.title || '');
        }
        if (sortBy === 'progress') {
            const getProgress = (s: any) => {
                if (s.type === 'quick') return s.status === 'completed' ? 1 : 0;
                return (s.completed_concept_ids?.length || 0) / (s.concept_count || 1);
            };
            return getProgress(b) - getProgress(a);
        }
        return 0;
    });

    const handleDelete = async (session: any) => {
        setSessionToDelete(session);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!sessionToDelete) return;
        setIsDeleting(true);
        try {
            if (sessionToDelete.type === 'curriculum') {
                await supabase.from('curricula').delete().eq('id', sessionToDelete.id);
            } else {
                await supabase.from('flow_sessions').delete().eq('id', sessionToDelete.id);
            }
            setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
            setDeleteModalOpen(false);
            setSessionToDelete(null);
        } catch (err) {
            console.error('Error deleting session:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const guessInputType = (text: string) => {
        const lower = text.toLowerCase();
        if (lower.includes('?') || lower.startsWith('how') || lower.startsWith('why')) return 'question';
        if (lower.startsWith('i want to') || lower.includes('understand how') || lower.includes('learn how')) return 'goal';
        if (text.trim().split(' ').length <= 3) return 'concept';
        return 'topic';
    };

    const handleQuickLearn = async () => {
        if (!inputValue.trim() || !token) return;
        if (usage && !usage.allowed) {
            setIsGateOpen(true);
            return;
        }

        setIsStartingQuick(true);
        setErrorMsg('');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            const qRes = await fetch('/api/serify/start-quick-learn', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    ...(router.query.demo === 'true' ? { 'x-serify-demo': 'true' } : {})
                },
                signal: controller.signal,
                body: JSON.stringify({ content: inputValue, contentType: guessInputType(inputValue) })
            });
            clearTimeout(timeoutId);

            if (qRes.ok) {
                const { flowSessionId } = await qRes.json();
                router.push(`/learn/quick/flow?session=${flowSessionId}`);
                return;
            }
            const errData = await qRes.json();
            throw new Error(errData.error || 'Failed to start quick learn');
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to start quick learn session');
            setIsStartingQuick(false);
        }
    };

    const handleNext = () => {
        if (!inputValue.trim()) return;
        setErrorMsg('');
        setStep('context');
    };

    const handleBuildCurriculum = async () => {
        if (!inputValue.trim()) return;
        if (usage && !usage.allowed) {
            setIsGateOpen(true);
            return;
        }

        setErrorMsg('');
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
            targetDate: targetDate || undefined,
        };
        lastSubmitRef.current = payload;
        submit(payload);
    };

    const renderSessionCard = (session: any) => {
        if (session.type === 'quick') {
            const isCompleted = session.status === 'completed';
            return (
                <div
                    key={session.id}
                    className="paper-card p-5 relative flex flex-col group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-display font-bold text-base text-[var(--text)] line-clamp-2 pr-3 leading-snug" title={normalizeTitle(session?.title)}>
                            {normalizeTitle(session?.title).replace('Quick Learn: ', '').replace('Quick Learn - ', '')}
                        </h3>
                        <div className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 border border-blue-500/30 bg-blue-500/5">
                            <div className="w-1.5 h-1.5 bg-blue-500" />
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-blue-600">
                                QUICK
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                        <p className="text-[var(--muted)] text-[11px] font-mono">
                            {'// focal learning session'}
                        </p>
                    </div>

                    <div className="mt-auto flex items-center gap-2 pt-4">
                        <Link
                            href={`/learn/quick/flow?sessionId=${session.id}`}
                            className="flex-1 text-center px-4 py-2 border-2 border-[var(--border)] text-[12px] font-mono font-bold text-[var(--text)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all"
                        >
                            {isCompleted ? 'review' : 'resume'} ✦
                        </Link>
                        <button
                            onClick={() => handleDelete(session)}
                            className="p-2 text-[var(--muted)] hover:text-[var(--warn)] border border-[var(--border)] hover:border-[var(--warn)] transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={15} strokeWidth={2} />
                        </button>
                    </div>
                </div>
            );
        }

        const curriculum = session;
        const isCompleted = curriculum.status === 'completed';
        const conceptsCompleted = curriculum.completed_concept_ids?.length || 0;
        const totalConcepts = curriculum.concept_count || 1;
        const progressPercent = Math.min(100, Math.round((conceptsCompleted / totalConcepts) * 100));

        return (
            <div
                key={curriculum.id}
                className="paper-card p-5 relative flex flex-col group"
            >
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-display font-bold text-base text-[var(--text)] line-clamp-2 pr-3 leading-snug" title={curriculum.title}>
                        {curriculum.title}
                    </h3>
                    <div className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 border ${isCompleted ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
                        <div className={`w-1.5 h-1.5 ${isCompleted ? 'bg-emerald-500' : 'bg-[var(--muted)]'}`} />
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${isCompleted ? 'text-emerald-600' : 'text-[var(--muted)]'}`}>
                            {isCompleted ? 'DONE' : 'ROADMAP'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                    <p className="text-[var(--muted)] text-[11px] font-mono">
                        <span className="text-[var(--text)] font-bold">{conceptsCompleted}/{totalConcepts}</span> concepts mastered
                    </p>
                </div>

                <div className="w-full h-1 bg-[var(--border)]/30 rounded-full mb-5 overflow-hidden">
                    <div
                        className="h-full transition-all duration-700 ease-out"
                        style={{
                            width: `${progressPercent}%`,
                            background: isCompleted ? 'var(--emerald-500)' : 'var(--accent)'
                        }}
                    />
                </div>

                <div className="mt-auto flex items-center gap-2">
                    <Link
                        href={`/learn/curriculum/${curriculum.id}`}
                        className="flex-1 text-center px-4 py-2 bg-[var(--accent)] border-2 border-[var(--accent)] text-[12px] font-mono font-bold text-white hover:bg-transparent hover:text-[var(--accent)] transition-all"
                    >
                        {isCompleted ? 'review' : 'continue'} ✦
                    </Link>
                    <button
                        onClick={() => handleDelete(curriculum)}
                        className="p-2 text-[var(--muted)] hover:text-[var(--warn)] border border-[var(--border)] hover:border-[var(--warn)] transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={15} strokeWidth={2} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout>
            <Head><title>Learning | Serify</title></Head>

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
                        <h3 className="text-2xl font-display text-[var(--text)] mb-2">
                            {sessionToDelete?.type === 'quick' ? 'Delete Session?' : 'Delete Curriculum?'}
                        </h3>
                        <p className="text-[var(--muted)] mb-8">
                            Are you sure you want to delete &quot;{(sessionToDelete?.title || '').replace('Quick Learn: ', '')}&quot;? This will permanently remove all your progress within this learning path. This action cannot be undone.
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
                                    'Delete'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6 md:p-10 max-w-4xl mx-auto min-h-[calc(100vh-64px)]">

                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-[var(--text)] mb-1">Learning</h1>
                    <p className="text-[var(--muted)] text-sm">Build a tailored curriculum and master it concept by concept.</p>
                </div>

                <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-[4px] shadow-[var(--shadow-hard-sm)] mb-10 overflow-hidden">

                    {step === 'input' && (
                        <div className="p-6 md:p-8">
                            <label className="block text-[10px] font-mono font-bold text-[var(--accent)] uppercase tracking-[0.2em] mb-3 opacity-80">
                                {'// primary objective'}
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                                    type="text"
                                    placeholder="e.g. Related rates, How neural networks learn..."
                                    className="flex-1 h-12 px-4 rounded-[2px] border-2 border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-all text-sm font-mono"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleQuickLearn}
                                        disabled={!inputValue.trim() || isStartingQuick}
                                        className="h-12 px-5 rounded-[2px] font-mono font-bold text-[11px] bg-[var(--surface)] text-[var(--text)] border-2 border-[var(--border)] flex items-center gap-2 hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-all uppercase tracking-wider"
                                        style={{boxShadow: 'var(--shadow-hard-sm)'}}
                                    >
                                        {isStartingQuick ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} 
                                        Quick Learn
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        disabled={!inputValue.trim() || isStartingQuick}
                                        className="h-12 px-5 rounded-[2px] font-mono font-bold text-[11px] bg-[var(--accent)] text-white flex items-center gap-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all uppercase tracking-wider border-2 border-[var(--ink)]"
                                        style={{boxShadow: 'var(--shadow-hard-sm)'}}
                                    >
                                        Custom Roadmap <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-wrap gap-2 items-center">
                                <span className="text-[10px] font-mono font-bold text-[var(--muted)] uppercase tracking-widest mr-2">Try:</span>
                                {['Related rates', 'Neural networks', 'DNS protocols'].map((sug) => (
                                    <button
                                        key={sug}
                                        onClick={() => { setInputValue(sug); }}
                                        className="text-[10px] font-mono px-3 py-1.5 border-2 border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all uppercase tracking-tight"
                                    >
                                        {sug}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'context' && (
                        <div className="p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-4">
                                <button
                                    onClick={() => setStep('input')}
                                    className="w-8 h-8 flex items-center justify-center border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all"
                                    style={{borderRadius:'2px', boxShadow:'var(--shadow-hard-sm)'}}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <div>
                                    <p className="text-[10px] font-mono font-bold text-[var(--muted)] uppercase tracking-widest opacity-60">{'// tailoring focus'}</p>
                                    <h2 className="font-display font-black text-xl text-[var(--text)] leading-tight tracking-tight">&quot;{inputValue}&quot;</h2>
                                </div>
                            </div>

                            <p className="text-xs font-mono text-[var(--muted)] mb-8 border-l-2 border-[var(--border)] pl-4 italic">
                                Refining objectives to maximize retention. Initial parameters identified.
                            </p>

                            <div className="space-y-5">
                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-mono font-bold text-[var(--text)] uppercase tracking-wider mb-2">
                                        <Brain size={12} className="text-[var(--accent)]" />
                                        Existing Knowledge Base
                                    </label>
                                    <textarea
                                        value={priorKnowledge}
                                        onChange={(e) => setPriorKnowledge(e.target.value)}
                                        placeholder="e.g. I know derivatives and limits, but not related rates..."
                                        rows={2}
                                        className="w-full px-4 py-3 rounded-[2px] border-2 border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-all text-xs font-mono resize-none"
                                    />
                                    <p className="text-[9px] font-mono text-[var(--muted)] mt-2 opacity-60 leading-tight">
                                        Note: Documented concepts will be treated as prerequisites or briefly referenced.
                                    </p>
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-mono font-bold text-[var(--text)] uppercase tracking-wider mb-2">
                                        <SkipForward size={12} className="text-[var(--accent)]" />
                                        Exclusion Parameters
                                    </label>
                                    <input
                                        value={skipTopics}
                                        onChange={(e) => setSkipTopics(e.target.value)}
                                        placeholder="e.g. history, basic algebra, proofs"
                                        className="w-full h-11 px-4 rounded-[2px] border-2 border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-all text-xs font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-mono font-bold text-[var(--text)] uppercase tracking-wider mb-2">
                                        <Target size={12} className="text-[var(--accent)]" />
                                        Success Metric / Goal
                                    </label>
                                    <input
                                        value={focusGoal}
                                        onChange={(e) => setFocusGoal(e.target.value)}
                                        placeholder="e.g. Solve optimization word problems on my exam..."
                                        className="w-full h-11 px-4 rounded-[2px] border-2 border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-all text-xs font-mono"
                                    />
                                </div>
                                
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text)] mb-1.5">
                                        <Clock size={15} className="text-[var(--accent)]" />
                                        Completion Target Date (Optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={targetDate}
                                        onChange={(e) => setTargetDate(e.target.value)}
                                        className="w-full h-11 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors text-sm"
                                    />
                                    <p className="text-xs text-[var(--muted)] mt-1">
                                        We will build a paced schedule to ensure you master the topic by this date.
                                    </p>
                                </div>
                            </div>

                            {errorMsg && (
                                <div className="mt-4 bg-[var(--warn-light)] border border-[var(--warn)]/30 text-[var(--warn)] px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {usage && (
                                <div className="mt-6">
                                    <UsageWarning feature='curricula' usage={usage} />
                                </div>
                            )}

                            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-xs text-[var(--muted)] flex items-center gap-1">
                                    Ready to start?
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={handleQuickLearn}
                                        disabled={isStartingQuick}
                                        className="flex-1 sm:flex-none h-11 px-5 rounded-xl font-medium bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)] flex items-center justify-center gap-2 hover:bg-[var(--bg)] transition-all disabled:opacity-50"
                                    >
                                        {isStartingQuick ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                        Quick Learn
                                    </button>
                                    <button
                                        onClick={handleBuildCurriculum}
                                        disabled={usageLoading || isStartingQuick}
                                        className={`flex-1 sm:flex-none h-11 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-sm ${usage && !usage.allowed
                                            ? 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed opacity-60'
                                            : 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-[var(--accent)]/20 shadow-lg'
                                            }`}
                                    >
                                        {usageLoading ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : usage && !usage.allowed ? (
                                            <>
                                                <Lock size={16} /> Limit Reached
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={16} /> Build Roadmap <ArrowRight size={16} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {usage && !usage.allowed && (
                                <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-sm animate-fade-in">
                                    <p className="font-bold mb-1">Monthly Limit Reached</p>
                                    <p className="opacity-80">You&apos;ve generated all {usage.monthlyLimit} curricula for this month. Upgrade to Pro for 5 or Pro+ for unlimited.</p>
                                    <Link href="/pricing" className="inline-block mt-3 font-bold text-amber-800 underline">View Plans &rarr;</Link>
                                </div>
                            )}
                        </div>
                    )}

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
                                <div className="space-y-4">
                                    {curriculumData.units.map((unit: any, i: number) => (
                                        <div key={i} className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-[2px] p-5 shadow-[var(--shadow-hard-sm)]">
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className="bg-[var(--accent)] text-white text-[10px] font-mono font-black w-6 h-6 flex items-center justify-center border border-[var(--ink)]">
                                                    {unit?.unitNumber || i + 1}
                                                </span>
                                                <span className="font-display font-black text-sm text-[var(--text)] uppercase tracking-tight">
                                                    {unit?.unitTitle || 'Drafting...'}
                                                </span>
                                            </div>
                                            {unit?.concepts && unit.concepts.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {unit.concepts.map((c: any, j: number) => (
                                                        <span key={j} className="text-[10px] font-mono px-2 py-0.5 border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] opacity-80 uppercase tracking-tighter">
                                                            {c?.name || '...'}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {curriculumData?.schedule && curriculumData.schedule.length > 0 && (
                                <div className="mt-8 border-t border-[var(--border)] pt-8">
                                    <h3 className="text-sm font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                                        <Calendar size={16} className="text-[var(--accent)]" /> 
                                        Mastery Schedule
                                    </h3>
                                    <div className="space-y-3">
                                        {curriculumData.schedule.map((item: any, i: number) => (
                                            <div key={i} className="flex items-start gap-3 text-sm p-3 rounded-xl bg-white/50 border border-[var(--border)] group hover:border-[var(--accent)]/30 transition-colors">
                                                <div className="shrink-0 w-12 text-center">
                                                    <p className="text-[10px] font-bold text-[var(--accent)] uppercase leading-none">
                                                        {new Date(item.date).toLocaleDateString(undefined, { month: 'short' })}
                                                    </p>
                                                    <p className="text-base font-bold text-[var(--text)]">
                                                        {new Date(item.date).toLocaleDateString(undefined, { day: 'numeric' })}
                                                    </p>
                                                </div>
                                                <div className="h-6 w-px bg-[var(--border)] mt-2" />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <p className="font-semibold text-[var(--text)]">{item.label}</p>
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-[var(--bg)] border border-[var(--border)] rounded text-[var(--muted)] font-medium">Concept</span>
                                                    </div>
                                                    <p className="text-xs text-[var(--muted)]">Focus: {item.concept_id.length > 20 ? 'Selected concept' : item.concept_id}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
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

                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-[var(--text)] flex items-center gap-2">
                            <BookOpen size={16} className="text-[var(--muted)]" />
                            Active Learning
                        </h2>
                        {sessions.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Sort by:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="bg-transparent text-xs font-semibold text-[var(--text)] outline-none cursor-pointer hover:text-[var(--accent)] transition-colors"
                                >
                                    <option value="recent">Recent</option>
                                    <option value="progress">Progress</option>
                                    <option value="title">Title</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {loadingSessions ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-40 bg-[var(--surface)] border border-[var(--border)] rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : sessions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sortedSessions.map(renderSessionCard)}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-[var(--surface)] border-2 border-dashed border-[var(--border)] rounded-[4px]">
                            <BookOpen size={32} className="mx-auto text-[var(--muted)]/20 mb-4" />
                            <p className="font-display font-black text-[var(--text)] text-sm mb-2 uppercase tracking-widest">Initial Context Required</p>
                            <p className="text-[var(--muted)] text-[10px] font-mono italic">Start a Quick Learn or build a Roadmap above to populate this index.</p>
                        </div>
                    )}
                </div>
            </div>

            {isGateOpen && <UsageGate feature='curricula' onClose={() => setIsGateOpen(false)} />}
        </DashboardLayout>
    );
}
