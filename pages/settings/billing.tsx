import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Zap, ArrowRight, ExternalLink, MessageSquare, BookOpen, Layers, Brain, Sparkles, Info } from 'lucide-react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useUsage } from '@/hooks/useUsage';

export default function BillingSettings() {
    const router = useRouter();
    const { user } = useAuth();
    const { allUsage, loading: usageLoading } = useUsage();
    const [loading, setLoading] = useState(true);
    const [plan, setPlan] = useState('free');
    const [subscription, setSubscription] = useState<any>(null);
    const [portalLoading, setPortalLoading] = useState(false);

    useEffect(() => {
        if (!user) return;

        async function fetchData() {
            setLoading(true);
            try {
                // We use useUsage hook for tokens/limits, but still need subscription details if not free
                setPlan(user?.plan || 'free');

                if (user?.plan !== 'free' && user?.id !== 'demo-user') {
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

                        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm overflow-hidden relative">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-text">Unified Usage</h2>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-wider">
                                    <Sparkles size={12} />
                                    Dynamic System
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-end justify-between mb-2 text-sm">
                                        <div>
                                            <span className="text-3xl font-bold text-text">{allUsage?.tokensUsed ?? 0}</span>
                                            <span className="text-text/40 font-medium ml-1">/ {allUsage?.monthlyLimit ?? 0} tokens used</span>
                                        </div>
                                        <span className={`font-bold ${(allUsage?.percentUsed >= 90) ? 'text-orange-500' : 'text-accent'}`}>
                                            {Math.round(allUsage?.percentUsed || 0)}%
                                        </span>
                                    </div>
                                    
                                    <div className="h-3 w-full overflow-hidden rounded-full bg-border shadow-inner relative">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${(allUsage?.percentUsed >= 90) ? 'bg-orange-500' : 'bg-accent'}`}
                                            style={{ width: `${Math.min(100, allUsage?.percentUsed || 0)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Detailed Breakdown */}
                                <div className="pt-4 border-t border-border/50">
                                    <h3 className="text-xs font-bold text-text/40 uppercase tracking-widest mb-4">Detailed Breakdown</h3>
                                    <div className="grid gap-3">
                                        {[
                                            { label: 'Sessions', key: 'sessions', icon: Brain },
                                            { label: 'AI Messages', key: 'aiMessages', icon: MessageSquare },
                                            { label: 'Practice', key: 'practice', icon: Layers },
                                            { label: 'Flow Mode', key: 'flowMode', icon: Zap },
                                            { label: 'Deep Dives', key: 'deepDives', icon: Sparkles }
                                        ].map((item) => (
                                            <div key={item.key} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2 text-text/70">
                                                    <item.icon size={12} className="text-accent/60" />
                                                    <span>{item.label}</span>
                                                </div>
                                                <span className="font-bold text-text/90">{allUsage?.breakdown?.[item.key] ?? 0} <span className="text-text/30 font-normal">pts</span></span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-surface/50 border border-border/50 text-xs text-text/60 leading-relaxed shadow-sm">
                                    <p className="font-semibold text-text/80 mb-2 flex items-center gap-2">
                                        <Info className="w-3.5 h-3.5 text-accent" />
                                        How tokens work
                                    </p>
                                    Serify uses a unified token system. Instead of fixed limits per feature, different actions weigh differently based on AI compute. This gives you more flexibility in how you use your plan.
                                </div>
                            </div>
                            
                            <p className="mt-6 text-[10px] text-text/40 italic">
                                Usage resets monthly on your billing anniversary.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                            <h2 className="mb-4 text-lg font-semibold text-text">Plan Benefits</h2>
                            <ul className="flex flex-col gap-4 text-sm text-text/80">
                                <li className="flex items-start gap-3">
                                    <div className="mt-0.5 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-text">
                                            {plan === 'proplus' ? 'Unlimited Compute' : plan === 'pro' ? '500 Tokens Monthly' : '15 Tokens Monthly'}
                                        </p>
                                        <p className="text-xs text-text/60">{plan === 'proplus' ? 'Power user limits for maximum output' : 'Shared across all AI features'}</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-0.5 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-text">Priority AI Access</p>
                                        <p className="text-xs text-text/60">{plan === 'proplus' ? 'Gemini 2.5 Pro & Experimental Models' : plan === 'pro' ? 'Gemini 2.5 Flash High Speed' : 'Gemini 2.5 Flash Standard'}</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-0.5 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-text">Advanced Analytics</p>
                                        <p className="text-xs text-text/60">{plan === 'proplus' ? 'Full Cognitive Mapping & Predictions' : 'Concept Mastery & Strength Maps'}</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
