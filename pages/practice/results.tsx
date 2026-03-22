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
    Trash2
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

            <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 md:py-8 relative z-10 pb-32">
                <div className="max-w-5xl mx-auto space-y-8">
                    
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <header className="space-y-2">
                            <button 
                                onClick={() => router.push('/practice')}
                                className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors mb-2"
                            >
                                <ArrowLeft size={16} /> Back to Practice
                            </button>
                            <h1 className="text-3xl font-display text-[var(--text)] tracking-tight flex items-center gap-3">
                                <History size={28} className="text-[var(--accent)]" /> Practice History
                            </h1>
                            <p className="text-[var(--muted)]">Review your past performance and track your growth.</p>
                        </header>

                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                                <input 
                                    type="text"
                                    placeholder="Search topics..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-white border border-[var(--border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none w-full md:w-64"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                        {['all', 'test', 'quiz', 'exam', 'scenario', 'flashcards'].map(tool => (
                            <button
                                key={tool}
                                onClick={() => setFilterTool(tool)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all whitespace-nowrap ${
                                    filterTool === tool 
                                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md' 
                                    : 'bg-white text-[var(--muted)] border-[var(--border)] hover:border-slate-300'
                                }`}
                            >
                                {tool === 'all' ? 'All Activities' : tool.charAt(0).toUpperCase() + tool.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Session List */}
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center space-y-4">
                            <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[var(--muted)] animate-pulse">Loading history...</p>
                        </div>
                    ) : filteredSessions.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredSessions.map(session => {
                                const Icon = TOOL_ICONS[session.tool] || History;
                                return (
                                    <Link 
                                        key={session.id}
                                        href={`/practice/${session.tool}/${session.id}`}
                                        className="group bg-white border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--accent)]/30 hover:shadow-lg transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                                                session.tool === 'test' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                session.tool === 'quiz' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                session.tool === 'exam' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                'bg-purple-50 text-purple-600 border-purple-100'
                                            }`}>
                                                <Icon size={24} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">
                                                        {session.tool}
                                                    </span>
                                                    <span className="text-[var(--border)]">•</span>
                                                    <span className="text-[10px] font-medium text-[var(--muted)] flex items-center gap-1">
                                                        <Calendar size={10} /> {new Date(session.started_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-medium text-[var(--text)] line-clamp-1">
                                                    {session.topic || 'Vault Review'}
                                                </h3>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-4 md:pt-0">
                                            <div className="flex flex-col md:items-end">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                                    session.status === 'completed' 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                                    : 'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                    {session.status === 'completed' ? (session.overall_performance ? `${session.overall_performance}% Score` : 'Completed') : 'In Progress'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={(e) => handleDelete(session.id, e)}
                                                    className="p-2 text-[var(--muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <ChevronRight size={20} className="text-[var(--border)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white border border-[var(--border)] border-dashed rounded-3xl animate-scale-in">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <History size={32} />
                            </div>
                            <h3 className="text-xl font-display text-[var(--text)] mb-2">No history found</h3>
                            <p className="text-[var(--muted)] max-w-xs mx-auto mb-8">
                                {searchQuery ? "No sessions match your search criteria." : "You haven't completed any practice sessions yet."}
                            </p>
                            {!searchQuery && (
                                <button 
                                    onClick={() => router.push('/practice')}
                                    className="px-6 py-2 bg-[var(--accent)] text-white font-bold rounded-xl shadow-lg shadow-[var(--accent)]/10 hover:-translate-y-0.5 transition-all"
                                >
                                    Start Practicing
                                </button>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </DashboardLayout>
    );
}
