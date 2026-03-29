import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { 
    Plus, 
    Calendar, 
    Target, 
    TrendingUp, 
    ChevronRight, 
    Clock, 
    CheckCircle2,
    BookOpen,
    AlertCircle,
    Map
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ExamSchedule } from '@/types/serify';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export default function ScheduleIndex() {
    const { user, token } = useAuth();
    const router = useRouter();
    const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchSchedules = async () => {
            try {
                const { data, error } = await supabase
                    .from('exam_roadmaps')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setSchedules(data || []);
            } catch (err) {
                console.error('Error fetching schedules:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSchedules();
    }, [user]);

    return (
        <DashboardLayout>
            <Head>
                <title>Schedules | Serify</title>
            </Head>

            <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="paper-card p-6 h-48 animate-pulse bg-[var(--surface-raised)]" />
                        ))}
                    </div>
                ) : schedules.length === 0 ? (
                    <div className="paper-card p-16 text-center space-y-6 max-w-2xl mx-auto mt-12 bg-gradient-to-br from-[var(--surface)] to-[var(--bg)]">
                        <div className="w-20 h-20 border-2 border-dashed border-[var(--border-soft)] rounded-full flex items-center justify-center mx-auto text-[var(--muted-light)]">
                            <Target size={32} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-mono text-[var(--muted)] max-w-sm mx-auto">
                                You haven&apos;t architected any learning paths yet. Start by defining an exam goal and deadline.
                            </p>
                        </div>
                        <div className="pt-4">
                            <button 
                                onClick={() => router.push('/schedule/create')}
                                className="btn-primary px-8"
                            >
                                <Plus size={18} />
                                Start Your First Schedule
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* New Schedule Action Card */}
                        <div 
                            onClick={() => router.push('/schedule/create')}
                            className="paper-card p-6 flex flex-col items-center justify-center border-dashed border-2 bg-[var(--surface-raised)] group cursor-pointer hover:border-[var(--accent)] transition-all min-h-[200px]"
                        >
                            <div className="w-12 h-12 rounded-full border-2 border-dashed border-[var(--border-soft)] flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
                                <Plus size={24} className="text-[var(--muted)] group-hover:text-[var(--accent)]" />
                            </div>
                            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--muted)] group-hover:text-[var(--accent)]">
                                Architect New Schedule
                            </span>
                        </div>

                        {schedules.map((schedule) => (
                            <div 
                                key={schedule.id}
                                onClick={() => router.push(`/schedule/${schedule.id}`)}
                                className="paper-card p-6 space-y-5 group cursor-pointer hover:border-[var(--accent)] transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="w-10 h-10 border-2 border-[var(--border)] bg-[var(--surface-raised)] flex items-center justify-center text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--surface)] transition-colors" style={{boxShadow: 'var(--shadow-hard-sm)'}}>
                                        <Target size={20} />
                                    </div>
                                    <div className="washi-tape washi-developing">
                                        {Math.round((schedule.completed_sessions / schedule.total_sessions) * 100)}% Complete
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-lg font-display font-bold leading-tight line-clamp-2 min-h-[3.5rem] group-hover:text-[var(--accent)] transition-colors">
                                        {schedule.title}
                                    </h3>
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--muted)]">
                                        <Calendar size={12} />
                                        Target: {format(new Date(schedule.exam_date), 'MMM dd, yyyy')}
                                    </div>
                                </div>

                                <div className="pt-2 flex items-center justify-between border-t border-[var(--border-soft)] border-dashed">
                                    <div className="flex -space-x-2">
                                        {/* Simple visualization of sessions */}
                                        {Array.from({ length: Math.min(schedule.total_sessions, 5) }).map((_, i) => (
                                            <div 
                                                key={i} 
                                                className={`w-6 h-6 rounded-full border-2 border-[var(--surface)] flex items-center justify-center text-[8px] font-bold ${
                                                    i < schedule.completed_sessions ? 'bg-[var(--accent)] text-white' : 'bg-[var(--border-soft)] text-white'
                                                }`}
                                            >
                                                {i + 1 === 5 && schedule.total_sessions > 5 ? '+' : ''}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-[10px] font-mono font-bold text-[var(--accent)] uppercase tracking-tighter flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        View Hub <ChevronRight size={14} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Info Card */}
                {schedules.length > 0 && (
                    <div className="paper-card p-8 bg-[var(--accent-soft)] border-[var(--accent)]/30 flex flex-col md:flex-row items-center gap-8">
                        <div className="w-16 h-16 shrink-0 bg-white border-2 border-[var(--accent)] rounded-2xl flex items-center justify-center text-[var(--accent)] shadow-hard-sm">
                            <TrendingUp size={32} />
                        </div>
                        <div className="space-y-2 flex-1 text-center md:text-left">
                            <h3 className="text-xl font-display font-bold">Adaptive Scheduling Enabled</h3>
                            <p className="text-sm font-mono text-[var(--muted)] leading-relaxed max-w-2xl">
                                Your schedules automatically adjust based on your performance. If you miss a session, we&apos;ll recalibrate the remaining path to ensure you still hit your goal by the target date.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
