import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    Zap,
    ArrowLeft,
    ChevronRight,
    CheckCircle2,
    RotateCcw,
    XCircle,
    Brain,
    Trophy
} from 'lucide-react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { KnowledgeNode, MasteryState } from '@/types/serify';

export default function VaultDrillPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [sessionStats, setSessionStats] = useState({ mastered: 0, shaky: 0 });
    const [completed, setCompleted] = useState(false);

    const fetchNodes = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) return;

            const res = await fetch('/api/vault/nodes?tab=all&sort=mastery', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const d = await res.json();
                // Shuffle for variety
                const shuffled = (d.nodes || []).sort(() => Math.random() - 0.5);
                setNodes(shuffled);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) fetchNodes();
    }, [fetchNodes, user]);

    const handleFlip = () => setIsFlipped(!isFlipped);

    const handleNext = (outcome: 'mastered' | 'shaky') => {
        if (outcome === 'mastered') {
            setSessionStats(prev => ({ ...prev, mastered: prev.mastered + 1 }));
        } else {
            setSessionStats(prev => ({ ...prev, shaky: prev.shaky + 1 }));
        }

        if (currentIndex < nodes.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsFlipped(false);
        } else {
            setCompleted(true);
        }
    };

    const handleRestart = () => {
        setNodes(prev => [...prev].sort(() => Math.random() - 0.5));
        setCurrentIndex(0);
        setIsFlipped(false);
        setSessionStats({ mastered: 0, shaky: 0 });
        setCompleted(false);
    };

    const currentNode = nodes[currentIndex];

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[70vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]" />
                    <p className="mt-4 text-[var(--muted)]">Loading your Vault...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (nodes.length === 0) {
        return (
            <DashboardLayout>
                <div className="max-w-2xl mx-auto px-6 py-20 text-center">
                    <div className="w-20 h-20 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Brain size={40} className="text-[var(--muted)]" />
                    </div>
                    <h1 className="text-3xl font-display mb-4">Vault is Empty</h1>
                    <p className="text-[var(--muted)] mb-8">You need to master some concepts before you can drill them.</p>
                    <Link href="/vault" className="px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-medium shadow-lg hover:opacity-90 transition-all">
                        Back to Vault
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    if (completed) {
        return (
            <DashboardLayout>
                <div className="max-w-xl mx-auto px-6 py-16 text-center animate-fade-in">
                    <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner ring-4 ring-amber-50">
                        <Trophy size={48} />
                    </div>
                    <h1 className="text-4xl font-display mb-2">Drill Complete!</h1>
                    <p className="text-[var(--muted)] mb-10">Great job reviewing your concepts.</p>

                    <div className="grid grid-cols-2 gap-4 mb-10">
                        <div className="bg-[#2A5C45]/5 border border-[#2A5C45]/10 p-6 rounded-2xl">
                            <span className="text-3xl font-bold text-[#2A5C45]">{sessionStats.mastered}</span>
                            <p className="text-xs text-[#2A5C45]/70 font-bold uppercase tracking-widest mt-1">Mastered</p>
                        </div>
                        <div className="bg-[#C4541A]/5 border border-[#C4541A]/10 p-6 rounded-2xl">
                            <span className="text-3xl font-bold text-[#C4541A]">{sessionStats.shaky}</span>
                            <p className="text-xs text-[#C4541A]/70 font-bold uppercase tracking-widest mt-1">Needs Review</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={handleRestart}
                            className="flex-1 py-4 bg-[var(--accent)] text-white font-bold rounded-2xl shadow-xl shadow-[var(--accent)]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={20} />
                            Drill Again
                        </button>
                        <Link
                            href="/vault"
                            className="flex-1 py-4 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-bold rounded-2xl hover:bg-[var(--bg)] transition-all flex items-center justify-center"
                        >
                            Return to Vault
                        </Link>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <Head>
                <title>Vault Drill | Serify AI</title>
            </Head>

            <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                    <Link href="/vault" className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors text-sm font-medium">
                        <ArrowLeft size={16} />
                        Back Tracking
                    </Link>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
                            Card {currentIndex + 1} of {nodes.length}
                        </span>
                        <div className="w-32 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[var(--accent)] transition-all duration-300"
                                style={{ width: `${((currentIndex + 1) / nodes.length) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div
                    className="flex-1 relative perspective-1000 mb-8 cursor-pointer group"
                    onClick={handleFlip}
                >
                    <div className={`relative w-full h-[450px] transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                        {/* Front of Card */}
                        <div className="absolute inset-0 backface-hidden bg-[var(--surface)] border-2 border-[var(--border)] rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center p-12 group-hover:border-[var(--accent)]/50 transition-colors glass">
                            <div className="p-3 bg-[var(--accent)]/5 rounded-2xl text-[var(--accent)] mb-6">
                                <Brain size={32} />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-display text-center text-[var(--text)]">
                                {currentNode.display_name || currentNode.canonical_name}
                            </h2>
                            <p className="mt-8 text-[var(--muted)] text-sm font-medium animate-pulse">
                                Click to flip
                            </p>
                        </div>

                        {/* Back of Card */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[var(--surface)] border-2 border-[var(--accent)]/30 rounded-[2.5rem] shadow-2xl flex flex-col p-10 glass overflow-y-auto">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full uppercase">
                                    Explanation
                                </span>
                            </div>
                            <div className="prose prose-invert max-w-none">
                                <p className="text-lg leading-relaxed text-[var(--text)]">
                                    {currentNode.definition || 'No definition available for this concept yet.'}
                                </p>
                                {currentNode.synthesis && (
                                    <div className="mt-6 pt-6 border-t border-[var(--border)]">
                                        <p className="text-xs font-bold text-[var(--muted)] uppercase mb-2 tracking-widest">Synthesis</p>
                                        <p className="text-sm italic text-[var(--muted)]">
                                            "{(currentNode.synthesis as any).summary}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`flex gap-4 transition-all duration-300 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleNext('shaky'); }}
                        className="flex-1 py-4 bg-[var(--surface)] border-2 border-[#C4541A]/20 hover:border-[#C4541A] text-[#C4541A] font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                        <XCircle size={20} />
                        Still Shaky
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleNext('mastered'); }}
                        className="flex-1 py-4 bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/20 text-white font-bold rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 size={20} />
                        Got It!
                    </button>
                </div>

                {!isFlipped && (
                    <div className="text-center text-[var(--muted)] text-xs font-medium py-4">
                        Press <span className="px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded mx-1">Space</span> to flip the card
                    </div>
                )}
            </div>

            <style jsx>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .transform-style-3d {
                    transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                }
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
            `}</style>
        </DashboardLayout>
    );
}
