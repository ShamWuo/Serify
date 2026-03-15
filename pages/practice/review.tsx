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
                // Fetch items where next_review is less than or equal to NOW
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
                
                // If the user specifies specific concepts via query, filter for them
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

            // Move to next
            setIsFlipped(false);
            if (currentIndex < dueItems.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                setCurrentIndex(prev => prev + 1); // Goes out of bounds to trigger completion screen
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

            {/* Top Navigation */}
            <header className="absolute top-0 inset-x-0 h-16 border-b border-[var(--border)] z-20 flex items-center justify-between px-6 bg-[var(--surface)]">
                <div className="flex items-center gap-2">
                    <button onClick={() => router.push('/practice')} className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition mr-2">
                        <ArrowLeft size={18} className="text-[var(--text)]" />
                    </button>
                    <RefreshCcw size={18} className="text-emerald-600" />
                    <span className="font-medium text-[var(--text)]">Spaced Review</span>
                </div>
                {!isCompleted && dueItems.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--muted)]">
                            {currentIndex + 1} / {dueItems.length} Due
                        </span>
                    </div>
                )}
            </header>

            <main className="flex-1 pt-24 pb-32 flex flex-col items-center justify-center px-4 relative z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px] -z-10" />

                <div className="w-full max-w-2xl mx-auto">
                    {dueItems.length === 0 ? (
                        <div className="text-center space-y-6 animate-fade-in-up bg-white p-12 rounded-3xl border border-[var(--border)] shadow-sm">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full mx-auto flex items-center justify-center border-4 border-emerald-100">
                                <CheckCircle size={36} />
                            </div>
                            <h2 className="text-3xl font-display text-[var(--text)] tracking-tight">You&apos;re All Caught Up!</h2>
                            <p className="text-[var(--muted)] text-lg">
                                There are no concepts due for review right now.
                            </p>
                            <div className="pt-4">
                                <button 
                                    onClick={() => router.push('/practice')}
                                    className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5"
                                >
                                    Return to Arena
                                </button>
                            </div>
                        </div>
                    ) : isCompleted ? (
                        <div className="text-center space-y-6 animate-fade-in-up bg-white p-12 rounded-3xl border border-[var(--border)] shadow-sm">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full mx-auto flex items-center justify-center border-4 border-emerald-100">
                                <Target size={36} />
                            </div>
                            <h2 className="text-3xl font-display text-[var(--text)] tracking-tight">Review Complete!</h2>
                            <p className="text-[var(--muted)] text-lg">
                                You&apos;ve reviewed {dueItems.length} concepts today. Your neural pathways are getting stronger.
                            </p>
                            <div className="pt-4">
                                <button 
                                    onClick={() => router.push('/practice')}
                                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition shadow-lg hover:-translate-y-0.5"
                                >
                                    Finish Session
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in-up">
                            
                            <div className="text-center space-y-2">
                                <h1 className="text-3xl md:text-4xl font-display tracking-tight text-[var(--text)]">
                                    {(dueItems[currentIndex].knowledge_nodes as any).display_name}
                                </h1>
                                <p className="text-[var(--muted)] flex items-center justify-center gap-2">
                                    <BrainCircuit size={16} /> Recall the definition and key details
                                </p>
                            </div>

                            <div 
                                className={`w-full min-h-[300px] perspective-1000 cursor-pointer ${isEvaluatable() ? '' : 'animate-pulse-slow'}`}
                                onClick={() => !isFlipped && setIsFlipped(true)}
                            >
                                <div className={`relative w-full h-full duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                                    
                                    {/* Front */}
                                    <div className="absolute inset-0 backface-hidden bg-white border border-[var(--border)] rounded-3xl shadow-sm p-8 flex flex-col items-center justify-center text-center hover:border-emerald-300 transition-colors">
                                        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-6 border-2 border-slate-100">
                                            <BrainCircuit size={28} />
                                        </div>
                                        <h3 className="text-2xl font-serif text-[var(--text)] leading-snug">
                                            What is {(dueItems[currentIndex].knowledge_nodes as any).display_name}?
                                        </h3>
                                        <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest mt-8 flex items-center gap-2">
                                            Tap to reveal answer <ArrowRight size={14} />
                                        </p>
                                    </div>

                                    {/* Back */}
                                    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white border-2 border-emerald-500 rounded-3xl shadow-xl shadow-emerald-500/10 p-8 md:p-10 flex flex-col overflow-y-auto">
                                        <h4 className="font-bold text-emerald-700 uppercase tracking-widest text-xs mb-4">Official Definition</h4>
                                        <div className="prose prose-slate prose-p:leading-relaxed text-[var(--text)] font-serif md:text-lg">
                                            {(dueItems[currentIndex].knowledge_nodes as any).definition}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Ratings Bar */}
                            <div className={`transition-all duration-500 transform ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                                <div className="bg-white border text-[var(--text)] border-[var(--border)] shadow-sm rounded-2xl p-4 flex gap-2">
                                    <button 
                                        disabled={isEvaluating}
                                        onClick={() => handleRating(1)}
                                        className="flex-1 py-3 bg-red-50 text-red-700 hover:bg-red-100 font-bold rounded-xl transition disabled:opacity-50"
                                    >
                                        Again (1)
                                    </button>
                                    <button 
                                        disabled={isEvaluating}
                                        onClick={() => handleRating(2)}
                                        className="flex-1 py-3 bg-orange-50 text-orange-700 hover:bg-orange-100 font-bold rounded-xl transition disabled:opacity-50"
                                    >
                                        Hard (2)
                                    </button>
                                    <button 
                                        disabled={isEvaluating}
                                        onClick={() => handleRating(3)}
                                        className="flex-1 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl transition disabled:opacity-50"
                                    >
                                        Good (3)
                                    </button>
                                    <button 
                                        disabled={isEvaluating}
                                        onClick={() => handleRating(4)}
                                        className="flex-1 py-3 bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold rounded-xl transition disabled:opacity-50"
                                    >
                                        Easy (4)
                                    </button>
                                </div>
                                <p className="text-center text-xs text-[var(--muted)] mt-4 font-medium uppercase tracking-widest">
                                    How well did you remember this?
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
