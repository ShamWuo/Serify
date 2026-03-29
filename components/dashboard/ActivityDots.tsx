import React from 'react';
import { Calendar, Info, Zap } from 'lucide-react';

interface ActivityDotsProps {
    days: boolean[];
    sessionsCount: number;
    conceptsCount?: number;
    streak?: number;
    trend?: string;
}

const ActivityDots: React.FC<ActivityDotsProps> = ({ days, sessionsCount, conceptsCount, streak, trend }) => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    const getTooltipDate = (index: number) => {
        const d = new Date();
        const currentDay = d.getDay(); // 0 is Sun, 1 is Mon...
        const diff = index + 1 - (currentDay === 0 ? 7 : currentDay);
        d.setDate(d.getDate() + diff);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="paper-card overflow-hidden bg-gradient-to-br from-[var(--surface-raised)] to-[var(--bg)] border-2 border-[var(--border)] group/card">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--border-soft)] flex items-center justify-between bg-[var(--surface)]">
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-[var(--accent)]" />
                    <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[var(--text)]">Weekly Momentum</span>
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <Info size={12} className="text-[var(--muted)] cursor-help" />
                </div>
            </div>

            <div className="p-5">
                {/* Visual Activity Grid — Circles */}
                <div className="flex justify-between items-end gap-1 px-1">
                    {labels.map((label, i) => (
                        <div key={label} className="group/dot relative flex flex-col items-center gap-3">
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/dot:opacity-100 transition-all transform scale-90 group-hover:scale-100 pointer-events-none z-30">
                                <div className="bg-[var(--ink)] text-[var(--bg)] text-[9px] font-mono px-2 py-1 shadow-lg whitespace-nowrap" style={{borderRadius: '2px'}}>
                                    {getTooltipDate(i)}: {days[i] ? 'Active' : 'No activity'}
                                </div>
                            </div>
                            
                            <span className="text-[10px] font-mono text-[var(--muted)] font-bold group-hover/dot:text-[var(--accent)] transition-colors">
                                {label.charAt(0)}
                            </span>
                            
                            <div
                                className={`w-6 h-6 rounded-full border-2 transition-all duration-700 relative overflow-hidden flex items-center justify-center ${
                                    days[i]
                                        ? 'bg-[var(--accent)] border-[var(--ink)] shadow-[3px_3px_0px_var(--ink)] scale-110'
                                        : 'bg-transparent border-[var(--border-soft)] hover:border-[var(--muted)] hover:bg-[var(--surface-raised)]'
                                }`}
                                style={{ transitionDelay: `${i * 40}ms` }}
                            >
                                {days[i] && (
                                    <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
                                )}
                                {days[i] && <Zap size={10} className="text-white/80 relative z-10 animate-[pulse_1.5s_infinite]" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ActivityDots;
