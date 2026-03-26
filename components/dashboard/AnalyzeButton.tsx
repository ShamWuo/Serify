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
            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 min-w-[150px] ${
                disabled
                    ? 'bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)]/40 cursor-not-allowed'
                    : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]'
            } ${className}`}
        >
            <span>{label}</span>
            <ArrowRight size={15} strokeWidth={2} />
        </button>
    );
};

export default AnalyzeButton;
