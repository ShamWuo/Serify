import React from 'react';
import { Target } from 'lucide-react';

interface AssistantSuggestedActionProps {
    label: string;
    onClick: () => void;
}

const AssistantSuggestedAction: React.FC<AssistantSuggestedActionProps> = ({ label, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-full text-xs font-bold text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all animate-fade-in shadow-sm hover:shadow-md active:scale-95"
        >
            <Target size={12} className="text-[var(--accent)]" />
            <span>{label}</span>
        </button>
    );
};

export default AssistantSuggestedAction;
