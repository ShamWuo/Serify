import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { 
    Layers, 
    Sparkles, 
    Plus, 
    Search, 
    Clock, 
    BarChart2, 
    MoreVertical, 
    Play, 
    BookOpen,
    Trash2,
    Share2,
    Star,
    LayoutGrid,
    List,
    Edit3
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import GeneratingAnimation from '@/components/GeneratingAnimation';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { FlashcardDeck } from '@/types/serify';
import { toast } from 'react-hot-toast';

export default function FlashcardsPage() {
    const router = useRouter();
    const { token, loading: authLoading } = useAuth();
    const [isGenerating, setIsGenerating] = useState(false);
    const [decks, setDecks] = useState<FlashcardDeck[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!router.isReady) return;

        const { topic, concepts } = router.query;

        if (topic || concepts) {
            setIsGenerating(true);
            generateFlashcards(topic as string, concepts as string);
        } else {
            fetchDecks();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.isReady, router.query]);

    const fetchDecks = async () => {
        try {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/practice');
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('flashcard_decks')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (fetchError) throw fetchError;
            setDecks(data || []);
        } catch (err: any) {
            console.error('Error fetching decks:', err);
            toast.error('Failed to load your decks');
        } finally {
            setIsLoading(false);
        }
    };

    const generateFlashcards = async (topic?: string, concepts?: string) => {
        try {
            const payload: any = {};
            if (topic) {
                payload.topic = topic;
            } else if (concepts) {
                payload.conceptIds = (concepts as string).split(',');
            }

            if (!token) {
                toast.error("You must be logged in to generate flashcards.");
                setIsGenerating(false);
                return;
            }
 
            const res = await fetch('/api/practice/flashcards/generate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate flashcards');
            }

            // Redirect to the active session
            router.replace(`/practice/flashcards/${data.sessionId}`);

        } catch (err: any) {
            setError(err.message);
            setIsGenerating(false);
        }
    };

    const deleteDeck = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (!confirm('Are you sure you want to delete this deck? All progress and cards will be lost.')) return;

        try {
            const { error: deleteError } = await supabase
                .from('flashcard_decks')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;
            
            setDecks(decks.filter(d => d.id !== id));
            toast.success('Deck deleted');
        } catch (err) {
            toast.error('Failed to delete deck');
        }
    };

    const filteredDecks = decks.filter(deck => 
        deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deck.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 shadow-sm text-center space-y-4 text-balanced">
                    <p className="font-semibold text-lg">Generation Failed</p>
                    <p className="text-sm opacity-90">{error}</p>
                    <button 
                        onClick={() => router.push('/practice/flashcards')}
                        className="px-6 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition"
                    >
                        Return to Library
                    </button>
                </div>
            </div>
        );
    }

    if (isGenerating) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6 relative overflow-hidden">
                <Head>
                    <title>Generating Flashcards | Serify</title>
                </Head>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/5 rounded-full blur-[100px] -z-10" />

                <div className="text-center space-y-8 animate-fade-in-up">
                    <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-teal-50 border border-teal-100 shadow-sm">
                        <Layers size={40} className="text-teal-600 relative z-10" />
                        <Sparkles size={20} className="text-teal-400 absolute -top-2 -right-2 animate-pulse" />
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-display text-[var(--text)] tracking-tight">
                            Building study session...
                        </h1>
                        <p className="text-[var(--muted)] text-lg">
                            Distilling knowledge into bite-sized flashcards.
                        </p>
                    </div>

                    <div className="pt-4 w-full max-w-sm mx-auto">
                        <GeneratingAnimation type="cards" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout>
            <Head>
                <title>Flashcard Library | Serify</title>
            </Head>

            <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3 text-teal-600 mb-2">
                            <div className="p-2 bg-teal-50 rounded-xl">
                                <Layers size={24} />
                            </div>
                            <span className="text-sm font-bold tracking-wider uppercase">Practice Mode</span>
                        </div>
                        <h1 className="text-4xl font-display text-[var(--text)]">Flashcard Library</h1>
                        <p className="text-[var(--muted)] text-lg">Manage your decks and track your mastery progress.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => router.push('/practice/flashcards/new')}
                            className="flex items-center gap-2 px-6 py-3 bg-[var(--text)] text-[var(--bg)] rounded-2xl font-semibold hover:opacity-90 transition active:scale-95 shadow-sm"
                        >
                            <Plus size={20} />
                            Create Deck
                        </button>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:max-w-md group">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] group-focus-within:text-teal-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search your decks..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[var(--bg)] text-teal-600 shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[var(--bg)] text-teal-600 shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>

                {/* Decks Grid/List */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-64 bg-[var(--surface)] rounded-3xl border border-[var(--border)] animate-pulse" />
                        ))}
                    </div>
                ) : filteredDecks.length > 0 ? (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                        {filteredDecks.map((deck) => (
                            <Link 
                                href={`/practice/flashcards/${deck.id}`} 
                                key={deck.id}
                                className={`group bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden hover:border-teal-500/30 transition-all active:scale-[0.98] ${viewMode === 'list' ? 'flex items-center gap-6 p-4' : 'flex flex-col h-full'}`}
                            >
                                {/* Thumbnail/Icon */}
                                <div className={`flex items-center justify-center bg-gradient-to-br from-teal-500/10 to-blue-500/10 ${viewMode === 'list' ? 'w-16 h-16 rounded-2xl flex-shrink-0' : 'h-32 p-6'}`}>
                                    <Layers size={viewMode === 'list' ? 32 : 48} className="text-teal-600/80 group-hover:scale-110 transition-transform" />
                                </div>

                                <div className={`p-6 flex flex-col flex-grow ${viewMode === 'list' ? 'p-0' : ''}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-bold text-[var(--text)] group-hover:text-teal-600 transition-colors line-clamp-1">{deck.title}</h3>
                                            <p className="text-sm text-[var(--muted)] line-clamp-2">{deck.description || 'No description provided.'}</p>
                                        </div>
                                        <div className="flex items-center gap-1 group/menu">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    router.push(`/practice/flashcards/edit/${deck.id}`);
                                                }}
                                                className="p-2 text-[var(--muted)] hover:text-teal-500 hover:bg-teal-50 rounded-xl transition-colors"
                                                title="Edit Deck"
                                            >
                                                <Edit3 size={18} />
                                            </button>
                                            <button 
                                                onClick={(e) => deleteDeck(deck.id, e)}
                                                className="p-2 text-[var(--muted)] hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                title="Delete Deck"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-6 flex flex-col gap-4">
                                        {/* Progress Bar */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                                                <span>Mastery</span>
                                                <span className="text-teal-600">
                                                    {deck.total_cards > 0 
                                                        ? Math.round((deck.cards_know_it / deck.total_cards) * 100) 
                                                        : 0}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden flex">
                                                <div 
                                                    className="h-full bg-teal-500 transition-all duration-1000" 
                                                    style={{ width: `${(deck.cards_know_it / (deck.total_cards || 1)) * 100}%` }}
                                                />
                                                <div 
                                                    className="h-full bg-orange-400 transition-all duration-1000" 
                                                    style={{ width: `${(deck.cards_still_learning / (deck.total_cards || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center gap-4 text-xs font-medium text-[var(--muted)]">
                                                <span className="flex items-center gap-1.5 bg-[var(--bg)] px-2.5 py-1.5 rounded-lg border border-[var(--border)]">
                                                    <BookOpen size={14} className="text-teal-500" />
                                                    {deck.total_cards} cards
                                                </span>
                                                {deck.last_studied_at && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock size={14} />
                                                        {new Date(deck.last_studied_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    <Play size={18} fill="currentColor" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-6 bg-[var(--surface)] border border-[var(--border)] rounded-[40px] dashed border-dashed">
                        <div className="w-24 h-24 bg-teal-50 rounded-[32px] flex items-center justify-center text-teal-600 mb-2">
                            <Layers size={48} />
                        </div>
                        <div className="space-y-2 max-w-sm">
                            <h2 className="text-2xl font-bold text-[var(--text)]">Your library is empty</h2>
                            <p className="text-[var(--muted)]">Start by generating flashcards from a topic, or create your first custom deck manually.</p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                            <button 
                                onClick={() => router.push('/practice/flashcards/new')}
                                className="flex items-center gap-2 px-8 py-3 bg-[var(--text)] text-[var(--bg)] rounded-2xl font-semibold hover:opacity-90 transition active:scale-95 shadow-sm"
                            >
                                <Plus size={20} />
                                Create Manual Deck
                            </button>
                            <button 
                                onClick={() => router.push('/practice')}
                                className="flex items-center gap-2 px-8 py-3 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-2xl font-semibold hover:bg-[var(--bg)] transition active:scale-95 shadow-sm"
                            >
                                <Sparkles size={20} className="text-teal-500" />
                                AI Generate
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
