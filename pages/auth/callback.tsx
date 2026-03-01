import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    const { user, loading } = useAuth();

    useEffect(() => {
        const timeout = setTimeout(() => {
            console.log(
                'AuthCallback: 15s global timeout reached. user:',
                !!user,
                'loading:',
                loading
            );
            if (!user) {
                console.log('AuthCallback: Timeout reached, no user, redirecting to login');
                router.push('/login?error=OAuthTimeout');
            }
        }, 15000);

        if (!loading) {
            console.log('AuthCallback: Loading complete. user:', !!user);
            if (user) {
                console.log('AuthCallback: User found, redirecting home');
                router.push('/');
            } else {
                console.log('AuthCallback: No user found, redirecting to login');
                router.push('/login');
            }
        }

        return () => clearTimeout(timeout);
    }, [user, loading, router]);

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6 font-sans">
            <div className="text-center space-y-6">
                <div className="text-3xl font-display text-[var(--text)]">Serify</div>

                {error ? (
                    <div className="space-y-4">
                        <p className="text-red-500 font-medium">Authentication Failed</p>
                        <p className="text-sm text-[var(--muted)]">{error}</p>
                        <button
                            onClick={() => router.push('/login')}
                            className="px-6 py-2 bg-[var(--text)] text-[var(--surface)] rounded-xl font-bold"
                        >
                            Back to Login
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
                        <p className="text-[var(--muted)] animate-pulse">
                            Initializing your session...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
