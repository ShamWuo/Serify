import React from 'react';
import { Brain, Sparkles, Zap, ArrowRight, Target, ChevronRight, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/router';
import SmartInputCard from './SmartInputCard';
import RecentSessions from './RecentSessions';

import ActivityDots from './ActivityDots';
import QuickLaunch from './QuickLaunch';
import { RoadmapModal } from './RoadmapModal';
import { InterviewSimulator } from './InterviewSimulator';

interface DashboardV2Props {
    user: any;
    latestSessions: any[];
    activityDays: boolean[];
    streak: number;
    trend: string;
    vaultCount: number;
    handleAnalyze: (data: any) => Promise<void>;
    isDemo?: boolean;
    loading?: boolean;
    isProcessing?: boolean;
}

export default function DashboardV2({
    user,
    latestSessions,
    activityDays,
    streak,
    trend,
    vaultCount,
    handleAnalyze,
    isDemo,
    loading,
    isProcessing = false
}: DashboardV2Props) {
    const router = useRouter();
    const [isRoadmapModalOpen, setIsRoadmapModalOpen] = React.useState(false);
    const [isInterviewModalOpen, setIsInterviewModalOpen] = React.useState(false);

    return (
        <div className="max-w-[1400px] mx-auto px-4 py-2 md:py-4 space-y-4 animate-fade-in font-mono">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-1">
                <div className="space-y-0.5">
                    <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight leading-none text-[var(--text)]">
                        Hey, <span className="text-[var(--accent)]">{user?.displayName?.split(' ')?.[0] || 'friend'}</span> ✦
                    </h1>
                    <p className="text-[11px] font-mono text-[var(--muted)]">{'// your knowledge is growing — keep it up'}</p>
                </div>
                {/* Streak Tally Box */}
                {streak > 0 && (
                    <div className="tally-box shrink-0">
                        <span className="text-[var(--accent)]">🔥</span>
                        <span>{streak}d streak</span>
                    </div>
                )}
            </div>

            <div className="max-w-7xl mx-auto space-y-4">
                {/* Hero Input Section */}
                <section className="paper-card p-0 overflow-hidden">
                    <div className="p-4 md:p-6 relative">
                        <div className="max-w-3xl space-y-4">
                            <div className="space-y-1">
                                <h2 className="text-2xl md:text-3xl font-display font-medium text-[var(--accent)] leading-tight">
                                    Capture understanding.
                                </h2>
                                <p className="text-sm md:text-base text-[var(--muted)] font-mono opacity-80 max-w-xl">
                                    Drop a URL, document, or thought. Let&apos;s process it.
                                </p>
                            </div>

                            <div className="pt-2">
                                <SmartInputCard
                                    onAnalyze={handleAnalyze}
                                    tokenBalance={isDemo ? 1000 : (user?.monthlyLimit || 100) - (user?.tokensUsed || 0)}
                                    compact={true}
                                    isProcessing={isProcessing}
                                    transparent={true}
                                />
                            </div>

                            <div className="space-y-3">
                                {latestSessions.length > 0 && latestSessions[0].status !== 'complete' && (
                                    <button
                                        onClick={() => router.push(`/session/${latestSessions[0].id}`)}
                                        className="btn-primary w-full flex items-center justify-between p-3 group"
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
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left Column */}
                    <div className="lg:col-span-7 space-y-6">
                        <button
                            onClick={() => setIsRoadmapModalOpen(true)}
                            className="paper-card p-6 text-left space-y-4 group border-2 border-[var(--accent)]/40 shadow-[var(--shadow-hard)] hover:scale-[1.01] transition-all bg-gradient-to-br from-white to-[var(--bg)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] translate-x-4 -translate-y-4">
                                <Sparkles size={120} />
                            </div>
                            <div className="flex items-start justify-between relative z-10">
                                <div className="w-12 h-12 border-2 border-[var(--accent)] bg-white flex items-center justify-center text-[var(--accent)]" style={{boxShadow:'var(--shadow-hard-sm)'}}>
                                    <Sparkles size={24} strokeWidth={2} />
                                </div>
                                <div className="px-2 py-0.5 border border-[var(--accent)]/30 bg-[var(--accent)]/5 text-[9px] font-mono font-black text-[var(--accent)] uppercase tracking-wider">
                                    PRIMARY GOAL
                                </div>
                            </div>
                            <div className="space-y-1 relative z-10">
                                <h3 className="font-display font-black text-2xl text-[var(--text)] tracking-tight">Start Learning</h3>
                                <p className="text-[12px] font-mono text-[var(--muted)] leading-relaxed max-w-md">
                                    {'// define a complex goal and build a structured path to mastery'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--accent)] font-bold text-xs uppercase tracking-[0.2em] relative z-10">
                                launch roadmap mode <ArrowRight size={14} strokeWidth={2.5} />
                            </div>
                        </button>

                        <RecentSessions sessions={latestSessions.slice(0, 4)} loading={loading} />
                        <ActivityDots
                            days={activityDays}
                            sessionsCount={latestSessions.length}
                            conceptsCount={vaultCount}
                            streak={streak}
                            trend={trend}
                        />
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-5 space-y-6">
                        <QuickLaunch />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={() => setIsInterviewModalOpen(true)}
                                className="paper-card p-4 text-left space-y-2 group col-span-2"
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
