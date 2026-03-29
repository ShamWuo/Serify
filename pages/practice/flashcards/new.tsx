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
                
                router.push(`/practice/flashcards?topic=${encodeURIComponent(topic.trim())}&title=${encodeURIComponent(title.trim())}&description=${encodeURIComponent(description.trim())}`);
                return;
            }

            
            const validCards = manualCards.filter(c => c.front.trim() && c.back.trim());
            if (validCards.length === 0) {
                toast.error('Please add at least one card with front and back text');
                setIsSubmitting(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            
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

            <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-12 pb-24">
                {/* Navigation & Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b-4 border-[var(--ink)]">
                    <button 
                        onClick={() => router.back()}
                        className="group flex items-center gap-3 px-6 py-3 bg-[var(--surface)] border-4 border-[var(--ink)] shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_var(--ink)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all font-mono font-bold text-xs uppercase"
                    >
                        <ArrowLeft size={18} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
                        Abort to Library
                    </button>
                    
                    <button 
                        onClick={handleCreateDeck}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-[var(--text)] text-[var(--bg)] border-4 border-[var(--ink)] shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_var(--ink)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all font-display font-bold text-lg disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <div className="w-6 h-6 border-4 border-[var(--bg)]/30 border-t-[var(--bg)] rounded-full animate-spin" />
                        ) : (
                            <Save size={24} strokeWidth={2.5} />
                        )}
                        {mode === 'ai' ? 'SYTHESIZE DECK' : 'EXECUTE CREATION'}
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-display text-[var(--text)]">Create New Deck</h1>
                        <p className="text-[var(--muted)]">Choose between AI generation or manual entry.</p>
                    </div>

                    {}
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Form Area */}
                    <div className="lg:col-span-2 space-y-10">
                        <div className="paper-card bg-[var(--surface)] border-4 border-[var(--ink)] p-8 md:p-10 space-y-10 shadow-hard relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 font-mono text-[8px] opacity-10 uppercase tracking-[0.4em] pointer-events-none">SEC_INPUT_FORM_01</div>
                            
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-[var(--ink)] uppercase tracking-widest italic flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-[var(--accent)]" />
                                        Deck Identity
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder='E.G., ORGANIC CHEMISTRY: FUNCTIONAL GROUPS'
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-6 py-5 bg-[var(--bg)] border-4 border-[var(--ink)] focus:border-[var(--accent)] outline-none transition-all font-display font-bold text-xl placeholder:text-[var(--muted)]/30 shadow-inner translate-x-[-2px] translate-y-[-2px] focus:translate-x-0 focus:translate-y-0"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-[var(--ink)] uppercase tracking-widest italic flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-[var(--accent)]" />
                                        Description / Metadata
                                    </label>
                                    <textarea 
                                        placeholder="What architectural concepts does this deck cover?"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={2}
                                        className="w-full px-6 py-5 bg-[var(--bg)] border-4 border-[var(--ink)] focus:border-[var(--accent)] outline-none transition-all font-mono text-sm resize-none placeholder:text-[var(--muted)]/50"
                                    />
                                </div>
                            </div>

                            {mode === 'ai' && (
                                <div className="pt-10 border-t-4 border-[var(--ink)] border-dotted space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center gap-3 text-[var(--accent)] font-black uppercase tracking-[0.2em] text-xs">
                                        <Sparkles size={20} strokeWidth={3} />
                                        <span>AI Synthesis Configuration</span>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                            SYST_TOPIC_INPUT
                                            <span className="block h-[1px] flex-grow bg-[var(--ink)]/10" />
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="Enter a subject, chapter, or hex-code for knowledge..."
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            className="w-full px-6 py-5 bg-[var(--bg)] border-4 border-[var(--ink)] border-dashed focus:border-solid focus:border-[var(--accent)] outline-none transition-all font-display font-medium text-lg placeholder:italic"
                                        />
                                        <div className="flex items-start gap-3 p-4 bg-[var(--accent)]/5 border-2 border-[var(--accent)]/20">
                                            <Lightbulb size={16} className="text-[var(--accent)] mt-0.5" />
                                            <p className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-tight leading-relaxed">
                                                <span className="font-bold text-[var(--accent)]">Protocol:</span> Serify AI will distill approximately 12-15 units of knowledge from this query. High precision synthesis active.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {mode === 'manual' && (
                                <div className="pt-10 border-t-4 border-[var(--ink)] border-double space-y-10 animate-in fade-in slide-in-from-top-6 duration-500">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-[var(--ink)] font-black uppercase tracking-[0.2em] text-xs">
                                            <Type size={20} strokeWidth={3} />
                                            <span>Manual Card Forge</span>
                                        </div>
                                        <div className="bg-[var(--bg)] border-2 border-[var(--ink)] px-2 py-1 text-[9px] font-black font-mono shadow-[2px_2px_0px_var(--ink)] uppercase">
                                            Units: {manualCards.filter(c => c.front && c.back).length} / {manualCards.length}
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        {manualCards.map((card, index) => (
                                            <div key={index} className="group relative bg-[var(--bg)] border-4 border-[var(--ink)] p-6 space-y-6 hover:shadow-hard hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-300">
                                                <div className="absolute -top-4 -left-4 w-10 h-10 bg-[var(--ink)] text-[var(--bg)] flex items-center justify-center font-display font-bold rotate-[-10deg] shadow-hard z-10">
                                                    #{index + 1}
                                                </div>
                                                
                                                <div className="flex items-center justify-end">
                                                    <button 
                                                        onClick={() => removeManualCard(index)}
                                                        className="p-2 text-red-600 hover:text-[var(--bg)] hover:bg-red-600 border-2 border-[var(--ink)]/10 hover:border-red-600 transition-all"
                                                        title="Eject Unit"
                                                    >
                                                        <Trash2 size={16} strokeWidth={2.5} />
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider ml-1 italic">FRONT FACE [INPUT]</label>
                                                        <textarea 
                                                            placeholder="Conceptual term or inquiry..."
                                                            value={card.front}
                                                            onChange={(e) => updateManualCard(index, 'front', e.target.value)}
                                                            rows={2}
                                                            className="w-full bg-transparent border-b-4 border-[var(--ink)] py-2 outline-none focus:border-[var(--accent)] transition-colors font-display font-bold text-lg resize-none"
                                                        />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider ml-1 italic">BACK FACE [RECALL]</label>
                                                        <textarea 
                                                            placeholder="Definitive answer or realization..."
                                                            value={card.back}
                                                            onChange={(e) => updateManualCard(index, 'back', e.target.value)}
                                                            rows={2}
                                                            className="w-full bg-transparent border-b-4 border-[var(--ink)] py-2 outline-none focus:border-[var(--accent)] transition-colors font-typewriter text-sm resize-none"
                                                        />
                                                    </div>
                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
                                                        <div className="w-10 h-10 border-4 border-[var(--ink)] rounded-full bg-[var(--bg)] flex items-center justify-center rotate-45">
                                                            <div className="w-6 h-[2px] bg-[var(--ink)]" />
                                                            <div className="h-6 w-[2px] bg-[var(--ink)] absolute" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <button 
                                            onClick={addManualCard}
                                            className="w-full py-8 border-4 border-dashed border-[var(--ink)]/30 text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--accent)]/5 transition-all font-display font-black text-xl flex items-center justify-center gap-4 uppercase tracking-widest"
                                        >
                                            <Plus size={32} strokeWidth={3} />
                                            Forge New Unit
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar / Info */}
                    <div className="space-y-10">
                        <div className="paper-card bg-[var(--accent)] text-[var(--bg)] border-4 border-[var(--ink)] shadow-hard p-8 space-y-6 rotate-1">
                            <div className="flex items-center gap-3 font-black uppercase tracking-[0.2em] text-sm">
                                <Lightbulb size={24} strokeWidth={3} />
                                <h3>Protocol Tips</h3>
                            </div>
                            <ul className="space-y-6 text-xs font-mono font-bold uppercase tracking-widest leading-relaxed">
                                <li className="flex gap-4">
                                    <span className="bg-[var(--bg)] text-[var(--ink)] w-6 h-6 shrink-0 flex items-center justify-center border-2 border-[var(--ink)] shadow-[2px_2px_0px_var(--ink)]">01</span>
                                    Cards should target a single atomic realization.
                                </li>
                                <li className="flex gap-4">
                                    <span className="bg-[var(--bg)] text-[var(--ink)] w-6 h-6 shrink-0 flex items-center justify-center border-2 border-[var(--ink)] shadow-[2px_2px_0px_var(--ink)]">02</span>
                                    AI synthesis thrives on specific conceptual queries.
                                </li>
                                <li className="flex gap-4">
                                    <span className="bg-[var(--bg)] text-[var(--ink)] w-6 h-6 shrink-0 flex items-center justify-center border-2 border-[var(--ink)] shadow-[2px_2px_0px_var(--ink)]">03</span>
                                    Revision is the architect of long-term memory.
                                </li>
                            </ul>
                        </div>

                        <div className="paper-card bg-[var(--surface)] border-4 border-[var(--ink)] shadow-hard p-8 space-y-6 -rotate-1">
                            <h4 className="font-black text-[var(--muted)] uppercase text-[10px] tracking-[0.3em] flex items-center gap-3">
                                <div className="w-8 h-[2px] bg-[var(--ink)]/20" />
                                DATA INTEGRITY
                            </h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b-2 border-[var(--ink)]/5">
                                    <span className="text-[10px] font-black font-mono text-[var(--muted)]">CLOUD SYNC</span>
                                    <span className="bg-green-500/10 text-green-600 border border-green-600/30 px-2 py-0.5 text-[8px] font-black tracking-widest uppercase">ACTIVE</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b-2 border-[var(--ink)]/5">
                                    <span className="text-[10px] font-black font-mono text-[var(--muted)]">OFFLINE ENHANCEMENT</span>
                                    <span className="text-[var(--ink)] text-[10px] font-bold">READY</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-[10px] font-black font-mono text-[var(--muted)]">SECURITY LEVEL</span>
                                    <span className="text-[var(--ink)] text-[10px] font-bold">RLS PROTECTED</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
