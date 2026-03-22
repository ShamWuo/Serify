import React from 'react';
import { useAssistant } from '../../contexts/AssistantContext';
import AssistantChat from './AssistantChat';
import { Minus, X, Maximize2 } from 'lucide-react';

const AssistantPanel: React.FC = () => {
    const { isOpen, setIsOpen, isMinimized, setIsMinimized } = useAssistant();

    if (!isOpen) return null;

    if (isMinimized) {
        return (
            <div 
                className="fixed bottom-24 right-6 w-72 bg-white rounded-2xl shadow-2xl border border-[var(--border)] p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-all animate-slide-up z-[998]"
                onClick={() => setIsMinimized(false)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white">
                        <Minus size={16} />
                    </div>
                    <span className="text-sm font-bold text-[var(--text)]">Assistant Minimized</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="text-[var(--muted)] hover:text-red-500">
                    <X size={16} />
                </button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-0 right-0 md:bottom-24 md:right-6 w-full h-full md:w-[400px] md:h-[600px] md:max-h-[calc(100vh-120px)] bg-white md:rounded-3xl shadow-2xl border-t md:border border-[var(--border)] flex flex-col overflow-hidden animate-slide-up z-[998]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white shadow-md shadow-[var(--accent)]/10">
                        <Sparkles size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[var(--text)]">Assistant</h3>
                        <p className="text-[10px] font-medium text-[var(--accent)] uppercase tracking-widest">Active session</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setIsMinimized(true)}
                        className="p-2 text-[var(--muted)] hover:text-[var(--text)] hover:bg-gray-100 rounded-lg transition-colors"
                        title="Minimize"
                    >
                        <Minus size={16} />
                    </button>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-[var(--muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Close"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-hidden">
                <AssistantChat />
            </div>
        </div>
    );
};

import { Sparkles } from 'lucide-react';

export default AssistantPanel;
