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
    BookOpen,
    Brain,
    Play,
    ChevronRight,
    Target,
    BarChart2,
} from 'lucide-react';
import { storage, SessionSummary } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useSparks } from '@/hooks/useSparks';
import { KnowledgeNode } from '@/types/serify';

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

const DETECTION_LABELS: Record<string, { label: string; color: string; Icon: any }> = {
    youtube: { label: 'YouTube', color: 'text-red-500 bg-red-50 border-red-200', Icon: Youtube },
    article: { label: 'Article URL', color: 'text-blue-500 bg-blue-50 border-blue-200', Icon: FileText },
    text: { label: 'Text', color: 'text-green-600 bg-green-50 border-green-200', Icon: AlignLeft },
    pdf: { label: 'PDF', color: 'text-purple-500 bg-purple-50 border-purple-200', Icon: FileUp },
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
        case 'solid': return 'bg-emerald-500';
        case 'developing': return 'bg-blue-400';
        case 'shaky': return 'bg-amber-400';
        case 'revisit': return 'bg-red-400';
        default: return 'bg-gray-300';
    }
}

// ------ Main Component ------

export default function Home() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { demo } = router.query;
    const isDemo = demo === 'true';
    const { balance, loading: sparksLoading } = useSparks();

    // Smart Input
    const [inputValue, setInputValue] = useState('');
    const [detectedType, setDetectedType] = useState<DetectedType>(null);
    const [mode, setMode] = useState<'analyze' | 'learn'>('analyze');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Processing
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');

    // Dashboard data
    const [latestSessions, setLatestSessions] = useState<SessionSummary[]>([]);
    const [activeCurriculum, setActiveCurriculum] = useState<any>(null);
    const [focusConcepts, setFocusConcepts] = useState<KnowledgeNode[]>([]);
    const [activityDays, setActivityDays] = useState<boolean[]>([false, false, false, false, false, false, false]);
    const [totalSessionCount, setTotalSessionCount] = useState(0);
    const [totalConceptCount, setTotalConceptCount] = useState(0);

    const loadingMessages = [
        "Extracting content...",
        "Identifying key concepts...",
        "Building concept map...",
        "Generating your questions...",
    ];

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

    // Fetch all dashboard data
    useEffect(() => {
        const history = storage.getHistory();
        setLatestSessions(history.slice(0, 5));
        setTotalSessionCount(history.length);

        if (!user) return;

        // Active curriculum
        supabase.from('curricula')
            .select('id, title, concept_count, current_concept_index, status, last_activity_at')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('last_activity_at', { ascending: false })
            .limit(1)
            .single()
            .then(({ data }) => setActiveCurriculum(data));

        // Focus concepts: shaky or revisit
        supabase.from('knowledge_nodes')
            .select('id, display_name, canonical_name, current_mastery, session_count, synthesis')
            .eq('user_id', user.id)
            .in('current_mastery', ['shaky', 'revisit'])
            .order('session_count', { ascending: false })
            .limit(3)
            .then(({ data }) => setFocusConcepts((data as KnowledgeNode[]) || []));

        // Total concepts
        supabase.from('knowledge_nodes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .then(({ count }) => setTotalConceptCount(count || 0));

        // Activity dots: last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        supabase.from('sessions')
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

    // PDF drag and drop handlers
    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setDetectedType('pdf');
            setInputValue(file.name);
        }
    }, []);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setDetectedType('pdf');
            setInputValue(file.name);
        }
    };

    const clearInput = () => {
        setInputValue('');
        setPdfFile(null);
        setDetectedType(null);
    };

    // Analyze flow
    const handleAnalyze = async () => {
        if (!inputValue.trim() && !pdfFile) return;
        setIsProcessing(true);
        setErrorMsg('');

        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            const token = authSession?.access_token;
            const headers: Record<string, string> = {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...(!token && isDemo ? { 'x-serify-demo': 'true' } : {}),
            };

            let body: FormData | string;
            let fetchHeaders: Record<string, string> = { ...headers };

            if (pdfFile) {
                const fd = new FormData();
                fd.append('file', pdfFile);
                fd.append('contentType', 'pdf');
                body = fd;
            } else {
                fetchHeaders['Content-Type'] = 'application/json';
                body = JSON.stringify({
                    content: inputValue,
                    contentType: detectedType === 'youtube' ? 'youtube' : detectedType === 'article' ? 'article' : 'text',
                });
            }

            const conceptsRes = await fetch('/api/process-content', {
                method: 'POST',
                headers: fetchHeaders,
                body,
            });

            if (!conceptsRes.ok) {
                const errData = await conceptsRes.json();
                throw new Error(errData.message || 'Failed to extract concepts');
            }
            const { concepts, title } = await conceptsRes.json();
            if (!concepts) throw new Error('Failed to extract concepts');

            const reqRes = await fetch('/api/generate-questions', {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ concepts, method: 'standard' }),
            });
            if (!reqRes.ok) {
                const errData = await reqRes.json();
                throw new Error(errData.message || 'Failed to generate questions');
            }
            const { questions } = await reqRes.json();
            if (!questions) throw new Error('Failed to generate questions');

            const initRes = await fetch('/api/sessions/init', {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title && title !== 'New Session' ? title : (concepts.length > 0 ? concepts[0].name : 'New Session'),
                    contentType: detectedType || 'text',
                    content: inputValue,
                    difficulty: 'medium',
                }),
            });
            const initData = await initRes.json();
            if (!initRes.ok) throw new Error(initData.message || 'Failed to initialize session');

            const dbSession = initData.session;
            const sessionData = {
                id: dbSession.id,
                title: dbSession.title,
                content: inputValue,
                concepts,
                questions,
                type: detectedType === 'youtube' ? 'YouTube Video' : detectedType === 'pdf' ? 'PDF Upload' : detectedType === 'article' ? 'Article URL' : 'Notes',
                isBasicMode: balance && balance.total_sparks >= 11 && balance.total_sparks < 13,
            };

            localStorage.setItem('serify_active_session', JSON.stringify(sessionData));
            storage.saveSession({
                id: sessionData.id,
                title: sessionData.title,
                type: sessionData.type,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                status: 'In Progress',
            });

            router.push(`/session/${sessionData.id}`);
        } catch (error) {
            console.error(error);
            setErrorMsg(error instanceof Error ? error.message : 'Failed to analyze content. Please try again.');
            setIsProcessing(false);
        }
    };

    // Learn flow (curriculum)
    const handleLearn = async () => {
        if (!inputValue.trim()) return;
        router.push(`/learn?q=${encodeURIComponent(inputValue.trim())}`);
    };

    const handleAction = () => {
        if (mode === 'analyze') {
            handleAnalyze();
        } else {
            handleLearn();
        }
    };

    const canSubmit = (inputValue.trim() || !!pdfFile) && !isProcessing;
    const hasEnoughSparks = balance && balance.total_sparks >= 11;

    if (loading) return <div className="min-h-screen bg-[var(--bg)]" />;

    if (!user && !isDemo) {
        return (
            <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans">
                <Head><title>Serify | Context-Aware Learning Reflection</title></Head>
                <nav className="w-full p-6 flex justify-between items-center z-10">
                    <div className="text-2xl font-display tracking-tight">Serify</div>
                    <div className="space-x-4">
                        <Link href="/login" className="text-[var(--text)] hover:text-black font-medium">Log in</Link>
                        <Link href="/?demo=true" className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg font-medium hover:bg-black/5 transition-colors">Try Demo</Link>
                    </div>
                </nav>
                <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="max-w-3xl space-y-6">
                        <h1 className="text-6xl md:text-8xl font-display leading-none">Master Your <br />Understanding</h1>
                        <p className="text-xl text-[var(--muted)] max-w-xl mx-auto">
                            Serify moves beyond simple testing. It analyzes your conceptual depth, identifies misconceptions, and maps your knowledge gaps using context-aware AI.
                        </p>
                        <div className="pt-8 flex items-center justify-center gap-4">
                            <Link href="/signup" className="px-6 py-3 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent)]/90 transition-colors">
                                Start Reflection
                            </Link>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // current week day labels
    const weekDayLabels = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
    });

    return (
        <DashboardLayout>
            <Head><title>Dashboard | Serify</title></Head>

            <div className="max-w-[1160px] mx-auto w-full px-5 md:px-10 py-8 pb-24">

                {isDemo && (
                    <div className="bg-[var(--accent-light)] text-[var(--accent)] px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 mb-6">
                        <Zap size={16} /> You&apos;re in demo mode — sign up to save your results.
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">

                    {/* ── LEFT COLUMN ── */}
                    <div className="space-y-5">

                        {/* Smart Input Card */}
                        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                            {isProcessing ? (
                                <div className="h-44 flex flex-col items-center justify-center">
                                    <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin mb-4" />
                                    <p className="text-[var(--text)] font-medium animate-pulse">{loadingMessages[loadingMsgIdx]}</p>
                                    <p className="text-xs text-[var(--muted)] mt-1">Step {Math.min(loadingMsgIdx + 1, loadingMessages.length)} of {loadingMessages.length}</p>
                                </div>
                            ) : (
                                <>
                                    {/* Textarea / drop zone */}
                                    <div
                                        className={`relative rounded-xl border-2 transition-colors mb-3 ${isDragging ? 'border-[var(--accent)] bg-[var(--accent-light)]' : 'border-[var(--border)] bg-[var(--bg)]'}`}
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                    >
                                        <textarea
                                            value={inputValue}
                                            onChange={e => { setInputValue(e.target.value); setPdfFile(null); }}
                                            placeholder="Paste a YouTube link, article URL, or any text you just studied…   or drop a PDF here."
                                            className="w-full h-24 p-4 bg-transparent outline-none resize-none text-[var(--text)] placeholder-[var(--muted)] text-sm leading-relaxed"
                                        />
                                        {/* Detection tag */}
                                        {detectedType && (
                                            <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${DETECTION_LABELS[detectedType].color}`}>
                                                {(() => { const L = DETECTION_LABELS[detectedType]; return <L.Icon size={12} />; })()}
                                                {DETECTION_LABELS[detectedType].label}
                                            </div>
                                        )}
                                        {/* PDF overlay label */}
                                        {pdfFile && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="text-purple-600 font-medium text-sm">{pdfFile.name}</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* PDF file input (hidden) */}
                                    <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileInputChange} />

                                    {/* Error */}
                                    {errorMsg && (
                                        <div className="mb-4 bg-[var(--warn-light)] border border-[var(--warn)]/30 text-[var(--warn)] px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2">
                                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                            <span>{errorMsg}</span>
                                        </div>
                                    )}

                                    {/* Mode pills + action row */}
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-full p-1">
                                            {(['analyze', 'learn'] as const).map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => setMode(m)}
                                                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all capitalize ${mode === m ? 'bg-[var(--text)] text-[var(--surface)] shadow' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                                                >
                                                    {m}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* PDF upload button */}
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors text-sm"
                                                title="Upload PDF"
                                            >
                                                <FileUp size={15} /> PDF
                                            </button>

                                            {/* Clear */}
                                            {(inputValue || pdfFile) && (
                                                <button onClick={clearInput} className="text-[var(--muted)] hover:text-[var(--text)] text-sm px-2 py-2">✕</button>
                                            )}

                                            {/* Primary action */}
                                            <button
                                                onClick={handleAction}
                                                disabled={!canSubmit || (mode === 'analyze' && !hasEnoughSparks)}
                                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${canSubmit && (mode !== 'analyze' || hasEnoughSparks)
                                                    ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-md shadow-[var(--accent)]/20'
                                                    : 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed'
                                                    }`}
                                            >
                                                {mode === 'analyze' ? (
                                                    <>Analyze <ArrowRight size={15} /></>
                                                ) : (
                                                    <>Learn <ArrowRight size={15} /></>
                                                )}
                                                {mode === 'analyze' && canSubmit && hasEnoughSparks && (
                                                    <span className="text-[10px] opacity-75 flex items-center gap-0.5 ml-0.5">
                                                        <Zap size={9} fill="currentColor" /> {balance!.total_sparks >= 13 ? '13' : '11'}
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Low sparks notice */}
                                    {mode === 'analyze' && balance && balance.total_sparks < 11 && (
                                        <div className="mt-4 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl text-sm">
                                            <Zap size={15} fill="currentColor" />
                                            <span>You need at least 11 Sparks to analyze content.</span>
                                            <Link href="/sparks" className="ml-auto font-semibold underline underline-offset-2 shrink-0">Buy Sparks →</Link>
                                        </div>
                                    )}
                                </>
                            )}
                        </section>

                        {/* Resume Banner */}
                        {activeCurriculum && (
                            <section className="flex items-center justify-between gap-4 bg-[var(--accent)] text-white px-5 py-4 rounded-2xl shadow-lg">
                                <div className="flex items-center gap-3 min-w-0">
                                    <BookOpen size={18} className="shrink-0 opacity-80" />
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-0.5">Continue where you left off</p>
                                        <p className="font-semibold truncate">{activeCurriculum.title}</p>
                                        <p className="text-xs opacity-70 mt-0.5">
                                            {activeCurriculum.current_concept_index || 0} of {activeCurriculum.concept_count} concepts
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href={`/learn/curriculum/${activeCurriculum.id}`}
                                    className="shrink-0 bg-white text-[var(--accent)] hover:bg-white/90 px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-1.5"
                                >
                                    Resume <ChevronRight size={14} />
                                </Link>
                            </section>
                        )}

                        {/* Recent Sessions */}
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-bold text-[var(--text)]">Recent Sessions</h2>
                                <Link href="/sessions" className="text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] flex items-center gap-0.5">
                                    View all <ChevronRight size={13} />
                                </Link>
                            </div>

                            {latestSessions.length === 0 ? (
                                <div className="bg-[var(--surface)] border border-[var(--border)] border-dashed rounded-xl p-5 text-center flex items-center gap-3">
                                    <History size={20} className="text-[var(--muted)] shrink-0" />
                                    <p className="text-sm text-[var(--muted)] font-medium text-left">No sessions yet. Analyze something to get started.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {latestSessions.map(session => (
                                        <Link
                                            key={session.id}
                                            href={session.status === 'Completed' ? `/session/${session.id}/feedback` : `/session/${session.id}`}
                                            className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 hover:border-[var(--accent)]/40 hover:shadow-sm transition-all group"
                                        >
                                            {/* Icon */}
                                            <div className="w-8 h-8 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center shrink-0">
                                                {getSessionIcon(session.type)}
                                            </div>

                                            {/* Title + date */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-[var(--text)] truncate group-hover:text-[var(--accent)] transition-colors">{session.title}</p>
                                                <p className="text-xs text-[var(--muted)] mt-0.5">{session.date} · {session.type}</p>
                                            </div>

                                            {/* Mastery mini bar */}
                                            <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                                                {session.status === 'Completed' ? (
                                                    <>
                                                        <div className="flex h-1.5 w-20 rounded-full overflow-hidden bg-[var(--border)]">
                                                            {session.result === 'Strong' ? (
                                                                <div className="h-full bg-emerald-500 w-full" />
                                                            ) : (
                                                                <>
                                                                    <div className="h-full bg-emerald-500 w-1/3" />
                                                                    <div className="h-full bg-amber-400 w-1/3" />
                                                                    <div className="h-full bg-red-400 w-1/3" />
                                                                </>
                                                            )}
                                                        </div>
                                                        <span className={`text-[10px] font-bold uppercase ${session.result === 'Strong' ? 'text-emerald-600' : 'text-amber-500'}`}>
                                                            {session.result === 'Strong' ? 'Strong' : 'Gaps'}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] animate-pulse">In Progress</span>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </section>

                    </div>

                    {/* ── RIGHT COLUMN ── */}
                    <div className="space-y-5">

                        {/* Spark Balance Card */}
                        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-[var(--text)] flex items-center gap-2">
                                    <Zap size={16} className="text-amber-500" fill="currentColor" /> Sparks
                                </h3>
                                <Link href="/sparks" className="text-xs text-[var(--muted)] hover:text-[var(--accent)] font-medium transition-colors">Buy more →</Link>
                            </div>

                            {sparksLoading ? (
                                <div className="h-10 bg-[var(--border)] rounded-lg animate-pulse" />
                            ) : balance ? (
                                <>
                                    <div className="flex items-baseline gap-2 mb-3">
                                        <span className="text-3xl font-display font-bold text-[var(--text)]">{balance.total_sparks}</span>
                                        <span className="text-xs text-[var(--muted)]">available</span>
                                    </div>

                                    <div className="space-y-2">
                                        {[
                                            { type: 'Subscription', amount: balance.subscription_sparks, color: 'bg-[var(--accent)]' },
                                            { type: 'Top-up', amount: balance.topup_sparks, color: 'bg-amber-400' },
                                            { type: 'Trial', amount: balance.trial_sparks, color: 'bg-purple-400' },
                                        ].filter(p => p.amount > 0).map((pool, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${pool.color}`} />
                                                    <span className="text-[var(--muted)]">{pool.type}</span>
                                                </div>
                                                <span className="font-semibold text-[var(--text)]">{pool.amount}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-[var(--muted)]">Could not load balance.</p>
                            )}
                        </section>

                        {/* Focus On These */}
                        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-[var(--text)] flex items-center gap-2">
                                    <Target size={16} className="text-[var(--accent)]" /> Focus On These
                                </h3>
                                <Link href="/vault" className="text-xs text-[var(--muted)] hover:text-[var(--accent)] font-medium transition-colors">View vault →</Link>
                            </div>

                            {focusConcepts.length === 0 ? (
                                <div className="flex items-center gap-3 py-2">
                                    <Brain size={20} className="text-[var(--muted)] shrink-0" />
                                    <p className="text-xs text-[var(--muted)] font-medium">No shaky concepts yet. Complete sessions to build your vault.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {focusConcepts.map(concept => (
                                        <div key={concept.id} className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${getMasteryColor(concept.current_mastery)}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-[var(--text)] truncate">{concept.display_name}</p>
                                                <p className="text-[10px] text-[var(--muted)] capitalize">{concept.current_mastery} · {concept.session_count} session{concept.session_count !== 1 ? 's' : ''}</p>
                                            </div>
                                            <Link
                                                href={`/flow?concept=${encodeURIComponent(concept.canonical_name)}`}
                                                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                                            >
                                                <Play size={10} /> Practice
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Activity Dots + Stats */}
                        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                            <h3 className="font-bold text-[var(--text)] flex items-center gap-2 mb-4">
                                <BarChart2 size={16} className="text-[var(--accent)]" /> This Week
                            </h3>

                            <div className="flex items-center justify-between gap-1.5 mb-4">
                                {activityDays.map((active, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1.5">
                                        <div className={`w-7 h-7 rounded-full transition-all ${active ? 'bg-[var(--accent)] shadow-sm shadow-[var(--accent)]/40' : 'bg-[var(--border)]'}`} />
                                        <span className="text-[9px] text-[var(--muted)] font-medium">{weekDayLabels[i]}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 divide-x divide-[var(--border)] pt-3 border-t border-[var(--border)]">
                                <div className="text-center pr-3">
                                    <div className="text-2xl font-display font-bold text-[var(--text)]">{totalSessionCount}</div>
                                    <div className="text-[10px] text-[var(--muted)] font-medium uppercase tracking-wider mt-0.5">Total Sessions</div>
                                </div>
                                <div className="text-center pl-3">
                                    <div className="text-2xl font-display font-bold text-[var(--text)]">{totalConceptCount}</div>
                                    <div className="text-[10px] text-[var(--muted)] font-medium uppercase tracking-wider mt-0.5">Concepts Tracked</div>
                                </div>
                            </div>
                        </section>

                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
