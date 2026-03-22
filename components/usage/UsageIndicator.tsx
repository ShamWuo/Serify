import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, AlertCircle } from 'lucide-react';

interface UsageIndicatorProps {
    className?: string;
    showAlways?: boolean;
}

export const UsageIndicator: React.FC<UsageIndicatorProps> = ({ className, showAlways = false }) => {
    const { user } = useAuth();
    
    if (!user || user.plan === 'proplus') return null;

    const { percentUsed, tokensUsed, monthlyLimit } = user;
    
    // threshold: 70%
    if (!showAlways && percentUsed < 70) return null;

    const isNearLimit = percentUsed >= 90;
    const isAtLimit = percentUsed >= 100;

    return (
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all backdrop-blur-md ${
            isAtLimit ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]' :
            isNearLimit ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]' :
            'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 shadow-[0_0_10px_rgba(var(--accent-rgb),0.1)]'
        } ${className}`}>
            <span className="relative flex h-1.5 w-1.5 mr-0.5" title="Compute usage over 70%">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isAtLimit ? 'bg-red-400' : isNearLimit ? 'bg-orange-400' : 'bg-[var(--accent)]'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                    isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-orange-500' : 'bg-[var(--accent)]'
                }`}></span>
            </span>
            <span>{Math.round(percentUsed)}%</span>
        </div>
    );
};
