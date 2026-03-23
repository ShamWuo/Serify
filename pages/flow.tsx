import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import SEO from '@/components/Layout/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
    Zap, 
    ChevronRight, 
    Play, 
    Clock, 
    Target,
    Brain,
    Loader2,
    Calendar,
    BookOpen
} from 'lucide-react';
import Link from 'next/link';

interface FlowSessionInfo {
    id: string;
    curriculum_title?: string;
    curriculum_id?: string;
    concepts_completed: string[];
    total_concepts: number;
    last_activity_at: string;
    current_concept_id: string;
}

export default function FlowModePage() {
    const { user, token } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [activeSessions, setActiveSessions] = useState<FlowSessionInfo[]>([]);
    const [recentCurricula, setRecentCurricula] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                
                const { data: sessions, error: sessionError } = await supabase
                    .from('flow_sessions')
                    .select(`
                        id, 
                        status, 
                        last_activity_at, 
                        concepts_completed,
                        current_concept_id,
                        curriculum_id,
                        reflection_session:reflection_session_id (
                            title
                        ),
                        curriculum:curriculum_id (
                            title
                        )
                    `)
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .order('last_activity_at', { ascending: false });

                if (sessionError) throw sessionError;

                
                const { data: curricula, error: currError } = await supabase
                    .from('curricula')
                    .select('id, title, concept_count, created_at')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (currError) throw currError;

                setActiveSessions(sessions?.map(s => ({
                    id: s.id,
                    curriculum_title: (s as any).curriculum?.title || (s as any).reflection_session?.title || 'Continuous Flow',
                    curriculum_id: s.curriculum_id,
                    concepts_completed: s.concepts_completed || [],
                    total_concepts: (s.concepts_completed?.length || 0) + 5, 
                    last_activity_at: s.last_activity_at,
                    current_concept_id: s.current_concept_id
                })) || []);

                setRecentCurricula(curricula || []);
            } catch (err) {
                console.error('[flow] Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const startNewFlow = async (curriculumId: string) => {
        try {
            const res = await fetch('/api/serify/start-curriculum-flow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ curriculumId })
            });

            if (res.ok) {
                const { flowSessionId } = await res.json();
                router.push(`/learn/curriculum/${curriculumId}/flow?session=${flowSessionId}`);
            }
        } catch (err) {
            console.error('[flow] Error starting flow:', err);
        }
    };

    return (
        <DashboardLayout>
            <SEO title="Learn Mode" description="Guided step-by-step learning journey." />
            
            <div className="max-w-5xl mx-auto px-6 py-12 pb-32">
                <header className="mb-12">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm border border-purple-200">
                            <Zap size={22} fill="currentColor" />
                        </div>
                        <h1 className="text-3xl font-display text-[var(--text)]">Learn Mode</h1>
                    </div>
                    <p className="text-[var(--muted)] max-w-2xl">
                        Guided learning journeys through your roadmaps and concepts. We handle the structure, you handle the mastery.
                    </p>
                </header>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {}
                        <section>
                            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--muted)] mb-6 flex items-center gap-2">
                                <Clock size={14} />
                                Ongoing Lessons
                            </h2>
                            
                            {activeSessions.length > 0 ? (
                                <div className="space-y-4">
                                    {activeSessions.map(session => (
                                        <button
                                            key={session.id}
                                            onClick={() => router.push(`/learn/curriculum/${session.curriculum_id}/flow?session=${session.id}`)}
                                            className="w-full text-left p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl hover:border-purple-300 hover:shadow-md transition-all group relative overflow-hidden glass"
                                        >
                                            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 opacity-50" />
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="font-bold text-[var(--text)] group-hover:text-purple-600 transition-colors">
                                                    {session.curriculum_title}
                                                </h3>
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-600 border border-purple-100 rounded-full">
                                                    RESUME
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                                                <div className="flex items-center gap-1">
                                                    <Target size={12} />
                                                    {session.concepts_completed.length} concepts mastered
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    Last seen {new Date(session.last_activity_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-purple-600">
                                                Continue Journey <ChevronRight size={14} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 border-2 border-dashed border-[var(--border)] rounded-2xl text-center">
                                    <Brain className="mx-auto text-[var(--muted)] opacity-30 mb-4" size={32} />
                                    <p className="text-sm text-[var(--muted)]">No active lessons. Pick a roadmap to start.</p>
                                </div>
                            )}
                        </section>

                        {}
                        <section>
                            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--muted)] mb-6 flex items-center gap-2">
                                <BookOpen size={14} />
                                Available Roadmaps
                            </h2>
                            
                            <div className="space-y-4">
                                {recentCurricula.map(curr => (
                                    <div
                                        key={curr.id}
                                        className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex items-center justify-between group hover:border-[var(--accent)]/30 transition-all shadow-sm"
                                    >
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-[var(--text)] line-clamp-1 mb-1">
                                                {curr.title}
                                            </h3>
                                            <p className="text-xs text-[var(--muted)]">
                                                {curr.concept_count} fundamental concepts
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => startNewFlow(curr.id)}
                                            className="shrink-0 w-10 h-10 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] group-hover:bg-[var(--accent)] group-hover:text-white group-hover:border-[var(--accent)] transition-all"
                                        >
                                            <Play size={16} fill="currentColor" />
                                        </button>
                                    </div>
                                ))}
                                
                                <Link
                                    href="/learn"
                                    className="block w-full text-center py-4 border-2 border-dashed border-[var(--border)] rounded-2xl text-sm font-medium text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-all"
                                >
                                    + Create New Roadmap
                                </Link>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
