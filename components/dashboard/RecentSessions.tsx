import React from 'react';
import Link from 'next/link';
import { Youtube, Link as LinkIcon, FileText, File, ChevronRight, History, BookOpen, Search, MessageSquare, ArrowRight, Clock } from 'lucide-react';
import MasteryBar from '../shared/MasteryBar';

export interface SessionRow {
    id: string;
    title: string;
    type: 'youtube' | 'article' | 'text' | 'pdf' | 'flow';
    date: string;
    mastery: {
        solid: number;
        developing: number;
        shaky: number;
        revisit: number;
    };
    gaps: number;
    materials: ('flashcards' | 'quiz' | 'explain' | 'tutor')[];
    sourceType?: 'quick' | 'curriculum';
    sourceId?: string;
}

interface RecentSessionsProps {
    sessions: SessionRow[];
    loading?: boolean;
}

const RecentSessions: React.FC<RecentSessionsProps> = ({ sessions, loading }) => {
    const getIcon = (type: SessionRow['type'], sourceType?: 'quick' | 'curriculum') => {
        if (type === 'flow' || sourceType) return <BookOpen size={14} strokeWidth={2} />;
        switch (type) {
            case 'youtube': return <Youtube size={14} strokeWidth={2} />;
            case 'article': return <LinkIcon size={14} strokeWidth={2} />;
            case 'pdf': return <File size={14} strokeWidth={2} />;
            default: return <FileText size={14} strokeWidth={2} />;
        }
    };

    const getMaterialTag = (mat: string) => {
        const labels: Record<string, string> = {
            flashcards: 'flash',
            quiz: 'test',
            explain: 'depth',
            tutor: 'flow'
        };
        return labels[mat] || mat;
    };

    const getSessionLink = (session: SessionRow) => {
        if (session.type === 'flow') {
            if (session.sourceType === 'curriculum' && session.sourceId) {
                return `/learn/curriculum/${session.sourceId}/flow?session=${session.id}`;
            }
            return `/learn/quick/flow?session=${session.id}`;
        }
        return `/session/${session.id}/feedback`;
    };

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2].map((i) => (
                    <div key={i} className="h-24 paper-card bg-[var(--bg)] animate-pulse border-2 border-[var(--border-soft)]" />
                ))}
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <div className="paper-card border-2 border-dashed border-[var(--border-soft)] p-12 flex flex-col items-center justify-center text-center bg-transparent">
                <History size={28} strokeWidth={1} className="text-[var(--muted)] mb-4 opacity-50" />
                <p className="text-[11px] font-mono text-[var(--muted)] uppercase tracking-widest">{'// session_history: void'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 px-1">
                <Clock size={14} className="text-[var(--muted)]" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Recent Activity</span>
                <div className="flex-1 h-[1px] bg-[var(--border-soft)]" />
            </div>

            <div className="grid grid-cols-1 gap-3">
                {sessions.map((session) => (
                    <Link
                        key={session.id}
                        href={getSessionLink(session)}
                        className="group block bg-[var(--surface)] border-2 border-[var(--border-soft)] hover:border-[var(--accent)] hover:shadow-[3px_3px_0px_var(--border-soft)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200 relative overflow-hidden active:translate-x-[0px] active:translate-y-[0px] active:shadow-none"
                    >
                        {/* Type Indicator Tag */}
                        <div className="absolute top-0 right-0 px-2 py-1 bg-[var(--surface-raised)] border-l border-b border-[var(--border-soft)] group-hover:bg-[var(--accent)]/10 transition-colors">
                            <span className="text-[8px] font-mono font-black text-[var(--muted)] uppercase group-hover:text-[var(--accent)] transition-colors">
                                {session.type === 'flow' ? (session.sourceType || 'learn') : session.type}
                            </span>
                        </div>

                        <div className="p-4 flex flex-col gap-4">
                            <div className="flex items-start gap-4 pr-14">
                                <div className="shrink-0 w-10 h-10 border-2 border-[var(--border-soft)] bg-[var(--surface-raised)] text-[var(--muted)] flex items-center justify-center group-hover:border-[var(--accent)] group-hover:text-[var(--accent)] transition-all">
                                    {getIcon(session.type, session.sourceType)}
                                </div>
                                
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <h4 className="text-[14px] font-display font-black text-[var(--text)] truncate leading-none mb-2 group-hover:text-[var(--accent)] transition-colors">
                                        {session.title}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-mono text-[var(--muted)] font-bold">{session.date}</span>
                                        <div className="w-1 h-1 bg-[var(--border-soft)] rounded-full" />
                                        <span className="text-[9px] font-mono text-[var(--muted)]">0% gaps</span>
                                    </div>
                                </div>
                                <ArrowRight size={14} className="shrink-0 self-center text-[var(--muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>

                            <div className="flex items-end justify-between gap-6">
                                <div className="flex-1 space-y-2">
                                    <div className="h-1.5 bg-[var(--bg)] border border-[var(--border-soft)] p-[1px] relative">
                                        <MasteryBar mastery={session.mastery} height={4} showLegend={false} />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[8px] font-mono font-bold text-[var(--muted)] uppercase tracking-widest">Mastery Spectrum</span>
                                        <div className="flex gap-1.5">
                                            {session.materials.slice(0, 3).map((mat, i) => (
                                                <span 
                                                    key={i} 
                                                    className="px-1.5 py-0.5 bg-[var(--surface-raised)] border border-[var(--border-soft)] text-[8px] font-mono font-bold text-[var(--muted)] uppercase tracking-tighter"
                                                >
                                                    {getMaterialTag(mat)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <button className="w-full py-2 border-2 border-dashed border-[var(--border-soft)] hover:border-[var(--muted)] hover:bg-[var(--surface-raised)] transition-all text-[10px] font-mono text-[var(--muted)] uppercase tracking-widest">
                View Full Archive
            </button>
        </div>
    );
};

export default RecentSessions;
