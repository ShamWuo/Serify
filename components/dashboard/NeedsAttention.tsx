import React from 'react';
import Link from 'next/link';
import { Play, ChevronRight, AlertTriangle } from 'lucide-react';

interface GapConcept {
    id: string;
    name: string;
    status: 'shaky' | 'revisit';
    sessionsCount: number;
}

interface NeedsAttentionProps {
    concepts: GapConcept[];
}

const STATUS_STYLE: Record<string, string> = {
    shaky: 'washi-shaky',
    revisit: 'washi-revisit',
};

const NeedsAttention: React.FC<NeedsAttentionProps> = ({ concepts }) => {
    return (
        <div className="paper-card overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b-2 border-[var(--border)] flex items-center gap-3 dot-grid-bg">
                <div className="w-8 h-8 border-2 border-[var(--border)] flex items-center justify-center text-[var(--warn)]" style={{boxShadow:'var(--shadow-hard-sm)'}}>
                    <AlertTriangle size={15} strokeWidth={2} />
                </div>
                <div>
                    <h3 className="text-[13px] font-display font-bold text-[var(--text)]">Needs attention</h3>
                    <p className="text-[10px] font-mono text-[var(--muted)]">{'// knowledge gaps'}</p>
                </div>
            </div>

            <div className="flex-1 p-5">
                {concepts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <p className="text-[12px] font-mono text-[var(--muted)]">
                            ✓ all looking solid
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {concepts.map(concept => (
                            <div key={concept.id} className="flex items-center justify-between gap-3 py-2 border-b border-[var(--border-soft)] last:border-0">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                    {/* Hatch indicator for shaky */}
                                    <div className={`mt-0.5 shrink-0 w-3 h-3 border border-current ${
                                        concept.status === 'shaky'
                                            ? 'text-[var(--warn)] hatch-danger'
                                            : 'text-[var(--muted)]'
                                    }`} />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-[12px] font-mono text-[var(--text)] truncate">{concept.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`washi-tape ${STATUS_STYLE[concept.status] || 'washi-revisit'}`}>
                                                {concept.status}
                                            </span>
                                            <span className="text-[10px] font-mono text-[var(--muted)]">{concept.sessionsCount}x</span>
                                        </div>
                                    </div>
                                </div>
                                <Link
                                    href={`/learn?q=${encodeURIComponent(concept.name)}`}
                                    className="btn-ghost text-[10px] px-3 py-1 shrink-0 flex items-center gap-1"
                                >
                                    fix <Play size={8} fill="currentColor" strokeWidth={0} />
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Link
                href="/vault"
                className="flex items-center justify-center gap-2 py-3.5 border-t-2 border-[var(--border)] text-[11px] font-mono text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors w-full"
            >
                open vault <ChevronRight size={12} strokeWidth={2} />
            </Link>
        </div>
    );
};

export default NeedsAttention;
