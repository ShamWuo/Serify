import React from 'react';
import { Zap, TrendingUp } from 'lucide-react';

interface ActivityDotsProps {
    days: boolean[];
    sessionsCount: number;
    streak?: number;
    trend?: string;
}

const ActivityDots: React.FC<ActivityDotsProps> = ({ days, sessionsCount, streak, trend }) => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2rem] p-7 space-y-8 flex flex-col h-full hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center">
                        <Zap size={17} strokeWidth={2} fill="currentColor" />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-semibold text-[var(--text)]">This week</h3>
                        <p className="text-[11px] text-[var(--muted)] opacity-50 mt-0.5">activity log</p>
                    </div>
                </div>
                {streak && streak > 0 && (
                    <div className="px-3 py-1.5 bg-orange-50 text-orange-500 rounded-xl text-[11px] font-medium flex items-center gap-1.5 border border-orange-500/10">
                        <Zap size={11} fill="currentColor" strokeWidth={0} />
                        {streak} day streak
                    </div>
                )}
            </div>
            
            <div className="flex-1 flex flex-col justify-center gap-8 px-1">
                <div className="grid grid-cols-7 gap-3">
                    {labels.map((label, i) => (
                        <div key={label} className="flex flex-col items-center gap-3">
                            <span className="text-[10px] text-[var(--muted)]/40">{label.charAt(0)}</span>
                            <div 
                                className={`w-3.5 h-3.5 rounded-full transition-all duration-700 ${
                                    days[i] 
                                        ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]' 
                                        : 'bg-[var(--bg)] border border-[var(--border)]/60'
                                }`}
                                style={{ transitionDelay: `${i * 60}ms` }}
                            />
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-white border border-[var(--border)]/60 rounded-2xl space-y-2 hover:border-indigo-500/20 hover:shadow-sm transition-all duration-300">
                        <p className="text-[10px] text-[var(--muted)]/50">Sessions</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-[var(--text)]">{sessionsCount}</span>
                            <span className="text-[10px] text-[var(--muted)]/40">this week</span>
                        </div>
                    </div>
                    <div className="p-5 bg-white border border-[var(--border)]/60 rounded-2xl space-y-2 hover:border-emerald-500/20 hover:shadow-sm transition-all duration-300">
                        <p className="text-[10px] text-[var(--muted)]/50">Growth</p>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-emerald-500">{trend || '+0%'}</span>
                            <TrendingUp size={14} strokeWidth={2} className="text-emerald-400" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-[var(--border)]/50 px-1">
                <div className="flex items-center justify-between text-[11px] text-[var(--muted)]/40 mb-3">
                    <span>Weekly goal</span>
                    <span className="text-indigo-500 font-medium">{sessionsCount} / 10</span>
                </div>
                <div className="w-full h-1.5 bg-[var(--bg)] border border-[var(--border)]/60 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.min((sessionsCount / 10) * 100, 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
};


export default ActivityDots;
