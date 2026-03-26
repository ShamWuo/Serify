import React, { useState } from 'react';
import Head from 'next/head';
import { MessageSquarePlus, Send, Loader2, Bug, Lightbulb, MessageSquare, ChevronRight } from 'lucide-react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import SEO from '@/components/Layout/SEO';
import { useAuth } from '@/contexts/AuthContext';

export default function FeedbackPage() {
    const { token } = useAuth();
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
            }
        } catch (err) {
            console.error('Feedback error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <DashboardLayout>
            <SEO title="Feedback" />
            
            <div className="max-w-[800px] mx-auto px-6 py-12 pb-32">
                <div className="mb-10">
                    <h1 className="text-4xl font-display text-[var(--text)] mb-2">Feedback</h1>
                    <p className="text-[var(--muted)] text-lg">Help us shape the future of Serify.</p>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[32px] overflow-hidden glass shadow-sm">
                    {submitted ? (
                        <div className="p-16 text-center animate-fade-in">
                            <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                                <Send size={40} />
                            </div>
                            <h2 className="text-3xl font-display font-medium text-[var(--text)] mb-4">Message Received!</h2>
                            <p className="text-[var(--muted)] text-lg max-w-[320px] mx-auto leading-relaxed mb-10">
                                Your insights are invaluable during this beta phase. We review every piece of feedback.
                            </p>
                            <button 
                                onClick={() => setSubmitted(false)}
                                className="h-14 px-8 border border-[var(--border)] rounded-2xl font-bold hover:bg-black/5 transition-all"
                            >
                                Send more feedback
                            </button>
                        </div>
                    ) : (
                        <div className="p-8 md:p-12">
                            <form onSubmit={handleSubmit} className="space-y-12">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-6">What would you like to share?</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setType('bug')}
                                            className={`flex flex-col items-start gap-4 p-6 rounded-2xl border transition-all text-left ${type === 'bug' ? 'bg-[var(--accent)]/5 border-[var(--accent)] text-[var(--accent)] shadow-sm' : 'border-[var(--border)] text-[var(--muted)] hover:bg-black/5'}`}
                                        >
                                            <div className={`p-3 rounded-xl ${type === 'bug' ? 'bg-[var(--accent)]/10' : 'bg-[var(--bg)]'} transition-colors`}>
                                                <Bug size={24} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-[var(--text)] mb-0.5">Report a Bug</div>
                                                <div className="text-[10px] opacity-70">Something isn&apos;t working</div>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setType('suggestion')}
                                            className={`flex flex-col items-start gap-4 p-6 rounded-2xl border transition-all text-left ${type === 'suggestion' ? 'bg-[var(--accent)]/5 border-[var(--accent)] text-[var(--accent)] shadow-sm' : 'border-[var(--border)] text-[var(--muted)] hover:bg-black/5'}`}
                                        >
                                            <div className={`p-3 rounded-xl ${type === 'suggestion' ? 'bg-[var(--accent)]/10' : 'bg-[var(--bg)]'} transition-colors`}>
                                                <Lightbulb size={24} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-[var(--text)] mb-0.5">Share an Idea</div>
                                                <div className="text-[10px] opacity-70">Suggest a new feature</div>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setType('other')}
                                            className={`flex flex-col items-start gap-4 p-6 rounded-2xl border transition-all text-left ${type === 'other' ? 'bg-[var(--accent)]/5 border-[var(--accent)] text-[var(--accent)] shadow-sm' : 'border-[var(--border)] text-[var(--muted)] hover:bg-black/5'}`}
                                        >
                                            <div className={`p-3 rounded-xl ${type === 'other' ? 'bg-[var(--accent)]/10' : 'bg-[var(--bg)]'} transition-colors`}>
                                                <MessageSquare size={24} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-[var(--text)] mb-0.5">General Thought</div>
                                                <div className="text-[10px] opacity-70">Just say hi or discuss Serify</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-4">Details</label>
                                    <textarea
                                        autoFocus
                                        required
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder={type === 'bug' ? "What exactly happened? (e.g. 'The map zoom is stuck on mobile')" : "Share your thoughts or suggestions..."}
                                        className="w-full h-48 p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg)]/50 outline-none focus:border-[var(--accent)] focus:bg-[var(--bg)] transition-all resize-none text-base placeholder:text-[var(--muted)]/50 shadow-inner"
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-6">
                                    <p className="text-[var(--muted)] text-xs max-w-[300px] leading-relaxed">
                                        Submitting this will include technical details like your browser version to help us debug faster.
                                    </p>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !content.trim()}
                                        className="h-14 px-10 bg-[var(--text)] text-[var(--surface)] rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-black/80 transition-all disabled:opacity-50 active:scale-[0.98] shadow-xl shadow-black/5"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 size={24} className="animate-spin" />
                                        ) : (
                                            <>
                                                Send Feedback <ChevronRight size={20} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
