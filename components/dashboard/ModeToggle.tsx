import React from 'react';
import { Brain, Sparkles, BookOpen } from 'lucide-react';

export type SearchMode = 'study' | 'learn' | 'analyze';

interface ModeToggleProps {
    mode: SearchMode;
    onChange: (mode: SearchMode) => void;
}

const MODES: { id: SearchMode; label: string; icon: any }[] = [
    { id: 'study', label: 'Study', icon: Brain },
    { id: 'learn', label: 'Learn', icon: BookOpen },
    { id: 'analyze', label: 'Analyze', icon: Sparkles },
];

const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onChange }) => {
    return (
        <div className="flex items-center gap-1 p-1 border-2 border-[var(--border)] bg-[var(--surface)]" style={{boxShadow:'var(--shadow-hard-sm)', borderRadius: '3px'}}>
            {MODES.map((m) => {
                const Icon = m.icon;
                return (
                    <button
                        key={m.id}
                        onClick={() => onChange(m.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono transition-all relative ${
                            mode === m.id
                                ? 'bg-[var(--accent)] text-[var(--surface-raised)] font-bold'
                                : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]'
                        }`}
                        style={{ borderRadius: '2px' }}
                    >
                        <Icon size={12} strokeWidth={2.5} />
                        {m.label}
                    </button>
                );
            })}
        </div>
    );
};

export default ModeToggle;
