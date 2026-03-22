import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock, X, AlertTriangle, Zap } from 'lucide-react';
import { useUsage } from '@/hooks/useUsage';
import { FeatureName, UsageCheckResult } from '@/lib/usage';

interface UsageGateProps {
    feature: FeatureName;
    children?: React.ReactNode;
    forceShow?: boolean;
    onClose?: () => void;
}

export function UsageGate({ feature, children, forceShow, onClose }: UsageGateProps) {
    const { usage, loading } = useUsage(feature);
    const [dismissed, setDismissed] = useState(false);

    const isLocked = forceShow || (usage && !usage.allowed && !loading);

    if (!isLocked || dismissed) {
        return <>{children}</>;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[var(--bg)]/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-md glass border border-[var(--border)] rounded-3xl p-8 shadow-2xl animate-modal-in overflow-hidden">
                {/* Premium Background Decor */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 bg-[var(--accent)]/10 rounded-full blur-3xl pointer-events-none" />

                {(onClose || feature) && (
                    <button
                        onClick={() => {
                            if (onClose) onClose();
                            else setDismissed(true);
                        }}
                        className="absolute top-4 right-4 p-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}

                <div className="relative flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] mb-6">
                        <Lock size={32} />
                    </div>

                    <h2 className="text-2xl font-bold text-[var(--text)] mb-3 tracking-tight">
                        Limit Reached
                    </h2>

                    <p className="text-[var(--muted)] mb-8 text-sm leading-relaxed">
                        You&apos;ve reached your monthly limit for <span className="font-semibold text-[var(--text)] capitalize">{(usage?.featureName || feature || '').replace(/_/g, ' ')}</span> on your current plan. Upgrade to continue learning without interruption.
                    </p>

                    <div className="w-full space-y-3">
                        <Link
                            href="/pricing"
                            className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-[var(--accent)]/20 active:scale-[0.98]"
                        >
                            Upgrade Now <ArrowRight size={18} />
                        </Link>

                        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold">
                            <Zap size={14} />
                            Maximize your learning potential with Pro
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface UsageWarningProps {
    feature?: FeatureName;
    usage?: UsageCheckResult | null;
}

export function UsageWarning({ feature, usage: providedUsage }: UsageWarningProps) {
    const { usage: fetchedUsage } = useUsage(feature);
    const usage = providedUsage || fetchedUsage;

    if (!usage || usage.monthlyLimit === null) return null;

    const percentage = usage.percentUsed ?? (usage.tokensUsed / usage.monthlyLimit) * 100;
    if (percentage < 70) return null;

    const remaining = usage.monthlyLimit - usage.tokensUsed;
    const featName = (usage.featureName || feature || '').replace(/_/g, ' ');

    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700">
            <div className="flex items-center gap-2 text-xs font-bold">
                <AlertTriangle size={14} />
                <span>{remaining < 0 ? 0 : remaining} tokens left this period</span>
            </div>
            <Link href="/pricing" className="text-[10px] underline font-bold hover:text-amber-600 transition-colors">
                Upgrade
            </Link>
        </div>
    );
}
