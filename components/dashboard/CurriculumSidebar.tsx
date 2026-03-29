import { BookOpen } from 'lucide-react';
import { normalizeTitle } from '@/lib/formatters';

interface Concept {
    conceptId: string;
    conceptName: string;
    id?: string;
    name?: string;
}

interface Unit {
    unitNumber: number;
    unitTitle: string;
    concepts: Concept[];
}

interface CurriculumSidebarProps {
    concepts: Concept[];
    units?: Unit[];
    currentIndex: number;
    conceptStatuses: Record<string, 'not_started' | 'in_progress' | 'completed'>;
    onConceptClick?: (index: number) => void;
    title?: string;
}

export default function CurriculumSidebar({
    concepts,
    units,
    currentIndex,
    conceptStatuses,
    onConceptClick,
    title
}: CurriculumSidebarProps) {
    
    // Fallback if no units provided, treat all concepts as one group
    const displayUnits = units || (concepts.length > 0 ? [{
        unitNumber: 1,
        unitTitle: 'Course Pathway',
        concepts: concepts
    }] : []);

    return (
        <div className="flex flex-col h-full font-sans py-4 px-2">
            {/* Unit Based List */}
            <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pb-10">
                {displayUnits.map((unit, uIdx) => (
                    <div key={uIdx} className="space-y-1">
                        <div className="px-2 mb-2">
                             <span className="text-[10px] font-mono font-bold text-emerald-600/60 uppercase tracking-[0.2em] opacity-80">
                                UNIT {unit.unitNumber || uIdx + 1}: {unit.unitTitle}
                            </span>
                        </div>
                        
                        <div className="space-y-0.5">
                            {unit.concepts.map((concept, cIdx) => {
                                // Find global index for the click handler
                                const globalIdx = concepts.findIndex(c => (c.conceptId || c.id) === (concept.conceptId || concept.id));
                                const conceptId = concept.conceptId || concept.id || '';
                                const conceptName = concept.conceptName || concept.name || '';
                                const status = conceptStatuses[conceptId] || 'not_started';
                                const isCurrent = globalIdx === currentIndex;
                                const isCompleted = status === 'completed';
                                const isClickable = (isCompleted || isCurrent) && onConceptClick;

                                return (
                                    <button
                                        key={conceptId || cIdx}
                                        disabled={!isClickable}
                                        onClick={() => isClickable && onConceptClick && onConceptClick(globalIdx)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md transition-all text-left group ${
                                            isCurrent 
                                                ? 'text-emerald-700 font-bold bg-emerald-500/5' 
                                                : isCompleted 
                                                    ? 'text-emerald-700/60 hover:text-emerald-700 hover:bg-emerald-50/50' 
                                                    : 'text-[var(--muted)] opacity-30 cursor-not-allowed'
                                        }`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${
                                            isCurrent ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : isCompleted ? 'bg-emerald-300' : 'bg-[var(--border)]'
                                        }`} />
                                        <span className={`text-[12px] leading-tight truncate uppercase tracking-tight ${
                                            isCurrent ? 'opacity-100' : 'opacity-80'
                                        }`}>
                                            {normalizeTitle(conceptName)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
