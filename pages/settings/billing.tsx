import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import DashboardLayout from '@/components/Layout/DashboardLayout';

export default function BillingSettings() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [plan, setPlan] = useState('free');
    const [usage, setUsage] = useState({ count: 0, limit: 3 });
    const [subscription, setSubscription] = useState<any>(null);
    const [passes, setPasses] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;

        async function fetchData() {
            try {

                const { data: userData } = await supabase
                    .from('profiles')
                    .select('subscription_tier')
                    .eq('id', user!.id)
                    .single();

                setPlan(userData?.subscription_tier || 'free');

                if (userData?.subscription_tier && userData.subscription_tier !== 'free') {
                    const { data: subData } = await supabase
                        .from('subscriptions')
                        .select('*')
                        .eq('user_id', user!.id)
                        .in('status', ['active', 'trialing'])
                        .single();
                    setSubscription(subData);
                }

                if (!userData || userData.subscription_tier === 'free') {
                    const currentMonth = format(new Date(), 'yyyy-MM');
                    const { data: usageData } = await supabase
                        .from('usage')
                        .select('session_count')
                        .eq('user_id', user!.id)
                        .eq('month', currentMonth)
                        .single();

                    setUsage({ count: usageData?.session_count || 0, limit: 3 });
                }

                const { data: passesData } = await supabase
                    .from('purchases')
                    .select('*')
                    .eq('user_id', user!.id)
                    .eq('product', 'deepdive')
                    .eq('used', false)
                    .gt('expires_at', new Date().toISOString());

                setPasses(passesData || []);
            } catch (err) {
                console.error('Error fetching billing data:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [user]);

    const handleCheckout = async (priceId: string) => {
        try {
            const { data: authData } = await supabase.auth.getSession();
            const token = authData.session?.access_token;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/subscriptions/checkout', {
                method: 'POST',
                headers,
                body: JSON.stringify({ priceId }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Checkout failed:', errorText);
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

    const handleManageBilling = async () => {

        alert('Managing billing requires Stripe Customer Portal setup.');
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
                <title>Billing Settings | Serify</title>
            </Head>

            <div className="mx-auto max-w-4xl py-8">
                <h1 className="mb-8 text-3xl font-bold text-text">Billing & Subscription</h1>

                {router.query.success && (
                    <div className="mb-8 rounded-lg bg-green-500/10 p-4 text-green-500 border border-green-500/20 flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5" />
                        <p className="font-medium">Thanks for your purchase! Your account has been updated.</p>
                    </div>
                )}

                <div className="grid gap-8 md:grid-cols-2">
                    { }
                    <div className="flex flex-col gap-6">
                        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                            <h2 className="mb-4 text-lg font-semibold text-text">Current Plan</h2>

                            {plan === 'free' ? (
                                <div>
                                    <div className="mb-6">
                                        <div className="flex items-end gap-2 mb-1">
                                            <span className="text-3xl font-bold text-text">Free</span>
                                        </div>
                                        <p className="text-text/60">3 sessions/month · Basic feedback only</p>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => handleCheckout(process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY!)}
                                            className="w-full rounded-lg bg-accent py-3 px-4 font-medium text-white transition-colors hover:bg-accent/90"
                                        >
                                            Upgrade to Pro — $12/month
                                        </button>
                                        <button
                                            onClick={() => handleCheckout(process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY!)}
                                            className="w-full rounded-lg bg-surface py-3 px-4 font-medium text-accent border border-accent/20 transition-colors hover:bg-accent/5"
                                        >
                                            Upgrade to Pro Annual — $96/year (save 33%)
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="mb-6">
                                        <div className="flex items-end gap-2 mb-1">
                                            <span className="text-3xl font-bold text-text capitalize">Serify {plan}</span>
                                        </div>
                                        {subscription && (
                                            <p className="text-text/60">
                                                {subscription.cancel_at_period_end ? 'Ends' : 'Renews'} on {format(parseISO(subscription.current_period_end), 'MMMM d, yyyy')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleManageBilling}
                                            className="rounded-lg bg-surface py-2 px-4 font-medium text-text border border-border transition-colors hover:bg-border/50"
                                        >
                                            Manage Billing
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        { }
                        {passes.length > 0 && (
                            <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                                <h2 className="mb-4 text-lg font-semibold text-text">Active Passes</h2>
                                <div className="flex flex-col gap-3">
                                    {passes.map(pass => (
                                        <div key={pass.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-accent/10 p-2 text-accent rounded-md">
                                                    <Zap className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-text text-sm">Deep Dive Pass</p>
                                                    <p className="text-xs text-text/50">Expires {format(parseISO(pass.expires_at), 'MMM d, yyyy')}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-medium px-2 py-1 rounded bg-green-500/10 text-green-500">Ready to use</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    { }
                    <div className="flex flex-col gap-6">
                        {plan === 'free' && (
                            <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                                <h2 className="mb-4 text-lg font-semibold text-text">Usage This Month</h2>

                                <div className="mb-2 flex justify-between text-sm font-medium">
                                    <span className="text-text">Sessions</span>
                                    <span className="text-text/70">{usage.count} / {usage.limit} used</span>
                                </div>

                                <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                                    <div
                                        className={`h-full rounded-full transition-all ${usage.count >= usage.limit ? 'bg-red-500' : 'bg-accent'}`}
                                        style={{ width: `${Math.min(100, (usage.count / usage.limit) * 100)}%` }}
                                    />
                                </div>

                                <p className="mt-3 text-sm text-text/50">
                                    Resets on the 1st of next month
                                </p>
                            </div>
                        )}

                        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                            <h2 className="mb-4 text-lg font-semibold text-text">Features</h2>
                            <ul className="flex flex-col gap-3 text-sm text-text/80">
                                <li className="flex items-center gap-3">
                                    <div className={`p-1 rounded-full ${plan === 'free' ? 'bg-border' : 'bg-accent/20 text-accent'}`}>
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <span>{plan === 'free' ? '3 sessions per month' : 'Unlimited sessions'}</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className={`p-1 rounded-full ${plan === 'free' ? 'bg-border' : 'bg-accent/20 text-accent'}`}>
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <span>{plan === 'free' ? 'Standard reports' : 'Full Cognitive Analysis'}</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className={`p-1 rounded-full ${plan === 'free' ? 'bg-border' : 'bg-accent/20 text-accent'}`}>
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <span>{plan === 'free' ? '2 learning modes' : 'All 6 learning modes + AI Tutor'}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
