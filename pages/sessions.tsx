import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import {
    Search,
    Filter,
    Clock,
    Youtube,
    FileUp,
    FileText,
    ClipboardPaste,
    Layers,
    Target,
    BookOpen,
    MessageSquare,
    Bot,
    Edit3,
    Zap,
    Trash2,
    X,
    AlertTriangle,
    ChevronRight,
    FlaskConical,
    CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';

type SessionType = 'reflection' | 'flow';

interface UnifiedSession {
    id: string;
    type: SessionType;
    title: string;
    contentType: string;
    status: string;
    createdAt: string;
    completedAt?: string;

    sourceType?: string;
    sourceId?: string;

    completedCount?: number;
    totalCount?: number;
    sparksSpent?: number;
    session_type?: string;
}

function getIcon(contentType: string) {
    switch (contentType) {
        case 'youtube':
            return <Youtube className="text-red-500" size={18} />;
        case 'pdf':
            return <FileUp className="text-blue-500" size={18} />;
        case 'article':
            return <FileText className="text-green-500" size={18} />;
        case 'notes':
            return <ClipboardPaste className="text-orange-500" size={18} />;
        case 'flow':
            return <Zap className="text-purple-500" size={18} />;
        default:
            return <Clock className="text-gray-400" size={18} />;
    }
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function DeleteModal({
    session,
    onConfirm,
    onCancel,
    deleting
}: {
    session: UnifiedSession;
    onConfirm: () => void;
    onCancel: () => void;
    deleting: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-backdrop">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-md w-full p-6 animate-modal-in glass">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                        <AlertTriangle size={18} className="text-red-500" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-[var(--text)] mb-1">
                            Delete Session
                        </h2>
                        <p className="text-sm text-[var(--muted)] leading-relaxed">
                            <span className="font-semibold text-[var(--text)]">
                                &quot;{session.title}&quot;
                            </span>{' '}
                            and all its associated
                            {session.type === 'reflection'
                                ? ' flashcards, quizzes, explanations, and tutor conversations'
                                : ' steps and progress'}{' '}
                            will be permanently deleted. This cannot be undone.
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-6">
                    <button
                        onClick={onCancel}
                        disabled={deleting}
                        className="px-4 py-2 border border-[var(--border)] bg-[var(--bg)] rounded-xl text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {deleting ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Deleting…
                            </>
                        ) : (
                            <>
                                <Trash2 size={14} />
                                Delete Permanently
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SessionRow({
    session,
    onDelete
}: {
    session: UnifiedSession;
    onDelete: (s: UnifiedSession) => void;
}) {
    const router = useRouter();

    const isStale =
        (session.status.toLowerCase() === 'processing' || session.status.toLowerCase() === 'analyzing') &&
        new Date().getTime() - new Date(session.createdAt).getTime() > 60 * 60 * 1000;

    function handleRowClick() {
        if (isStale) return; // Prevent clicking failed sessions unless we add a retry

        if (session.type === 'flow') {
            if (session.sourceType === 'curriculum' && session.sourceId) {
                router.push(`/learn/curriculum/${session.sourceId}/flow?session=${session.id}`);
            } else {
                router.push(`/flow/${session.id}`);
            }
        } else {
            router.push(
                session.status === 'complete' || session.status === 'completed'
                    ? `/session/${session.id}/feedback`
                    : `/session/${session.id}`
            );
        }
    }

    let statusLabel =
        session.type === 'flow'
            ? `${session.completedCount ?? 0}/${session.totalCount ?? 0} concepts`
            : session.status.toLowerCase() === 'complete' || session.status.toLowerCase() === 'completed'
                ? 'Completed'
                : session.status.toLowerCase() === 'practicing'
                    ? 'Practicing'
                    : 'Analyzing';

    if (isStale) statusLabel = 'Incomplete';

    const statusColor =
        isStale
            ? 'bg-red-50 text-red-600 border-red-200'
            : session.type === 'flow'
                ? 'bg-purple-50 text-purple-600 border-purple-200'
                : session.status.toLowerCase() === 'complete' || session.status.toLowerCase() === 'completed'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : session.status.toLowerCase() === 'practicing'
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : 'bg-amber-50 text-amber-600 border-amber-200';

    return (
        <tr
            className="border-b border-[var(--border)] hover:bg-[var(--accent)]/[0.025] transition-colors group row-hover-accent cursor-pointer"
            onClick={handleRowClick}
        >
            { }
            <td className="py-4 px-6">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[var(--bg)] border border-[var(--border)] rounded-xl flex items-center justify-center shrink-0 group-hover:border-[var(--accent)]/30 group-hover:bg-[var(--accent)]/5 transition-all">
                        {getIcon(session.contentType)}
                    </div>
                    <div className="min-w-0">
                        <div className="font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-1 text-sm" title={session.title}>
                            {session.title}
                        </div>
                        <div className="text-xs text-[var(--muted)] mt-0.5">
                            {session.type === 'flow' ? 'Flow Mode' : session.contentType}
                            {session.sparksSpent ? ` · ${session.sparksSpent} sparks` : ''}
                        </div>
                    </div>
                    { }
                    {session.type === 'reflection' && (
                        <div
                            className="flex items-center gap-1.5 ml-2 hidden lg:flex"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {[
                                {
                                    label: 'Flashcards',
                                    icon: <Layers size={10} />,
                                    href: `/learn/${session.id}/flashcards`,
                                    cls: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                                },
                                {
                                    label: 'Quiz',
                                    icon: <Target size={10} />,
                                    href: `/learn/${session.id}/practice`,
                                    cls: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                },
                                {
                                    label: 'Deep Dive',
                                    icon: <BookOpen size={10} />,
                                    href: `/learn/${session.id}/deepdive`,
                                    cls: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                                },
                                {
                                    label: 'Explain',
                                    icon: <MessageSquare size={10} />,
                                    href: `/learn/${session.id}/explain`,
                                    cls: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100'
                                },
                                {
                                    label: 'Tutor',
                                    icon: <Bot size={10} />,
                                    href: `/learn/${session.id}/tutor`,
                                    cls: 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                                },
                                {
                                    label: 'Feynman',
                                    icon: <Edit3 size={10} />,
                                    href: `/learn/${session.id}/feynman`,
                                    cls: 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                }
                            ].map((m) => (
                                <Link
                                    key={m.label}
                                    href={m.href}
                                    title={m.label}
                                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${m.cls} transition-colors`}
                                >
                                    {m.icon} {m.label}
                                </Link>
                            ))}
                        </div>
                    )}
                    {session.type === 'flow' && (
                        <div
                            className="ml-2 hidden lg:flex items-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Link
                                href={session.sourceType === 'curriculum' && session.sourceId ? `/learn/curriculum/${session.sourceId}/flow?session=${session.id}` : `/flow/${session.id}`}
                                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 transition-colors"
                            >
                                <Zap size={9} /> {session.completedCount === 0 ? 'Start' : 'Resume'}
                            </Link>
                        </div>
                    )}
                </div>
            </td>
            { }
            <td className="py-4 px-4 text-sm text-[var(--muted)] whitespace-nowrap hidden sm:table-cell">
                {formatDate(session.createdAt)}
            </td>
            { }
            <td className="py-4 px-4">
                <span
                    className={`inline-flex items-center text-xs font-bold px-2 py-1 rounded-lg border ${statusColor}`}
                >
                    {statusLabel}
                </span>
            </td>
            { }
            <td className="py-4 px-4 text-right">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(session);
                    }}
                    className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-50 transition-colors opacity-40 group-hover:opacity-100"
                    title="Delete session"
                >
                    <Trash2 size={15} />
                </button>
            </td>
        </tr>
    );
}

type FilterTab = 'all' | 'reflection' | 'flow' | 'in_progress' | 'completed';

export default function LibraryPage() {
    const { user, token } = useAuth();
    const router = useRouter();

    const [sessions, setSessions] = useState<UnifiedSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterTab, setFilterTab] = useState<FilterTab>('all');
    const [deleteTarget, setDeleteTarget] = useState<UnifiedSession | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsInitialLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    const fetchSessions = useCallback(async () => {
        if (!user || !token) return;
        setLoading(true);
        try {
            const res = await fetch('/api/sessions', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions || []);
            }
        } catch (e) {
            console.error('[library] fetchSessions error:', e);
        } finally {
            setLoading(false);
        }
    }, [user, token]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    async function confirmDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        try {

            const res = await fetch('/api/sessions', {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: deleteTarget.id,
                    sessionType: deleteTarget.type
                })
            });

            if (res.ok) {
                setSessions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
                setDeleteTarget(null);
            }
        } catch (e) {
            console.error('[library] deleteSession error:', e);
        } finally {
            setDeleting(false);
        }
    }

    const filtered = sessions.filter((s) => {
        let matchesTab = filterTab === 'all';

        if (filterTab === 'reflection') {
            matchesTab = s.type === 'reflection' || (s as any).session_type === 'analysis' || (s as any).session_type === 'reflection';
        } else if (filterTab === 'flow') {
            matchesTab = s.type === 'flow';
        } else if (filterTab === 'completed') {
            const status = s.status?.toLowerCase() || '';
            matchesTab = status === 'complete' || status === 'completed' || status === 'feedback';
        } else if (filterTab === 'in_progress') {
            const status = s.status?.toLowerCase() || '';
            matchesTab = status !== 'complete' && status !== 'completed' && status !== 'feedback';
        }


        const matchesSearch =
            !search.trim() || s.title.toLowerCase().includes(search.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const reflectionCount = sessions.filter((s) => s.type === 'reflection' || (s as any).session_type === 'analysis' || (s as any).session_type === 'reflection').length;
    const flowCount = sessions.filter((s) => s.type === 'flow').length;
    const completedCount = sessions.filter(
        (s) => {
            const status = s.status?.toLowerCase() || '';
            return status === 'complete' || status === 'completed' || status === 'feedback';
        }
    ).length;
    const inProgressCount = sessions.filter(
        (s) => {
            const status = s.status?.toLowerCase() || '';
            return status !== 'complete' && status !== 'completed' && status !== 'feedback';
        }
    ).length;


    return (
        <DashboardLayout>
            <Head>
                <title>Sessions | Serify</title>
            </Head>

            <div className="max-w-5xl mx-auto w-full px-6 md:px-10 py-8 pb-24">
                {isInitialLoading && !user ? (
                    <div className="animate-pulse">
                        <div className="h-10 w-48 bg-[var(--border)] rounded-lg mb-4"></div>
                        <div className="h-4 w-96 bg-[var(--border)] rounded-lg mb-8 opacity-50"></div>
                        <div className="h-64 bg-[var(--surface)] border border-[var(--border)] rounded-2xl"></div>
                    </div>
                ) : (
                    <>
                        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                            <div>
                                <h1 className="text-3xl font-display text-[var(--text)]">Sessions</h1>
                                <p className="text-[var(--muted)] text-sm mt-1">
                                    All your sessions and saved learning materials, in one place.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <Search
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                                        size={15}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search by title…"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--accent)] w-full md:w-60 transition-colors"
                                    />
                                    {search && (
                                        <button
                                            onClick={() => setSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </header>

                        <div className="flex flex-wrap items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1 mb-6 w-fit glass">
                            {(
                                [
                                    ['all', 'All', sessions.length],
                                    ['reflection', 'Analysis', reflectionCount],
                                    ['flow', 'Flow', flowCount],
                                    ['in_progress', 'In Progress', inProgressCount],
                                    ['completed', 'Completed', completedCount]

                                ] as [FilterTab, string, number][]
                            ).map(([tab, label, count]) => (
                                <button
                                    key={tab}
                                    onClick={() => setFilterTab(tab)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${filterTab === tab
                                        ? 'bg-[var(--accent)] text-white shadow-sm'
                                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                                        }`}
                                >

                                    {tab === 'reflection' && <FlaskConical size={12} />}
                                    {tab === 'flow' && <Zap size={12} />}
                                    {tab === 'in_progress' && <Clock size={12} />}
                                    {tab === 'completed' && (
                                        <CheckCircle2
                                            size={12}
                                            className={filterTab === tab ? '' : 'text-emerald-500'}
                                        />
                                    )}
                                    {label}
                                    <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filterTab === tab ? 'bg-white/20 text-white' : 'bg-[var(--border)] text-[var(--muted)]'}`}
                                    >
                                        {count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden glass">
                            {loading && sessions.length === 0 ? (
                                <div className="animate-pulse">
                                    <div className="h-12 bg-black/[0.02] border-b border-[var(--border)]"></div>
                                    {[...Array(6)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border)]"
                                        >
                                            <div className="w-9 h-9 bg-[var(--border)] rounded-lg shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 bg-[var(--border)] rounded w-1/2" />
                                                <div className="h-3 bg-[var(--border)] rounded w-1/4 opacity-50" />
                                            </div>
                                            <div className="h-6 w-20 bg-[var(--border)] rounded-lg" />
                                        </div>
                                    ))}
                                </div>
                            ) : filtered.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[var(--border)] bg-black/[0.02]">
                                            <th className="py-3 px-6 font-medium text-xs uppercase text-[var(--muted)] tracking-wider">
                                                Session
                                            </th>
                                            <th className="py-3 px-4 font-medium text-xs uppercase text-[var(--muted)] tracking-wider hidden sm:table-cell">
                                                Date
                                            </th>
                                            <th className="py-3 px-4 font-medium text-xs uppercase text-[var(--muted)] tracking-wider">
                                                Status
                                            </th>
                                            <th className="py-3 px-4 text-right" />
                                        </tr>
                                    </thead>
                                    <tbody className="stagger-children">
                                        {filtered.map((session) => (
                                            <SessionRow
                                                key={session.id}
                                                session={session}
                                                onDelete={setDeleteTarget}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-6 animate-scale-in">
                                    <div className="relative mb-8">
                                        <div className="w-16 h-16 bg-[var(--accent)]/10 rounded-2xl flex items-center justify-center animate-breathe relative z-10 border border-[var(--accent)]/20">
                                            <BookOpen size={28} className="text-[var(--accent)] opacity-80" />
                                        </div>
                                        <div className="absolute -inset-4 bg-[var(--accent)]/5 rounded-full animate-ping opacity-20" />
                                    </div>

                                    <h3 className="text-xl font-display font-medium text-[var(--text)] mb-2">
                                        {search
                                            ? 'No sessions match your search'
                                            : filterTab === 'reflection'
                                                ? 'No Analysis Sessions'
                                                : filterTab === 'completed'
                                                    ? 'No Completed Sessions'
                                                    : filterTab === 'in_progress'
                                                        ? 'No Active Sessions'
                                                        : 'Your learning library is clear'}
                                    </h3>

                                    <p className="text-[var(--muted)] text-sm max-w-sm mx-auto leading-relaxed mb-10">
                                        {search
                                            ? `Try searching for different keywords or checking all sessions.`
                                            : filterTab === 'reflection'
                                                ? 'Transform notes, videos, or PDFs into structured knowledge and active recall sessions.'
                                                : filterTab === 'completed'
                                                    ? 'Sessions will appear here once you finish all steps in an analysis.'
                                                    : filterTab === 'in_progress'
                                                        ? 'Ready to dive back in? Any unfinished sessions will be tracked right here.'
                                                        : 'Start your next adventure. Choose a study method to begin mapping your understanding.'}
                                    </p>


                                    {!search && (
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <Link
                                                href="/"
                                                className="h-11 px-8 bg-[var(--accent)] text-white rounded-xl text-sm font-bold hover:bg-[var(--accent)]/90 transition-all shadow-lg shadow-[var(--accent)]/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                                <Zap size={16} fill="currentColor" />
                                                Start Learning
                                            </Link>
                                        </div>
                                    )}

                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            { }
            {deleteTarget && (
                <DeleteModal
                    session={deleteTarget}
                    onConfirm={confirmDelete}
                    onCancel={() => !deleting && setDeleteTarget(null)}
                    deleting={deleting}
                />
            )}
        </DashboardLayout>
    );
}
