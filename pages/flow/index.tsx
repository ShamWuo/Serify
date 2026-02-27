import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Zap, Brain, CheckCircle2, Loader2, PlayCircle, ChevronRight } from 'lucide-react';

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
    solid: 'var(--color-mastery-solid, #22c55e)',
};

export default function FlowModePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [concepts, setConcepts] = useState<Concept[]>([]);
    const [loading, setLoading] = useState(true);
    const [launching, setLaunching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedConcepts = concepts.filter(c => c.selected);

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
            .in('current_mastery', ['revisit', 'shaky', 'developing'])
            .order('current_mastery', { ascending: true });

        if (dbError) { setError('Failed to load concepts.'); setLoading(false); return; }
        const sorted = (data || []).sort((a: Concept, b: Concept) => (MASTERY_ORDER[a.current_mastery] ?? 9) - (MASTERY_ORDER[b.current_mastery] ?? 9));
        setConcepts(sorted);
        setLoading(false);
    }, [user, authLoading]);

    useEffect(() => { fetchConcepts(); }, [fetchConcepts]);

    const toggleConcept = (id: string) => {
        setConcepts(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
    };

    const launchSession = async () => {
        if (selectedConcepts.length === 0) return;
        setLaunching(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/flow/plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token ?? ''}`,
                },
                body: JSON.stringify({
                    targetConcepts: selectedConcepts.map(c => ({
                        id: c.id,
                        name: c.display_name,
                        currentMastery: c.current_mastery,
                        definition: c.definition,
                    })),
                    sourceType: 'standalone',
                }),
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
                    {}
                    <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 10,
                            background: 'linear-gradient(135deg, #7c3aed22, #4f46e522)',
                            border: '1px solid #7c3aed55',
                            borderRadius: 12, padding: '8px 18px', marginBottom: 16
                        }}>
                            <Zap size={18} style={{ color: '#a78bfa' }} />
                            <span style={{ color: '#a78bfa', fontWeight: 600, fontSize: 14 }}>Flow Mode</span>
                        </div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 8px' }}>
                            What do you want to master today?
                        </h1>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                            Select the concepts you want to work through. Serify will coach you step-by-step.
                        </p>
                    </div>

                    {error && (
                        <div style={{ background: '#ef444420', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14 }}>
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
                        </div>
                    ) : concepts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                            <Brain size={40} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
                            <p>All your concepts are looking solid! Start a new session to get more concepts to practice.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {concepts.map(c => {
                                const color = MASTERY_COLORS[c.current_mastery] || 'var(--text-muted)';
                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => toggleConcept(c.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 14,
                                            background: c.selected ? 'var(--accent)15' : 'var(--surface)',
                                            border: `1.5px solid ${c.selected ? 'var(--accent)' : 'var(--border)'}`,
                                            borderRadius: 12, padding: '14px 18px',
                                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        <div style={{
                                            width: 18, height: 18, borderRadius: '50%',
                                            border: `2px solid ${c.selected ? 'var(--accent)' : 'var(--border)'}`,
                                            background: c.selected ? 'var(--accent)' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, transition: 'all 0.15s'
                                        }}>
                                            {c.selected && <CheckCircle2 size={12} color="white" />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 15 }}>{c.display_name}</div>
                                            {c.definition && (
                                                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 480 }}>
                                                    {c.definition}
                                                </div>
                                            )}
                                        </div>
                                        <span style={{
                                            fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase',
                                            letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 6,
                                            background: `${color}20`, flexShrink: 0
                                        }}>
                                            {c.current_mastery}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {}
                    {selectedConcepts.length > 0 && (
                        <div style={{
                            position: 'sticky', bottom: 24, marginTop: 24,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
                        }}>
                            <button
                                onClick={launchSession}
                                disabled={launching}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                                    color: 'white', border: 'none', borderRadius: 14,
                                    padding: '14px 28px', fontSize: 16, fontWeight: 700,
                                    cursor: launching ? 'not-allowed' : 'pointer',
                                    opacity: launching ? 0.8 : 1,
                                    boxShadow: '0 4px 24px #7c3aed55',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {launching ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <PlayCircle size={20} />}
                                {launching ? 'Building your plan…' : `Start Flow — ${selectedConcepts.length} concept${selectedConcepts.length > 1 ? 's' : ''}`}
                                {!launching && <ChevronRight size={18} />}
                            </button>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Zap size={10} fill="currentColor" className="text-amber-500" />
                                Costs 2 Sparks to start
                            </span>
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </>
    );
}
