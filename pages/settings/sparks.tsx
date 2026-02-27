import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Zap, ArrowLeft, ArrowDownRight, ArrowUpRight, Clock } from 'lucide-react';
import { useSparks } from '@/hooks/useSparks';

type Transaction = {
    id: string;
    amount: number;
    transaction_type: 'grant' | 'purchase' | 'deduction' | 'refund' | 'expiry';
    description: string;
    created_at: string;
};

export default function SparkHistory() {
    const { user } = useAuth();
    const { balance } = useSparks();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchHistory() {
            if (!user) return;
            try {
                const { data, error } = await supabase
                    .from('spark_transactions')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (error) throw error;
                setTransactions(data as Transaction[]);
            } catch (err) {
                console.error("Failed to fetch spark history", err);
            } finally {
                setLoading(false);
            }
        }

        fetchHistory();
    }, [user]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(date);
    };

    const formatLabel = (label: string) => {
        if (!label) return 'Unknown Action';
        const labels: Record<string, string> = {
            'session_ingestion': 'Content Extraction',
            'question_generation': 'Generated Assessment',
            'session_basic_analysis': 'Basic Feedback Report',
            'session_full_analysis': 'Full Feedback Report',
            'flow_generate_plan': 'Flow Mode Plan',
            'flow_evaluate_answer': 'Flow Mode Evaluation',
            'flow_generate_content': 'Flow Mode Question',
            'flashcard_generation': 'Flashcard Deck',
            'practice_quiz_gen': 'Practice Quiz',
            'explain_it_to_me': 'AI Explanation',
            'ai_tutor_open': 'AI Tutor Session',
            'ai_tutor_message': 'Tutor Response',
            'concept_deep_dive': 'Concept Deep Dive',
            'feynman_submission': 'Feynman Challenge',
            'signup_grant': 'Welcome Bonus',
            'purchase': 'Sparks Purchase',
            'refund': 'Sparks Refund',
            'manual_grant': 'Bonus Sparks'
        };
        return labels[label] || label.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    return (
        <DashboardLayout>
            <Head>
                <title>Spark History | Serify</title>
            </Head>

            <div className="max-w-4xl mx-auto w-full px-6 md:px-10 py-8 space-y-10 pb-24">

                <header>
                    <Link href="/settings" className="inline-flex items-center text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] mb-6 transition-colors">
                        <ArrowLeft size={16} className="mr-1" />
                        Back to Settings
                    </Link>
                    <h1 className="text-3xl font-display text-[var(--text)] mb-2 flex items-center gap-3">
                        <Zap className="text-amber-500" size={28} fill="currentColor" /> Spark History
                    </h1>
                    <p className="text-[var(--muted)]">View your recent Spark transactions and usage.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wider mb-1">Current Balance</h3>
                            <div className="text-3xl font-display font-bold text-[var(--text)] flex items-center gap-2">
                                {loading || !balance ? (
                                    <div className="h-9 w-12 bg-[var(--border)] rounded animate-pulse" />
                                ) : (
                                    balance.total_sparks
                                )}
                                <span>Sparks</span>
                            </div>
                        </div>
                        <Link href="/sparks" className="px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-sm font-bold transition-colors">
                            Get More
                        </Link>
                    </div>

                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
                        <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wider mb-1">Status</h3>
                        <div className="text-lg font-medium text-[var(--text)]">
                            {user?.plan === 'pro' ? 'Pro Member (Unlimited/500 mo)' : 'Free Tier'}
                        </div>
                        {balance && balance.trial_sparks > 0 && (
                            <div className="text-sm text-[var(--muted)] mt-1">
                                Includes {balance.trial_sparks} trial Sparks expiring soon
                            </div>
                        )}
                    </div>
                </div>

                <section className="space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--muted)]">Recent Activity</h2>

                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
                        {loading ? (
                            <div className="divide-y divide-[var(--border)]">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="p-6 animate-pulse flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full bg-[var(--border)]" />
                                            <div className="space-y-2">
                                                <div className="h-4 w-32 bg-[var(--border)] rounded" />
                                                <div className="h-3 w-24 bg-[var(--border)] rounded" />
                                            </div>
                                        </div>
                                        <div className="h-6 w-10 bg-[var(--border)] rounded" />
                                    </div>
                                ))}
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="p-12 text-center text-[var(--muted)] flex items-center justify-center flex-col">
                                <Clock size={48} className="mb-4 opacity-20" />
                                <p>No Spark transactions found.</p>
                                <p className="text-sm mt-2">Start a learning session to use Sparks.</p>
                            </div>
                        ) : (
                            transactions.map((tx) => {
                                const isPositive = ['grant', 'purchase', 'refund'].includes(tx.transaction_type);

                                return (
                                    <div key={tx.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-black/5 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className={`mt-1 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                                {isPositive ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-[var(--text)] text-sm sm:text-base">{formatLabel(tx.description || tx.transaction_type)}</p>
                                                <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">{formatDate(tx.created_at)}</p>
                                            </div>
                                        </div>
                                        <div className={`font-display font-bold text-lg whitespace-nowrap ${isPositive ? 'text-green-600' : 'text-[var(--text)]'}`}>
                                            {isPositive ? '+' : ''}{tx.amount}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>
        </DashboardLayout>
    );
}
