import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { RefreshCcw, ArrowLeft, ArrowRight, CheckCircle, Target, Loader2, Sparkles, BrainCircuit, X, History } from 'lucide-react';
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
                // Fetch items due for review
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
                
                // Allow filtering by specific concepts if passed in query
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

            // Move to next item or complete
            setIsFlipped(false);
            if (currentIndex < dueItems.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                setCurrentIndex(prev => prev + 1); // Trigger isCompleted
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
                <Loader2 size={32} className="text-[var(--accent)] animate-spin" />
            </div>
        );
    }

    const isCompleted = currentIndex >= dueItems.length;

    return (
        <div className="min-h-screen bg-[var(--bg)] bg-dot-grid flex flex-col relative overflow-hidden font-mono">
            <Head>
                <title>Spaced Review | Serify</title>
            </Head>

            {/* Sticky Header */}
            <header className="sticky top-0 z-50 w-full px-6 py-4 flex items-center justify-between border-b-4 border-[var(--ink)] bg-[var(--surface)]/90 backdrop-blur-sm">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => router.push('/practice')}
                        className="group flex items-center gap-2 p-2.5 bg-[var(--surface-raised)] border-2 border-[var(--ink)] shadow-hard-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                    >
                        <X size={20} strokeWidth={3} className="text-[var(--ink)]" />
                    </button>
                    
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <span className="washi-tape washi-developing !text-[9px] !px-1.5 !py-0">NEURAL RECALIBRATION</span>
                            {!isCompleted && dueItems.length > 0 && (
                                <span className="text-[10px] font-bold font-mono text-[var(--muted)] opacity-60 uppercase tracking-widest">{currentIndex + 1} OF {dueItems.length} DUE</span>
                            )}
                        </div>
                        <h1 className="text-xl font-display font-black text-[var(--text)] uppercase tracking-tight">
                            Spaced Review
                        </h1>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-[var(--bg)] border-2 border-[var(--ink)]">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                    <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Active Recall Active</span>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-2xl mx-auto">
                    {dueItems.length === 0 ? (
                        <div className="text-center space-y-8 animate-in zoom-in-95 duration-500 bg-[var(--surface)] p-12 paper-card border-4 border-[var(--ink)] shadow-hard">
                            <div className="w-20 h-20 bg-[var(--accent)] border-4 border-[var(--ink)] text-[var(--bg)] mx-auto flex items-center justify-center shadow-hard-sm rotate-3">
                                <CheckCircle size={40} />
                            </div>
                            <div className="space-y-4">
                                <h1 className="text-[12px] font-bold font-mono uppercase tracking-[0.2em] text-[var(--muted)] border-b-2 border-[var(--border)] pb-2 inline-block">{'//'} SYNC COMPLETE</h1>
                                <h2 className="text-4xl font-display font-black text-[var(--text)] tracking-tight uppercase">Caught Up!</h2>
                                <p className="text-[13px] font-mono text-[var(--muted)] max-w-sm mx-auto leading-relaxed italic">
                                    Your neural map is currently optimized. Check back later for scheduled reinforcements.
                                </p>
                            </div>
                            <div className="pt-6">
                                <button 
                                    onClick={() => router.push('/practice')}
                                    className="px-10 py-4 bg-[var(--ink)] text-[var(--bg)] border-2 border-[var(--ink)] shadow-hard hover:-translate-y-1 active:translate-y-0.5 transition-all font-display font-black text-sm uppercase tracking-widest"
                                >
                                    Return to Workshop
                                </button>
                            </div>
                        </div>
                    ) : isCompleted ? (
                        <div className="text-center space-y-8 animate-in zoom-in-95 duration-500 bg-[var(--surface)] p-12 paper-card border-4 border-[var(--ink)] shadow-hard">
                            <div className="w-20 h-20 bg-[var(--accent)] border-4 border-[var(--ink)] text-[var(--bg)] mx-auto flex items-center justify-center shadow-hard-sm -rotate-3">
                                <Target size={40} />
                            </div>
                            <div className="space-y-4">
                                <h1 className="text-[12px] font-bold font-mono uppercase tracking-[0.2em] text-[var(--muted)] border-b-2 border-[var(--border)] pb-2 inline-block">{'//'} SESSION LOGGED</h1>
                                <h2 className="text-4xl font-display font-black text-[var(--text)] tracking-tight uppercase">Neural Boosted</h2>
                                <p className="text-[13px] font-mono text-[var(--muted)] max-w-sm mx-auto leading-relaxed italic">
                                    Evaluated {dueItems.length} concepts. Your memory traces have been successfully reinforced.
                                </p>
                            </div>
                            <div className="pt-6">
                                <button 
                                    onClick={() => router.push('/practice')}
                                    className="px-10 py-4 bg-[var(--ink)] text-[var(--bg)] border-2 border-[var(--ink)] shadow-hard hover:-translate-y-1 active:translate-y-0.5 transition-all font-display font-black text-sm uppercase tracking-widest"
                                >
                                    Finish Protocol
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
                            {/* Concept Name Banner */}
                            <div className="text-center space-y-3">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--bg)] border-2 border-[var(--ink)] text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
                                    <BrainCircuit size={12} className="text-[var(--accent)]" /> RECALL TARGET
                                </div>
                                <h1 className="text-4xl md:text-6xl font-display font-black tracking-tighter text-[var(--text)] uppercase leading-none">
                                    {(dueItems[currentIndex].knowledge_nodes as any).display_name}
                                </h1>
                            </div>

                            {/* Flashcard Component */}
                            <div 
                                className="w-full perspective-2000 cursor-pointer min-h-[380px]"
                                onClick={() => !isFlipped && setIsFlipped(true)}
                            >
                                <div className={`relative w-full h-full duration-700 preserve-3d ${isFlipped ? 'rotate-x-180' : ''}`}>
                                    
                                    {/* Front Side */}
                                    <div className="absolute inset-0 backface-hidden bg-[var(--surface)] border-4 border-[var(--ink)] shadow-hard p-12 flex flex-col items-center justify-center text-center hover:border-[var(--accent)] transition-all group">
                                        <div className="w-16 h-16 bg-[var(--bg)] text-[var(--muted)] border-2 border-[var(--ink)] flex items-center justify-center mb-10 shadow-hard-sm group-hover:rotate-6 transition-transform">
                                            <BrainCircuit size={32} />
                                        </div>
                                        <h3 className="text-2xl sm:text-3xl font-display font-black text-[var(--text)] tracking-tight leading-tight uppercase">
                                            Define the structural model of <br/>
                                            <span className="bg-[var(--accent)] text-[var(--bg)] px-2">{(dueItems[currentIndex].knowledge_nodes as any).display_name}</span>
                                        </h3>
                                        <div className="mt-12 washi-tape washi-mastered !text-[10px] !py-1.5 !px-6 flex items-center gap-2 animate-pulse">
                                            FLIP TO REVEAL SCHEMA <ArrowRight size={12} />
                                        </div>
                                    </div>

                                    {/* Back Side */}
                                    <div className="absolute inset-0 backface-hidden rotate-x-180 bg-[var(--surface-raised)] border-4 border-[var(--accent)] shadow-hard p-10 md:p-14 flex flex-col overflow-y-auto">
                                        <h4 className="font-black font-mono text-[var(--accent)] uppercase tracking-[0.3em] text-[10px] mb-8 flex items-center gap-3 border-b-2 border-[var(--accent)]/20 pb-2">
                                            <Sparkles size={14} /> {'//'} ARCHITECTURAL SCHEMA
                                        </h4>
                                        <div className="font-mono text-lg leading-relaxed text-[var(--text)] space-y-6 italic">
                                            {(dueItems[currentIndex].knowledge_nodes as any).definition}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Evaluation Controls */}
                            <div className={`transition-all duration-700 transform ${isFlipped ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95 pointer-events-none'}`}>
                                <div className="bg-[var(--surface)] border-4 border-[var(--ink)] shadow-hard p-4 grid grid-cols-4 gap-4">
                                    {[
                                        { val: 1, label: 'Again', color: 'red', desc: 'No Recall' },
                                        { val: 2, label: 'Hard', color: 'orange', desc: 'Struggled' },
                                        { val: 3, label: 'Good', color: 'emerald', desc: 'Solid' },
                                        { val: 4, label: 'Easy', color: 'sky', desc: 'Instant' }
                                    ].map((rating) => (
                                        <button 
                                            key={rating.val}
                                            disabled={isEvaluating}
                                            onClick={() => handleRating(rating.val)}
                                            className={`flex flex-col items-center justify-center py-5 border-2 border-[var(--ink)] transition-all group disabled:opacity-50 active:translate-x-1 active:translate-y-1 active:shadow-none bg-[var(--bg)] hover:bg-${rating.color}-500 hover:text-white shadow-hard-xs`}
                                        >
                                            <span className="text-2xl font-black font-mono group-hover:scale-125 transition-transform">{rating.val}</span>
                                            <span className="text-[10px] font-black font-mono uppercase tracking-widest mt-1">{rating.label}</span>
                                            <span className="text-[8px] font-bold font-mono uppercase opacity-40 mt-0.5 group-hover:opacity-100">{rating.desc}</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-center text-[10px] text-[var(--muted)] mt-8 font-black font-mono uppercase tracking-[0.3em] opacity-50 flex items-center justify-center gap-2">
                                    <History size={12} /> Calibration Phase: Rate your recall fidelity
                                </p>
                            </div>

                        </div>
                    )}
                </div>
            </main>

            {/* Background Branding */}
            <div className="fixed bottom-8 left-8 pointer-events-none opacity-20 hidden lg:block">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-[2px] bg-[var(--ink)]" />
                    <span className="text-[10px] font-black font-mono uppercase tracking-[0.5em] text-[var(--ink)]">Serify Neural Engine</span>
                </div>
            </div>
        </div>
    );
}
