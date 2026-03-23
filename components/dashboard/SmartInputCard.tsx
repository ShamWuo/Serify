import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Paperclip, X, AlertCircle, Sparkles, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/router';
import DetectionTag, { DetectedType } from './DetectionTag';
import ModeToggle, { SearchMode } from './ModeToggle';
import AnalyzeButton from './AnalyzeButton';

interface SmartInputCardProps {
    onAnalyze: (data: { content: string; type: DetectedType; mode: SearchMode }) => void;
    tokenBalance: number;
    compact?: boolean;
}

const SmartInputCard: React.FC<SmartInputCardProps> = ({ onAnalyze, tokenBalance }) => {
    const router = useRouter();
    const [input, setInput] = useState('');
    const [detectedType, setDetectedType] = useState<DetectedType | null>(null);
    const [mode, setMode] = useState<SearchMode>('analyze');
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stepText, setStepText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const detectType = useCallback((value: string) => {
        if (!value.trim()) return null;
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/i;
        if (youtubeRegex.test(value.trim())) return 'youtube';
        const urlRegex = /^https?:\/\//i;
        if (urlRegex.test(value.trim())) return 'article';
        if (value.length >= 150) return 'text';
        return null;
    }, []);

    useEffect(() => {
        if (!detectedType) {
            const type = detectType(input);
            if (type) setDetectedType(type);
        }
    }, [input, detectedType, detectType]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    }, [input]);

    const handlePaste = (e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData('text');
        const type = detectType(text);
        if (type) setDetectedType(type);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            handleFileSelect(droppedFile);
        }
    };

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile);
        setDetectedType('pdf'); 
        setInput(selectedFile.name);
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isProcessing) {
            setProgress(0);
            setStepText('Extracting content...');
            
            interval = setInterval(() => {
                setProgress(prev => {
                    if (prev < 15) {
                        setStepText('Extracting content...');
                        return prev + 1;
                    }
                    if (prev < 35) {
                        setStepText('Building concept map...');
                        return prev + 1;
                    }
                    if (prev < 65) {
                        setStepText('Generating questions...');
                        return prev + 1;
                    }
                    if (prev < 99) {
                        setStepText('Ready — starting your session');
                        return prev + 1;
                    }
                    return prev;
                });
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isProcessing]);

    const handleAnalyze = () => {
        if (!input.trim() && !file) return;
        
        const cost = mode === 'analyze' ? 8 : 2;
        if (tokenBalance < cost) {
            setError('Not enough tokens');
            return;
        }

        setError(null);
        setIsProcessing(true);
        
        
        setTimeout(() => {
            onAnalyze({ content: input, type: detectedType || 'text', mode });
        }, 5000);
    };

    if (isProcessing) {
        return (
            <div className="bg-surface rounded-2xl p-7 shadow-xl border border-[var(--border)] animate-fade-in min-h-[160px] flex flex-col justify-center">
                <h3 className="font-display text-xl text-[var(--text)] mb-6">Building study session...</h3>
                <div className="w-full bg-background h-2 rounded-full overflow-hidden mb-4">
                    <div 
                        className="bg-[var(--accent)] h-full transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between items-center text-sm">
                    <p className="text-[var(--muted)] font-medium animate-pulse">
                        {stepText} <span className="ml-1 opacity-50">{progress}%</span>
                    </p>
                    <button 
                        onClick={() => setIsProcessing(false)}
                        className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] hover:text-orange-600 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div 
            className={`glass rounded-[32px] p-8 transition-all duration-500 border-2 ${
                isDragging ? 'border-dashed border-[var(--accent)] bg-[var(--accent)]/[0.03]' : 'border-transparent shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-none'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shadow-lg shadow-[var(--accent)]/20 animate-bounce-slow">
                        <Sparkles size={16} />
                    </div>
                    <h2 className="font-display text-2xl text-[var(--text)] tracking-tight">What are you mastering today?</h2>
                </div>
                <p className="text-[var(--muted)] text-[14px] leading-relaxed">Paste anything — a URL, a PDF, or your rough notes. Serify extracts the core concepts and builds your study session.</p>
            </div>

            <div className="relative mb-6">
                {detectedType && (
                    <div className="absolute -top-10 left-0 animate-fade-in">
                        <DetectionTag type={detectedType} onDismiss={() => setDetectedType(null)} />
                    </div>
                )}
                <div className={`relative rounded-2xl border-2 transition-all duration-300 ${
                    isDragging ? 'border-transparent' : 'border-[var(--border)] focus-within:border-[var(--accent)]/30 focus-within:ring-4 focus-within:ring-[var(--accent)]/[0.03] group bg-[var(--bg)]/20 backdrop-blur-sm'
                }`}>
                    {isDragging ? (
                        <div className="h-[100px] flex flex-col items-center justify-center text-[var(--accent)] gap-2">
                            <Paperclip size={24} className="animate-bounce" />
                            <p className="font-black uppercase tracking-widest text-[10px]">Release to Study</p>
                        </div>
                    ) : (
                        <>
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onPaste={handlePaste}
                                placeholder={mode === 'analyze' ? "Paste any content to start studying..." : "Type a goal (e.g. \"Learn Quantum Physics\") to build a roadmap..."}
                                className="w-full min-h-[100px] bg-transparent border-none focus:ring-0 p-5 pb-12 text-[15.5px] leading-relaxed resize-none overflow-hidden placeholder:text-[var(--muted)]/50 font-medium"
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-surface border border-[var(--border)] text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 hover:shadow-md transition-all group"
                                aria-label="Attach file"
                            >
                                <Paperclip size={18} className="group-hover:rotate-12 transition-transform" />
                            </button>
                        </>
                    )}
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    accept=".pdf,.txt,.md,.docx"
                />

                {!isDragging && (
                    <div className="mt-8 pt-8 border-t border-dashed border-gray-100/80 animate-fade-in-up">
                        <div className="flex flex-col gap-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--muted)] opacity-60">Or jump straight in:</h4>
                            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2.5">
                                <button 
                                    onClick={() => {
                                        if (input.trim()) {
                                            router.push(`/practice/flashcards?topic=${encodeURIComponent(input.trim())}`);
                                        } else {
                                            
                                            
                                            router.push('/practice/flashcards');
                                        }
                                    }}
                                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg)]/50 border border-[var(--border)] hover:border-[var(--accent)]/30 hover:bg-surface hover:shadow-md transition-all group shrink-0"
                                >
                                    <span className="text-sm">🃏</span>
                                    <span className="text-[13px] font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">Generate Flashcards</span>
                                </button>
                                <button 
                                    onClick={() => {
                                        if (input.trim()) {
                                            router.push(`/practice/test?topic=${encodeURIComponent(input.trim())}`);
                                        } else {
                                            router.push('/practice/test');
                                        }
                                    }}
                                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg)]/50 border border-[var(--border)] hover:border-[var(--accent)]/30 hover:bg-surface hover:shadow-md transition-all group shrink-0"
                                >
                                    <span className="text-sm">📝</span>
                                    <span className="text-[13px] font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">Practice Test</span>
                                </button>
                                <button 
                                    onClick={() => {
                                        if (input.trim()) {
                                            router.push(`/practice/review?topic=${encodeURIComponent(input.trim())}`);
                                        } else {
                                            router.push('/practice/review');
                                        }
                                    }}
                                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg)]/50 border border-[var(--border)] hover:border-[var(--accent)]/30 hover:bg-surface hover:shadow-md transition-all group shrink-0"
                                >
                                    <span className="text-sm">🔄</span>
                                    <span className="text-[13px] font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">Spaced Review</span>
                                </button>
                                <button 
                                    onClick={() => router.push('/flow')}
                                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg)]/50 border border-[var(--border)] hover:border-[var(--accent)]/30 hover:bg-surface hover:shadow-md transition-all group shrink-0"
                                >
                                    <span className="text-sm">✦</span>
                                    <span className="text-[13px] font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">Learn Mode</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="mb-6 p-5 rounded-2xl bg-warn-soft border border-warn/10 flex items-start gap-4 animate-modal-in">
                    <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-warn shadow-sm shrink-0">
                        <AlertCircle size={18} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[13px] font-bold text-orange-900 leading-tight">{error}</p>
                        {error === 'Not enough tokens' ? (
                            <button 
                                onClick={() => router.push('/settings/billing')}
                                className="mt-2 text-[10px] font-black uppercase tracking-wider text-orange-600 hover:text-orange-700 flex items-center gap-1 group"
                            >
                                Upgrade to Pro <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        ) : (
                            <p className="mt-1 text-[11px] text-orange-700/70 leading-relaxed italic">Try pasting the raw text instead of a URL.</p>
                        )}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between gap-6 pt-4 border-t border-gray-100/50">
                <div className="flex items-center gap-6">
                    <ModeToggle mode={mode} onChange={setMode} />
                    <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg)]/50 border border-[var(--border)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
                            {mode === 'analyze' ? "Study — test what you learned" : "Roadmap Mode"}
                        </span>
                    </div>
                </div>
                <AnalyzeButton 
                    onClick={handleAnalyze} 
                    disabled={!input.trim() && !file}
                    label={mode === 'analyze' ? "Study →" : "Generate Roadmap"}
                />
            </div>
        </div>
    );
};

export default SmartInputCard;
