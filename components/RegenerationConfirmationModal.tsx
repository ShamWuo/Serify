import React from 'react';
import { AlertTriangle, Zap, X } from 'lucide-react';

interface RegenerationConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    cost: number;
}

export function RegenerationConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    cost,
}: RegenerationConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <AlertTriangle size={20} />
                    </div>
                    <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)] transition-colors p-1 rounded-md hover:bg-[var(--surface)]">
                        <X size={20} />
                    </button>
                </div>

                <h3 className="text-[20px] font-bold text-[var(--text)] mb-2">{title}</h3>
                <p className="text-[15px] text-[var(--text)] opacity-80 mb-6 leading-relaxed">
                    {description}
                </p>

                <div className="flex items-center justify-between mt-8">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface)] rounded-lg transition-colors border border-transparent hover:border-[var(--border)]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                    >
                        Regenerate
                        <span className="flex items-center gap-1 opacity-90 text-[12px] bg-red-700/50 px-1.5 py-0.5 rounded-md">
                            <Zap size={12} fill="currentColor" /> {cost}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
