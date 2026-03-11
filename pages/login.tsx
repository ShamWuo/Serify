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
        // Only redirect automatically if we aren't currently in the middle of a login attempt
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
            
            // Fallback: clear loading after 5s if redirect doesn't happen
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
        <div className="min-h-screen bg-[var(--bg)] flex flex-col justify-center items-center p-6 font-sans relative overflow-hidden page-transition">
            {/* Decorative blobs */}
            <div className="auth-bg-blob w-[500px] h-[500px] bg-[var(--accent)] top-[-150px] right-[-100px]" />
            <div className="auth-bg-blob w-[400px] h-[400px] bg-[#7c3d9e] bottom-[-100px] left-[-100px]" />
            <div className="auth-bg-blob w-[300px] h-[300px] bg-[#b8860b] top-[40%] left-[60%]" />
            <SEO title="Log In" />

            <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
                <div className="mb-10 text-center">
                    <Link
                        href="/"
                        className="inline-block text-3xl font-display font-medium text-[var(--text)]"
                    >
                        Serify
                    </Link>
                    <p className="text-[var(--muted)] text-sm mt-3">
                        Welcome back. Let&apos;s reflect.
                    </p>
                </div>

                <div className="premium-card border border-[var(--border)] rounded-2xl p-8 shadow-lg">
                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm animate-fade-in">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-12 px-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none input-focus-ring transition-all"
                                required
                                disabled={isLoading}
                                placeholder="name@example.com"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
                                    Password
                                </label>
                                <Link
                                    href="#"
                                    className="text-xs text-[var(--accent)] hover:underline"
                                >
                                    Forgot?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-12 px-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none input-focus-ring transition-all pr-12"
                                    required
                                    disabled={isLoading}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="relative overflow-hidden w-full h-12 bg-gradient-to-r from-[var(--accent)] to-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-95 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--accent)]/25 transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none group"
                        >
                            <span className="absolute inset-0 w-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />
                            {isLoading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    Log In <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 flex items-center justify-between before:content-[''] before:flex-1 before:border-b before:border-[var(--border)] before:mr-4 after:content-[''] after:flex-1 after:border-b after:border-[var(--border)] after:ml-4">
                        <span className="text-xs text-[var(--muted)] uppercase tracking-wider font-bold">
                            Or continue with
                        </span>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full h-12 bg-white border border-[var(--border)] rounded-xl font-medium text-[var(--text)] flex items-center justify-center gap-3 hover:bg-black/5 transition-colors mt-6 shadow-sm disabled:opacity-50"
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Google
                    </button>
                </div>

                <p className="text-center text-sm text-[var(--muted)] mt-8">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="text-[var(--text)] font-medium hover:underline">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
