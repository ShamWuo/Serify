import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SEO from '@/components/Layout/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Check, Zap, BrainCircuit, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import DashboardLayout from '@/components/Layout/DashboardLayout';

export default function PricingPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [isAnnual, setIsAnnual] = useState(true);
    const [userPlan, setUserPlan] = useState<string>('free');
    const [planLoading, setPlanLoading] = useState(true);
    const [checkingOut, setCheckingOut] = useState(false);

    useEffect(() => {
        if (!user) {
            setPlanLoading(false);
            return;
        }
        async function fetchPlan() {
            const { data } = await supabase
                .from('usage_tracking')
                .select('plan')
                .eq('user_id', user!.id)
                .single();
            setUserPlan(data?.plan || 'free');
            setPlanLoading(false);
        }
        fetchPlan();
    }, [user]);

    const handleCheckout = async (priceId: string, planName: string) => {
        if (!user) {
            router.push(`/signup?intent=${planName}`);
            return;
        }
        if (userPlan !== 'free') {
            router.push('/settings/billing');
            return;
        }

        setCheckingOut(true);
        try {
            const { data: authData } = await supabase.auth.getSession();
            const token = authData.session?.access_token;
            const res = await fetch('/api/subscriptions/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ priceId, planName })
            });

            if (res.status === 409) {
                router.push('/settings/billing');
                return;
            }

            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } catch (err) {
            console.error('Checkout error:', err);
        } finally {
            setCheckingOut(false);
        }
    };

    const isSubscribed = !planLoading && userPlan !== 'free';

    const plans = [
        {
            name: 'free',
            label: 'Free',
            price: '0',
            description: 'Try it. Find out what you actually know.',
            features: [
                '3 sessions per month',
                '5 flashcard generations',
                '3 practice quizzes',
                '10 AI assistant messages',
                '1 Flow Mode session',
                'Basic feedback report',
                'Concept Vault (10 concepts)',
            ],
            buttonText: user ? 'Current Plan' : 'Get Started',
            priceId: null,
            popular: false
        },
        {
            name: 'pro',
            label: 'Pro',
            price: isAnnual ? '5.33' : '7.99',
            displayPrice: isAnnual ? '63.99' : '7.99',
            description: 'For students and learners who are serious about understanding, not just finishing.',
            features: [
                'Everything in Free, plus:',
                '20 sessions per month',
                '50 flashcard generations',
                '30 practice quizzes',
                '150 AI assistant messages',
                '10 Flow Mode sessions',
                '5 Learn Mode curricula',
                'Full cognitive feedback',
                '20 Deep Dives',
                'Concept Vault up to 200',
            ],
            buttonText: 'Start Pro',
            priceId: isAnnual ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY,
            popular: true,
            tagline: 'Recommended'
        },
        {
            name: 'proplus',
            label: 'Pro+',
            price: isAnnual ? '13.33' : '19.99',
            displayPrice: isAnnual ? '159.99' : '19.99',
            description: 'For power users who need the ultimate cognitive edge.',
            features: [
                'Everything in Pro, plus:',
                'Unlimited everything',
                'Unlimited AI assistant messages',
                'Unlimited Flow Mode sessions',
                'Unlimited Learn Mode curricula',
                'Unlimited Deep Dives',
                'Unlimited Concept Vault',
                'Best available AI models (Gemini 2.5 Pro)',
                'Priority support',
            ],
            buttonText: 'Get Pro+',
            priceId: isAnnual ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PROPLUS_YEARLY : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PROPLUS_MONTHLY,
            popular: false
        }
    ];

    return (
        <DashboardLayout>
            <SEO 
                title="Pricing" 
                description="Simple, transparent pricing. Start free and upgrade when you're ready for deeper AI diagnostic learning."
            />

            <div className="mx-auto max-w-6xl py-12 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-text mb-6">
                        Unlock Your Cognitive Potential
                    </h1>
                    <p className="text-xl text-text/70 max-w-2xl mx-auto mb-10">
                        Move beyond simple testing with AI-powered diagnostic learning.
                    </p>

                    <div className="inline-flex items-center gap-1 bg-surface border border-border rounded-full p-1">
                        <button
                            onClick={() => setIsAnnual(false)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!isAnnual ? 'bg-accent text-white shadow-sm' : 'text-text/60 hover:text-text'}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsAnnual(true)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${isAnnual ? 'bg-accent text-white shadow-sm' : 'text-text/60 hover:text-text'}`}
                        >
                            Annual
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isAnnual ? 'bg-white/20 text-white' : 'bg-accent/10 text-accent'}`}>Save 33%</span>
                        </button>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-3 md:grid-cols-2 max-w-5xl mx-auto">
                    {plans.map((p) => (
                        <div
                            key={p.name}
                            className={`flex flex-col rounded-3xl border-2 p-8 transition-all ${p.popular ? 'border-accent bg-surface shadow-xl scale-105' : 'border-border bg-surface'}`}
                        >
                            {p.popular && (
                                <div className="bg-accent text-white text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-full self-start mb-4">
                                    Recommended
                                </div>
                            )}
                            <h3 className="text-2xl font-bold text-text mb-2 flex items-center gap-2">
                                {p.label} {p.name === 'pro' && <BrainCircuit className="w-5 h-5 text-accent" />}
                                {p.name === 'proplus' && <Sparkles className="w-5 h-5 text-amber-500" />}
                            </h3>
                            <p className="text-text/60 text-sm h-10 mb-6">{p.description}</p>

                            <div className="mb-8">
                                <span className="text-5xl font-bold text-text">${isAnnual && p.name !== 'free' ? (parseFloat(p.displayPrice || p.price) / 12).toFixed(2) : p.price}</span>
                                <span className="text-lg font-semibold text-text/60">/mo</span>
                                {isAnnual && p.name !== 'free' && (
                                    <p className="text-xs text-text/40 mt-1">Billed as ${p.displayPrice}/year</p>
                                )}
                            </div>

                            <button
                                onClick={() => p.priceId ? handleCheckout(p.priceId, p.name) : router.push(user ? '/' : '/signup')}
                                disabled={checkingOut || !!(p.name === userPlan && user)}
                                className={`mb-8 w-full rounded-xl py-4 font-bold text-center transition-all ${p.name === userPlan && user
                                    ? 'bg-border text-text/40 cursor-default'
                                    : p.popular
                                        ? 'bg-accent text-white shadow-lg shadow-accent/20 hover:opacity-90 active:scale-[0.98]'
                                        : 'bg-surface border border-border text-text hover:bg-border/50'
                                    }`}
                            >
                                {p.name === userPlan && user ? 'Current Plan' : checkingOut ? 'Processing...' : p.buttonText}
                            </button>

                            <ul className="flex-1 space-y-4">
                                {p.features.map((f) => (
                                    <li key={f} className="flex gap-3 items-start text-sm text-text/80">
                                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-20 text-center text-text/50 text-sm">
                    <p>Prices shown in USD. Annual plans save 33% compared to monthly. All plans subject to our TOS.</p>
                </div>
            </div>
        </DashboardLayout>
    );
}
