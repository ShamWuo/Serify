import { ArrowRight } from 'lucide-react';

interface AnalyzeButtonProps {
    onClick: () => void;
    disabled?: boolean;
    label?: string;
    className?: string;
}

const AnalyzeButton: React.FC<AnalyzeButtonProps> = ({ 
    onClick, 
    disabled = false, 
    label = "Analyze", 
    className = "" 
}) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 min-w-[170px] ${
                disabled
                    ? 'border border-[var(--border)] text-[var(--muted)]/40 cursor-not-allowed'
                    : 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[var(--accent)]/20'
            } ${className}`}
        >
            <span>{label}</span>
            <ArrowRight size={16} />
        </button>
    );
};

export default AnalyzeButton;
