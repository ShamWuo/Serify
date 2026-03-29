import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import SEO from '@/components/Layout/SEO';
import { 
    History, 
    Target, 
    Zap, 
    Clock, 
    Activity, 
    Layers, 
    Brain,
    ChevronRight,
    ArrowLeft,
    Calendar,
    Search,
    Filter,
    Trash2,
    X
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const TOOL_ICONS: Record<string, any> = {
    'test': Target,
    'quiz': Zap,
    'exam': Clock,
    'scenario': Activity,
    'flashcards': Layers,
    'review': Brain
};

export default function PracticeHistoryPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [sessions, setSessions] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTool, setFilterTool] = useState<string>('all');

    useEffect(() => {
        if (!user) return;

        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('practice_sessions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('started_at', { ascending: false });

                if (error) throw error;
                setSessions(data || []);
            } catch (error) {
                console.error("Error fetching practice history:", error);
                toast.error("Failed to load practice history");
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [user]);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!confirm("Are you sure you want to delete this session?")) return;

        try {
            const { error } = await supabase
                .from('practice_sessions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSessions(prev => prev.filter(s => s.id !== id));
            toast.success("Session deleted");
        } catch (error) {
            toast.error("Failed to delete session");
        }
    };

    const filteredSessions = sessions.filter(s => {
        const matchesSearch = !searchQuery || (s.topic || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterTool === 'all' || s.tool === filterTool;
        return matchesSearch && matchesFilter;
    });

    return (
        <DashboardLayout>
            <SEO title="Practice History | Serify" description="A record of all your practice sessions and results." />

            <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 md:py-10 bg-dot-grid relative z-10 pb-32 font-mono">
                <div className="max-w-5xl mx-auto space-y-10">
                    
                    {/* Header Unit */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <header className="space-y-4">
                            <button 
                                onClick={() => router.push('/practice')}
                                className="group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)] hover:text-[var(--accent)] transition-all bg-[var(--surface-raised)] border-2 border-[var(--border-soft)] px-3 py-1.5 shadow-hard-xs"
                            >
                                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> BACK TO WORKSHOP
                            </button>
                            <div className="space-y-2">
                                <h1 className="text-4xl font-display font-black text-[var(--text)] tracking-tighter uppercase flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[var(--bg)] border-4 border-[var(--ink)] flex items-center justify-center shadow-hard-sm">
                                        <History size={28} className="text-[var(--accent)]" /> 
                                    </div>
                                    Practice History
                                </h1>
                                <p className="text-[12px] font-mono text-[var(--muted)] border-l-2 border-[var(--accent)] pl-3 italic">Trace your growth through historical neural simulations.</p>
                            </div>
                        </header>

                        <div className="flex flex-col gap-3 min-w-[300px]">
                            <span className="text-[9px] font-black font-mono text-[var(--muted)] uppercase tracking-widest pl-1">Neural Search Engine</span>
                            <div className="input-bracket">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                                    <Search size={16} />
                                </div>
                                <input 
                                    type="text"
                                    placeholder="Filter by concept title..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="input-underline py-2.5 pl-10 pr-4 text-xs bg-transparent w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Filter Strip */}
                    <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide border-b-2 border-[var(--border)] border-dashed">
                        {['all', 'test', 'quiz', 'exam', 'scenario', 'flashcards'].map(tool => (
                            <button
                                key={tool}
                                onClick={() => setFilterTool(tool)}
                                className={`px-4 py-2 text-[10px] font-black italic border-2 transition-all uppercase tracking-widest ${
                                    filterTool === tool 
                                    ? 'bg-[var(--accent)] text-white border-[var(--ink)] shadow-hard-sm -translate-y-0.5' 
                                    : 'bg-[var(--surface-raised)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface)] shadow-hard-xs'
                                }`}
                                style={{ borderRadius: '2px' }}
                            >
                                {tool === 'all' ? 'All Units' : tool}
                            </button>
                        ))}
                    </div>

                    {/* History Feed */}
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center space-y-4">
                            <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent animate-spin rotate-12 shadow-hard-sm"></div>
                            <p className="text-[10px] font-black font-mono text-[var(--muted)] uppercase tracking-widest animate-pulse">Scanning Bio-Logs...</p>
                        </div>
                    ) : filteredSessions.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6">
                            {filteredSessions.map(session => {
                                const Icon = TOOL_ICONS[session.tool] || History;
                                return (
                                    <Link 
                                        key={session.id}
                                        href={`/practice/${session.tool}/${session.id}`}
                                        className="group bg-[var(--surface)] border-2 border-[var(--border)] p-6 hover:border-[var(--accent)] shadow-hard transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-grid-pattern opacity-5 -z-10 group-hover:scale-110 transition-transform" />
                                        
                                        <div className="flex items-start md:items-center gap-6">
                                            <div className={`w-16 h-16 border-2 border-[var(--ink)] flex items-center justify-center shrink-0 transition-transform group-hover:rotate-3 shadow-hard-sm ${
                                                session.tool === 'test' ? 'bg-blue-50 text-blue-600' :
                                                session.tool === 'quiz' ? 'bg-yellow-50 text-yellow-600' :
                                                session.tool === 'exam' ? 'bg-orange-50 text-orange-600' :
                                                'bg-purple-50 text-purple-600'
                                            }`}>
                                                <Icon size={32} />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] font-black font-mono uppercase tracking-[0.3em] text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">
                                                        {session.tool} UNIT
                                                    </span>
                                                    <div className="w-4 h-[1px] bg-[var(--border)]" />
                                                    <span className="text-[9px] font-black font-mono text-[var(--muted)] flex items-center gap-1.5 uppercase tracking-widest">
                                                        <Calendar size={12} /> {new Date(session.started_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <h3 className="text-2xl font-display font-black text-[var(--text)] tracking-tighter uppercase leading-tight group-hover:translate-x-1 transition-transform">
                                                    {session.topic || 'VAULT PROTOCOL'}
                                                </h3>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between md:justify-end gap-10 border-t-2 border-dashed md:border-none pt-4 md:pt-0 border-[var(--border-soft)]">
                                            <div className="flex flex-col md:items-end gap-1">
                                                {session.status === 'completed' ? (
                                                    <div className={`washi-tape ${
                                                        (session.overall_performance || 0) >= 80 ? 'washi-solid' :
                                                        (session.overall_performance || 0) < 50 ? 'washi-shaky' :
                                                        'washi-developing'
                                                    } !text-[9px] !py-0.5 !px-3 font-mono`}>
                                                        {session.overall_performance ? `PERF: ${session.overall_performance}%` : 'SUCCESS'}
                                                    </div>
                                                ) : (
                                                    <div className="washi-tape washi-revisit !text-[9px] !py-0.5 !px-3 font-mono uppercase tracking-widest">
                                                        IN_PROGRESS
                                                    </div>
                                                )}
                                                <span className="text-[9px] font-black font-mono text-[var(--muted)] uppercase tracking-tighter opacity-40">PROTOCOL ARCHIVE</span>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={(e) => handleDelete(session.id, e)}
                                                    className="p-2.5 bg-[var(--surface-raised)] border-2 border-[var(--border)] text-[var(--muted)] hover:text-red-600 hover:border-red-600 hover:shadow-hard-xs transition-all"
                                                    title="Decommission Session"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <div className="w-10 h-10 bg-[var(--ink)] flex items-center justify-center text-[var(--bg)] shadow-hard-xs group-hover:translate-x-1 transition-all">
                                                    <ChevronRight size={24} />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-24 bg-[var(--surface)] border-4 border-[var(--ink)] border-dashed shadow-hard animate-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 bg-[var(--bg)] border-2 border-[var(--ink)] flex items-center justify-center mx-auto mb-8 text-[var(--muted)] shadow-hard-sm rotate-6">
                                <History size={48} />
                            </div>
                            <h3 className="text-3xl font-display font-black text-[var(--text)] uppercase tracking-tighter mb-4">Archives Empty</h3>
                            <p className="text-[12px] font-mono text-[var(--muted)] max-w-sm mx-auto mb-10 italic uppercase leading-relaxed tracking-widest">
                                {searchQuery ? "No records match the current neuro-filter query." : "Zero biological performance logs detected in this mainframe."}
                            </p>
                            {!searchQuery && (
                                <button 
                                    onClick={() => router.push('/practice')}
                                    className="px-12 py-4 bg-[var(--accent)] text-white font-black text-sm uppercase tracking-[0.2em] shadow-hard hover:-translate-y-1 active:translate-y-1 transition-all border-2 border-[var(--ink)]"
                                >
                                    Start Session
                                </button>
                            )}
                        </div>
                    )}

                </div>
            </div>
            
            {/* Architectural Footer Branding */}
            <div className="fixed bottom-10 right-10 pointer-events-none opacity-20 flex items-center gap-4 z-40">
                <div className="text-right">
                    <div className="text-[8px] font-black font-mono uppercase tracking-[0.5em] text-[var(--ink)]">VER_3.0_STABLE</div>
                    <div className="text-[10px] font-black font-mono uppercase tracking-[0.2em] text-[var(--ink)]">SERIFY_PROTOCOL_LOGS</div>
                </div>
                <div className="w-1 h-12 bg-[var(--ink)]" />
            </div>
        </DashboardLayout>
    );
}
