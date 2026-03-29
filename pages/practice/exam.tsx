import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Clock, Loader2, Sparkles, AlertTriangle, ArrowRight, X, Layout, Target, BrainCircuit, Zap, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import GeneratingAnimation from '@/components/GeneratingAnimation';

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

    if (authLoading) return null;

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col font-mono text-[var(--text)] relative overflow-hidden">
            <Head>
                <title>Exam Simulation Setup | Serify</title>
            </Head>

            {/* Dot Grid Background */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
                 style={{ 
                    backgroundImage: `radial-gradient(circle, var(--ink) 1.5px, transparent 1.5px)`,
                    backgroundSize: `24px 24px`
                 }} 
            />

            {/* Navigation Header */}
            <header className="h-16 bg-[var(--surface)] border-b-2 border-[var(--ink)] z-20 flex items-center justify-between px-6 shrink-0 shadow-hard-sm">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push('/practice')}
                        className="p-2 border-2 border-transparent hover:border-[var(--ink)] hover:bg-[var(--bg)] transition-all"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-600 text-white flex items-center justify-center shadow-hard-sm border border-black">
                            <Clock size={18} />
                        </div>
                        <div>
                            <span className="font-display font-bold text-[14px] text-[var(--text)] uppercase tracking-tight">EXAM SIMULATION</span>
                            <div className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-widest leading-none mt-0.5">
                                TIMED PERFORMANCE UNIT
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 overflow-y-auto">
                {isGenerating ? (
                    <div className="max-w-2xl w-full text-center space-y-10 animate-fade-in-up">
                         <div className="space-y-4">
                            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--muted)] italic">
                                {'//'} Calibration In Progress...
                            </p>
                            <h1 className="text-4xl font-display font-bold text-[var(--text)] leading-tight">
                                Constructing Your Simulation
                            </h1>
                            <p className="text-[var(--muted)] text-sm max-w-sm mx-auto leading-relaxed">
                                Compiling {questionCount} rigorous prompts for <span className="text-[var(--text)] font-bold">{topic || 'Vault Selection'}</span>.
                            </p>
                        </div>
                        
                        <div className="py-10">
                            <GeneratingAnimation type="exam" />
                        </div>

                        <div className="flex justify-center items-center gap-4 text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.2em] opacity-40">
                             <Layout size={14} /> <span>SCENARIO ARTIFACTS</span>
                             <div className="w-1 h-1 bg-[var(--muted)] rounded-full" />
                             <BrainCircuit size={14} /> <span>NEURAL PROBES</span>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-2xl space-y-10 animate-fade-in-up pb-12">
                        <div className="space-y-3">
                            <div className="washi-tape washi-revisit mb-4 !border-orange-600 bg-orange-50 text-orange-900 font-bold uppercase">
                                CONFIGURATION TERMINAL
                            </div>
                            <h2 className="text-5xl font-display font-bold text-[var(--text)] tracking-tighter leading-none">
                                Define the <br/>
                                <span className="text-orange-600 italic underline decoration-4 underline-offset-8">Simulation</span> parameters
                            </h2>
                            <p className="text-[var(--muted)] text-sm max-w-md">
                                Adjust the parameters to fit your training requirements. Exams use higher difficulty and strict time limits.
                            </p>
                        </div>

                        <div className="paper-card border-4 p-8 bg-[var(--surface-raised)] space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b-2 border-[var(--ink)] pb-2 mb-4">
                                        <Layout size={16} className="text-orange-600" />
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text)]">QUANTITY & DURATION</label>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase">
                                                <span>PROMPTS</span>
                                                <span className="text-orange-600 bg-orange-50 px-2 py-0.5 border border-orange-600">{questionCount} ITEMS</span>
                                            </div>
                                            <input 
                                                type="range"
                                                min="5"
                                                max="25"
                                                step="5"
                                                value={questionCount}
                                                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                                                className="w-full cursor-pointer accent-orange-600 border-2 border-[var(--ink)] h-3 rounded-none bg-[var(--bg)]"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase">
                                                <span>TIME LIMIT</span>
                                                <span className="text-orange-600 bg-orange-50 px-2 py-0.5 border border-orange-600">{timeLimit} MINUTES</span>
                                            </div>
                                            <input 
                                                type="range"
                                                min="5"
                                                max="45"
                                                step="5"
                                                value={timeLimit}
                                                onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                                                className="w-full cursor-pointer accent-orange-600 border-2 border-[var(--ink)] h-3 rounded-none bg-[var(--bg)]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b-2 border-[var(--ink)] pb-2 mb-4">
                                        <BrainCircuit size={16} className="text-orange-600" />
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text)]">DIFFICULTY PROTOCOL</label>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {[
                                            { id: 'standard', label: 'Standard Bias' },
                                            { id: 'scenario', label: 'Scenario Heavy' },
                                            { id: 'coding', label: 'Technical/Code' }
                                        ].map((lvl) => (
                                            <button 
                                                key={lvl.id}
                                                onClick={() => setFormat(lvl.id)}
                                                className={`w-full p-4 border-2 text-left flex items-center justify-between transition-all font-bold ${
                                                    format === lvl.id 
                                                    ? 'bg-[var(--ink)] text-white border-[var(--ink)] shadow-hard-sm -translate-y-0.5 -translate-x-0.5' 
                                                    : 'bg-[var(--bg)] text-[var(--muted)] border-[var(--border-soft)] hover:border-[var(--ink)] hover:text-[var(--text)]'
                                                }`}
                                            >
                                                <span className="uppercase text-[11px] tracking-widest">{lvl.label}</span>
                                                {format === lvl.id && <Zap size={14} className="text-orange-400 fill-orange-400" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            <div className="pt-6 border-t-2 border-dashed border-[var(--border-soft)] flex flex-col md:flex-row items-center gap-6">
                                <div className="flex-1 text-[10px] font-bold text-[var(--muted)] uppercase leading-relaxed tracking-wider italic">
                                     !! WARNING: Failure will automatically adjust concept mastery in the vault. Continuous focus is mandatory.
                                </div>
                                <button 
                                    onClick={handleStart}
                                    className="btn-primary w-full md:w-auto h-16 px-10 !bg-orange-600 !border-black text-lg hover:shadow-hard-lg"
                                >
                                    ENGAGE SIMULATION <ArrowRight size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="text-center pt-8">
                            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.5em] opacity-30">
                                Serify performance monitoring system // active
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
