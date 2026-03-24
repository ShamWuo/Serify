import React from 'react';
import { Brain, Sparkles, Zap, ArrowRight, History, Target, LayoutGrid } from 'lucide-react';
import SmartInputCard from './SmartInputCard';
import RecentSessions from './RecentSessions';
import NeedsAttention from './NeedsAttention';
import ActivityDots from './ActivityDots';

interface DashboardV2Props {
    user: any;
    latestSessions: any[];
    focusConcepts: any[];
    activityDays: boolean[];
    vaultCount: number;
    handleAnalyze: (data: any) => Promise<void>;
    isDemo?: boolean;
}

export default function DashboardV2({
    user,
    latestSessions,
    focusConcepts,
    activityDays,
    vaultCount,
    handleAnalyze,
    isDemo
}: DashboardV2Props) {
    return (
        <div className="max-w-[1400px] mx-auto px-6 py-8 md:py-12 space-y-8 animate-fade-in">
            {}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-[var(--border)]">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[var(--accent)] font-black uppercase tracking-[0.2em] text-[10px]">
                        <Sparkles size={12} fill="currentColor" />
                        Learning Command Center
                    </div>
                    <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
                        Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Scholar'}</span>
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex items-center gap-3 shadow-sm group hover:border-indigo-500/30 transition-all">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Zap size={16} fill="currentColor" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Sparks Remaining</div>
                            <div className="text-sm font-bold">{isDemo ? 1000 : ((user?.monthlyLimit || 0) - (user?.tokensUsed || 0))}</div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8">
                {}
                <div className="space-y-8">
                    {}
                    <section className="relative overflow-hidden bg-indigo-600 rounded-[2.5rem] p-1 shadow-xl shadow-indigo-500/10">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Brain size={120} />
                        </div>
                        <div className="bg-white rounded-[2.25rem] p-8 md:p-10">
                            <div className="max-w-2xl space-y-6">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold tracking-tight">What are you learning today?</h2>
                                    <p className="text-[var(--muted)] leading-relaxed">
                                        Paste a YouTube link, an article URL, or raw notes. Serify will extract concepts and build your map.
                                    </p>
                                </div>
                                <SmartInputCard 
                                    onAnalyze={handleAnalyze} 
                                    tokenBalance={isDemo ? 1000 : ((user?.monthlyLimit || 0) - (user?.tokensUsed || 0))}
                                    compact={true}
                                />
                            </div>
                        </div>
                    </section>

                    {}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2rem] p-8 space-y-6 hover:shadow-md transition-all">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                                        <History size={20} />
                                    </div>
                                    <h3 className="font-bold">Recent Sessions</h3>
                                </div>
                                <button className="text-xs font-bold text-indigo-500 hover:underline flex items-center gap-1">
                                    View All <ArrowRight size={12} />
                                </button>
                            </div>
                            <RecentSessions sessions={latestSessions.slice(0, 3)} />
                        </div>

                        {}
                    </div>
                </div>

                {}
                <aside className="space-y-8">
                    {}
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2rem] p-8 space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
                                <LayoutGrid size={20} />
                            </div>
                            <h3 className="font-bold">Momentum</h3>
                        </div>
                        <ActivityDots 
                            days={activityDays} 
                            sessionsCount={latestSessions.length} 
                            conceptsCount={0}
                        />
                    </div>

                    {}
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-purple-600 text-white space-y-6 relative overflow-hidden shadow-lg shadow-indigo-500/20">
                        <div className="absolute -bottom-10 -right-10 opacity-20 transform rotate-12">
                            <Sparkles size={160} />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <h4 className="text-xl font-bold">Ready for a Roadmap?</h4>
                            <p className="text-indigo-100 text-sm leading-relaxed">
                                Define a complex goal (e.g., &quot;Master Quantum Computing&quot;) and we&apos;ll generate a 4-week structured curriculum.
                            </p>
                            <button className="w-full py-3.5 bg-white text-indigo-600 rounded-2xl text-sm font-bold hover:bg-indigo-50 transition-colors shadow-sm">
                                Create My Path
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
