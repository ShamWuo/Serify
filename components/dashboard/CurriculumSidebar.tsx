import { useRouter } from 'next/router';
import {
    CheckCircle2,
    Lock,
    ChevronRight,
    Library
} from 'lucide-react';

interface Concept {
    conceptId: string;
    conceptName: string;
    id?: string;
    name?: string;
}

interface CurriculumSidebarProps {
    concepts: Concept[];
    currentIndex: number;
    conceptStatuses: Record<string, 'not_started' | 'in_progress' | 'completed'>;
    onConceptClick?: (index: number) => void;
    title?: string;
}

export default function CurriculumSidebar({
    concepts,
    currentIndex,
    conceptStatuses,
    onConceptClick,
    title
}: CurriculumSidebarProps) {
    const router = useRouter();

    return (
        <div className="flex flex-col h-full">
            {title && (
                <div className="px-3 mb-6">
                    <div className="flex items-center gap-2 text-[var(--accent)] mb-1">
                        <Library size={16} />
                        <span className="text-[10px] uppercase font-bold tracking-widest">
                            Curriculum
                        </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--text)] truncate">
                        {title}
                    </h3>
                </div>
            )}

            <div className="space-y-1 overflow-y-auto pr-2 custom-scrollbar">
                {concepts.map((concept, i) => {
                    // Show all concepts in the sidebar

                    const conceptId = concept.conceptId || concept.id || '';
                    const conceptName = concept.conceptName || concept.name || '';
                    const status = conceptStatuses[conceptId] || 'not_started';
                    const isCurrent = i === currentIndex;
                    const isCompleted = status === 'completed';
                    const isInProgress = status === 'in_progress';
                    const isClickable = (isCompleted || isInProgress) && onConceptClick;

                    return (
                        <button
                            key={conceptId || i}
                            disabled={!isClickable && !isCurrent}
                            onClick={() => isClickable && onConceptClick(i)}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl transition-all duration-200 group relative text-left ${isCurrent
                                ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                                : isCompleted
                                    ? 'text-emerald-600 hover:bg-emerald-50'
                                    : 'text-[var(--muted)] opacity-60'
                                } ${isClickable || isCurrent ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="shrink-0">
                                    {isCompleted ? (
                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                    ) : isCurrent || isInProgress ? (
                                        <div className="w-4 h-4 rounded-full border-2 border-[var(--accent)] flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                                        </div>
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border border-[var(--border)]" />
                                    )}
                                </div>
                                <span className="text-xs tracking-wide truncate">
                                    {conceptName}
                                </span>
                            </div>

                            {isCurrent && (
                                <ChevronRight size={14} className="text-[var(--accent)] shrink-0" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
