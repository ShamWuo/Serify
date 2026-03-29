import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AnalyzeLayout from '@/components/analyze/AnalyzeLayout';
import SEO from '@/components/Layout/SEO';
import { storage } from '@/lib/storage';
import { useUsage } from '@/hooks/useUsage';
import { UsageGate } from '@/components/billing/UsageEnforcement';
import {
    CheckCircle2,
    Loader2,
    Brain,
    HelpCircle,
    Search,
    Database,
    Zap,
    AlertTriangle,
    FileInput,
    Share2,
    Microscope,
} from 'lucide-react';
import SmartInputCard from '@/components/dashboard/SmartInputCard';
import { DetectedType } from '@/components/dashboard/DetectionTag';
import { SearchMode } from '@/components/dashboard/ModeToggle';

const PIPELINE = [
    { id: 'ingest', label: 'Ingest', desc: 'Pull text from link, PDF, or notes', icon: FileInput },
    { id: 'map', label: 'Map', desc: 'Pillars & sub-concepts from your source', icon: Brain },
    { id: 'diagnose', label: 'Diagnose', desc: 'Retrieval & misconception probes', icon: Microscope },
] as const;

function streamPhaseIndex(step: string): number {
    if (step === 'extracting') return 0;
    if (step === 'concepts' || step === 'concepts_done') return 1;
    if (step === 'questions' || step === 'questions_done') return 2;
    if (step === 'saving' || step === 'completed') return 3;
    return 0;
}

const STREAM_LABELS = ['Ingest', 'Concept map', 'Questions', 'Save'];

