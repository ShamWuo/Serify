import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import SEO from '@/components/Layout/SEO';
import { z } from 'zod';
import { storage } from '@/lib/storage';
import { useUsage } from '@/hooks/useUsage';
import { UsageGate, UsageWarning } from '@/components/billing/UsageEnforcement';
import {
    CheckCircle2,
    Loader2,
    Brain,
    HelpCircle,
    Search,
    Database,
    AlertTriangle,
    Youtube,
    FileText,
    FileUp,
    ClipboardPaste,
    ArrowRight,
    Lock
} from 'lucide-react';

const conceptSchema = z.object({
    title: z.string(),
    concepts: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            definition: z.string(),
            importance: z.enum(['primary', 'secondary', 'contextual']),
            misconception_risk: z.boolean()
        })
    )
});

const questionSchema = z.object({
    questions: z.array(
        z.object({
            id: z.string(),
            target_concept_id: z.string(),
            type: z.enum(['RETRIEVAL', 'APPLICATION', 'MISCONCEPTION PROBE']),
            text: z.string()
        })
    )
});

export default function Analyze() {
    const { token } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'youtube' | 'article' | 'pdf' | 'notes'>('youtube');
    const [inputValue, setInputValue] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isGateOpen, setIsGateOpen] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const { usage, loading: usageLoading, refresh: refreshUsage } = useUsage('session_standard');

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsInitialLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        setInputValue('');
        setErrorMsg('');
    }, [activeTab]);

    const [progress, setProgress] = useState(0);
    const [displayProgress, setDisplayProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('Initializing...');
    const [conceptData, setConceptData] = useState<any>(null);
    const [questionData, setQuestionData] = useState<any>(null);
    const [currentStep, setCurrentStep] = useState<'extracting' | 'concepts' | 'questions' | 'saving' | 'completed'>('extracting');


    useEffect(() => {
        if (displayProgress < progress) {
            const timer = setTimeout(() => {
                setDisplayProgress(prev => Math.min(prev + 1, progress));
            }, 25);
            return () => clearTimeout(timer);
        } else if (displayProgress > progress) {
            setDisplayProgress(progress);
        }
    }, [displayProgress, progress]);

    const handleAnalyze = async () => {
        if (isProcessing) return;
        if (!inputValue.trim() && activeTab !== 'pdf') return;
        if (activeTab === 'pdf' && !pdfFile) return;

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
            const contentPayload = activeTab === 'pdf' ? `[PDF File: ${pdfFile?.name}]` : inputValue;

            const response = await fetch('/api/serify/analyze-stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                    ...(router.query.demo === 'true' ? { 'x-serify-demo': 'true' } : {})
                },
                body: JSON.stringify({
                    content: contentPayload,
                    contentType: activeTab
                })
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
                                    type: activeTab === 'youtube' ? 'YouTube' : activeTab === 'pdf' ? 'PDF' : activeTab === 'article' ? 'Article' : 'Notes',
                                    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                    last_activity: new Date().toISOString(),
                                    status: 'In Progress'
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

    if (isInitialLoading) {
        return (
            <DashboardLayout>
                <div className="flex-1 flex items-center justify-center p-6 md:p-10 min-h-[calc(100vh-64px)]">
                    <div className="w-full max-w-4xl">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-12 min-h-[500px] flex flex-col items-center justify-center space-y-6 animate-pulse">
                            <div className="w-16 h-16 bg-[var(--border)] rounded-full mb-4"></div>
                            <div className="h-8 w-64 bg-[var(--border)] rounded-lg"></div>
                            <div className="h-4 w-96 bg-[var(--border)] rounded-lg opacity-50"></div>
                            <div className="grid grid-cols-4 gap-4 w-full max-w-md mt-8">
                                <div className="h-10 bg-[var(--border)] rounded-full"></div>
                                <div className="h-10 bg-[var(--border)] rounded-full"></div>
                                <div className="h-10 bg-[var(--border)] rounded-full"></div>
                                <div className="h-10 bg-[var(--border)] rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <SEO title="New Session" />
            <div className="flex-1 flex items-center justify-center p-6 md:p-10 min-h-[calc(100vh-64px)]">
                <div className="w-full max-w-4xl">
                    <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 md:p-12 relative overflow-hidden shadow-sm min-h-[500px] flex items-center justify-center glass animate-scale-in">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>

                        {isStreaming ? (
                            <div className="w-full relative z-10 animate-fade-in text-left">
                                <div className="mb-10">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                                        <h2 className="text-xl sm:text-2xl font-display text-[var(--text)] flex items-center gap-3">
                                            {currentStep === 'extracting' && <Search className="text-[var(--accent)] animate-pulse" size={24} />}
                                            {currentStep === 'concepts' && <Brain className="text-[var(--accent)] animate-pulse" size={24} />}
                                            {currentStep === 'questions' && <HelpCircle className="text-[var(--accent)] animate-pulse" size={24} />}
                                            {currentStep === 'saving' && <Database className="text-[var(--accent)] animate-pulse" size={24} />}
                                            <span className="truncate">{statusMessage}</span>
                                        </h2>
                                        <span className="text-lg font-bold text-[var(--accent)] transition-none tabular-nums">
                                            {displayProgress}%
                                        </span>
                                    </div>

                                    <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden mb-4 relative shadow-inner">
                                        <div
                                            className="h-full bg-[var(--accent)] transition-all duration-300 ease-out shadow-[0_0_10px_var(--accent)] relative overflow-hidden"
                                            style={{ width: `${progress}%` }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer"
                                                style={{ animationDuration: '2s' }} />
                                        </div>
                                    </div>

                                    <p className="text-[var(--muted)] text-sm mt-1 truncate max-w-full" title={conceptData?.title || ''}>
                                        {conceptData?.title
                                            ? `Subject: ${conceptData.title}`
                                            : 'Orchestrating AI pipeline...'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--muted)] mb-4 flex items-center justify-between">
                                            <span>Concept Map</span>
                                            {conceptData?.concepts && (
                                                <CheckCircle2
                                                    className="text-emerald-500"
                                                    size={16}
                                                />
                                            )}
                                        </h3>
                                        <div className="space-y-4 stagger-children max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {conceptData?.concepts ? (
                                                conceptData.concepts.filter((c: any) => !c.parent_id).map((pillar: any, i: number) => (
                                                    <div key={pillar.id || i} className="space-y-2">
                                                        <div
                                                            className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 shadow-sm text-sm border-l-4 border-l-[var(--accent)] card-hover animate-scale-in"
                                                        >
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Brain size={14} className="text-[var(--accent)]" />
                                                                <strong className="text-[var(--text)]">
                                                                    {pillar?.name || '...'}
                                                                </strong>
                                                            </div>
                                                            <span className="text-[var(--muted)] leading-relaxed line-clamp-2">
                                                                {pillar?.definition || '...'}
                                                            </span>
                                                        </div>

                                                        <div className="pl-6 space-y-2 border-l border-[var(--border)] ml-4">
                                                            {conceptData.concepts
                                                                .filter((sub: any) => sub.parent_id === pillar.id)
                                                                .map((sub: any, si: number) => (
                                                                    <div
                                                                        key={sub.id || si}
                                                                        className="bg-[var(--surface)] border border-[var(--border)]/60 rounded-lg p-3 text-xs card-hover animate-fade-in"
                                                                    >
                                                                        <strong className="text-[var(--text)] block mb-0.5">
                                                                            {sub?.name || '...'}
                                                                        </strong>
                                                                        <span className="text-[var(--muted)] leading-relaxed line-clamp-1">
                                                                            {sub?.definition || '...'}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : null}

                                            {conceptData?.concepts && conceptData.concepts.length === 0 && currentStep === 'concepts' && (
                                                <div className="p-4 rounded-xl border border-[var(--border)] border-dashed bg-black/5 animate-pulse text-[var(--muted)] text-sm flex items-center gap-3">
                                                    <Loader2 className="animate-spin" size={16} />
                                                    Identifying key concepts...
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className={`${!questionData?.questions && currentStep !== 'questions' ? 'opacity-30' : 'animate-fade-in'}`}>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--muted)] mb-4 flex items-center justify-between">
                                            <span>Diagnostic Questions</span>
                                            {questionData?.questions &&
                                                questionData.questions.length > 0 && (
                                                    <CheckCircle2
                                                        className="text-emerald-500"
                                                        size={16}
                                                    />
                                                )}
                                        </h3>
                                        <div className="space-y-3 stagger-children max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {questionData?.questions?.map((q: any, i: number) => (
                                                <div
                                                    key={i}
                                                    className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-sm text-sm card-hover animate-scale-in"
                                                >
                                                    <span className="text-xs font-bold text-[var(--accent)]/70 uppercase mb-2 block tracking-wider">
                                                        {q?.type || 'Drafting...'}
                                                    </span>
                                                    <span className="text-[var(--text)] leading-relaxed block line-clamp-2">
                                                        {q?.text || '...'}
                                                    </span>
                                                </div>
                                            ))}
                                            {currentStep === 'questions' && (
                                                <div className="p-4 rounded-xl border border-[var(--border)] border-dashed bg-black/5 animate-pulse text-[var(--muted)] text-sm flex items-center gap-3">
                                                    <Loader2 className="animate-spin" size={16} />
                                                    Generating assessments...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative z-10 text-center max-w-xl mx-auto w-full">
                                <div className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-widest mb-3">
                                    Analyze Something New
                                </div>
                                <h1 className="text-4xl md:text-5xl font-display text-[var(--text)] mb-4">
                                    What did you just learn?
                                </h1>
                                <p className="text-[var(--muted)] text-base mb-8">
                                    Paste a link, upload a PDF, or drop in your notes. Serify will
                                    tell you what you actually understood.
                                </p>

                                {errorMsg && (
                                    <div className="mb-6 bg-[var(--warn-light)] border border-[var(--warn)]/30 text-[var(--warn)] px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center animate-fade-in shadow-sm">
                                        <AlertTriangle size={16} className="mr-2 shrink-0" />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}

                                <div className="flex flex-nowrap overflow-x-auto no-scrollbar items-center justify-start sm:justify-center gap-2 mb-8 pb-2">
                                    {[
                                        { id: 'youtube', label: 'YouTube URL', icon: <Youtube size={16} /> },
                                        { id: 'article', label: 'Article URL', icon: <FileText size={16} /> },
                                        { id: 'pdf', label: 'PDF Upload', icon: <FileUp size={16} /> },
                                        { id: 'notes', label: 'Paste Notes', icon: <ClipboardPaste size={16} /> }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                                ? 'bg-[var(--text)] text-[var(--surface)] shadow-lg translate-y-[-1px]'
                                                : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]'
                                                }`}
                                        >
                                            <span className={`${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>{tab.icon}</span> {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex flex-col gap-4 text-left">
                                    <div className="w-full">
                                        {activeTab === 'youtube' && (
                                            <input
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                type="text"
                                                placeholder="https://youtube.com/watch?v=..."
                                                className="w-full h-14 px-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] outline-none input-focus-ring text-base"
                                            />
                                        )}
                                        {activeTab === 'article' && (
                                            <input
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                type="text"
                                                placeholder="https://..."
                                                className="w-full h-14 px-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] outline-none input-focus-ring text-base"
                                            />
                                        )}
                                        {activeTab === 'pdf' && (
                                            <label className="w-full h-32 px-5 rounded-xl border-2 border-[var(--border)] bg-[var(--bg)] border-dashed flex flex-col items-center justify-center text-[var(--muted)] cursor-pointer hover:bg-[var(--border)]/10 hover:border-[var(--accent)]/40 transition-all relative overflow-hidden group">
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) setPdfFile(file);
                                                    }}
                                                />
                                                <div className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                    <FileUp size={20} className="text-[var(--accent)]" />
                                                </div>
                                                <span className="text-sm font-medium max-w-[80%] truncate text-center">
                                                    {pdfFile ? pdfFile.name : 'Click to select or drag and drop .pdf'}
                                                </span>
                                            </label>
                                        )}
                                        {activeTab === 'notes' && (
                                            <textarea
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                placeholder="Paste your notes, highlights, or any text here..."
                                                className="w-full min-h-[160px] p-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] outline-none input-focus-ring resize-y text-base"
                                            />
                                        )}
                                    </div>

                                    {usage && (
                                        <div className="mb-2">
                                            <UsageWarning feature="session_standard" usage={usage} />
                                        </div>
                                    )}

                                    <button
                                        onClick={handleAnalyze}
                                        disabled={
                                            isProcessing ||
                                            usageLoading ||
                                            (activeTab === 'pdf' ? !pdfFile : !inputValue.trim())
                                        }
                                        className={`w-full h-14 rounded-xl font-bold transition-all flex items-center justify-center text-lg ${(activeTab === 'pdf' ? pdfFile : inputValue.trim()) && !isProcessing
                                            ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-lg shadow-[var(--accent)]/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                                            : 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed opacity-60'
                                            }`}
                                    >
                                        {usageLoading ? (
                                            <Loader2 className="animate-spin" size={20} />
                                        ) : usage && !usage.allowed ? (
                                            <span className="flex items-center gap-2">
                                                <Lock size={18} /> Plan Limit Reached
                                            </span>
                                        ) : (
                                            <span className="flex items-center">
                                                Analyze Content <ArrowRight size={20} className="ml-2" />
                                            </span>
                                        )}
                                    </button>
                                </div>

                                {usage && !usage.allowed && (
                                    <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-sm animate-fade-in text-left">
                                        <p className="font-bold mb-1">Monthly Limit Reached</p>
                                        <p className="opacity-80">You&apos;ve used all {usage.monthlyLimit} learning tokens for this month. Upgrade to Pro or Pro+ for higher limits and unlimited access.</p>
                                        <Link href="/pricing" className="inline-block mt-3 font-bold text-amber-800 underline">View Plans &rarr;</Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {isGateOpen && <UsageGate feature="session_standard" onClose={() => setIsGateOpen(false)} />}
        </DashboardLayout>
    );
}
