import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import {
    Youtube,
    FileText,
    FileUp,
    AlignLeft,
    ArrowRight,
    Zap,
    AlertTriangle,
    History,
    Brain,
    Play,
    ChevronRight,
    CheckCircle2,
    ShieldAlert,
    X,
} from 'lucide-react';
import { storage, SessionSummary } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useSparks } from '@/hooks/useSparks';
import { KnowledgeNode } from '@/types/serify';
import LandingPage from '@/components/LandingPage';
import OutOfSparksModal from '@/components/sparks/OutOfSparksModal';

// ------ Helpers ------

type DetectedType = 'youtube' | 'article' | 'text' | 'pdf' | null;

function detectInputType(value: string): DetectedType {
    if (!value.trim()) return null;
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/i;
    if (youtubeRegex.test(value.trim())) return 'youtube';
    const urlRegex = /^https?:\/\//i;
    if (urlRegex.test(value.trim())) return 'article';
    return 'text';
}

const DETECTION_LABELS: Record<string, { label: string; color: string }> = {
    youtube: { label: 'YouTube', color: 'text-red-500 bg-red-50 border-red-200' },
    article: { label: 'Article URL', color: 'text-blue-500 bg-blue-50 border-blue-200' },
    text: { label: 'Text', color: 'text-green-600 bg-green-50 border-green-200' },
    pdf: { label: 'PDF', color: 'text-purple-500 bg-purple-50 border-purple-200' },
};

function getSessionIcon(type: string) {
    switch (type) {
        case 'YouTube Video': return <Youtube size={16} className="text-red-500" />;
        case 'PDF Upload': return <FileUp size={16} className="text-purple-500" />;
        case 'Article URL': return <FileText size={16} className="text-blue-500" />;
        default: return <AlignLeft size={16} className="text-green-600" />;
    }
}

function getMasteryColor(state: string) {
    switch (state) {
        case 'solid': return 'bg-[#2A5C45]';
        case 'developing': return 'bg-[#4A90A4]';
        case 'shaky': return 'bg-[#B8860B]';
        case 'revisit': return 'bg-[#C4541A]';
        default: return 'bg-gray-300';
    }
}

// ------ Main Component ------

