import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Paperclip, X, AlertCircle, Zap, ChevronRight, Brain, Target, History, FileText, Play } from 'lucide-react';
import { useRouter } from 'next/router';
import DetectionTag, { DetectedType } from './DetectionTag';
import ModeToggle, { SearchMode } from './ModeToggle';
import AnalyzeButton from './AnalyzeButton';

interface SmartInputCardProps {
    onAnalyze: (data: { content: string; type: DetectedType; mode: SearchMode; file?: File }) => Promise<void>;
    tokenBalance: number;
    totalLimit?: number;
    compact?: boolean;
    isProcessing?: boolean;
    transparent?: boolean;
}

const STEPS = [
    { until: 15, text: '// extracting content...' },
    { until: 35, text: '// building concept map...' },
    { until: 65, text: '// generating questions...' },
    { until: 99, text: '// ready — starting session' },
];

const SmartInputCard: React.FC<SmartInputCardProps> = ({ 
    onAnalyze, 
    tokenBalance, 
    totalLimit = 1,
    compact = false, 
    isProcessing: externalProcessing = false,
    transparent = false
}) => {
    const router = useRouter();
    const [input, setInput] = useState('');
    const [detectedType, setDetectedType] = useState<DetectedType | null>(null);
    const [mode, setMode] = useState<SearchMode>('analyze');
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [internalProcessing, setInternalProcessing] = useState(false);
    
    const isProcessing = internalProcessing || externalProcessing;
    const [progress, setProgress] = useState(0);
    const [stepText, setStepText] = useState(STEPS[0].text);
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

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) handleFileSelect(droppedFile);
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
            setStepText(STEPS[0].text);
            interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 99) return prev;
                    const next = prev + 1;
                    const step = STEPS.find(s => next < s.until);
                    if (step) setStepText(step.text);
                    return next;
                });
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isProcessing]);

    const handleAnalyze = async (actionOverride?: SearchMode | 'curriculum') => {
        if (!input.trim() && !file) return;
        if (tokenBalance <= 0) { setError('Usage limit reached'); return; }
        setError(null);
        setInternalProcessing(true);
        try {
            await onAnalyze({ content: input, type: detectedType || 'text', mode: (actionOverride as any) || mode, file: file || undefined });
        } catch (err: any) {
            setError(err.message || 'Analysis failed');
            setInternalProcessing(false);
        }
    };

    if (isProcessing) {
        return (
            <div className="paper-card p-4 flex flex-col justify-center min-h-[140px] animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 border-2 border-[var(--border)] flex items-center justify-center text-[var(--accent)] animate-pulse" style={{boxShadow:'var(--shadow-hard-sm)'}}>
                        <Brain size={16} strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-display font-bold text-[var(--text)]">Building your session</h3>
                        <p className="text-[10px] font-mono text-[var(--muted)]">{stepText}</p>
                    </div>
                </div>
                {/* Tally-segment progress */}
                <div className="flex gap-0.5 mb-3">
                    {Array.from({length: 20}).map((_, i) => (
                        <div
                            key={i}
                            className="flex-1 h-1.5 border border-[var(--border-soft)] transition-all duration-300"
                            style={{
                                background: i < Math.floor(progress / 5) ? 'var(--accent)' : 'var(--bg)',
                                boxShadow: i < Math.floor(progress / 5) ? '1px 1px 0px var(--ink)' : 'none',
                            }}
                        />
                    ))}
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-[var(--muted)] tabular-nums">{progress}%</span>
                    <button onClick={() => setInternalProcessing(false)} className="text-[10px] font-mono text-[var(--muted)] hover:text-[var(--warn)] transition-colors">
                        cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`transition-all duration-300 ${isDragging ? 'ring-2 ring-[var(--accent)]' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Header / Meta Row */}
            <div className={`flex flex-wrap items-center justify-between gap-4 mb-3 transition-opacity duration-300 ${isProcessing ? 'opacity-0' : 'opacity-100'}`}>
                <div className="flex items-center gap-3">
                    <ModeToggle mode={mode} onChange={setMode} />
                    {detectedType && (
                        <div className="h-4 w-px bg-[var(--border-soft)] hidden sm:block" />
                    )}
                    {detectedType && (
                        <DetectionTag type={detectedType} onDismiss={() => setDetectedType(null)} />
                    )}
                </div>
            </div>

            {/* Input Zone */}
            <div className={`relative transition-all duration-300 focus-within:border-[var(--accent)] group/input ${
                isDragging ? 'border-[var(--accent)] border-dashed bg-[var(--accent-soft)]' : ''
            } ${
                transparent 
                    ? 'border-t-2 border-[var(--border)] bg-transparent mt-4' 
                    : `border-2 border-[var(--border)] bg-[var(--surface-raised)] ${!compact ? 'shadow-[var(--shadow-hard)]' : 'shadow-[var(--shadow-hard-sm)] hover:shadow-[var(--shadow-hard)]'}`
            }`}
>
                {isDragging ? (
                    <div className="h-[120px] flex flex-col items-center justify-center text-[var(--accent)] gap-2">
                        <Paperclip size={20} strokeWidth={2} />
                        <p className="text-[12px] font-mono">{'// drop it here'}</p>
                    </div>
                ) : (
                    <>
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onPaste={handlePaste}
                            placeholder="Paste a link, PDF text, or your notes..."
                            className="w-full min-h-[100px] bg-transparent border-none focus:ring-0 p-3 pb-10 text-[14px] leading-relaxed resize-none overflow-hidden font-mono placeholder:text-[var(--muted)]/40 placeholder:font-mono"
                        />
                        <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3 py-1.5 border border-[var(--border-soft)] text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--bg)] transition-all flex items-center gap-1.5 text-[10px] font-mono bg-[var(--surface)] group-hover/input:border-[var(--border)]"
                                aria-label="Attach file"
                                style={{borderRadius: '2px'}}
                            >
                                <Paperclip size={12} strokeWidth={2.5} />
                                attach
                            </button>
                            <div className="flex items-center gap-2">
                                {detectedType && (
                                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 border border-[var(--accent)] bg-[var(--accent-soft)] animate-fade-in">
                                        <div className="w-1.5 h-1.5 bg-[var(--accent)]" />
                                        <span className="text-[9px] font-mono text-[var(--accent)]">ready</span>
                                    </div>
                                )}
                                {mode === 'learn' ? (
                                    <>
                                        <button
                                            onClick={() => handleAnalyze('curriculum')}
                                            disabled={(!input.trim() && !file) || tokenBalance <= 0}
                                            className="px-4 h-[38px] text-[11px] font-mono font-bold text-[var(--text)] hover:text-[var(--accent)] border-2 border-[var(--border)] bg-[var(--surface)] transition-all disabled:opacity-50 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_var(--border)] active:translate-x-0 active:translate-y-0 active:shadow-none"
                                            style={{borderRadius: '2px'}}
                                        >
                                            Roadmap
                                        </button>
                                        <AnalyzeButton
                                            onClick={() => handleAnalyze('learn')}
                                            disabled={(!input.trim() && !file) || tokenBalance <= 0}
                                            label="Quick Learn"
                                        />
                                    </>
                                ) : (
                                    <AnalyzeButton
                                        onClick={() => handleAnalyze()}
                                        disabled={(!input.trim() && !file) || tokenBalance <= 0}
                                        label="Start session"
                                    />
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Usage Display below search bar */}
            {!isProcessing && totalLimit > 0 && (
                <div className="mt-2 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                        <div className="flex-1 h-1 bg-[var(--border-soft)]/20 relative rounded-full overflow-hidden">
                            <div 
                                className="absolute top-0 left-0 h-full bg-[var(--accent)] transition-all duration-1000"
                                style={{ width: `${Math.min(100, Math.max(0, (1 - (tokenBalance / totalLimit)) * 100))}%` }}
                            />
                        </div>
                    </div>
                    <div className="text-[9px] font-mono text-[var(--muted)] uppercase tracking-wider">
                        usage <span className="text-[var(--text)] font-bold">{Math.round((1 - (tokenBalance / totalLimit)) * 100)}%</span>
                    </div>
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                accept=".pdf,.txt,.md,.docx,.mp3,.mp4,.wav,.jpg,.png"
            />

            {/* Quick launch shortcuts */}
            {!isDragging && !compact && (
                <div className="mt-3 pt-2 border-t border-[var(--border-soft)] animate-fade-in">
                    <h4 className="text-[10px] font-mono text-[var(--muted)] mb-2">{'// or jump to'}</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {[
                            { route: '/practice/flashcards', icon: Zap, label: 'Flashcards', color: 'var(--amber)' },
                            { route: '/practice/test', icon: Target, label: 'Test mode', color: 'var(--sage)' },
                            { route: '/practice/review', icon: History, label: 'Review', color: 'var(--muted)' },
                            { route: '/flow', icon: Play, label: 'Flow mode', color: 'var(--accent)' },
                        ].map(({route, icon: Icon, label, color}) => (
                            <button
                                key={route}
                                onClick={() => router.push(route)}
                                className="flex items-center gap-2 p-2 border border-[var(--border-soft)] hover:border-[var(--border)] hover:bg-[var(--surface)] transition-all group text-left bg-[var(--bg)]"
                            >
                                <Icon size={13} strokeWidth={2} style={{color}} />
                                <span className="text-[11px] font-mono text-[var(--text)] group-hover:text-[var(--text)]">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-4 p-4 border-2 border-[var(--warn)] bg-[var(--warn)]/5 flex items-start gap-3 animate-fade-in" style={{boxShadow:'var(--shadow-hard-sm)'}}>
                    <AlertCircle size={15} strokeWidth={2} className="text-[var(--warn)] shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-mono text-[var(--warn)]">{error}</p>
                        {error === 'Usage limit reached' && (
                            <button
                                onClick={() => router.push('/settings/billing')}
                                className="mt-1 flex items-center gap-1 text-[10px] font-mono text-[var(--warn)] hover:underline"
                            >
                                upgrade plan <ChevronRight size={10} strokeWidth={2} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartInputCard;
