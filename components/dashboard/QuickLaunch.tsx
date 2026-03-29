import React from 'react';
import Link from 'next/link';
import { Sparkles, BookOpen, Target, History, ChevronRight } from 'lucide-react';

const QuickLaunch: React.FC = () => {
    const links = [
        { href: '/flow', icon: BookOpen, label: 'Flow mode', meta: 'AI mentor' },
        { href: '/learn', icon: Sparkles, label: 'Knowledge extraction', meta: 'Auto-distill' },
        { href: '/practice', icon: Target, label: 'Active recall', meta: 'Drills' },
        { href: '/history', icon: History, label: 'History', meta: 'All activity' },
    ];

    return (
        <div className="paper-card overflow-hidden">
            <div className="px-4 py-2 border-b-2 border-[var(--border)] flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[var(--accent)]" />
                <h3 className="text-[12px] font-display font-bold text-[var(--text)]">Quick access</h3>
            </div>
            <div className="flex flex-col">
                {links.map((link, i) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center justify-between px-4 py-2 hover:bg-[var(--accent-soft)] transition-all group/row relative ${
                            i !== links.length - 1 ? 'border-b border-[var(--border-soft)]' : ''
                        }`}
                    >
                        {/* Left accent bar on hover */}
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--accent)] scale-y-0 group-hover/row:scale-y-100 transition-transform origin-center" />
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 border border-[var(--border-soft)] flex items-center justify-center text-[var(--muted)] group-hover/row:text-[var(--accent)] group-hover/row:border-[var(--accent)] transition-all bg-[var(--bg)]">
                                <link.icon size={15} strokeWidth={2} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[12px] font-mono text-[var(--text)] group-hover/row:text-[var(--accent)] transition-colors">
                                    {link.label}
                                </span>
                                {link.meta && (
                                    <span className="text-[10px] font-mono text-[var(--muted)] mt-0.5">
                                        {link.meta}
                                    </span>
                                )}
                            </div>
                        </div>
                        <ChevronRight size={13} strokeWidth={2} className="text-[var(--border-soft)] group-hover/row:text-[var(--accent)] transition-colors" />
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default QuickLaunch;
