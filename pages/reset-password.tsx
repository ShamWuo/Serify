import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import SEO from '@/components/Layout/SEO';
import { Lock, CheckCircle, ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  useEffect(() => {
    // Supabase sets the session automatically when clicking the recovery link if it's a hash
    // We can also verify if a session exists
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
          // If no session, it might be because the link was used or expired
          // But usually the user should be allowed to stay here and try to reset if they just came from the link
      }
    };
    checkSession();
  }, [supabase.auth]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col justify-center items-center p-6 page-transition">
      <SEO title="Reset Password" />
      
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Link href="/" className="inline-block text-3xl font-display font-medium text-[var(--text)]">
            Serify
          </Link>
          <p className="text-[var(--muted)] text-sm mt-3">Secure your account.</p>
        </div>

        <div className="premium-card border border-[var(--border)] rounded-2xl p-8 shadow-lg bg-[var(--surface)]">
          {!isSuccess ? (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-[var(--accent)]/10 rounded-full flex items-center justify-center text-[var(--accent)]">
                  <Lock size={32} />
                </div>
              </div>
              <h2 className="text-xl font-bold text-center mb-2">New Password</h2>
              <p className="text-[var(--muted)] text-sm text-center mb-8">
                Enter a strong new password for your account.
              </p>

              {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">
                    New Password
                  </label>
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

                <div>
                  <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-12 px-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none input-focus-ring transition-all"
                    required
                    disabled={isLoading}
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !password || !confirmPassword}
                  className="w-full h-12 mt-2 bg-gradient-to-r from-[var(--accent)] to-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-95 hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Update Password'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4 animate-fade-in">
              <div className="flex justify-center mb-6 text-emerald-500">
                <CheckCircle size={64} />
              </div>
              <h2 className="text-xl font-bold mb-2">Password Updated</h2>
              <p className="text-[var(--muted)] text-sm mb-8">
                Your password has been reset successfully. Redirecting you to login...
              </p>
              <div className="flex justify-center">
                <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
