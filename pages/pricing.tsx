import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Check, X, Zap, Users, BrainCircuit, ArrowRight } from 'lucide-react';
import DashboardLayout from '@/components/Layout/DashboardLayout';

export default function PricingPage() {
    const { user } = useAuth();
    const [isAnnual, setIsAnnual] = useState(true);

    const handleCheckout = async (priceId: string) => {
        if (!user) {
            window.location.href = '/signup?intent=pro';
            return;
        }

        try {
            const res = await fetch('/api/subscriptions/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, priceId }),
            });

            if (!res.ok) {
                console.error('Checkout failed:', await res.text());
                alert('Checkout failed. Please try again later.');
                return;
            }

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error('Checkout error:', err);
        }
    };

    return (
        <DashboardLayout>
            <Head>
                <title>Pricing | Serify</title>
            </Head>

            <div className="mx-auto max-w-6xl py-12 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-text mb-6">
                        Master Any Subject
                    </h1>
                    <p className="text-xl text-text/70 max-w-2xl mx-auto mb-10">
                        Every plan includes Sparks — the credits that power Serify&apos;s AI. Choose the plan that fits how you learn.
                    </p>

                    <div className="flex items-center justify-center gap-4">
                        <span className={`text-sm font-medium ${!isAnnual ? 'text-text' : 'text-text/60'}`}>Monthly</span>
                        <button
                            onClick={() => setIsAnnual(!isAnnual)}
                            className="relative inline-flex h-7 w-14 items-center rounded-full bg-accent transition-colors"
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-8' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                        <span className={`text-sm font-medium ${isAnnual ? 'text-text' : 'text-text/60'}`}>
                            Annual <span className="text-accent ml-1 text-xs px-2 py-0.5 rounded-full bg-accent/10">Save 33%</span>
                        </span>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-3 md:grid-cols-2 lg:gap-8 mx-auto xl:max-w-none xl:mx-0 max-w-5xl">
                    {}
                    <div className="flex flex-col rounded-3xl border border-border bg-surface p-8 shadow-sm">
                        <div className="mb-6">
                            <h3 className="text-2xl font-semibold text-text mb-1">Free</h3>
                            <p className="text-sm font-medium text-amber-500 flex items-center gap-1 mb-2"><Zap size={14} fill="currentColor" /> 20 Sparks / month</p>
                            <p className="text-text/60 text-sm h-10">Get started with Serify&apos;s core learning loop.</p>
                            <div className="mt-6 flex items-baseline gap-1">
                                <span className="text-4xl font-bold tracking-tight text-text">$0</span>
                                <span className="text-lg font-semibold text-text/60">/mo</span>
                            </div>
                        </div>


                        <button
                            onClick={() => window.location.href = user ? '/' : '/signup'}
                            className="mb-8 w-full rounded-xl bg-surface border border-accent text-accent py-3 px-4 font-semibold text-center transition-colors hover:bg-accent hover:text-white"
                        >
                            {user ? 'Go to Dashboard' : 'Get Started'}
                        </button>

                        <div className="flex-1">
                            <ul className="flex flex-col gap-4 text-sm text-text/80">
                                <li className="flex gap-3 items-start"><Check className="h-5 w-5 text-green-500 shrink-0" /> ~1 full session per month</li>
                                <li className="flex gap-3 items-start"><Check className="h-5 w-5 text-green-500 shrink-0" /> Basic Strength Map report</li>
                                <li className="flex gap-3 items-start"><Check className="h-5 w-5 text-green-500 shrink-0" /> 3 learning modes (Flashcards, Explain It, Feynman)</li>
                                <li className="flex gap-3 items-start"><Check className="h-5 w-5 text-green-500 shrink-0" /> 7-day session history</li>
                                <li className="flex gap-3 items-start"><Check className="h-5 w-5 text-green-500 shrink-0" /> Buy more Sparks anytime</li>
                                <li className="flex gap-3 items-start text-text/40"><X className="h-5 w-5 shrink-0" /> Cognitive Analysis & Misconception Report</li>
                                <li className="flex gap-3 items-start text-text/40"><X className="h-5 w-5 shrink-0" /> AI Tutor, Practice Quiz, Deep Dive</li>
                            </ul>
                        </div>
                    </div>

                    {}
                    <div className="flex flex-col rounded-3xl border-2 border-accent bg-surface p-8 shadow-md relative translate-y-[-10px]">
                        <div className="absolute top-0 right-8 transform -translate-y-1/2">
                            <span className="bg-accent text-white text-xs font-bold uppercase tracking-wide py-1 px-3 rounded-full">
                                Most Popular
                            </span>
                        </div>
                        <div className="mb-6">
                            <h3 className="text-2xl font-semibold text-text mb-1 flex items-center gap-2">
                                Pro <BrainCircuit className="h-5 w-5 text-accent" />
                            </h3>
                            <p className="text-sm font-medium text-accent flex items-center gap-1 mb-2"><Zap size={14} fill="currentColor" /> 150 Sparks / month <span className="text-xs text-accent/60 ml-1">({isAnnual ? '$0.053' : '$0.08'}/Spark)</span></p>
                            <p className="text-text/60 text-sm h-10">Unlock your full learning potential with deep analysis.</p>
                            <div className="mt-6 flex items-baseline gap-1">
                                <span className="text-5xl font-bold tracking-tight text-text">
                                    ${isAnnual ? '8' : '12'}
                                </span>
                                <span className="text-lg font-semibold text-text/60">/mo</span>
                            </div>
                            <p className="text-xs text-text/50 mt-1 h-4">
                                {isAnnual ? 'Billed $96 annually' : 'Billed monthly'}
                            </p>
                        </div>


                        <button
                            onClick={() => handleCheckout(isAnnual ? process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY! : process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY!)}
                            className="mb-8 w-full rounded-xl bg-accent text-white py-3 px-4 font-semibold text-center transition-colors hover:bg-accent/90 shadow-sm shadow-accent/20"
                        >
                            Start Pro
                        </button>

                        <div className="flex-1">
                            <p className="font-medium text-sm text-text mb-4">Everything in Free, plus:</p>
                            <ul className="flex flex-col gap-4 text-sm text-text/80">
                                <li className="flex gap-3 items-start"><Check className="h-5 w-5 text-accent shrink-0" /> 150 Sparks/mo (~11 full sessions)</li>
                                <li className="flex gap-3 items-start"><Check className="h-5 w-5 text-accent shrink-0" /> Full Cognitive Analysis & Misconception Report</li>
                                <li className="flex gap-3 items-start"><Check className="h-5 w-5 text-accent shrink-0" /> All 6 learning modes including AI Tutor</li>
                                <li className="flex gap-3 items-start"><Check className="h-5 w-5 text-accent shrink-0" /> Unlimited session history & Concept Vault</li>
                                <li className="flex gap-3 items-start"><Check className="h-5 w-5 text-accent shrink-0" /> Unused Sparks roll over (up to 300)</li>
                                <li className="flex gap-3 items-start"><Check className="h-5 w-5 text-accent shrink-0" /> Best per-Spark rate{isAnnual ? ' in the system' : ''}</li>
                            </ul>
                        </div>
                    </div>

                    {}
                    <div className="flex flex-col rounded-3xl border border-border bg-surface p-8 shadow-sm lg:col-span-1 md:col-span-2 md:mt-8 lg:mt-0 xl:max-w-md xl:mx-auto">
                        <div className="mb-6">
                            <h3 className="text-2xl font-semibold text-text mb-1 flex items-center gap-2">
                                Teams <Users className="h-5 w-5 text-text/60" />
                            </h3>
                            <p className="text-sm font-medium text-blue-500 flex items-center gap-1 mb-2"><Zap size={14} fill="currentColor" /> 150 Sparks / seat / month</p>
                            <p className="text-text/60 text-sm h-10">For schools, bootcamps, and corporate training.</p>
                            <div className="mt-6 flex items-baseline gap-1">
                                <span className="text-4xl font-bold tracking-tight text-text">$18</span>
                                <span className="text-lg font-semibold text-text/60">/seat/mo</span>
                            </div>
                        </div>


                        <button
                            onClick={() => {
                                alert('Contact sales at enterprise@serify.com to set up a team plan.')
                            }}
                            className="mb-8 w-full rounded-xl bg-surface border border-border text-text py-3 px-4 font-semibold text-center transition-colors hover:bg-border/50"
                        >
                            Contact Us
                        </button>

                        <div className="flex-1">
                            <p className="font-medium text-sm text-text mb-4">Everything in Pro, plus:</p>
                            <ul className="flex flex-col gap-4 text-sm text-text/80">
                                <li className="flex gap-3 items-start"><Check className="h-5 w-5 text-text shrink-0" /> Team workspace & admin dashboard</li>
                                <li className="flex gap-3 items-start"><Check className="h-5 w-5 text-text shrink-0" /> Analytics across the entire team</li>
                                <li className="flex gap-3 items-start"><Check className="h-5 w-5 text-text shrink-0" /> Content assignment with deadlines</li>
                                <li className="flex gap-3 items-start"><Check className="h-5 w-5 text-text shrink-0" /> Consolidated billing (5 seat minimum)</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {}
                <div className="mt-16 max-w-3xl mx-auto">
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-8 text-center">
                        <Zap size={28} className="text-amber-500 mx-auto mb-3" fill="currentColor" />
                        <h3 className="text-xl font-bold text-text mb-2">Need More Sparks?</h3>
                        <p className="text-text/70 text-sm mb-5 max-w-lg mx-auto">
                            Every plan lets you buy additional Spark packs anytime. Purchased Sparks never expire — use them whenever you&apos;re ready.
                        </p>
                        <Link
                            href="/sparks"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-500 text-amber-950 font-semibold rounded-xl transition-colors shadow-sm"
                        >
                            Visit Spark Shop <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>

                {}
                <div className="mt-20 max-w-3xl mx-auto border-t border-border pt-12">
                    <h3 className="text-2xl font-semibold text-center mb-8">Frequently Asked Questions</h3>
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-semibold text-text mb-2">What are Sparks?</h4>
                            <p className="text-text/70 text-sm">Sparks are Serify&apos;s credit currency. Every AI action — from analyzing content to generating feedback — costs a small number of Sparks. Your plan includes a monthly Spark allowance, and you can always buy more in the Spark Shop.</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-text mb-2">How many Sparks does a session cost?</h4>
                            <p className="text-text/70 text-sm">A full session with 7 questions and the complete feedback report costs 13 Sparks. A basic session (without the Cognitive Analysis and Misconception Report) costs 11 Sparks. Learning modes like Flashcards and Explain It cost 1–2 Sparks each.</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-text mb-2">Do unused Sparks roll over?</h4>
                            <p className="text-text/70 text-sm">Subscription Sparks roll over to the next month, up to 2× your monthly allowance (e.g., Pro users can accumulate up to 300). Purchased top-up Sparks never expire. Trial/signup Sparks expire after 14 days.</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-text mb-2">What happens if I cancel?</h4>
                            <p className="text-text/70 text-sm">You keep access to all Pro features and your remaining Sparks until the end of your billing cycle. After that, you&apos;ll be on the Free plan with 20 Sparks/month. Your data is safe — you just lose access to Pro-only features like AI Tutor and full reports.</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-text mb-2">Can I buy Sparks without subscribing?</h4>
                            <p className="text-text/70 text-sm">Yes! Free users can purchase Spark packs from the Spark Shop at any time. Purchased Sparks never expire. However, some features (like AI Tutor and Practice Quiz) are only available on the Pro plan regardless of Spark balance.</p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
