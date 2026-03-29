import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Layers, ArrowRight, ArrowLeft, Loader2, CheckCircle, RotateCcw, X, Sparkles, Settings, Shuffle, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';
import GeneratingAnimation from '@/components/GeneratingAnimation';
import * as T from '@/types/serify';

export default function FlashcardsSession() {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();
    
    const [deck, setDeck] = useState<T.FlashcardDeck | null>(null);
    const [cards, setCards] = useState<T.Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    
    const [isCompleted, setIsCompleted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [markingMastery, setMarkingMastery] = useState(false);

    
    const [showSide, setShowSide] = useState<'front' | 'back' | 'random'>('front');
    const [isShuffled, setIsShuffled] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [displayCards, setDisplayCards] = useState<T.Flashcard[]>([]);

    useEffect(() => {
        if (!user || !router.isReady || !id) return;

        const loadSession = async () => {
            setIsLoading(true);
            try {
                
                const { data: deckData, error: deckErr } = await supabase
                    .from('flashcard_decks')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (!deckErr && deckData) {
                    setDeck(deckData);
                    
                    
                    const { data: cardsData, error: cardsErr } = await supabase
                        .from('flashcards')
                        .select('*')
                        .eq('deck_id', id)
                        .order('created_at', { ascending: true });
                    
                    if (cardsErr) throw cardsErr;
                    setCards(cardsData || []);
                } else {
                    
                    const { data: sessionData, error: sessionErr } = await supabase
                        .from('practice_sessions')
                        .select('*')
                        .eq('id', id)
                        .eq('user_id', user.id)
                        .single();

                    if (sessionErr || !sessionData) throw new Error("Deck or Session not found");

                    const { data: qData, error: qErr } = await supabase
                        .from('flashcard_sessions')
                        .select('cards')
                        .eq('practice_session_id', id)
                        .single();

                    if (qErr || !qData) throw new Error("Failed to load flashcards");

                    setDeck({
                        id: id as string,
                        user_id: user.id,
                        title: sessionData.topic || 'Concept Review',
                        description: 'Legacy session',
                        total_cards: qData.cards?.length || 0,
                        cards_know_it: 0,
                        cards_still_learning: 0,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    } as T.FlashcardDeck);
                    setCards(qData.cards || []);
                }

            } catch (err) {
                const error = err as Error;
                console.error(error);
                toast.error(error.message);
                router.push('/practice/flashcards');
            } finally {
                setIsLoading(false);
            }
        };

        loadSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, router.isReady, id]);

    
    useEffect(() => {
        if (cards.length === 0) return;

        let newDisplay = [...cards];
        if (isShuffled) {
            
            for (let i = newDisplay.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newDisplay[i], newDisplay[j]] = [newDisplay[j], newDisplay[i]];
            }
        }
        
        setDisplayCards(newDisplay);
        setCurrentIndex(0); 
        setIsFlipped(false);
    }, [isShuffled, cards]);

    const markMastery = async (mastery: 'know_it' | 'still_learning') => {
        if (!displayCards[currentIndex]?.id || markingMastery) {
            handleNext();
            return;
        }

        setMarkingMastery(true);
        try {
            const cardId = displayCards[currentIndex].id;
            const isCorrect = mastery === 'know_it';
            
            
            const newDisplay = [...displayCards];
            newDisplay[currentIndex].progress_state = mastery;
            setDisplayCards(newDisplay);
            
            
            setCards(prev => prev.map(c => c.id === cardId ? { ...c, progress_state: mastery } : c));

            
            await supabase.rpc('increment_card_stats', {
                p_card_id: cardId,
                p_is_correct: isCorrect
            });

            handleNext();
        } catch (err) {
            console.error('Error marking mastery:', err);
        } finally {
            setMarkingMastery(false);
        }
    };

    const handleNext = () => {
        setIsFlipped(false);
        if (currentIndex < displayCards.length - 1) {
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
             setCurrentIndex(0); 
             return;
        }

        try {
            
            setIsCompleted(true);
            setCurrentIndex(0);
            toast.success("Study session finished!");
        } catch (err) {
            toast.error('Failed to complete session');
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isCompleted && currentIndex === 0 && !isFlipped) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    setIsFlipped(prev => !prev);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    handleNext();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (currentIndex > 0) {
                        e.preventDefault();
                        handlePrev();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFlipped, currentIndex, isCompleted, displayCards.length]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-6">
                <div className="w-full max-w-lg text-center space-y-8">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-display text-[var(--text)]">Curating Your Session</h2>
                        <p className="text-[var(--muted)] font-typewriter italic">Sharpening the pencil, preparing the deck...</p>
                    </div>
                    <GeneratingAnimation type="cards" />
                </div>
            </div>
        );
    }

    if (!deck || displayCards.length === 0) return null;

    const currentCard = displayCards[currentIndex];
    const progressPercent = ((currentIndex + 1) / displayCards.length) * 100;

    
    const getFrontText = (card: T.Flashcard) => {
        if (showSide === 'back') return card.back;
        if (showSide === 'random') {
            const hash = card.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
            return hash % 2 === 0 ? card.front : card.back;
        }
        return card.front;
    };

    const getBackText = (card: T.Flashcard) => {
        if (showSide === 'back') return card.front;
        if (showSide === 'random') {
             const hash = card.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
             return hash % 2 === 0 ? card.back : card.front;
        }
        return card.back;
    };

        return (
        <div className="min-h-screen bg-[var(--bg)] bg-dot-grid flex flex-col relative overflow-hidden">
            <Head>
                <title>{deck.title} | Flashcards | Serify</title>
            </Head>

            {/* Header Section — "The Studio Header" */}
            <header className="sticky top-0 z-40 w-full px-6 py-4 flex items-center justify-between border-b-4 border-[var(--ink)] bg-[var(--surface)]/90 backdrop-blur-sm">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => router.push('/practice/flashcards')}
                        className="group flex items-center gap-2 p-2.5 bg-[var(--surface-raised)] border-2 border-[var(--ink)] shadow-hard-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                    >
                        <X size={20} strokeWidth={3} className="text-[var(--ink)]" />
                    </button>
                    
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <span className="washi-tape washi-developing !text-[9px] !px-1.5 !py-0">STUDY PROTOCOL</span>
                            <span className="text-[10px] font-bold font-mono text-[var(--muted)] opacity-60 uppercase tracking-widest">{currentIndex + 1} OF {displayCards.length} UNITS</span>
                        </div>
                        <h1 className="text-xl font-display font-black text-[var(--text)] line-clamp-1 max-w-[180px] sm:max-w-md uppercase tracking-tight">
                            {deck.title}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setSettingsOpen(true)}
                        className="p-3 bg-[var(--bg)] border-2 border-[var(--ink)] shadow-hard-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all active:bg-[var(--accent-soft)]"
                    >
                        <Settings size={20} className="text-[var(--ink)]" />
                    </button>
                </div>
            </header>

            {/* Progress Bar — "The Precision Guage" */}
            <div className="sticky top-[76px] z-40 w-full h-1 bg-[var(--ink)]/5">
                <div 
                    className="h-full bg-[var(--ink)] transition-all duration-1000 ease-out"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
            <main className="flex-1 flex flex-col min-h-0 px-6 py-4 overflow-hidden">
                <div className="flex-1 flex items-center justify-center min-h-0 py-4 relative">
                    {!isLoading && displayCards.length > 0 && (
                        <>
                            {isCompleted && currentIndex === 0 && !isFlipped ? (
                                <div className="w-full max-w-md bg-[var(--surface)] border-4 border-[var(--ink)] shadow-hard p-10 text-center space-y-6 animate-in zoom-in-95 duration-500 relative z-10">
                                    <div className="relative inline-flex items-center justify-center w-20 h-20 bg-[var(--accent)] border-4 border-[var(--ink)] shadow-hard rotate-3 mb-2">
                                        <CheckCircle size={40} className="text-[var(--bg)]" />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-display font-black text-[var(--text)] tracking-tighter uppercase leading-none">
                                            Protocol <br/> Complete
                                        </h2>
                                        <p className="text-[var(--muted)] font-mono text-[10px] uppercase italic tracking-widest p-3 bg-[var(--bg)] border-2 border-[var(--ink)] border-dashed">
                                            Session successfully archived.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <button 
                                            onClick={() => {
                                                setCurrentIndex(0);
                                                setIsCompleted(false);
                                                setIsFlipped(false);
                                            }}
                                            className="px-4 py-3 bg-[var(--ink)] text-[var(--bg)] border-2 border-[var(--ink)] shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-display font-bold uppercase tracking-tighter text-sm"
                                        >
                                            Repeat
                                        </button>
                                        <button 
                                            onClick={() => router.push('/practice/flashcards')}
                                            className="px-4 py-3 bg-[var(--surface-raised)] border-2 border-[var(--ink)] shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-display font-bold uppercase tracking-tighter text-[var(--ink)] text-sm"
                                        >
                                            Exit
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full max-w-2xl h-full flex flex-col justify-center relative z-10">
                                    <div 
                                        className="w-full group perspective-2000 cursor-pointer max-h-[55vh] mx-auto"
                                        onClick={() => setIsFlipped(!isFlipped)}
                                    >
                                        <div className={`relative w-full aspect-[4/3] sm:aspect-[16/10] transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-x-180' : ''}`}>
                                            {/* Front Side */}
                                            <div className="absolute inset-0 backface-hidden bg-[var(--surface)] border-4 border-[var(--ink)] shadow-hard p-8 sm:p-10 flex flex-col group-hover:shadow-[10px_10px_0px_var(--ink)] transition-all">
                                                <div className="flex items-center justify-between mb-4 opacity-40">
                                                    <span className="text-[9px] font-black font-mono uppercase tracking-[0.4em]">FRONT_FACE</span>
                                                    <span className="text-[9px] font-black font-mono">{currentIndex + 1}/{displayCards.length}</span>
                                                </div>
                                                <div className="flex-1 flex items-center justify-center text-center overflow-hidden">
                                                    <div className="max-h-full overflow-y-auto custom-scrollbar px-2 w-full">
                                                        <h3 className="text-xl sm:text-3xl font-display font-black text-[var(--text)] leading-tight tracking-tight text-balance uppercase">
                                                            {getFrontText(currentCard)}
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex items-center justify-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                                    <RotateCcw size={14} className="text-[var(--muted)] animate-spin-slow" />
                                                    <span className="text-[9px] font-bold font-mono text-[var(--muted)] uppercase tracking-widest">Flip Card</span>
                                                </div>
                                            </div>

                                            {/* Back Side */}
                                            <div className="absolute inset-0 backface-hidden bg-[var(--surface-raised)] border-4 border-[var(--ink)] shadow-hard p-8 sm:p-10 flex flex-col rotate-x-180">
                                                <div className="flex items-center justify-between mb-4 opacity-40">
                                                    <span className="text-[9px] font-black font-mono uppercase tracking-[0.4em] text-[var(--accent)]">BACK_FACE</span>
                                                    <span className="text-[9px] font-black font-mono">SEEN: {currentCard.times_seen} | CORRECT: {currentCard.times_correct}</span>
                                                </div>
                                                <div className="flex-1 flex items-center justify-center text-center overflow-hidden">
                                                    <div className="max-h-full overflow-y-auto custom-scrollbar px-2 w-full">
                                                        <p className="text-lg sm:text-xl font-mono font-medium text-[var(--text)] leading-relaxed italic text-balance">
                                                            {getBackText(currentCard)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {isLoading && (
                        <div className="flex flex-col items-center gap-6 animate-pulse">
                            <div className="w-16 h-16 bg-[var(--surface-raised)] border-4 border-[var(--ink)] shadow-hard-sm" />
                            <span className="text-[10px] font-black font-mono uppercase tracking-[0.3em] text-[var(--muted)]">Syncing_Session...</span>
                        </div>
                    )}
                </div>

                {/* Protocol Command Strip */}
                {!isCompleted && !isLoading && (
                    <div className="pb-4 sm:pb-6 flex flex-col items-center gap-4 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-center gap-3 w-full max-w-2xl px-2">
                            {/* Actions Component */}
                            <div className="flex-1 flex items-center gap-2 bg-[var(--surface)] border-4 border-[var(--ink)] p-2 shadow-hard-sm">
                                <button
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="p-3 bg-[var(--bg)] border-2 border-[var(--ink)] disabled:opacity-20 hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-all"
                                >
                                    <ArrowLeft size={16} strokeWidth={3} />
                                </button>
                                
                                <div className="h-8 w-[2px] bg-[var(--ink)]/10 mx-1" />

                                <button
                                    onClick={() => markMastery('still_learning')}
                                    className="flex-1 py-3 px-2 bg-[var(--bg)] border-2 border-[var(--ink)] hover:bg-[var(--accent)]/10 transition-all flex items-center justify-center gap-2 group"
                                >
                                    <RotateCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                                    <span className="text-[10px] font-black font-mono uppercase tracking-widest hidden sm:inline">Revisit</span>
                                </button>

                                <button
                                    onClick={() => markMastery('know_it')}
                                    className="flex-1 py-3 px-2 bg-[var(--accent)] text-[var(--bg)] border-2 border-[var(--ink)] shadow-hard-xs active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 group"
                                >
                                    <CheckCircle size={14} className="group-hover:scale-125 transition-transform" />
                                    <span className="text-[10px] font-black font-mono uppercase tracking-widest hidden sm:inline text-[var(--bg)]">Mastered</span>
                                </button>

                                <div className="h-8 w-[2px] bg-[var(--ink)]/10 mx-1" />

                                <button
                                    onClick={handleNext}
                                    className="p-3 bg-[var(--ink)] text-[var(--bg)] border-2 border-[var(--ink)] hover:bg-[var(--accent)] transition-all"
                                >
                                    <ArrowRight size={16} strokeWidth={3} />
                                </button>
                            </div>
                        </div>

                        {/* Status Bar */}
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-4 py-1.5 px-4 bg-[var(--surface-raised)] border-2 border-[var(--ink)] shadow-hard-xs">
                                <button 
                                    onClick={() => setSettingsOpen(true)}
                                    className="flex items-center gap-2 text-[9px] font-black font-mono uppercase tracking-widest text-[var(--ink)]"
                                >
                                    <Settings size={12} />
                                    Config
                                </button>
                                <div className="h-4 w-[2px] bg-[var(--ink)]/20" />
                                <span className="text-[10px] font-black font-mono tabular-nums tracking-tighter text-[var(--ink)]">
                                    {currentIndex + 1} OF {displayCards.length}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* AI Insight Node */}
            <button 
                onClick={() => toast.success("AI generating real-time performance insights...")}
                className="fixed bottom-6 right-6 w-14 h-14 bg-[var(--surface)] border-4 border-[var(--ink)] shadow-hard active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all group flex items-center justify-center z-40 overflow-hidden"
            >
                <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                <Sparkles size={24} className="group-hover:rotate-12 transition-transform relative z-10 text-[var(--ink)]" />
            </button>


            {/* Config Overlay - Settings Modal */}
            {settingsOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 overflow-hidden">
                    <div 
                        className="absolute inset-0 bg-[var(--ink)]/60 backdrop-blur-md animate-in fade-in duration-500" 
                        onClick={() => setSettingsOpen(false)}
                    />
                    <div className="relative w-full max-w-sm bg-[var(--surface)] border-4 border-[var(--ink)] shadow-hard p-10 space-y-8 animate-in slide-in-from-bottom-8 duration-500">
                        <div className="flex items-center justify-between border-b-4 border-[var(--ink)] pb-4">
                            <h3 className="text-xl font-display font-black text-[var(--ink)] uppercase tracking-tighter">PROTOCOL_CONFIG</h3>
                            <button 
                                onClick={() => setSettingsOpen(false)}
                                className="p-2.5 bg-[var(--surface-raised)] border-2 border-[var(--ink)] shadow-hard-sm hover:shadow-none transition-all"
                            >
                                <X size={16} className="text-[var(--ink)]" />
                            </button>
                        </div>

                        <div className="space-y-8">
                            {/* Sequence Toggle */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 text-[10px] font-black font-mono uppercase tracking-[0.3em] text-[var(--muted)]">
                                    Recall Axis (POV)
                                </label>
                                <div className="flex gap-1 p-1 bg-[var(--bg)] border-2 border-[var(--ink)]">
                                    {(['front', 'back', 'random'] as const).map((side) => (
                                        <button 
                                            key={side}
                                            onClick={() => setShowSide(side)}
                                            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${showSide === side ? 'bg-[var(--ink)] text-[var(--bg)]' : 'text-[var(--ink)]/40 hover:text-[var(--ink)]'}`}
                                        >
                                            {side}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Entropy Toggle */}
                            <div className="flex items-center justify-between p-4 bg-[var(--surface-raised)] border-2 border-[var(--ink)]">
                                <div className="flex items-center gap-3">
                                    <Shuffle size={16} className="text-[var(--ink)]" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black font-mono uppercase tracking-widest text-[var(--ink)]">ENTROPY</span>
                                        <span className="text-[8px] text-[var(--muted)] italic font-mono lowercase">Shuffle sequence</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsShuffled(!isShuffled)}
                                    className={`w-12 h-6 border-2 border-[var(--ink)] transition-colors relative ${isShuffled ? 'bg-[var(--accent)]' : 'bg-[var(--bg)]'}`}
                                >
                                    <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[var(--bg)] border-[1px] border-[var(--ink)] transition-all ${isShuffled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>

                        <button 
                            onClick={() => setSettingsOpen(false)}
                            className="w-full py-4 bg-[var(--ink)] text-[var(--bg)] border-4 border-[var(--ink)] shadow-hard font-display font-black text-xs uppercase tracking-widest active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                        >
                            Sync_Config
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
