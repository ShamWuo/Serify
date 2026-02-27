import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Signup() {
    const router = useRouter();
    const { user, register, loginWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (user) {
            if (!user.onboardingCompleted) {
                router.push('/onboarding');
            } else {
                router.push('/');
            }
        }
    }, [user, router]);

    const getPasswordStrength = (pass: string) => {
        if (!pass) return '';
        if (pass.length < 8) return 'Weak';
        if (pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass)) return 'Strong';
        return 'Okay';
    };

    const passwordStrength = getPasswordStrength(password);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await register(email, password, '');
            // The useEffect will handle the redirect once user state updates to '/onboarding'
        } catch (err: any) {
            const msg = err.message || '';
            if (msg.includes('already registered') || msg.includes('already exists')) {
                setError('An account with this email already exists. Log in instead →');
            } else {
                setError(msg || 'Connection failed. Check your internet and try again.');
            }
            setIsLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await loginWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Something went wrong with Google sign in. Try again or use email.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col justify-center items-center p-6 font-sans">
            <Head>
                <title>Sign Up | Serify</title>
            </Head>

            <div className="w-full max-w-[400px]">
                <div className="mb-10 text-center">
                    <Link href="/" className="inline-block text-3xl font-display font-medium text-[var(--text)]">Serify</Link>
                    <p className="text-[var(--text)] font-semibold text-lg mt-3">You think you learned it.</p>
                    <p className="text-[var(--text)] font-semibold text-lg">Let&apos;s find out.</p>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm animate-fade-in relative">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <span>
                                {error.includes('Log in instead') ? (
                                    <>An account with this email already exists. <Link href="/login" className="font-bold hover:underline">Log in instead &rarr;</Link></>
                                ) : (
                                    error
                                )}
                            </span>
                        </div>
                    )}

                    <button
                        onClick={handleGoogleSignup}
                        disabled={isLoading}
                        className="w-full h-12 bg-white border border-[#E5E7EB] rounded-xl font-medium text-gray-700 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </button>

                    <div className="my-6 flex items-center justify-between before:content-[''] before:flex-1 before:border-b before:border-[var(--border)] before:mr-4 after:content-[''] after:flex-1 after:border-b after:border-[var(--border)] after:ml-4">
                        <span className="text-xs text-[var(--muted)] tracking-wider">or</span>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text)] mb-2">Email address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full h-12 px-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--accent)] transition-colors invalid:[&:not(:placeholder-shown):not(:focus)]:border-red-500"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-[var(--text)]">Password</label>
                                {password && (
                                    <span className={`text-xs ${passwordStrength === 'Weak' ? 'text-orange-500' : passwordStrength === 'Strong' ? 'text-green-500' : 'text-yellow-500'}`}>
                                        {passwordStrength}
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full h-12 px-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--accent)] transition-colors pr-12"
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
                            className="w-full h-12 bg-[var(--text)] text-[var(--surface)] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black/80 transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Create Account <ArrowRight size={18} /></>}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-[var(--muted)] space-y-1 font-medium">
                        <p>15 free Sparks included.</p>
                        <p>No credit card required.</p>
                    </div>
                </div>

                <p className="text-center text-sm text-[var(--text)] mt-8">
                    Already have an account? <Link href="/login" className="font-semibold underline">Log in</Link>
                </p>
            </div>
        </div>
    );
}
