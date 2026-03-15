import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Activity, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import GeneratingAnimation from '@/components/GeneratingAnimation';

export default function ScenarioGenerator() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!router.isReady) return;

        const { topic, concepts } = router.query;

        const generateScenario = async () => {
             try {
                 const payload: any = {};
                 if (topic) {
                     payload.topic = topic;
                 } else if (concepts) {
                     payload.conceptIds = (concepts as string).split(',');
                 } else {
                     setError("No topic or concepts provided.");
                     return;
                 }

                 const { data: { session } } = await supabase.auth.getSession();
                 const res = await fetch('/api/practice/scenario/generate', {
                     method: 'POST',
                     headers: { 
                         'Content-Type': 'application/json',
                         Authorization: `Bearer ${session?.access_token}`
                     },
                     body: JSON.stringify(payload)
                 });

                 const data = await res.json();

                 if (!res.ok) {
                     throw new Error(data.error || 'Failed to generate scenario');
                 }

                 // Redirect to the active session
                 router.replace(`/practice/scenario/${data.sessionId}`);

             } catch (err: any) {
                 setError(err.message);
             }
        };

        generateScenario();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.isReady]);

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 shadow-sm text-center space-y-4">
                    <p className="font-semibold text-lg">Generation Failed</p>
                    <p className="text-sm opacity-90">{error}</p>
                    <button 
                        onClick={() => router.push('/practice')}
                        className="px-6 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition"
                    >
                        Return to Practice
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6 relative overflow-hidden">
            <Head>
                <title>Building Scenario | Serify</title>
            </Head>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[100px] -z-10" />

            <div className="text-center space-y-8 animate-fade-in-up">
                <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-purple-50 border border-purple-100 shadow-sm">
                    <Activity size={40} className="text-purple-600 relative z-10" />
                    <Sparkles size={20} className="text-purple-400 absolute -top-2 -right-2 animate-pulse" />
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-display text-[var(--text)] tracking-tight">
                        Crafting a Real-World Scenario...
                    </h1>
                    <p className="text-[var(--muted)] text-lg">
                        Finding the perfect messy problem for you to solve.
                    </p>
                </div>

                <div className="pt-4 w-full max-w-sm">
                    <GeneratingAnimation type="text" />
                </div>
            </div>
        </div>
    );
}
