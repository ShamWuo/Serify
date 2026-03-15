import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Layers, ArrowRight, ArrowLeft, Loader2, CheckCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import GeneratingAnimation from '@/components/GeneratingAnimation';

export default function FlashcardsSession() {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();
    
    const [session, setSession] = useState<any>(null);
    const [cards, setCards] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    
    const [isCompleted, setIsCompleted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || !router.isReady || !id) return;

        const loadSession = async () => {
            setIsLoading(true);
            try {
                // Fetch Session
                const { data: sessionData, error: sessionErr } = await supabase
                    .from('practice_sessions')
                    .select('*')
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .single();

                if (sessionErr || !sessionData) throw new Error("Session not found");

                setSession(sessionData);

                // Fetch Flashcards
                const { data: qData, error: qErr } = await supabase
                    .from('flashcard_sessions')
                    .select('*')
                    .eq('practice_session_id', id)
                    .order('created_at', { ascending: true }); // Default ordering

                if (qErr || !qData) throw new Error("Failed to load flashcards");

                setCards(qData);

                if (sessionData.status === 'completed') {
                    setIsCompleted(true);
                }

            } catch (err: any) {
                console.error(err);
                toast.error(err.message);
                router.push('/practice');
            } finally {
                setIsLoading(false);
            }
        };

        loadSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, router.isReady, id]);

    const handleNext = () => {
        setIsFlipped(false);
        if (currentIndex < cards.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleComplete = async () => {
        if (isCompleted) {
             setCurrentIndex(0); // Restart review
             return;
        }

        try {
            await supabase
                .from('practice_sessions')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', id);

            setIsCompleted(true);
            setCurrentIndex(0); // Go to start to review again if desired
            toast.success("Deck finished!");
        } catch (err: any) {
            toast.error('Failed to complete session');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-6">
                <div className="w-full max-w-lg">
                    <p className="text-center text-xl font-display text-[var(--text)] mb-8">Loading flashcards...</p>
                    <GeneratingAnimation type="cards" />
                </div>
            </div>
        );
    }

    if (!session || cards.length === 0) return null;

    const currentCard = cards[currentIndex];
    const progressPercent = ((currentIndex + 1) / cards.length) * 100;

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col relative overflow-hidden">
            <Head>
                <title>Flashcards | Serify</title>
            </Head>

            {/* Top Navigation */}
            <header className="fixed top-0 inset-x-0 h-16 bg-[var(--surface)] border-b border-[var(--border)] z-20 flex items-center justify-center px-6">
                <div className="flex items-center gap-2">
                    <Layers size={18} className="text-teal-600" />
                    <span className="font-medium text-[var(--text)]">Flashcards</span>
                    <span className="text-[var(--muted)] text-sm ml-2 hidden sm:inline">
                        {session.custom_topic || 'Concept Review'}
                    </span>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="fixed top-16 inset-x-0 h-1 bg-[var(--border)] z-20">
                <div 
                    className="h-full bg-teal-500 transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            <main className="flex-1 pt-24 pb-32 overflow-y-auto px-4 flex flex-col items-center justify-center">
                <div className="max-w-xl w-full space-y-8 animate-fade-in-up">
                    
                    {isCompleted && currentIndex === 0 && !isFlipped ? (
                        <div className="bg-white border text-center p-8 rounded-2xl shadow-sm border-[var(--border)] space-y-6">
                            <div className="w-20 h-20 rounded-full bg-teal-50 text-teal-600 mx-auto flex items-center justify-center border-4 border-teal-100">
                                <CheckCircle size={36} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-display text-[var(--text)] tracking-tight">
                                    Deck Completed
                                </h2>
                                <p className="text-[var(--muted)] mt-2">
                                    You&apos;ve gone through all {cards.length} flashcards in this set.
                                </p>
                            </div>

                            <div className="flex gap-4 justify-center">
                                <button 
                                    onClick={() => handleNext()}
                                    className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition"
                                >
                                    Review Again
                                </button>
                                <button 
                                    onClick={() => router.push('/practice')}
                                    className="px-6 py-2 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition"
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="flex justify-between items-center text-sm font-bold tracking-widest uppercase text-teal-800">
                                <span>Card {currentIndex + 1} of {cards.length}</span>
                                {isCompleted && <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Completed Session</span>}
                            </div>

                            {/* Flashcard Component */}
                            <div 
                                className="relative w-full aspect-[4/3] [perspective:1000px] cursor-pointer"
                                onClick={() => setIsFlipped(!isFlipped)}
                            >
                                <div className={`w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateX(180deg)]' : ''}`}>
                                    {/* Front */}
                                    <div className="absolute inset-0 w-full h-full bg-white border-2 border-[var(--border)] rounded-3xl shadow-sm hover:border-teal-300 transition-colors [backface-visibility:hidden] flex flex-col items-center justify-center p-8 text-center group">
                                        <p className="text-2xl md:text-3xl font-display text-[var(--text)] leading-tight">
                                            {currentCard.front_text}
                                        </p>
                                        <div className="absolute bottom-6 flex items-center gap-2 text-[var(--muted)] opacity-50 group-hover:opacity-100 transition-opacity">
                                            <RotateCcw size={16} /> <span className="text-sm">Click to flip</span>
                                        </div>
                                    </div>

                                    {/* Back */}
                                    <div className="absolute inset-0 w-full h-full bg-teal-50 border-2 border-teal-200 rounded-3xl shadow-sm [transform:rotateX(180deg)] [backface-visibility:hidden] flex flex-col items-center justify-center p-8 text-center overflow-y-auto">
                                        <p className="text-xl md:text-2xl text-teal-900 leading-relaxed">
                                            {currentCard.back_text}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-8">
                                <button
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="px-5 py-3 flex flex-row-reverse items-center justify-center gap-2 rounded-xl text-[var(--text)] font-medium bg-[var(--surface)] hover:bg-[var(--border)] border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    Prev <ArrowLeft size={18} className="translate-y-px" />
                                </button>

                                <button
                                    onClick={handleNext}
                                    className="px-6 py-3 flex items-center justify-center gap-2 rounded-xl text-white font-medium bg-teal-600 hover:bg-teal-700 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                >
                                    {currentIndex === cards.length - 1 ? (
                                        isCompleted ? <><ArrowRight size={18} /> Finish</> : <><CheckCircle size={18} /> Complete</>
                                    ) : (
                                        <>Next <ArrowRight size={18} className="translate-y-px" /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
