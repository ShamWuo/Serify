import React from 'react';
import Link from 'next/link';
import { Youtube, Link as LinkIcon, FileText, File, ChevronRight, History, Zap, Search, MessageSquare } from 'lucide-react';
import MasteryBar from '../shared/MasteryBar';

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
            case 'youtube': return <Youtube size={13} className="text-[var(--warn)]" />;
            case 'article': return <LinkIcon size={13} className="text-[var(--sage)]" />;
            case 'pdf': return <File size={13} className="text-[var(--amber)]" />;
            default: return <FileText size={13} className="text-[var(--accent)]" />;
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
            <div className="paper-card p-14 flex flex-col items-center justify-center text-center hatch-bg">
                <History size={28} strokeWidth={1.5} className="text-[var(--muted)] mb-4" />
                <h3 className="text-[13px] font-display font-bold text-[var(--text)] mb-1">Nothing here yet</h3>
                <p className="text-[11px] font-mono text-[var(--muted)]">{'// start a session to see history'}</p>
            </div>
        );
    }

    return (
        <div className="paper-card overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b-2 border-[var(--border)] flex items-center gap-3 dot-grid-bg">
                <div className="w-8 h-8 border-2 border-[var(--border)] flex items-center justify-center text-[var(--muted)]" style={{boxShadow:'var(--shadow-hard-sm)'}}>
                    <History size={14} strokeWidth={2} />
                </div>
                <div>
                    <h3 className="text-[13px] font-display font-bold text-[var(--text)]">Recent sessions</h3>
                    <p className="text-[10px] font-mono text-[var(--muted)]">{'// vault synced'}</p>
                </div>
            </div>

            <div className="flex flex-col">
                {sessions.map((session, idx) => (
                    <Link
                        key={session.id}
                        href={`/session/${session.id}/feedback`}
                        className={`flex items-center gap-4 px-4 py-3 hover:bg-[var(--accent-soft)] transition-colors group/row relative ${
                            idx !== sessions.length - 1 ? 'border-b border-[var(--border-soft)]' : ''
                        }`}
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--accent)] scale-y-0 group-hover/row:scale-y-100 transition-transform origin-center" />

                        {/* Type icon */}
                        <div className="w-8 h-8 border border-[var(--border-soft)] flex items-center justify-center bg-[var(--bg)] shrink-0">
                            {getIcon(session.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-1.5">
                                <h4 className="text-[12px] font-mono text-[var(--text)] truncate group-hover/row:text-[var(--accent)] transition-colors">
                                    <span className="text-[var(--muted)] mr-1">{TYPE_PREFIX[session.type]}</span>
                                    {session.title}
                                </h4>
                                <span className="text-[9px] font-mono text-[var(--muted)] whitespace-nowrap shrink-0">{session.date}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 max-w-[200px] h-2 border border-[var(--border-soft)] bg-[var(--bg)] overflow-hidden">
                                    <MasteryBar mastery={session.mastery} height={8} />
                                </div>
                                <span className="text-[9px] font-mono text-[var(--muted)]">
                                    {session.gaps > 0 ? `${session.gaps} gaps` : '✓ complete'}
                                </span>
                                {/* Material tags */}
                                <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                    {session.materials.slice(0, 3).map(mat => (
                                        <div key={mat} className="w-5 h-5 border border-[var(--border-soft)] flex items-center justify-center text-[var(--muted)] bg-[var(--bg)]">
                                            {getMaterialIcon(mat)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <ChevronRight size={12} strokeWidth={2} className="shrink-0 text-[var(--border-soft)] group-hover/row:text-[var(--accent)] transition-colors" />
                    </Link>
                ))}
            </div>

            <Link
                href="/sessions"
                className="flex items-center justify-center gap-2 py-2 border-t-2 border-[var(--border)] text-[11px] font-mono text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors w-full"
            >
                see all sessions <ChevronRight size={12} strokeWidth={2} />
            </Link>
        </div>
    );
};

export default RecentSessions;
