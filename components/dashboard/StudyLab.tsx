import React from 'react';
import { Sparkles, Brain, ClipboardCheck, GraduationCap, ArrowRight, Zap, Target } from 'lucide-react';

interface LabToolProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    accent: string;
    onClick: () => void;
    premium?: boolean;
}

function LabTool({ title, description, icon, color, accent, onClick, premium }: LabToolProps) {
    return (
        <div 
            onClick={onClick}
            className="group relative p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] hover:shadow-xl hover:shadow-[var(--accent)]/5 transition-all cursor-pointer flex flex-col h-full overflow-hidden"
        >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity -mr-8 -mt-8 rounded-full`} />
            
            <div className="flex items-start justify-between mb-3 relative z-10">
                <div className={`w-10 h-10 rounded-xl ${color} ${accent} flex items-center justify-center transition-transform group-hover:scale-110 duration-500 shadow-sm`}>
                    {icon}
                </div>
                {premium && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-100/50 text-amber-600 text-[9px] font-black uppercase tracking-wider">
                        <Zap size={8} fill="currentColor" /> Pro
                    </div>
                )}
            </div>

            <h4 className="font-bold text-[var(--text)] text-sm mb-1 relative z-10 group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                {title}
            </h4>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed mb-4 flex-1 relative z-10 font-medium">
                {description}
            </p>

            <div className="flex items-center text-[10px] font-bold text-[var(--accent)] mt-auto relative z-10 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                Start Activity <ArrowRight size={12} className="ml-1" />
            </div>
        </div>
    );
}

export default function StudyLab({ onToolSelect }: { onToolSelect: (tool: string) => void }) {
    const tools = [
        {
            id: 'flashcards',
            title: 'Flashcard Factory',
            description: 'Paste any text or link to instantly generate active recall cards.',
            icon: <Brain size={18} />,
            color: 'bg-indigo-100',
            accent: 'text-indigo-600',
            premium: true
        },
        {
            id: 'practice-test',
            title: 'Practice Exam',
            description: 'Generate a diagnostic quiz to find your blind spots in seconds.',
            icon: <ClipboardCheck size={18} />,
            color: 'bg-emerald-100',
            accent: 'text-emerald-600',
            premium: true
        },
        {
            id: 'concept-map',
            title: 'Quick Roadmap',
            description: 'Input a goal and get a structured learning path with concepts.',
            icon: <Target size={18} />,
            color: 'bg-purple-100',
            accent: 'text-purple-600'
        },
        {
            id: 'explain',
            title: 'Socratic Tutor',
            description: 'Tired of reading? Have the AI walk you through a complex topic.',
            icon: <GraduationCap size={18} />,
            color: 'bg-amber-100',
            accent: 'text-amber-600'
        }
    ];

    return (
        <section className="p-6 bg-gradient-to-b from-[var(--bg)] to-[var(--surface)] border-b border-[var(--border)] overflow-hidden">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--muted)] flex items-center gap-2">
                        <Sparkles size={12} className="text-[var(--accent)] shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" /> 
                        AI Study Lab
                    </h3>
                    <p className="text-[13px] text-[var(--text)] font-semibold mt-0.5">Ready-to-use cognitive tools.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {tools.map(tool => (
                    <LabTool 
                        key={tool.id}
                        {...tool}
                        onClick={() => onToolSelect(tool.id)}
                    />
                ))}
            </div>
        </section>
    );
}
