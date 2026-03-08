/**
 * index.tsx
 * Purpose: Main dashboard for authenticated users to access their learning sessions, 
 * curricula, and interact with the AI Tutor.
 * Key Logic: Fetches user activity data from Supabase, manages a real-time AI chat 
 * interface using @ai-sdk/react, and handles navigation to analysis or learning flows.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { formatDistanceToNow } from 'date-fns';
import {
    Zap,
    History,
    Brain,
    Play,
    ChevronRight,
    CheckCircle2,
    Youtube,
    FileText,
    FileUp,
    AlignLeft,
    ArrowUp,
    Sparkles,
    BookOpen,
    ShieldAlert,
    CornerDownRight,
    MessageSquare,
    Plus,
    AlertTriangle,
    Network,
} from 'lucide-react';
import { storage, SessionSummary } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useSparks } from '@/hooks/useSparks';
import { KnowledgeNode } from '@/types/serify';
import LandingPage from '@/components/LandingPage';
import OutOfSparksModal from '@/components/sparks/OutOfSparksModal';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

type DetectedType = 'youtube' | 'article' | 'text' | 'pdf' | null;

interface ParsedAction {
    type: 'START_ANALYZE' | 'START_LEARN';
    payload: Record<string, string>;
}

function detectInputType(value: string): DetectedType {
    if (!value.trim()) return null;
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/i;
    if (youtubeRegex.test(value.trim())) return 'youtube';
    const urlRegex = /^https?:\/\//i;
    if (urlRegex.test(value.trim())) return 'article';
    return 'text';
}

function getMasteryColor(state: string) {
    switch (state) {
        case 'solid': return 'bg-emerald-500';
        case 'developing': return 'bg-blue-400';
        case 'shaky': return 'bg-orange-500';
        case 'revisit': return 'bg-red-500';
        default: return 'bg-gray-300';
    }
}

function getSessionIcon(type: string) {
    switch (type) {
        case 'YouTube Video': return <Youtube size={14} className="text-red-500" />;
        case 'PDF Upload': return <FileUp size={14} className="text-purple-500" />;
        case 'Article URL': return <FileText size={14} className="text-blue-500" />;
        default: return <AlignLeft size={14} className="text-emerald-600" />;
    }
}

function parseActionBlocks(text: string): ParsedAction[] {
    const regex = /\[ACTION:(START_ANALYZE|START_LEARN)\]([\s\S]*?)\[\/ACTION\]/g;
    const actions: ParsedAction[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        try {
            const payload = JSON.parse(match[2].trim());
            actions.push({ type: match[1] as ParsedAction['type'], payload });
        } catch {
        }
    }
    return actions;
}

function stripActionBlocks(text: string): string {
    return text.replace(/\[ACTION:(START_ANALYZE|START_LEARN)\][\s\S]*?\[\/ACTION\]/g, '').trim();
}

const STARTER_PROMPTS = [
    { icon: BookOpen, label: 'Learn a topic', description: 'I\'ll craft a personalized session', prompt: 'Help me learn how transformers in AI work' },
    { icon: Youtube, label: 'Analyze a video', description: 'Paste a YouTube URL', prompt: 'Analyze this YouTube video: ' },
    { icon: Sparkles, label: 'Deep dive', description: 'Go beyond surface-level understanding', prompt: 'Help me deeply understand: ' },
    { icon: FileText, label: 'Break down notes', description: 'Paste anything you\'ve been studying', prompt: 'I just read this — help me understand it: ' },
];

export default function Home() {
    const { user, loading, token } = useAuth();
    const router = useRouter();
    const { demo } = router.query;
    const isDemo = demo === 'true';
    const { balance } = useSparks();

    const [latestSessions, setLatestSessions] = useState<SessionSummary[]>([]);
    const [activeCurriculum, setActiveCurriculum] = useState<any>(null);
    const [focusConcepts, setFocusConcepts] = useState<KnowledgeNode[]>([]);
    const [vaultCount, setVaultCount] = useState<number | null>(null);
    const [activityDays, setActivityDays] = useState<boolean[]>([false, false, false, false, false, false, false]);

    const [inputValue, setInputValue] = useState('');
    const [isOutOfSparksModalOpen, setIsOutOfSparksModalOpen] = useState(false);
    const [outOfSparksError, setOutOfSparksError] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const transport = useMemo(() => {
        return new DefaultChatTransport({
            api: '/api/home-chat',
            headers: () => {
                const headers: Record<string, string> = {};
                if (token) {
                    headers.Authorization = `Bearer ${token}`;
                }
                if (isDemo) {
                    headers['x-serify-demo'] = 'true';
                }
                return headers;
            },
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const { messages, sendMessage, status, error, setMessages } = useChat({
        transport,
        onError: (err: Error) => {
            if (err.message?.includes('out_of_sparks') || err.message?.includes('403')) {
                setOutOfSparksError(true);
            }
        },
    });

    const isLoading = status === 'submitted' || status === 'streaming';

    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    useEffect(() => {
        if (!user) {
            const history = storage.getHistory();
            setLatestSessions(history.slice(0, 6));
            return;
        }

        supabase.from('reflection_sessions')
            .select('id, title, content_type, created_at, status, depth_score')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(8)
            .then(({ data, error }) => {
                if (!error && data) {
                    const mapped: SessionSummary[] = data.map(s => {
                        const dateObj = new Date(s.created_at);
                        const isRecent = (new Date().getTime() - dateObj.getTime()) < 24 * 60 * 60 * 1000;
                        return {
                            id: s.id,
                            title: s.title && s.title !== 'No Learning Material Provided' ? s.title : 'Untitled Analysis',
                            type: s.content_type === 'youtube' ? 'YouTube Video' : s.content_type === 'pdf' ? 'PDF Upload' : s.content_type === 'article' ? 'Article URL' : 'Notes',
                            date: isRecent
                                ? `${formatDistanceToNow(dateObj, { addSuffix: true })}`
                                : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                            status: s.status === 'feedback' || s.status === 'complete' ? 'Completed' : 'In Progress',
                            result: s.depth_score && s.depth_score > 70 ? 'Strong' : 'Gaps Found',
                        };
                    });
                    setLatestSessions(mapped);
                }
            });

        supabase.from('knowledge_nodes')
            .select('count', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .then(({ count }) => setVaultCount(count));

        supabase.from('curricula')
            .select('id, title, status, last_activity_at')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('last_activity_at', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(async ({ data: currData }) => {
                if (currData) {
                    const { count: total } = await supabase
                        .from('curriculum_concept_progress')
                        .select('*', { count: 'exact', head: true })
                        .eq('curriculum_id', currData.id);
                    const { count: mastered } = await supabase
                        .from('curriculum_concept_progress')
                        .select('*', { count: 'exact', head: true })
                        .eq('curriculum_id', currData.id)
                        .eq('status', 'mastered');

                    setActiveCurriculum({
                        ...currData,
                        progress: total ? Math.round(((mastered || 0) / (total || 1)) * 100) : 0
                    });
                }
            });

        supabase.from('knowledge_nodes')
            .select('id, display_name, current_mastery, session_count')
            .eq('user_id', user.id)
            .in('current_mastery', ['shaky', 'revisit'])
            .order('session_count', { ascending: false })
            .limit(3)
            .then(({ data }) => setFocusConcepts((data as any) || []));

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

    const handleSend = useCallback(() => {
        const text = inputValue.trim();
        if (!text || isLoading || (!token && !isDemo)) return;
        setOutOfSparksError(false);
        setInputValue('');
        sendMessage({ text });
    }, [inputValue, isLoading, sendMessage, token, isDemo]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleAction = useCallback(async (action: ParsedAction) => {
        if (isNavigating) return;
        setIsNavigating(true);

        if (action.type === 'START_ANALYZE') {
            const content = action.payload.content || '';
            const type = detectInputType(content);

            if (balance && balance.total_sparks < 2) {
                setIsOutOfSparksModalOpen(true);
                setIsNavigating(false);
                return;
            }

            try {
                const res = await fetch('/api/serify/extract', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        content: type === 'text' ? content : undefined,
                        url: type !== 'text' ? content : undefined,
                        contentType: type || 'text',
                        title: content.substring(0, 50) + (content.length > 50 ? '...' : '')
                    }),
                });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.message || 'Failed to process');
                }
                const { sessionId } = await res.json();
                router.push(`/session/${sessionId}`);
            } catch (err: any) {
                console.error('Action processing failed:', err);
                setIsNavigating(false);
            }
        } else if (action.type === 'START_LEARN') {
            const q = action.payload.q || '';
            const params = new URLSearchParams({ q });
            if (action.payload.priorKnowledge) params.set('priorKnowledge', action.payload.priorKnowledge);
            if (action.payload.focusGoal) params.set('focusGoal', action.payload.focusGoal);
            if (action.payload.skipTopics) params.set('skipTopics', action.payload.skipTopics);
            router.push(`/learn?${params.toString()}`);
        }
    }, [isNavigating, balance, token, router]);

    const handleTestSubscription = async () => {
        try {
            const res = await fetch('/api/subscriptions/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEST || process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
                    successUrl: `${window.location.origin}/settings?session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl: `${window.location.origin}/pricing`,
                }),
            });
            const { url } = await res.json();
            if (url) window.location.href = url;
        } catch (error) {
        }
    };

    if (loading) return null;
    if (!user && !isDemo) return <LandingPage />;

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const weekDayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const sparkPct = Math.min(100, ((balance?.total_sparks ?? 0) / 50) * 100);
    const hasMessages = messages.length > 0;

    return (
        <DashboardLayout>
            <Head><title>Dashboard | Serify</title></Head>

            <div className="max-w-[1400px] mx-auto w-full px-6 md:px-10 py-10 pb-28 md:pb-16 page-transition">

                {isDemo && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 mb-6 shadow-sm">
                        <Zap size={15} fill="currentColor" />
                        <span>You&apos;re in demo mode — <strong>sign up</strong> to save progress and unlock full features.</span>
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display text-[var(--text)] tracking-tight">
                            {getGreeting()}, {user?.displayName?.split(' ')[0] || 'Learner'} 👋
                        </h1>
                        <p className="text-[var(--muted)] text-sm mt-0.5">Your AI tutor is ready. What are you working on?</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 flex-wrap">
                        <Link href="/sparks" className="flex items-center gap-2 px-3.5 py-2 hover:bg-amber-50 rounded-xl transition-all group">
                            <Zap size={14} className="text-amber-500" fill="currentColor" />
                            <span className="text-base font-bold text-amber-700">{balance?.total_sparks ?? '...'}</span>
                            <span className="text-xs text-amber-500 font-medium tracking-tight">sparks</span>
                        </Link>

                        {activeCurriculum && (
                            <Link
                                href={`/learn/curriculum/${activeCurriculum.id}`}
                                className="group flex items-center gap-2 px-3.5 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)]/30 hover:shadow-md transition-all shadow-sm relative overflow-hidden"
                            >
                                <div className="absolute bottom-0 left-0 h-0.5 bg-[var(--accent)]/20 transition-all duration-1000" style={{ width: `${activeCurriculum.progress}%` }} />
                                <div className="w-6 h-6 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
                                    <Play size={12} fill="currentColor" />
                                </div>
                                <div className="flex flex-col min-w-0 pr-1">
                                    <span className="text-xs font-bold truncate max-w-[140px] leading-tight">{activeCurriculum.title}</span>
                                    <span className="text-[9px] text-[var(--muted)] font-bold uppercase tracking-widest">{activeCurriculum.progress}% complete</span>
                                </div>
                            </Link>
                        )}

                        {latestSessions.length > 0 && latestSessions[0].status !== 'Completed' && (
                            <Link
                                href={`/session/${latestSessions[0].id}`}
                                className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent)]/90 hover:-translate-y-0.5 transition-all shadow-lg shadow-[var(--accent)]/20 active:translate-y-0"
                            >
                                <Play size={12} fill="currentColor" />
                                <span className="text-xs font-bold">Continue Analysis</span>
                            </Link>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-10">

                    <div className="flex flex-col gap-12">

                        <section
                            className="relative bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-sm flex flex-col"
                            style={{ minHeight: '560px', maxHeight: '720px' }}
                        >


                            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4 scroll-smooth">

                                {!hasMessages && (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-6">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-emerald-600 text-white flex items-center justify-center mb-4 shadow-xl shadow-[var(--accent)]/20">
                                            <Brain size={34} />
                                        </div>
                                        <h3 className="font-display text-lg text-[var(--text)] mb-1.5">Ask me anything</h3>
                                        <p className="text-sm text-[var(--muted)] max-w-xs leading-relaxed mb-6">
                                            Tell me what you want to learn, or paste something you&apos;ve been studying. I&apos;ll guide you from there.
                                        </p>

                                        <div className="grid grid-cols-2 gap-3 w-full max-w-lg px-2">
                                            {STARTER_PROMPTS.map((sp, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        setInputValue(sp.prompt);
                                                        setTimeout(() => inputRef.current?.focus(), 50);
                                                    }}
                                                    className="group flex flex-col gap-2 p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)]/40 hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
                                                >
                                                    <div className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0 group-hover:bg-[var(--accent)] group-hover:border-[var(--accent)] transition-all">
                                                        <sp.icon size={16} className="text-[var(--muted)] group-hover:text-white transition-colors" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]/80 group-hover:text-[var(--accent)] transition-colors">{sp.label}</p>
                                                        <p className="text-[11px] text-[var(--muted)]/60 mt-0.5 leading-snug">{sp.description}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {messages.map((msg, idx) => {
                                    const isUser = msg.role === 'user';
                                    const textContent = (msg.parts ?? [])
                                        .filter((p: any) => p.type === 'text')
                                        .map((p: any) => p.text)
                                        .join('');
                                    const displayText = isUser ? textContent : stripActionBlocks(textContent);
                                    const actions = isUser ? [] : parseActionBlocks(textContent);

                                    return (
                                        <div
                                            key={msg.id ?? idx}
                                            className={`flex gap-3 chat-bubble-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                                        >
                                            {!isUser && (
                                                <div className="w-8 h-8 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-[var(--accent)]/20">
                                                    <Brain size={14} />
                                                </div>
                                            )}

                                            <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                                                {displayText && (
                                                    <div
                                                        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${isUser
                                                            ? 'bg-[var(--accent)] text-white rounded-br-sm shadow-md shadow-[var(--accent)]/20'
                                                            : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-bl-sm'
                                                            }`}
                                                    >
                                                        {displayText}
                                                    </div>
                                                )}

                                                {actions.map((action, ai) => (
                                                    <button
                                                        key={ai}
                                                        onClick={() => handleAction(action)}
                                                        disabled={isNavigating}
                                                        className="group flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[var(--accent)] text-white text-xs font-bold shadow-lg shadow-[var(--accent)]/25 hover:bg-[var(--accent)]/90 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[var(--accent)]/30 active:translate-y-0 transition-all disabled:opacity-60"
                                                    >
                                                        <CornerDownRight size={14} />
                                                        {action.type === 'START_ANALYZE'
                                                            ? `Analyze: "${(action.payload.content || '').slice(0, 36)}${(action.payload.content || '').length > 36 ? '…' : ''}"`
                                                            : `▶ Start Learning: ${action.payload.q || 'this topic'}`
                                                        }
                                                    </button>
                                                ))}
                                            </div>

                                            {isUser && (
                                                <div className="w-8 h-8 rounded-xl bg-[var(--border)] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-[var(--muted)]">
                                                    {user?.displayName?.charAt(0) || 'U'}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {isLoading && (
                                    <div className="flex gap-3 chat-bubble-in">
                                        <div className="w-8 h-8 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-md shadow-[var(--accent)]/20">
                                            <Brain size={14} />
                                        </div>
                                        <div className="px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)]/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)]/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)]/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}

                                {(outOfSparksError || (error && !outOfSparksError)) && (
                                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 chat-bubble-in">
                                        <Zap size={16} className="text-amber-500 shrink-0 mt-0.5" fill="currentColor" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-amber-800">
                                                {outOfSparksError ? "You're out of Sparks" : "Something went wrong"}
                                            </p>
                                            <p className="text-xs text-amber-600 mt-0.5">
                                                {outOfSparksError
                                                    ? 'Sparks power every AI interaction.'
                                                    : (error?.message?.startsWith('{')
                                                        ? (JSON.parse(error.message).error || JSON.parse(error.message).message || "An unexpected error occurred")
                                                        : (error?.message || "An unexpected error occurred"))
                                                }
                                            </p>
                                        </div>
                                        {outOfSparksError && (
                                            <button
                                                onClick={() => { setIsOutOfSparksModalOpen(true); setOutOfSparksError(false); }}
                                                className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-colors shrink-0"
                                            >
                                                Refill
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="px-4 pb-4 pt-3 border-t border-[var(--border)]/50 shrink-0 bg-[var(--surface)]">
                                <div className="relative flex items-end gap-3 bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-4 py-2 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_1px_var(--accent)] focus-within:ring-4 focus-within:ring-[var(--accent)]/5 transition-all">
                                    <textarea
                                        ref={inputRef}
                                        value={inputValue}
                                        onChange={e => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="What would you like to learn?"
                                        rows={1}
                                        className="flex-1 bg-transparent outline-none resize-none text-[var(--text)] placeholder-[var(--muted)] text-sm leading-relaxed max-h-32"
                                        style={{ overflowY: 'auto' }}
                                        disabled={isLoading}
                                    />
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                                            <Zap size={11} className="text-amber-500" fill="currentColor" />
                                            1 spark
                                        </div>
                                        <button
                                            onClick={handleSend}
                                            disabled={!inputValue.trim() || isLoading}
                                            className="w-8 h-8 rounded-xl bg-[var(--text)] text-[var(--surface)] disabled:opacity-30 flex items-center justify-center hover:bg-black transition-all active:scale-95 shadow-lg shadow-black/10"
                                        >
                                            <ArrowUp size={16} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-[var(--muted)]/50 text-center mt-2 font-medium">
                                    Ask anything, paste a link, or upload notes ·{' '}
                                    <kbd className="px-1 py-0.5 bg-[var(--border)] rounded text-[9px] font-bold">Enter</kbd> to send
                                </p>
                            </div>
                        </section>

                        {latestSessions.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-display text-[var(--text)]">Recent Sessions</h2>
                                    <Link href="/sessions" className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-1">
                                        View all <ChevronRight size={13} />
                                    </Link>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4 stagger-children">
                                    {latestSessions.map((session) => (
                                        <Link
                                            key={session.id}
                                            href={session.status === 'Completed' ? `/session/${session.id}/feedback` : `/session/${session.id}`}
                                            className="group flex flex-col justify-between bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--accent)]/30 hover:shadow-lg transition-all duration-200"
                                        >
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="w-9 h-9 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                    {getSessionIcon(session.type)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-1 leading-snug">
                                                        {session.title}
                                                    </h4>
                                                    <p className="text-xs text-[var(--muted)] mt-0.5 font-medium tracking-tight">{session.date}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2.5 border-t border-[var(--border)]/30">
                                                {session.status === 'Completed' ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <CheckCircle2 size={12} className={session.result === 'Strong' ? 'text-emerald-500' : 'text-amber-500'} />
                                                        <span className={`text-xs font-bold tracking-tight ${session.result === 'Strong' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                            {session.result === 'Strong' ? 'Mastered' : 'Gaps Found'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                        <span className="text-xs font-bold tracking-tight text-blue-600">Active Session</span>
                                                    </div>
                                                )}
                                                <ChevronRight size={12} className="text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {latestSessions.length === 0 && hasMessages && (
                            <div className="bg-[var(--surface)] border border-[var(--border)] border-dashed rounded-2xl p-10 text-center">
                                <div className="w-12 h-12 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4 text-[var(--muted)]/50">
                                    <History size={22} />
                                </div>
                                <h3 className="font-display text-base text-[var(--text)] mb-1">No sessions yet</h3>
                                <p className="text-sm text-[var(--muted)]">Use the chat above to start your first session.</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        {focusConcepts.length > 0 && (
                            <section className="premium-card rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 flex items-center gap-1.5">
                                        <ShieldAlert size={12} /> Needs Attention
                                    </h3>
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                </div>
                                <div className="space-y-5">
                                    {focusConcepts.map(concept => (
                                        <div key={concept.id} className="group cursor-pointer">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${concept.current_mastery === 'revisit' ? 'bg-red-500' : 'bg-orange-500'}`} />
                                                    <span className="text-xs font-bold text-[var(--text)] truncate">{concept.display_name}</span>
                                                </div>
                                                <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-tight shrink-0 px-1.5 py-0.5 rounded-md ${concept.current_mastery === 'revisit' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                                                    <AlertTriangle size={10} />
                                                    {concept.current_mastery === 'shaky' ? 'Shaky' : 'Revisit'}
                                                </div>
                                            </div>
                                            <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border)] shadow-inner">
                                                <div
                                                    className={`h-full ${getMasteryColor(concept.current_mastery)} rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] transition-all duration-500`}
                                                    style={{ width: concept.current_mastery === 'revisit' ? '15%' : '35%' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Link
                                    href="/vault"
                                    className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--accent)] border border-dashed border-[var(--border)] hover:border-[var(--accent)]/40 rounded-xl py-3 transition-all"
                                >
                                    Concept Vault <ChevronRight size={12} />
                                </Link>
                            </section>
                        )}

                        <div className="premium-card rounded-2xl p-5">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-4">Tools & Launch</h3>
                            <div className="space-y-1">
                                {[
                                    { href: '/knowledge-map', icon: <Network size={14} />, label: 'Knowledge Map', sub: 'viz', color: 'bg-indigo-50 text-indigo-500' },
                                    { href: '/vault', icon: <BookOpen size={14} />, label: 'Concept Vault', sub: vaultCount !== null ? `${vaultCount} items` : 'free', color: 'bg-emerald-50 text-emerald-500' },
                                    { href: '/sessions', icon: <History size={14} />, label: 'All Sessions', sub: 'history', color: 'bg-blue-50 text-blue-500' },
                                ].map(item => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="group flex items-center justify-between px-3 py-3 rounded-xl hover:bg-[var(--bg)] transition-all border border-transparent hover:border-[var(--border)] active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>{item.icon}</div>
                                            <span className="text-xs font-bold text-[var(--text)]">{item.label}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-[var(--muted)] font-medium">{item.sub}</span>
                                            <ChevronRight size={13} className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            {process.env.NODE_ENV === 'development' && (
                                <button
                                    onClick={handleTestSubscription}
                                    className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-3 border border-dashed border-purple-200 rounded-xl text-xs font-bold uppercase tracking-widest text-purple-400 hover:text-purple-600 hover:border-purple-400 transition-all active:scale-[0.98]"
                                >
                                    <Zap size={10} fill="currentColor" /> Developer: Test Checkout
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <OutOfSparksModal
                isOpen={isOutOfSparksModalOpen}
                onClose={() => setIsOutOfSparksModalOpen(false)}
                cost={1}
                featureName="AI Tutor Chat"
            />
        </DashboardLayout>
    );
}
