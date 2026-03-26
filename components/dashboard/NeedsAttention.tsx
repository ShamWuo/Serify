import React from 'react';
import Link from 'next/link';
import { Play, ChevronRight, Brain } from 'lucide-react';

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
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2rem] p-7 space-y-6 flex flex-col h-full hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 px-1">
                <div className="w-9 h-9 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Brain size={17} strokeWidth={2} />
                </div>
                <div>
                    <h3 className="text-[13px] font-semibold text-[var(--text)]">Needs attention</h3>
                    <p className="text-[11px] text-[var(--muted)] opacity-50 mt-0.5">knowledge gaps</p>
                </div>
            </div>
            
            {concepts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center px-4">
                    <div className="w-11 h-11 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-emerald-400/40 mb-4">
                        <Brain size={22} />
                    </div>
                    <p className="text-[12px] text-[var(--muted)] opacity-60 leading-relaxed">
                        All good — everything is looking solid.
                    </p>
                </div>
            ) : (
                <div className="space-y-4 px-1">
                    {concepts.map(concept => (
                        <div key={concept.id} className="group/row">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${concept.status === 'revisit' ? 'bg-red-400' : 'bg-orange-400'}`} />
                                    <div className="min-w-0">
                                        <h4 className="text-[13px] font-medium text-[var(--text)] group-hover/row:text-emerald-600 transition-colors truncate">{concept.name}</h4>
                                        <p className="text-[10px] text-[var(--muted)]/40 mt-0.5">
                                            {concept.status} · {concept.sessionsCount} sessions
                                        </p>
                                    </div>
                                </div>
                                <Link 
                                    href={`/learn?q=${encodeURIComponent(concept.name)}`}
                                    className="px-3 py-1.5 bg-white border border-[var(--border)] rounded-xl text-[10px] font-medium text-[var(--muted)] hover:border-emerald-500/20 hover:bg-emerald-50 hover:text-emerald-600 transition-all flex items-center gap-1.5 shrink-0"
                                >
                                    Fix it <Play size={9} fill="currentColor" strokeWidth={0} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Link 
                href="/vault" 
                className="mt-auto flex items-center justify-center gap-2 py-4 border-t border-[var(--border)]/50 text-[12px] text-[var(--muted)]/50 hover:text-emerald-600 transition-colors group/footer w-full"
            >
                Open vault <ChevronRight size={13} strokeWidth={2} className="group-hover/footer:translate-x-0.5 transition-transform" />
            </Link>
        </div>
    );
};


export default NeedsAttention;
