import React from 'react';

export type SearchMode = 'analyze' | 'learn';

interface ModeToggleProps {
    mode: SearchMode;
    onChange: (mode: SearchMode) => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onChange }) => {
    return (
        <div className="flex items-center gap-1.5 bg-[var(--bg)]/50 p-1 rounded-2xl border border-[var(--border)]">
            <button
                onClick={() => onChange('analyze')}
                className={`px-5 py-2 rounded-xl text-[11px] font-bold transition-all uppercase tracking-wider ${
                    mode === 'analyze'
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
            >
                Study
            </button>
            <button
                onClick={() => onChange('learn')}
                className={`px-5 py-2 rounded-xl text-[11px] font-bold transition-all uppercase tracking-wider ${
                    mode === 'learn'
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
            >
                Learn
            </button>
        </div>
    );
};

export default ModeToggle;
