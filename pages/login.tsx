import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SEO from '@/components/Layout/SEO';
import { ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
    const router = useRouter();
    const { user, login, loginWithGoogle } = useAuth();
    const mounted = useRef(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {

        if (user && !isLoading) {
            if (!user.onboardingCompleted) {
                router.push('/onboarding');
            } else {
                router.push('/');
            }
        }
    }, [user, router, isLoading]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const loggedInUser = await login(email, password);
            if (loggedInUser) {
                if (!loggedInUser.onboardingCompleted) {
                    router.push('/onboarding');
                } else {
                    router.push('/');
                }
            }


            setTimeout(() => {
                if (mounted.current) setIsLoading(false);
            }, 5000);
        } catch (err: any) {
            if (mounted.current) {
                setError(err.message || 'Failed to log in. Please check your credentials.');
                setIsLoading(false);
            }
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await loginWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Google login failed.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col justify-center items-center p-6 font-mono relative overflow-hidden">
            <div className="absolute inset-0 hatch-bg pointer-events-none" />
            <SEO
                title="Log In"
                description="Log in to Serify to access your personalized learning dashboard and concept vault."
            />

            <div className="w-full max-w-sm relative z-10 animate-fade-in">
                <div className="mb-10 text-center">
                    <Link href="/" className="inline-block text-4xl font-display font-bold text-[var(--text)]">Serify</Link>
                    <p className="text-[11px] font-mono text-[var(--muted)] mt-2">{'// welcome back'}</p>
                </div>

                <div className="paper-card p-8">
                    {error && (
                        <div className="mb-6 p-3 border-2 border-[var(--warn)] bg-[var(--warn)]/5 flex items-start gap-3 text-[var(--warn)] text-[12px] font-mono animate-fade-in" style={{ boxShadow: 'var(--shadow-hard-sm)' }}>
                            <AlertCircle size={15} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-[9px] font-mono text-[var(--muted)] uppercase tracking-widest mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-paper"
                                required
                                disabled={isLoading}
                                placeholder="name@example.com"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-[9px] font-mono text-[var(--muted)] uppercase tracking-widest">Password</label>
                                <Link href="/forgot-password" className="text-[10px] font-mono text-[var(--accent)] hover:underline">Forgot?</Link>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-paper pr-10"
                                    required
                                    disabled={isLoading}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full justify-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Log In <ArrowRight size={15} /></>}
                        </button>
                    </form>

                    <div className="my-6 flex items-center gap-3">
                        <div className="flex-1 border-b-2 border-[var(--border-soft)]" />
                        <span className="text-[9px] font-mono text-[var(--muted)] uppercase tracking-widest">or</span>
                        <div className="flex-1 border-b-2 border-[var(--border-soft)]" />
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="btn-secondary w-full justify-center disabled:opacity-50"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </button>
                </div>

                <p className="text-center text-[11px] font-mono text-[var(--muted)] mt-8">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="text-[var(--accent)] hover:underline">sign up</Link>
                </p>
            </div>
        </div>
    );
}
