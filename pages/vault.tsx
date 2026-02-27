import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
    Search, ChevronDown, ChevronRight, X, BookOpen,
    MessageSquare, BrainCircuit, Bot, LayoutList, Layers,
    ArrowRight, Zap, Archive
} from 'lucide-react';
import { KnowledgeNode, ConceptTopic, MasteryState } from '@/types/serify';

const MASTERY_CONFIG: Record<MasteryState, { label: string; color: string; bg: string; dot: string }> = {
    solid: { label: 'Solid', color: 'text-[#2A5C45]', bg: 'bg-[#2A5C45]/10', dot: 'bg-[#2A5C45]' },
    developing: { label: 'Developing', color: 'text-[#4A90A4]', bg: 'bg-[#4A90A4]/10', dot: 'bg-[#4A90A4]' },
    shaky: { label: 'Shaky', color: 'text-[#B8860B]', bg: 'bg-[#B8860B]/10', dot: 'bg-[#B8860B]' },
    revisit: { label: 'Revisit', color: 'text-[#C4541A]', bg: 'bg-[#C4541A]/10', dot: 'bg-[#C4541A]' },
};

type Tab = 'all' | 'needs_work' | 'solid';
type SortOption = 'last_seen' | 'alpha' | 'session_count' | 'mastery';

function MasteryDot({ state, size = 10 }: { state: MasteryState; size?: number }) {
    const cfg = MASTERY_CONFIG[state] || MASTERY_CONFIG['developing'];
    return <span className={`inline-block rounded-full shrink-0 ${cfg.dot}`} style={{ width: size, height: size }} />;
}

function MasteryBadge({ state }: { state: MasteryState }) {
    const cfg = MASTERY_CONFIG[state] || MASTERY_CONFIG['developing'];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
            <MasteryDot state={state} size={7} />
            {cfg.label}
        </span>
    );
}

type DetailPanelProps = {
    nodeId: string;
    onClose: () => void;
    sessionId?: string;
};

