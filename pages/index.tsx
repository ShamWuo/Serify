import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { normalizeTitle } from '@/lib/formatters';

import DashboardLayout from '@/components/Layout/DashboardLayout';
import SEO from '@/components/Layout/SEO';

import SmartInputCard from '@/components/dashboard/SmartInputCard';
import RecentSessions, { SessionRow } from '@/components/dashboard/RecentSessions';

import QuickLaunch from '@/components/dashboard/QuickLaunch';
import ActivityDots from '@/components/dashboard/ActivityDots';
import DashboardV2 from '@/components/dashboard/DashboardV2';
import ClarificationDialog from '@/components/dashboard/ClarificationDialog';

import LandingPage from '@/components/LandingPage';
import { Zap, BookOpen, Brain, Sparkles, AlertCircle } from 'lucide-react';
import { useUsage } from '@/hooks/useUsage';
import { useFeatureFlags } from '@/contexts/FeatureFlagContext';

export default function Home() {
    const { user, loading, token } = useAuth();
    const router = useRouter();
    const isDemo = router.query.demo === 'true';
    const { usage } = useUsage('ai_message_tier1');
    const { isEnabled } = useFeatureFlags();

    const [latestSessions, setLatestSessions] = useState<SessionRow[]>([]);
    const [vaultCount, setVaultCount] = useState<number>(0);
    const [activityDays, setActivityDays] = useState<boolean[]>([]);
    const [streak, setStreak] = useState(0);
    const [trend, setTrend] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    const [showSlowLoadingNotice, setShowSlowLoadingNotice] = useState(false);
    
    // Clarification states
    const [clarificationData, setClarificationData] = useState<{
        isOpen: boolean;
        question: string;
        options: string[];
        originalData?: any;
    }>({ isOpen: false, question: '', options: [] });
    const [isPreAnalyzing, setIsPreAnalyzing] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsProcessing(false);
        setIsPreAnalyzing(false);
    };

    useEffect(() => {
        if (!user) return;

        
        const fetchDashboardData = async () => {
            setDataLoading(true);
            const timer = setTimeout(() => setShowSlowLoadingNotice(true), 6000);

            try {
                const today = new Date();
                const currentDay = today.getDay() === 0 ? 7 : today.getDay(); // 1-7 (Mon-Sun)
                const monday = new Date(today);
                monday.setDate(today.getDate() - (currentDay - 1));
                monday.setHours(0, 0, 0, 0);

                // Fetch real sessions and vault stats
                const [sessionsRes, flowHistoryRes, activityRes, flowActivityRes, vaultRes]: any = await Promise.all([
                    supabase.from('reflection_sessions')
                        .select('id, title, content_type, created_at, depth_score, status')
                        .eq('user_id', user.id)
                        .not('status', 'in', '("failed","error")')
                        .not('title', 'ilike', '%no concepts%')
                        .not('title', 'ilike', '%untitled%')
                        .order('created_at', { ascending: false })
                        .limit(5),
                    
                    supabase.from('flow_sessions')
                        .select(`
                            id, 
                            created_at, 
                            status, 
                            concepts_completed, 
                            source_type, 
                            reflection_session_id, 
                            curriculum_id,
                            initial_plan,
                            reflection_session:reflection_session_id (title),
                            curriculum:curriculum_id (title)
                        `)
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(5),

                    supabase.from('reflection_sessions')
                        .select('created_at')
                        .eq('user_id', user.id)
                        .gte('created_at', monday.toISOString()),
                    
                    supabase.from('flow_sessions')
                        .select('created_at')
                        .eq('user_id', user.id)
                        .gte('created_at', monday.toISOString()),

                    supabase.from('knowledge_nodes')
                        .select('current_mastery, display_name, id')
                        .eq('user_id', user.id)
                ]);

                // Map reflection sessions
                const reflectionMapped: any[] = (sessionsRes?.data || []).map((s: any) => ({
                    id: s.id,
                    title: normalizeTitle(s.title),
                    type: s.content_type || 'text',
                    date: s.created_at ? formatDistanceToNow(new Date(s.created_at), { addSuffix: true }) : 'Recent',
                    mastery: {
                        solid: (s.depth_score || 0) > 80 ? 70 : 40,
                        developing: 20,
                        shaky: (s.depth_score || 0) < 60 ? 30 : 5,
                        revisit: (s.depth_score || 0) < 40 ? 10 : 5
                    },
                    gaps: (s.depth_score || 0) < 70 ? 2 : 0,
                    materials: ['quiz', 'explain', 'tutor'],
                    rawDate: new Date(s.created_at || 0)
                }));

                // Map flow sessions
                const flowMapped: any[] = (flowHistoryRes?.data || []).map((s: any) => {
                    const completedCount = s.concepts_completed?.length || 0;
                    const totalCount = (s.initial_plan as any)?.concepts?.length || 5;
                    const title = s.curriculum?.title || s.reflection_session?.title || 'Continuous Flow';
                    
                    return {
                        id: s.id,
                        title: normalizeTitle(title),
                        type: 'flow',
                        date: s.created_at ? formatDistanceToNow(new Date(s.created_at), { addSuffix: true }) : 'Recent',
                        mastery: {
                            solid: Math.round((completedCount / (totalCount || 1)) * 100),
                            developing: 0,
                            shaky: 0,
                            revisit: 0
                        },
                        gaps: 0,
                        materials: ['tutor'],
                        rawDate: new Date(s.created_at || 0),
                        sourceType: s.source_type,
                        sourceId: s.curriculum_id || s.reflection_session_id
                    };
                });

                // Merge and sort
                const combined = [...reflectionMapped, ...flowMapped]
                    .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
                    .slice(0, 5);

                setLatestSessions(combined);

                if (vaultRes && vaultRes.data) {
                    setVaultCount(vaultRes.data.length);
                }

                const allActivity = [...(activityRes?.data || []), ...(flowActivityRes?.data || [])];
                const days = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(monday);
                    d.setDate(monday.getDate() + i);
                    const dStr = d.toISOString().split('T')[0];
                    return allActivity.some((s: any) => s.created_at.startsWith(dStr));
                });
                setActivityDays(days);
                
                const currentStreak = [...days].reverse().findIndex(d => !d);
                setStreak(currentStreak === -1 ? 7 : (currentStreak === 0 ? (days[6] ? 1 : 0) : currentStreak));
                
                const activeCount = days.filter(Boolean).length;
                if (activeCount > 3) setTrend('+24% increase');
                else if (activeCount > 0) setTrend('Maintain momentum');
                else setTrend('Start your week');
            } catch (err) {
                console.warn('Dashboard data fetch taking too long or failed:', err);
            } finally {
                clearTimeout(timer);
                setDataLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    const handleAnalyze = async (data: any, isClarified = false) => {
        setIsProcessing(true);
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            // Pre-analysis step
            if (!isClarified && data.content && data.content.trim().length > 0) {
                setIsPreAnalyzing(true);
                try {
                    const preRes = await fetch('/api/serify/pre-analyze', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        signal: controller.signal,
                        body: JSON.stringify({
                            content: data.content,
                            contentType: data.type,
                            mode: data.mode
                        })
                    });
                    
                    if (preRes.ok) {
                        const analysis = await preRes.json();
                        if (analysis.status === 'clarify') {
                            setClarificationData({
                                isOpen: true,
                                question: analysis.question,
                                options: analysis.suggestedOptions || [],
                                originalData: data
                            });
                            setIsPreAnalyzing(false);
                            setIsProcessing(false); // Pause processing until clarified
                            return;
                        }
                        // If suggested a specific mode, we could update data.mode here if needed
                        if (analysis.suggestedMode) {
                            data.mode = analysis.suggestedMode;
                        }
                    }
                } catch (preErr) {
                    console.warn('Pre-analysis failed, proceeding normally:', preErr);
                } finally {
                    setIsPreAnalyzing(false);
                }
            }

            let fileData = undefined;
            if (data.file) {
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(data.file);
                    reader.onload = () => {
                        const res = reader.result as string;
                        resolve(res.split(',')[1]);
                    };
                    reader.onerror = error => reject(error);
                });
                fileData = {
                    base64,
                    mimeType: data.file.type || 'application/octet-stream'
                };
            }

            if (data.mode === 'curriculum') {
                router.push(`/learn?autoStart=true&q=${encodeURIComponent(data.content || '')}`);
                setIsProcessing(false);
                return;
            }

            if (data.mode === 'learn') {
                const timeoutId = setTimeout(() => controller.abort(), 30000);
                const qRes = await fetch('/api/serify/start-quick-learn', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        ...(isDemo ? { 'x-serify-demo': 'true' } : {})
                    },
                    signal: controller.signal,
                    body: JSON.stringify({ content: data.content, contentType: data.type, fileData })
                });
                clearTimeout(timeoutId);

                if (qRes.ok) {
                    const { flowSessionId } = await qRes.json();
                    router.push(`/learn/quick/flow?session=${flowSessionId}`);
                    return;
                }
                const errData = await qRes.json();
                throw new Error(errData.error || 'Failed to start quick learn');
            }

            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const res = await fetch('/api/serify/extract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...(isDemo ? { 'x-serify-demo': 'true' } : {})
                },
                signal: controller.signal,
                body: JSON.stringify({
                    content: data.type === 'text' ? data.content : undefined,
                    url: data.type !== 'text' && data.type !== 'pdf' && data.type !== 'file' ? data.content : undefined,
                    contentType: data.type,
                    mode: data.mode,
                    fileData
                })
            });
            clearTimeout(timeoutId);
            
            if (res.ok) {
                const { sessionId } = await res.json();
                if (data.mode === 'flow') {
                    router.push(`/flow?session=${sessionId}`);
                } else {
                    router.push(`/session/${sessionId}`);
                }
            } else {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to extract content');
            }
        } catch (err: any) {
            console.error(err);
            throw err;
        } finally {
            setIsProcessing(false);
        }
    };

    const isActuallyLoading = isDemo ? (!!user && dataLoading) : (loading || (!!user && dataLoading));

    if (isActuallyLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-[var(--accent)]/20 blur-2xl rounded-full scale-150 animate-pulse" />
                        <Brain className="animate-pulse text-[var(--accent)] relative z-10" size={64} />
                    </div>
                    
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-sm font-black tracking-[0.2em] text-[var(--text)] uppercase">Serify is arriving</p>
                        <p className="text-[10px] text-[var(--muted)] font-medium">Preparing your personalized knowledge landscape...</p>
                    </div>

                    {showSlowLoadingNotice && (
                        <div className="mt-4 flex flex-col items-center gap-3 animate-fade-in">
                            <button 
                                onClick={() => setDataLoading(false)}
                                className="px-5 py-2 rounded-full border border-[var(--border)] text-xs font-bold hover:bg-[var(--surface)] transition-all"
                            >
                                Skip & Enter anyway
                            </button>
                            <p className="text-[10px] text-[var(--muted)] max-w-[240px] text-center leading-relaxed font-mono">
                                The connection is taking longer than usual. You can enter now and data will load in the background.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!user && !isDemo) return <LandingPage />;

    return (
        <DashboardLayout>
            <SEO title="Home" description="Your personal learning command center." />
            
            {isEnabled('new_dashboard_v2') ? (
                <DashboardV2 
                    user={user}
                    latestSessions={latestSessions}
                    activityDays={activityDays}
                    streak={streak}
                    trend={trend}
                    vaultCount={vaultCount}
                    handleAnalyze={handleAnalyze}
                    handleCancel={handleCancel}
                    isDemo={isDemo}
                    isProcessing={isProcessing || isPreAnalyzing}
                />
            ) : (
                <div className="max-w-[1240px] mx-auto px-6 pt-8 pb-12 md:pt-12 md:pb-20 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 xl:gap-8">
                        <div className="space-y-4">
                            <section className="animate-slide-up">
                                <SmartInputCard 
                                    onAnalyze={handleAnalyze} 
                                    onCancel={handleCancel}
                                    tokenBalance={isDemo ? 1000 : ((user?.monthlyLimit || 0) - (user?.tokensUsed || 0))} 
                                    totalLimit={isDemo ? 1000 : (user?.monthlyLimit || 0)}
                                    isProcessing={isProcessing || isPreAnalyzing}
                                />
{latestSessions.length === 0 && (
                                    <p className="mt-4 text-center text-xs text-[var(--muted)] italic animate-fade-in" style={{ animationDelay: '500ms' }}>
                                        Start with something you recently watched, read, or studied.
                                    </p>
                                )}
                            </section>

                            <section className="animate-slide-up" style={{ animationDelay: '150ms' }}>
                                <RecentSessions sessions={latestSessions} />
                            </section>
                        </div>

                        <div className="space-y-10">
                            <section className="animate-slide-up" style={{ animationDelay: '200ms' }}>
                                {latestSessions.length === 0 && (
                                    <div className="bg-white rounded-2xl border border-[var(--border)] p-6 shadow-sm">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted)] mb-4">You&apos;re all set.</h3>
                                        <div className="flex items-center gap-2 mb-4 text-emerald-500 bg-emerald-50 py-2 px-3 rounded-lg w-fit">
                                            <BookOpen size={14} fill="currentColor" />
                                            <span className="text-xs font-bold">{user?.monthlyLimit || 50} tokens ready</span>
                                        </div>
                                        <p className="text-sm text-[var(--muted)] leading-relaxed">
                                            Paste anything you&apos;ve been studying. Your concept vault and learning history will appear here after your first session.
                                        </p>
                                    </div>
                                )}
                            </section>

                            <section className="animate-slide-up" style={{ animationDelay: '250ms' }}>
                                <QuickLaunch />
                            </section>

                            <section className="animate-slide-up" style={{ animationDelay: '300ms' }}>
                                <ActivityDots 
                                    days={activityDays} 
                                    sessionsCount={latestSessions.length} 
                                    conceptsCount={vaultCount}
                                    streak={streak}
                                    trend={trend}
                                />
                            </section>

                            <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--bg)] to-[#f8fafc] border border-[var(--border)] shadow-sm group hover:border-[var(--accent)]/30 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-white border border-[var(--border)] flex items-center justify-center text-[var(--accent)] mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                    <Sparkles size={18} />
                                </div>
                                <h4 className="text-[15px] font-bold text-[var(--text)] mb-2">Start Learning</h4>
                                <p className="text-xs text-[var(--muted)] leading-relaxed mb-4">Give the AI your goal and it will generate a structured multi-session curriculum.</p>
                                <button 
                                    onClick={() => router.push('/learn')}
                                    className="w-full py-2.5 bg-white border border-[var(--border)] text-[var(--text)] rounded-xl text-xs font-bold hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all"
                                >
                                    Learn →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ClarificationDialog 
                isOpen={clarificationData.isOpen}
                onClose={() => {
                    setClarificationData(prev => ({ ...prev, isOpen: false }));
                    if (clarificationData.originalData) {
                        handleAnalyze(clarificationData.originalData, true);
                    }
                }}
                question={clarificationData.question}
                options={clarificationData.options}
                isLoading={isProcessing}
                onConfirm={(response, updatedMode) => {
                    setClarificationData(prev => ({ ...prev, isOpen: false }));
                    const newData = { 
                        ...clarificationData.originalData, 
                        content: `${clarificationData.originalData.content} (Context: ${response})` 
                    };
                    if (updatedMode) newData.mode = updatedMode;
                    handleAnalyze(newData, true);
                }}
            />
        </DashboardLayout>
    );
}
