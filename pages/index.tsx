/**
 * index.tsx
 * Purpose: Main dashboard for authenticated users to access their learning sessions, 
 * curricula, and interact with the AI Tutor.
 * Key Logic: Fetches user activity data from Supabase, manages a real-time AI chat 
 * interface using @ai-sdk/react, and handles navigation to analysis or learning flows.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DefaultChatTransport } from 'ai';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import SEO from '@/components/Layout/SEO';
import { formatDistanceToNow } from 'date-fns';
import { useUsage } from '@/hooks/useUsage';
import { UsageGate } from '@/components/billing/UsageEnforcement';
import { UsageCheckResult } from '@/lib/usage';
import { trackEvent } from '@/lib/analytics';
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
    Activity,
} from 'lucide-react';
import { storage, SessionSummary } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { KnowledgeNode } from '@/types/serify';
import LandingPage from '@/components/LandingPage';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useChat } from '@ai-sdk/react';
import StudyLab from '@/components/dashboard/StudyLab';

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
    const { usage, refresh: refreshUsage } = useUsage('ai_message_tier1');

    const [latestSessions, setLatestSessions] = useState<SessionSummary[]>([]);
    const [activeCurriculum, setActiveCurriculum] = useState<{
        id: string;
        title: string;
        status: string;
        progress: number;
        last_activity_at?: string;
    } | null>(null);
    const [focusConcepts, setFocusConcepts] = useState<KnowledgeNode[]>([]);
    const [vaultCount, setVaultCount] = useState<number | null>(null);
    const [activityDays, setActivityDays] = useState<boolean[]>([false, false, false, false, false, false, false]);

    const [isGateOpen, setIsGateOpen] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    useEffect(() => {
        if (!user) {
            const history = storage.getHistory();
            setLatestSessions(history.slice(0, 6));
            return;
        }

        // Fetch both reflection and flow sessions
        const fetchSessions = async () => {
            try {
                const [reflectionRes, flowRes] = await Promise.all([
                    supabase.from('reflection_sessions')
                        .select('id, title, content_type, created_at, status, depth_score')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(8),
                    supabase.from('flow_mode_session')
                        .select('id, created_at, status, last_activity_at')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(8)
                ]);

                let allSessions: SessionSummary[] = [];

                if (reflectionRes.data) {
                    allSessions = [...allSessions, ...reflectionRes.data.map(s => {
                        const dateObj = new Date(s.created_at);
                        const isRecent = (new Date().getTime() - dateObj.getTime()) < 24 * 60 * 60 * 1000;
                        return {
                            id: s.id,
                            title: s.title && s.title !== 'No Learning Material Provided' ? s.title : 'Untitled Analysis',
                            type: s.content_type === 'youtube' ? 'YouTube Video' : s.content_type === 'pdf' ? 'PDF Upload' : s.content_type === 'article' ? 'Article URL' : 'Notes',
                            date: isRecent
                                ? `${formatDistanceToNow(dateObj, { addSuffix: true })}`
                                : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                            status: (s.status === 'feedback' || s.status === 'complete')
                                ? 'Completed'
                                : (s.status === 'questions' || s.status === 'assessment')
                                    ? 'Practicing'
                                    : (isRecent && (new Date().getTime() - dateObj.getTime()) > 60 * 60 * 1000)
                                        ? 'In Progress'
                                        : 'Analyzing' as SessionSummary['status'],
                            result: (s.depth_score && s.depth_score > 70 ? 'Strong' : 'Gaps Found') as SessionSummary['result'],
                            last_activity: s.created_at
                        };
                    })];
                }

                if (flowRes.data) {
                    allSessions = [...allSessions, ...(flowRes.data as any[]).map(s => {
                        const dateObj = new Date(s.created_at);
                        const isRecent = (new Date().getTime() - dateObj.getTime()) < 24 * 60 * 60 * 1000;
                        return {
                            id: s.id,
                            title: 'Learning Flow',
                            type: 'Flow',
                            date: isRecent
                                ? `${formatDistanceToNow(dateObj, { addSuffix: true })}`
                                : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                            status: (s.status === 'completed' ? 'Completed' : 'In Progress') as SessionSummary['status'],
                            result: 'Ongoing' as SessionSummary['result'],
                            last_activity: s.last_activity_at || s.created_at
                        };
                    })];
                }

                // Sort by last activity and limit
                allSessions.sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());
                setLatestSessions(allSessions.slice(0, 8));
            } catch (err) {
                console.error('Failed to fetch sessions:', err);
            }
        };

        fetchSessions();

        supabase.from('knowledge_nodes')
            .select('id, display_name, current_mastery, session_count')
            .eq('user_id', user.id)
            .in('current_mastery', ['shaky', 'revisit'])
            .order('session_count', { ascending: false })
            .limit(3)
            .then(({ data }) => setFocusConcepts((data as any) || []));

        supabase.from('knowledge_nodes')
            .select('count', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .then(({ count }) => setVaultCount(count));

        supabase.from('learn_mode_curriculum')
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
                    return (data || []).some((s: { created_at: string }) => s.created_at?.slice(0, 10) === dateStr);
                });
                setActivityDays(dots);
            });
    }, [user]);

    const handleAction = useCallback(async (action: ParsedAction) => {
        if (isNavigating) return;
        setIsNavigating(true);

        if (action.type === 'START_ANALYZE') {
            const content = action.payload.content || '';
            const type = detectInputType(content);

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
            } catch (err: unknown) {
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
    }, [isNavigating, router, token]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Brain className="animate-pulse text-[var(--accent)]" size={48} />
                    <div className="flex flex-col items-center gap-1">
                        <p className="text-sm font-bold tracking-widest text-[var(--muted)] uppercase text-center">Serify</p>
                        <p className="text-xs text-[var(--muted)]/60">Loading your knowledge map...</p>
                    </div>
                </div>
            </div>
        );
    }
    if (!user && !isDemo) return <LandingPage />;

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const weekDayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <DashboardLayout>
            <SEO title="Dashboard"
                description="Your personal learning dashboard. Track your progress, review past sessions, and start new learning paths."
            />
            <div className="w-full h-[calc(100dvh-64px)] md:h-screen md:max-h-screen page-transition flex flex-col overflow-hidden">

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] flex-1 min-h-0 bg-[var(--surface)]">

                    <div className="flex flex-col min-h-0">
                        <DashboardChat
                            token={token}
                            isDemo={isDemo}
                            usage={usage}
                            refreshUsage={refreshUsage}
                            handleAction={handleAction}
                            isNavigating={isNavigating}
                            displayName={user?.displayName || 'Learner'}
                            headerContent={
                                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                                    <div>
                                        <h1 className="text-2xl md:text-3xl font-display text-[var(--text)] tracking-tight flex items-center gap-2">
                                            {getGreeting()}, <span className="text-[var(--accent)] font-display">{user?.displayName?.split(' ')[0] || 'Learner'}</span> 👋
                                        </h1>
                                        <p className="text-[var(--muted)] text-sm mt-1">Your AI tutor is ready. What are you working on?</p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 flex-nowrap overflow-x-auto no-scrollbar bg-[var(--bg)] border border-[var(--border)] p-2 rounded-2xl shadow-sm max-w-full">
                                        {user && user.percentUsed >= 70 && (
                                            <Link href="/settings/billing" className={`flex items-center gap-3 px-3 py-1.5 hover:bg-[var(--surface)] rounded-xl transition-all group shrink-0 relative overflow-hidden ${user.percentUsed >= 90 ? 'bg-rose-500/5' : 'bg-[var(--surface)]/50'}`}>
                                                <div className="flex flex-col">
                                                    <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors leading-none mb-1 ${user.percentUsed >= 90 ? 'text-rose-600' : 'text-[var(--muted)] group-hover:text-[var(--accent)]'}`}>Usage {Math.round(user.percentUsed)}%</span>
                                                    <span className="text-[11px] font-black text-[var(--text)] whitespace-nowrap leading-none flex items-center gap-1.5">
                                                        {user.tokensUsed} <span className="text-[var(--muted)] font-bold">/ {user.monthlyLimit ?? '∞'}</span>
                                                    </span>
                                                </div>
                                                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${user.percentUsed >= 90 ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 animate-pulse' : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:border-[var(--accent)]/30'}`}>
                                                    <Zap size={14} />
                                                </div>
                                            </Link>
                                        )}

                                        <div className="w-px h-4 bg-[var(--border)] mx-1" />

                                        {activeCurriculum && (
                                            <Link
                                                href={`/learn/curriculum/${activeCurriculum.id}`}
                                                className="group flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--surface)] rounded-xl transition-all shrink-0 max-w-[200px]"
                                            >
                                                <div className="w-5 h-5 rounded-md bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-sm">
                                                    <Play size={10} fill="currentColor" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[10px] font-bold truncate leading-tight">{activeCurriculum.title}</span>
                                                    <span className="text-[8px] text-[var(--accent)] font-bold uppercase tracking-wider">{activeCurriculum.progress}%</span>
                                                </div>
                                            </Link>
                                        )}

                                        {latestSessions.length > 0 && latestSessions[0].status !== 'Completed' && (
                                            <>
                                                <div className="w-px h-4 bg-[var(--border)] mx-1" />
                                                <Link
                                                    href={`/session/${latestSessions[0].id}`}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent)]/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-[var(--accent)]/20 shrink-0"
                                                >
                                                    <Sparkles size={11} fill="currentColor" />
                                                    <span className="text-[10px] font-bold">Resume</span>
                                                </Link>
                                            </>
                                        )}
                                    </div>
                                </div>
                            }
                        />

                    </div>
                    <div className="flex flex-col min-h-0 bg-[var(--surface)] border-t lg:border-t-0 lg:border-l border-[var(--border)] overflow-y-auto">
                        {focusConcepts.length > 0 && (
                            <section className="p-5 border-b border-[var(--border)] hover:bg-[var(--bg)]/50 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-500 flex items-center gap-1.5">
                                        <ShieldAlert size={12} /> Needs Attention
                                    </h3>
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                </div>
                                <div className="space-y-4">
                                    {focusConcepts.map(concept => (
                                        <div key={concept.id} className="group cursor-pointer">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-xs font-bold text-[var(--text)] truncate hover:text-[var(--accent)] transition-colors">{concept.display_name}</span>
                                                </div>
                                                <div className={`flex items-center gap-0.5 text-[9px] font-black uppercase tracking-tight shrink-0 px-1.5 py-0.5 rounded ${concept.current_mastery === 'revisit' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                                                    <AlertTriangle size={10} />
                                                    {concept.current_mastery}
                                                </div>
                                            </div>
                                            <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden shadow-inner">
                                                <div
                                                    className={`h-full ${getMasteryColor(concept.current_mastery)} rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] transition-all duration-500`}
                                                    style={{ width: concept.current_mastery === 'revisit' ? '15%' : '35%' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => handleAction({ type: 'START_LEARN', payload: { q: focusConcepts.map(c => c.display_name).join(', ') } })}
                                    className="w-full mt-5 flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-all shadow-md shadow-red-500/10"
                                >
                                    <Play size={12} fill="currentColor" /> Start Review
                                </button>
                                <Link
                                    href="/vault"
                                    className="mt-3 w-full flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--accent)] transition-all"
                                >
                                    Open Concept Vault <ChevronRight size={12} />
                                </Link>
                            </section>
                        )}

                        {latestSessions.length > 0 && (
                            <div className="flex flex-col border-b border-[var(--border)] bg-[var(--surface)]">
                                <div className="flex items-center justify-between p-4 px-5 border-b border-[var(--border)]/40 bg-[var(--bg)]/30">
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Recent Sessions</h3>
                                    <Link href="/session_standard" className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--accent)] transition-colors flex items-center">
                                        View all <ChevronRight size={11} />
                                    </Link>
                                </div>
                                <div className="flex flex-col">
                                    {latestSessions.slice(0, 4).map((session, i) => (
                                        <Link
                                            key={session.id}
                                            href={session.status === 'Completed' ? `/session/${session.id}/feedback` : `/session/${session.id}`}
                                            className={`group flex flex-col px-5 py-3.5 transition-all ${i !== Math.min(latestSessions.length, 4) - 1 ? 'border-b border-[var(--border)]/40' : ''} hover:bg-[var(--bg)]`}
                                        >
                                            <div className="flex items-start gap-3 mb-2">
                                                <div className="w-6 h-6 rounded border border-[var(--border)] flex items-center justify-center shrink-0 bg-[var(--surface)] shadow-sm group-hover:border-[var(--accent)]/30 transition-colors">
                                                    {getSessionIcon(session.type)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-[11px] font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors truncate">
                                                        {session.title}
                                                    </h4>
                                                    <p className="text-[9px] text-[var(--muted)] mt-0.5 font-medium tracking-tight uppercase">{session.date}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-1 pl-9">
                                                {session.status === 'Completed' ? (
                                                    <div className="flex items-center gap-1">
                                                        <CheckCircle2 size={10} className={session.result === 'Strong' ? 'text-emerald-500' : 'text-amber-500'} />
                                                        <span className={`text-[9px] font-black uppercase tracking-wider ${session.result === 'Strong' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                            {session.result === 'Strong' ? 'Mastered' : 'Gaps'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${session.status === 'Practicing' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                                                        <span className={`text-[9px] font-black uppercase tracking-wider ${session.status === 'Practicing' ? 'text-blue-600' : 'text-amber-600'}`}>
                                                            {session.status}
                                                        </span>
                                                    </div>
                                                )}
                                                <ChevronRight size={11} className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col border-b border-[var(--border)]">
                            <div className="p-4 px-5 border-b border-[var(--border)]/40 bg-[var(--bg)]/30">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Tools & Launch</h3>
                            </div>
                            <div className="flex flex-col">
                                {[
                                    { href: '/knowledge-map', icon: <Network size={14} />, label: 'Knowledge Map', sub: 'viz', color: 'bg-indigo-50 text-indigo-500', hover: 'hover:bg-indigo-50 hover:border-indigo-100' },
                                    { href: '/vault', icon: <BookOpen size={14} />, label: 'Concept Vault', sub: vaultCount !== null ? `${vaultCount} items` : 'free', color: 'bg-emerald-50 text-emerald-500', hover: 'hover:bg-emerald-50 hover:border-emerald-100' },
                                    { href: '/sessions', icon: <History size={14} />, label: 'All Sessions', sub: 'history', color: 'bg-blue-50 text-blue-500', hover: 'hover:bg-blue-50 hover:border-blue-100' },
                                ].map((item, i) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`group flex items-center justify-between px-5 py-3.5 transition-all ${i !== 2 ? 'border-b border-[var(--border)]/40' : ''} hover:bg-[var(--bg)]`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>{item.icon}</div>
                                            <span className="text-xs font-bold text-[var(--text)]">{item.label}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[9px] font-black text-[var(--muted)]/80 uppercase tracking-widest px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)]">{item.sub}</span>
                                            <ChevronRight size={13} className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="p-5 relative overflow-hidden group flex-1 flex flex-col justify-center border-b border-[var(--border)] lg:border-b-0 min-h-[160px] bg-gradient-to-b from-[var(--surface)] to-[var(--bg)]/50">
                            <h3 className="text-sm font-bold text-[var(--text)] mb-2 flex items-center gap-2">
                                <Sparkles size={14} className="text-[var(--accent)]" /> Build a Roadmap
                            </h3>
                            <p className="text-[var(--muted)] text-[11px] mb-4 leading-relaxed font-medium">
                                Give the AI your goal and it will generate a structured multi-session curriculum.
                            </p>
                            <button
                                onClick={() => {
                                    const el = document.querySelector('textarea');
                                    if (el) {
                                        el.focus();
                                        el.value = "Help me build a learning roadmap for ";
                                    }
                                }}
                                className="mt-auto w-full py-2.5 bg-white border border-[var(--border)] text-[var(--text)] rounded-xl text-xs font-bold shadow-sm hover:border-[var(--accent)]/50 hover:text-[var(--accent)] transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={14} /> Create Roadmap
                            </button>
                        </div>

                        <div className="p-4 px-5 flex items-center gap-4 hover:bg-[var(--bg)] transition-colors border-t border-[var(--border)] bg-[var(--surface)] shrink-0">
                            <div className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shadow-sm shrink-0">
                                <Activity size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-[11px] font-bold text-[var(--text)] mb-1 uppercase tracking-widest">Activity Streak</h4>
                                <div className="flex gap-1">
                                    {activityDays.map((active, i) => (
                                        <div
                                            key={i}
                                            className={`w-2 h-2 rounded-full border transition-colors ${active ? 'bg-[var(--accent)] border-[var(--accent)] shadow-[0_0_8px_rgba(var(--accent-rgb),0.3)]' : 'bg-[var(--bg)] border-[var(--border)]'}`}
                                            title={weekDayLabels[i]}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {isGateOpen && (
                <UsageGate
                    feature="ai_message_tier1"
                    onClose={() => setIsGateOpen(false)}
                />
            )}
        </DashboardLayout>
    );
}

interface DashboardChatProps {
    token: string | null;
    isDemo: boolean;
    usage?: UsageCheckResult | null;
    refreshUsage: () => void;
    handleAction: (action: ParsedAction) => void;
    isNavigating: boolean;
    displayName: string;
    headerContent?: React.ReactNode;
}

function DashboardChat({ token, isDemo, usage, refreshUsage, handleAction, isNavigating, displayName, headerContent }: DashboardChatProps) {
    const router = useRouter();
    const [input, setInput] = useState('');

    const handleToolSelect = (toolId: string) => {
        let text = '';
        switch (toolId) {
            case 'flashcard_generation':
                text = "I want to generate flashcards for: ";
                break;
            case 'practice-test':
                text = "I want to take a practice test on: ";
                break;
            case 'concept-map':
                text = "Help me build a learning roadmap for: ";
                break;
            case 'explain':
                text = "Can you walk me through and explain: ";
                break;
        }
        setInput(text);
        inputRef.current?.focus();
        // Smooth scroll to input if needed
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    const [isInternalGateOpen, setIsInternalGateOpen] = useState(false);

    // Auto-grow textarea
    useEffect(() => {
        const textarea = inputRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const newHeight = Math.min(textarea.scrollHeight, 200);
            textarea.style.height = `${newHeight}px`;
        }
    }, [input]);
    const [classificationTier, setClassificationTier] = useState<'tier1' | 'tier2' | 'tier3' | null>(null);
    const [isClassifying, setIsClassifying] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Debounce typing for classification
    useEffect(() => {
        if (!input.trim() || input.length < 50) {
            setClassificationTier(null);
            return;
        }

        const triggerWords = ['explain', 'teach', 'why', 'how does', 'walk me through', 'what is', 'break down'];
        const hasTrigger = triggerWords.some(w => input.toLowerCase().includes(w));

        if (input.length > 200 || hasTrigger) {
            const timeout = setTimeout(async () => {
                setIsClassifying(true);
                try {
                    const res = await fetch('/api/classify-message', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify({ message: input, isFollowUpInTier3: false })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setClassificationTier(data.tier);
                    }
                } catch (e) {
                    console.error('Failed to classify message', e);
                } finally {
                    setIsClassifying(false);
                }
            }, 500);

            return () => clearTimeout(timeout);
        } else {
            setClassificationTier(null);
        }
    }, [input, token]);

    const transport = useMemo(() => new DefaultChatTransport({
        api: '/api/home-chat',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(isDemo ? { 'x-serify-demo': 'true' } : {})
        }
    }), [token, isDemo]);

    const { messages, sendMessage, status, error } = useChat({
        transport,
        onError: (err: any) => {
            if (err.message?.includes('limit_reached') || err.message?.includes('403')) {
                trackEvent('assistant_limit_reached');
                setIsInternalGateOpen(true);
            }
        },
        onFinish: () => {
            refreshUsage();
        }
    });

    const isLoading = status === 'submitted' || status === 'streaming';
    const hasMessages = messages.length > 0;

    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Auto-scale textarea
    useEffect(() => {
        const textarea = inputRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
        }
    }, [input]);

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!token && !isDemo) return;
        if (!input.trim()) return;

        trackEvent('assistant_message_sent');
        sendMessage({ text: input });
        setInput('');
        setClassificationTier(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input?.trim()) {
                onSubmit(e as any);
            }
        }
    };

    return (
        <>
            <section
                className="relative bg-[var(--surface)] flex flex-col h-full min-h-0"
            >
                {headerContent && (
                    <div className="sticky top-0 z-20 bg-[var(--surface)]/95 backdrop-blur-xl border-b border-[var(--border)] px-4 py-4 xl:py-5 lg:pl-8">
                        {headerContent}
                    </div>
                )}
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-3.5 scroll-smooth">
                    {!hasMessages && (
                        <div className="flex flex-col h-full">
                            <StudyLab onToolSelect={handleToolSelect} />

                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[var(--surface)]">
                                <div className="p-4 rounded-3xl bg-[var(--bg)] border border-[var(--border)] shadow-inner mb-6 max-w-lg w-full">
                                    <h3 className="font-display text-lg text-[var(--text)] mb-2 flex items-center justify-center gap-2">
                                        Or Paste a Link <CornerDownRight size={18} className="text-[var(--accent)]" />
                                    </h3>
                                    <p className="text-sm text-[var(--muted)] leading-relaxed">
                                        Paste a YouTube video, article, or your own notes below.
                                        I&apos;ll analyze it and prepare your focus concepts.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 w-full max-w-lg px-2">
                                    {STARTER_PROMPTS.map((sp, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                if (sp.label.toLowerCase().includes('analyze')) {
                                                    router.push('/analyze');
                                                } else {
                                                    router.push(`/learn?q=${encodeURIComponent(sp.prompt)}`);
                                                }
                                            }}
                                            className="group flex flex-col gap-2 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface)] hover:border-[var(--accent)]/30 hover:shadow-xl hover:shadow-[var(--accent)]/5 hover:scale-[1.02] active:scale-[0.98] transition-all text-left relative overflow-hidden shadow-sm"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/0 to-[var(--accent)]/[0.03] opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0 group-hover:bg-[var(--accent)] group-hover:border-[var(--accent)] transition-all shadow-sm">
                                                <sp.icon size={16} strokeWidth={1.5} className="text-[var(--muted)] group-hover:text-white transition-colors" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]/80 group-hover:text-[var(--accent)] transition-colors">{sp.label}</p>
                                                <p className="text-[11px] text-[var(--muted)]/60 mt-1 leading-snug font-medium">{sp.description}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {hasMessages && (
                        <div className="px-4 py-6 space-y-4">
                            {(messages as any).map((msg: any, idx: number) => {
                                const isUser = msg.role === 'user';
                                const textContent = msg.content || (msg.parts ?? [])
                                    .filter((p: any) => p.type === 'text')
                                    .map((p: any) => p.text)
                                    .join('');
                                const displayText = isUser ? textContent : stripActionBlocks(textContent);
                                const actions = isUser ? [] : parseActionBlocks(textContent);

                                return (
                                    <div
                                        key={msg.id ?? idx}
                                        className={`flex gap-2.5 chat-bubble-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                                    >
                                        {!isUser && (
                                            <div className="w-8 h-8 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-[var(--accent)]/20">
                                                <Brain size={14} />
                                            </div>
                                        )}

                                        <div className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                                            {displayText && (
                                                <div
                                                    className={`px-4 py-3 rounded-2xl text-[13px] sm:text-sm leading-relaxed break-words ${isUser
                                                        ? 'bg-[var(--accent)] text-white rounded-br-sm shadow-md shadow-[var(--accent)]/20 whitespace-pre-wrap'
                                                        : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-bl-sm'
                                                        }`}
                                                >
                                                    {isUser ? (
                                                        displayText
                                                    ) : (
                                                        <MarkdownRenderer>{displayText}</MarkdownRenderer>
                                                    )}
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
                                                {displayName.charAt(0) || 'U'}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

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

                    {(error) && (
                        <div className="flex items-start gap-3 bg-[var(--warn-light)] border border-[var(--warn)]/20 rounded-2xl p-4 chat-bubble-in">
                            <AlertTriangle size={16} className="text-[var(--warn)] shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-[var(--warn)]">
                                    Something went wrong
                                </p>
                                <p className="text-xs text-[var(--warn)]/70 mt-0.5">
                                    {(error?.message?.startsWith('{')
                                        ? (JSON.parse(error.message).error || JSON.parse(error.message).message || "An unexpected error occurred")
                                        : (error?.message || "An unexpected error occurred"))
                                    }
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-3 pb-3 pt-2 border-t border-[var(--border)]/30 shrink-0 bg-[var(--surface)]">
                    {usage && usage.monthlyLimit !== null && usage.tokensUsed >= usage.monthlyLimit ? (
                        <div className="flex flex-col items-center text-center p-6 border border-[var(--border)] rounded-2xl bg-[var(--bg)]/50">
                            <p className="text-sm font-bold text-[var(--text)] mb-1">You&apos;ve used all your AI messages this month.</p>
                            <p className="text-xs text-[var(--muted)] mb-4">Pro includes 300 messages/month. Pro+ is unlimited.</p>
                            <div className="flex gap-3 mb-4">
                                <Link
                                    href="/pricing"
                                    className="px-4 py-2 bg-[var(--accent)] text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-sm"
                                    onClick={() => trackEvent('assistant_upgrade_clicked', { plan: 'pro' })}
                                >
                                    Upgrade to Pro →
                                </Link>
                                <Link
                                    href="/pricing"
                                    className="px-4 py-2 bg-[var(--text)] text-[var(--surface)] text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-sm"
                                    onClick={() => trackEvent('assistant_upgrade_clicked', { plan: 'pro+' })}
                                >
                                    Upgrade to Pro+ →
                                </Link>
                            </div>
                            <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest font-bold">Resets next billing period</p>
                        </div>
                    ) : (
                        <>
                            <div className="relative flex items-end gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_1px_var(--accent)] focus-within:ring-4 focus-within:ring-[var(--accent)]/5 transition-all">
                                {classificationTier === 'tier3' && usage && usage.monthlyLimit !== null && (usage.tokensUsed / usage.monthlyLimit >= 0.5) && (
                                    <div
                                        className="absolute -top-7 left-4 text-[12px] text-[var(--muted)] font-medium bg-[var(--surface)] px-2 py-0.5 rounded-t-lg border border-[var(--border)] border-b-0 animate-fade-in"
                                        ref={(el) => {
                                            if (el && !el.dataset.tracked) {
                                                trackEvent('assistant_tier3_warning_shown');
                                                el.dataset.tracked = 'true';
                                            }
                                        }}
                                    >
                                        This response uses 3 messages · {Math.max(0, usage.monthlyLimit - usage.tokensUsed)} remaining
                                    </div>
                                )}
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask Serify"
                                    rows={1}
                                    className="flex-1 bg-transparent outline-none resize-none text-[var(--text)] placeholder-[var(--muted)] text-sm leading-relaxed"
                                    style={{ minHeight: '24px' }}
                                    disabled={isLoading}
                                />
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[var(--muted)] font-bold bg-[var(--surface)] px-2.5 py-1 rounded-lg border border-[var(--border)]">
                                        <Sparkles size={11} className="text-[var(--accent)]" />
                                        AI Tutor
                                    </div>
                                    <button
                                        onClick={(e) => onSubmit(e as any)}
                                        disabled={!input?.trim() || isLoading}
                                        className="w-8 h-8 rounded-xl bg-[var(--text)] text-[var(--surface)] disabled:opacity-30 flex items-center justify-center hover:bg-black transition-all active:scale-95 shadow-lg shadow-black/10"
                                    >
                                        <ArrowUp size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col items-center mt-2.5">
                                <p className="text-[10px] text-[var(--muted)]/50 text-center font-medium mb-1">
                                    Ask anything, paste a link, or upload notes ·{' '}
                                    <kbd className="px-1 py-0.5 bg-[var(--border)] rounded text-[9px] font-bold">Enter</kbd> to send
                                </p>
                                {usage && usage.monthlyLimit !== null && (usage.tokensUsed / usage.monthlyLimit >= 0.7) && (usage.tokensUsed / usage.monthlyLimit < 1) && (
                                    <p
                                        className="text-[12px] font-medium"
                                        style={{ color: usage.tokensUsed / usage.monthlyLimit >= 0.9 ? '#D97706' : '#B8860B' }}
                                        ref={(el) => {
                                            if (el && !el.dataset.tracked) {
                                                const percentage = usage.tokensUsed / usage.monthlyLimit!;
                                                trackEvent(percentage >= 0.9 ? 'assistant_usage_critical_shown' : 'assistant_usage_warning_shown');
                                                el.dataset.tracked = 'true';
                                            }
                                        }}
                                    >
                                        {Math.round((usage.tokensUsed / usage.monthlyLimit) * 100)}% of AI messages used this month
                                        {usage.tokensUsed / usage.monthlyLimit >= 0.9 && (
                                            <span> · <Link href="/pricing" className="underline hover:text-orange-700" onClick={() => trackEvent('assistant_upgrade_clicked')}>Upgrade for more →</Link></span>
                                        )}
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </section>

            {isInternalGateOpen && (
                <UsageGate
                    feature="ai_message_tier1"
                    onClose={() => setIsInternalGateOpen(false)}
                />
            )}
        </>
    );
}
