import React from 'react';
import Link from 'next/link';
import { Play, ChevronRight, AlertCircle } from 'lucide-react';

interface GapConcept {
    id: string;
    name: string;
    status: 'shaky' | 'revisit';
    sessionsCount: number;
}

interface NeedsAttentionProps {
    concepts: GapConcept[];
}

const NeedsAttention: React.FC<NeedsAttentionProps> = ({ concepts }) => {
    return (
        <div className="bg-surface rounded-2xl border border-[var(--border)] p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted)] mb-6">Focus on these</h3>
            
            {concepts.length === 0 ? (
                <p className="text-xs text-[var(--muted)]/70 italic">
                    Nothing needs urgent attention. All concepts are Solid or Developing.
                </p>
            ) : (
                <div className="space-y-6">
                    {concepts.map(concept => (
                        <div key={concept.id} className="group">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-start gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 ${concept.status === 'revisit' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]'}`} />
                                    <div>
                                        <h4 className="text-[13px] font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{concept.name}</h4>
                                        <p className="text-[10px] font-medium text-[var(--muted)]/60 uppercase tracking-widest mt-0.5">
                                            {concept.status} · {concept.sessionsCount} sessions
                                        </p>
                                    </div>
                                </div>
                                <Link 
                                    href={`/learn?q=${encodeURIComponent(concept.name)}`}
                                    className="px-3 py-1.5 bg-background border border-[var(--border)] rounded-lg text-[10px] font-black uppercase tracking-widest text-[var(--muted)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-all flex items-center gap-1.5 shadow-sm"
                                >
                                    Practice <Play size={10} fill="currentColor" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Link 
                href="/vault" 
                className="mt-8 flex items-center justify-center gap-2 py-3 border-t border-[var(--border)] text-[11px] font-bold text-[var(--muted)] hover:text-[var(--accent)] transition-all group w-full"
            >
                View all in Concept Vault <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
        </div>
    );
};

export default NeedsAttention;
