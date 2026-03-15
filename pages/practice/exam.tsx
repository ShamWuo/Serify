import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Clock, Loader2, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export default function ExamSetup() {
    const router = useRouter();
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

            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/practice/exam/start', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`
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
                <div className="w-full max-w-xl bg-white border border-[var(--border)] rounded-3xl shadow-sm p-8 space-y-8 animate-fade-in-up">
                    
                    <div className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center border-4 border-orange-100">
                            <Clock size={28} />
                        </div>
                        <h1 className="text-3xl font-display text-[var(--text)] tracking-tight">Configure Exam</h1>
                        <p className="text-[var(--muted)]">Simulate high-stakes testing conditions for {topic ? `"${topic}"` : 'your selected concepts'}.</p>
                    </div>

                    <div className="space-y-6 pt-4">
                        
                        <div className="space-y-3">
                            <label className="text-sm font-bold uppercase tracking-widest text-[var(--muted)]">Length & Time</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <span className="text-xs font-semibold text-slate-500">Questions</span>
                                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                                        {[5, 10, 20].map(val => (
                                            <button 
                                                key={val}
                                                onClick={() => setQuestionCount(val)}
                                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${questionCount === val ? 'bg-white shadow-sm text-orange-600 border border-slate-200/50' : 'text-slate-500 hover:bg-slate-100'}`}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-xs font-semibold text-slate-500">Time Limit (Min)</span>
                                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                                        {[10, 15, 30].map(val => (
                                            <button 
                                                key={val}
                                                onClick={() => setTimeLimit(val)}
                                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${timeLimit === val ? 'bg-white shadow-sm text-orange-600 border border-slate-200/50' : 'text-slate-500 hover:bg-slate-100'}`}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-bold uppercase tracking-widest text-[var(--muted)]">Format Bias</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['standard', 'scenario', 'coding'].map(f => (
                                    <button 
                                        key={f}
                                        onClick={() => setFormat(f)}
                                        className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold capitalize transition ${format === f ? 'border-orange-500 bg-orange-50 text-orange-800' : 'border-slate-200 text-slate-600 hover:border-orange-200'}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                    
                    <div className="pt-6 border-t border-[var(--border)] flex justify-between items-center">
                        <button 
                            onClick={() => router.push('/practice')}
                            className="text-[var(--muted)] hover:text-[var(--text)] font-medium text-sm transition"
                        >
                            Cancel
                        </button>
                        
                        <button 
                            onClick={handleStart}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition hover:-translate-y-0.5 shadow-lg shadow-orange-600/20"
                        >
                            Start Simulation <ArrowRight size={18} />
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}
