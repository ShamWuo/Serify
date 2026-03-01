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

    completedCount?: number;
    totalCount?: number;
    sparksSpent?: number;
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-md w-full p-6">
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

    function handleRowClick() {
        if (session.type === 'flow') {
            router.push(`/flow/${session.id}`);
        } else {
            router.push(
                session.status === 'complete' || session.status === 'completed'
                    ? `/session/${session.id}/feedback`
                    : `/session/${session.id}`
            );
        }
    }

    const statusLabel =
        session.type === 'flow'
            ? `${session.completedCount ?? 0}/${session.totalCount ?? 0} concepts`
            : session.status === 'complete' || session.status === 'completed'
                ? 'Completed'
                : 'In Progress';

    const statusColor =
        session.type === 'flow'
            ? 'bg-purple-50 text-purple-600 border-purple-200'
            : session.status === 'complete' || session.status === 'completed'
                ? 'bg-[var(--accent-light)] text-[var(--accent)] border-[var(--accent)]/20'
                : 'bg-amber-50 text-amber-600 border-amber-200';

    return (
        <tr className="border-b border-[var(--border)] hover:bg-black/[0.025] transition-colors group">
            { }
            <td className="py-4 px-6 cursor-pointer" onClick={handleRowClick}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[var(--bg)] border border-[var(--border)] rounded-lg flex items-center justify-center shrink-0">
                        {getIcon(session.contentType)}
                    </div>
                    <div className="min-w-0">
                        <div className="font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-1 text-sm">
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
                                href={`/flow/${session.id}`}
                                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 transition-colors"
                            >
                                <Zap size={9} /> Resume
                            </Link>
                        </div>
                    )}
                </div>
            </td>
            { }
            <td
                className="py-4 px-4 text-sm text-[var(--muted)] whitespace-nowrap hidden sm:table-cell cursor-pointer"
                onClick={handleRowClick}
            >
                {formatDate(session.createdAt)}
            </td>
            { }
            <td className="py-4 px-4 cursor-pointer" onClick={handleRowClick}>
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
                    className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
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
    const { user } = useAuth();
    const router = useRouter();

    const [sessions, setSessions] = useState<UnifiedSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterTab, setFilterTab] = useState<FilterTab>('all');
    const [deleteTarget, setDeleteTarget] = useState<UnifiedSession | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchSessions = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const {
                data: { session: authSession }
            } = await supabase.auth.getSession();
            const token = authSession?.access_token;
            if (!token) {
                setLoading(false);
                return;
            }

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
    }, [user]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    async function confirmDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const {
                data: { session: authSession }
            } = await supabase.auth.getSession();
            const token = authSession?.access_token;

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
        let matchesTab = filterTab === 'all' || s.type === filterTab;
        if (filterTab === 'completed') {
            matchesTab =
                s.status === 'complete' ||
                s.status === 'completed' ||
                (s.type === 'flow' && s.completedCount === s.totalCount);
        } else if (filterTab === 'in_progress') {
            matchesTab =
                s.status !== 'complete' &&
                s.status !== 'completed' &&
                !(s.type === 'flow' && s.completedCount === s.totalCount);
        }
        const matchesSearch =
            !search.trim() || s.title.toLowerCase().includes(search.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const reflectionCount = sessions.filter((s) => s.type === 'reflection').length;
    const flowCount = sessions.filter((s) => s.type === 'flow').length;
    const completedCount = sessions.filter(
        (s) =>
            s.status === 'complete' ||
            s.status === 'completed' ||
            (s.type === 'flow' && s.completedCount === s.totalCount)
    ).length;
    const inProgressCount = sessions.length - completedCount;

    return (
        <DashboardLayout>
            <Head>
                <title>Library | Serify</title>
            </Head>

            <div className="max-w-5xl mx-auto w-full px-6 md:px-10 py-8 pb-24">
                { }
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-display text-[var(--text)]">Library</h1>
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
                                placeholder="Search sessions…"
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

                { }
                <div className="flex flex-wrap items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1 mb-6 w-fit">
                    {(
                        [
                            ['all', 'All', sessions.length],
                            ['reflection', 'Analysis', reflectionCount],
                            ['flow', 'Flow Mode', flowCount],
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
                            {tab === 'flow' && <Zap size={12} />}
                            {tab === 'reflection' && <FlaskConical size={12} />}
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

                { }
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
                    {loading ? (
                        <div className="space-y-0">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border)]"
                                >
                                    <div className="w-9 h-9 bg-[var(--border)] rounded-lg animate-pulse shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-[var(--border)] rounded animate-pulse w-1/2" />
                                        <div className="h-3 bg-[var(--border)] rounded animate-pulse w-1/4" />
                                    </div>
                                    <div className="h-6 w-20 bg-[var(--border)] rounded-lg animate-pulse" />
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
                            <tbody>
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
                        <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                            <div className="w-10 h-10 bg-[var(--border)] rounded-xl flex items-center justify-center mb-3">
                                <Search size={18} className="text-[var(--muted)]" />
                            </div>
                            <h3 className="text-lg font-bold text-[var(--text)] mb-1">
                                {search
                                    ? 'No sessions found'
                                    : filterTab === 'reflection'
                                        ? 'No Analysis Sessions'
                                        : filterTab === 'flow'
                                            ? 'No Flow Sessions'
                                            : filterTab === 'completed'
                                                ? 'Nothing finished yet'
                                                : filterTab === 'in_progress'
                                                    ? 'All caught up'
                                                    : 'Your Library is empty'}
                            </h3>
                            <p className="text-[var(--muted)] text-sm max-w-xs mx-auto">
                                {search
                                    ? `No sessions match "${search}".`
                                    : filterTab === 'reflection'
                                        ? 'Start analyzing content to create your first analysis session.'
                                        : filterTab === 'flow'
                                            ? 'Step into Flow Mode to start creating concept connections.'
                                            : filterTab === 'completed'
                                                ? 'Finish a study session or Flow to see it here.'
                                                : filterTab === 'in_progress'
                                                    ? 'No active sessions found. Why not start something new?'
                                                    : 'Start analyzing content or try a Flow Mode session to see your work here.'}
                            </p>
                            {!search && (
                                <div className="flex gap-3 mt-6">
                                    <Link
                                        href="/analyze"
                                        className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-medium hover:bg-[var(--accent)]/90 transition-colors shadow-md shadow-[var(--accent)]/20"
                                    >
                                        Analyze Content
                                    </Link>
                                    <Link
                                        href="/flow"
                                        className="px-5 py-2.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-xl text-sm font-medium hover:border-purple-300 hover:text-purple-600 transition-colors flex items-center gap-1.5"
                                    >
                                        <Zap size={14} /> Flow Mode
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
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
