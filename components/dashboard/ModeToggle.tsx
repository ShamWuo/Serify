import React from 'react';

export type SearchMode = 'analyze' | 'learn';

interface ModeToggleProps {
    mode: SearchMode;
    onChange: (mode: SearchMode) => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onChange }) => {
    return (
        <div className="flex items-center gap-1 p-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl">
            <button
                onClick={() => onChange('analyze')}
                className={`px-5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                    mode === 'analyze'
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'text-[var(--muted)] hover:text-indigo-500'
                }`}
            >
                Study
            </button>
            <button
                onClick={() => onChange('learn')}
                className={`px-5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                    mode === 'learn'
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'text-[var(--muted)] hover:text-indigo-500'
                }`}
            >
                Roadmap
            </button>
        </div>
    );
};

export default ModeToggle;
