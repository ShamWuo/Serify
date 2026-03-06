import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Zap, Brain, CheckCircle2, Loader2, PlayCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Concept {
    id: string;
    display_name: string;
    current_mastery: string;
    definition: string | null;
    session_count: number;
    selected?: boolean;
}

const MASTERY_ORDER: Record<string, number> = { revisit: 0, shaky: 1, developing: 2, solid: 3 };
const MASTERY_COLORS: Record<string, string> = {
    revisit: 'var(--color-mastery-revisit, #ef4444)',
    shaky: 'var(--color-mastery-shaky, #f97316)',
    developing: 'var(--color-mastery-developing, #eab308)',
    solid: 'var(--color-mastery-solid, #22c55e)'
};

export default function FlowModePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [concepts, setConcepts] = useState<Concept[]>([]);
    const [loading, setLoading] = useState(true);
    const [launching, setLaunching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedConcepts = concepts.filter((c) => c.selected);

    const fetchConcepts = useCallback(async () => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data, error: dbError } = await supabase
            .from('knowledge_nodes')
            .select('id, display_name, current_mastery, definition, session_count')
            .eq('user_id', user.id)
            .order('current_mastery', { ascending: true });

        if (dbError) {
            setError('Failed to load concepts.');
            setLoading(false);
            return;
        }
        const sorted = (data || []).sort(
            (a: Concept, b: Concept) =>
                (MASTERY_ORDER[a.current_mastery] ?? 9) - (MASTERY_ORDER[b.current_mastery] ?? 9)
        );
        setConcepts(sorted);
        setLoading(false);
    }, [user, authLoading]);

    useEffect(() => {
        fetchConcepts();
    }, [fetchConcepts]);

    const toggleConcept = (id: string) => {
        setConcepts((prev) => prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)));
    };

    const launchSession = async () => {
        if (selectedConcepts.length === 0) return;
        setLaunching(true);
        setError(null);
        try {
            const {
                data: { session }
            } = await supabase.auth.getSession();
            const res = await fetch('/api/flow/plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token ?? ''}`
                },
                body: JSON.stringify({
                    targetConcepts: selectedConcepts.map((c) => ({
                        id: c.id,
                        name: c.display_name,
                        currentMastery: c.current_mastery,
                        definition: c.definition
                    })),
                    sourceType: 'standalone'
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to generate plan');
            router.push(`/flow/${data.sessionId}`);
        } catch (err: any) {
            setError(err.message);
            setLaunching(false);
        }
    };

    return (
        <>
            <Head>
                <title>Flow Mode — Serify</title>
            </Head>
            <DashboardLayout>
                <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
                    { }
                    <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 10,
                                background: 'linear-gradient(135deg, #7c3aed22, #4f46e522)',
                                border: '1px solid #7c3aed55',
                                borderRadius: 12,
                                padding: '8px 18px',
                                marginBottom: 16
                            }}
                        >
                            <Zap size={18} style={{ color: '#a78bfa' }} />
                            <span style={{ color: '#a78bfa', fontWeight: 600, fontSize: 14 }}>
                                Flow Mode
                            </span>
                        </div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 8px' }}>
                            What do you want to master today?
                        </h1>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                            Select the concepts you want to work through. Serify will coach you
                            step-by-step.
                        </p>
                    </div>

                    {error && (
                        <div
                            style={{
                                background: '#ef444420',
                                border: '1px solid #ef4444',
                                color: '#ef4444',
                                borderRadius: 10,
                                padding: '12px 16px',
                                marginBottom: 16,
                                fontSize: 14
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
                            <span className="text-sm text-[var(--muted)] font-medium">Scanning your Vault…</span>
                        </div>
                    ) : concepts.length === 0 ? (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[32px] p-12 text-center glass relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent)]/20 to-transparent" />
                            <div className="w-20 h-20 bg-[var(--accent)]/5 rounded-3xl flex items-center justify-center mb-8 mx-auto border border-[var(--accent)]/10 group-hover:scale-110 transition-transform duration-500">
                                <Brain size={40} className="text-[var(--accent)] opacity-60" />
                            </div>
                            <h3 className="text-2xl font-display font-medium text-[var(--text)] mb-3">Your Struggle Vault is Clear</h3>
                            <p className="text-[var(--muted)] text-base max-w-sm mx-auto mb-10 leading-relaxed">
                                Flow Mode is powered by concepts you&apos;ve encountered in your study sessions. Start a session to build your personal knowledge base.
                            </p>
                            <Link
                                href="/"
                                className="inline-flex items-center gap-3 bg-[var(--accent)] text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-[var(--accent)]/20 hover:scale-105 active:scale-95 hover:bg-[var(--accent)]/90"
                            >
                                <PlayCircle size={20} fill="currentColor" />
                                Start Your First Session
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {concepts.map((c) => {
                                const color = MASTERY_COLORS[c.current_mastery] || 'var(--muted)';
                                const isSelected = c.selected;
                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => toggleConcept(c.id)}
                                        className={`flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all duration-200 text-left group ${isSelected
                                            ? 'bg-[var(--accent)]/5 border-[var(--accent)] shadow-sm'
                                            : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/[0.02]'
                                            }`}
                                    >
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0 ${isSelected
                                            ? 'bg-[var(--accent)] border-[var(--accent)] scale-110'
                                            : 'border-[var(--border)] group-hover:border-[var(--accent)]/50'
                                            }`}>
                                            {isSelected && <CheckCircle2 size={14} className="text-white" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-bold transition-colors ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
                                                {c.display_name}
                                            </div>
                                            {c.definition && (
                                                <div className="text-xs text-[var(--muted)] mt-1 truncate max-w-[400px]">
                                                    {c.definition}
                                                </div>
                                            )}
                                        </div>
                                        <span
                                            className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg shrink-0 border border-current"
                                            style={{ color, backgroundColor: `${color}15` }}
                                        >
                                            {c.current_mastery}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    { }
                    {selectedConcepts.length > 0 && (
                        <div className="sticky bottom-8 mt-12 flex flex-col items-center gap-4 z-20">
                            <button
                                onClick={launchSession}
                                disabled={launching}
                                className={`flex items-center gap-3 px-10 py-5 rounded-[20px] text-lg font-bold text-white transition-all shadow-2xl ${launching
                                    ? 'bg-[var(--accent)] opacity-80 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-[var(--accent)] to-[#4f46e5] hover:scale-105 active:scale-95 shadow-[var(--accent)]/30'
                                    }`}
                            >
                                {launching ? (
                                    <Loader2 size={24} className="animate-spin" />
                                ) : (
                                    <PlayCircle size={24} fill="currentColor" />
                                )}
                                {launching
                                    ? 'Building your path…'
                                    : `Master ${selectedConcepts.length} Concept${selectedConcepts.length > 1 ? 's' : ''}`}
                                {!launching && <ChevronRight size={22} className="ml-2" />}
                            </button>

                            <div className="flex items-center gap-2 bg-[var(--surface)]/80 backdrop-blur-sm border border-[var(--border)] px-4 py-2 rounded-full text-xs font-semibold text-[var(--muted)] shadow-sm">
                                <Zap size={12} fill="currentColor" className="text-amber-500" />
                                Costs 2 Sparks to start
                            </div>
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </>
    );
}
