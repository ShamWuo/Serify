import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { 
    Calendar, 
    Target, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    ChevronRight, 
    Zap, 
    Calendar as CalendarIcon,
    ArrowLeft,
    TrendingUp,
    Play,
    Settings,
    Layout
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ExamRoadmap, RoadmapTopic, RoadmapSession } from '@/types/serify';
import { supabase } from '@/lib/supabase';
import { format, isPast, isToday, addDays, startOfDay } from 'date-fns';

export default function ScheduleHub() {
    const { user, token } = useAuth();
    const router = useRouter();
    const { id } = router.query;

    const [schedule, setSchedule] = useState<ExamRoadmap | null>(null);
    const [scheduleTopics, setScheduleTopics] = useState<RoadmapTopic[]>([]);
    const [scheduleSessions, setScheduleSessions] = useState<RoadmapSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !id) return;

        const fetchData = async () => {
            try {
                // Fetch Roadmap
                const { data: rm, error: rmErr } = await supabase
                    .from('exam_roadmaps')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (rmErr) throw rmErr;
                setSchedule(rm);

                // Fetch Topics
                const { data: tp, error: tpErr } = await supabase
                    .from('roadmap_topics')
                    .select('*')
                    .eq('roadmap_id', id)
                    .order('position', { ascending: true });

                if (tpErr) throw tpErr;
                setScheduleTopics(tp || []);

                // Fetch Sessions
                const { data: ss, error: ssErr } = await supabase
                    .from('roadmap_sessions')
                    .select('*')
                    .eq('roadmap_id', id)
                    .order('scheduled_date', { ascending: true });

                if (ssErr) throw ssErr;
                setScheduleSessions(ss || []);

            } catch (err: any) {
                console.error('Error fetching roadmap data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, id]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                        <p className="font-mono text-sm text-[var(--muted)]">Loading Schedule Blueprint...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !schedule) {
        return (
            <DashboardLayout>
                <div className="max-w-md mx-auto mt-20 p-8 paper-card text-center space-y-4">
                    <AlertCircle size={40} className="mx-auto text-[var(--warn)]" />
                    <h2 className="text-xl font-display font-bold">Blueprint Undeliverable</h2>
                    <p className="text-sm font-mono text-[var(--muted)]">{error || 'Roadmap not found.'}</p>
                    <button onClick={() => router.push('/schedule')} className="btn-secondary w-full">
                        Return to Schedules
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const todaySession = scheduleSessions.find(s => isToday(new Date(s.scheduled_date)));
    const progress = Math.round((schedule.completed_sessions / schedule.total_sessions) * 100);

    return (
        <DashboardLayout backLink="/schedule" backLinkText="All Schedules">
            <Head>
                <title>{schedule.title} | Serify Hub</title>
            </Head>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
                {/* Header Section */}
                <div className="grid lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)] text-[10px] font-bold tracking-widest uppercase shadow-hard-sm">
                                MISSION ACTIVE
                            </div>
                            <div className="text-[10px] font-mono text-[var(--muted)]">
                                SESSIONS MISSED: <span className={schedule.sessions_missed > 0 ? 'text-[var(--warn)]' : ''}>{schedule.sessions_missed}</span>
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight leading-[1.1]">
                            {schedule.title}
                        </h1>
                        <div className="flex flex-wrap gap-4 pt-2">
                            <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted)]">
                                <Calendar size={14} />
                                Target: {format(new Date(schedule.exam_date), 'MMM dd, yyyy')}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted)]">
                                <Clock size={14} />
                                {schedule.session_length_minutes}m daily capacity
                            </div>
                            <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted)]">
                                <Target size={14} />
                                {schedule.total_topics} Key Topics
                            </div>
                        </div>
                    </div>

                    <div className="paper-card p-6 bg-gradient-to-br from-[var(--surface-raised)] to-[var(--surface)] relative overflow-hidden">
                        <div className="relative z-10 space-y-6">
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Mastery Arc</p>
                                    <h2 className="text-4xl font-display font-black">{progress}%</h2>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Streak</p>
                                    <div className="flex items-center gap-1 text-xl font-display font-bold text-[var(--accent)]">
                                        <TrendingUp size={18} />
                                        {schedule.current_streak}d
                                    </div>
                                </div>
                            </div>
                            
                            <div className="w-full h-3 border-2 border-[var(--border)] bg-[var(--bg)] p-[2px]">
                                <div 
                                    className="h-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] transition-all duration-1000"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            <div className="flex justify-between text-[10px] font-mono text-[var(--muted)]">
                                <span>{schedule.completed_sessions} / {schedule.total_sessions} Sessions</span>
                                <span>Completion Goal Reached</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-10">
                    {/* Left Column: Schedule & Today */}
                    <div className="lg:col-span-2 space-y-10">
                        {/* Today's Focus Card */}
                        <section className="space-y-4">
                            <h3 className="section-title">Today&apos;s Strategic Focus</h3>
                            {todaySession ? (
                                <div className="paper-card p-8 border-2 border-[var(--accent)] shadow-hard group hover:scale-[1.005] transition-all bg-[var(--surface)]">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-[var(--accent)] font-bold text-[10px] uppercase tracking-widest">
                                                <Zap size={14} fill="currentColor" />
                                                High Yield Session
                                            </div>
                                            <h4 className="text-2xl font-display font-bold">
                                                {scheduleTopics.find(t => t.id === todaySession.topic_id)?.title || 'Current Topic'}
                                            </h4>
                                            <p className="text-sm font-mono text-[var(--muted)]">
                                                Concept Phase: {todaySession.session_type.toUpperCase()} • {todaySession.scheduled_length_minutes} Minutes
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => router.push(`/learn/schedule/${todaySession.id}`)}
                                            className="btn-primary group py-4 px-10 text-lg shadow-hard-lg"
                                        >
                                            <Play size={20} fill="currentColor" />
                                            Initiate Session
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="paper-card p-8 border-2 border-dashed border-[var(--border-soft)] text-center space-y-4 bg-[var(--surface-raised)]">
                                    <CalendarIcon size={32} className="mx-auto text-[var(--muted-light)]" />
                                    <div className="space-y-1">
                                        <h4 className="text-lg font-display font-bold text-[var(--muted)]">Planned Strategic Rest</h4>
                                        <p className="text-xs font-mono text-[var(--muted-light)]">No sessions scheduled for today. Recharge for tomorrow&apos;s sprint.</p>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Schedule Feed */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-soft)] border-dashed">
                                <h3 className="section-title pb-0 border-none">Timeline</h3>
                                <div className="flex items-center gap-4 text-[10px] font-mono text-[var(--muted)]">
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[var(--accent)]" /> Done</div>
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[var(--surface-raised)] border border-[var(--border)]" /> Scheduled</div>
                                </div>
                            </div>
                            
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
                                {scheduleSessions.map((session, idx) => {
                                    const sessionDate = new Date(session.scheduled_date);
                                    const isPastDate = isPast(sessionDate) && !isToday(sessionDate);
                                    const topic = scheduleTopics.find(t => t.id === session.topic_id);
                                    
                                    return (
                                        <div 
                                            key={session.id}
                                            className={`p-4 border-2 flex items-center gap-4 transition-all ${
                                                session.status === 'completed'
                                                    ? 'bg-[var(--accent-soft)]/20 border-[var(--accent)]/30 opacity-75'
                                                    : session.status === 'missed'
                                                    ? 'bg-[var(--warn-soft)]/20 border-[var(--warn)]/30'
                                                    : isToday(sessionDate)
                                                    ? 'bg-[var(--surface)] border-[var(--accent)] shadow-hard-sm'
                                                    : 'bg-[var(--surface)] border-[var(--border-soft)] hover:border-[var(--border)]'
                                            }`}
                                            style={{ borderRadius: '4px' }}
                                        >
                                            <div className="w-16 flex flex-col items-center justify-center border-r border-[var(--border-soft)] pr-4 shrink-0">
                                                <span className="text-[10px] font-mono font-black uppercase text-[var(--muted)]">{format(sessionDate, 'EEE')}</span>
                                                <span className="text-lg font-display font-black leading-none">{format(sessionDate, 'dd')}</span>
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <h5 className="font-bold text-sm truncate">{topic?.title || 'Unknown Topic'}</h5>
                                                <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--muted)] uppercase tracking-tight">
                                                    <span>{session.session_type}</span>
                                                    <span>•</span>
                                                    <span>{session.scheduled_length_minutes} min</span>
                                                </div>
                                            </div>

                                            <div className="shrink-0">
                                                {session.status === 'completed' ? (
                                                    <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center">
                                                        <CheckCircle2 size={16} />
                                                    </div>
                                                ) : session.status === 'missed' ? (
                                                    <div className="w-8 h-8 rounded-full border-2 border-[var(--warn)] text-[var(--warn)] flex items-center justify-center">
                                                        <AlertCircle size={16} />
                                                    </div>
                                                ) : isToday(sessionDate) ? (
                                                    <button className="btn-primary py-1 px-4 text-[10px]" onClick={() => router.push(`/learn/schedule/${session.id}`)}>
                                                        START
                                                    </button>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full border-2 border-[var(--border-soft)]" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Topics & Analysis */}
                    <div className="space-y-10">
                        {/* Topics Breakdown */}
                        <section className="space-y-6">
                            <h3 className="section-title">Concept Coverage</h3>
                            <div className="space-y-4">
                                {scheduleTopics.map(topic => (
                                    <div key={topic.id} className="paper-card p-4 space-y-3 group hover:border-[var(--accent)] transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <h5 className="font-bold text-sm group-hover:text-[var(--accent)] transition-colors">{topic.title}</h5>
                                                <p className="text-[10px] font-mono text-[var(--muted)]">{topic.unit}</p>
                                            </div>
                                            <div className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-tighter border ${
                                                topic.weight >= 3 ? 'bg-[var(--warn-soft)] border-[var(--warn)] text-[var(--warn)]' : 
                                                topic.weight === 2 ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]' :
                                                'bg-[var(--surface-raised)] border-[var(--border)] text-[var(--muted)]'
                                            }`}>
                                                {topic.weight >= 3 ? 'HIGH YIELD' : topic.weight === 2 ? 'Standard' : 'Elective'}
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-mono">
                                                <span className="text-[var(--muted)]">Sessions Completed</span>
                                                <span className="font-bold">{topic.sessions_completed} / {topic.sessions_allocated}</span>
                                            </div>
                                            <div className="w-full h-1 bg-[var(--bg)] border border-[var(--border-soft)]">
                                                <div 
                                                    className="h-full bg-[var(--accent)] transition-all ease-in-out duration-700"
                                                    style={{ width: `${(topic.sessions_completed / topic.sessions_allocated) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Quick Actions */}
                        <section className="space-y-4">
                            <h3 className="section-title">Operations</h3>
                            <div className="grid gap-3">
                                <button 
                                    onClick={async () => {
                                        if (!confirm('This will redistribute your remaining sessions based on your exam date. Traditional "Scheduled" days will move. Proceed?')) return;
                                        setLoading(true);
                                        try {
                                            const res = await fetch('/api/serify/schedule/reschedule', {
                                                method: 'POST',
                                                headers: { 
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${token}`
                                                },
                                                body: JSON.stringify({ scheduleId: schedule.id })
                                            });
                                            if (!res.ok) throw new Error('Reschedule failed');
                                            router.reload();
                                        } catch (err: any) {
                                            setError(err.message);
                                            setLoading(false);
                                        }
                                    }}
                                    className="paper-card p-4 flex items-center justify-between group hover:border-[var(--accent)] transition-all bg-[var(--surface)] text-left w-full"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:border-[var(--accent)]">
                                            <Layout size={16} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold">Reschedule Schedule</p>
                                            <p className="text-[10px] text-[var(--muted)] font-mono">Calibrate timeline based on current pace</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-[var(--muted-light)]" />
                                </button>
                                
                                <button className="paper-card p-4 flex items-center justify-between group hover:border-[var(--accent)] transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:border-[var(--accent)]">
                                            <Settings size={16} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold">Hub Configuration</p>
                                            <p className="text-[10px] text-[var(--muted)] font-mono">Manage notification & study settings</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-[var(--muted-light)]" />
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
