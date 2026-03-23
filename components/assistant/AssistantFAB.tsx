import React from 'react';
import { MessageSquare, X, Sparkles } from 'lucide-react';
import { useAssistant } from '../../contexts/AssistantContext';

const AssistantFAB: React.FC = () => {
    const { isOpen, setIsOpen, hasUnreadSuggestion } = useAssistant();

    return (
        <div className="fixed bottom-6 right-6 z-[999]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`group relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-90 ${
                    isOpen 
                        ? 'bg-white text-[var(--accent)] border border-[var(--border)]' 
                        : 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 hover:scale-105'
                }`}
            >
                {}
                {!isOpen && (
                    <div className="absolute inset-0 rounded-full bg-[var(--accent)] blur-lg opacity-40 group-hover:opacity-60 transition-opacity animate-pulse" />
                )}
                
                {isOpen ? <X size={24} strokeWidth={2.5} /> : <MessageSquare size={24} strokeWidth={2.5} />}

                {}
                {!isOpen && hasUnreadSuggestion && (
                    <>
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 border-2 border-white"></span>
                        </span>
                        <div className="absolute -left-20 top-1/2 -translate-y-1/2 bg-white px-3 py-1.5 rounded-lg shadow-xl border border-[var(--border)] flex items-center gap-2 animate-bounce-horizontal whitespace-nowrap">
                            <Sparkles size={12} className="text-orange-500" />
                            <span className="text-[10px] font-black text-[var(--text)] uppercase tracking-widest">New tip</span>
                        </div>
                    </>
                )}
            </button>
        </div>
    );
};

export default AssistantFAB;
