import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Clock, Loader2, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function ExamSetup() {
    const router = useRouter();
    const { token, loading: authLoading } = useAuth();
    const { topic, concepts, diff } = router.query;

    const [questionCount, setQuestionCount] = useState(10);
    const [timeLimit, setTimeLimit] = useState(15);
    const [format, setFormat] = useState('standard');
    
    const [isGenerating, setIsGenerating] = useState(false);

    const handleStart = async () => {
        setIsGenerating(true);
        try {
            const payload: any = { 
                difficulty: diff || 'auto',
                questionCount,
                timeLimitMinutes: timeLimit,
                format
            };
            
            if (topic) {
                payload.topic = topic;
            } else if (concepts) {
                payload.conceptIds = (concepts as string).split(',');
            } else {
                toast.error("No topic or concepts provided.");
                setIsGenerating(false);
                return;
            }

            if (!token) {
                toast.error("You must be logged in to generate an exam.");
                setIsGenerating(false);
                return;
            }
 
            const res = await fetch('/api/practice/exam/start', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate exam');
            }

            router.replace(`/practice/exam/${data.sessionId}`);

        } catch (err: any) {
            toast.error(err.message);
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6 relative overflow-hidden">
            <Head>
                <title>Exam Setup | Serify</title>
            </Head>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/5 rounded-full blur-[100px] -z-10" />

            {isGenerating ? (
                 <div className="text-center space-y-8 animate-fade-in-up">
                 <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-orange-50 border border-orange-100 shadow-sm">
                     <Clock size={40} className="text-orange-600 relative z-10" />
                     <Sparkles size={20} className="text-orange-400 absolute -top-2 -right-2 animate-pulse" />
                 </div>
 
                 <div className="space-y-3">
                     <h1 className="text-3xl font-display text-[var(--text)] tracking-tight">
                         Generating Exam Simulation...
                     </h1>
                     <p className="text-[var(--muted)] text-lg">
                         Compiling {questionCount} rigorous questions.
                     </p>
                 </div>
 
                 <div className="pt-8 flex justify-center">
                     <Loader2 size={32} className="text-orange-600 animate-spin" />
                 </div>
             </div>
            ) : (
                <div className="w-full max-w-xl bg-[var(--surface)] border-2 border-[var(--border)] paper-card p-8 space-y-8 animate-fade-in-up">
                    
                    <div className="text-center space-y-4">
                        <div className="mx-auto w-14 h-14 bg-[var(--bg)] text-[var(--ink)] border-2 border-[var(--border)] flex items-center justify-center shadow-hard-sm">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h1 className="text-[10px] font-bold font-mono uppercase tracking-[0.2em] text-[var(--muted)] mb-1">{'//'} Exam Configuration</h1>
                            <h2 className="text-3xl font-display font-medium text-[var(--text)] tracking-tight">Setup Simulation</h2>
                        </div>
                        <p className="text-[11px] font-mono text-[var(--muted)] uppercase tracking-tight">Simulate high-stakes testing conditions for {topic ? `"${topic}"` : 'your selected concepts'}.</p>
                    </div>

                    <div className="space-y-6 pt-4">
                        
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--muted)]">Length & Time</label>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <span className="text-[9px] font-bold font-mono text-[var(--muted)] uppercase">Questions</span>
                                    <div className="flex bg-[var(--bg)] p-1 border-2 border-[var(--border)]">
                                        {[5, 10, 20].map(val => (
                                            <button 
                                                key={val}
                                                onClick={() => setQuestionCount(val)}
                                                className={`flex-1 py-1.5 text-xs font-mono font-bold transition-all ${questionCount === val ? 'bg-[var(--ink)] text-[var(--bg)]' : 'text-[var(--muted)] hover:bg-[var(--surface)]'}`}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[9px] font-bold font-mono text-[var(--muted)] uppercase">Time (Min)</span>
                                    <div className="flex bg-[var(--bg)] p-1 border-2 border-[var(--border)]">
                                        {[10, 15, 30].map(val => (
                                            <button 
                                                key={val}
                                                onClick={() => setTimeLimit(val)}
                                                className={`flex-1 py-1.5 text-xs font-mono font-bold transition-all ${timeLimit === val ? 'bg-[var(--ink)] text-[var(--bg)]' : 'text-[var(--muted)] hover:bg-[var(--surface)]'}`}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--muted)]">Format Bias</label>
                            <div className="grid grid-cols-3 gap-3">
                                {['standard', 'scenario', 'coding'].map(f => (
                                    <button 
                                        key={f}
                                        onClick={() => setFormat(f)}
                                        className={`px-4 py-2 border-2 text-[10px] font-bold font-mono uppercase tracking-widest transition-all ${format === f ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] shadow-hard-sm' : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                    
                    <div className="pt-6 border-t-2 border-[var(--border)] flex justify-between items-center">
                        <button 
                            onClick={() => router.push('/practice')}
                            className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--muted)] hover:text-[var(--text)] transition"
                        >
                            Cancel
                        </button>
                        
                        <button 
                            onClick={handleStart}
                            className="bg-[var(--ink)] text-[var(--bg)] px-8 py-3 border-2 border-[var(--ink)] shadow-hard hover:-translate-y-0.5 active:translate-y-0.5 transition-all font-display font-bold text-sm flex items-center gap-2"
                        >
                            Start Simulation <ArrowRight size={16} />
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}
