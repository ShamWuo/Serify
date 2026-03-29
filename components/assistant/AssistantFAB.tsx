import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useAssistant } from '../../contexts/AssistantContext';

/** Collapsed control only — expanded UI is rendered by AssistantPanel in the same corner. */
const AssistantFAB: React.FC = () => {
    const { isOpen, setIsOpen, hasUnreadSuggestion } = useAssistant();

    if (isOpen) return null;

    return (
        <div className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-[999]">
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label="Open assistant"
                aria-expanded={false}
                className="relative flex h-12 w-12 md:h-[52px] md:w-[52px] items-center justify-center border-2 border-[var(--border)] bg-[var(--accent)] text-[var(--surface)] transition-all duration-200 hover:brightness-110 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
                style={{ borderRadius: '3px', boxShadow: 'var(--shadow-hard)' }}
            >
                <MessageSquare size={22} strokeWidth={2.5} className="shrink-0" />

                {hasUnreadSuggestion && (
                    <span
                        className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)] bg-[var(--warn)]"
                        aria-hidden
                    />
                )}
            </button>
        </div>
    );
};

export default AssistantFAB;
