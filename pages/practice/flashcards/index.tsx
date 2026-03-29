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
        } catch (err) {
            const error = err as Error;
            console.error('Error fetching decks:', error);
            toast.error('Failed to load your decks');
        } finally {
            setIsLoading(false);
        }
    };

    const generateFlashcards = async (topic?: string, concepts?: string) => {
        try {
            const payload: { topic?: string; conceptIds?: string[] } = {};
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

            
            router.replace(`/practice/flashcards/${data.sessionId}`);

        } catch (err) {
            const error = err as Error;
            setError(error.message);
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

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--accent)]/5 rounded-full blur-[120px] -z-10" />

                <div className="text-center space-y-10 max-w-lg w-full">
                    <div className="relative inline-flex items-center justify-center w-28 h-28 bg-[var(--surface)] border-4 border-[var(--ink)] shadow-hard rounded-2xl rotate-3">
                        <Layers size={48} className="text-[var(--ink)]" />
                        <div className="absolute -top-4 -right-4 w-12 h-12 bg-[var(--accent)] border-2 border-[var(--ink)] shadow-hard flex items-center justify-center rounded-xl -rotate-12">
                            <Sparkles size={20} className="text-[var(--bg)]" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl font-display font-bold text-[var(--text)] tracking-tight">
                            Ink meets Paper...
                        </h1>
                        <p className="text-[var(--muted)] font-mono text-sm uppercase tracking-widest leading-relaxed">
                            Distilling complex knowledge into <br/> bite-sized active recall units.
                        </p>
                    </div>

                    <div className="pt-6 w-full max-w-sm mx-auto p-8 paper-card bg-[var(--surface)] relative">
                        <div className="absolute inset-0 bg-[var(--accent)]/5 pointer-events-none" />
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

            <div className="max-w-7xl mx-auto space-y-10 p-4 md:p-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b-4 border-[var(--ink)] relative">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="bg-[var(--accent)] text-[var(--bg)] px-3 py-1 border-2 border-[var(--ink)] shadow-[4px_4px_0px_var(--ink)] -rotate-1">
                                <span className="text-[10px] font-bold font-mono tracking-widest uppercase italic">PRACTICE SYSTEM v2.0</span>
                            </div>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-display font-bold text-[var(--text)] tracking-tight leading-none">Flashcard Library</h1>
                        <p className="text-[var(--muted)] font-mono text-sm italic max-w-xl">A curated archive of your conceptual mastery. Revisit, revise, and solidify.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => router.push('/practice/flashcards/new')}
                            className="group flex items-center gap-3 px-8 py-4 bg-[var(--text)] text-[var(--bg)] border-4 border-[var(--ink)] shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_var(--ink)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all font-display font-bold text-lg"
                        >
                            <Plus size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                            Draft New Deck
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                    <div className="relative w-full md:max-w-md group">
                        <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--muted)] group-focus-within:text-[var(--accent)] transition-colors" />
                        <input 
                            type="text" 
                            placeholder="LO-FI SEARCH..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-[var(--surface)] border-4 border-[var(--ink)] shadow-hard focus:border-[var(--accent)] outline-none transition-all font-mono font-bold text-sm uppercase placeholder:text-[var(--muted)]/50 focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[4px_4px_0px_var(--ink)]"
                        />
                    </div>

                    <div className="flex items-center gap-2 p-1.5 bg-[var(--surface)] border-4 border-[var(--ink)] shadow-hard">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-3 transition-all ${viewMode === 'grid' ? 'bg-[var(--ink)] text-[var(--bg)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                            title="Grid View"
                        >
                            <LayoutGrid size={20} strokeWidth={2.5} />
                        </button>
                        <div className="w-1 h-8 bg-[var(--ink)]/10 mx-1" />
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-3 transition-all ${viewMode === 'list' ? 'bg-[var(--ink)] text-[var(--bg)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                            title="List View"
                        >
                            <List size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-72 bg-[var(--surface)] border-4 border-[var(--ink)] shadow-hard animate-pulse opacity-50" />
                        ))}
                    </div>
                ) : filteredDecks.length > 0 ? (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10" : "space-y-6"}>
                        {filteredDecks.map((deck) => (
                            <Link 
                                href={`/practice/flashcards/${deck.id}`} 
                                key={deck.id}
                                className={`group bg-[var(--surface)] border-4 border-[var(--ink)] hover:border-[var(--accent)] shadow-hard hover:shadow-[12px_12px_0px_var(--ink)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none paper-card ${viewMode === 'list' ? 'flex items-center gap-8 p-6' : 'flex flex-col h-full overflow-hidden'}`}
                            >
                                <div className={`flex items-center justify-center border-b-4 border-[var(--ink)] group-hover:border-[var(--accent)] transition-colors bg-[var(--bg)] relative overflow-hidden ${viewMode === 'list' ? 'w-24 h-24 border-b-0 border-r-4 flex-shrink-0' : 'h-40 p-8'}`}>
                                    <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                                    <Layers size={viewMode === 'list' ? 32 : 56} className="text-[var(--ink)] group-hover:scale-110 transition-transform group-hover:rotate-6 relative z-10" />
                                    
                                    {/* Action overlay - Desktop only */}
                                    <div className="absolute inset-0 bg-[var(--ink)]/0 group-hover:bg-[var(--ink)]/5 flex items-center justify-center transition-all">
                                        <div className="bg-[var(--accent)] text-[var(--bg)] px-4 py-2 border-2 border-[var(--ink)] shadow-[4px_4px_0px_var(--ink)] font-display font-bold text-xs uppercase opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                            Study Now
                                        </div>
                                    </div>
                                </div>

                                <div className={`p-8 flex flex-col flex-grow ${viewMode === 'list' ? 'p-0 h-full' : ''}`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-2xl font-display font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors line-clamp-1 leading-tight">{deck.title}</h3>
                                            </div>
                                            <p className="text-xs font-mono text-[var(--muted)] line-clamp-2 uppercase tracking-tight font-bold italic opacity-80">
                                                {deck.description || 'No descriptive technical notes provided.'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    router.push(`/practice/flashcards/edit/${deck.id}`);
                                                }}
                                                className="p-2 text-[var(--ink)] hover:text-[var(--bg)] hover:bg-[var(--ink)] border-2 border-[var(--ink)] shadow-[2px_2px_0px_var(--ink)] hover:shadow-none transition-all active:translate-x-[2px] active:translate-y-[2px]"
                                                title="Edit Metadata"
                                            >
                                                <Edit3 size={16} strokeWidth={2.5} />
                                            </button>
                                            <button 
                                                onClick={(e) => deleteDeck(deck.id, e)}
                                                className="p-2 text-red-600 hover:text-[var(--bg)] hover:bg-red-600 border-2 border-red-600 shadow-[2px_2px_0px_var(--ink)] hover:shadow-none transition-all active:translate-x-[2px] active:translate-y-[2px]"
                                                title="Purge Deck"
                                            >
                                                <Trash2 size={16} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-auto space-y-6">
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-[11px] font-black font-mono uppercase tracking-[0.2em] text-[var(--muted)]">
                                                <span className="bg-[var(--bg)] px-2 -ml-2 border border-[var(--ink)]/10">STABILITY INDEX</span>
                                                <span className="text-[var(--accent)] font-bold">
                                                    {deck.total_cards > 0 
                                                        ? Math.round((deck.cards_know_it / deck.total_cards) * 100) 
                                                        : 0}%
                                                </span>
                                            </div>
                                            <div className="h-4 w-full bg-[var(--bg)] border-2 border-[var(--ink)] p-0.5 shadow-inner">
                                                <div className="h-full flex gap-0.5">
                                                    <div 
                                                        className="h-full bg-[var(--accent)] transition-all duration-1000 border-r border-[var(--ink)]/20" 
                                                        style={{ width: `${(deck.cards_know_it / (deck.total_cards || 1)) * 100}%` }}
                                                    />
                                                    <div 
                                                        className="h-full bg-orange-400 opacity-60 transition-all duration-1000 border-r border-[var(--ink)]/20" 
                                                        style={{ width: `${(deck.cards_still_learning / (deck.total_cards || 1)) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t-2 border-[var(--ink)] border-dashed">
                                            <div className="flex items-center gap-5 text-[10px] font-black font-mono text-[var(--muted)] uppercase tracking-wider">
                                                <span className="flex items-center gap-2">
                                                    <BookOpen size={14} strokeWidth={3} className="text-[var(--accent)]" />
                                                    {deck.total_cards} UNITS
                                                </span>
                                                {deck.last_studied_at && (
                                                    <span className="flex items-center gap-2 opacity-60">
                                                        <Clock size={14} strokeWidth={2.5} />
                                                        {new Date(deck.last_studied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center">
                                                <Play size={16} fill="currentColor" className="text-[var(--accent)] group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 px-8 text-center space-y-10 paper-card bg-[var(--surface)] border-4 border-[var(--ink)] border-dashed shadow-hard max-w-2xl mx-auto rotate-1">
                        <div className="w-32 h-32 bg-[var(--bg)] border-4 border-[var(--ink)] shadow-hard flex items-center justify-center text-[var(--ink)] rotate-3">
                            <Layers size={64} strokeWidth={1.5} />
                        </div>
                        <div className="space-y-4 max-w-sm">
                            <h2 className="text-4xl font-display font-bold text-[var(--text)] leading-tight">Your Archive is Barren</h2>
                            <p className="text-[var(--muted)] font-mono text-xs uppercase tracking-widest italic font-bold">The conceptual vault awaits its first entry. Silence is the enemy of mastery.</p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-6 pt-6">
                            <button 
                                onClick={() => router.push('/practice/flashcards/new')}
                                className="flex items-center gap-3 px-8 py-4 bg-[var(--text)] text-[var(--bg)] border-4 border-[var(--ink)] shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_var(--ink)] active:translate-x-[4px] active:translate-y-[4px] transition-all font-display font-bold text-lg"
                            >
                                <Plus size={24} />
                                Manual Craft
                            </button>
                            <button 
                                onClick={() => router.push('/practice')}
                                className="flex items-center gap-3 px-8 py-4 bg-[var(--accent)] text-[var(--bg)] border-4 border-[var(--ink)] shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_var(--ink)] active:translate-x-[4px] active:translate-y-[4px] transition-all font-display font-bold text-lg"
                            >
                                <Sparkles size={24} />
                                AI Synthesis
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
