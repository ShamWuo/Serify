import React from 'react';
import Link from 'next/link';
import { Sparkles, BookOpen, Target, History, ChevronRight } from 'lucide-react';

const QuickLaunch: React.FC = () => {
    const links = [
        { href: '/flow', icon: BookOpen, label: 'Flow mode', meta: 'AI mentor' },
        { href: '/learn', icon: Sparkles, label: 'Knowledge extraction', meta: 'Auto-distill' },
        { href: '/practice', icon: Target, label: 'Active recall', meta: 'Drills' },
        { href: '/sessions', icon: History, label: 'Session archive', meta: 'History' },
    ];

    return (
        <div className="bg-[var(--surface)] rounded-[2rem] border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            <div className="px-8 py-5 border-b border-[var(--border)]/50 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <h3 className="text-[13px] font-semibold text-[var(--text)]">Quick access</h3>
            </div>
            <div className="flex flex-col">
                {links.map((link, i) => (
                    <Link 
                        key={link.href}
                        href={link.href}
                        className={`flex items-center justify-between px-8 py-5 hover:bg-white transition-all duration-300 group/row relative ${
                            i !== links.length - 1 ? 'border-b border-[var(--border)]/40' : ''
                        }`}
                    >
                        <div className="flex items-center gap-5">
                            <div className="w-10 h-10 rounded-xl bg-[var(--bg)] border border-[var(--border)]/60 flex items-center justify-center text-[var(--muted)] group-hover/row:text-indigo-500 group-hover/row:border-indigo-500/20 group-hover/row:bg-indigo-50/50 transition-all duration-300">
                                <link.icon size={18} strokeWidth={2} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[13px] font-medium text-[var(--text)] group-hover/row:text-indigo-600 transition-colors duration-300">
                                    {link.label}
                                </span>
                                {link.meta && (
                                    <span className="text-[11px] text-[var(--muted)]/50 mt-0.5">
                                        {link.meta}
                                    </span>
                                )}
                            </div>
                        </div>
                        <ChevronRight size={16} strokeWidth={2} className="text-[var(--muted)]/30 group-hover/row:text-indigo-400 group-hover/row:translate-x-0.5 transition-all duration-300" />
                    </Link>
                ))}
            </div>
        </div>
    );
};



export default QuickLaunch;
