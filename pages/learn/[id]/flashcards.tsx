import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function FlashcardsMode() {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cards, setCards] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [sessionData, setSessionData] = useState<any>(null);
    const [stats, setStats] = useState({ gotIt: 0, shaky: 0 });
    const [isComplete, setIsComplete] = useState(false);
    const [authToken, setAuthToken] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const initDeck = async () => {
            try {
                const stored = localStorage.getItem('serify_feedback_report');
                if (!stored) {
                    router.push('/analyze');
                    return;
                }

                const parsed = JSON.parse(stored);
                setSessionData({
                    userId: user?.id || 'placeholder-user-id',
                    sessionId: id as string,
                    concepts: parsed.concepts || []
                });

                const {
                    data: { session }
                } = await supabase.auth.getSession();
                const token = session?.access_token;
                const headers: any = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                if (token) setAuthToken(token);

                const isRegenerating = router.query.regenerate === 'true';

                if (!isRegenerating) {
                    const getRes = await fetch(`/api/sessions/${id}/flashcards`, { headers });
                    if (getRes.ok) {
                        const data = await getRes.json();
                        if (data.cards && data.cards.length > 0) {
                            setCards(data.cards);
                            setLoading(false);
                            return;
                        }
                    }
                }

                const weakConcepts = (parsed.report?.strength_map || [])
                    .filter((item: any) =>
                        ['revisit', 'shaky', 'skipped', 'developing'].includes(item.mastery_state)
                    )
                    .map((item: any) => ({
                        id: item.concept_id,
                        name:
                            parsed.concepts?.find((c: any) => c.id === item.concept_id)?.name ||
                            'Concept',
                        masteryState: item.mastery_state,
                        feedbackNote: item.feedback_text
                    }));

                if (weakConcepts.length === 0) {
                    setIsComplete(true);
                    setLoading(false);
                    return;
                }

                const res = await fetch(`/api/sessions/${id}/flashcards/generate`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ weakConcepts })
                });

                if (res.ok) {
                    const data = await res.json();
                    setCards(data.cards || []);
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    setError(errorData.error || 'Failed to generate flashcards.');
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'An unexpected error occurred.');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            initDeck();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, router]);

    const handleGotIt = async () => {
        const currentCard = cards[currentIndex];

        if (sessionData) {
            fetch('/api/learn/mastery-update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
                },
                body: JSON.stringify({
                    conceptId: currentCard.conceptId,
                    mode: 'flashcards',
                    outcome: 'developing',
                    sessionId: sessionData.sessionId
                })
            }).catch(console.error);
        }

        setStats((prev) => ({ ...prev, gotIt: prev.gotIt + 1 }));
        nextCard();
    };

    const handleShaky = async () => {
        const currentCard = cards[currentIndex];

        if (sessionData) {
            fetch('/api/learn/mastery-update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
                },
                body: JSON.stringify({
                    conceptId: currentCard.conceptId,
                    mode: 'flashcards',
                    outcome: 'shaky',
                    sessionId: sessionData.sessionId
                })
            }).catch(console.error);
        }

        setCards((prev) => [...prev, currentCard]);
        setStats((prev) => ({ ...prev, shaky: prev.shaky + 1 }));
        nextCard();
    };

    const nextCard = () => {
        setIsFlipped(false);
        if (currentIndex < cards.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        } else {
            setIsComplete(true);
        }
    };

    const getConceptName = (conceptId?: string) => {
        if (!conceptId || !sessionData) return 'Concept';
        return sessionData.concepts.find((c: any) => c.id === conceptId)?.name || 'Concept';
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)]">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin mb-4"></div>
                <p className="text-[var(--muted)] animate-pulse">Preparing your deck...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--text)] flex flex-col pt-12">
                <div className="max-w-[600px] mx-auto w-full px-6 flex-1 flex flex-col items-center pt-24 text-center">
                    <div className="w-20 h-20 rounded-full bg-[var(--warn-light)] text-[var(--warn)] flex items-center justify-center mb-6 text-3xl">
                        ⚠️
                    </div>
                    <h2 className="text-3xl font-display mb-4">Generation Failed</h2>
                    <p className="text-[var(--muted)] mb-8 text-lg">{error}</p>
                    <Link
                        href={`/session/${id}/feedback`}
                        className="px-6 py-3 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-xl font-medium hover:bg-black/5 transition-colors"
                    >
                        Return to Report
                    </Link>
                </div>
            </div>
        );
    }

    if (!loading && cards.length === 0 && !isComplete) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--text)] flex flex-col pt-12">
                <div className="max-w-[600px] mx-auto w-full px-6 flex-1 flex flex-col items-center pt-24 text-center">
                    <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-6 text-3xl">
                        🎴
                    </div>
                    <h2 className="text-3xl font-display mb-4">No cards to review</h2>
                    <p className="text-[var(--muted)] mb-8 text-lg">
                        We couldn&apos;t generate cards for this session. It might be because you
                        already understood everything or the content was too short.
                    </p>
                    <Link
                        href={`/session/${id}/feedback`}
                        className="px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-medium hover:-translate-y-0.5 transition-all"
                    >
                        Return to Report &rarr;
                    </Link>
                </div>
            </div>
        );
    }

    if (isComplete) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--text)] flex flex-col pt-12">
                <div className="max-w-[600px] mx-auto w-full px-6 flex-1 flex flex-col items-center pt-24">
                    <div className="w-20 h-20 rounded-full bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center mb-6 text-3xl">
                        🎉
                    </div>
                    <h2 className="text-3xl font-display mb-4">Deck Complete</h2>
                    <p className="text-[var(--muted)] text-center mb-8 text-lg">
                        You retired {stats.gotIt} cards.{' '}
                        {stats.shaky > 0 && `You have ${stats.shaky} shaky cards to review later.`}
                    </p>
                    <Link
                        href={`/session/${id}/feedback`}
                        className="px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-medium hover:-translate-y-0.5 transition-all"
                    >
                        Return to Report &rarr;
                    </Link>
                </div>
            </div>
        );
    }

    const currentCard = cards[currentIndex];

    if (!currentCard) return null;

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--text)] flex flex-col">
            <Head>
                <title>Flashcards | Serify</title>
            </Head>

            {}
            <header className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10 hidden md:flex">
                <Link
                    href={`/session/${id}/feedback`}
                    className="text-[var(--muted)] hover:text-[var(--text)] transition-colors text-sm font-medium flex items-center gap-2"
                >
                    &larr; Back to Report
                </Link>
                <div className="font-medium text-sm text-[var(--text)]">
                    <span className="font-bold">{getConceptName(currentCard.conceptId)}</span>{' '}
                    <span className="text-[var(--muted)] mx-2">|</span> Card {currentIndex + 1} of{' '}
                    {cards.length}
                </div>
                <div className="w-24"></div> {}
            </header>

            {}
            <main className="flex-1 flex flex-col items-center justify-center p-6 pb-32">
                {}
                <div className="md:hidden text-center mb-8">
                    <div className="font-bold text-lg">{getConceptName(currentCard.conceptId)}</div>
                    <div className="text-[var(--muted)] text-sm">
                        Card {currentIndex + 1} of {cards.length}
                    </div>
                </div>

                {}
                <div
                    className={`relative w-full max-w-[600px] aspect-[4/3] rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition-all duration-300 transform-gpu cursor-pointer group`}
                    style={{ perspective: '1000px' }}
                    onClick={() => !isFlipped && setIsFlipped(true)}
                >
                    <div
                        className={`absolute inset-0 w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateX(180deg)]' : ''}`}
                    >
                        {}
                        <div className="absolute inset-0 w-full h-full backface-hidden p-8 md:p-12 flex flex-col items-center justify-center text-center bg-white rounded-3xl">
                            <h2 className="text-2xl md:text-[32px] font-display mb-6 text-[var(--text)] leading-tight">
                                {currentCard.front}
                            </h2>
                            <p className="text-[var(--muted)] text-sm absolute bottom-8 opacity-60 font-medium tracking-wide">
                                TAP TO FLIP
                            </p>
                        </div>

                        {}
                        <div className="absolute inset-0 w-full h-full backface-hidden p-8 md:p-12 flex flex-col items-center justify-center text-center bg-white rounded-3xl pt-16 [transform:rotateX(180deg)] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border-2 border-[var(--accent)]">
                            <div className="absolute top-6 left-0 right-0 flex justify-center">
                                <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)] bg-[var(--accent-light)] px-3 py-1 rounded-full">
                                    Answer
                                </span>
                            </div>
                            <p className="text-lg md:text-xl text-[var(--text)] leading-relaxed">
                                {currentCard.back}
                            </p>
                        </div>
                    </div>
                </div>

                {}
                <div className="mt-12 h-16 w-full max-w-[600px] flex items-center justify-center gap-4">
                    {!isFlipped ? (
                        <button
                            onClick={() => setIsFlipped(true)}
                            className="px-8 py-3.5 bg-[var(--accent)] text-white font-medium rounded-xl hover:-translate-y-0.5 transition-all shadow-sm text-lg w-full md:w-auto min-w-[200px]"
                        >
                            Show Answer
                        </button>
                    ) : (
                        <div className="flex items-center gap-3 w-full animate-fade-in">
                            <button
                                onClick={handleGotIt}
                                className="flex-1 py-4 bg-[#10b981] text-white font-bold rounded-xl hover:bg-[#059669] hover:-translate-y-0.5 transition-all shadow-sm text-lg"
                            >
                                Got It ✓
                            </button>
                            <button
                                onClick={handleShaky}
                                className="flex-1 py-4 border-2 border-amber-500 text-amber-600 bg-amber-50 font-bold rounded-xl hover:bg-amber-100 transition-colors text-lg"
                            >
                                Still Shaky
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
