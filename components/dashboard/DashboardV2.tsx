import React from 'react';
import { Brain, Sparkles, Zap, ArrowRight, Target, LayoutGrid, ChevronRight, MessageSquare } from 'lucide-react';
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
        <div className="max-w-[1400px] mx-auto px-6 py-12 md:py-20 space-y-12 animate-fade-in custom-scrollbar">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4">
                <div className="space-y-2">
                    <h1 className="text-4xl md:text-6xl font-serif font-black tracking-tight leading-none text-[var(--text)]">
                        Hey, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-700 font-sans italic">{user?.displayName?.split(' ')?.[0] || 'friend'}</span> ✦
                    </h1>
                    <p className="text-[13px] text-[var(--muted)] font-medium opacity-50">your knowledge is growing — keep it up</p>
                </div>
            </div>


            <div className="max-w-6xl mx-auto space-y-14">
                <section className="relative overflow-hidden bg-[var(--surface)] border border-[var(--border)] rounded-[3rem] p-1.5 shadow-xl shadow-indigo-500/[0.04] group/hero transition-all duration-500 hover:shadow-indigo-500/[0.07]">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.025] pointer-events-none rotate-12">
                        <Brain size={240} strokeWidth={1} />
                    </div>
                    <div className="bg-white rounded-[2.85rem] p-10 md:p-14 relative overflow-hidden">
                        <div className="max-w-3xl space-y-8">
                            <div className="space-y-3">
                                <h2 className="text-3xl md:text-4xl font-serif font-bold text-[var(--text)] leading-snug">
                                    {latestSessions.length > 0 && latestSessions[0].status !== 'complete' 
                                        ? "Pick up where you left off?" 
                                        : "What are we learning today?"}
                                </h2>
                                <p className="text-[15px] text-[var(--muted)]/60 leading-relaxed max-w-lg">
                                    {latestSessions.length > 0 && latestSessions[0].status !== 'complete'
                                        ? `You were working on "${latestSessions[0].title}".`
                                        : "Paste a YouTube link, PDF, or some notes — and let's dig in."}
                                </p>
                            </div>

                            <div className="space-y-5">
                                {latestSessions.length > 0 && latestSessions[0].status !== 'complete' && (
                                    <button 
                                        onClick={() => router.push(`/session/${latestSessions[0].id}`)}
                                        className="w-full flex items-center justify-between p-5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all duration-300 shadow-xl shadow-indigo-600/20 group/btn overflow-hidden relative"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.04] to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                                        <div className="flex items-center gap-4 text-left relative z-10">
                                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/20">
                                                <ArrowRight size={18} strokeWidth={2} />
                                            </div>
                                            <div>
                                                <div className="text-[11px] text-indigo-200 font-medium mb-0.5">continue session</div>
                                                <div className="font-semibold text-base leading-tight truncate max-w-[240px] md:max-w-xl">
                                                    {latestSessions[0].title}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="opacity-0 group-hover/btn:opacity-100 transition-all duration-300 translate-x-[-8px] group-hover/btn:translate-x-0" strokeWidth={2} />
                                    </button>
                                )}

                                <SmartInputCard 
                                    onAnalyze={handleAnalyze} 
                                    percentUsed={isDemo ? 0 : (user?.percentUsed || 0)}
                                    compact={true}
                                />
                            </div>
                        </div>
                    </div>
                </section>


                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column - Core Activity */}
                    <div className="lg:col-span-7 space-y-8">
                        <RecentSessions sessions={latestSessions.slice(0, 3)} loading={loading} />
                        
                        <ActivityDots 
                            days={activityDays}
                            sessionsCount={latestSessions.length}
                            streak={streak}
                            trend={trend}
                        />
                    </div>

                    {/* Right Column - Contextual Actions & Vault */}
                    <div className="lg:col-span-5 space-y-8">
                        <QuickLaunch />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <button 
                                onClick={() => setIsRoadmapModalOpen(true)}
                                className="group p-6 bg-[var(--surface)] border border-[var(--border)] rounded-[1.75rem] hover:border-orange-500/20 hover:bg-white hover:shadow-md hover:shadow-orange-500/[0.04] transition-all duration-300 text-left space-y-4"
                            >
                                <div className="w-11 h-11 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all duration-300">
                                    <Target size={20} strokeWidth={2} />
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="font-semibold text-[14px] text-[var(--text)]">Focus plan</h4>
                                    <p className="text-[12px] text-[var(--muted)] opacity-60">Build a roadmap</p>
                                </div>
                            </button>

                            <button 
                                onClick={() => setIsInterviewModalOpen(true)}
                                className="group p-6 bg-[var(--surface)] border border-[var(--border)] rounded-[1.75rem] hover:border-indigo-500/20 hover:bg-white hover:shadow-md hover:shadow-indigo-500/[0.04] transition-all duration-300 text-left space-y-4"
                            >
                                <div className="w-11 h-11 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all duration-300">
                                    <MessageSquare size={20} strokeWidth={2} />
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="font-semibold text-[14px] text-[var(--text)]">Mock interview</h4>
                                    <p className="text-[12px] text-[var(--muted)] opacity-60">Practice under pressure</p>
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
                onSuccess={(roadmap) => {
                    console.log('Created roadmap', roadmap);
                }} 
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
