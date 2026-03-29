import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Zap, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import GeneratingAnimation from '@/components/GeneratingAnimation';

export default function QuickQuizGenerator() {
    const router = useRouter();
    const { token, loading: authLoading } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isTriggered, setIsTriggered] = useState(false);

    useEffect(() => {
        if (!router.isReady || authLoading || isTriggered) return;
        
        if (!token) {
            return;
        }

        const { topic, concepts, diff } = router.query;

        const generateQuiz = async () => {
             try {
                 const payload: any = { difficulty: diff || 'auto' };
                 if (topic) {
                     payload.topic = topic;
                 } else if (concepts) {
                     payload.conceptIds = (concepts as string).split(',');
                 } else {
                     setError("Invalid Request Fragment: missing neural target.");
                     return;
                 }

                 setIsTriggered(true);
                 const res = await fetch('/api/practice/quiz/generate', {
                     method: 'POST',
                     headers: { 
                         'Content-Type': 'application/json',
                         Authorization: `Bearer ${token}`
                     },
                     body: JSON.stringify(payload)
                 });

                 const data = await res.json();

                 if (!res.ok) {
                     throw new Error(data.error || 'Bio-generation failed internally.');
                 }

                 router.replace(`/practice/quiz/${data.sessionId}`);

             } catch (err: any) {
                 setError(err.message);
             }
        };

        generateQuiz();
    }, [router.isReady, authLoading, token, isTriggered, router]);

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--bg)] bg-dot-grid flex items-center justify-center p-6 font-mono">
                <div className="max-w-md w-full bg-[var(--surface)] border-4 border-red-600 p-8 shadow-hard text-center space-y-6">
                    <div className="w-16 h-16 bg-red-100 border-2 border-red-600 flex items-center justify-center mx-auto shadow-hard-xs">
                        <AlertCircle size={32} className="text-red-600" />
                    </div>
                    <div className="space-y-2">
                        <p className="font-black text-xl uppercase tracking-tighter text-red-600">Generation Halted</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] opacity-70">Error Code: REQ_FAIL</p>
                    </div>
                    <div className="bg-red-50 border-2 border-red-200 p-4 font-black text-sm text-red-800 italic uppercase">
                        {error}
                    </div>
                    <button 
                        onClick={() => router.push('/practice')}
                        className="w-full py-4 bg-red-600 text-white font-black uppercase tracking-[0.2em] shadow-hard hover:translate-y-1 transition-all flex items-center justify-center gap-3"
                    >
                        <ArrowLeft size={16} /> RETURN TO PROTOCOL
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg)] bg-dot-grid flex items-center justify-center p-6 relative overflow-hidden font-mono">
            <Head>
                <title>Neural Simulation Loading | Serify</title>
            </Head>

            <div className="max-w-xl w-full text-center space-y-12 relative">
                {/* Schematic Background Element */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border-2 border-[var(--accent)] opacity-10 rounded-full animate-pulse blur-xl pointer-events-none" />
                
                <div className="space-y-6 flex flex-col items-center">
                    <div className="relative inline-flex items-center justify-center w-24 h-24 bg-[var(--surface-raised)] border-4 border-[var(--ink)] shadow-hard group">
                        <Zap size={48} className="text-[var(--accent)] relative z-10 animate-bounce" />
                        <div className="absolute -top-3 -right-3 w-8 h-8 bg-[var(--bg)] border-2 border-[var(--ink)] flex items-center justify-center">
                            <Sparkles size={16} className="text-yellow-500 animate-pulse" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.5em] animate-pulse">
                            Initializing Neural MCQ Matrix
                        </div>
                        <h1 className="text-4xl font-display font-black text-[var(--text)] tracking-tighter uppercase leading-tight">
                            Warming up <span className="text-[var(--accent)] underline decoration-wavy">MCQ</span>...
                        </h1>
                        <p className="text-[12px] font-black uppercase tracking-widest text-[var(--muted)] opacity-60">
                            Compiling Distractors & Genetic Corollaries
                        </p>
                    </div>
                </div>

                <div className="relative p-8 bg-[var(--surface-raised)] border-2 border-[var(--ink)] shadow-hard flex flex-col items-center gap-6 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent)] animate-loading-bar" />
                    <GeneratingAnimation type="cards" />
                    
                    <div className="flex items-center gap-3 text-[10px] font-black text-[var(--muted)] opacity-50 italic">
                        <div className="w-1.5 h-1.5 bg-[var(--accent)] animate-ping" />
                        AWAITING API HANDSHAKE...
                    </div>
                </div>

                <div className="flex items-center justify-between text-[8px] font-mono text-[var(--muted)] uppercase tracking-widest opacity-30 pt-4">
                    <span>UNIT_8871_A</span>
                    <div className="w-20 h-[1px] bg-[var(--border)]" />
                    <span>ENCRYPTION_LAYER_ACTIVE</span>
                    <div className="w-20 h-[1px] bg-[var(--border)]" />
                    <span>BIO_GEN_V2</span>
                </div>
            </div>
        </div>
    );
}
