import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FileText, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import GeneratingAnimation from '@/components/GeneratingAnimation';

export default function ComprehensiveGenerator() {
    const router = useRouter();
    const { token, loading: authLoading } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isTriggered, setIsTriggered] = useState(false);

    useEffect(() => {
        if (!router.isReady || authLoading || isTriggered) return;
        
        if (!token) return;

        const { topic, concepts, diff } = router.query;

        const generateTest = async () => {
             try {
                 const payload: any = { difficulty: diff || 'auto' };
                 if (topic) {
                     payload.topic = topic;
                 } else if (concepts) {
                     payload.conceptIds = (concepts as string).split(',');
                 } else {
                     setError("No topic or concepts provided.");
                     return;
                 }

                 setIsTriggered(true);
                 const res = await fetch('/api/practice/comprehensive/generate', {
                     method: 'POST',
                     headers: { 
                         'Content-Type': 'application/json',
                         Authorization: `Bearer ${token}`
                     },
                     body: JSON.stringify(payload)
                 });

                 const data = await res.json();

                 if (!res.ok) {
                     throw new Error(data.error || 'Failed to generate test');
                 }

                 // Redirect to the active session
                 router.replace(`/practice/comprehensive/${data.sessionId}`);

             } catch (err: any) {
                 setError(err.message);
                 setIsTriggered(false);
             }
        };

        generateTest();
    }, [router.isReady, authLoading, token, isTriggered, router]);

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
                <title>Generating Test | Serify</title>
            </Head>

            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[100px] -z-10" />

            <div className="text-center space-y-8 animate-fade-in-up">
                <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-indigo-50 border border-indigo-100 shadow-sm">
                    <FileText size={40} className="text-indigo-600 relative z-10" />
                    <Sparkles size={20} className="text-indigo-400 absolute -top-2 -right-2 animate-pulse" />
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-display text-[var(--text)] tracking-tight">
                        Warming up Practice Test...
                    </h1>
                    <p className="text-[var(--muted)] text-lg">
                        Assembling MCQ, SAQ, and Scenario questions.
                    </p>
                </div>

                <div className="pt-4 w-full max-w-sm">
                    <GeneratingAnimation type="exam" />
                </div>
            </div>
        </div>
    );
}
