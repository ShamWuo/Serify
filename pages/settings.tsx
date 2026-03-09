import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useSparks } from '@/hooks/useSparks';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    User,
    Bell,
    Download,
    Trash2,
    Cpu,
    CreditCard,
    ChevronRight,
    Zap,
    Mail,
    Layout,
    Bot
} from 'lucide-react';

export default function Settings() {
    const { user, loading: authLoading } = useAuth();
    const { balance, loading: sparksLoading } = useSparks();
    const loading = authLoading || sparksLoading;
    const [notificationsActive, setNotificationsActive] = useState(true);
    const [aiTutorEnabled, setAiTutorEnabled] = useState(false);

    useEffect(() => {
        if (user?.subscriptionTier === 'pro') {
            setAiTutorEnabled(true);
        } else {
            setAiTutorEnabled(false);
        }
    }, [user?.subscriptionTier]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto w-full px-6 md:px-10 py-6 space-y-8 pb-24 animate-pulse">
                    <div className="h-10 w-48 bg-[var(--border)] rounded-xl" />
                    <div className="space-y-4">
                        <div className="h-4 w-24 bg-[var(--border)] rounded" />
                        <div className="h-32 bg-[var(--surface)] border border-[var(--border)] rounded-2xl" />
                    </div>
                    <div className="space-y-4">
                        <div className="h-4 w-48 bg-[var(--border)] rounded" />
                        <div className="h-64 bg-[var(--surface)] border border-[var(--border)] rounded-2xl" />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <Head>
                <title>Settings | Serify</title>
            </Head>

            <div className="max-w-4xl mx-auto w-full px-6 md:px-10 py-6 space-y-8 pb-24 animate-fade-in-up">
                <header>
                    <h1 className="text-3xl font-display text-[var(--text)] font-semibold tracking-tight">Settings</h1>
                    <p className="text-sm text-[var(--muted)] mt-1">Manage your account, preferences, and billing.</p>
                </header>

                <section className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
                        <User size={12} className="opacity-60" /> Account
                    </h2>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)] shadow-sm">
                        <div className="p-4 flex items-center justify-between bg-gradient-to-r from-[var(--accent)]/5 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent)] to-emerald-700 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-[var(--accent)]/20 shrink-0">
                                    {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-[var(--text)]">
                                        {user?.displayName || 'User'}
                                    </h3>
                                    <p className="text-[var(--muted)] text-sm">
                                        {user?.email || 'user@example.com'}
                                    </p>
                                </div>
                            </div>
                            <button className="px-4 py-2 border border-[var(--border)] rounded-xl text-sm font-medium hover:bg-[var(--accent)]/5 hover:border-[var(--accent)]/30 transition-all">
                                Edit Profile
                            </button>
                        </div>
                        <div className="p-4 hover:bg-[var(--accent)]/5 cursor-pointer flex items-center justify-between transition-all row-hover-accent hover:shadow-sm">
                            <div className="flex items-center gap-3 font-medium">
                                <User size={18} className="text-[var(--muted)]" /> Change Password
                            </div>
                            <div className="flex items-center text-[var(--muted)] text-sm">
                                ●●●●●●●● <ChevronRight size={16} className="ml-2" />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
                        <Cpu size={12} className="opacity-60" /> Learning Preferences
                    </h2>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)] shadow-sm">
                        <div
                            className="p-4 flex items-center justify-between hover:bg-black/5 cursor-default transition-all row-hover-accent"
                        >
                            <div>
                                <h3 className="font-bold flex items-center gap-3">
                                    <Layout size={18} className="text-[var(--accent)]" /> Default
                                    Learning Method
                                </h3>
                                <p className="text-sm text-[var(--muted)] mt-1 ml-7">
                                    Standard Mode (Default)
                                </p>
                            </div>
                            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider bg-black/5 px-2 py-1 rounded">Locked</span>
                        </div>

                        <div className="p-4 flex items-center justify-between hover:bg-black/5 cursor-pointer transition-colors">
                            <div>
                                <h3 className="font-bold flex items-center gap-3 text-[var(--text)]">
                                    <Bot size={18} className="text-[var(--accent)]" /> AI Tutor &
                                    Guidance
                                    {user?.subscriptionTier !== 'pro' && (
                                        <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tight ml-2">
                                            Pro
                                        </span>
                                    )}
                                </h3>
                                <p className="text-sm text-[var(--muted)] mt-1 ml-7 leading-relaxed max-w-md">
                                    {user?.subscriptionTier === 'pro'
                                        ? 'Personalized AI coaching and active guidance enabled during sessions.'
                                        : 'Unlock personalized AI coaching and active-recall guidance with Serify Pro.'}
                                </p>
                            </div>
                            <label
                                className={`relative inline-flex items-center ${user?.subscriptionTier === 'pro' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                            >
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    disabled={user?.subscriptionTier !== 'pro'}
                                    defaultChecked={user?.subscriptionTier === 'pro'}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                            </label>
                        </div>

                        <div className="p-4 flex items-center justify-between hover:bg-black/5 cursor-pointer transition-colors row-hover-accent">
                            <div>
                                <h3 className="font-bold flex items-center gap-3">
                                    <Bell size={18} className="text-[var(--shallow)]" />{' '}
                                    Notifications
                                </h3>
                                <p className="text-sm text-[var(--muted)] mt-1 ml-7 leading-relaxed max-w-md">
                                    {notificationsActive
                                        ? 'You will receive weekly summaries of your learning progress and mastery achievements.'
                                        : 'Notifications are currently paused. You won\'t receive weekly activity digests.'}
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={notificationsActive}
                                    onChange={(e) => setNotificationsActive(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                            </label>
                        </div>
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
                        <CreditCard size={12} className="opacity-60" /> Subscription &amp; Billing
                    </h2>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)] shadow-sm">
                        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[var(--accent)]/5 to-transparent">
                            <div>
                                <h3 className="font-bold flex items-center gap-3 text-[var(--text)]">
                                    <CreditCard size={18} className="text-[var(--accent)]" /> Current
                                    Plan: <span className={user?.plan === 'pro' ? 'text-[var(--accent)]' : 'text-[var(--text)]'}>{user?.plan === 'pro' ? 'Pro Tier' : 'Free Tier'}</span>
                                </h3>
                                <p className="text-sm text-[var(--muted)] mt-1 ml-7">
                                    {user?.plan === 'pro'
                                        ? 'Unlimited sessions. Full Knowledge Graph.'
                                        : '3 sessions per month. No Knowledge Graph.'}
                                </p>
                            </div>
                            <button
                                onClick={() => (window.location.href = '/pricing')}
                                className="px-5 py-2.5 bg-gradient-to-r from-[var(--accent)] to-emerald-600 text-white rounded-xl text-sm font-bold hover:opacity-90 hover:shadow-lg hover:shadow-[var(--accent)]/20 hover:-translate-y-0.5 transition-all shrink-0 shadow-md shadow-[var(--accent)]/10"
                            >
                                {user?.plan === 'pro' ? 'Manage Plan' : 'Upgrade to Pro'}
                            </button>
                        </div>
                        <Link
                            href="/settings/sparks"
                            className="p-4 hover:bg-black/5 cursor-pointer flex items-center justify-between transition-colors block"
                        >
                            <div className="flex items-center gap-3 font-medium">
                                <Zap size={18} className="text-amber-500" fill="currentColor" />{' '}
                                Spark History & Balance
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                    {balance?.total_sparks || 0} Sparks
                                </span>
                                <ChevronRight size={16} className="text-[var(--muted)]" />
                            </div>
                        </Link>
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
                        <Download size={12} className="opacity-60" /> Data &amp; Privacy
                    </h2>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)] shadow-sm">
                        <div className="p-4 hover:bg-amber-50/50 cursor-pointer flex items-center justify-between transition-all group row-hover-accent">
                            <div className="flex items-center gap-3 font-medium text-[var(--muted)] group-hover:text-amber-700">
                                <Download size={18} /> Export Session Data
                            </div>
                            <ChevronRight size={16} className="text-[var(--muted)] group-hover:text-amber-700" />
                        </div>
                        <div className="p-4 hover:bg-red-50 cursor-pointer flex items-center justify-between transition-all group row-hover-accent">
                            <div className="flex items-center gap-3 font-medium text-red-600">
                                <Trash2 size={18} /> Delete Account
                            </div>
                            <span className="text-xs font-bold text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">Permanently remove all data</span>
                        </div>
                    </div>
                </section>
            </div >
        </DashboardLayout >
    );
}
