import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useSparks } from '@/hooks/useSparks';
import { Sparkles, ArrowRight, BookOpen, Trash2, AlertTriangle, Zap } from 'lucide-react';
import Link from 'next/link';

export default function LearnIndex() {
    const router = useRouter();
    const [inputValue, setInputValue] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [curricula, setCurricula] = useState<any[]>([]);
    const [loadingCurricula, setLoadingCurricula] = useState(true);

    const { balance, loading: sparksLoading } = useSparks();

    useEffect(() => {
        fetchCurricula();
    }, []);

    useEffect(() => {
        if (router.query.q) {
            setInputValue(router.query.q as string);
        }
    }, [router.query.q]);

    const fetchCurricula = async () => {
        setLoadingCurricula(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase
            .from('curricula')
            .select('*')
            .order('last_activity_at', { ascending: false });

        if (!error && data) {
            setCurricula(data);
        }
        setLoadingCurricula(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this curriculum?')) return;

        await supabase.from('curricula').delete().eq('id', id);
        setCurricula(prev => prev.filter(c => c.id !== id));
    };

    function guessInputType(text: string) {
        const lower = text.toLowerCase();
        if (lower.includes('?') || lower.startsWith('how') || lower.startsWith('why')) return 'question';
        if (lower.startsWith('i want to') || lower.includes('understand how') || lower.includes('learn how')) return 'goal';
        if (text.trim().split(' ').length <= 3) return 'concept';
        return 'topic';
    }

    const handleBuildCurriculum = async () => {
        if (!inputValue.trim()) return;

        setErrorMsg('');
        setIsGenerating(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const inputType = guessInputType(inputValue);

            const res = await fetch('/api/serify/generate-curriculum', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ userInput: inputValue, inputType })
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.error === 'out_of_sparks') {
                    throw new Error("You do not have enough Sparks to generate a curriculum.");
                }
                throw new Error(data.error || "Failed to build curriculum.");
            }

            if (data.curriculumId) {
                router.push(`/learn/curriculum/${data.curriculumId}`);
            } else {
                throw new Error("Invalid response from server.");
            }
        } catch (error: any) {
            console.error(error);
            setErrorMsg(error.message || "Failed to build curriculum. Please try again.");
            setIsGenerating(false);
        }
    };

    const renderCurriculumCard = (curriculum: any) => {
        const isCompleted = curriculum.status === 'completed';
        const isAbandoned = curriculum.status === 'abandoned';

        const conceptsCompleted = curriculum.completed_concept_ids?.length || 0;
        const totalConcepts = curriculum.concept_count || 1;
        const progressPercent = Math.min(100, Math.round((conceptsCompleted / totalConcepts) * 100));

        const lastActivityFormatted = new Date(curriculum.last_activity_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return (
            <div key={curriculum.id} className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden flex flex-col ${isAbandoned ? 'opacity-75 relative bg-black/5' : 'shadow-sm'}`}>
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-display text-xl text-[var(--text)] line-clamp-1 pr-4">{curriculum.title}</h3>
                    <div className="flex items-center text-xs font-bold uppercase tracking-widest text-[var(--muted)] shrink-0">
                        {isCompleted && <span className="text-emerald-500 flex items-center gap-1">Complete <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span></span>}
                        {isAbandoned && <span>Abandoned</span>}
                        {!isCompleted && !isAbandoned && <span>In Progress</span>}
                    </div>
                </div>

                <div className="text-[var(--muted)] text-sm mb-5">
                    {conceptsCompleted} of {totalConcepts} concepts · Last studied {lastActivityFormatted}
                </div>

                {!isCompleted && (
                    <div className="w-full h-1.5 bg-[var(--border)] rounded-full mb-6 overflow-hidden">
                        <div
                            className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                )}

                <div className="mt-auto flex items-center gap-3">
                    <Link
                        href={`/learn/curriculum/${curriculum.id}`}
                        className={`px-4 py-2 rounded-xl text-sm font-medium flex-1 text-center transition-colors ${isCompleted
                            ? 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:text-[var(--accent)] hover:border-[var(--accent)]'
                            : 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90'
                            }`}
                    >
                        {isCompleted ? 'Review \u2192' : 'Resume \u2192'}
                    </Link>

                    {isAbandoned && (
                        <button
                            onClick={() => handleDelete(curriculum.id)}
                            className="p-2 text-[var(--muted)] hover:text-[var(--warn)] rounded-xl border border-transparent hover:border-[var(--warn)]/20 hover:bg-[var(--warn)]/10 transition-colors"
                            title="Delete curriculum"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout>
            <Head>
                <title>Learn Mode | Serify</title>
            </Head>

            <div className="p-6 md:p-10 max-w-5xl mx-auto min-h-[calc(100vh-64px)]">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display text-[var(--text)]">Learn Mode</h1>
                        <p className="text-[var(--muted)] text-sm">Build a curriculum from scratch and master it in Flow Mode.</p>
                    </div>
                </div>

                <section className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 mb-12 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                    {isGenerating ? (
                        <div className="py-12 flex flex-col items-center justify-center animate-fade-in relative z-10">
                            <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin mb-4"></div>
                            <h2 className="text-xl font-display text-[var(--text)] mb-2">✦ Building your curriculum...</h2>
                            <p className="text-[var(--muted)] text-center max-w-sm">Figuring out what you need to know and in what order to learn it.</p>
                        </div>
                    ) : (
                        <div className="relative z-10">
                            <label className="block text-[10px] uppercase font-bold text-[var(--accent)] tracking-widest mb-3">
                                What do you want to learn?
                            </label>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleBuildCurriculum()}
                                    type="text"
                                    placeholder="Type a concept, topic, goal, or question..."
                                    className="flex-1 h-14 px-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors text-base"
                                />
                                <button
                                    onClick={handleBuildCurriculum}
                                    disabled={sparksLoading || !balance || balance.total_sparks < 2 || !inputValue.trim()}
                                    className={`h-14 px-6 rounded-xl font-medium transition-colors flex items-center justify-center whitespace-nowrap ${inputValue.trim() ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-md shadow-[var(--accent)]/20 hover:-translate-y-0.5' : 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed'}`}
                                >
                                    Build Curriculum <ArrowRight size={18} className="ml-2" />
                                </button>
                            </div>

                            {errorMsg && (
                                <div className="mt-4 bg-[var(--warn-light)] border border-[var(--warn)]/30 text-[var(--warn)] px-4 py-3 rounded-xl text-sm font-medium flex items-center shadow-sm">
                                    <AlertTriangle size={16} className="mr-2 shrink-0" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {!errorMsg && balance && balance.total_sparks < 2 && (
                                <div className="mt-4 text-sm text-[var(--warn)] flex items-center">
                                    <Zap size={14} className="mr-1" />
                                    You need 2 Sparks to build a curriculum. You have {balance.total_sparks}.
                                </div>
                            )}

                            {/* Gap Suggestions - simplified version for now, could be dynamic */}
                            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                                <span className="mr-2">Or try:</span>
                                {['Machine learning fundamentals', 'How transformers work', 'Calculus from the beginning'].map(sug => (
                                    <button
                                        key={sug}
                                        onClick={() => setInputValue(sug)}
                                        className="px-3 py-1.5 rounded-full bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text)] transition-colors text-xs"
                                    >
                                        {sug}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* Your Curricula Section */}
                <div>
                    <h2 className="text-xl font-display text-[var(--text)] mb-6 flex items-center">
                        <BookOpen size={20} className="mr-2 text-[var(--muted)]" />
                        Your Curricula
                    </h2>

                    {loadingCurricula ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-48 bg-[var(--surface)] border border-[var(--border)] rounded-2xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : curricula.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {curricula.map(renderCurriculumCard)}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-[var(--surface)] border border-[var(--border)] border-dashed rounded-3xl">
                            <BookOpen size={32} className="mx-auto text-[var(--muted)]/50 mb-3" />
                            <h3 className="text-[var(--text)] font-medium mb-1">No curricula yet</h3>
                            <p className="text-[var(--muted)] text-sm">Build your first curriculum above to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
