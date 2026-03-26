import React from 'react';
import Link from 'next/link';
import { Youtube, Link as LinkIcon, FileText, File, ChevronRight, Brain, Zap, Search, MessageSquare, History } from 'lucide-react';
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

const RecentSessions: React.FC<RecentSessionsProps> = ({ sessions, loading }) => {
    const getIcon = (type: SessionRow['type']) => {
        switch (type) {
            case 'youtube': return <Youtube size={14} className="text-red-400" />;
            case 'article': return <LinkIcon size={14} className="text-blue-400" />;
            case 'pdf': return <File size={14} className="text-purple-400" />;
            default: return <FileText size={14} className="text-emerald-500" />;
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

    if (loading) {
        return (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2rem] p-7 space-y-5">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-[var(--bg)]/50 border border-[var(--border)] rounded-2xl animate-pulse">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-[var(--bg)] border border-[var(--border)]" />
                            <div className="space-y-2 flex-1">
                                <div className="h-3.5 w-3/4 bg-[var(--border)] rounded-lg" />
                                <div className="h-2.5 w-1/4 bg-[var(--border)] rounded-lg opacity-50" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }


    if (sessions.length === 0) {
        return (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2rem] p-14 text-center border-dashed flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]/30 mb-5">
                    <History size={26} strokeWidth={1.5} />
                </div>
                <h3 className="text-[14px] font-semibold text-[var(--text)] mb-1.5">Nothing here yet</h3>
                <p className="text-[12px] text-[var(--muted)] opacity-60 max-w-[180px] leading-relaxed">Start a study session to see your history</p>
            </div>
        );
    }


    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2rem] p-7 space-y-6 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center">
                        <History size={17} strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-semibold text-[var(--text)]">Recent sessions</h3>
                        <p className="text-[11px] text-[var(--muted)] opacity-50 mt-0.5">vault synced</p>
                    </div>
                </div>
            </div>
            
            <div className="space-y-3">
                {sessions.map((session) => (
                    <Link 
                        key={session.id}
                        href={`/session/${session.id}/feedback`}
                        className="flex items-center justify-between p-4 hover:bg-white hover:shadow-md hover:shadow-indigo-500/[0.03] transition-all duration-200 group/row rounded-2xl border border-transparent hover:border-[var(--border)]"
                    >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center shrink-0 group-hover/row:border-indigo-500/20 transition-all duration-300">
                                {getIcon(session.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-4 mb-1.5">
                                    <h4 className="text-[13px] font-medium text-[var(--text)] group-hover/row:text-indigo-600 transition-colors truncate">{session.title}</h4>
                                    <span className="text-[10px] text-[var(--muted)]/40 whitespace-nowrap shrink-0">{session.date}</span>
                                </div>
                                <div className="flex items-center gap-5">
                                    <div className="flex items-center gap-3 flex-1 max-w-[260px]">
                                        <div className="flex-1 bg-[var(--bg)] rounded-full h-1.5 overflow-hidden">
                                            <MasteryBar mastery={session.mastery} height={6} />
                                        </div>
                                        <span className="text-[10px] text-[var(--muted)]/50 whitespace-nowrap">
                                            {session.gaps > 0 ? `${session.gaps} gaps` : 'complete'}
                                        </span>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-all duration-300">
                                        {session.materials.slice(0, 3).map(mat => (
                                            <div key={mat} className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-500/10 flex items-center justify-center text-indigo-400">
                                                {getMaterialIcon(mat)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <ChevronRight size={15} strokeWidth={2} className="text-[var(--muted)]/20 group-hover/row:text-indigo-400 group-hover/row:translate-x-0.5 transition-all duration-300 ml-3 shrink-0" />
                    </Link>
                ))}
            </div>
            
            <Link 
                href="/sessions" 
                className="flex items-center justify-center gap-2 py-4 border-t border-[var(--border)]/50 text-[12px] text-[var(--muted)]/50 hover:text-indigo-500 transition-colors group/footer w-full"
            >
                See all sessions <ChevronRight size={13} strokeWidth={2} className="group-hover/footer:translate-x-0.5 transition-transform" />
            </Link>
        </div>
    );

};

export default RecentSessions;
