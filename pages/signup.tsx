import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Signup() {
    const router = useRouter();
    const { register, loginWithGoogle } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await register(email, password, name);
            router.push('/');
        } catch (err: any) {
            setError(err.message || 'Failed to create account. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await loginWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Google sign up failed.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col justify-center items-center p-6 font-sans">
            <Head>
                <title>Sign Up | Serify</title>
            </Head>

            <div className="w-full max-w-sm">
                <div className="mb-10 text-center">
                    <Link href="/" className="inline-block text-3xl font-display font-medium text-[var(--text)]">Serify</Link>
                    <p className="text-[var(--muted)] text-sm mt-3">Start learning with intention.</p>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm animate-fade-in">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full h-12 px-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--accent)] transition-colors"
                                required
                                disabled={isLoading}
                                placeholder="Alex Mercer"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full h-12 px-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--accent)] transition-colors"
                                required
                                disabled={isLoading}
                                placeholder="name@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full h-12 px-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--accent)] transition-colors pr-12"
                                    required
                                    minLength={8}
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
                            className="w-full h-12 bg-[var(--accent)] text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[var(--accent)]/90 transition-all shadow-md shadow-[var(--accent)]/20 mt-2 hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Create Account <ArrowRight size={18} /></>}
                        </button>
                    </form>

                    <div className="mt-6 flex items-center justify-between before:content-[''] before:flex-1 before:border-b before:border-[var(--border)] before:mr-4 after:content-[''] after:flex-1 after:border-b after:border-[var(--border)] after:ml-4">
                        <span className="text-xs text-[var(--muted)] uppercase tracking-wider font-bold">Or sign up with</span>
                    </div>

                    <button
                        onClick={handleGoogleSignup}
                        disabled={isLoading}
                        className="w-full h-12 bg-white border border-[var(--border)] rounded-xl font-medium text-[var(--text)] flex items-center justify-center gap-3 hover:bg-black/5 transition-colors mt-6 shadow-sm disabled:opacity-50"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google
                    </button>
                </div>

                <p className="text-center text-sm text-[var(--muted)] mt-8">
                    Already have an account? <Link href="/login" className="text-[var(--text)] font-medium hover:underline">Log in</Link>
                </p>
            </div>
        </div>
    );
}
