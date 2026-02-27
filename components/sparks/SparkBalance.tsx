import { useState } from 'react';
import { Zap, ChevronRight, ShoppingCart, X } from 'lucide-react';
import { useSparks } from '@/hooks/useSparks';
import Link from 'next/link';

export default function SparkBalance() {
    const { balance, loading } = useSparks();
    const [isOpen, setIsOpen] = useState(false);

    if (loading) return <div className="animate-pulse w-24 h-8 bg-black/5 rounded-full" />;
    if (!balance) return null;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 transition-colors text-xs font-medium"
            >
                <Zap size={14} className="text-amber-500" />
                <span>{balance.total_sparks} Sparks</span>
            </button>

            { }
            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-fade-in"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="relative w-full max-w-sm bg-[var(--surface)] h-full shadow-2xl border-l border-[var(--border)] animate-slide-in-right flex flex-col">
                        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                            <h2 className="text-xl font-display font-medium flex items-center gap-2">
                                <Zap className="text-amber-500" fill="currentColor" />
                                Your Sparks
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-black/5 rounded-full text-[var(--muted)]"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                                    <span className="text-[var(--text)]">Subscription Sparks</span>
                                    <div className="text-right">
                                        <div className="font-medium text-lg">{balance.subscription_sparks}</div>
                                        <div className="text-xs text-[var(--muted)]">Resets end of period</div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                                    <span className="text-[var(--text)]">Top-Up Sparks</span>
                                    <div className="text-right">
                                        <div className="font-medium text-lg">{balance.topup_sparks}</div>
                                        <div className="text-xs text-[var(--muted)]">Never expires</div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                                    <span className="text-[var(--text)] flex items-center gap-1">
                                        Trial Sparks
                                    </span>
                                    <div className="text-right">
                                        <div className="font-medium text-lg">{balance.trial_sparks}</div>
                                        <div className="text-xs text-[var(--muted)]">Expires in 14 days</div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-between items-center">
                                <span className="font-medium text-lg">Total Available</span>
                                <span className="text-2xl font-bold text-amber-600 flex items-center gap-1">
                                    <Zap fill="currentColor" size={24} />
                                    {balance.total_sparks}
                                </span>
                            </div>
                        </div>

                        <div className="p-6 border-t border-[var(--border)] bg-[var(--bg)]">
                            <Link
                                href="/sparks"
                                onClick={() => setIsOpen(false)}
                                className="w-full py-3 px-4 bg-[var(--accent)] text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                            >
                                <ShoppingCart size={18} />
                                Buy More Sparks <ChevronRight size={18} />
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
