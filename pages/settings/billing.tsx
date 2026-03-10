import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Zap, ArrowRight, ExternalLink, MessageSquare, BookOpen, Layers, Brain, Sparkles } from 'lucide-react';
import DashboardLayout from '@/components/Layout/DashboardLayout';

export default function BillingSettings() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [plan, setPlan] = useState('free');
    const [subscription, setSubscription] = useState<any>(null);
    const [usage, setUsage] = useState<any>(null);
    const [limits, setLimits] = useState<any>(null);
    const [portalLoading, setPortalLoading] = useState(false);

    useEffect(() => {
        if (!user) return;

        async function fetchData() {
            try {
                const { data: usageData } = await supabase
                    .from('usage_tracking')
                    .select('*')
                    .eq('user_id', user!.id)
                    .single();

                if (usageData) {
                    setUsage(usageData);
                    setPlan(usageData.plan || 'free');

                    const { data: limitData } = await supabase
                        .from('plan_limits')
                        .select('*')
                        .eq('plan', usageData.plan || 'free')
                        .single();
                    setLimits(limitData);
                }

                if (usageData?.plan !== 'free') {
                    const { data: subData } = await supabase
                        .from('subscriptions')
                        .select('*')
                        .eq('user_id', user!.id)
                        .maybeSingle();
                    setSubscription(subData);
                }
            } catch (err) {
                console.error('Error fetching billing data:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [user]);

    const handleManageBilling = async () => {
        setPortalLoading(true);
        try {
            const { data: authData } = await supabase.auth.getSession();
            const token = authData.session?.access_token;
            const res = await fetch('/api/subscriptions/portal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error('Portal error');
            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } catch (err) {
            console.error('Portal error:', err);
            alert('An error occurred. Please try again.');
        } finally {
            setPortalLoading(false);
        }
    };

    if (!user || loading) {
        return (
            <DashboardLayout>
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
                </div>
            </DashboardLayout>
        );
    }

    const usageItems = [
        { label: 'Sessions', used: usage?.sessions_used || 0, limit: limits?.sessions_limit, icon: <BookOpen className="w-4 h-4" /> },
        { label: 'AI Messages', used: usage?.ai_messages_used || 0, limit: limits?.ai_messages_limit, icon: <MessageSquare className="w-4 h-4" /> },
        { label: 'Quizzes', used: usage?.quizzes_used || 0, limit: limits?.quizzes_limit, icon: <Layers className="w-4 h-4" /> },
        { label: 'Flashcards', used: usage?.flashcards_used || 0, limit: limits?.flashcards_limit, icon: <Brain className="w-4 h-4" /> },
        { label: 'Flow Mode', used: usage?.flow_sessions_used || 0, limit: limits?.flow_sessions_limit, icon: <Zap className="w-4 h-4" /> },
        { label: 'Deep Dives', used: usage?.deep_dives_used || 0, limit: limits?.deep_dives_limit, icon: <Sparkles className="w-4 h-4" /> },
    ];

    return (
        <DashboardLayout>
            <Head>
                <title>Billing & Subscription | Serify</title>
            </Head>

            <div className="mx-auto max-w-4xl py-8 px-4">
                <h1 className="mb-8 text-3xl font-bold text-text">Billing &amp; Subscription</h1>

                {router.query.success && (
                    <div className="mb-8 rounded-lg bg-green-500/10 p-4 text-green-500 border border-green-500/20 flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <p className="font-medium">Thanks for your purchase! Your account has been updated.</p>
                    </div>
                )}

                <div className="grid gap-8 md:grid-cols-2">
                    <div className="flex flex-col gap-6">
                        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                            <h2 className="mb-4 text-lg font-semibold text-text">Current Plan</h2>
                            <div className="mb-6">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-3xl font-bold text-text capitalize">
                                        {plan === 'free' ? 'Free' : `Serify ${plan}`}
                                    </span>
                                    {plan !== 'free' && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                                            Active
                                        </span>
                                    )}
                                </div>
                                {subscription && (
                                    <p className="text-text/60">
                                        {subscription.cancel_at_period_end ? 'Ends' : 'Renews'} on {format(parseISO(subscription.current_period_end), 'MMMM d, yyyy')}
                                    </p>
                                )}
                            </div>

                            {plan === 'free' ? (
                                <Link
                                    href="/pricing"
                                    className="w-full rounded-lg bg-accent py-3 px-4 font-medium text-white transition-colors hover:bg-accent/90 flex items-center justify-center gap-2"
                                >
                                    Upgrade to Pro <ArrowRight size={16} />
                                </Link>
                            ) : (
                                <button
                                    onClick={handleManageBilling}
                                    disabled={portalLoading}
                                    className="w-full rounded-lg bg-surface py-2.5 px-4 font-medium text-text border border-border transition-colors hover:bg-border/50 disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {portalLoading ? 'Opening portal...' : <><ExternalLink size={15} /> Manage Billing</>}
                                </button>
                            )}
                        </div>

                        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                            <h2 className="mb-4 text-lg font-semibold text-text">Feature Usage</h2>
                            <div className="flex flex-col gap-5">
                                {usageItems.map((item) => (
                                    <div key={item.label}>
                                        <div className="mb-1.5 flex justify-between text-xs font-medium">
                                            <div className="flex items-center gap-2 text-text/80">
                                                {item.icon}
                                                {item.label}
                                            </div>
                                            <span className="text-text/60">
                                                {item.limit === null ? `${item.used} used` : `${item.used} / ${item.limit}`}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                                            <div
                                                className={`h-full rounded-full transition-all ${item.limit !== null && item.used >= item.limit ? 'bg-red-500' : 'bg-accent'}`}
                                                style={{ 
                                                    width: item.limit === null ? '100%' : `${Math.min(100, (item.used / item.limit) * 100)}%`,
                                                    opacity: item.limit === null ? 0.3 : 1
                                                }}                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-4 text-[10px] text-text/40">
                                Usage resets monthly on your billing anniversary.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                            <h2 className="mb-4 text-lg font-semibold text-text">Plan Benefits</h2>
                            <ul className="flex flex-col gap-3 text-sm text-text/80">
                                <li className="flex items-center gap-3">
                                    <CheckCircle2 className="w-4 h-4 text-accent" />
                                    <span>
                                        {plan === 'proplus' ? 'Unlimited Sessions' : plan === 'pro' ? '20 Sessions per month' : '3 Sessions per month'}
                                    </span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle2 className="w-4 h-4 text-accent" />
                                    <span>
                                        {plan === 'proplus' ? 'Unlimited AI Messages' : plan === 'pro' ? '150 AI Messages per month' : '10 AI Messages per month'}
                                    </span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle2 className="w-4 h-4 text-accent" />
                                    <span>
                                        {plan === 'proplus' ? 'Unlimited Flow Mode Sessions' : plan === 'pro' ? '10 Flow Mode sessions' : '1 Flow Mode session'}
                                    </span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle2 className="w-4 h-4 text-accent" />
                                    <span>
                                        {plan === 'proplus' ? 'Unlimited Deep Dives' : plan === 'pro' ? '20 Deep Dives' : '2 Deep Dives'}
                                    </span>
                                </li>
                                {plan === 'proplus' && (
                                    <li className="flex items-center gap-3">
                                        <CheckCircle2 className="w-4 h-4 text-accent" />
                                        <span>Best available AI models (Gemini 2.5 Pro)</span>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
