import React from 'react';
import { Play, ArrowRight, Sparkles, RotateCcw } from 'lucide-react';
import Link from 'next/link';

interface ResumeBannerProps {
    type: 'curriculum' | 'gap';
    title: string;
    subtitle: string;
    progress?: number;
    href: string;
    viewHref?: string;
}

const ResumeBanner: React.FC<ResumeBannerProps> = ({ 
    type, 
    title, 
    subtitle, 
    progress, 
    href, 
    viewHref 
}) => {
    const Icon = type === 'curriculum' ? RotateCcw : Sparkles;

    return (
        <div className="bg-[var(--accent-light)] border-l-4 border-[var(--accent)] rounded-r-xl p-5 flex items-center justify-between gap-6 shadow-sm animate-fade-in group">
            <div className="flex items-start gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm text-[var(--accent)]">
                    <Icon size={20} />
                </div>
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                        {title}
                        {progress !== undefined && (
                            <span className="text-[10px] bg-[var(--accent)] text-white px-1.5 py-0.5 rounded font-black tracking-widest">{progress}%</span>
                        )}
                    </h3>
                    <p className="text-xs text-[var(--muted)]/70 mt-1 truncate">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                {viewHref && (
                    <Link 
                        href={viewHref} 
                        className="text-xs font-bold text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    >
                        View
                    </Link>
                )}
                <Link 
                    href={href}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-[var(--accent)]/10"
                >
                    {type === 'curriculum' ? 'Resume' : 'Fix them now'} <ArrowRight size={14} />
                </Link>
            </div>
        </div>
    );
};

export default ResumeBanner;
