import React from 'react';
import { TrendingUp } from 'lucide-react';

interface ActivityDotsProps {
    days: boolean[];
    sessionsCount: number;
    conceptsCount?: number;
    streak?: number;
    trend?: string;
}

const ActivityDots: React.FC<ActivityDotsProps> = ({ days, sessionsCount, conceptsCount, streak, trend }) => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const goalPct = Math.min((sessionsCount / 10) * 100, 100);

    return (
        <div className="paper-card overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b-2 border-[var(--border)] flex items-center justify-between dot-grid-bg">
                <div>
                    <h3 className="text-[13px] font-display font-bold text-[var(--text)]">This week</h3>
                    <p className="text-[10px] font-mono text-[var(--muted)]">{'// activity log'}</p>
                </div>
                {streak && streak > 0 ? (
                    <div className="tally-box text-[var(--accent)]">
                        <span>🔥</span>
                        <span className="font-mono">{streak}d</span>
                    </div>
                ) : null}
            </div>

            <div className="p-4 space-y-4">
                {/* Activity dots — styled as a hand-drawn grid */}
                <div className="grid grid-cols-7 gap-2">
                    {labels.map((label, i) => (
                        <div key={label} className="flex flex-col items-center gap-2">
                            <span className="text-[9px] font-mono text-[var(--muted)] uppercase">{label.charAt(0)}</span>
                            <div
                                className={`w-4 h-4 border-2 transition-all duration-500 ${
                                    days[i]
                                        ? 'bg-[var(--accent)] border-[var(--ink)]'
                                        : 'bg-[var(--bg)] border-[var(--border-soft)]'
                                }`}
                                style={{ transitionDelay: `${i * 50}ms`, boxShadow: days[i] ? 'var(--shadow-hard-sm)' : 'none' }}
                            />
                        </div>
                    ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="paper-card-sm p-3 space-y-1">
                        <p className="text-[9px] font-mono text-[var(--muted)] uppercase tracking-wider">Sessions</p>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-display font-bold text-[var(--text)]">{sessionsCount}</span>
                            <span className="text-[10px] font-mono text-[var(--muted)]">this wk</span>
                        </div>
                    </div>
                    <div className="paper-card-sm p-3 space-y-1">
                        <p className="text-[9px] font-mono text-[var(--muted)] uppercase tracking-wider">Growth</p>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-display font-bold text-[var(--sage)]">{trend || '+0%'}</span>
                            <TrendingUp size={13} strokeWidth={2} className="text-[var(--sage)] self-center" />
                        </div>
                    </div>
                </div>

                {/* Weekly progress bar — hard fill style */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-[var(--muted)]">Weekly goal</span>
                        <span className="text-[10px] font-mono text-[var(--accent)] font-bold">{sessionsCount}/10</span>
                    </div>
                    {/* Tally-style bar: block segments instead of rounded bar */}
                    <div className="flex gap-0.5">
                        {Array.from({length: 10}).map((_, i) => (
                            <div
                                key={i}
                                className="flex-1 h-3 border border-[var(--border-soft)] transition-all duration-300"
                                style={{
                                    background: i < sessionsCount ? 'var(--accent)' : 'var(--bg)',
                                    transitionDelay: `${i * 40}ms`,
                                    boxShadow: i < sessionsCount ? '1px 1px 0px var(--ink)' : 'none',
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityDots;
