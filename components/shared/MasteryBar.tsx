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
        return <div className={`w-full bg-gray-200 rounded-full ${className}`} style={{ height }} />;
    }

    const getWidth = (count: number) => (count / total) * 100;

    return (
        <div className={`w-full flex rounded-full overflow-hidden ${className}`} style={{ height }}>
            <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${getWidth(mastery.solid)}%` }}
                title={`Solid: ${mastery.solid}`}
            />
            <div
                className="bg-blue-400 h-full transition-all duration-500"
                style={{ width: `${getWidth(mastery.developing)}%` }}
                title={`Developing: ${mastery.developing}`}
            />
            <div
                className="bg-orange-500 h-full transition-all duration-500"
                style={{ width: `${getWidth(mastery.shaky)}%` }}
                title={`Shaky: ${mastery.shaky}`}
            />
            <div
                className="bg-red-500 h-full transition-all duration-500"
                style={{ width: `${getWidth(mastery.revisit)}%` }}
                title={`Revisit: ${mastery.revisit}`}
            />
        </div>
    );
};

export default MasteryBar;
