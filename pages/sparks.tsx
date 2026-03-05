import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useSparks } from '@/hooks/useSparks';
import { Zap, Crown, ShieldCheck, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const SPARK_PACKS = [
    {
        id: 'price_1T7B2tAVmFT8Icz97GQjiqZ4',
        name: 'Starter Pack',
        sparks: 50,
        price: 4.99,
        popular: false
    },
    {
        id: 'price_1T7B2tAVmFT8Icz9V1N6ypMz',
        name: 'Learner Pack',
        sparks: 150,
        price: 9.99,
        popular: true
    },
    {
        id: 'price_1T7B2tAVmFT8Icz9KDwOOdlP',
        name: 'Power Pack',
        sparks: 500,
        price: 24.99,
        popular: false
    }
];

export default function SparksShop() {
    const { user, loading: authLoading } = useAuth();
    const { balance, loading: sparksLoading } = useSparks();
    const router = useRouter();
    const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
    const { success, canceled, amount } = router.query;

    const loading = authLoading || (sparksLoading && !balance);

    const handleCheckout = async (priceId: string, sparkAmount: number) => {
        if (!user) {
            router.push('/signup?intent=sparks');
            return;
        }

        setIsCheckingOut(priceId);
        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
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
                <div className="mx-auto max-w-5xl py-10 px-4 sm:px-6 lg:px-8 space-y-12 animate-pulse">
                    <div className="flex flex-col items-center space-y-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-2xl" />
                        <div className="h-10 w-64 bg-[var(--border)] rounded-xl" />
                        <div className="h-4 w-96 bg-[var(--border)] rounded" />
                    </div>
                    <div className="max-w-3xl mx-auto h-24 bg-[var(--surface)] border border-[var(--border)] rounded-2xl" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-80 bg-[var(--surface)] border border-[var(--border)] rounded-3xl" />
                        ))}
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <Head>
                <title>Get Sparks | Serify</title>
            </Head>

            <div className="mx-auto max-w-5xl py-10 px-4 sm:px-6 lg:px-8">

                {/* Success / Cancel banners */}
                {success === 'true' && (
                    <div className="mb-6 max-w-3xl mx-auto flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-5 py-4">
                        <CheckCircle size={20} className="shrink-0" />
                        <p className="font-medium">Payment successful! <strong>{amount} Sparks</strong> have been added to your balance.</p>
                    </div>
                )}
                {canceled === 'true' && (
                    <div className="mb-6 max-w-3xl mx-auto flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
                        <XCircle size={20} className="shrink-0" />
                        <p className="font-medium">Payment canceled. No charges were made.</p>
                    </div>
                )}

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-100 text-amber-500 mb-4">
                        <Zap size={24} fill="currentColor" />
                    </div>
                    <h1 className="text-3xl font-display font-bold text-[var(--text)] mb-3">
                        Recharge Your Learning
                    </h1>
                    <p className="text-base text-[var(--muted)] max-w-2xl mx-auto">
                        Sparks fuel Serify&apos;s AI. Use them to analyze content, generate custom
                        quizzes, and get personalized feedback.
                    </p>
                </div>

                { }
                {!loading && balance !== null && (
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 mb-8 flex flex-col md:flex-row items-center justify-between shadow-sm max-w-3xl mx-auto">
                        <div className="flex items-center gap-4 mb-4 md:mb-0">
                            <div className="w-12 h-12 rounded-full bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center">
                                <Zap size={24} fill="currentColor" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wider">
                                    Current Balance
                                </h3>
                                <div className="text-3xl font-display font-bold text-[var(--text)]">
                                    {balance.total_sparks}{' '}
                                    <span className="text-lg text-[var(--muted)] font-normal">
                                        Sparks
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/settings/sparks')}
                            className="text-sm font-medium text-[var(--accent)] hover:underline flex items-center gap-1"
                        >
                            View History <ChevronRight size={16} />
                        </button>
                    </div>
                )}

                { }
                {user?.plan !== 'pro' && (
                    <div className="mb-8 max-w-3xl mx-auto bg-gradient-to-r from-indigo-50 to-blue-50 border border-blue-100 rounded-3xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Crown size={120} />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
                                    Best Value
                                </div>
                                <h3 className="text-2xl font-display font-bold text-gray-900 mb-2">
                                    Serify Pro Subscription
                                </h3>
                                <p className="text-gray-600 mb-4 max-w-md">
                                    Get <strong>500 Sparks automatically every month</strong>, plus
                                    unlock advanced cognitive analysis and AI Tutor mode.
                                </p>
                            </div>
                            <button
                                onClick={() => router.push('/pricing')}
                                className="shrink-0 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
                            >
                                View Pro Plans
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-center gap-4 mb-8">
                    <div className="h-px bg-[var(--border)] flex-1 max-w-[100px]"></div>
                    <span className="text-sm font-medium text-[var(--muted)] uppercase tracking-widest">
                        Or buy a-la-carte
                    </span>
                    <div className="h-px bg-[var(--border)] flex-1 max-w-[100px]"></div>
                </div>

                { }
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto stagger-children">
                    {SPARK_PACKS.map((pack) => (
                        <div
                            key={pack.id}
                            className={`relative flex flex-col bg-[var(--surface)] rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${pack.popular
                                ? 'border-2 border-amber-400 shadow-md shadow-amber-900/5'
                                : 'border border-[var(--border)] shadow-sm hover:border-[var(--accent)]'
                                }`}
                        >
                            {pack.popular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <span className="bg-amber-400 text-amber-950 text-[11px] font-bold uppercase tracking-widest py-1 px-4 rounded-full shadow-sm">
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            <div className="text-center mb-6">
                                <h3 className="text-lg font-medium text-[var(--muted)] mb-2">
                                    {pack.name}
                                </h3>
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Zap size={32} className="text-amber-500" fill="currentColor" />
                                    <span className="text-4xl font-display font-bold text-[var(--text)]">
                                        {pack.sparks}
                                    </span>
                                </div>
                                <div className="text-[var(--text)] font-semibold text-xl">
                                    ${pack.price}
                                </div>
                            </div>

                            <button
                                onClick={() => handleCheckout(pack.id, pack.sparks)}
                                disabled={isCheckingOut === pack.id}
                                className={`mt-auto w-full py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center ${pack.popular
                                    ? 'bg-amber-400 hover:bg-amber-500 text-amber-950'
                                    : 'bg-[var(--accent-light)] hover:bg-[var(--accent)] hover:text-white text-[var(--accent)]'
                                    }`}
                            >
                                {isCheckingOut === pack.id ? (
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    'Purchase'
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                { }
                <div className="mt-10 text-center flex flex-col items-center justify-center text-[var(--muted)]">
                    <ShieldCheck size={32} className="mb-3 opacity-50 animate-soft-float" />
                    <p className="text-sm max-w-md">
                        Payments are processed securely by Stripe. Purchased Sparks never expire.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
