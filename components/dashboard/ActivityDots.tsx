import React from 'react';

interface ActivityDotsProps {
    days: boolean[];
    sessionsCount: number;
    conceptsCount: number;
}

const ActivityDots: React.FC<ActivityDotsProps> = ({ days, sessionsCount, conceptsCount }) => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className="glass rounded-3xl border border-[var(--border)] p-7 shadow-2xl shadow-black/[0.01]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--muted)]/60 mb-8 px-1">Weekly Pulse</h3>
            
            <div className="grid grid-cols-7 gap-y-4 mb-10">
                {labels.map((label, i) => (
                    <div key={label} className="flex flex-col items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]/40">{label.charAt(0)}</span>
                        <div 
                            className={`w-3 h-3 rounded-full transition-all duration-700 ${
                                days[i] 
                                    ? 'bg-gradient-to-br from-[var(--accent)] to-emerald-400 shadow-[0_0_12px_var(--accent)] animate-pulse shadow-[var(--accent)]/40' 
                                    : 'bg-background border border-[var(--border)]/50'
                            }`}
                            style={{ animationDelay: `${i * 100}ms` }}
                        />
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-1 px-1">
                <p className="text-[13px] font-bold text-[var(--text)] tracking-tight">
                    {sessionsCount} Sessions <span className="text-gray-300 mx-1">·</span> {conceptsCount} Concepts
                </p>
                <div className="w-full h-1 bg-background rounded-full mt-2 overflow-hidden">
                    <div 
                        className="h-full bg-[var(--accent)] rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min((sessionsCount / 10) * 100, 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default ActivityDots;
