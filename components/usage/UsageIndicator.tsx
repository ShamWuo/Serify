import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, AlertCircle } from 'lucide-react';

interface UsageIndicatorProps {
    className?: string;
    showAlways?: boolean;
}

export const UsageIndicator: React.FC<UsageIndicatorProps> = ({ className, showAlways = true }) => {
    const { user } = useAuth();
    
    if (!user || user.plan === 'proplus') return null;

    const { percentUsed, tokensUsed, monthlyLimit } = user;
    const tokensRemaining = Math.max(0, monthlyLimit - tokensUsed);
    
    if (!showAlways && percentUsed < 70) return null;

    const isNearLimit = percentUsed >= 90;
    const isAtLimit = percentUsed >= 100;

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl text-[10px] font-bold transition-all border ${
                isAtLimit ? 'bg-red-500/5 text-red-500 border-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.05)]' :
                isNearLimit ? 'bg-orange-500/5 text-orange-500 border-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.05)]' :
                'bg-indigo-500/5 text-indigo-500 border-indigo-500/10 shadow-[0_0_15px_rgba(79,70,229,0.05)]'
            } ${className}`}>
                <div className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 ${
                        isAtLimit ? 'bg-red-400' : isNearLimit ? 'bg-orange-400' : 'bg-indigo-400'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                        isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-orange-500' : 'bg-indigo-500'
                    }`}></span>
                </div>
                <div className="flex items-center justify-between flex-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">Usage</span>
                    <span className="font-black tabular-nums">{Math.round(percentUsed)}%</span>
                </div>
            </div>
            
            <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl text-[10px] font-bold transition-all border bg-[var(--surface)] border-[var(--border)] ${className}`}>
                <div className="flex items-center justify-between flex-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">Tokens</span>
                    <span className="font-black tabular-nums text-[var(--accent)]">{tokensRemaining}</span>
                </div>
            </div>
        </div>
    );

};
