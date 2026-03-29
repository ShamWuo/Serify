import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { RefreshCcw, ArrowLeft, ArrowRight, CheckCircle, Target, Loader2, Sparkles, BrainCircuit } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SpacedReview() {
    const router = useRouter();
    const { user } = useAuth();

    const [dueItems, setDueItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);

    useEffect(() => {
        if (!user) return;

        const loadDueItems = async () => {
            setIsLoading(true);
            try {
                
                const { data, error } = await supabase
                    .from('review_schedule')
                    .select(`
                        id,
                        next_review,
                        knowledge_nodes!inner (
                            id,
                            display_name,
                            definition
                        )
                    `)
                    .eq('user_id', user.id)
                    .lte('next_review', new Date().toISOString())
                    .order('next_review', { ascending: true });

                if (error) throw error;
                
                
                let filteredData = data || [];
                if (router.query.concepts) {
                     const selectedIds = (router.query.concepts as string).split(',');
                     filteredData = filteredData.filter(d => selectedIds.includes((d.knowledge_nodes as any).id));
                }

                setDueItems(filteredData);
            } catch (err: any) {
                console.error(err);
                toast.error("Failed to load review queue.");
            } finally {
                setIsLoading(false);
            }
        };

        if (router.isReady) {
            loadDueItems();
        }
    }, [user, router.isReady, router.query]);

    const handleRating = async (rating: number) => {
        setIsEvaluating(true);
        try {
            const currentItem = dueItems[currentIndex];
            const conceptId = (currentItem.knowledge_nodes as any).id;

            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/practice/review/evaluate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ conceptId, rating })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            if (data.isMastered) {
                toast.success(<div className="flex items-center gap-2"><Sparkles size={16} className="text-yellow-500" /> Concept Mastered!</div>);
            }

            
            setIsFlipped(false);
            if (currentIndex < dueItems.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                setCurrentIndex(prev => prev + 1); 
            }

        } catch (err: any) {
            toast.error(err.message || "Failed to submit rating");
        } finally {
            setIsEvaluating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <Loader2 size={32} className="text-emerald-600 animate-spin" />
            </div>
        );
    }

    const isCompleted = currentIndex >= dueItems.length;

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col relative overflow-hidden">
            <Head>
                <title>Spaced Review | Serify</title>
            </Head>

            {}
            <header className="absolute top-0 inset-x-0 h-16 border-b-2 border-[var(--border)] z-20 flex items-center justify-between px-6 bg-[var(--surface)]">
                <div className="flex items-center gap-2">
                    <button onClick={() => router.push('/practice')} className="p-1.5 hover:bg-[var(--bg)] border border-transparent hover:border-[var(--border)] group transition-all mr-2">
                        <ArrowLeft size={18} className="text-[var(--text)] group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <RefreshCcw size={16} className="text-[var(--accent)]" />
                    <span className="font-display font-medium text-[var(--text)] text-sm tracking-tight">Spaced Review</span>
                </div>
                {!isCompleted && dueItems.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono text-[var(--muted)] uppercase tracking-widest bg-[var(--bg)] px-3 py-1 border border-[var(--border)] shadow-hard-sm">
                            {currentIndex + 1} {'//'} {dueItems.length} Due
                        </span>
                    </div>
                )}
            </header>

            <main className="flex-1 pt-24 pb-32 flex flex-col items-center justify-center px-4 relative z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px] -z-10" />

                <div className="w-full max-w-2xl mx-auto">
                    {dueItems.length === 0 ? (
                        <div className="text-center space-y-6 animate-fade-in-up bg-[var(--surface)] p-12 paper-card border-2 border-[var(--border)]">
                            <div className="w-16 h-16 bg-[var(--bg)] text-[var(--accent)] border-2 border-[var(--border)] mx-auto flex items-center justify-center shadow-hard-sm">
                                <CheckCircle size={28} />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-[10px] font-bold font-mono uppercase tracking-[0.2em] text-[var(--muted)]">{'//'} Session Status</h1>
                                <h2 className="text-3xl font-display font-medium text-[var(--text)] tracking-tight">Caught Up!</h2>
                            </div>
                            <p className="text-[12px] font-mono text-[var(--muted)] uppercase tracking-tight">
                                There are no concepts due for review right now.
                            </p>
                            <div className="pt-4">
                                <button 
                                    onClick={() => router.push('/practice')}
                                    className="px-8 py-3 bg-[var(--ink)] text-[var(--bg)] border-2 border-[var(--ink)] shadow-hard hover:-translate-y-0.5 active:translate-y-0.5 transition-all font-display font-bold text-sm"
                                >
                                    Return to Arena
                                </button>
                            </div>
                        </div>
                    ) : isCompleted ? (
                        <div className="text-center space-y-6 animate-fade-in-up bg-[var(--surface)] p-12 paper-card border-2 border-[var(--border)]">
                            <div className="w-16 h-16 bg-[var(--bg)] text-[var(--accent)] border-2 border-[var(--border)] mx-auto flex items-center justify-center shadow-hard-sm">
                                <Target size={28} />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-[10px] font-bold font-mono uppercase tracking-[0.2em] text-[var(--muted)]">{'//'} Review Complete</h1>
                                <h2 className="text-3xl font-display font-medium text-[var(--text)] tracking-tight">Neural Boost</h2>
                            </div>
                            <p className="text-[12px] font-mono text-[var(--muted)] uppercase tracking-tight">
                                Reviewed {dueItems.length} concepts. Your neural pathways are getting stronger.
                            </p>
                            <div className="pt-4">
                                <button 
                                    onClick={() => router.push('/practice')}
                                    className="px-8 py-3 bg-[var(--ink)] text-[var(--bg)] border-2 border-[var(--ink)] shadow-hard hover:-translate-y-0.5 active:translate-y-0.5 transition-all font-display font-bold text-sm"
                                >
                                    Finish Session
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="text-center space-y-2">
                                <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-[var(--text)]">
                                    {(dueItems[currentIndex].knowledge_nodes as any).display_name}
                                </h1>
                                <p className="text-[10px] font-bold font-mono uppercase tracking-widest text-[var(--muted)] flex items-center justify-center gap-2">
                                    <BrainCircuit size={12} className="text-[var(--accent)]" /> Active Recall Session
                                </p>
                            </div>

                            <div 
                                className={`w-full min-h-[350px] perspective-1000 cursor-pointer ${isEvaluatable() ? '' : 'animate-pulse-slow'}`}
                                onClick={() => !isFlipped && setIsFlipped(true)}
                            >
                                <div className={`relative w-full h-full duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                                    
                                    <div className="absolute inset-0 backface-hidden bg-[var(--surface)] border-2 border-[var(--border)] shadow-hard p-12 flex flex-col items-center justify-center text-center hover:border-[var(--accent)] transition-all">
                                        <div className="w-14 h-14 bg-[var(--bg)] text-[var(--muted)] border-2 border-[var(--border)] flex items-center justify-center mb-8 shadow-hard-sm">
                                            <BrainCircuit size={24} />
                                        </div>
                                        <h3 className="text-2xl font-display font-medium text-[var(--text)] leading-snug">
                                            What is <span className="underline decoration-[var(--accent)] decoration-2">{(dueItems[currentIndex].knowledge_nodes as any).display_name}</span>?
                                        </h3>
                                        <div className="mt-10 washi-tape washi-mastered text-[8px] py-1 px-4 flex items-center gap-2">
                                            TAP TO REVEAL ANSWER <ArrowRight size={10} />
                                        </div>
                                    </div>

                                    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[var(--surface)] border-4 border-[var(--accent)] shadow-hard p-8 md:p-12 flex flex-col overflow-y-auto">
                                        <h4 className="font-bold font-mono text-[var(--accent)] uppercase tracking-[0.2em] text-[10px] mb-6 flex items-center gap-2">
                                            <Sparkles size={12} /> {'//'} Mental Model
                                        </h4>
                                        <div className="font-mono text-[13px] leading-relaxed text-[var(--text)] space-y-4">
                                            {(dueItems[currentIndex].knowledge_nodes as any).definition}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {}
                            <div className={`transition-all duration-700 transform ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12 pointer-events-none'}`}>
                                <div className="bg-[var(--surface)] border-2 border-[var(--border)] shadow-hard-sm p-3 grid grid-cols-4 gap-3">
                                    <button 
                                        disabled={isEvaluating}
                                        onClick={() => handleRating(1)}
                                        className="flex flex-col items-center justify-center py-4 bg-red-50 hover:bg-red-100 border-2 border-red-200 transition-all group disabled:opacity-50 active:scale-95"
                                    >
                                        <span className="text-[14px] font-bold font-mono text-red-700">1</span>
                                        <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-red-600/60 mt-1">Again</span>
                                    </button>
                                    <button 
                                        disabled={isEvaluating}
                                        onClick={() => handleRating(2)}
                                        className="flex flex-col items-center justify-center py-4 bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 transition-all group disabled:opacity-50 active:scale-95"
                                    >
                                        <span className="text-[14px] font-bold font-mono text-orange-700">2</span>
                                        <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-orange-600/60 mt-1">Hard</span>
                                    </button>
                                    <button 
                                        disabled={isEvaluating}
                                        onClick={() => handleRating(3)}
                                        className="flex flex-col items-center justify-center py-4 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 transition-all group disabled:opacity-50 active:scale-95"
                                    >
                                        <span className="text-[14px] font-bold font-mono text-emerald-700">3</span>
                                        <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-emerald-600/60 mt-1">Good</span>
                                    </button>
                                    <button 
                                        disabled={isEvaluating}
                                        onClick={() => handleRating(4)}
                                        className="flex flex-col items-center justify-center py-4 bg-sky-50 hover:bg-sky-100 border-2 border-sky-200 transition-all group disabled:opacity-50 active:scale-95"
                                    >
                                        <span className="text-[14px] font-bold font-mono text-sky-700">4</span>
                                        <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-sky-600/60 mt-1">Easy</span>
                                    </button>
                                </div>
                                <p className="text-center text-[10px] text-[var(--muted)] mt-6 font-bold font-mono uppercase tracking-[0.2em] opacity-60">
                                    {'//'} Rate recalibration accuracy
                                </p>
                            </div>

                        </div>
                    )}
                </div>
            </main>
        </div>
    );

    function isEvaluatable() {
        return true;
    }
}
