import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Paperclip, X, AlertCircle, Zap, ChevronRight, Brain, Target, History, FileText, Play } from 'lucide-react';
import { useRouter } from 'next/router';
import DetectionTag, { DetectedType } from './DetectionTag';
import ModeToggle, { SearchMode } from './ModeToggle';
import AnalyzeButton from './AnalyzeButton';

interface SmartInputCardProps {
    onAnalyze: (data: { content: string; type: DetectedType; mode: SearchMode; file?: File }) => Promise<void>;
    tokenBalance: number;
    compact?: boolean;
}

const STEPS = [
    { until: 15, text: '// extracting content...' },
    { until: 35, text: '// building concept map...' },
    { until: 65, text: '// generating questions...' },
    { until: 99, text: '// ready — starting session' },
];

const SmartInputCard: React.FC<SmartInputCardProps> = ({ onAnalyze, tokenBalance, compact = false }) => {
    const router = useRouter();
    const [input, setInput] = useState('');
    const [detectedType, setDetectedType] = useState<DetectedType | null>(null);
    const [mode, setMode] = useState<SearchMode>('analyze');
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
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

    const handleAnalyze = async () => {
        if (!input.trim() && !file) return;
        if (tokenBalance <= 0) { setError('Usage limit reached'); return; }
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
            <div className="paper-card p-8 flex flex-col justify-center min-h-[180px] animate-fade-in">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 border-2 border-[var(--border)] flex items-center justify-center text-[var(--accent)] animate-pulse" style={{boxShadow:'var(--shadow-hard-sm)'}}>
                        <Brain size={18} strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-[14px] font-display font-bold text-[var(--text)]">Building your session</h3>
                        <p className="text-[11px] font-mono text-[var(--muted)]">{stepText}</p>
                    </div>
                </div>
                {/* Tally-segment progress */}
                <div className="flex gap-0.5 mb-4">
                    {Array.from({length: 20}).map((_, i) => (
                        <div
                            key={i}
                            className="flex-1 h-2 border border-[var(--border-soft)] transition-all duration-300"
                            style={{
                                background: i < Math.floor(progress / 5) ? 'var(--accent)' : 'var(--bg)',
                                boxShadow: i < Math.floor(progress / 5) ? '1px 1px 0px var(--ink)' : 'none',
                            }}
                        />
                    ))}
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-[var(--muted)] tabular-nums">{progress}%</span>
                    <button onClick={() => setIsProcessing(false)} className="text-[10px] font-mono text-[var(--muted)] hover:text-[var(--warn)] transition-colors">
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
            {/* Detection tag */}
            {detectedType && (
                <div className="mb-3 animate-fade-in">
                    <DetectionTag type={detectedType} onDismiss={() => setDetectedType(null)} />
                </div>
            )}

            {/* Textarea zone */}
            <div className={`relative border-2 border-[var(--border)] bg-[var(--bg)] transition-all duration-300 focus-within:border-[var(--accent)] ${isDragging ? 'border-[var(--accent)] border-dashed' : ''}`}
                style={{boxShadow: 'var(--shadow-hard)'}}
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
                            className="w-full min-h-[120px] bg-transparent border-none focus:ring-0 p-5 pb-14 text-[14px] leading-relaxed resize-none overflow-hidden font-mono placeholder:text-[var(--muted)]/40 placeholder:font-mono"
                        />
                        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3 py-1.5 border border-[var(--border-soft)] text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all flex items-center gap-1.5 text-[10px] font-mono bg-[var(--surface)]"
                                aria-label="Attach file"
                            >
                                <Paperclip size={12} strokeWidth={2} />
                                attach
                            </button>
                            <div className="flex items-center gap-2">
                                {detectedType && (
                                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 border border-[var(--accent)] bg-[var(--accent-soft)] animate-fade-in">
                                        <div className="w-1.5 h-1.5 bg-[var(--accent)]" />
                                        <span className="text-[9px] font-mono text-[var(--accent)]">ready</span>
                                    </div>
                                )}
                                <AnalyzeButton
                                    onClick={handleAnalyze}
                                    disabled={(!input.trim() && !file) || tokenBalance <= 0}
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

            {/* Quick launch shortcuts */}
            {!isDragging && !compact && (
                <div className="mt-6 pt-5 border-t-2 border-[var(--border)] animate-fade-in">
                    <h4 className="text-[10px] font-mono text-[var(--muted)] mb-3">{'// or jump to'}</h4>
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
                                className="flex items-center gap-2 p-3 border border-[var(--border-soft)] hover:border-[var(--border)] hover:bg-[var(--surface)] transition-all group text-left bg-[var(--bg)]"
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
