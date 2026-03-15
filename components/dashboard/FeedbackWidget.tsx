import React, { useState } from 'react';
import { MessageSquarePlus, X, Send, Loader2, Bug, Lightbulb, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function FeedbackWidget() {
    const { token } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState('suggestion');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    type,
                    content,
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    screenResolution: `${window.innerWidth}x${window.innerHeight}`
                })
            });

            if (res.ok) {
                setSubmitted(true);
                setContent('');
                setTimeout(() => {
                    setSubmitted(false);
                    setIsOpen(false);
                }, 2000);
            }
        } catch (err) {
            console.error('Feedback error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-[var(--accent)] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-transform group"
                title="Send Beta Feedback"
            >
                <MessageSquarePlus size={24} />
                <span className="absolute right-full mr-3 px-3 py-1.5 bg-[var(--surface)] text-[var(--text)] text-xs font-bold rounded-lg border border-[var(--border)] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none translate-x-2 group-hover:translate-x-0">
                    Send Feedback
                </span>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4 sm:p-6 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div 
                className="absolute inset-0 z-0" 
                onClick={() => setIsOpen(false)} 
            />
            <div className="bg-[var(--surface)] w-full max-w-md rounded-[32px] border border-[var(--border)] shadow-2xl overflow-hidden animate-modal-in relative z-10">
                <div className="px-8 py-6 border-b border-[var(--border)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                            <MessageSquarePlus size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-display font-medium text-[var(--text)]">Beta Feedback</h3>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--muted)]">Help us improve Serify</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsOpen(false)} 
                        className="p-2 hover:bg-black/5 rounded-xl transition-colors text-[var(--muted)] hover:text-[var(--text)]"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8">
                    {submitted ? (
                        <div className="py-12 text-center animate-fade-in">
                            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-[30px] flex items-center justify-center mx-auto mb-6">
                                <Send size={36} />
                            </div>
                            <h4 className="text-2xl font-display font-medium text-[var(--text)] mb-2">Thank you!</h4>
                            <p className="text-[var(--muted)] text-sm max-w-[240px] mx-auto leading-relaxed">
                                Your insights are invaluable during this beta phase. We&apos;ll review this shortly!
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-4">What&apos;s on your mind?</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setType('bug')}
                                        className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${type === 'bug' ? 'bg-[var(--accent)]/5 border-[var(--accent)] text-[var(--accent)] shadow-sm' : 'border-[var(--border)] text-[var(--muted)] hover:bg-black/5'}`}
                                    >
                                        <Bug size={24} />
                                        <span className="text-[10px] font-bold">Bug</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('suggestion')}
                                        className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${type === 'suggestion' ? 'bg-[var(--accent)]/5 border-[var(--accent)] text-[var(--accent)] shadow-sm' : 'border-[var(--border)] text-[var(--muted)] hover:bg-black/5'}`}
                                    >
                                        <Lightbulb size={24} />
                                        <span className="text-[10px] font-bold">Idea</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('other')}
                                        className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${type === 'other' ? 'bg-[var(--accent)]/5 border-[var(--accent)] text-[var(--accent)] shadow-sm' : 'border-[var(--border)] text-[var(--muted)] hover:bg-black/5'}`}
                                    >
                                        <MessageSquare size={24} />
                                        <span className="text-[10px] font-bold">Other</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-3">Details</label>
                                <textarea
                                    autoFocus
                                    required
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder={type === 'bug' ? "What exactly happened? (e.g. 'The map zoom is stuck on mobile')" : "Share your thoughts or suggestions..."}
                                    className="w-full h-36 p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg)]/50 outline-none focus:border-[var(--accent)] focus:bg-[var(--bg)] transition-all resize-none text-sm placeholder:text-[var(--muted)]/50"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !content.trim()}
                                className="w-full h-14 bg-[var(--text)] text-[var(--surface)] rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-black/80 transition-all disabled:opacity-50 active:scale-[0.98] shadow-xl shadow-black/5"
                            >
                                {isSubmitting ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <>
                                        Send Feedback <Send size={20} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
