import React from 'react';
import { Lock } from 'lucide-react';
import Link from 'next/link';

interface InlineUpgradeCardProps {
    featureName: string;
    description: string;
    onUpgradeClick: () => void;
    hideSeeAll?: boolean;
}

export function InlineUpgradeCard({
    featureName,
    description,
    onUpgradeClick,
    hideSeeAll
}: InlineUpgradeCardProps) {
    return (
        <div className="bg-surface border border-border rounded-xl p-6 my-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
                <div className="bg-accent/10 p-2 rounded-lg text-accent">
                    <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-semibold m-0 text-text">{featureName} — Pro Feature</h3>
            </div>

            <p className="text-text/70 mb-5 leading-relaxed">{description}</p>

            <div className="flex items-center gap-4">
                <button
                    onClick={onUpgradeClick}
                    className="bg-accent hover:bg-accent/90 text-white font-medium py-2 px-5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    Unlock Full Report
                    <span aria-hidden="true">&rarr;</span>
                </button>

                {!hideSeeAll && (
                    <Link
                        href="/pricing"
                        className="text-text/60 hover:text-text text-sm font-medium transition-colors"
                    >
                        See all features
                    </Link>
                )}
            </div>
        </div>
    );
}
