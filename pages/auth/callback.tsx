import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => ({
    props: {},
});

export default function AuthCallback() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    const { user, loading } = useAuth();
    const { error: queryError, error_description } = router.query;

    useEffect(() => {
        if (queryError) {
            setError(error_description?.toString() || queryError.toString() || 'Authentication failed');
        }
    }, [queryError, error_description]);

    useEffect(() => {
        const isOAuthParams = 
            window.location.hash.includes('access_token=') || 
            window.location.hash.includes('id_token=') ||
            window.location.search.includes('code=');

        const timeout = setTimeout(() => {
            console.log(
                'AuthCallback: 20s global timeout reached. user:',
                !!user,
                'loading:',
                loading
            );
            if (!user && !isOAuthParams) {
                console.log('AuthCallback: Timeout reached, no user, redirecting to login');
                router.push('/login?error=OAuthTimeout');
            }
        }, 20000);

        if (!loading) {
            console.log('AuthCallback: Loading complete. user:', !!user, 'isOAuthParams:', isOAuthParams);
            if (user) {
                console.log('AuthCallback: User found, redirecting home');
                router.push('/');
            } else if (!isOAuthParams) {
                
                
                console.log('AuthCallback: No user found, no OAuth params, redirecting to login');
                router.push('/login');
            } else {
                console.log('AuthCallback: Loading stopped but OAuth params present, waiting for listener...');
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
