import React from 'react';

export type SearchMode = 'analyze' | 'learn';

interface ModeToggleProps {
    mode: SearchMode;
    onChange: (mode: SearchMode) => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onChange }) => {
    return (
        <div className="flex items-center border-2 border-[var(--border)] bg-[var(--bg)]" style={{boxShadow:'var(--shadow-hard-sm)'}}>
            {(['analyze', 'learn'] as SearchMode[]).map((m) => (
                <button
                    key={m}
                    onClick={() => onChange(m)}
                    className={`px-4 py-1.5 text-[11px] font-mono transition-all relative ${
                        mode === m
                            ? 'bg-[var(--accent)] text-[var(--ink)] font-bold'
                            : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
                    }`}
                >
                    {m === 'analyze' ? 'study' : 'roadmap'}
                </button>
            ))}
        </div>
    );
};

export default ModeToggle;
