import React from 'react';

interface MasteryBarProps {
    mastery: {
        solid: number;
        developing: number;
        shaky: number;
        revisit: number;
    };
    height?: number;
    className?: string;
}

const MasteryBar: React.FC<MasteryBarProps> = ({ mastery, height = 4, className = "" }) => {
    const total = mastery.solid + mastery.developing + mastery.shaky + mastery.revisit;
    if (total === 0) {
        return <div className={`w-full bg-[var(--bg)] border border-[var(--border)] rounded-full ${className}`} style={{ height }} />;
    }

    const getWidth = (count: number) => (count / total) * 100;

    return (
        <div className={`w-full flex rounded-full overflow-hidden border border-[var(--border)]/30 shadow-inner bg-[var(--bg)] ${className}`} style={{ height }}>
            <div
                className="bg-indigo-600 h-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(79,70,229,0.3)]"
                style={{ width: `${getWidth(mastery.solid)}%` }}
                title={`Solid: ${mastery.solid}`}
            />
            <div
                className="bg-indigo-400 h-full transition-all duration-700 ease-out opacity-70"
                style={{ width: `${getWidth(mastery.developing)}%` }}
                title={`Developing: ${mastery.developing}`}
            />
            <div
                className="bg-orange-500 h-full transition-all duration-700 ease-out"
                style={{ width: `${getWidth(mastery.shaky)}%` }}
                title={`Shaky: ${mastery.shaky}`}
            />
            <div
                className="bg-red-500 h-full transition-all duration-700 ease-out"
                style={{ width: `${getWidth(mastery.revisit)}%` }}
                title={`Revisit: ${mastery.revisit}`}
            />
        </div>
    );
};

export default MasteryBar;
