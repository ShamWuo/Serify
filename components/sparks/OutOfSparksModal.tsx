import React from 'react';
import { Zap, X, ShoppingCart, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface OutOfSparksModalProps {
    isOpen: boolean;
    onClose: () => void;
    cost?: number;
    featureName?: string;
}

export default function OutOfSparksModal({ isOpen, onClose, cost = 1, featureName = 'this feature' }: OutOfSparksModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-xl animate-scale-in">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                            <Zap size={24} fill="currentColor" />
                        </div>
                        <h3 className="text-xl font-display text-[var(--text)]">Out of Sparks</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-black/5 rounded-full text-[var(--muted)] transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4 mb-8">
                    <p className="text-[var(--text)] text-[15px] leading-relaxed">
                        You need <strong className="text-amber-600">{cost} Spark{cost > 1 ? 's' : ''}</strong> to use <strong>{featureName}</strong>, but your balance is currently empty.
                    </p>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                        <p className="text-amber-800 text-sm">
                            Sparks power our advanced AI features like active recall tutoring, misconception probing, and deep-dive explanations.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <Link
                        href="/sparks"
                        className="w-full py-3 px-4 bg-[var(--accent)] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <ShoppingCart size={18} />
                        Get More Sparks <ChevronRight size={18} />
                    </Link>
                    <button
                        onClick={onClose}
                        className="w-full py-3 px-4 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-xl font-medium hover:bg-black/5 transition-colors"
                    >
                        Maybe Later
                    </button>
                </div>

                <p className="mt-6 text-center text-xs text-[var(--muted)]">
                    Pro plan users get a monthly allocation of sparks.
                    <Link href="/pricing" className="text-[var(--accent)] hover:underline ml-1">View Plans</Link>
                </p>
            </div>
        </div>
    );
}
