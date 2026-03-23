import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import SEO from '@/components/Layout/SEO';
import { Mail, CheckCircle, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setIsSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col justify-center items-center p-6 page-transition">
      <SEO title="Forgot Password" />
      
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Link href="/" className="inline-block text-3xl font-display font-medium text-[var(--text)]">
            Serify
          </Link>
          <p className="text-[var(--muted)] text-sm mt-3">Reset your access.</p>
        </div>

        <div className="premium-card border border-[var(--border)] rounded-2xl p-8 shadow-lg bg-[var(--surface)]">
          {!isSent ? (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-[var(--accent)]/10 rounded-full flex items-center justify-center text-[var(--accent)]">
                  <Mail size={32} />
                </div>
              </div>
              <h2 className="text-xl font-bold text-center mb-2">Forgot Password?</h2>
              <p className="text-[var(--muted)] text-sm text-center mb-8">
                Enter your email and we'll send you a link to reset your account.
              </p>

              {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">
                    Email Address
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

                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full h-12 bg-[var(--accent)] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-95 transition-all disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4 animate-fade-in">
              <div className="flex justify-center mb-6 text-emerald-500">
                <CheckCircle size={64} />
              </div>
              <h2 className="text-xl font-bold mb-2">Check your email</h2>
              <p className="text-[var(--muted)] text-sm mb-8">
                We've sent a password reset link to <strong>{email}</strong>.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-[var(--accent)] font-medium hover:underline"
              >
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          )}
        </div>

        {!isSent && (
          <div className="mt-8 text-center">
            <Link href="/login" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
