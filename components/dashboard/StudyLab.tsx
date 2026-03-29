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
            className="group relative p-4 paper-card-sm bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)] transition-all cursor-pointer flex flex-col h-full overflow-hidden"
        >
            <div className="flex items-start justify-between mb-3 relative z-10">
                <div className={`w-9 h-9 border-2 border-[var(--ink)] ${color} ${accent} flex items-center justify-center transition-transform group-hover:rotate-3 duration-300 shadow-hard-sm`}>
                    {icon}
                </div>
                {premium && (
                    <div className="washi-tape washi-developing" style={{fontSize: '7px', padding: '1px 6px'}}>
                        <Zap size={8} fill="currentColor" /> PRO
                    </div>
                )}
            </div>

            <h4 className="font-display font-bold text-[var(--text)] text-[13px] mb-1 relative z-10 group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                {title}
            </h4>
            <p className="font-mono text-[10px] text-[var(--muted)] leading-relaxed mb-4 flex-1 relative z-10">
                {description}
            </p>

            <div className="flex items-center text-[9px] font-bold font-mono text-[var(--accent)] mt-auto relative z-10 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 uppercase tracking-wider">
                Start Activity <ArrowRight size={10} className="ml-1" />
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
        <section className="p-6 bg-[var(--bg)] border-b-2 border-[var(--border)] overflow-hidden">
            <div className="flex items-center justify-between mb-5">
                <div className="space-y-1">
                    <h3 className="text-[10px] font-bold font-mono uppercase tracking-[0.2em] text-[var(--muted)] flex items-center gap-2">
                        <Sparkles size={12} className="text-[var(--accent)]" /> 
                        {'//'} AI Study Lab
                    </h3>
                    <p className="text-[12px] font-display font-medium text-[var(--text)]">Ready-to-use cognitive tools.</p>
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
