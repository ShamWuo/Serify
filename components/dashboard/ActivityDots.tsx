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
    const [goal, setGoal] = React.useState(10);
    const [isEditingGoal, setIsEditingGoal] = React.useState(false);
    const [newGoal, setNewGoal] = React.useState(10);

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Get actual dates for tooltips
    const getTooltipDate = (index: number) => {
        const d = new Date();
        const currentDay = d.getDay(); // 0 is Sun, 1 is Mon...
        const diff = index + 1 - (currentDay === 0 ? 7 : currentDay);
        d.setDate(d.getDate() + diff);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const handleGoalSubmit = () => {
        setGoal(newGoal);
        setIsEditingGoal(false);
    };

    return (
        <div className="paper-card overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2 border-b-2 border-[var(--border)] flex items-center justify-between">
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

            <div className="p-3 space-y-3">
                {/* Activity dots — styled as a grid of interactive cells */}
                <div className="grid grid-cols-7 gap-2">
                    {labels.map((label, i) => (
                        <div key={label} className="group/dot relative flex flex-col items-center gap-2">
                            <span className="text-[9px] font-mono text-[var(--muted)] uppercase group-hover/dot:text-[var(--accent)] transition-colors">{label.charAt(0)}</span>
                            <div
                                className={`w-4 h-4 border-2 transition-all duration-500 cursor-help ${
                                    days[i]
                                        ? 'bg-[var(--accent)] border-[var(--ink)] shadow-[2px_2px_0px_var(--ink)]'
                                        : 'bg-[var(--bg)] border-[var(--border-soft)] hover:border-[var(--muted)]'
                                }`}
                                style={{ transitionDelay: `${i * 30}ms` }}
                            />
                            {/* Tooltip for sessions on that day */}
                            <div className="absolute top-[100%] left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-[var(--ink)] text-[var(--bg)] text-[8px] font-mono whitespace-nowrap opacity-0 group-hover/dot:opacity-100 pointer-events-none transition-opacity z-20 shadow-md">
                                <div className="font-bold border-b border-[var(--bg)]/20 mb-1">{getTooltipDate(i)}</div>
                                {days[i] ? '✓ Active sessions' : '-- No activity'}
                            </div>
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

                {/* Weekly progress bar — hard fill style with editable goal */}
                <div className="group/goal relative">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-[var(--muted)]">Weekly goal</span>
                        <div className="flex items-center gap-1">
                            {isEditingGoal ? (
                                <div className="flex items-center gap-1">
                                    <input 
                                        type="number" 
                                        value={newGoal} 
                                        onChange={(e) => setNewGoal(parseInt(e.target.value) || 0)}
                                        className="w-10 bg-[var(--surface)] border border-[var(--accent)] text-[10px] font-mono text-[var(--text)] px-1 focus:outline-none"
                                        autoFocus
                                        onBlur={handleGoalSubmit}
                                        onKeyDown={(e) => e.key === 'Enter' && handleGoalSubmit()}
                                    />
                                    <span className="text-[10px] font-mono">/wk</span>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => { setIsEditingGoal(true); setNewGoal(goal); }}
                                    className="text-[10px] font-mono text-[var(--accent)] font-bold hover:underline cursor-pointer group/edit flex items-center gap-1"
                                >
                                    {sessionsCount}/{goal}
                                    <span className="text-[8px] font-mono text-[var(--muted)] opacity-0 group-hover/edit:opacity-100 transition-opacity">{'// click to edit'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Tally-style bar: block segments instead of rounded bar */}
                    <div className="flex gap-0.5">
                        {Array.from({length: goal}).map((_, i) => (
                            <div
                                key={i}
                                className="flex-1 h-3 border border-[var(--border-soft)] transition-all duration-300"
                                style={{
                                    background: i < sessionsCount ? 'var(--accent)' : 'var(--bg)',
                                    transitionDelay: `${i < 10 ? i * 30 : 0}ms`,
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