function DetailPanel({ nodeId, onClose, sessionId }: DetailPanelProps) {
    const [node, setNode] = useState<KnowledgeNode | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const fetchNode = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                const res = await fetch(`/api/vault/nodes/${nodeId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setNode(data.node);
                    setSessions(data.sessions || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchNode();
    }, [nodeId]);

    if (loading) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
                    <div className="h-6 w-40 bg-[var(--border)] rounded animate-pulse" />
                    <button onClick={onClose}><X size={20} className="text-[var(--muted)]" /></button>
                </div>
                <div className="flex-1 p-6 space-y-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-16 bg-[var(--border)] rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (!node) return (
        <div className="flex flex-col h-full items-center justify-center p-8 text-center">
            <p className="text-[var(--muted)]">Concept not found.</p>
            <button onClick={onClose} className="mt-4 text-[var(--accent)] text-sm">Close</button>
        </div>
    );

    const history: any[] = Array.isArray(node.mastery_history) ? node.mastery_history : [];
    const firstSeen = node.first_seen_at ? new Date(node.first_seen_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            {}
            <div className="sticky top-0 bg-[var(--surface)] z-10 px-6 pt-6 pb-4 border-b border-[var(--border)]">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-[var(--text)] leading-snug">{node.display_name}</h2>
                        <p className="text-xs text-[var(--muted)] mt-1">
                            {node.topic_name && <><span className="font-medium">{node.topic_name}</span> · </>}
                            {node.session_count} {node.session_count === 1 ? 'session' : 'sessions'} · First seen {firstSeen}
                        </p>
                    </div>
                    <button onClick={onClose} className="shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors">
                        <X size={18} className="text-[var(--muted)]" />
                    </button>
                </div>
                <div className="mt-3">
                    <MasteryBadge state={node.current_mastery} />
                </div>
            </div>

            <div className="flex-1 px-6 py-5 space-y-7">
                {}
                {node.definition && (
                    <div>
                        <p className="text-sm text-[var(--text)] leading-relaxed">{node.definition}</p>
                    </div>
                )}

                {}
                {history.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">Mastery Timeline</h3>
                        <div className="flex items-center gap-0 overflow-x-auto pb-2">
                            {history.map((entry, i) => {
                                const cfg = MASTERY_CONFIG[entry.state as MasteryState] || MASTERY_CONFIG.revisit;
                                const prev = history[i - 1];
                                const improved = prev ? (
                                    ['revisit', 'shaky', 'developing', 'solid'].indexOf(entry.state) >
                                    ['revisit', 'shaky', 'developing', 'solid'].indexOf(prev.state)
                                ) : false;
                                return (
                                    <div key={i} className="flex items-center shrink-0">
                                        {i > 0 && (
                                            <div className={`w-8 h-0.5 ${improved ? 'bg-[#2A5C45]' : 'bg-[var(--border)]'}`} />
                                        )}
                                        <div className="flex flex-col items-center gap-1">
                                            <div className={`w-3 h-3 rounded-full ${cfg.dot}`} title={cfg.label} />
                                            <span className="text-[9px] text-[var(--muted)] whitespace-nowrap">
                                                {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {}
                {node.synthesis ? (
                    <div>
                        <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">Synthesized Understanding</h3>
                        <p className="text-sm text-[var(--text)] leading-relaxed italic">
                            &ldquo;{(node.synthesis as any).summary}&rdquo;
                        </p>
                        {(node.synthesis as any).persistentGap && (
                            <div className="mt-3 p-3 bg-[#B8860B]/10 border border-[#B8860B]/20 rounded-xl">
                                <p className="text-xs font-bold text-[#B8860B] mb-1">Persistent Gap</p>
                                <p className="text-xs text-[var(--text)] leading-relaxed">{(node.synthesis as any).persistentGap}</p>
                            </div>
                        )}
                        {(node.synthesis as any).improvement && (
                            <div className="mt-3 p-3 bg-[#2A5C45]/10 border border-[#2A5C45]/20 rounded-xl">
                                <p className="text-xs font-bold text-[#2A5C45] mb-1">Recent Improvement</p>
                                <p className="text-xs text-[var(--text)] leading-relaxed">{(node.synthesis as any).improvement}</p>
                            </div>
                        )}
                    </div>
                ) : node.session_count >= 2 ? (
                    <div>
                        <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">Synthesized Understanding</h3>
                        <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl">
                            <div className="space-y-2">
                                <div className="h-3 bg-[var(--border)] rounded animate-pulse" />
                                <div className="h-3 bg-[var(--border)] rounded animate-pulse w-4/5" />
                                <div className="h-3 bg-[var(--border)] rounded animate-pulse w-3/5" />
                            </div>
                            <p className="text-[11px] text-[var(--muted)] mt-3">Generating synthesis…</p>
                        </div>
                    </div>
                ) : null}

                {}
                {sessions.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">Sessions Covering This</h3>
                        <div className="space-y-2">
                            {sessions.map((s) => {
                                const typeIcons: Record<string, string> = { youtube: 'YT', pdf: 'PDF', article: 'Art', text: 'Txt' };
                                return (
                                    <Link
                                        key={s.id}
                                        href={`/session/${s.id}/feedback`}
                                        className="flex items-center justify-between p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)] transition-colors group"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[var(--border)] rounded text-[var(--muted)] shrink-0">
                                                {typeIcons[s.content_type] || 'Src'}
                                            </span>
                                            <span className="text-[13px] text-[var(--text)] truncate">{s.title || 'Untitled Session'}</span>
                                        </div>
                                        <ArrowRight size={14} className="text-[var(--muted)] group-hover:text-[var(--accent)] shrink-0 ml-2 transition-colors" />
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {}
                <div>
                    <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">Study This Concept</h3>
                    <p className="text-[11px] text-[var(--muted)] mb-3">Launch a learning mode focused specifically on this concept.</p>

                    {}
                    {(node.current_mastery === 'shaky' || node.current_mastery === 'revisit' || node.current_mastery === 'developing') && (
                        <Link
                            href={`/flow?focus=${node.id}`}
                            className="flex items-center justify-between gap-3 p-3 mb-3 bg-gradient-to-r from-[#7c3aed18] to-[#4f46e512] border border-[#7c3aed55] hover:border-[#7c3aed] rounded-xl transition-colors group"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                                    <Zap size={15} />
                                </div>
                                <div>
                                    <span className="text-[13px] font-bold text-[var(--text)] block">Flow Mode</span>
                                    <span className="text-[10px] text-[var(--muted)]">AI step-by-step coaching</span>
                                </div>
                            </div>
                            <ArrowRight size={14} className="text-purple-400 group-hover:text-purple-600 shrink-0 transition-colors" />
                        </Link>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: 'Flashcards', icon: <BookOpen size={16} />, href: sessions[0] ? `/learn/${sessions[0].id}/flashcards` : '#', cost: 1 },
                            { label: 'Explain It', icon: <MessageSquare size={16} />, href: sessions[0] ? `/learn/${sessions[0].id}/explain` : '#', cost: 1 },
                            { label: 'Feynman', icon: <BrainCircuit size={16} />, href: sessions[0] ? `/learn/${sessions[0].id}/feynman` : '#', cost: 2 },
                            { label: 'AI Tutor', icon: <Bot size={16} />, href: sessions[0] ? `/learn/${sessions[0].id}/tutor` : '#', cost: 1 },
                        ].map((mode) => (
                            <Link
                                key={mode.label}
                                href={mode.href}
                                className="flex flex-col gap-1.5 p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)] transition-colors group"
                            >
                                <div className="text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">{mode.icon}</div>
                                <span className="text-[13px] font-medium text-[var(--text)]">{mode.label}</span>
                                <span className="text-[10px] text-[var(--muted)] flex items-center gap-0.5">
                                    <Zap size={9} /> {mode.cost} Spark
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>

                {}
                {(node.hint_request_count > 0 || node.skip_count > 0) && (
                    <div className="border-t border-[var(--border)] pt-5">
                        <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">History</h3>
                        <div className="space-y-1 text-[13px] text-[var(--muted)]">
                            {node.hint_request_count > 0 && (
                                <p>Hint requested: <span className="text-[var(--text)] font-medium">{node.hint_request_count} {node.hint_request_count === 1 ? 'time' : 'times'}</span></p>
                            )}
                            {node.skip_count > 0 && (
                                <p>Skipped: <span className="text-[var(--text)] font-medium">{node.skip_count} {node.skip_count === 1 ? 'time' : 'times'}</span></p>
                            )}
                            {node.hint_request_count >= 2 && (
                                <p className="text-xs text-[#B8860B] mt-2 italic">You&apos;ve needed hints across multiple sessions — this concept may benefit from a dedicated study session.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function VaultPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
    const [topics, setTopics] = useState<ConceptTopic[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>('all');
    const [sort, setSort] = useState<SortOption>('last_seen');
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'topics' | 'flat'>('topics');
    const [collapsedTopics, setCollapsedTopics] = useState<Set<string>>(new Set());
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const fetchNodes = useCallback(async () => {
        setLoading(true);
        try {

            const { data: { user: authUser } } = await supabase.auth.getUser();
            const token = authUser ? (await supabase.auth.getSession()).data.session?.access_token : null;
            if (!token) {
                console.warn('[vault] No auth token available — skipping fetch');
                setLoading(false);
                return;
            }
            const res = await fetch(`/api/vault/nodes?tab=${tab}&sort=${sort}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const d = await res.json();
                setNodes(d.nodes || []);
                setTopics(d.topics || []);
            } else {
                console.error('[vault] nodes API returned', res.status, await res.text());
            }
        } catch (e) {
            console.error('[vault] fetchNodes error:', e);
        } finally {
            setLoading(false);
        }
    }, [tab, sort]);

    const [backfilling, setBackfilling] = useState(false);
    const [backfillDone, setBackfillDone] = useState(false);

    const triggerBackfill = useCallback(async () => {
        if (backfilling || backfillDone) return;
        setBackfilling(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const res = await fetch('/api/vault/backfill', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const d = await res.json();
            if (d.backfilled > 0) {

                await fetchNodes();
            }
        } catch (e) {
            console.error('Backfill failed', e);
        } finally {
            setBackfilling(false);
            setBackfillDone(true);
        }
    }, [backfilling, backfillDone, fetchNodes]);


    useEffect(() => {
        if (!loading && nodes.length === 0 && !backfillDone && !backfilling) {
            triggerBackfill();
        }
    }, [loading, nodes.length, backfillDone, backfilling, triggerBackfill]);


    useEffect(() => {
        if (user) fetchNodes();
    }, [fetchNodes, user]);

    const filteredNodes = search.trim()
        ? nodes.filter(n => (n.display_name || '').toLowerCase().includes(search.toLowerCase()))
        : nodes;

    const stats = nodes.reduce((acc, n) => {
        acc[n.current_mastery] = (acc[n.current_mastery] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const toggleTopic = (id: string) => {
        setCollapsedTopics(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };


    const topicGroups = topics.map(topic => ({
        topic,
        nodes: filteredNodes.filter(n => n.topic_id === topic.id)
    })).filter(g => g.nodes.length > 0);

    const uncategorized = filteredNodes.filter(n => !n.topic_id);

    const isEmpty = !loading && filteredNodes.length === 0;
    const hasAnyConcepts = nodes.length > 0;

    return (
        <DashboardLayout>
            <Head>
                <title>Concept Vault | Serify</title>
            </Head>

            <div className="relative flex h-full">
                {}
                <div className={`flex-1 min-w-0 transition-all duration-300 ${selectedNodeId ? 'mr-[420px]' : ''}`}>
                    <div className="max-w-[860px] mx-auto px-6 py-8">

                        {}
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-3xl font-display text-[var(--text)]">Concept Vault</h1>
                                <p className="text-[var(--muted)] text-sm mt-1">Every concept you&apos;ve encountered, tracked over time.</p>
                            </div>
                            <div className="relative mt-1">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                                <input
                                    type="text"
                                    placeholder="Search concepts…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-9 pr-4 h-10 w-52 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--accent)] transition-colors"
                                />
                            </div>
                        </div>

                        {}
                        {hasAnyConcepts && (
                            <div className="flex flex-wrap items-center gap-4 mb-5 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
                                {(['solid', 'developing', 'shaky', 'revisit'] as MasteryState[]).map(state => (
                                    <button
                                        key={state}
                                        onClick={() => setTab(state === 'solid' ? 'solid' : state === 'revisit' || state === 'shaky' ? 'needs_work' : 'all')}
                                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                    >
                                        <MasteryDot state={state} size={9} />
                                        <span className="text-sm text-[var(--text)] font-medium">{stats[state] || 0} {MASTERY_CONFIG[state].label}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {}
                        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
                            <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1">
                                {([['all', 'All'], ['needs_work', 'Needs Work'], ['solid', 'Solid']] as [Tab, string][]).map(([t, label]) => (
                                    <button
                                        key={t}
                                        onClick={() => setTab(t)}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={sort}
                                    onChange={e => setSort(e.target.value as SortOption)}
                                    className="h-9 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors"
                                >
                                    <option value="last_seen">Recently Seen</option>
                                    <option value="alpha">Alphabetical</option>
                                    <option value="session_count">Most Studied</option>
                                    <option value="mastery">Mastery State</option>
                                </select>
                                <div className="flex">
                                    <button
                                        onClick={() => setViewMode('topics')}
                                        className={`p-2 border border-r-0 border-[var(--border)] rounded-l-xl transition-colors ${viewMode === 'topics' ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'}`}
                                        title="Topic groups"
                                    >
                                        <Layers size={16} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('flat')}
                                        className={`p-2 border border-[var(--border)] rounded-r-xl transition-colors ${viewMode === 'flat' ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'}`}
                                        title="Flat list"
                                    >
                                        <LayoutList size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {}
                        {loading && (
                            <div className="space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-14 bg-[var(--surface)] border border-[var(--border)] rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        )}

                        {}
                        {(!loading && !hasAnyConcepts) && (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <div className="w-20 h-20 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mb-6 shadow-sm">
                                    <Archive size={36} className="text-[var(--muted)]" />
                                </div>
                                {backfilling ? (
                                    <>
                                        <h2 className="text-2xl font-display text-[var(--text)] mb-3">Importing your concepts…</h2>
                                        <p className="text-[var(--muted)] text-[15px] max-w-sm leading-relaxed">
                                            Pulling concepts from your past sessions into the Vault.
                                        </p>
                                        <div className="mt-6 flex gap-1.5">
                                            {[0, 1, 2].map(i => (
                                                <div key={i} className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="text-2xl font-display text-[var(--text)] mb-3">Your Concept Vault is empty</h2>
                                        <p className="text-[var(--muted)] text-[15px] max-w-sm leading-relaxed mb-8">
                                            Complete your first session and Serify will automatically track every concept you encounter.
                                        </p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={triggerBackfill}
                                                disabled={backfillDone}
                                                className="px-5 py-2.5 border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] rounded-xl text-sm font-medium hover:border-[var(--accent)] transition-colors disabled:opacity-40"
                                            >
                                                {backfillDone ? 'Already imported' : 'Import from past sessions'}
                                            </button>
                                            <Link href="/analyze" className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl font-medium hover:bg-[var(--accent)]/90 transition-all shadow-md shadow-[var(--accent)]/20">
                                                Analyze Something →
                                            </Link>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {!loading && hasAnyConcepts && isEmpty && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                {tab === 'needs_work' ? (
                                    <>
                                        <div className="w-3 h-3 rounded-full bg-[#2A5C45] mx-auto mb-4" />
                                        <p className="text-[var(--text)] font-medium mb-1">Nothing needs work right now.</p>
                                        <p className="text-[var(--muted)] text-sm">All your concepts are Solid or Developing. Keep it up.</p>
                                    </>
                                ) : (
                                    <p className="text-[var(--muted)]">Complete more sessions to build your Solid concept collection.</p>
                                )}
                            </div>
                        )}

                        {}
                        {!loading && filteredNodes.length > 0 && (
                            viewMode === 'flat' ? (

                                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
                                    {filteredNodes.map(node => (
                                        <ConceptRow key={node.id} node={node} showTopic selected={selectedNodeId === node.id} onClick={() => setSelectedNodeId(node.id === selectedNodeId ? null : node.id)} />
                                    ))}
                                </div>
                            ) : (

                                <div className="space-y-4">
                                    {topicGroups.map(({ topic, nodes: topicNodes }) => {
                                        const needsWork = topicNodes.filter(n => n.current_mastery === 'shaky' || n.current_mastery === 'revisit').length;
                                        const isCollapsed = collapsedTopics.has(topic.id);
                                        return (
                                            <div key={topic.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
                                                <button
                                                    onClick={() => toggleTopic(topic.id)}
                                                    className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-black/[0.02] transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {isCollapsed ? <ChevronRight size={16} className="text-[var(--muted)]" /> : <ChevronDown size={16} className="text-[var(--muted)]" />}
                                                        <span className="font-bold text-[var(--text)]">{topic.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        {needsWork > 0 && (
                                                            <span className="text-xs font-bold text-[#B8860B] bg-[#B8860B]/10 px-2 py-0.5 rounded-full">{needsWork} need work</span>
                                                        )}
                                                        <span className="text-xs text-[var(--muted)]">{topicNodes.length} concept{topicNodes.length !== 1 ? 's' : ''}</span>
                                                    </div>
                                                </button>
                                                {!isCollapsed && (
                                                    <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
                                                        {topicNodes.map(node => (
                                                            <ConceptRow key={node.id} node={node} showTopic={false} selected={selectedNodeId === node.id} onClick={() => setSelectedNodeId(node.id === selectedNodeId ? null : node.id)} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {}
                                    {uncategorized.length > 0 && (
                                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
                                            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
                                                <ChevronDown size={16} className="text-[var(--muted)]" />
                                                <span className="font-bold text-[var(--muted)] text-sm">Uncategorized</span>
                                                <span className="text-xs text-[var(--muted)] ml-auto">{uncategorized.length} concept{uncategorized.length !== 1 ? 's' : ''}</span>
                                            </div>
                                            <div className="divide-y divide-[var(--border)]">
                                                {uncategorized.map(node => (
                                                    <ConceptRow key={node.id} node={node} showTopic={false} selected={selectedNodeId === node.id} onClick={() => setSelectedNodeId(node.id === selectedNodeId ? null : node.id)} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                </div>

                {}
                {selectedNodeId && (
                    <div className="fixed right-0 top-0 md:top-auto md:bottom-0 w-full md:w-[420px] bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl z-50 md:h-screen overflow-hidden flex flex-col">
                        <DetailPanel nodeId={selectedNodeId} onClose={() => setSelectedNodeId(null)} />
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

function ConceptRow({ node, showTopic, selected, onClick }: { node: KnowledgeNode; showTopic: boolean; selected: boolean; onClick: () => void }) {
    const masteryState = (node.current_mastery || 'developing') as MasteryState;
    const cfg = MASTERY_CONFIG[masteryState] || MASTERY_CONFIG['developing'];
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-5 py-3.5 hover:bg-black/[0.02] transition-colors group text-left ${selected ? 'bg-[var(--accent-light)]' : ''}`}
        >
            <MasteryDot state={masteryState} size={9} />
            <span className="flex-1 min-w-0">
                <span className="text-[15px] font-medium text-[var(--text)] truncate block">{node.display_name || node.canonical_name || 'Unknown Concept'}</span>
                {showTopic && node.topic_name && (
                    <span className="text-[12px] text-[var(--muted)]">{node.topic_name}</span>
                )}
            </span>
            <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs font-bold ${cfg.color} hidden sm:block`}>{cfg.label}</span>
                <span className="text-xs text-[var(--muted)]">{node.session_count || 0} {(node.session_count === 1) ? 'session' : 'sessions'}</span>
                <span className={`text-xs ${cfg.color} opacity-0 group-hover:opacity-100 transition-opacity font-medium`}>View →</span>
            </div>
        </button>
    );
}
