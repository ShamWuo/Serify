import React from 'react';
import { useUsage } from '@/hooks/useUsage';
import { AlertTriangle, BookOpen } from 'lucide-react';

interface UsageIndicatorProps {
    className?: string;
    showAlways?: boolean;
}

export const UsageIndicator: React.FC<UsageIndicatorProps> = ({ className, showAlways = true }) => {
    const { allUsage, loading } = useUsage(); // no feature = fetch global usage totals

    if (loading) {
        return (
            <div className={`paper-card p-3 border-2 border-[var(--border)] bg-[var(--bg)] animate-pulse ${className}`} style={{ borderRadius: '4px', boxShadow: 'var(--shadow-hard-sm)' }}>
                <div className="flex items-center justify-between mb-2">
                    <div className="h-2 w-12 bg-[var(--border-soft)] rounded" />
                    <div className="h-2 w-10 bg-[var(--border-soft)] rounded" />
                </div>
                <div className="h-1.5 w-full bg-[var(--border-soft)] rounded-full" />
            </div>
        );
    }

    const tokensUsed: number = allUsage?.tokensUsed ?? 0;
    const monthlyLimit: number | null = allUsage?.monthlyLimit ?? null;
    const plan: string = allUsage?.plan ?? 'free';

    const isUnlimited = plan === 'proplus' || monthlyLimit === null;
    const tokensRemaining = isUnlimited ? Infinity : Math.max(0, (monthlyLimit ?? 0) - tokensUsed);
    const percentUsed = isUnlimited ? 0 : ((monthlyLimit ?? 1) > 0 ? (tokensUsed / (monthlyLimit ?? 1)) * 100 : 100);
    const percentRemaining = Math.max(0, 100 - percentUsed);

    if (!showAlways && !isUnlimited && percentRemaining > 30) return null;

    const isExhausted = !isUnlimited && tokensRemaining <= 0;
    const isCritical = !isUnlimited && percentRemaining < 15 && !isExhausted;

    const displayRemaining = isUnlimited ? '∞' : `${tokensRemaining}/${monthlyLimit}`;

    return (
        <div className={`space-y-2 w-full animate-fade-in ${className}`}>
            <div
                className={`paper-card p-3 border-2 transition-all duration-300 relative overflow-hidden ${
                    isUnlimited
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]/20'
                        : isExhausted
                            ? 'border-[var(--warn)] bg-[var(--warn-soft)]'
                            : isCritical
                                ? 'border-orange-500/50 bg-orange-500/5'
                                : 'border-[var(--border)] bg-[var(--bg)]'
                }`}
                style={{
                    borderRadius: '4px',
                    boxShadow: isExhausted ? '0 0 15px var(--warn-soft)' : 'var(--shadow-hard-sm)'
                }}
            >
                {/* Header Row */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {isExhausted ? (
                            <AlertTriangle size={12} className="text-[var(--warn)]" />
                        ) : (
                            <BookOpen size={12} className="text-[var(--accent)]" />
                        )}
                        <span className={`text-[9px] font-mono font-black uppercase tracking-[0.25em] ${isExhausted ? 'text-[var(--warn)]' : 'text-[var(--muted)]'}`}>
                            {isUnlimited ? 'pro' : isExhausted ? 'limit' : 'tokens'}
                        </span>
                    </div>
                    <span className={`text-[11px] font-mono font-bold tabular-nums ${isExhausted ? 'text-[var(--warn)]' : 'text-[var(--text)]'}`}>
                        {displayRemaining}
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-[var(--border-soft)]/20 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ease-out ${
                            isUnlimited ? 'bg-[var(--accent)]' :
                            isExhausted ? 'bg-[var(--warn)]' :
                            isCritical ? 'bg-orange-500' :
                            'bg-[var(--accent)]'
                        }`}
                        style={{ width: isUnlimited ? '100%' : `${percentRemaining}%` }}
                    />
                </div>
            </div>

            {isExhausted && !isUnlimited && (
                <p className="text-[9px] font-mono text-[var(--warn)] italic leading-tight px-1">
                    {'// daily limit reached.'}
                </p>
            )}
        </div>
    );
};
