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
            className={`btn-primary flex items-center justify-center gap-2 px-6 py-2.5 min-w-[130px] ${
                disabled
                    ? 'opacity-50 grayscale cursor-not-allowed shadow-none'
                    : ''
            } ${className}`}
            style={{ borderRadius: '3px' }}
        >
            <span className="text-[12px] uppercase tracking-wider font-bold">{label}</span>
            <ArrowRight size={14} strokeWidth={2.5} />
        </button>
    );
};

export default AnalyzeButton;
