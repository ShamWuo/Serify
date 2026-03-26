import React from 'react';
import { Brain, Sparkles, Zap, ArrowRight, Target, ChevronRight, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/router';
import SmartInputCard from './SmartInputCard';
import RecentSessions from './RecentSessions';
import NeedsAttention from './NeedsAttention';
import ActivityDots from './ActivityDots';
import QuickLaunch from './QuickLaunch';
import { RoadmapModal } from './RoadmapModal';
import { InterviewSimulator } from './InterviewSimulator';

interface DashboardV2Props {
    user: any;
    latestSessions: any[];
    focusConcepts: any[];
    activityDays: boolean[];
    streak: number;
    trend: string;
    vaultCount: number;
    handleAnalyze: (data: any) => Promise<void>;
    isDemo?: boolean;
    loading?: boolean;
}

export default function DashboardV2({
    user,
    latestSessions,
    focusConcepts,
    activityDays,
    streak,
    trend,
    vaultCount,
    handleAnalyze,
    isDemo,
    loading
}: DashboardV2Props) {
    const router = useRouter();
    const [isRoadmapModalOpen, setIsRoadmapModalOpen] = React.useState(false);
    const [isInterviewModalOpen, setIsInterviewModalOpen] = React.useState(false);

    return (
        <div className="max-w-[1400px] mx-auto px-6 py-10 md:py-16 space-y-10 animate-fade-in font-mono">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight leading-none text-[var(--text)]">
                        Hey, <span className="text-[var(--accent)]">{user?.displayName?.split(' ')?.[0] || 'friend'}</span> ✦
                    </h1>
                    <p className="text-[12px] font-mono text-[var(--muted)]">{'// your knowledge is growing — keep it up'}</p>
                </div>
                {/* Streak Tally Box */}
                {streak > 0 && (
                    <div className="tally-box shrink-0">
                        <span className="text-[var(--accent)]">🔥</span>
                        <span>{streak}d streak</span>
                    </div>
                )}
            </div>

            <div className="max-w-6xl mx-auto space-y-12">
                {/* Hero Input Section */}
                <section className="paper-card p-0 overflow-hidden">
                    {/* Dot-grid texture strip */}
                    <div className="dot-grid-bg h-3 border-b-2 border-[var(--border)] opacity-40" />
                    <div className="p-8 md:p-12 relative">
                        <div className="max-w-3xl space-y-6">
                            <div className="space-y-2">
                                <h2 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)] leading-snug">
                                    {latestSessions.length > 0 && latestSessions[0].status !== 'complete'
                                        ? "Pick up where you left off?"
                                        : "What are we learning today?"}
                                </h2>
                                <p className="text-[13px] font-mono text-[var(--muted)] leading-relaxed max-w-lg">
                                    {latestSessions.length > 0 && latestSessions[0].status !== 'complete'
                                        ? `// you were working on "${latestSessions[0].title}"`
                                        : "// paste a YouTube link, PDF, or some notes — and let's dig in"}
                                </p>
                            </div>

                            <div className="space-y-4">
                                {latestSessions.length > 0 && latestSessions[0].status !== 'complete' && (
                                    <button
                                        onClick={() => router.push(`/session/${latestSessions[0].id}`)}
                                        className="btn-primary w-full flex items-center justify-between p-4 group"
                                        style={{borderRadius:'3px'}}
                                    >
                                        <div className="flex items-center gap-3 text-left">
                                            <div className="w-8 h-8 border border-[var(--surface)]/40 flex items-center justify-center">
                                                <ArrowRight size={16} strokeWidth={2} />
                                            </div>
                                            <div>
                                                <div className="text-[10px] opacity-70 font-mono mb-0.5">continue session</div>
                                                <div className="font-bold text-sm leading-tight truncate max-w-[240px] md:max-w-xl">
                                                    {latestSessions[0].title}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="opacity-60 group-hover:opacity-100 transition-opacity" strokeWidth={2} />
                                    </button>
                                )}

                                <SmartInputCard
                                    onAnalyze={handleAnalyze}
                                    tokenBalance={isDemo ? 1000 : (user?.monthlyLimit || 100) - (user?.tokensUsed || 0)}
                                    compact={true}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-7 space-y-8">
                        <RecentSessions sessions={latestSessions.slice(0, 3)} loading={loading} />
                        <ActivityDots
                            days={activityDays}
                            sessionsCount={latestSessions.length}
                            streak={streak}
                            trend={trend}
                        />
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-5 space-y-6">
                        <QuickLaunch />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={() => setIsRoadmapModalOpen(true)}
                                className="paper-card p-5 text-left space-y-3 group"
                            >
                                <div className="w-10 h-10 border-2 border-[var(--border)] flex items-center justify-center text-[var(--accent)]" style={{boxShadow:'var(--shadow-hard-sm)'}}>
                                    <Target size={18} strokeWidth={2} />
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="font-display font-bold text-[13px] text-[var(--text)]">Focus plan</h4>
                                    <p className="text-[11px] font-mono text-[var(--muted)]">{'// build a roadmap'}</p>
                                </div>
                            </button>

                            <button
                                onClick={() => setIsInterviewModalOpen(true)}
                                className="paper-card p-5 text-left space-y-3 group"
                            >
                                <div className="w-10 h-10 border-2 border-[var(--border)] flex items-center justify-center text-[var(--sage)]" style={{boxShadow:'var(--shadow-hard-sm)'}}>
                                    <MessageSquare size={18} strokeWidth={2} />
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="font-display font-bold text-[13px] text-[var(--text)]">Mock interview</h4>
                                    <p className="text-[11px] font-mono text-[var(--muted)]">{'// practice under pressure'}</p>
                                </div>
                            </button>
                        </div>

                        <NeedsAttention concepts={focusConcepts.slice(0, 4)} />
                    </div>
                </div>
            </div>

            <RoadmapModal
                isOpen={isRoadmapModalOpen}
                onClose={() => setIsRoadmapModalOpen(false)}
                onSuccess={(roadmap) => { console.log('Created roadmap', roadmap); }}
                plan={user?.plan || 'free'}
            />

            <InterviewSimulator
                isOpen={isInterviewModalOpen}
                onClose={() => setIsInterviewModalOpen(false)}
                plan={user?.plan || 'free'}
            />
        </div>
    );
}
