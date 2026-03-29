import React from 'react';
import Link from 'next/link';
import { Youtube, Link as LinkIcon, FileText, File, ChevronRight, History, Zap, Search, MessageSquare, ArrowRight } from 'lucide-react';
import MasteryBar from '../shared/MasteryBar';
import { normalizeTitle } from '@/lib/formatters';
import { useRouter } from 'next/router';

export interface SessionRow {
    id: string;
    title: string;
    type: 'youtube' | 'article' | 'text' | 'pdf';
    date: string;
    mastery: {
        solid: number;
        developing: number;
        shaky: number;
        revisit: number;
    };
    gaps: number;
    materials: ('flashcards' | 'quiz' | 'explain' | 'tutor')[];
}

interface RecentSessionsProps {
    sessions: SessionRow[];
    loading?: boolean;
}

const TYPE_PREFIX: Record<string, string> = {
    youtube: 'yt://',
    article: 'url://',
    pdf: 'pdf://',
    text: 'txt://',
};

const RecentSessions: React.FC<RecentSessionsProps> = ({ sessions, loading }) => {
    const getIcon = (type: SessionRow['type']) => {
        switch (type) {
            case 'youtube': return <Youtube size={14} className="text-[var(--warn)]" strokeWidth={1.5} />;
            case 'article': return <LinkIcon size={14} className="text-[var(--sage)]" strokeWidth={1.5} />;
            case 'pdf': return <File size={14} className="text-[var(--amber)]" strokeWidth={1.5} />;
            default: return <FileText size={14} className="text-[var(--accent)]" strokeWidth={1.5} />;
        }
    };

    const getMaterialIcon = (mat: string) => {
        switch (mat) {
            case 'flashcards': return <Zap size={10} />;
            case 'quiz': return <FileText size={10} />;
            case 'explain': return <Search size={10} />;
            case 'tutor': return <MessageSquare size={10} />;
            default: return null;
        }
    };

    if (loading) {
        return (
            <div className="paper-card p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 border border-[var(--border-soft)] bg-[var(--bg)] animate-pulse" />
                ))}
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <div className="paper-card p-12 flex flex-col items-center justify-center text-center">
                <History size={28} strokeWidth={1.5} className="text-[var(--muted)] mb-4" />
                <h3 className="text-[13px] font-display font-bold text-[var(--text)] mb-1">Nothing here yet</h3>
                <p className="text-[11px] font-mono text-[var(--muted)]">{'// start a session to see history'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <History size={14} className="text-[var(--accent)]" strokeWidth={2.5} />
                    <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[var(--text)]">Recent history</h3>
                </div>
                <Link href="/history" className="text-[10px] font-mono text-[var(--muted)] hover:text-[var(--accent)] transition-colors inline-flex items-center gap-1">
                    view all <ArrowRight size={10} />
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {sessions.map((session) => (
                    <Link
                        key={session.id}
                        href={`/session/${session.id}/feedback`}
                        className="group block p-4 bg-white border border-[var(--border-soft)] hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-hard-sm)] transition-all duration-300 relative overflow-hidden"
                    >
                        {/* Status bar on hover */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)] scale-y-0 group-hover:scale-y-100 transition-transform duration-300" />
                        
                        <div className="flex flex-col gap-3">
                            {/* Top row: Title and Date */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="shrink-0 w-8 h-8 border border-[var(--border-soft)] flex items-center justify-center bg-[var(--bg)] group-hover:border-[var(--accent)]/30 group-hover:bg-[var(--accent-soft)] transition-colors">
                                        {getIcon(session.type)}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-[13px] font-display font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors truncate">
                                            {normalizeTitle(session.title)}
                                        </h4>
                                        <p className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-tight">
                                            {session.type}
                                            <span className="mx-1 opacity-50">·</span>
                                            {session.date}
                                        </p>
                                    </div>
                                </div>
                                <div className="shrink-0 flex items-center gap-1">
                                    <ChevronRight size={12} className="text-[var(--muted)] group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </div>

                            {/* Bottom row: Mastery and Materials */}
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex-1 max-w-sm">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] font-mono text-[var(--muted)] uppercase tracking-tighter">Mastery Depth</span>
                                        <span className="text-[9px] font-mono text-right text-[var(--text)]">
                                            {Object.values(session.mastery).reduce((a, b) => a + b, 0)} Concepts
                                        </span>
                                    </div>
                                    <div className="h-1.5 border border-[var(--border-soft)] bg-[var(--bg)] p-[1px] overflow-hidden">
                                        <MasteryBar mastery={session.mastery} height={4} showLegend={false} />
                                    </div>
                                </div>

                                <div className="hidden sm:flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                    {session.materials.slice(0, 4).map((mat, i) => (
                                        <div 
                                            key={i} 
                                            className="w-6 h-6 border border-[var(--border-soft)] bg-[var(--bg)] flex items-center justify-center text-[var(--text)] group-hover:border-[var(--accent)]/20"
                                            title={mat}
                                        >
                                            {getMaterialIcon(mat)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default RecentSessions;
