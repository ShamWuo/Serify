import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Loader2, Zap } from 'lucide-react';

export default function OnboardingHowItWorks() {
    const router = useRouter();
    const { user, markOnboardingComplete } = useAuth();
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user && user.onboardingCompleted) {
            router.push('/');
        }
    }, [user, router]);

    const getHeadline = () => {
        if (!user || !user.userType) {
            return "Here's how Serify works.";
        }
        switch (user.userType) {
            case 'student':
                return 'Serify helps you find out what you actually understood before the exam.';
            case 'professional':
                return 'Serify helps you verify what actually stuck from what you read and studied.';
            case 'self_directed':
                return 'Serify shows you the gap between what you consumed and what you understood.';
            case 'educator':
                return 'Serify helps you experience learning the way your students do.';
            default:
                return "Here's how Serify works.";
        }
    };

    const handleStart = async () => {
        setIsSaving(true);
        try {
            await markOnboardingComplete();
            router.push('/'); // Redirecting to '/' means going to DashboardLayout and displaying index.tsx
        } catch (err) {
            console.error('Failed to complete onboarding:', err);
            // Handle error minimally or proceed anyway
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6 font-sans">
            <Head>
                <title>How It Works | Serify</title>
            </Head>

            <div className="w-full max-w-[560px]">
                {/* Progress Indicator */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-2.5 h-2.5 rounded-full border border-[var(--border)]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
                    <h1 className="text-2xl font-display font-medium text-[var(--text)] mb-8 text-center px-4">
                        {getHeadline()}
                    </h1>

                    <div className="space-y-4 mb-8">
                        <div className="border border-[var(--border)] rounded-xl p-5 flex gap-4">
                            <div className="text-sm font-bold text-[var(--muted)] shrink-0 w-6">
                                01
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--text)] mb-1">
                                    Paste anything you&apos;ve been learning from
                                </h3>
                                <p className="text-sm text-[var(--muted)]">
                                    A YouTube video, article, PDF, or your own notes. Serify reads
                                    it.
                                </p>
                            </div>
                        </div>

                        <div className="border border-[var(--border)] rounded-xl p-5 flex gap-4">
                            <div className="text-sm font-bold text-[var(--muted)] shrink-0 w-6">
                                02
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--text)] mb-1">
                                    Answer questions about it
                                </h3>
                                <p className="text-sm text-[var(--muted)]">
                                    Not a quiz. Serify asks you to explain things in your own words.
                                    No right or wrong format.
                                </p>
                            </div>
                        </div>

                        <div className="border border-[var(--border)] rounded-xl p-5 flex gap-4">
                            <div className="text-sm font-bold text-[var(--muted)] shrink-0 w-6">
                                03
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--text)] mb-1">
                                    See what you actually understood
                                </h3>
                                <p className="text-sm text-[var(--muted)]">
                                    A detailed map of what landed, what was shallow, and where your
                                    knowledge has gaps. Your Concept Vault starts here.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-1 mb-8">
                        <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm">
                            <Zap size={16} fill="currentColor" className="text-amber-500" />
                            <span>Your 15 Sparks are ready.</span>
                        </div>
                        <p className="text-sm text-[var(--muted)]">
                            First session takes about 5 minutes.
                        </p>
                    </div>

                    <button
                        onClick={handleStart}
                        disabled={isSaving}
                        className="w-full h-12 bg-[var(--text)] text-[var(--surface)] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>
                                Analyze something now <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
