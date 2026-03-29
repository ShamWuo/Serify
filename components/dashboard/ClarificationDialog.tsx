import React, { useState } from 'react';
import { Sparkles, X, ArrowRight, MessageSquare, BookOpen } from 'lucide-react';

interface ClarificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  question: string;
  options?: string[];
  onConfirm: (response: string, updatedMode?: 'learn' | 'roadmap') => void;
  isLoading?: boolean;
}

const ClarificationDialog: React.FC<ClarificationDialogProps> = ({
  isOpen,
  onClose,
  question,
  options = [],
  onConfirm,
  isLoading = false
}) => {
  const [customResponse, setCustomResponse] = useState('');

  if (!isOpen) return null;

  const handleOptionClick = (option: string) => {
    // If the option looks like a mode selection, we can hint at it
    let mode: 'learn' | 'roadmap' | undefined = undefined;
    if (option.toLowerCase().includes('quick') || option.toLowerCase().includes('learn now')) {
      mode = 'learn';
    } else if (option.toLowerCase().includes('roadmap') || option.toLowerCase().includes('course') || option.toLowerCase().includes('curriculum')) {
      mode = 'roadmap';
    }
    onConfirm(option, mode);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-[var(--bg)]/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-[var(--surface)] border-2 border-[var(--border)] shadow-[var(--shadow-hard)] overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header decoration */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[var(--accent)] via-[var(--accent)]/50 to-transparent" />
        
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/20">
                <Sparkles size={20} className="text-[var(--accent)]" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-widest text-[var(--text)] uppercase">AI Clarification</h3>
                <p className="text-[10px] font-mono text-[var(--muted)]">Refining your learning intent</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="relative p-5 bg-[var(--bg)] border border-[var(--border-soft)]">
              <MessageSquare size={14} className="absolute -top-2 -left-2 text-[var(--accent)] fill-[var(--bg)]" />
              <p className="text-sm leading-relaxed text-[var(--text)] font-medium italic">
                &quot;{question}&quot;
              </p>
            </div>

            {options.length > 0 && (
              <div className="grid grid-cols-1 gap-2">
                {options.map((option, idx) => {
                  const isQuick = option.toLowerCase().includes('quick') || option.toLowerCase().includes('learn now');
                  const isRoadmap = option.toLowerCase().includes('roadmap') || option.toLowerCase().includes('course');
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionClick(option)}
                      disabled={isLoading}
                      className="group flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        {isQuick && <BookOpen size={14} className="text-[var(--accent)]" />}
                        {isRoadmap && <BookOpen size={14} className="text-[var(--accent)]" />}
                        <span className="text-xs font-mono font-bold text-[var(--text)] group-hover:text-[var(--accent)]">
                          {option}
                        </span>
                      </div>
                      <ArrowRight size={14} className="text-[var(--muted)] group-hover:text-[var(--accent)] transition-all transform group-hover:translate-x-1" />
                    </button>
                  );
                })}
              </div>
            )}

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                <MessageSquare size={14} />
              </div>
              <input
                type="text"
                value={customResponse}
                onChange={(e) => setCustomResponse(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && customResponse.trim() && !isLoading && onConfirm(customResponse)}
                placeholder="Or type a custom answer..."
                className="w-full h-12 pl-12 pr-4 bg-[var(--bg)] border-2 border-[var(--border)] outline-none focus:border-[var(--accent)] transition-all text-sm font-mono"
              />
              {customResponse.trim() && (
                 <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-end gap-1">
                  <button 
                    onClick={() => onConfirm(customResponse)}
                    disabled={isLoading}
                    className="h-8 px-3 bg-[var(--accent)] text-white text-[10px] font-black uppercase tracking-wider"
                  >
                    Send
                  </button>
                  <span className="text-[8px] text-[var(--accent)] font-mono font-bold uppercase tracking-tighter pr-1 animate-pulse">
                    Study this context now ✦
                  </span>
                 </div>
              )}
            </div>
            
            <div className="flex justify-between items-center pt-2">
              <button 
                onClick={onClose}
                className="text-[10px] font-mono text-[var(--muted)] hover:text-[var(--text)] underline uppercase tracking-widest"
              >
                Skip & Proceed
              </button>
              <p className="text-[9px] font-mono text-[var(--muted)] opacity-50 uppercase tracking-tighter">
                This helps customize your results
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClarificationDialog;
