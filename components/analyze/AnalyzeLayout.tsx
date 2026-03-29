import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
    ArrowLeft,
    Settings,
    LogOut,
    Moon,
    Sun,
    Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UsageIndicator } from '@/components/usage/UsageIndicator';
import AssistantFAB from '@/components/assistant/AssistantFAB';
import AssistantPanel from '@/components/assistant/AssistantPanel';

interface AnalyzeLayoutProps {
    children: React.ReactNode;
}

export default function AnalyzeLayout({ children }: AnalyzeLayoutProps) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const isDemo = router.query.demo === 'true';
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [logoError, setLogoError] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (saved) {
            setTheme(saved);
            document.documentElement.classList.toggle('dark', saved === 'dark');
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
            document.documentElement.classList.add('dark');
        }
    }, []);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const toggleTheme = () => {
        const next = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        localStorage.setItem('theme', next);
        document.documentElement.classList.toggle('dark', next === 'dark');
    };

    const homeHref = isDemo ? '/?demo=true' : '/';
    const withDemo = (path: string) => (isDemo ? `${path}${path.includes('?') ? '&' : '?'}demo=true` : path);

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-mono relative analyze-lab-root">
            {/* Ambient layers */}
            <div
                className="pointer-events-none fixed inset-0 z-0 opacity-[0.45] dark:opacity-[0.35]"
                style={{
                    background:
                        'radial-gradient(ellipse 90% 55% at 50% -15%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 30%, color-mix(in srgb, var(--sage) 10%, transparent), transparent 50%)',
                }}
            />
            <div className="pointer-events-none fixed inset-0 z-0 dot-grid-bg opacity-60" />

            {/* Top bar — distinct from main app chrome */}
            <header className="sticky top-0 z-50 shrink-0 border-b-2 border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link
                            href={homeHref}
                            className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--accent)] transition-colors shrink-0"
                            title="Back to Home"
                        >
                            <ArrowLeft size={18} strokeWidth={2.5} />
                            <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-wider">Home</span>
                        </Link>
                        <div className="h-6 w-px bg-[var(--border-soft)] hidden sm:block" />
                        <div className="flex items-center gap-2 min-w-0">
                            {!logoError && (
                                <Image
                                    src="/logo.png"
                                    alt=""
                                    width={28}
                                    height={28}
                                    className="h-7 w-7 object-contain border-2 border-[var(--border)] p-0.5 shrink-0"
                                    style={{ boxShadow: 'var(--shadow-hard-sm)' }}
                                    onError={() => setLogoError(true)}
                                />
                            )}
                            <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)] font-bold leading-tight truncate">
                                    Analysis Lab
                                </p>
                                <p className="text-[11px] text-[var(--muted)] truncate hidden sm:block">
                                    {'// ingest → map → diagnose'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <UsageIndicator className="hidden sm:flex py-1.5 px-2 border border-[var(--border-soft)] bg-[var(--bg)] text-[10px]" />
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="w-9 h-9 border-2 border-[var(--border)] bg-[var(--bg)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                            style={{ boxShadow: 'var(--shadow-hard-sm)', borderRadius: '3px' }}
                            aria-label="Toggle theme"
                        >
                            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
                        </button>
                        <Link
                            href={withDemo('/settings')}
                            className="w-9 h-9 border-2 border-[var(--border)] bg-[var(--bg)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)]"
                            style={{ boxShadow: 'var(--shadow-hard-sm)', borderRadius: '3px' }}
                            title="Settings"
                        >
                            <Settings size={15} />
                        </Link>
                        <div className="relative" ref={profileRef}>
                            <button
                                type="button"
                                onClick={() => setProfileOpen((o) => !o)}
                                className="w-9 h-9 bg-[var(--accent)] text-[var(--surface)] flex items-center justify-center text-xs font-bold border-2 border-[var(--border)]"
                                style={{ boxShadow: 'var(--shadow-hard-sm)', borderRadius: '3px' }}
                            >
                                {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                            </button>
                            {profileOpen && (
                                <div
                                    className="absolute right-0 top-full mt-1.5 w-44 bg-[var(--surface)] border-2 border-[var(--border)] overflow-hidden z-50 animate-modal-in"
                                    style={{ boxShadow: 'var(--shadow-hard)', borderRadius: '3px' }}
                                >
                                    <Link
                                        href={withDemo('/settings')}
                                        onClick={() => setProfileOpen(false)}
                                        className="flex items-center gap-2 px-4 py-3 hover:bg-[var(--bg)] text-[11px] text-[var(--text)] border-b border-[var(--border-soft)]"
                                    >
                                        <Settings size={13} className="text-[var(--muted)]" /> Settings
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProfileOpen(false);
                                            logout();
                                            if (router.pathname !== '/') router.push('/');
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-3 text-[11px] text-[var(--warn)] hover:bg-[var(--bg)] text-left"
                                    >
                                        <LogOut size={13} /> Sign out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {isDemo && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-4 py-2 text-center text-xs font-medium flex items-center justify-center gap-2 shrink-0 relative z-10">
                    <Sparkles size={14} className="shrink-0" />
                    <span>
                        Demo mode — <strong>sign up</strong> to save progress.
                    </span>
                </div>
            )}

            <main className="relative z-10 flex-1 flex flex-col w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-10 pb-24">
                {children}
            </main>

            <AssistantFAB />
            <AssistantPanel />
        </div>
    );
}