export default function Home() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { demo } = router.query;
    const isDemo = demo === 'true';
    const { balance } = useSparks();

    // Smart Input
    const [inputValue, setInputValue] = useState('');
    const [detectedType, setDetectedType] = useState<DetectedType>(null);
    const [mode, setMode] = useState<'analyze' | 'learn'>('analyze');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Processing
    const [isProcessing, setIsProcessing] = useState(false);
    const processingRef = useRef(false);
    const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');

    // Dashboard data
    const [latestSessions, setLatestSessions] = useState<SessionSummary[]>([]);
    const [activeCurriculum, setActiveCurriculum] = useState<any>(null);
    const [focusConcepts, setFocusConcepts] = useState<KnowledgeNode[]>([]);
    const [activityDays, setActivityDays] = useState<boolean[]>([false, false, false, false, false, false, false]);
    const [totalSessionCount, setTotalSessionCount] = useState(0);

    const loadingMessages = [
        "Extracting content...",
        "Identifying key concepts...",
        "Building concept map...",
        "Generating your questions...",
    ];

    const [isOutOfSparksModalOpen, setIsOutOfSparksModalOpen] = useState(false);

    // Detect input type on change
    useEffect(() => {
        if (!pdfFile) {
            setDetectedType(detectInputType(inputValue));
        }
    }, [inputValue, pdfFile]);

    // Loading message cycle
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isProcessing) {
            interval = setInterval(() => {
                setLoadingMsgIdx(prev => (prev + 1) % loadingMessages.length);
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isProcessing]);

    // Fetch dashboard data
    useEffect(() => {
        if (!user) {
            const history = storage.getHistory();
            setLatestSessions(history.slice(0, 6));
            setTotalSessionCount(history.length);
            return;
        }

        // Fetch sessions
        supabase.from('reflection_sessions')
            .select('id, title, content_type, created_at, status, depth_score')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)
            .then(({ data, error }) => {
                if (!error && data) {
                    const mappedSessions: SessionSummary[] = data.map(s => ({
                        id: s.id,
                        title: s.title && s.title !== 'No Learning Material Provided' ? s.title : 'Untitled Analysis',
                        type: s.content_type === 'youtube' ? 'YouTube Video' : s.content_type === 'pdf' ? 'PDF Upload' : s.content_type === 'article' ? 'Article URL' : 'Notes',
                        date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                        status: s.status === 'feedback' || s.status === 'complete' ? 'Completed' : 'In Progress',
                        result: s.depth_score && s.depth_score > 70 ? 'Strong' : 'Gaps Found'
                    }));
                    setLatestSessions(mappedSessions.slice(0, 6));
                    setTotalSessionCount(data.length);
                }
            });

        // Active curriculum
        supabase.from('curricula')
            .select('id, title, status, last_activity_at')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('last_activity_at', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data }) => setActiveCurriculum(data));

        // Focus concepts
        supabase.from('knowledge_nodes')
            .select('id, display_name, current_mastery, session_count')
            .eq('user_id', user.id)
            .in('current_mastery', ['shaky', 'revisit'])
            .order('session_count', { ascending: false })
            .limit(3)
            .then(({ data }) => setFocusConcepts((data as any) || []));

        // Activity dots: last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        supabase.from('reflection_sessions')
            .select('created_at')
            .eq('user_id', user.id)
            .gte('created_at', sevenDaysAgo.toISOString())
            .then(({ data }) => {
                const today = new Date();
                const dots = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(today);
                    d.setDate(today.getDate() - (6 - i));
                    const dateStr = d.toISOString().slice(0, 10);
                    return (data || []).some((s: any) => s.created_at?.slice(0, 10) === dateStr);
                });
                setActivityDays(dots);
            });
    }, [user]);

    const handleAnalyze = async () => {
        if (isProcessing || processingRef.current) return;
        if (!inputValue.trim() && !pdfFile) return;

        // Check sparks
        if (balance && balance.total_sparks < 2) {
            setIsOutOfSparksModalOpen(true);
            return;
        }

        setIsProcessing(true);
        processingRef.current = true;
        setErrorMsg('');

        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            const token = authSession?.access_token;

            const type = pdfFile ? 'pdf' : detectInputType(inputValue);

            const formData = new FormData();
            if (pdfFile) {
                formData.append('file', pdfFile);
            } else {
                formData.append('content', inputValue);
            }
            formData.append('type', type || 'text');
            formData.append('mode', mode);

            const res = await fetch('/api/process-content', {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to process content');
            }

            const { sessionId } = await res.json();
            router.push(`/session/${sessionId}`);
        } catch (error) {
            console.error(error);
            setErrorMsg(error instanceof Error ? error.message : 'Failed to analyze content.');
            setIsProcessing(false);
            processingRef.current = false;
        }
    };

    const clearInput = () => {
        setInputValue('');
        setPdfFile(null);
        setDetectedType(null);
    };

    const handleTestSubscription = async () => {
        if (!user) return;
        try {
            const { data: authData } = await supabase.auth.getSession();
            const token = authData.session?.access_token;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            // Use the Pro Monthly price ID for testing
            const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY;
            if (!priceId) {
                alert('Missing Stripe Price ID in environment variables.');
                return;
            }

            const res = await fetch('/api/subscriptions/checkout', {
                method: 'POST',
                headers,
                body: JSON.stringify({ userId: user.id, priceId })
            });

            if (!res.ok) {
                console.error('Checkout failed:', await res.text());
                alert('Checkout failed. Please try again later.');
                return;
            }

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error('Test checkout error:', err);
            alert('An error occurred during test checkout.');
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setDetectedType('pdf');
        }
    };

    if (loading) return null;

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    };

    const weekDayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <DashboardLayout>
            <Head><title>Dashboard | Serify</title></Head>

            <div className="max-w-7xl mx-auto w-full px-5 md:px-10 py-10 pb-24 page-transition">

                {isDemo && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 mb-8 animate-fade-in shadow-sm">
                        <Zap size={16} fill="currentColor" />
                        <span>You&apos;re in demo mode — <strong>sign up</strong> to save your progress and unlock full features.</span>
                    </div>
                )}

                {/* ── HERO SECTION ── */}
                <div className="mb-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-display text-[var(--text)] mb-2 tracking-tight">
                                {getGreeting()}, {user?.displayName?.split(' ')[0] || 'Learner'}
                            </h1>
                            <p className="text-[var(--muted)] text-lg">
                                What did you just learn?
                            </p>
                        </div>

                        {activeCurriculum && (
                            <Link
                                href={`/learn/curriculum/${activeCurriculum.id}`}
                                className="group flex items-center gap-4 bg-[var(--surface)] border border-[var(--border)] p-1.5 pr-5 rounded-2xl hover:border-[var(--accent)]/50 transition-all shadow-sm max-w-[340px]"
                            >
                                <div className="w-12 h-12 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-lg shadow-[var(--accent)]/20 group-hover:scale-105 transition-transform">
                                    <Play size={20} fill="currentColor" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] mb-0.5">Resume Journey</p>
                                    <p className="font-bold text-sm truncate">{activeCurriculum.title}</p>
                                </div>
                            </Link>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
                        {/* Smart Input Card */}
                        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 shadow-sm flex flex-col min-h-[460px] relative overflow-hidden group">
                            {/* Processing Overlay */}
                            {isProcessing && (
                                <div className="absolute inset-0 z-50 bg-[var(--surface)]/95 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
                                    <div className="w-16 h-16 rounded-full border-[3px] border-[var(--border)] border-t-[var(--accent)] animate-spin mb-6" />
                                    <p className="text-2xl font-display text-[var(--text)] animate-pulse mb-2">{loadingMessages[loadingMsgIdx]}</p>
                                    <p className="text-sm text-[var(--muted)]">Refining the conceptual architecture...</p>
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-lg shadow-[var(--accent)]/30">
                                        <Brain size={20} />
                                    </div>
                                    <h2 className="font-display text-xl text-[var(--text)]">Smart Input</h2>
                                </div>

                                {/* Mode Toggle */}
                                <div className="flex bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)] shadow-inner">
                                    <button
                                        onClick={() => setMode('analyze')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${mode === 'analyze' ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm border border-[var(--border)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                                    >
                                        Analyze
                                    </button>
                                    <button
                                        onClick={() => setMode('learn')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${mode === 'learn' ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm border border-[var(--border)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                                    >
                                        Learn
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col space-y-6">
                                {/* Shortcut Chips */}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setInputValue("https://www.youtube.com/watch?v=")}
                                        className="px-4 py-2 rounded-xl border border-[var(--border)] text-[10px] font-bold uppercase tracking-widest hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 transition-all text-[var(--muted)] hover:text-[var(--accent)] flex items-center gap-2"
                                    >
                                        <Youtube size={14} /> YouTube Link
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`px-4 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${pdfFile ? 'border-purple-200 bg-purple-50 text-purple-700' : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 hover:text-[var(--accent)]'}`}
                                    >
                                        <FileUp size={14} /> {pdfFile ? 'PDF Selected' : 'Upload PDF'}
                                    </button>
                                    <button
                                        onClick={() => setInputValue("Explain this concept: ")}
                                        className="px-4 py-2 rounded-xl border border-[var(--border)] text-[10px] font-bold uppercase tracking-widest hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 transition-all text-[var(--muted)] hover:text-[var(--accent)] flex items-center gap-2"
                                    >
                                        <AlignLeft size={14} /> Deep Dive
                                    </button>
                                </div>

                                {/* Text Area / Input */}
                                <div className="relative flex-1 flex flex-col">
                                    <div className="flex-1 relative bg-[var(--bg)] border border-[var(--border)] rounded-[24px] px-6 py-5 transition-all focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_1px_var(--accent)] ring-[var(--accent)]/5 focus-within:ring-4 flex flex-col group/input">
                                        {detectedType && (
                                            <div className={`absolute top-5 right-6 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border ${DETECTION_LABELS[detectedType].color} animate-in fade-in zoom-in-95`}>
                                                Detected: {DETECTION_LABELS[detectedType].label}
                                            </div>
                                        )}

                                        <textarea
                                            value={inputValue}
                                            onChange={e => setInputValue(e.target.value)}
                                            placeholder={pdfFile ? "PDF selected. Add context or click Analyze..." : "Paste a YouTube link, PDF text, or describe a concept to analyze..."}
                                            className="w-full h-full bg-transparent outline-none resize-none text-[var(--text)] placeholder-[var(--muted)] text-lg leading-relaxed pt-1"
                                        />

                                        {pdfFile && (
                                            <div className="mt-4 flex items-center justify-between bg-purple-50 border border-purple-100 text-purple-700 px-4 py-3 rounded-2xl animate-in slide-in-from-bottom-2">
                                                <div className="flex items-center gap-3 text-sm truncate">
                                                    <FileUp size={16} />
                                                    <span className="truncate font-medium">{pdfFile.name}</span>
                                                </div>
                                                <button onClick={clearInput} className="text-purple-400 hover:text-purple-600 p-1 transition-colors">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-[var(--border)]/50">
                                            <div className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 text-[var(--muted)]/70">
                                                <Zap size={11} fill="currentColor" className="text-amber-500" />
                                                Costs 2 Sparks
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {inputValue || pdfFile ? (
                                                    <button
                                                        onClick={clearInput}
                                                        className="text-[11px] font-bold tracking-widest uppercase text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                                                    >
                                                        Clear
                                                    </button>
                                                ) : null}
                                                <button
                                                    onClick={handleAnalyze}
                                                    disabled={(!inputValue.trim() && !pdfFile) || isProcessing}
                                                    className="px-10 py-3.5 rounded-xl bg-[var(--text)] text-[var(--surface)] disabled:opacity-30 disabled:grayscale font-bold text-xs uppercase tracking-[0.1em] hover:bg-black transition-all shadow-xl shadow-black/10 active:scale-[0.98] flex items-center gap-2"
                                                >
                                                    {mode === 'analyze' ? 'Analyze' : 'Start Path'}
                                                    <ArrowRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileInputChange} />
                                </div>
                            </div>

                            {/* Error */}
                            {errorMsg && (
                                <div className="mt-4 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-medium flex items-start gap-3 animate-shake">
                                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}
                        </section>

                        {/* Sidebar Stats Area */}
                        <div className="space-y-6">
                            {/* Spark Balance Card */}
                            <div className="premium-card p-8 rounded-3xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-600 flex items-center gap-1.5">
                                        <Zap size={12} fill="currentColor" /> Spark Balance
                                    </h3>
                                    <Link href="/sparks" className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
                                        Refill
                                    </Link>
                                </div>

                                <div className="flex items-end gap-2 mb-2">
                                    <span className="text-4xl font-display text-[var(--text)]">{balance?.total_sparks ?? '...'}</span>
                                    <span className="text-[var(--muted)] text-sm font-medium pb-1.5">available</span>
                                </div>

                                <div className="w-full h-1.5 bg-[var(--bg)] rounded-full overflow-hidden mb-6 border border-[var(--border)]">
                                    <div
                                        className="h-full bg-amber-500 transition-all duration-1000"
                                        style={{ width: `${Math.min(100, ((balance?.total_sparks ?? 0) / 50) * 100)}%` }}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-[var(--muted)]">Subscription</span>
                                        <span className="font-bold">{balance?.subscription_sparks ?? 0}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-[var(--muted)]">Top-up</span>
                                        <span className="font-bold">{balance?.topup_sparks ?? 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Focus On These Card */}
                            {focusConcepts.length > 0 && (
                                <section className="premium-card p-8 rounded-3xl">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-500 flex items-center gap-1.5">
                                            <ShieldAlert size={12} /> Focus On These
                                        </h3>
                                        <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                                    </div>
                                    <div className="space-y-5">
                                        {focusConcepts.map(concept => (
                                            <div key={concept.id} className="group">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors truncate pr-4">{concept.display_name}</h4>
                                                    <span className="text-[9px] font-black uppercase text-red-500 tracking-tighter opacity-80">Shaky</span>
                                                </div>
                                                <div className="h-1 bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border)]">
                                                    <div
                                                        className={`h-full ${getMasteryColor(concept.current_mastery)}`}
                                                        style={{ width: '30%' }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        <Link href="/vault" className="block text-center mt-6 p-3 rounded-2xl border border-[var(--border)] border-dashed text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)] transition-all">
                                            Review Concept Vault
                                        </Link>
                                    </div>
                                </section>
                            )}

                            {/* Velocity Map Card */}
                            <div className="premium-card p-8 rounded-3xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Activity Map</h3>
                                    <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Active</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-1.5 h-12">
                                    {activityDays.map((active, i) => (
                                        <div key={i} className="flex-1 flex flex-col gap-2">
                                            <div className={`w-full flex-1 rounded-md transition-all duration-700 ${active
                                                ? 'bg-[var(--accent)] shadow-[0_0_8px_rgba(var(--accent-rgb),0.2)]'
                                                : 'bg-[var(--bg)] border border-[var(--border)]'
                                                } animate-scale-in`} style={{ animationDelay: `${i * 100}ms` }} />
                                            <span className="text-[9px] font-bold text-[var(--muted)] text-center uppercase tracking-tighter opacity-70">
                                                {weekDayLabels[i]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── LOWER SECTION ── */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                        <h2 className="text-2xl font-display text-[var(--text)]">Recent Journeys</h2>
                        <Link href="/sessions" className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-1">
                            Past archives <ChevronRight size={14} />
                        </Link>
                    </div>

                    {latestSessions.length === 0 ? (
                        <div className="bg-[var(--surface)] border border-[var(--border)] border-dashed rounded-3xl p-16 text-center shadow-sm">
                            <div className="w-16 h-16 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center mx-auto mb-6 text-[var(--muted)]/50">
                                <History size={32} />
                            </div>
                            <h3 className="font-display text-xl text-[var(--text)] mb-2">Your reflection journey begins here</h3>
                            <p className="text-sm text-[var(--muted)] max-w-xs mx-auto">Analyze your first material to start tracking your knowledge graph and surfacing insights.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
                            {latestSessions.map((session, idx) => (
                                <Link
                                    key={session.id}
                                    href={session.status === 'Completed' ? `/session/${session.id}/feedback` : `/session/${session.id}`}
                                    className="group relative flex flex-col justify-between bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-7 hover:border-[var(--accent)]/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden shadow-sm"
                                >
                                    <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-lg shadow-[var(--accent)]/20 rotate-45 group-hover:rotate-0 transition-transform duration-500">
                                            <ArrowRight size={16} />
                                        </div>
                                    </div>

                                    <div className="mb-8">
                                        <div className="w-10 h-10 rounded-[14px] bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                                            {getSessionIcon(session.type)}
                                        </div>
                                        <h4 className="text-lg font-display text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-2 leading-tight mb-3">
                                            {session.title}
                                        </h4>
                                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] opacity-70">
                                            <span>{session.date}</span>
                                            <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
                                            <span>{session.type}</span>
                                        </div>
                                    </div>

                                    <div className="pt-5 border-t border-[var(--border)]/50">
                                        {session.status === 'Completed' ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 size={14} className={session.result === 'Strong' ? 'text-emerald-500' : 'text-amber-500'} />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${session.result === 'Strong' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                        {session.result === 'Strong' ? 'Mastered' : 'Developing'}
                                                    </span>
                                                </div>
                                                <div className="flex-1 max-w-[80px] h-1 rounded-full bg-[var(--border)] ml-4 overflow-hidden">
                                                    <div className={`h-full rounded-full ${session.result === 'Strong' ? 'bg-emerald-500 w-full' : 'bg-amber-400 w-2/3'}`} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">In Progress</span>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <OutOfSparksModal
                isOpen={isOutOfSparksModalOpen}
                onClose={() => setIsOutOfSparksModalOpen(false)}
                cost={2}
                featureName={mode === 'analyze' ? 'Analyze Session' : 'New Learning Path'}
            />

            {process.env.NODE_ENV === 'development' && user && (
                <div className="fixed bottom-4 right-4 z-50">
                    <button
                        onClick={handleTestSubscription}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded shadow-lg flex items-center gap-2 text-sm border-2 border-red-700"
                    >
                        <AlertTriangle size={16} />
                        Debug: Upgrade to Pro (Test)
                    </button>
                </div>
            )}
        </DashboardLayout>
    );
}
