import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
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
    const { user } = useAuth();
    const [notificationsActive, setNotificationsActive] = useState(true);
    const [aiTutorEnabled, setAiTutorEnabled] = useState(false);

    useEffect(() => {
        if (user?.subscriptionTier === 'pro') {
            setAiTutorEnabled(true);
        } else {
            setAiTutorEnabled(false);
        }
    }, [user?.subscriptionTier]);

    return (
        <DashboardLayout>
            <Head>
                <title>Settings | Serify</title>
            </Head>

            <div className="max-w-4xl mx-auto w-full px-6 md:px-10 py-6 space-y-8 pb-24">
                <header>
                    <h1 className="text-3xl font-display text-[var(--text)]">Settings</h1>
                </header>

                <section className="space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--muted)]">
                        Account
                    </h2>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-base font-bold">
                                    {user?.displayName?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">
                                        {user?.displayName || 'User'}
                                    </h3>
                                    <p className="text-[var(--muted)] text-sm">
                                        {user?.email || 'user@example.com'}
                                    </p>
                                </div>
                            </div>
                            <button className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-black/5">
                                Change Photo
                            </button>
                        </div>
                        <div className="p-4 hover:bg-black/5 cursor-pointer flex items-center justify-between transition-colors">
                            <div className="flex items-center gap-3 font-medium">
                                <User size={18} className="text-[var(--muted)]" /> Password
                            </div>
                            <div className="flex items-center text-[var(--muted)]">
                                •••••••• <ChevronRight size={16} className="ml-2" />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--muted)]">
                        Learning Preferences
                    </h2>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
                        <Link
                            href="/pricing"
                            className="p-4 flex items-center justify-between hover:bg-black/5 cursor-pointer transition-colors block"
                        >
                            <div>
                                <h3 className="font-bold flex items-center gap-3">
                                    <Cpu size={18} className="text-[var(--accent)]" /> Default
                                    Learning Method
                                </h3>
                                <p className="text-sm text-[var(--muted)] mt-1 ml-7">
                                    Standard Mode
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-[var(--muted)]" />
                        </Link>

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
                                <p className="text-sm text-[var(--muted)] mt-1 ml-7">
                                    {user?.subscriptionTier === 'pro'
                                        ? 'Personalized AI coaching enabled'
                                        : 'Requires Serify Pro'}
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

                        <div className="p-4 flex items-center justify-between hover:bg-black/5 cursor-pointer transition-colors">
                            <div>
                                <h3 className="font-bold flex items-center gap-3">
                                    <Bell size={18} className="text-[var(--shallow)]" />{' '}
                                    Notifications
                                </h3>
                                <p className="text-sm text-[var(--muted)] mt-1 ml-7">
                                    {notificationsActive
                                        ? 'Weekly digest active'
                                        : 'Notifications paused'}
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

                <section className="space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--muted)]">
                        Subscription & Billing
                    </h2>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
                        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-bold flex items-center gap-3">
                                    <CreditCard size={18} className="text-[var(--text)]" /> Current
                                    Plan: {user?.plan === 'pro' ? 'Pro Tier' : 'Free Tier'}
                                </h3>
                                <p className="text-sm text-[var(--muted)] mt-1 ml-7">
                                    {user?.plan === 'pro'
                                        ? 'Unlimited sessions. Full Knowledge Graph.'
                                        : '3 sessions per month. No Knowledge Graph.'}
                                </p>
                            </div>
                            <button
                                onClick={() => (window.location.href = '/pricing')}
                                className="px-5 py-2.5 bg-[var(--text)] text-[var(--surface)] rounded-lg text-sm font-bold hover:bg-black/80 transition-colors shrink-0"
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
                            <ChevronRight size={16} className="text-[var(--muted)]" />
                        </Link>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--muted)]">
                        Data & Privacy
                    </h2>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
                        <div className="p-4 hover:bg-black/5 cursor-pointer flex items-center justify-between transition-colors">
                            <div className="flex items-center gap-3 font-medium">
                                <Download size={18} className="text-[var(--text)]" /> Export Session
                                Data
                            </div>
                            <ChevronRight size={16} className="text-[var(--muted)]" />
                        </div>
                        <div className="p-4 hover:bg-red-50 cursor-pointer flex items-center justify-between transition-colors group">
                            <div className="flex items-center gap-3 font-medium text-red-600">
                                <Trash2 size={18} /> Delete Account
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </DashboardLayout>
    );
}
