import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import SEO from '@/components/Layout/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
    Brain, 
    History, 
    AlertCircle,
    BookOpen,
    Zap,
    Clock,
    ChevronRight,
    Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default function ConceptDetailPage() {
    const { user, token } = useAuth();
    const router = useRouter();
    const { id } = router.query;
    const [concept, setConcept] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !id) return;

        const fetchConceptDetails = async () => {
            setLoading(true);
            try {
                
                const { data: node, error: nodeError } = await supabase
                    .from('knowledge_nodes')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (nodeError) throw nodeError;

                
                let sessionIds = node.session_ids || [];
                if (sessionIds.length > 0) {
                    const { data: sessionData, error: sessionError } = await supabase
                        .from('reflection_sessions')
                        .select('id, title, content_type, created_at, depth_score')
                        .in('id', sessionIds);
                    
                    if (sessionError) throw sessionError;
                    setSessions(sessionData || []);
                }

                setConcept(node);
            } catch (err) {
                console.error('[vault-detail] Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchConceptDetails();
    }, [user, id]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-pulse flex flex-col items-center gap-4">
                        <div className="w-12 h-12 bg-[var(--border)] rounded-2xl" />
                        <div className="h-4 w-32 bg-[var(--border)] rounded" />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!concept) {
        return (
            <DashboardLayout>
                <div className="max-w-3xl mx-auto py-20 text-center">
                    <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                    <h1 className="text-2xl font-bold mb-2">Concept not found</h1>
                    <p className="text-[var(--muted)] mb-8">This concept might have been archived or deleted.</p>
                    <Link href="/vault" className="text-[var(--accent)] font-bold">Return to Vault</Link>
                </div>
            </DashboardLayout>
        );
    }

    const masteryColors = {
        mastered: 'text-emerald-500 bg-emerald-50 border-emerald-100',
        solid: 'text-blue-500 bg-blue-50 border-blue-100',
        developing: 'text-amber-500 bg-amber-50 border-amber-100',
        shaky: 'text-orange-500 bg-orange-50 border-orange-100',
        revisit: 'text-red-500 bg-red-50 border-red-100',
    };

    return (
        <DashboardLayout backLink="/vault" backLinkText="Back to Vault">
            <SEO title={concept.display_name} />
            
            <div className="max-w-4xl mx-auto px-6 py-12">
                <header className="mb-12">
                    <div className="flex items-start justify-between gap-6 mb-6">
                        <div className="min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${masteryColors[concept.current_mastery as keyof typeof masteryColors] || 'bg-gray-50 text-gray-500'}`}>
                                    {concept.current_mastery}
                                </span>
                                <span className="text-[10px] text-[var(--muted)] font-bold flex items-center gap-1">
                                    <Clock size={12} />
                                    Updated {formatDistanceToNow(new Date(concept.updated_at), { addSuffix: true })}
                                </span>
                            </div>
                            <h1 className="text-4xl font-display text-[var(--text)] mb-4">{concept.display_name}</h1>
                            <p className="text-lg text-[var(--muted)] leading-relaxed italic">
                                &quot;{concept.definition || 'No definition provided.'}&quot;
                            </p>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/5 border border-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] shrink-0">
                            <Brain size={32} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
                            <div className="text-[10px] font-black tracking-widest text-[var(--muted)] uppercase mb-1">Sessions</div>
                            <div className="text-xl font-bold">{concept.session_count}</div>
                        </div>
                        <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
                            <div className="text-[10px] font-black tracking-widest text-[var(--muted)] uppercase mb-1">Hints</div>
                            <div className="text-xl font-bold">{concept.hint_request_count}</div>
                        </div>
                        <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
                            <div className="text-[10px] font-black tracking-widest text-[var(--muted)] uppercase mb-1">Skips</div>
                            <div className="text-xl font-bold">{concept.skip_count}</div>
                        </div>
                        <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
                            <div className="text-[10px] font-black tracking-widest text-[var(--muted)] uppercase mb-1">Status</div>
                            <div className="text-xl font-bold capitalize">{concept.added_manually ? 'Manual' : 'AI Map'}</div>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="md:col-span-2 space-y-12">
                        {}
                        {concept.synthesis && (
                            <section>
                                <h2 className="text-sm font-black uppercase tracking-widest text-[var(--muted)] mb-6 flex items-center gap-2">
                                    <Sparkles size={14} className="text-amber-500" />
                                    AI Synthesis
                                </h2>
                                <div className="p-6 bg-gradient-to-br from-white to-gray-50 border border-emerald-100 rounded-2xl shadow-sm leading-relaxed text-[var(--text)]">
                                    {concept.synthesis.summary}
                                </div>
                            </section>
                        )}

                        {}
                        <section>
                            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--muted)] mb-6 flex items-center gap-2">
                                <History size={14} />
                                Learning Context
                            </h2>
                            <div className="space-y-4">
                                {sessions.length > 0 ? sessions.map(session => (
                                    <Link 
                                        key={session.id}
                                        href={`/session/${session.id}/feedback`}
                                        className="flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)]/30 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">
                                                <BookOpen size={14} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-[var(--text)]">{session.title}</div>
                                                <div className="text-[10px] text-[var(--muted)]">{new Date(session.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className="text-[var(--muted)]" />
                                    </Link>
                                )) : (
                                    <div className="p-6 border-2 border-dashed border-[var(--border)] rounded-xl text-center text-sm text-[var(--muted)]">
                                        No linked sessions found for this concept.
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="space-y-10">
                        {}
                        <section>
                            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--muted)] mb-6">Mastery Flow</h2>
                            <div className="space-y-3">
                                <Link 
                                    href={`/practice?conceptIds=${concept.id}`}
                                    className="flex items-center gap-3 p-4 bg-[var(--accent)] text-white rounded-2xl shadow-lg shadow-[var(--accent)]/20 hover:scale-[1.02] transition-all font-bold text-sm"
                                >
                                    <Zap size={16} fill="currentColor" />
                                    Flashcards
                                </Link>
                                <Link 
                                    href={`/practice?conceptIds=${concept.id}&mode=quiz`}
                                    className="flex items-center justify-center gap-2 p-4 bg-white border border-[var(--border)] text-[var(--text)] rounded-2xl hover:bg-gray-50 transition-all font-bold text-sm"
                                >
                                    Take Diagnostic
                                </Link>
                            </div>
                        </section>

                        {}
                        <section className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-3xl">
                            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-4">Mastery Metrics</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-[10px] uppercase font-bold text-[var(--muted)] mb-2">
                                        <span>Current Level</span>
                                        <span>{concept.current_mastery === 'mastered' ? '100%' : '65%'}</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-[var(--accent)] rounded-full"
                                            style={{ width: concept.current_mastery === 'mastered' ? '100%' : '65%' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
