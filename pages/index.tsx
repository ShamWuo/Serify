import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

// Layout & SEO
import DashboardLayout from '@/components/Layout/DashboardLayout';
import SEO from '@/components/Layout/SEO';

// Components
import SmartInputCard from '@/components/dashboard/SmartInputCard';
import RecentSessions, { SessionRow } from '@/components/dashboard/RecentSessions';
import NeedsAttention from '@/components/dashboard/NeedsAttention';
import QuickLaunch from '@/components/dashboard/QuickLaunch';
import ActivityDots from '@/components/dashboard/ActivityDots';
import DashboardV2 from '@/components/dashboard/DashboardV2';

// Types
import { KnowledgeNode } from '@/types/serify';
import LandingPage from '@/components/LandingPage';
import { Brain, Sparkles, Zap } from 'lucide-react';
import { useUsage } from '@/hooks/useUsage';
import { useFeatureFlags } from '@/contexts/FeatureFlagContext';

export default function Home() {
    const { user, loading, token } = useAuth();
    const router = useRouter();
    const isDemo = router.query.demo === 'true';
    const { usage } = useUsage('ai_message_tier1');
    const { isEnabled } = useFeatureFlags();

    const [latestSessions, setLatestSessions] = useState<SessionRow[]>([]);
    const [focusConcepts, setFocusConcepts] = useState<any[]>([]);
    const [vaultCount, setVaultCount] = useState<number>(0);
    const [activityDays, setActivityDays] = useState<boolean[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        // 1. Fetch Latest Sessions
        const fetchDashboardData = async () => {
            setDataLoading(true);
            try {
                const [sessionsRes, attentionRes, vaultRes, activityRes] = await Promise.all([
                    supabase.from('reflection_sessions')
                        .select('id, title, content_type, created_at, depth_score')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(5),
                    supabase.from('knowledge_nodes')
                        .select('id, display_name, current_mastery, definition')
                        .eq('user_id', user.id)
                        .in('current_mastery', ['shaky', 'revisit'])
                        .limit(3),
                    supabase.from('knowledge_nodes')
                        .select('count', { count: 'exact', head: true })
                        .eq('user_id', user.id),
                    supabase.from('reflection_sessions')
                        .select('created_at')
                        .eq('user_id', user.id)
                        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                ]);

                // Map Sessions to SessionRow
                if (sessionsRes.data) {
                    const mapped: SessionRow[] = sessionsRes.data.map(s => ({
                        id: s.id,
                        title: s.title || 'Untitled Session',
                        type: s.content_type || 'text',
                        date: formatDistanceToNow(new Date(s.created_at), { addSuffix: true }),
                        mastery: {
                            solid: s.depth_score > 80 ? 70 : 40,
                            developing: 20,
                            shaky: s.depth_score < 60 ? 30 : 5,
                            revisit: s.depth_score < 40 ? 10 : 5
                        },
                        gaps: s.depth_score < 70 ? 2 : 0,
                        materials: ['flashcards', 'quiz'] // Placeholder
                    }));
                    setLatestSessions(mapped);
                }


                setFocusConcepts((attentionRes.data || []).map(c => ({
                    id: c.id,
                    name: c.display_name,
                    status: c.current_mastery as 'shaky' | 'revisit',
                    sessionsCount: 1 // Placeholder
                })));
                setVaultCount(vaultRes.count || 0);
                
                // Map Activity
                const today = new Date();
                const days = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(today);
                    d.setDate(today.getDate() - (6 - i));
                    const dStr = d.toISOString().split('T')[0];
                    return (activityRes.data || []).some(s => s.created_at.startsWith(dStr));
                });
                setActivityDays(days);
            } finally {
                setDataLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    const handleAnalyze = async (data: any) => {
        setIsProcessing(true);
        try {
            const res = await fetch('/api/serify/extract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...(isDemo ? { 'x-serify-demo': 'true' } : {})
                },
                body: JSON.stringify({
                    content: data.type === 'text' ? data.content : undefined,
                    url: data.type !== 'text' ? data.content : undefined,
                    contentType: data.type,
                    mode: data.mode
                })
            });
            
            if (res.ok) {
                const { sessionId } = await res.json();
                router.push(`/session/${sessionId}`);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading || (!!user && dataLoading)) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Brain className="animate-pulse text-[var(--accent)]" size={48} />
                    <p className="text-sm font-bold tracking-widest text-[var(--muted)] uppercase">Loading Serify...</p>
                </div>
            </div>
        );
    }

    if (!user && !isDemo) return <LandingPage />;


    return (
        <DashboardLayout>
            <SEO title="Dashboard" description="Your personal learning command center." />
            
            {isEnabled('new_dashboard_v2') ? (
                <DashboardV2 
                    user={user}
                    latestSessions={latestSessions}
                    focusConcepts={focusConcepts}
                    activityDays={activityDays}
                    vaultCount={vaultCount}
                    handleAnalyze={handleAnalyze}
                    isDemo={isDemo}
                />
            ) : (
                <div className="max-w-[1240px] mx-auto px-6 pt-8 pb-12 md:pt-12 md:pb-20 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 xl:gap-12">
                        {/* Main Column */}
                        <div className="space-y-12">
                            {/* Smart Input Section */}
                            <section className="animate-slide-up">
                                <SmartInputCard 
                                    onAnalyze={handleAnalyze} 
                                    tokenBalance={isDemo ? 1000 : ((user?.monthlyLimit || 0) - (user?.tokensUsed || 0))} 
                                />
                                {latestSessions.length === 0 && (
                                    <p className="mt-4 text-center text-xs text-[var(--muted)] italic animate-fade-in" style={{ animationDelay: '500ms' }}>
                                        Start with something you recently watched, read, or studied.
                                    </p>
                                )}
                            </section>

                            {/* Recent Activity Section */}
                            <section className="animate-slide-up" style={{ animationDelay: '150ms' }}>
                                <RecentSessions sessions={latestSessions} />
                            </section>
                        </div>

                        {/* Sidebar Column */}
                        <div className="space-y-10">
                            {/* Needs Attention / Onboarding Card */}
                            <section className="animate-slide-up" style={{ animationDelay: '200ms' }}>
                                {latestSessions.length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-[var(--border)] p-6 shadow-sm">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted)] mb-4">You&apos;re all set.</h3>
                                        <div className="flex items-center gap-2 mb-4 text-[var(--accent)] bg-emerald-50 py-2 px-3 rounded-lg w-fit">
                                            <Zap size={14} fill="currentColor" />
                                            <span className="text-xs font-bold">{user?.monthlyLimit || 50} tokens ready</span>
                                        </div>
                                        <p className="text-sm text-[var(--muted)] leading-relaxed">
                                            Paste anything you&apos;ve been studying. Your gaps, Concept Vault, and history will appear here after your first session.
                                        </p>
                                    </div>
                                ) : (
                                    <NeedsAttention 
                                        concepts={focusConcepts}
                                    />
                                )}
                            </section>

                            {/* Quick Launch */}
                            <section className="animate-slide-up" style={{ animationDelay: '250ms' }}>
                                <QuickLaunch />
                            </section>

                            {/* Weekly Activity */}
                            <section className="animate-slide-up" style={{ animationDelay: '300ms' }}>
                                <ActivityDots 
                                    days={activityDays} 
                                    sessionsCount={latestSessions.length} 
                                    conceptsCount={vaultCount}
                                />
                            </section>
                            
                            {/* Roadmap Promo */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--bg)] to-[#f8fafc] border border-[var(--border)] shadow-sm group hover:border-[var(--accent)]/30 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-white border border-[var(--border)] flex items-center justify-center text-[var(--accent)] mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                    <Sparkles size={18} />
                                </div>
                                <h4 className="text-[15px] font-bold text-[var(--text)] mb-2">Build a Roadmap</h4>
                                <p className="text-xs text-[var(--muted)] leading-relaxed mb-4">Give the AI your goal and it will generate a structured multi-session curriculum.</p>
                                <button 
                                    onClick={() => router.push('/learn')}
                                    className="w-full py-2.5 bg-white border border-[var(--border)] text-[var(--text)] rounded-xl text-xs font-bold hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all"
                                >
                                    Explore Roadmap
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
