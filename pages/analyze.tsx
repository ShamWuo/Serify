import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import SEO from '@/components/Layout/SEO';
import { storage } from '@/lib/storage';
import { useUsage } from '@/hooks/useUsage';
import { UsageGate } from '@/components/billing/UsageEnforcement';
import {
    Youtube,
    Globe,
    FileText,
    Zap,
    CheckCircle2,
    Brain,
    Microscope,
    Search,
    HelpCircle,
    Database,
    FileInput,
    AlertTriangle,
    ArrowRight,
    Loader2,
    ClipboardPaste,
    Link2,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type ContentMode = 'youtube' | 'url' | 'text';

const MODES: { id: ContentMode; label: string; icon: React.ElementType; placeholder: string; hint: string }[] = [
    {
        id: 'youtube',
        label: 'YouTube',
        icon: Youtube,
        placeholder: 'https://youtube.com/watch?v=...',
        hint: 'Paste a YouTube URL — we\'ll extract the full transcript.',
    },
    {
        id: 'url',
        label: 'Article',
        icon: Globe,
        placeholder: 'https://...',
        hint: 'Any article, blog post, or documentation page.',
    },
    {
        id: 'text',
        label: 'Notes',
        icon: FileText,
        placeholder: 'Paste your notes, lecture slides, or any text here...',
        hint: 'Raw text, excerpts, or copied content. Anything works.',
    },
];

const STREAM_LABELS = ['Ingest', 'Concept map', 'Diagnostics', 'Save'];

function streamPhaseIndex(step: string): number {
    if (step === 'extracting') return 0;
    if (step === 'concepts' || step === 'concepts_done') return 1;
    if (step === 'questions' || step === 'questions_done') return 2;
    if (step === 'saving' || step === 'completed') return 3;
    return 0;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Analyze() {
    const { token, loading: authLoading } = useAuth();
    const router = useRouter();

    const [mode, setMode] = useState<ContentMode>('youtube');
    const [content, setContent] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isGateOpen, setIsGateOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Streaming state
    const [progress, setProgress] = useState(0);
    const [displayProgress, setDisplayProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [conceptData, setConceptData] = useState<any>(null);
    const [questionData, setQuestionData] = useState<any>(null);
    const [currentStep, setCurrentStep] = useState<string>('extracting');

    const { usage, refresh: refreshUsage } = useUsage('session_standard');

    // Smooth progress animation
    useEffect(() => {
        if (displayProgress < progress) {
            const t = setTimeout(() => setDisplayProgress((p) => Math.min(p + 1, progress)), 22);
            return () => clearTimeout(t);
        }
    }, [displayProgress, progress]);

    // Auto-resize textarea
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 320)}px`;
        }
    };

    const handlePaste = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            setContent(text);
        } catch {
            /* user denied or unsupported */
        }
    }, []);

    const canSubmit = content.trim().length > 3 && !isProcessing;

    const handleAnalyze = async () => {
        if (!canSubmit) return;
        if (usage && !usage.allowed) { setIsGateOpen(true); return; }

        setErrorMsg('');
        setIsProcessing(true);
        setProgress(5);
        setDisplayProgress(0);
        setConceptData(null);
        setQuestionData(null);
        setCurrentStep('extracting');
        setStatusMessage('Initializing...');

        try {
            const response = await fetch('/api/serify/analyze-stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                    ...(router.query.demo === 'true' ? { 'x-serify-demo': 'true' } : {}),
                },
                body: JSON.stringify({ content: content.trim(), contentType: mode }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to start analysis');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error('No readable stream');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const lines = decoder.decode(value).split('\n');
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const payload = JSON.parse(line.slice(6));
                        if (payload.error) { setErrorMsg(payload.message || payload.error); setIsProcessing(false); return; }
                        if (payload.progress !== undefined) setProgress(payload.progress);
                        if (payload.status) setCurrentStep(payload.status);
                        if (payload.message) setStatusMessage(payload.message);
                        if (payload.status === 'concepts_done') setConceptData(payload.data);
                        if (payload.status === 'questions_done') setQuestionData(payload.data);
                        if (payload.status === 'completed' && payload.session) {
                            setProgress(100);
                            refreshUsage();
                            localStorage.setItem('serify_active_session', JSON.stringify(payload.session));
                            storage.saveSession({
                                id: payload.session.id,
                                title: payload.session.title,
                                type: 'Analysis',
                                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                last_activity: new Date().toISOString(),
                                status: 'In Progress',
                            });
                            setTimeout(() => router.push(`/session/${payload.session.id}`), 700);
                        }
                    } catch { /* parse error on partial chunk */ }
                }
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Analysis failed. Please try again.');
            setIsProcessing(false);
        }
    };

    const activeMode = MODES.find((m) => m.id === mode)!;
    const isStreaming = isProcessing;
    const phaseIdx = useMemo(() => streamPhaseIndex(currentStep), [currentStep]);

    if (authLoading) {
        return (
            <DashboardLayout>
                <SEO title="Analyze" />
                <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-4 animate-pulse">
                    <div className="h-8 w-40 bg-[var(--border)] rounded" />
                    <div className="h-64 bg-[var(--surface)] border-2 border-[var(--border)] rounded-sm" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <SEO title="Analyze" />
            <Head><title>Analyze | Serify</title></Head>

            <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">



                {/* ── Error ── */}
                {errorMsg && (
                    <div
                        className="flex items-start gap-3 px-4 py-3 border-2 border-[var(--warn)]/40 bg-[var(--warn-soft)] text-[var(--warn)] text-[12px] font-mono animate-fade-in"
                        style={{ borderRadius: '2px', boxShadow: 'var(--shadow-hard-sm)' }}
                    >
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* ── Main Workstation ── */}
                {isStreaming ? (
                    /* Live pipeline view */
                    <div className="space-y-4 animate-fade-in">
                        {/* Progress card */}
                        <div className="paper-card p-5">
                            <div className="flex items-center justify-between mb-5">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-[var(--muted)]">{'// live pipeline'}</span>
                                <span className="text-xl font-black tabular-nums font-mono text-[var(--accent)]">{displayProgress}%</span>
                            </div>

                            {/* Phase row */}
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                {STREAM_LABELS.map((label, i) => {
                                    const done = i < phaseIdx;
                                    const active = i === phaseIdx;
                                    return (
                                        <div
                                            key={label}
                                            className={`relative py-2.5 text-center border-2 text-[9px] font-mono font-bold uppercase tracking-tight transition-all duration-300`}
                                            style={{
                                                borderRadius: '2px',
                                                borderColor: done ? 'var(--accent)' : active ? 'color-mix(in srgb, var(--accent) 50%, transparent)' : 'var(--border-soft)',
                                                background: done ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : active ? 'var(--bg)' : 'var(--surface)',
                                                color: done || active ? 'var(--accent)' : 'var(--muted)',
                                                opacity: done ? 1 : active ? 1 : 0.45,
                                            }}
                                        >
                                            {done && <CheckCircle2 className="inline w-3 h-3 mr-0.5 align-text-bottom" />}
                                            {active && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] mr-1 align-middle animate-pulse" />}
                                            {label}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Bar */}
                            <div className="h-1 bg-[var(--border)] overflow-hidden mb-3" style={{ borderRadius: '1px' }}>
                                <div
                                    className="h-full transition-all duration-500 ease-out"
                                    style={{ width: `${displayProgress}%`, background: 'var(--accent)' }}
                                />
                            </div>

                            {/* Status line */}
                            <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--muted)]">
                                <Loader2 size={12} className="animate-spin text-[var(--accent)] shrink-0" />
                                <span className="truncate">{statusMessage || 'Processing...'}</span>
                                {conceptData?.title && (
                                    <span className="ml-auto shrink-0 text-[var(--accent)] font-bold truncate max-w-[160px]">
                                        ✦ {conceptData.title}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Live data: concept map + questions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Concept map */}
                            <div className="paper-card p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Concept map</span>
                                    {conceptData?.concepts && <CheckCircle2 size={13} className="text-emerald-500" />}
                                </div>
                                <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-0.5">
                                    {conceptData?.concepts
                                        ? conceptData.concepts.filter((c: any) => !c.parent_id).map((pillar: any, i: number) => (
                                            <div key={pillar.id || i}>
                                                <div className="border-l-2 border-[var(--accent)] pl-3 mb-1.5">
                                                    <p className="text-[11px] font-bold text-[var(--text)] leading-snug">{pillar.name}</p>
                                                    <p className="text-[10px] text-[var(--muted)] leading-snug line-clamp-1">{pillar.definition}</p>
                                                </div>
                                                <div className="pl-5 space-y-1">
                                                    {conceptData.concepts.filter((s: any) => s.parent_id === pillar.id).map((sub: any, si: number) => (
                                                        <div key={sub.id || si} className="border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5" style={{ borderRadius: '2px' }}>
                                                            <p className="text-[10px] font-semibold text-[var(--text)] leading-tight">{sub.name}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                        : (
                                            <div className="flex items-center gap-2 py-6 text-[11px] font-mono text-[var(--muted)] opacity-60 animate-pulse">
                                                <Brain size={13} className="text-[var(--accent)]" />
                                                Mapping concepts...
                                            </div>
                                        )
                                    }
                                </div>
                            </div>

                            {/* Diagnostics */}
                            <div className={`paper-card p-5 transition-opacity duration-500 ${!questionData && currentStep !== 'questions' ? 'opacity-40' : ''}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Diagnostics</span>
                                    {questionData?.questions?.length > 0 && <CheckCircle2 size={13} className="text-emerald-500" />}
                                </div>
                                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-0.5">
                                    {questionData?.questions?.map((q: any, i: number) => (
                                        <div key={i} className="bg-[var(--bg)] border border-[var(--border)] px-3 py-2.5" style={{ borderRadius: '2px' }}>
                                            <span className="text-[8px] font-mono font-black text-[var(--accent)] uppercase tracking-widest block mb-1">{q.type}</span>
                                            <span className="text-[11px] text-[var(--text)] leading-snug line-clamp-2">{q.text}</span>
                                        </div>
                                    ))}
                                    {!questionData?.questions && currentStep === 'questions' && (
                                        <div className="flex items-center gap-2 py-6 text-[11px] font-mono text-[var(--muted)] opacity-60 animate-pulse">
                                            <Microscope size={13} className="text-[var(--accent)]" />
                                            Drafting questions...
                                        </div>
                                    )}
                                    {!questionData?.questions && currentStep !== 'questions' && (
                                        <p className="text-[10px] font-mono text-[var(--muted)] opacity-40 py-6">{'// waiting for concept map...'}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                ) : (
                    /* Input workstation */
                    <div className="space-y-5 animate-fade-in">

                        {/* Ingest station container */}
                        <div
                            className="bg-[var(--surface)] border-2 border-[var(--border)] overflow-hidden"
                            style={{ borderRadius: '3px', boxShadow: 'var(--shadow-hard)' }}
                        >
                            {/* Tab bar */}
                            <div className="flex border-b-2 border-[var(--border)] bg-[var(--bg)]">
                                {MODES.map((m) => {
                                    const Icon = m.icon;
                                    const active = mode === m.id;
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => { setMode(m.id); setContent(''); setErrorMsg(''); }}
                                            className={`flex items-center gap-2 px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-wider transition-all border-r border-[var(--border-soft)] relative ${
                                                active
                                                    ? 'text-[var(--accent)] bg-[var(--surface)]'
                                                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
                                            }`}
                                        >
                                            <Icon size={13} />
                                            {m.label}
                                            {active && (
                                                <span
                                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]"
                                                    aria-hidden
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                                {/* Right gutter label */}
                                <div className="ml-auto flex items-center px-4 text-[9px] font-mono text-[var(--muted)] opacity-50 uppercase tracking-widest">
                                    ingest station
                                </div>
                            </div>

                            {/* Input area */}
                            <div className="p-5">
                                <p className="text-[10px] font-mono text-[var(--muted)] mb-3 opacity-70">
                                    {activeMode.hint}
                                </p>

                                {mode === 'text' ? (
                                    /* Text textarea */
                                    <div className="relative">
                                        <textarea
                                            ref={textareaRef}
                                            value={content}
                                            onChange={handleTextareaChange}
                                            placeholder={activeMode.placeholder}
                                            rows={6}
                                            className="w-full px-4 py-3 border-2 border-[var(--border)] bg-[var(--bg)] text-[13px] font-mono outline-none focus:border-[var(--accent)] transition-all resize-none text-[var(--text)] placeholder:text-[var(--muted)] placeholder:opacity-40"
                                            style={{ borderRadius: '2px', minHeight: '120px', maxHeight: '320px' }}
                                        />
                                        <button
                                            onClick={handlePaste}
                                            title="Paste from clipboard"
                                            className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wide text-[var(--muted)] border border-[var(--border)] bg-[var(--surface)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all"
                                            style={{ borderRadius: '2px' }}
                                        >
                                            <ClipboardPaste size={10} />
                                            Paste
                                        </button>
                                    </div>
                                ) : (
                                    /* URL / YouTube single-line */
                                    <div className="relative flex items-center border-2 border-[var(--border)] bg-[var(--bg)] focus-within:border-[var(--accent)] transition-all" style={{ borderRadius: '2px' }}>
                                        <Link2 size={14} className="absolute left-4 text-[var(--muted)] opacity-50 shrink-0" />
                                        <input
                                            type="url"
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                                            placeholder={activeMode.placeholder}
                                            className="flex-1 h-12 pl-10 pr-4 text-[13px] font-mono bg-transparent outline-none text-[var(--text)] placeholder:text-[var(--muted)] placeholder:opacity-40"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handlePaste}
                                            title="Paste from clipboard"
                                            className="flex items-center gap-1.5 px-3 h-full text-[9px] font-mono font-bold uppercase tracking-wide text-[var(--muted)] border-l border-[var(--border)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition-all shrink-0"
                                        >
                                            <ClipboardPaste size={10} />
                                            Paste
                                        </button>
                                    </div>
                                )}

                                {/* Submit row */}
                                <div className="flex items-center justify-between mt-4 gap-4">
                                    {/* Char count for text mode */}
                                    {mode === 'text' && (
                                        <span className="text-[9px] font-mono text-[var(--muted)] opacity-50 tabular-nums">
                                            {content.length.toLocaleString()} chars
                                        </span>
                                    )}
                                    {mode !== 'text' && <span />}

                                    <button
                                        onClick={handleAnalyze}
                                        disabled={!canSubmit}
                                        className="flex items-center gap-2.5 px-6 h-10 text-[11px] font-mono font-bold uppercase tracking-widest text-white bg-[var(--accent)] border-2 border-[var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:translate-y-px transition-all"
                                        style={{ borderRadius: '2px', boxShadow: 'var(--shadow-hard-sm)' }}
                                    >
                                        <Zap size={13} fill="currentColor" />
                                        Run Analysis
                                    </button>
                                </div>
                            </div>

                            {/* Bottom strip — usage / limit */}
                            {usage && (
                                <div className="border-t border-[var(--border-soft)] px-5 py-2.5 flex items-center justify-between bg-[var(--bg)]">
                                    <span className="text-[9px] font-mono text-[var(--muted)] opacity-60">
                                        {usage.plan === 'proplus' 
                                            ? 'Pro+ Plan — Unlimited Sessions'
                                            : usage.allowed
                                                ? `${(usage.monthlyLimit ?? 0) - (usage.tokensUsed ?? 0)} sessions remaining this month`
                                                : '⚠ Monthly limit reached'}
                                    </span>
                                    {!usage.allowed && (
                                        <Link href="/pricing" className="text-[9px] font-mono font-bold text-amber-600 hover:underline flex items-center gap-0.5">
                                            Upgrade <ArrowRight size={9} />
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Pipeline steps info */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { icon: FileInput, label: '01 — Ingest', desc: 'URL or text pulled and cleaned.' },
                                { icon: Brain, label: '02 — Map', desc: 'Pillars + sub-concepts extracted by AI.' },
                                { icon: Microscope, label: '03 — Diagnose', desc: 'Open-ended questions surface real gaps.' },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className="bg-[var(--surface)] border border-[var(--border-soft)] p-4"
                                    style={{ borderRadius: '2px' }}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <item.icon size={13} className="text-[var(--accent)] shrink-0" />
                                        <span className="text-[10px] font-mono font-bold text-[var(--text)] uppercase tracking-tight">{item.label}</span>
                                    </div>
                                    <p className="text-[10px] text-[var(--muted)] leading-snug">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {isGateOpen && <UsageGate feature="session_standard" onClose={() => setIsGateOpen(false)} />}
        </DashboardLayout>
    );
}
