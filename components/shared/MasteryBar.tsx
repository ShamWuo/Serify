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
    showLegend?: boolean;
}

const MasteryBar: React.FC<MasteryBarProps> = ({ mastery, height = 4, className = "", showLegend = false }) => {
    const total = mastery.solid + mastery.developing + mastery.shaky + mastery.revisit;
    
    const LegendItem = ({ color, label, count }: { color: string, label: string, count: number }) => (
        <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
            <span className="text-[8px] font-mono text-[var(--muted)] uppercase whitespace-nowrap">
                {label} <span className="text-[var(--text)] font-bold">{count}</span>
            </span>
        </div>
    );

    if (total === 0) {
        return (
            <div className="space-y-2">
                <div className={`w-full bg-[var(--bg)] border border-[var(--border)] rounded-full ${className}`} style={{ height }} />
                {showLegend && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                        <LegendItem color="bg-indigo-600" label="Solid" count={0} />
                        <LegendItem color="bg-indigo-400" label="Developing" count={0} />
                        <LegendItem color="bg-orange-500" label="Shaky" count={0} />
                        <LegendItem color="bg-red-500" label="Revisit" count={0} />
                    </div>
                )}
            </div>
        );
    }

    const getWidth = (count: number) => (count / total) * 100;

    return (
        <div className="space-y-2">
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
            
            {showLegend && (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <LegendItem color="bg-indigo-600" label="Solid" count={mastery.solid} />
                    <LegendItem color="bg-indigo-400" label="Developing" count={mastery.developing} />
                    <LegendItem color="bg-orange-500" label="Shaky" count={mastery.shaky} />
                    <LegendItem color="bg-red-500" label="Revisit" count={mastery.revisit} />
                </div>
            )}
        </div>
    );
};

export default MasteryBar;
