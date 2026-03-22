import React from 'react';
import Link from 'next/link';
import { Sparkles, BookOpen, Target, History, ChevronRight } from 'lucide-react';

const QuickLaunch: React.FC = () => {
    const links = [
        { href: '/flow', icon: Sparkles, label: 'Flow Mode', meta: '1/Q' },
        { href: '/learn', icon: BookOpen, label: 'Learn Mode', meta: null },
        { href: '/practice', icon: Target, label: 'Practice', meta: null },
        { href: '/sessions', icon: History, label: 'All Sessions', meta: 'history' },
    ];

    return (
        <div className="glass rounded-3xl border border-[var(--border)] overflow-hidden shadow-2xl shadow-black/[0.02]">
            <h3 className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--muted)] border-b border-[var(--border)]/50 bg-background/30">Action Center</h3>
            <div className="flex flex-col">
                {links.map((link, i) => (
                    <Link 
                        key={link.href}
                        href={link.href}
                        className={`flex items-center justify-between px-6 py-5 hover:bg-[var(--accent)]/[0.03] transition-all duration-300 group ${
                            i !== links.length - 1 ? 'border-b border-[var(--border)]/50' : ''
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-xl bg-surface border border-[var(--border)] flex items-center justify-center text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:border-[var(--accent)]/30 group-hover:shadow-lg group-hover:shadow-[var(--accent)]/10 transition-all duration-300">
                                <link.icon size={18} />
                            </div>
                            <span className="text-[14px] font-bold text-[var(--text)] group-hover:translate-x-1 transition-transform">{link.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {link.meta && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]/50 px-2 py-1 rounded-lg border border-[var(--border)] bg-surface/50">
                                    {link.meta}
                                </span>
                            )}
                            <div className="w-6 h-6 rounded-full border border-[var(--border)] flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-[var(--accent)] group-hover:text-white group-hover:border-[var(--accent)] transition-all duration-300">
                                <ChevronRight size={12} />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default QuickLaunch;
