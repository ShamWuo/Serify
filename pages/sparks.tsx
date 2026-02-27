import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useSparks } from '@/hooks/useSparks';
import { Zap, Crown, ShieldCheck, ChevronRight } from 'lucide-react';

const SPARK_PACKS = [
    {
        id: 'price_1_sparks_50',
        name: 'Starter Pack',
        sparks: 50,
        price: 4.99,
        popular: false,
    },
    {
        id: 'price_1_sparks_200',
        name: 'Learner Pack',
        sparks: 200,
        price: 14.99,
        popular: true,
    },
    {
        id: 'price_1_sparks_500',
        name: 'Master Pack',
        sparks: 500,
        price: 29.99,
        popular: false,
    }
];

export default function SparksShop() {
    const { user } = useAuth();
    const { balance, loading } = useSparks();
    const router = useRouter();
    const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);

    const handleCheckout = async (priceId: string) => {
        if (!user) {
            router.push('/signup?intent=sparks');
            return;
        }

        setIsCheckingOut(priceId);
        try {
            const res = await fetch('/api/sparks/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priceId }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Checkout failed:', errorText);
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

    return (
        <DashboardLayout>
            <Head>
                <title>Get Sparks | Serify</title>
            </Head>

            <div className="mx-auto max-w-5xl py-10 px-4 sm:px-6 lg:px-8">

                {}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 text-amber-500 mb-6">
                        <Zap size={32} fill="currentColor" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)] mb-4">
                        Recharge Your Learning
                    </h1>
                    <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto">
                        Sparks fuel Serify's AI. Use them to analyze content, generate custom quizzes, and get personalized feedback.
                    </p>
                </div>

                {}
                {!loading && balance !== null && (
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 mb-12 flex flex-col md:flex-row items-center justify-between shadow-sm max-w-3xl mx-auto">
                        <div className="flex items-center gap-4 mb-4 md:mb-0">
                            <div className="w-12 h-12 rounded-full bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center">
                                <Zap size={24} fill="currentColor" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wider">Current Balance</h3>
                                <div className="text-3xl font-display font-bold text-[var(--text)]">
                                    {balance.total_sparks} <span className="text-lg text-[var(--muted)] font-normal">Sparks</span>
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

                {}
                {user?.plan !== 'pro' && (
                    <div className="mb-12 max-w-3xl mx-auto bg-gradient-to-r from-indigo-50 to-blue-50 border border-blue-100 rounded-3xl p-8 relative overflow-hidden">
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
                                    Get <strong>500 Sparks automatically every month</strong>, plus unlock advanced cognitive analysis and AI Tutor mode.
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
                    <span className="text-sm font-medium text-[var(--muted)] uppercase tracking-widest">Or buy a-la-carte</span>
                    <div className="h-px bg-[var(--border)] flex-1 max-w-[100px]"></div>
                </div>

                {}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {SPARK_PACKS.map((pack) => (
                        <div
                            key={pack.id}
                            className={`relative flex flex-col bg-[var(--surface)] rounded-3xl p-8 transition-transform hover:-translate-y-1 ${pack.popular
                                    ? 'border-2 border-amber-400 shadow-md shadow-amber-900/5'
                                    : 'border border-[var(--border)] shadow-sm'
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
                                <h3 className="text-lg font-medium text-[var(--muted)] mb-2">{pack.name}</h3>
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Zap size={32} className="text-amber-500" fill="currentColor" />
                                    <span className="text-4xl font-display font-bold text-[var(--text)]">{pack.sparks}</span>
                                </div>
                                <div className="text-[var(--text)] font-semibold text-xl">
                                    ${pack.price}
                                </div>
                            </div>

                            <button
                                onClick={() => handleCheckout(pack.id)}
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

                {}
                <div className="mt-16 text-center flex flex-col items-center justify-center text-[var(--muted)]">
                    <ShieldCheck size={32} className="mb-3 opacity-50" />
                    <p className="text-sm max-w-md">
                        Payments are processed securely by Stripe. Purchased Sparks never expire.
                    </p>
                </div>

            </div>
        </DashboardLayout>
    );
}
