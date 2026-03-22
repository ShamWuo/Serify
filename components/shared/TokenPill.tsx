import React from 'react';
import { Zap } from 'lucide-react';

interface TokenPillProps {
    used: number;
    limit: number;
    className?: string;
}

const TokenPill: React.FC<TokenPillProps> = ({ used, limit, className = "" }) => {
    const percent = Math.round((used / limit) * 100);
    
    let colorClass = "text-[var(--muted)]";
    let iconClass = "text-[var(--muted)]";
    let pulseClass = "";

    if (percent >= 90) {
        colorClass = "text-orange-700";
        iconClass = "text-orange-700";
        pulseClass = "animate-pulse";
    } else if (percent >= 70) {
        colorClass = "text-amber-600";
        iconClass = "text-amber-600";
    }

    return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-full shadow-sm ${pulseClass} ${className}`}>
            <Zap size={14} className={iconClass} fill={percent >= 70 ? "currentColor" : "none"} />
            <span className={`text-xs font-bold ${colorClass}`}>
                {limit - used} <span className="text-[var(--muted)]/60 font-medium">tokens left</span>
            </span>
        </div>
    );
};

export default TokenPill;
