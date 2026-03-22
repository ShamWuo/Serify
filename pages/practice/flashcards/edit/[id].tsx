import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
    Layers, 
    Plus, 
    Trash2, 
    Save, 
    ArrowLeft,
    X,
    Lightbulb,
    Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface EditableCard {
    id?: string;
    front: string;
    back: string;
    tag: string;
}

export default function EditFlashcardDeck() {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();
    
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    const [manualCards, setManualCards] = useState<EditableCard[]>([]);
    const [deletedCardIds, setDeletedCardIds] = useState<string[]>([]);

    useEffect(() => {
        if (!id || !user) return;

        const fetchData = async () => {
            try {
                setIsLoading(true);
                // 1. Fetch Deck
                const { data: deck, error: deckError } = await supabase
                    .from('flashcard_decks')
                    .select('*')
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .single();

                if (deckError || !deck) throw new Error('Deck not found or access denied');

                setTitle(deck.title);
                setDescription(deck.description || '');

                // 2. Fetch Cards
                const { data: cards, error: cardsError } = await supabase
                    .from('flashcards')
                    .select('*')
                    .eq('deck_id', id)
                    .order('created_at', { ascending: true });

                if (cardsError) throw cardsError;

                const formattedCards = cards.map(c => ({
                    id: c.id,
                    front: c.front,
                    back: c.back,
                    tag: c.concept_tag || ''
                }));

                setManualCards(formattedCards.length > 0 ? formattedCards : [{ front: '', back: '', tag: '' }]);
            } catch (err: any) {
                console.error('Error fetching deck:', err);
                toast.error(err.message);
                router.push('/practice/flashcards');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id, user, router]);

    const addManualCard = () => {
        setManualCards([...manualCards, { front: '', back: '', tag: '' }]);
    };

    const removeManualCard = (index: number) => {
        const cardToRemove = manualCards[index];
        if (cardToRemove.id) {
            setDeletedCardIds([...deletedCardIds, cardToRemove.id]);
        }
        setManualCards(manualCards.filter((_, i) => i !== index));
    };

    const updateManualCard = (index: number, field: keyof EditableCard, value: string) => {
        const newCards = [...manualCards];
        (newCards[index] as any)[field] = value;
        setManualCards(newCards);
    };

    const handleSaveDeck = async () => {
        if (!title.trim()) {
            toast.error('Please enter a deck title');
            return;
        }

        const validCards = manualCards.filter(c => c.front.trim() && c.back.trim());
        if (validCards.length === 0) {
            toast.error('Please add at least one card with front and back text');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Update Deck Metadata
            const { error: deckUpdateError } = await supabase
                .from('flashcard_decks')
                .update({
                    title: title.trim(),
                    description: description.trim(),
                    total_cards: validCards.length,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (deckUpdateError) throw deckUpdateError;

            // 2. Delete Cards removed from the list
            if (deletedCardIds.length > 0) {
                const { error: deleteError } = await supabase
                    .from('flashcards')
                    .delete()
                    .in('id', deletedCardIds);
                
                if (deleteError) throw deleteError;
            }

            // 3. Update existing cards
            const existingCards = validCards.filter(c => c.id);
            if (existingCards.length > 0) {
                const { error: updateError } = await supabase
                    .from('flashcards')
                    .upsert(existingCards.map(c => ({
                        id: c.id,
                        deck_id: id as string,
                        user_id: user?.id,
                        front: c.front.trim(),
                        back: c.back.trim(),
                        concept_tag: c.tag.trim() || null,
                        updated_at: new Date().toISOString()
                    })));

                if (updateError) throw updateError;
            }

            // 4. Insert new cards
            const newCards = validCards.filter(c => !c.id);
            if (newCards.length > 0) {
                const { error: insertError } = await supabase
                    .from('flashcards')
                    .insert(newCards.map(c => ({
                        deck_id: id as string,
                        user_id: user?.id,
                        front: c.front.trim(),
                        back: c.back.trim(),
                        concept_tag: c.tag.trim() || null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })));

                if (insertError) throw insertError;
            }

            toast.success('Deck updated successfully!');
            router.push('/practice/flashcards');

        } catch (err: any) {
            console.error('Error saving deck:', err);
            toast.error('Failed to save changes: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="min-h-[70vh] flex items-center justify-center">
                    <Loader2 className="animate-spin text-teal-600" size={40} />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <Head>
                <title>Edit Deck | Serify</title>
            </Head>

            <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-24">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    >
                        <ArrowLeft size={20} />
                        Cancel
                    </button>
                    
                    <button 
                        onClick={handleSaveDeck}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition active:scale-95 disabled:opacity-50 shadow-sm"
                    >
                        {isSubmitting ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Save size={18} />
                        )}
                        Save Changes
                    </button>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-display text-[var(--text)] tracking-tight">Edit Flashcard Set</h1>
                    <p className="text-[var(--muted)]">Update your cards or clear up definitions.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Main Settings */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[var(--text)] uppercase tracking-widest ml-1">Deck Title</label>
                                    <input 
                                        type="text" 
                                        placeholder='e.g., Organic Chemistry'
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-5 py-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-teal-500/50 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[var(--text)] uppercase tracking-widest ml-1">Description (Optional)</label>
                                    <textarea 
                                        placeholder="What is this deck about?"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={2}
                                        className="w-full px-5 py-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-teal-500/50 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-[var(--border)] space-y-6">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-teal-600 font-bold uppercase tracking-wider text-sm">
                                        <Layers size={18} />
                                        <span>Cards List</span>
                                    </div>
                                    <span className="text-xs font-bold text-[var(--muted)]">
                                        {manualCards.length} cards total
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {manualCards.map((card, index) => (
                                        <div key={index} className="group relative bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-4 md:p-6 space-y-4 hover:border-[var(--muted)] transition-colors">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Card {index + 1}</span>
                                                <button 
                                                    onClick={() => removeManualCard(index)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest ml-1">Front</label>
                                                    <textarea 
                                                        placeholder="Question or Term"
                                                        value={card.front}
                                                        rows={2}
                                                        onChange={(e) => updateManualCard(index, 'front', e.target.value)}
                                                        className="w-full bg-transparent border-b border-[var(--border)] py-2 outline-none focus:border-teal-500 transition-colors resize-none overflow-hidden"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest ml-1">Back</label>
                                                    <textarea 
                                                        placeholder="Answer or Definition"
                                                        value={card.back}
                                                        rows={2}
                                                        onChange={(e) => updateManualCard(index, 'back', e.target.value)}
                                                        className="w-full bg-transparent border-b border-[var(--border)] py-2 outline-none focus:border-teal-500 transition-colors resize-none overflow-hidden"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <button 
                                        onClick={addManualCard}
                                        className="w-full py-4 border-2 border-dashed border-[var(--border)] rounded-2xl text-[var(--muted)] hover:text-teal-600 hover:border-teal-500/50 hover:bg-teal-50/30 transition-all font-bold flex items-center justify-center gap-2"
                                    >
                                        <Plus size={20} />
                                        Add Another Card
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Tips */}
                    <div className="space-y-6">
                        <div className="bg-teal-50 border border-teal-100 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center gap-3 text-teal-700 font-bold">
                                <Lightbulb size={20} />
                                <h3>Editing Tips</h3>
                            </div>
                            <ul className="space-y-3 text-sm text-teal-800/80">
                                <li className="flex gap-2">
                                    <span className="text-teal-500 font-bold">•</span>
                                    Cards with empty front or back will be skipped on save.
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-teal-500 font-bold">•</span>
                                    Use the "concept tag" (internal) to group cards.
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-teal-500 font-bold">•</span>
                                    Removing a card here permanently deletes its individual progress.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