export default function Analyze() {
    const { token, loading: authLoading } = useAuth();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isGateOpen, setIsGateOpen] = useState(false);

    const { usage, refresh: refreshUsage } = useUsage('session_standard');

    const [progress, setProgress] = useState(0);
    const [displayProgress, setDisplayProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('Initializing...');
    const [conceptData, setConceptData] = useState<any>(null);
    const [questionData, setQuestionData] = useState<any>(null);
    const [currentStep, setCurrentStep] = useState<string>('extracting');

    useEffect(() => {
        if (displayProgress < progress) {
            const timer = setTimeout(() => {
                setDisplayProgress((prev) => Math.min(prev + 1, progress));
            }, 25);
            return () => clearTimeout(timer);
        } else if (displayProgress > progress) {
            setDisplayProgress(progress);
        }
    }, [displayProgress, progress]);

    const handleAnalyze = async (data: { content: string; type: DetectedType; mode: SearchMode; file?: File }) => {
        if (isProcessing) return;

        if (usage && !usage.allowed) {
            setIsGateOpen(true);
            return;
        }

        setErrorMsg('');
        setIsProcessing(true);
        setProgress(0);
        setConceptData(null);
        setQuestionData(null);

        try {
            const contentPayload = data.type === 'file' ? `[File: ${data.file?.name}]` : data.content;

            const response = await fetch('/api/serify/analyze-stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                    ...(router.query.demo === 'true' ? { 'x-serify-demo': 'true' } : {}),
                },
                body: JSON.stringify({
                    content: contentPayload,
                    contentType:
                        data.type === 'file' ? (data.file?.type === 'application/pdf' ? 'pdf' : 'text') : data.type,
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to start analysis');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('No reader available');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const payload = JSON.parse(line.slice(6));

                            if (payload.error) {
                                setErrorMsg(payload.message || payload.error);
                                setIsProcessing(false);
                                return;
                            }

                            if (payload.progress !== undefined) setProgress(payload.progress);
                            if (payload.status) setCurrentStep(payload.status);
                            if (payload.message) setStatusMessage(payload.message);

                            if (payload.status === 'concepts_done') {
                                setConceptData(payload.data);
                            }
                            if (payload.status === 'questions_done') {
                                setQuestionData(payload.data);
                            }

                            if (payload.status === 'completed' && payload.session) {
                                setProgress(100);
                                refreshUsage();
                                localStorage.setItem('serify_active_session', JSON.stringify(payload.session));
                                storage.saveSession({
                                    id: payload.session.id,
                                    title: payload.session.title,
                                    type: 'Analysis',
                                    date: new Date().toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                    }),
                                    last_activity: new Date().toISOString(),
                                    status: 'In Progress',
                                });
                                setTimeout(() => {
                                    router.push(`/session/${payload.session.id}`);
                                }, 800);
                            }
                        } catch (e) {
                            console.error('Error parsing SSE chunk:', e);
                        }
                    }
                }
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Analysis failed. Please try again.');
            setIsProcessing(false);
        }
    };

    const isStreaming = isProcessing && (progress > 0 || conceptData);

    const phaseIdx = useMemo(() => streamPhaseIndex(currentStep as string), [currentStep]);

    if (authLoading) {
        return (
            <AnalyzeLayout>
                <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                    <div className="w-full max-w-lg border-2 border-[var(--border)] bg-[var(--surface)] p-10 animate-pulse" style={{ boxShadow: 'var(--shadow-hard)' }}>
                        <div className="h-8 w-48 bg-[var(--border)] mb-4" />
                        <div className="h-4 w-full bg-[var(--border)] opacity-40 mb-8" />
                        <div className="h-32 bg-[var(--border)] opacity-30" />
                    </div>
                </div>
            </AnalyzeLayout>
        );
    }

    return (
        <AnalyzeLayout>
            <SEO title="Analyze" />

            {isStreaming ? (
                <div className="w-full animate-fade-in">
                    {/* Stream stepper */}
                    <div className="mb-8 border-2 border-[var(--border)] bg-[var(--surface)] p-4 md:p-5" style={{ boxShadow: 'var(--shadow-hard-sm)' }}>
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--muted)]">Live pipeline</p>
                            <span className="text-lg font-black tabular-nums text-[var(--accent)]">{displayProgress}%</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 sm:gap-2">
                            {STREAM_LABELS.map((label, i) => {
                                const done = i < phaseIdx;
                                const active = i === phaseIdx;
                                return (
                                    <div
                                        key={label}
                                        className={`text-center py-2 px-1 border-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-tight transition-colors ${
                                            done
                                                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                                                : active
                                                  ? 'border-[var(--border)] bg-[var(--bg)] text-[var(--text)] ring-2 ring-[var(--accent)]/30'
                                                  : 'border-[var(--border-soft)] bg-[var(--surface)] text-[var(--muted)] opacity-70'
                                        }`}
                                        style={{ borderRadius: '3px' }}
                                    >
                                        {done ? <CheckCircle2 className="inline w-3 h-3 mr-0.5 align-text-bottom" /> : null}
                                        {label}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-4 h-2 bg-[var(--border)] overflow-hidden" style={{ borderRadius: '2px' }}>
                            <div
                                className="h-full bg-[var(--accent)] transition-all duration-300 ease-out relative overflow-hidden"
                                style={{ width: `${progress}%` }}
                            >
                                <div
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-shimmer"
                                    style={{ animationDuration: '2s' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-2 border-[var(--border)] bg-[var(--surface-raised)] p-6 md:p-8 relative overflow-hidden" style={{ boxShadow: 'var(--shadow-hard)' }}>
                        <div className="absolute top-0 right-0 w-72 h-72 bg-[var(--accent)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

                        <div className="relative z-10 mb-10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                                <h2 className="text-xl sm:text-2xl font-display text-[var(--text)] flex items-center gap-3 min-w-0">
                                    {phaseIdx === 0 && <Search className="text-[var(--accent)] animate-pulse shrink-0" size={24} />}
                                    {phaseIdx === 1 && <Brain className="text-[var(--accent)] animate-pulse shrink-0" size={24} />}
                                    {phaseIdx === 2 && <HelpCircle className="text-[var(--accent)] animate-pulse shrink-0" size={24} />}
                                    {phaseIdx === 3 && <Database className="text-[var(--accent)] animate-pulse shrink-0" size={24} />}
                                    <span className="truncate">{statusMessage}</span>
                                </h2>
                            </div>
                            <p className="text-[var(--muted)] text-sm truncate max-w-full" title={conceptData?.title || ''}>
                                {conceptData?.title ? `Subject: ${conceptData.title}` : 'Orchestrating AI pipeline...'}
                            </p>
                        </div>

                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] mb-4 flex items-center justify-between">
                                    <span>Concept map</span>
                                    {conceptData?.concepts && <CheckCircle2 className="text-emerald-500" size={16} />}
                                </h3>
                                <div className="space-y-4 stagger-children max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {conceptData?.concepts
                                        ? conceptData.concepts
                                              .filter((c: any) => !c.parent_id)
                                              .map((pillar: any, i: number) => (
                                                  <div key={pillar.id || i} className="space-y-2">
                                                      <div
                                                          className="bg-[var(--bg)] border-2 border-[var(--border)] p-4 text-sm border-l-4 border-l-[var(--accent)]"
                                                          style={{ boxShadow: 'var(--shadow-hard-sm)' }}
                                                      >
                                                          <div className="flex items-center gap-2 mb-1">
                                                              <Brain size={14} className="text-[var(--accent)]" />
                                                              <strong className="text-[var(--text)]">{pillar?.name || '...'}</strong>
                                                          </div>
                                                          <span className="text-[var(--muted)] leading-relaxed line-clamp-2">
                                                              {pillar?.definition || '...'}
                                                          </span>
                                                      </div>
                                                      <div className="pl-6 space-y-2 border-l-2 border-[var(--border-soft)] ml-3">
                                                          {conceptData.concepts
                                                              .filter((sub: any) => sub.parent_id === pillar.id)
                                                              .map((sub: any, si: number) => (
                                                                  <div
                                                                      key={sub.id || si}
                                                                      className="bg-[var(--surface)] border border-[var(--border)]/80 p-3 text-xs"
                                                                      style={{ boxShadow: 'var(--shadow-hard-sm)' }}
                                                                  >
                                                                      <strong className="text-[var(--text)] block mb-0.5">{sub?.name || '...'}</strong>
                                                                      <span className="text-[var(--muted)] leading-relaxed line-clamp-1">
                                                                          {sub?.definition || '...'}
                                                                      </span>
                                                                  </div>
                                                              ))}
                                                      </div>
                                                  </div>
                                              ))
                                        : null}
                                    {conceptData?.concepts && conceptData.concepts.length === 0 && currentStep === 'concepts' && (
                                        <div className="p-4 border-2 border-dashed border-[var(--border)] bg-[var(--bg)] animate-pulse text-[var(--muted)] text-sm flex items-center gap-3">
                                            <Loader2 className="animate-spin" size={16} />
                                            Identifying key concepts...
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`${!questionData?.questions && currentStep !== 'questions' ? 'opacity-30' : 'animate-fade-in'}`}>
                                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] mb-4 flex items-center justify-between">
                                    <span>Diagnostic questions</span>
                                    {questionData?.questions && questionData.questions.length > 0 && (
                                        <CheckCircle2 className="text-emerald-500" size={16} />
                                    )}
                                </h3>
                                <div className="space-y-3 stagger-children max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {questionData?.questions?.map((q: any, i: number) => (
                                        <div
                                            key={i}
                                            className="bg-[var(--bg)] border-2 border-[var(--border)] p-4 text-sm"
                                            style={{ boxShadow: 'var(--shadow-hard-sm)' }}
                                        >
                                            <span className="text-[10px] font-bold text-[var(--accent)]/80 uppercase mb-2 block tracking-wider">
                                                {q?.type || 'Drafting...'}
                                            </span>
                                            <span className="text-[var(--text)] leading-relaxed block line-clamp-2">{q?.text || '...'}</span>
                                        </div>
                                    ))}
                                    {currentStep === 'questions' && (
                                        <div className="p-4 border-2 border-dashed border-[var(--border)] bg-[var(--bg)] animate-pulse text-[var(--muted)] text-sm flex items-center gap-3">
                                            <Loader2 className="animate-spin" size={16} />
                                            Generating assessments...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,220px)_1fr] gap-8 lg:gap-12 items-start animate-scale-in">
                    {/* Left rail — pipeline (desktop) */}
                    <aside className="hidden lg:block space-y-6 sticky top-24">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--muted)] mb-4">Pipeline</p>
                            <ol className="space-y-0">
                                {PIPELINE.map((step, idx) => (
                                    <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
                                        {idx < PIPELINE.length - 1 && (
                                            <span
                                                className="absolute left-[13px] top-8 bottom-0 w-px bg-[var(--border-soft)]"
                                                aria-hidden
                                            />
                                        )}
                                        <div
                                            className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-[var(--border)] bg-[var(--accent)] text-[var(--surface)] text-[11px] font-black"
                                            style={{ boxShadow: 'var(--shadow-hard-sm)' }}
                                        >
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-bold text-[var(--text)] flex items-center gap-2">
                                                <step.icon size={14} className="text-[var(--accent)] opacity-80" />
                                                {step.label}
                                            </p>
                                            <p className="text-[10px] text-[var(--muted)] leading-snug mt-1 pr-2">{step.desc}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                        <div className="border-2 border-[var(--border)] bg-[var(--bg)] p-4" style={{ boxShadow: 'var(--shadow-hard-sm)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">Output</p>
                            <p className="text-[11px] text-[var(--text)] leading-relaxed">
                                A reflection session with your concept map, diagnostic quiz, and vault updates.
                            </p>
                            <Link
                                href="/history"
                                className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-bold text-[var(--accent)] hover:underline"
                            >
                                <Share2 size={12} /> View past runs in History
                            </Link>
                        </div>
                    </aside>

                    {/* Main workstation */}
                    <div className="min-w-0">
                        <div className="mb-8">
                            <p className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-[0.25em] mb-2">New analysis</p>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display text-[var(--text)] mb-3 leading-tight">
                                What did you just learn?
                            </h1>
                            <p className="text-[var(--muted)] text-sm md:text-base max-w-2xl leading-relaxed">
                                Drop a link, a PDF, or raw notes. We&apos;ll extract structure, surface misconceptions, and open a
                                session so you can prove what you know.
                            </p>
                        </div>

                        <div
                            className="border-2 border-[var(--border)] bg-[var(--surface-raised)] p-6 md:p-10 relative overflow-hidden"
                            style={{ boxShadow: 'var(--shadow-hard-lg)' }}
                        >
                            <div className="absolute -top-px left-0 right-0 h-1 bg-[var(--accent)]" aria-hidden />
                            <div className="absolute top-8 right-0 w-56 h-56 bg-[var(--sage)]/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative z-10">
                                {errorMsg && (
                                    <div className="mb-6 bg-[var(--warn-soft)] border-2 border-[var(--warn)]/30 text-[var(--warn)] px-4 py-3 text-sm font-medium flex items-start gap-3 animate-fade-in" style={{ boxShadow: 'var(--shadow-hard-sm)' }}>
                                        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}

                                <SmartInputCard
                                    onAnalyze={handleAnalyze as any}
                                    tokenBalance={usage ? (usage.monthlyLimit ?? 0) - (usage.tokensUsed ?? 0) : 0}
                                />

                                {usage && !usage.allowed && (
                                    <div className="mt-6 p-4 border-2 border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-sm animate-fade-in" style={{ boxShadow: 'var(--shadow-hard-sm)' }}>
                                        <p className="font-bold mb-1">Monthly limit reached</p>
                                        <p className="opacity-90 text-xs leading-relaxed">
                                            You&apos;ve used all {usage.monthlyLimit} learning tokens this month. Upgrade for higher
                                            limits.
                                        </p>
                                        <Link href="/pricing" className="inline-block mt-3 text-xs font-bold underline">
                                            View plans →
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mobile pipeline summary */}
                        <div className="lg:hidden mt-8 grid grid-cols-3 gap-3">
                            {PIPELINE.map((step) => (
                                <div
                                    key={step.id}
                                    className="border-2 border-[var(--border)] bg-[var(--surface)] p-3 text-center"
                                    style={{ boxShadow: 'var(--shadow-hard-sm)' }}
                                >
                                    <step.icon size={16} className="mx-auto text-[var(--accent)] mb-2" />
                                    <p className="text-[9px] font-bold uppercase tracking-tight text-[var(--text)]">{step.label}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 pt-8 border-t-2 border-[var(--border-soft)] grid grid-cols-1 sm:grid-cols-3 gap-8">
                            {[
                                {
                                    icon: Search,
                                    title: 'Deconstruct',
                                    desc: 'AI breaks your source into pillars and sub-concepts you can navigate.',
                                },
                                {
                                    icon: Brain,
                                    title: 'Diagnose',
                                    desc: 'Questions target retrieval, application, and likely misconceptions.',
                                },
                                {
                                    icon: Zap,
                                    title: 'Master',
                                    desc: 'Gaps sync to your Concept Vault for spaced follow-up.',
                                },
                            ].map((step) => (
                                <div key={step.title} className="space-y-2">
                                    <div className="flex items-center gap-2 text-[var(--text)] font-bold text-[11px] uppercase tracking-widest">
                                        <step.icon size={14} className="text-[var(--accent)]" />
                                        {step.title}
                                    </div>
                                    <p className="text-[var(--muted)] text-xs leading-relaxed">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {isGateOpen && <UsageGate feature="session_standard" onClose={() => setIsGateOpen(false)} />}
        </AnalyzeLayout>
    );
}
