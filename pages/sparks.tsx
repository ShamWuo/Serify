import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useSparks } from '@/hooks/useSparks';
import {
    Zap,
    ShieldCheck,
    CheckCircle,
    XCircle,
    ChevronRight,
    Sparkles,
    Crown,
    Package,
    Flame,
    ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const SPARK_PACKS = [
    {
        id: process.env.NEXT_PUBLIC_STRIPE_PRICE_SPARKS_50!,
        name: 'Starter',
        sparks: 50,
        price: 4.99,
        pricePerSpark: '~$0.10/Spark',
        popular: false,
        description: 'Try out premium features',
        icon: Package,
        sessions: '~3–4 sessions'
    },
    {
        id: process.env.NEXT_PUBLIC_STRIPE_PRICE_SPARKS_150!,
        name: 'Learner',
        sparks: 150,
        price: 9.99,
        pricePerSpark: '~$0.067/Spark',
        popular: true,
        description: 'Best for active learners',
        icon: Flame,
        sessions: '~11 sessions'
    },
    {
        id: process.env.NEXT_PUBLIC_STRIPE_PRICE_SPARKS_500!,
        name: 'Power',
        sparks: 500,
        price: 24.99,
        pricePerSpark: '~$0.05/Spark',
        popular: false,
        description: 'Maximum value per Spark',
        icon: Sparkles,
        sessions: '~38 sessions'
    }
];

const WHAT_SPARKS_DO = [
    { action: 'Analyze content', cost: '6 Sparks' },
    { action: 'Generate assessment (7 questions)', cost: '5 Sparks' },
    { action: 'Full cognitive analysis', cost: '2 Sparks' },
    { action: 'AI Tutor message', cost: '2 Sparks' },
    { action: 'Flashcard deck', cost: '1 Spark' },
    { action: 'Explain It to Me', cost: '1 Spark' }
];

export default function SparksShop() {
    const { user, loading: authLoading } = useAuth();
    const { balance, loading: sparksLoading } = useSparks();
    const router = useRouter();
    const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
    const [userPlan, setUserPlan] = useState<string>('free');
    const { success, canceled, amount } = router.query;

    const loading = authLoading || (sparksLoading && !balance);

    useEffect(() => {
        if (!user) return;
        supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('id', user.id)
            .single()
            .then(({ data }) => setUserPlan(data?.subscription_tier || 'free'));
    }, [user]);

    const handleCheckout = async (priceId: string, sparkAmount: number) => {
        if (!user) {
            router.push('/signup?intent=sparks');
            return;
        }

        setIsCheckingOut(priceId);
        try {
            const {
                data: { session: authSession }
            } = await supabase.auth.getSession();
            const token = authSession?.access_token;

            const res = await fetch('/api/billing/buy-sparks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ priceId, sparkAmount })
            });

            if (!res.ok) {
                console.error('Checkout failed:', await res.text());
                alert('Checkout failed. Please try again later.');
                setIsCheckingOut(null);
                return;
            }

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert('Failed to initiate checkout.');
                setIsCheckingOut(null);
            }
        } catch (err) {
            console.error('Checkout error:', err);
            alert('An error occurred during checkout.');
            setIsCheckingOut(null);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="mx-auto max-w-5xl py-10 px-4 space-y-12">
                    <div className="flex flex-col items-center space-y-4 animate-pulse">
                        <div className="w-16 h-16 bg-border rounded-2xl" />
                        <div className="h-10 w-64 bg-border rounded-xl" />
                        <div className="h-4 w-96 bg-border rounded" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-72 bg-surface border border-border rounded-3xl animate-pulse"
                            />
                        ))}
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const isPro = userPlan !== 'free';

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 rounded-full border-4 border-[var(--border)] border-t-[var(--accent)] animate-spin"></div>
                        <p className="text-[var(--muted)] text-sm animate-pulse">Syncing Spark balance...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <Head>
                <title>Spark Shop | Serify</title>
            </Head>

            <div className="mx-auto max-w-5xl py-10 px-4 sm:px-6 lg:px-8 animate-fade-in-up">

                {/* Banners */}
                {success === 'true' && (
                    <div className="mb-8 flex items-start gap-3 bg-green-50 border border-green-200 text-green-800 rounded-2xl px-5 py-4">
                        <CheckCircle size={20} className="shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">Payment successful!</p>
                            <p className="text-sm opacity-80 mt-0.5">
                                <strong>{amount} Sparks</strong> are being added to your account —
                                your balance will update shortly.
                            </p>
                        </div>
                    </div>
                )}
                {canceled === 'true' && (
                    <div className="mb-8 flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
                        <XCircle size={20} className="shrink-0" />
                        <p className="font-medium">Payment canceled — no charges were made.</p>
                    </div>
                )}

                {/* Hero */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
                        style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
                        <Zap size={28} className="text-white" fill="white" />
                    </div>
                    <h1 className="text-4xl font-display font-bold text-text mb-3">
                        Spark Shop
                    </h1>
                    <p className="text-text/60 max-w-xl mx-auto text-base leading-relaxed">
                        Sparks fuel every AI action in Serify — from content analysis to personalized
                        feedback. Pick a pack and keep your learning momentum going.
                    </p>
                </div>

                {/* Balance Card */}
                {!loading && balance !== null && (
                    <div className="premium-card rounded-2xl p-5 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
                                <Zap size={22} className="text-white" fill="white" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-text/50 mb-0.5">
                                    Your Balance
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-display font-bold text-text">
                                        {balance.total_sparks}
                                    </span>
                                    <span className="text-text/50 font-medium">Sparks</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${isPro
                                ? 'bg-accent/10 text-accent border border-accent/20'
                                : 'bg-border text-muted'
                                }`}>
                                {isPro ? '✦ Pro Plan' : 'Free Plan'}
                            </span>
                            <button
                                onClick={() => router.push('/settings/sparks')}
                                className="text-sm font-medium text-accent hover:text-accent/80 flex items-center gap-1 transition-colors"
                            >
                                History <ChevronRight size={15} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Pro upsell — only for free users */}
                {!isPro && (
                    <div className="mb-10 relative rounded-3xl overflow-hidden border border-accent/20"
                        style={{ background: 'linear-gradient(135deg, var(--accent-soft) 0%, #f0eefa 100%)' }}>
                        <div className="absolute top-0 right-0 opacity-5 pointer-events-none select-none">
                            <Crown size={180} strokeWidth={1} />
                        </div>
                        <div className="relative z-10 p-7 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider mb-3">
                                    <Crown size={11} fill="currentColor" /> Best Value
                                </div>
                                <h3 className="text-2xl font-display font-bold text-text mb-1">
                                    Get 150 Sparks every month
                                </h3>
                                <p className="text-text/60 text-sm max-w-md">
                                    Serify Pro includes a monthly Spark allowance, full cognitive
                                    analysis, and AI Tutor — starting at $8/mo.
                                </p>
                            </div>
                            <Link
                                href="/pricing"
                                className="shrink-0 flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-colors shadow-sm shadow-accent/20"
                            >
                                View Pro Plans <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                )}

                {/* Pack header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-px bg-border flex-1" />
                    <span className="text-xs font-bold uppercase tracking-widest text-text/40">
                        One-time spark packs
                    </span>
                    <div className="h-px bg-border flex-1" />
                </div>

                {/* Packs grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12 stagger-children">
                    {SPARK_PACKS.map((pack) => {
                        const Icon = pack.icon;
                        const isLoading = isCheckingOut === pack.id;

                        return (
                            <div
                                key={pack.id}
                                className={`relative flex flex-col rounded-3xl p-7 transition-all duration-300 card-hover ${pack.popular
                                    ? 'border-2 border-amber-400 bg-surface shadow-lg shadow-amber-500/10'
                                    : 'border border-border bg-surface shadow-sm'
                                    }`}
                            >
                                {pack.popular && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                                        <span className="bg-amber-400 text-amber-950 text-[11px] font-bold uppercase tracking-widest py-1 px-4 rounded-full shadow-sm">
                                            Best Value
                                        </span>
                                    </div>
                                )}

                                {/* Icon */}
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${pack.popular
                                    ? 'bg-amber-100 text-amber-600'
                                    : 'bg-accent/10 text-accent'
                                    }`}>
                                    <Icon size={20} />
                                </div>

                                {/* Name & description */}
                                <p className="text-xs font-bold uppercase tracking-widest text-text/40 mb-0.5">
                                    {pack.name}
                                </p>
                                <p className="text-sm text-text/60 mb-5">{pack.description}</p>

                                {/* Sparks count */}
                                <div className="flex items-baseline gap-1.5 mb-1">
                                    <Zap
                                        size={22}
                                        className={pack.popular ? 'text-amber-500' : 'text-accent'}
                                        fill="currentColor"
                                    />
                                    <span className="text-4xl font-display font-bold text-text">
                                        {pack.sparks}
                                    </span>
                                    <span className="text-text/50 font-medium text-sm">Sparks</span>
                                </div>

                                {/* Sessions hint */}
                                <p className="text-xs text-text/40 mb-6">{pack.sessions}</p>

                                {/* Price */}
                                <div className="mb-6">
                                    <span className="text-2xl font-bold text-text">${pack.price}</span>
                                    <span className="text-xs text-text/40 ml-2">{pack.pricePerSpark}</span>
                                </div>

                                {/* CTA */}
                                <button
                                    onClick={() => handleCheckout(pack.id, pack.sparks)}
                                    disabled={isLoading || !!isCheckingOut}
                                    className={`mt-auto w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${pack.popular
                                        ? 'bg-amber-400 hover:bg-amber-500 text-amber-950 shadow-sm shadow-amber-300/30'
                                        : 'bg-accent/10 hover:bg-accent text-accent hover:text-white'
                                        }`}
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-current/40 border-t-current rounded-full animate-spin" />
                                            Processing…
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={15} fill="currentColor" />
                                            Buy {pack.sparks} Sparks
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* What Sparks do */}
                <div className="premium-card rounded-2xl p-6 mb-10">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-text/40 mb-5">
                        What do Sparks power?
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {WHAT_SPARKS_DO.map((item) => (
                            <div
                                key={item.action}
                                className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-background/60 border border-border/60"
                            >
                                <span className="text-sm text-text/80">{item.action}</span>
                                <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200/70 px-2.5 py-0.5 rounded-full">
                                    {item.cost}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col items-center text-center gap-2 text-text/40">
                    <ShieldCheck size={24} className="opacity-50" />
                    <p className="text-sm max-w-sm">
                        Payments processed securely by Stripe.{' '}
                        <strong className="text-text/60">Purchased Sparks never expire.</strong>
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
