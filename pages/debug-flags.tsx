import React from 'react';
import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useFeatureFlags, FeatureFlag } from '@/contexts/FeatureFlagContext';
import { useAuth } from '@/contexts/AuthContext';
import { Flag, Shield, Info, CheckCircle, XCircle } from 'lucide-react';

export default function DebugFlags() {
    const { flags, isLoading } = useFeatureFlags();
    const { user } = useAuth();

    return (
        <DashboardLayout hideWidgets={true}>
            <Head>
                <title>Feature Flags Debug | Serify</title>
            </Head>

            <div className="max-w-4xl mx-auto w-full px-6 md:px-10 py-10 space-y-10 animate-fade-in">
                <header className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                            <Flag size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-display font-bold tracking-tight">Feature Flags</h1>
                            <p className="text-[var(--muted)]">Inspect and debug active feature flags for your session.</p>
                        </div>
                    </div>
                </header>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
                            <Shield size={14} /> Session Context
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--muted)]">User ID:</span>
                                <span className="font-mono font-medium truncate ml-4 max-w-[200px]">{user?.id || 'Anonymous'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--muted)]">Email:</span>
                                <span className="font-medium">{user?.email || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--muted)]">Status:</span>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold uppercase tracking-tight border border-emerald-500/20">
                                    {isLoading ? 'Loading...' : 'Active'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
                            <Info size={14} /> Flag Statistics
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                                <div className="text-2xl font-bold text-indigo-500">{flags.length}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-500/60 mt-1">Enabled Flags</div>
                            </div>
                            <div className="text-center p-4 bg-[var(--background)] border border-[var(--border)] rounded-2xl">
                                <div className="text-2xl font-bold">1.0.0</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mt-1">System Version</div>
                            </div>
                        </div>
                    </div>
                </div>

                <section className="space-y-4">
                    <h2 className="text-lg font-bold">Active Flags</h2>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden divide-y divide-[var(--border)] shadow-sm">
                        {isLoading ? (
                            <div className="p-10 text-center text-[var(--muted)] animate-pulse">Loading flags...</div>
                        ) : flags.length === 0 ? (
                            <div className="p-10 text-center text-[var(--muted)]">
                                <XCircle size={32} className="mx-auto mb-3 opacity-20" />
                                No flags currently enabled for this session.
                            </div>
                        ) : (
                            flags.map(flag => (
                                <div key={flag} className="p-5 flex items-center justify-between hover:bg-[var(--accent)]/5 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        <div>
                                            <code className="text-sm font-bold bg-[var(--background)] px-2 py-1 rounded-lg border border-[var(--border)] group-hover:border-emerald-500/30 transition-colors">
                                                {flag}
                                            </code>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest">
                                        <CheckCircle size={14} /> Enabled
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className="space-y-6 pt-6">
                    <h2 className="text-lg font-bold">Example: Declarative Wrapper</h2>
                    
                    <div className="p-8 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 rounded-[2rem] shadow-inner text-center">
                        <FeatureFlag 
                            flag="experimental_flow_mode" 
                            fallback={
                                <div className="space-y-4">
                                    <div className="inline-flex p-3 bg-red-500/10 rounded-2xl text-red-500 mb-2">
                                        <XCircle size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-red-500">Experimental Flow Mode is OFF</h3>
                                    <p className="text-[var(--muted)] max-w-sm mx-auto">
                                        This content is only visible when the <code className="text-xs bg-red-500/5 px-1 rounded border border-red-500/10 text-red-600">experimental_flow_mode</code> flag is enabled.
                                    </p>
                                </div>
                            }
                        >
                            <div className="space-y-4 animate-bounce-soft">
                                <div className="inline-flex p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 mb-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-emerald-500">Experimental Flow Mode is ON</h3>
                                <p className="text-[var(--muted)] max-w-sm mx-auto">
                                    You are seeing this because the <code className="text-xs bg-emerald-500/5 px-1 rounded border border-emerald-500/10 text-emerald-600">experimental_flow_mode</code> flag is enabled for your user ID.
                                </p>
                            </div>
                        </FeatureFlag>
                    </div>
                </section>
            </div>
        </DashboardLayout>
    );
}
