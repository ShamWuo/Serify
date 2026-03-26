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
        colorClass = "text-red-600";
        iconClass = "text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]";
        pulseClass = "animate-pulse";
    } else if (percent >= 70) {
        colorClass = "text-orange-600";
        iconClass = "text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)]";
    }

    return (
        <div className={`flex items-center gap-2.5 px-4 py-2 bg-white border border-[var(--border)] rounded-2xl shadow-xl shadow-black/[0.02] ${pulseClass} ${className}`}>
            <Zap size={14} strokeWidth={3} className={iconClass} fill={percent >= 70 ? "currentColor" : "none"} />
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] italic ${colorClass}`}>
                {limit - used} <span className="text-[var(--muted)]/40 font-black not-italic ml-1">UNITS REMAINING</span>
            </span>
        </div>
    );
};

export default TokenPill;
