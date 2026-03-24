import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Layers, ArrowRight, ArrowLeft, Loader2, CheckCircle, RotateCcw, X, Sparkles, Settings, Shuffle, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';
import GeneratingAnimation from '@/components/GeneratingAnimation';

export default function FlashcardsSession() {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();
    
    const [deck, setDeck] = useState<any>(null);
    const [cards, setCards] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    
    const [isCompleted, setIsCompleted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [markingMastery, setMarkingMastery] = useState(false);

    
    const [showSide, setShowSide] = useState<'front' | 'back' | 'random'>('front');
    const [isShuffled, setIsShuffled] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [displayCards, setDisplayCards] = useState<any[]>([]);

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
                        title: sessionData.topic || 'Concept Review',
                        description: 'Legacy session'
                    });
                    setCards(qData.cards || []);
                }

            } catch (err: any) {
                console.error(err);
                toast.error(err.message);
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
        } catch (err: any) {
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
                <div className="w-full max-w-lg text-center">
                    <p className="text-xl font-display text-[var(--text)] mb-8">Building study session...</p>
                    <GeneratingAnimation type="cards" />
                </div>
            </div>
        );
    }

    if (!deck || displayCards.length === 0) return null;

    const currentCard = displayCards[currentIndex];
    const progressPercent = ((currentIndex + 1) / displayCards.length) * 100;

    
    const getFrontText = (card: any) => {
        if (showSide === 'back') return card.back;
        if (showSide === 'random') {
            
            const hash = card.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
            return hash % 2 === 0 ? card.front : card.back;
        }
        return card.front;
    };

    const getBackText = (card: any) => {
        if (showSide === 'back') return card.front;
        if (showSide === 'random') {
             const hash = card.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
             return hash % 2 === 0 ? card.back : card.front;
        }
        return card.back;
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col relative overflow-hidden">
            <Head>
                <title>{deck.title} | Flashcards | Serify</title>
            </Head>

            {}
            <header className="fixed top-0 inset-x-0 h-16 bg-[var(--surface)] border-b border-[var(--border)] z-20 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push('/practice/flashcards')}
                        className="p-2 hover:bg-[var(--bg)] rounded-xl text-[var(--muted)] transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Flashcards</span>
                        <span className="font-semibold text-[var(--text)] line-clamp-1 max-w-[200px] sm:max-w-md">
                            {deck.title}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--muted)]">
                        Progress: <span className="text-[var(--text)]">{currentIndex + 1}/{displayCards.length}</span>
                    </div>

                    <button 
                        onClick={() => setSettingsOpen(true)}
                        className="p-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--muted)] hover:text-teal-600 transition-all active:scale-95 shadow-sm"
                        title="Study Settings"
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </header>

            {}
            <div className="fixed top-16 inset-x-0 h-1 bg-[var(--border)] z-20">
                <div 
                    className="h-full bg-teal-500 transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            <main className="flex-1 pt-24 pb-32 overflow-y-auto px-4 flex flex-col items-center justify-center">
                <div className="max-w-2xl w-full space-y-8 animate-fade-in-up">
                    
                    {isCompleted && currentIndex === 0 && !isFlipped ? (
                        <div className="bg-[var(--surface)] border text-center p-12 rounded-[40px] shadow-sm border-[var(--border)] space-y-8 max-w-lg mx-auto">
                            <div className="w-24 h-24 rounded-full bg-teal-50 text-teal-600 mx-auto flex items-center justify-center border-4 border-teal-100 animate-bounce-slow">
                                <CheckCircle size={48} />
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-4xl font-display text-[var(--text)] tracking-tight">
                                    Deck Mastered!
                                </h2>
                                <p className="text-[var(--muted)] text-lg">
                                    You&apos;ve gone through all {displayCards.length} cards. Your progress has been synced to your library.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={() => handleNext()}
                                    className="w-full py-4 bg-[var(--text)] text-[var(--bg)] rounded-2xl font-bold hover:opacity-90 transition active:scale-95"
                                >
                                    Review Again
                                </button>
                                <button 
                                    onClick={() => router.push('/practice/flashcards')}
                                    className="w-full py-4 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-2xl font-bold hover:bg-[var(--bg)] transition active:scale-95"
                                >
                                    Finish & Return Home
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {}
                            <div className="space-y-6">
                                <div 
                                    className="relative w-full aspect-[4/3] [perspective:1000px] cursor-pointer group"
                                    onClick={() => setIsFlipped(!isFlipped)}
                                >
                                    <div className={`w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateX(180deg)]' : ''}`}>
                                        {}
                                        <div className="absolute inset-0 w-full h-full bg-white border-2 border-[var(--border)] rounded-[40px] shadow-xl hover:border-teal-300 transition-all [backface-visibility:hidden] flex flex-col items-center justify-center p-12 text-center">
                                            <div className="absolute top-8 left-8 text-[10px] font-black uppercase tracking-[0.2em] text-teal-500/40">Front</div>
                                            <p className="text-2xl md:text-3xl font-display text-[var(--text)] leading-tight">
                                                {getFrontText(currentCard)}
                                            </p>
                                            <div className="absolute bottom-10 flex items-center gap-2 text-[var(--muted)] opacity-30 group-hover:opacity-100 transition-opacity">
                                                <RotateCcw size={16} /> <span className="text-xs font-bold uppercase tracking-widest">Click to reveal</span>
                                            </div>
                                        </div>

                                        {}
                                        <div className="absolute inset-0 w-full h-full bg-slate-50 border-2 border-[var(--border)] rounded-[40px] shadow-xl [transform:rotateX(180deg)] [backface-visibility:hidden] flex flex-col items-center justify-center p-12 text-center overflow-y-auto">
                                            <div className="absolute top-8 left-8 text-[10px] font-black uppercase tracking-[0.2em] text-teal-600/40">Back</div>
                                            <p className="text-xl md:text-2xl font-display text-slate-800 leading-relaxed">
                                                {getBackText(currentCard)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {}
                            <div className="flex flex-col items-center gap-8">
                                <div className="flex items-center justify-center gap-6 w-full max-w-md">
                                    <button
                                        onClick={() => markMastery('still_learning')}
                                        className="flex-1 group flex flex-col items-center gap-2 p-6 rounded-3xl border-2 border-orange-100 bg-orange-50/30 hover:bg-orange-50 hover:border-orange-200 transition-all active:scale-95"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                                            <RotateCcw size={24} />
                                        </div>
                                        <span className="text-sm font-bold text-orange-700">Still learning</span>
                                    </button>

                                    <button
                                        onClick={() => markMastery('know_it')}
                                        className="flex-1 group flex flex-col items-center gap-2 p-6 rounded-3xl border-2 border-teal-100 bg-teal-50/30 hover:bg-teal-50 hover:border-teal-200 transition-all active:scale-95"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                                            <CheckCircle size={24} />
                                        </div>
                                        <span className="text-sm font-bold text-teal-700">Know it</span>
                                    </button>
                                </div>

                                {}
                                <div className="flex items-center gap-8 text-[var(--muted)]">
                                    <button
                                        onClick={handlePrev}
                                        disabled={currentIndex === 0}
                                        className="p-3 hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ArrowLeft size={24} />
                                    </button>
                                    <span className="text-sm font-bold tracking-tighter">
                                        {currentIndex + 1} / {displayCards.length}
                                    </span>
                                    <button
                                        onClick={handleNext}
                                        className="p-3 hover:text-[var(--text)] transition-colors"
                                    >
                                        <ArrowRight size={24} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {}
            <button 
                className="fixed bottom-8 right-8 w-14 h-14 bg-teal-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all group"
                onClick={() => toast.success("AI Explanation coming soon in Phase 3!")}
            >
                <Sparkles size={24} className="group-hover:animate-spin-slow" />
            </button>

            {}
            {settingsOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" 
                        onClick={() => setSettingsOpen(false)}
                    />
                    <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-[32px] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-display text-[var(--text)]">Study Settings</h3>
                            <button 
                                onClick={() => setSettingsOpen(false)}
                                className="p-2 hover:bg-[var(--bg)] rounded-xl text-[var(--muted)]"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-8">
                            {}
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest flex items-center gap-2">
                                    <Repeat size={14} className="text-teal-500" />
                                    Answer With
                                </label>
                                <div className="grid grid-cols-3 gap-2 p-1 bg-[var(--bg)] border border-[var(--border)] rounded-2xl">
                                    <button 
                                        onClick={() => setShowSide('front')}
                                        className={`py-2 text-xs font-bold rounded-xl transition-all ${showSide === 'front' ? 'bg-[var(--surface)] text-teal-600 shadow-sm border border-[var(--border)]' : 'text-[var(--muted)]'}`}
                                    >
                                        Front
                                    </button>
                                    <button 
                                        onClick={() => setShowSide('back')}
                                        className={`py-2 text-xs font-bold rounded-xl transition-all ${showSide === 'back' ? 'bg-[var(--surface)] text-teal-600 shadow-sm border border-[var(--border)]' : 'text-[var(--muted)]'}`}
                                    >
                                        Back
                                    </button>
                                    <button 
                                        onClick={() => setShowSide('random')}
                                        className={`py-2 text-xs font-bold rounded-xl transition-all ${showSide === 'random' ? 'bg-[var(--surface)] text-teal-600 shadow-sm border border-[var(--border)]' : 'text-[var(--muted)]'}`}
                                    >
                                        Mixed
                                    </button>
                                </div>
                            </div>

                            {}
                            <div className="flex items-center justify-between p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                                        <Shuffle size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-[var(--text)]">Shuffle Cards</span>
                                        <span className="text-[10px] text-[var(--muted)]">Randomize card order</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsShuffled(!isShuffled)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isShuffled ? 'bg-teal-500' : 'bg-[var(--border)]'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isShuffled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        <button 
                            onClick={() => setSettingsOpen(false)}
                            className="w-full mt-10 py-4 bg-teal-600 text-white rounded-2xl font-bold hover:bg-teal-700 transition active:scale-95 shadow-sm"
                        >
                            Start Studying
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
