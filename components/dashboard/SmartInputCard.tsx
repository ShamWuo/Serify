import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Paperclip, X, AlertCircle, Zap, ChevronRight, Brain, Target, MessageSquare, History, FileText, Search, Play } from 'lucide-react';
import { useRouter } from 'next/router';
import DetectionTag, { DetectedType } from './DetectionTag';
import ModeToggle, { SearchMode } from './ModeToggle';
import AnalyzeButton from './AnalyzeButton';

interface SmartInputCardProps {
    onAnalyze: (data: { content: string; type: DetectedType; mode: SearchMode; file?: File }) => Promise<void>;
    percentUsed: number;
    compact?: boolean;
}

const SmartInputCard: React.FC<SmartInputCardProps> = ({ onAnalyze, percentUsed, compact = false }) => {
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
            textarea.style.height = `${Math.max(100, Math.min(textarea.scrollHeight, 200))}px`;
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
        setDetectedType('file'); 
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

    const handleAnalyze = async () => {
        if (!input.trim() && !file) return;
        
        if (percentUsed >= 100) {
            setError('Usage limit reached');
            return;
        }

        setError(null);
        setIsProcessing(true);
        
        try {
            await onAnalyze({ content: input, type: detectedType || 'text', mode, file: file || undefined });
        } catch (err: any) {
            setError(err.message || 'Analysis failed');
            setIsProcessing(false);
        }
    };

    if (isProcessing) {
        return (
            <div className="bg-[var(--surface)] rounded-[2rem] p-8 shadow-md border border-[var(--border)] animate-fade-in flex flex-col justify-center min-h-[200px]">
                <div className="flex items-center gap-4 mb-7">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center animate-pulse">
                        <Brain size={22} strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-semibold text-[var(--text)]">Building your session</h3>
                        <p className="text-[11px] text-[var(--muted)] opacity-50 mt-0.5">thinking...</p>
                    </div>
                </div>
                <div className="w-full bg-[var(--bg)] h-1.5 rounded-full overflow-hidden mb-5 border border-[var(--border)]">
                    <div 
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between items-center px-0.5">
                    <p className="text-[var(--muted)] text-[11px] flex items-center gap-2">
                        {stepText} <span className="opacity-40 tabular-nums">{progress}%</span>
                    </p>
                    <button 
                        onClick={() => setIsProcessing(false)}
                        className="text-[11px] text-[var(--muted)]/40 hover:text-red-400 transition-colors"
                    >
                        cancel
                    </button>
                </div>
            </div>
        );
    }


    return (
        <div 
            className={`bg-[var(--surface)] rounded-[2.5rem] p-8 transition-all duration-500 border border-[var(--border)] shadow-sm group/card ${
                isDragging ? 'border-dashed border-indigo-500 bg-indigo-500/[0.03]' : 'hover:shadow-[0_20px_40px_rgba(0,0,0,0.03)]'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="relative">
                {detectedType && (
                    <div className="absolute -top-12 left-0 animate-fade-in z-10">
                        <DetectionTag type={detectedType} onDismiss={() => setDetectedType(null)} />
                    </div>
                )}
                <div className={`relative rounded-[1.5rem] border transition-all duration-500 ${
                    isDragging ? 'border-transparent shadow-none' : 'border-[var(--border)] shadow-sm'
                } focus-within:border-indigo-500/30 focus-within:ring-8 focus-within:ring-indigo-500/[0.02] bg-[var(--bg)]/50 group-hover/card:bg-white transition-all`}>
                    {isDragging ? (
                        <div className="h-[140px] flex flex-col items-center justify-center text-indigo-400 gap-3">
                            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                <Paperclip size={20} strokeWidth={2} />
                            </div>
                            <p className="text-[12px] text-indigo-400">Drop it here</p>
                        </div>
                    ) : (
                        <>
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onPaste={handlePaste}
                                placeholder="Paste a link, PDF text, or your notes..."
                                className="w-full min-h-[140px] bg-transparent border-none focus:ring-0 p-6 pb-16 text-[15px] leading-relaxed resize-none overflow-hidden placeholder:text-[var(--muted)]/30 font-normal"
                            />
                            <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 rounded-xl bg-white border border-[var(--border)] text-[var(--muted)] hover:text-indigo-500 hover:border-indigo-500/20 hover:shadow-sm transition-all flex items-center gap-2.5 group/btn"
                                    aria-label="Attach file"
                                >
                                    <Paperclip size={15} strokeWidth={2} />
                                    <span className="text-[11px] font-medium">Attach file</span>
                                </button>

                                <div className="flex items-center gap-3">
                                    {detectedType && (
                                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-xl animate-fade-in border border-indigo-500/10">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                            <span className="text-[10px] text-indigo-500">ready</span>
                                        </div>
                                    )}
                                    <AnalyzeButton 
                                        onClick={handleAnalyze} 
                                        disabled={(!input.trim() && !file) || percentUsed >= 100}
                                        label="Start session"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    accept=".pdf,.txt,.md,.docx,.mp3,.mp4,.wav,.jpg,.png"
                />

                {!isDragging && (
                    <div className="mt-8 pt-7 border-t border-[var(--border)]/50 animate-fade-in-up">
                        <div className="space-y-4">
                            <h4 className="text-[11px] text-[var(--muted)] px-1 opacity-50">or jump straight to</h4>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <button 
                                    onClick={() => router.push('/practice/flashcards')}
                                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--bg)]/60 border border-[var(--border)] hover:border-orange-500/20 hover:bg-white hover:shadow-sm transition-all group duration-300"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                                        <Zap size={15} strokeWidth={2} />
                                    </div>
                                    <span className="text-[12px] font-medium text-[var(--text)]">Flashcards</span>
                                </button>
                                <button 
                                    onClick={() => router.push('/practice/test')}
                                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--bg)]/60 border border-[var(--border)] hover:border-blue-500/20 hover:bg-white hover:shadow-sm transition-all group duration-300"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                                        <Target size={15} strokeWidth={2} />
                                    </div>
                                    <span className="text-[12px] font-medium text-[var(--text)]">Test mode</span>
                                </button>
                                <button 
                                    onClick={() => router.push('/practice/review')}
                                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--bg)]/60 border border-[var(--border)] hover:border-purple-500/20 hover:bg-white hover:shadow-sm transition-all group duration-300"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                                        <History size={15} strokeWidth={2} />
                                    </div>
                                    <span className="text-[12px] font-medium text-[var(--text)]">Review</span>
                                </button>
                                <button 
                                    onClick={() => router.push('/flow')}
                                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--bg)]/60 border border-[var(--border)] hover:border-indigo-500/20 hover:bg-white hover:shadow-sm transition-all group duration-300"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                                        <Play size={15} fill="currentColor" strokeWidth={0} />
                                    </div>
                                    <span className="text-[12px] font-medium text-[var(--text)]">Flow mode</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {error && (
                <div className="mt-6 p-5 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 animate-modal-in">
                    <div className="w-9 h-9 rounded-xl bg-red-100 text-red-500 flex items-center justify-center shrink-0">
                        <AlertCircle size={18} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                        <p className="text-[12px] font-medium text-red-600">{error}</p>
                        {error === 'Usage limit reached' && (
                            <button 
                                onClick={() => router.push('/settings/billing')}
                                className="mt-1.5 flex items-center gap-1.5 text-[11px] text-red-500 hover:text-red-700 underline underline-offset-4 transition-all"
                            >
                                Upgrade your plan <ChevronRight size={11} strokeWidth={2} />
                            </button>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default SmartInputCard;

