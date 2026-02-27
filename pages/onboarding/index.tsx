import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const USER_TYPES = [
    { id: 'student', label: 'Student' },
    { id: 'professional', label: 'Professional' },
    { id: 'self_directed', label: 'Self-directed learner' },
    { id: 'educator', label: 'Educator' },
];

export default function OnboardingPersonalization() {
    const router = useRouter();
    const { user } = useAuth();

    const [selectedType, setSelectedType] = useState<string>('');
    const [learningContext, setLearningContext] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            if (user.onboardingCompleted) {
                router.push('/');
            } else if (user.userType) {
                router.push('/onboarding/how-it-works');
            }
        }
    }, [user, router]);

    const handleProceed = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!user) {
            router.push('/login');
            return;
        }

        setIsSaving(true);

        try {
            if (selectedType || learningContext) {
                const updates: any = {};
                if (selectedType) updates.user_type = selectedType;
                if (learningContext) updates.learning_context = learningContext;

                const { error } = await supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', user.id);

                if (error) {
                    console.error('Error saving personalization:', error);
                    // Non-blocking: even if it fails, let them proceed
                }
            }

            router.push('/onboarding/how-it-works');
        } catch (err) {
            console.error('Error during proceed:', err);
            router.push('/onboarding/how-it-works');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSkip = () => {
        router.push('/onboarding/how-it-works');
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6 font-sans">
            <Head>
                <title>Personalization | Serify</title>
            </Head>

            <div className="w-full max-w-[520px]">
                {/* Progress Indicator */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
                    <div className="w-2.5 h-2.5 rounded-full border border-[var(--border)]" />
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
                    <h1 className="text-2xl font-display font-medium text-[var(--text)] mb-2">Tell us about yourself</h1>
                    <p className="text-[var(--muted)] mb-8">Serify will personalize your experience.</p>

                    <form onSubmit={handleProceed} className="space-y-8">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text)] mb-4">I am a...</label>
                            <div className="space-y-3">
                                {USER_TYPES.map((type) => (
                                    <label
                                        key={type.id}
                                        className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${selectedType === type.id
                                            ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                                            : 'border-[var(--border)] hover:border-[var(--border)]/80 hover:bg-black/5'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 flex-shrink-0 ${selectedType === type.id ? 'border-[var(--accent)]' : 'border-[var(--border)]'
                                            }`}>
                                            {selectedType === type.id && <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />}
                                        </div>
                                        <span className="font-medium text-[var(--text)]">{type.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text)] mb-2">
                                I&apos;m currently learning or working on...
                            </label>
                            <input
                                type="text"
                                maxLength={200}
                                value={learningContext}
                                onChange={(e) => setLearningContext(e.target.value)}
                                placeholder="e.g. Machine learning, Bar exam prep, React development"
                                className="w-full h-12 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-[var(--border)]">
                            <button
                                type="button"
                                onClick={handleSkip}
                                className="text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors px-2 py-1"
                            >
                                Skip &rarr;
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || !user}
                                className="h-12 px-6 bg-[var(--text)] text-[var(--surface)] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <>Continue <ArrowRight size={18} /></>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
