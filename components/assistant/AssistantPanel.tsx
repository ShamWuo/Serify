import React from 'react';
import { MessageSquare, Minus, X } from 'lucide-react';
import { useAssistant } from '../../contexts/AssistantContext';
import AssistantChat from './AssistantChat';

/** Anchored bottom-right — same footprint as the FAB; expanded / minimized states replace the FAB. */
const AssistantPanel: React.FC = () => {
    const { isOpen, setIsOpen, isMinimized, setIsMinimized } = useAssistant();

    if (!isOpen) return null;

    const shell =
        'fixed bottom-5 right-5 md:bottom-6 md:right-6 z-[999] flex flex-col border-2 border-[var(--border)] bg-[var(--surface)] overflow-hidden font-mono';
    const shellShadow = { boxShadow: 'var(--shadow-hard)', borderRadius: '3px' } as const;

    if (isMinimized) {
        return (
            <div
                className={`${shell} w-[min(100vw-2.5rem,400px)] h-14 flex-row items-center justify-between px-3 py-2 cursor-pointer hover:bg-[var(--bg)] transition-colors`}
                style={shellShadow}
                onClick={() => setIsMinimized(false)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsMinimized(false);
                    }
                }}
                aria-label="Expand assistant"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <div
                        className="shrink-0 flex h-9 w-9 items-center justify-center border-2 border-[var(--border)] bg-[var(--accent)] text-[var(--surface)]"
                        style={{ borderRadius: '3px', boxShadow: 'var(--shadow-hard-sm)' }}
                    >
                        <MessageSquare size={18} strokeWidth={2.5} />
                    </div>
                    <span className="text-[11px] font-bold text-[var(--text)] truncate uppercase tracking-wider">
                        Assistant
                    </span>
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                    }}
                    className="shrink-0 p-2 text-[var(--muted)] hover:text-[var(--warn)] transition-colors"
                    aria-label="Close assistant"
                >
                    <X size={18} strokeWidth={2} />
                </button>
            </div>
        );
    }

    return (
        <div
            className={`${shell} w-[min(100vw-2.5rem,400px)] h-[min(560px,calc(100dvh-5.5rem)] max-h-[calc(100dvh-5.5rem)]`}
            style={shellShadow}
        >
            <header className="shrink-0 flex items-center justify-between gap-2 border-b-2 border-[var(--border)] bg-[var(--bg)] px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                    <div
                        className="shrink-0 flex h-9 w-9 items-center justify-center border-2 border-[var(--border)] bg-[var(--accent)] text-[var(--surface)]"
                        style={{ borderRadius: '3px', boxShadow: 'var(--shadow-hard-sm)' }}
                    >
                        <MessageSquare size={18} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-[12px] font-bold text-[var(--text)] leading-tight truncate">Assistant</h3>
                        <p className="text-[9px] font-mono text-[var(--muted)] truncate">{'// learning companion'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsMinimized(true)}
                        className="p-2 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] border-2 border-transparent hover:border-[var(--border-soft)] transition-colors"
                        style={{ borderRadius: '3px' }}
                        title="Minimize"
                        aria-label="Minimize assistant"
                    >
                        <Minus size={16} strokeWidth={2.5} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-[var(--muted)] hover:text-[var(--warn)] hover:bg-[var(--warn-soft)] border-2 border-transparent transition-colors"
                        style={{ borderRadius: '3px' }}
                        title="Close"
                        aria-label="Close assistant"
                    >
                        <X size={16} strokeWidth={2.5} />
                    </button>
                </div>
            </header>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-[var(--bg)]">
                <AssistantChat />
            </div>
        </div>
    );
};

export default AssistantPanel;
