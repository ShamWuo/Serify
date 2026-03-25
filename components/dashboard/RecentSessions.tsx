import React from 'react';
import Link from 'next/link';
import { Youtube, Link as LinkIcon, FileText, File, ChevronRight, Brain, Zap, Search, MessageSquare } from 'lucide-react';
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
}

const RecentSessions: React.FC<RecentSessionsProps> = ({ sessions }) => {
    const getIcon = (type: SessionRow['type']) => {
        switch (type) {
            case 'youtube': return <Youtube size={14} className="text-red-500" />;
            case 'article': return <LinkIcon size={14} className="text-blue-500" />;
            case 'pdf': return <File size={14} className="text-purple-500" />;
            default: return <FileText size={14} className="text-emerald-600" />;
        }
    };

    const getMaterialIcon = (mat: string) => {
        switch (mat) {
            case 'flashcards': return <Zap size={12} />;
            case 'quiz': return <FileText size={12} />;
            case 'explain': return <Search size={12} />;
            case 'tutor': return <MessageSquare size={12} />;
            default: return null;
        }
    };

    if (sessions.length === 0) {
        return (
            <div className="py-12 text-center bg-surface/50 rounded-2xl border border-dashed border-[var(--border)]">
                <p className="text-sm font-bold text-[var(--text)] mb-1">No sessions yet.</p>
                <p className="text-xs text-[var(--muted)]">Paste something you&apos;ve been studying above to get started.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="text-lg font-display font-bold text-[var(--text)]">Recent Activity</h3>
                    <p className="text-[11px] text-[var(--muted)] font-medium">Your latest learning sessions & progress</p>
                </div>
                <Link href="/sessions" className="text-[11px] font-black uppercase tracking-widest text-[var(--accent)] hover:text-[var(--accent)]/70 transition-colors bg-[var(--accent)]/[0.03] px-3 py-1.5 rounded-lg border border-[var(--accent)]/10">View History →</Link>
            </div>
            <div className="glass rounded-3xl border border-[var(--border)] overflow-hidden shadow-2xl shadow-black/[0.01]">
                {sessions.map((session, i) => (
                    <Link 
                        key={session.id}
                        href={`/session/${session.id}/feedback`}
                        className={`flex items-center justify-between p-5 hover:bg-[var(--accent)]/[0.02] transition-all duration-300 group ${
                            i !== sessions.length - 1 ? 'border-b border-[var(--border)]/50' : ''
                        }`}
                    >
                        <div className="flex items-center gap-5 min-w-0 flex-1">
                            <div className="w-11 h-11 rounded-xl bg-surface border border-[var(--border)] flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md group-hover:border-[var(--accent)]/30 transition-all duration-300">
                                {getIcon(session.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-4 mb-2.5">
                                    <h4 className="text-[14px] font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors truncate" title={session.title}>{session.title}</h4>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]/50 whitespace-nowrap">{session.date}</span>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-3 flex-1 max-w-[200px]">
                                        <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden shadow-inner">
                                            <div 
                                                className="h-full bg-gradient-to-r from-[var(--accent)] to-[#4ade80] transition-all duration-1000 ease-out"
                                                style={{ width: `${session.mastery.solid + session.mastery.developing}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]/60 whitespace-nowrap">
                                            {session.gaps > 0 ? `${session.gaps} gaps` : 'Mastered ✓'}
                                        </span>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-2 grayscale group-hover:grayscale-0 transition-all duration-500">
                                        {session.materials.slice(0, 3).map(mat => (
                                            <div key={mat} className="w-6 h-6 rounded-lg bg-background border border-[var(--border)] flex items-center justify-center text-[var(--muted)]/50 group-hover:text-[var(--accent)] group-hover:border-[var(--accent)]/30 transition-all">
                                                {getMaterialIcon(mat)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--muted)] opacity-0 group-hover:opacity-100 group-hover:bg-[var(--accent)] group-hover:text-white group-hover:border-[var(--accent)] transition-all duration-300 -translate-x-2 group-hover:translate-x-0 ml-4">
                            <ChevronRight size={14} />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default RecentSessions;
