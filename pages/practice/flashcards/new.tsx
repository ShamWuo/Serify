import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
    Layers, 
    Plus, 
    Trash2, 
    Sparkles, 
    Type, 
    Save, 
    ArrowLeft,
    X,
    Lightbulb
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { toast } from 'react-hot-toast';

interface ManualCard {
    front: string;
    back: string;
    tag: string;
}

export default function NewFlashcardDeck() {
    const router = useRouter();
    const [mode, setMode] = useState<'ai' | 'manual'>('ai');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [topic, setTopic] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [manualCards, setManualCards] = useState<ManualCard[]>([
        { front: '', back: '', tag: '' },
        { front: '', back: '', tag: '' },
        { front: '', back: '', tag: '' }
    ]);

    const addManualCard = () => {
        setManualCards([...manualCards, { front: '', back: '', tag: '' }]);
    };

    const removeManualCard = (index: number) => {
        if (manualCards.length <= 1) return;
        setManualCards(manualCards.filter((_, i) => i !== index));
    };

    const updateManualCard = (index: number, field: keyof ManualCard, value: string) => {
        const newCards = [...manualCards];
        newCards[index][field] = value;
        setManualCards(newCards);
    };

    const handleCreateDeck = async () => {
        if (!title.trim()) {
            toast.error('Please enter a deck title');
            return;
        }

        setIsSubmitting(true);
        try {
            if (mode === 'ai') {
                if (!topic.trim()) {
                    toast.error('Please enter a topic for AI generation');
                    setIsSubmitting(false);
                    return;
                }
                // Redirect to generator with query params
                router.push(`/practice/flashcards?topic=${encodeURIComponent(topic.trim())}&title=${encodeURIComponent(title.trim())}&description=${encodeURIComponent(description.trim())}`);
                return;
            }

            // Manual Mode
            const validCards = manualCards.filter(c => c.front.trim() && c.back.trim());
            if (validCards.length === 0) {
                toast.error('Please add at least one card with front and back text');
                setIsSubmitting(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // 1. Create Deck
            const { data: deck, error: deckError } = await supabase
                .from('flashcard_decks')
                .insert({
                    user_id: user.id,
                    title: title.trim(),
                    description: description.trim(),
                    source_type: 'manual',
                    total_cards: validCards.length
                })
                .select()
                .single();

            if (deckError || !deck) throw deckError;

            // 2. Create Cards
            const cardsToInsert = validCards.map(c => ({
                deck_id: deck.id,
                user_id: user.id,
                front: c.front.trim(),
                back: c.back.trim(),
                concept_tag: c.tag.trim() || null
            }));

            const { error: cardsError } = await supabase
                .from('flashcards')
                .insert(cardsToInsert);

            if (cardsError) throw cardsError;

            toast.success('Deck created successfully!');
            router.push('/practice/flashcards');

        } catch (err: any) {
            console.error('Error creating deck:', err);
            toast.error('Failed to create deck: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <DashboardLayout>
            <Head>
                <title>Create New Deck | Serify</title>
            </Head>

            <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-24">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    >
                        <ArrowLeft size={20} />
                        Back to Library
                    </button>
                    
                    <button 
                        onClick={handleCreateDeck}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition active:scale-95 disabled:opacity-50 shadow-sm"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={18} />
                        )}
                        {mode === 'ai' ? 'Generate Deck' : 'Create Deck'}
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-display text-[var(--text)]">Create New Deck</h1>
                        <p className="text-[var(--muted)]">Choose between AI generation or manual entry.</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex p-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full sm:w-fit">
                        <button 
                            onClick={() => setMode('ai')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${mode === 'ai' ? 'bg-[var(--bg)] text-teal-600 shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                        >
                            <Sparkles size={18} />
                            AI Generate
                        </button>
                        <button 
                            onClick={() => setMode('manual')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${mode === 'manual' ? 'bg-[var(--bg)] text-blue-600 shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                        >
                            <Type size={18} />
                            Manual Entry
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Main Settings */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[var(--text)] uppercase tracking-wider ml-1">Deck Title</label>
                                    <input 
                                        type="text" 
                                        placeholder='e.g., Organic Chemistry: Functional Groups'
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-5 py-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-teal-500/50 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[var(--text)] uppercase tracking-wider ml-1">Description (Optional)</label>
                                    <textarea 
                                        placeholder="What is this deck about?"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={2}
                                        className="w-full px-5 py-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-teal-500/50 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            {mode === 'ai' && (
                                <div className="pt-6 border-t border-[var(--border)] space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 text-teal-600 font-bold mb-2">
                                        <Sparkles size={20} />
                                        <span>AI Configuration</span>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[var(--text)] uppercase tracking-wider ml-1">Learning Topic</label>
                                        <input 
                                            type="text" 
                                            placeholder="Enter a subject, chapter, or specific concept..."
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            className="w-full px-5 py-4 bg-teal-50/30 border border-teal-100 rounded-2xl outline-none focus:border-teal-500 transition-all font-medium"
                                        />
                                        <p className="text-xs text-[var(--muted)] ml-1">Serify AI will generate 10-15 cards based on this topic.</p>
                                    </div>
                                </div>
                            )}

                            {mode === 'manual' && (
                                <div className="pt-6 border-t border-[var(--border)] space-y-6 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-blue-600 font-bold">
                                            <Type size={20} />
                                            <span>Cards List</span>
                                        </div>
                                        <span className="text-xs font-medium text-[var(--muted)]">
                                            {manualCards.filter(c => c.front && c.back).length} completed
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        {manualCards.map((card, index) => (
                                            <div key={index} className="group relative bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-4 md:p-6 space-y-4 hover:border-[var(--muted)] transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest">Card {index + 1}</span>
                                                    <button 
                                                        onClick={() => removeManualCard(index)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest ml-1">Front</label>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Question or Term"
                                                            value={card.front}
                                                            onChange={(e) => updateManualCard(index, 'front', e.target.value)}
                                                            className="w-full bg-transparent border-b border-[var(--border)] py-2 outline-none focus:border-blue-500 transition-colors"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest ml-1">Back</label>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Answer or Definition"
                                                            value={card.back}
                                                            onChange={(e) => updateManualCard(index, 'back', e.target.value)}
                                                            className="w-full bg-transparent border-b border-[var(--border)] py-2 outline-none focus:border-blue-500 transition-colors"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <button 
                                            onClick={addManualCard}
                                            className="w-full py-4 border-2 border-dashed border-[var(--border)] rounded-2xl text-[var(--muted)] hover:text-blue-600 hover:border-blue-500/50 hover:bg-blue-50/30 transition-all font-bold flex items-center justify-center gap-2"
                                        >
                                            <Plus size={20} />
                                            Add Another Card
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Tips */}
                    <div className="space-y-6">
                        <div className="bg-teal-50 border border-teal-100 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center gap-3 text-teal-700 font-bold">
                                <Lightbulb size={20} />
                                <h3>Pro Tips</h3>
                            </div>
                            <ul className="space-y-3 text-sm text-teal-800/80">
                                <li className="flex gap-2">
                                    <span className="text-teal-500 font-bold">•</span>
                                    Keep cards focused on a single concept for better retention.
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-teal-500 font-bold">•</span>
                                    Use "AI Generate" for complex topics to save time.
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-teal-500 font-bold">•</span>
                                    You can always edit your deck later to add more cards.
                                </li>
                            </ul>
                        </div>

                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 space-y-4">
                            <h4 className="font-bold text-[var(--text)] uppercase text-xs tracking-wider">Storage Info</h4>
                            <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl space-y-3">
                                <div className="flex justify-between text-xs">
                                    <span className="text-[var(--muted)]">Sync Status</span>
                                    <span className="text-green-500 font-bold">Cloud Ready</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-[var(--muted)]">Availability</span>
                                    <span className="text-[var(--text)] font-semibold">Offline Accessible</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
