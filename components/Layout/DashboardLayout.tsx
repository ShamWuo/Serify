import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    Home,
    PlusCircle,
    History,
    Archive,
    Settings,
    LibraryBig,
    LogOut,
    ChevronRight,
    CheckCircle2,
    Sparkles,
    ChevronUp,
    Search,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SparkBalance from '@/components/sparks/SparkBalance';
import CommandPalette from '@/components/Layout/CommandPalette';

interface DashboardLayoutProps {
    children: React.ReactNode;
    sidebarContent?: React.ReactNode;
    backLink?: string;
    backLinkText?: string;
}

export default function DashboardLayout({ children, sidebarContent, backLink, backLinkText }: DashboardLayoutProps) {
    const { user, token, logout, loading: authLoading } = useAuth();
    const router = useRouter();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [vaultNeedsWork, setVaultNeedsWork] = useState(0);
    const [logoError, setLogoError] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        setIsProfileOpen(false);
        setIsCommandPaletteOpen(false);
    }, [router.asPath]);

    useEffect(() => {
        if (!user || !token) {
            if (!authLoading && !user && !router.pathname.startsWith('/auth') && router.pathname !== '/404') {
                router.push('/');
            }
            return;
        }

        // Prevent non-onboarded users from accessing dashboard pages
        if (user.onboardingCompleted === false && !router.pathname.startsWith('/onboarding')) {
            router.push('/onboarding');
        }

        fetch('/api/vault/stats', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (d) setVaultNeedsWork(d.needsWork || 0);
            })
            .catch(() => { });
    }, [user, token, authLoading, router]);

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    const navItems = [
        { href: '/', label: 'Home', icon: <Home size={20} /> },
        { href: '/analyze', label: 'New Session', icon: <PlusCircle size={20} /> },
        {
            href: '/learn',
            label: '✦ Learn',
            icon: <Sparkles size={20} className="text-[var(--accent)]" />
        },
        { href: '/sessions', label: 'Sessions', icon: <History size={20} /> },
        {
            href: '/vault',
            label: 'Concept Vault',
            icon: <Archive size={20} />,
            badge: vaultNeedsWork > 0 ? vaultNeedsWork : undefined
        },
        { href: '/settings', label: 'Settings', icon: <Settings size={20} /> }
    ];

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col md:flex-row font-sans relative">
            {/* Dashboard Premium Aesthetic Blobs */}
            <div className="fixed top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-[var(--accent)] rounded-full filter blur-[120px] opacity-[0.03] pointer-events-none z-0" />
            <div className="fixed bottom-[-10%] right-[-5%] w-[35vw] h-[35vw] bg-[#7c3d9e] rounded-full filter blur-[120px] opacity-[0.03] pointer-events-none z-0" />

            <aside className="hidden md:flex flex-col w-[220px] border-r border-[var(--border)] bg-gradient-to-b from-[var(--surface)] to-[var(--bg)] backdrop-blur-xl h-screen sticky top-0 shrink-0 z-40">
                <div className="px-6 pt-8 pb-4">
                    {backLink ? (
                        <Link
                            href={backLink}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-4 group"
                        >
                            <div className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center bg-[var(--surface)] group-hover:bg-[var(--accent)] group-hover:text-white transition-all">
                                <ChevronRight size={18} className="rotate-180" />
                            </div>
                            {backLinkText || 'Back'}
                        </Link>
                    ) : (
                        <Link href="/" className="inline-flex items-center gap-3 group mb-2 text-left">
                            {!logoError && (
                                <div className="h-10 w-10 flex items-center justify-center shrink-0">
                                    <img
                                        src="/logo.png"
                                        alt=""
                                        className="h-full w-full object-contain transition-transform group-hover:scale-110"
                                        onError={() => setLogoError(true)}
                                    />
                                </div>
                            )}
                            <div className="flex flex-col">
                                <div className="text-3xl font-display text-[var(--text)] tracking-tight">
                                    Serify
                                </div>
                            </div>
                        </Link>
                    )}
                </div>

                <div className="px-3 mb-4">
                    <button
                        onClick={() => setIsCommandPaletteOpen(true)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)]/50 text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-all group"
                    >
                        <Search size={16} className="group-hover:text-[var(--accent)] transition-colors" />
                        <span className="text-xs font-medium flex-1 text-left">Search...</span>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-[9px] font-bold">
                            ⌘K
                        </div>
                    </button>
                </div>

                <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                    {sidebarContent ? (
                        <div className="space-y-1">{sidebarContent}</div>
                    ) : (
                        navItems.map((item) => {
                            const isActive =
                                router.pathname.startsWith(item.href) &&
                                (item.href !== '/' || router.pathname === '/');
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                                        ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-semibold shadow-sm'
                                        : 'text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]'
                                        }`}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] animate-fade-in" />
                                    )}
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`transition-all duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:text-[var(--accent)]'}`}
                                        >
                                            {item.icon}
                                        </div>
                                        <span className="text-sm tracking-wide">
                                            {item.label}
                                        </span>
                                    </div>
                                    {item.badge !== undefined && (
                                        <span
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive
                                                ? 'bg-[var(--accent)] text-white'
                                                : 'bg-[var(--border)] text-[var(--muted)] group-hover:bg-[var(--accent)]/20 group-hover:text-[var(--accent)] transition-colors'
                                                }`}
                                        >
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })
                    )}
                </nav>

                <div className="p-3 relative border-t border-[var(--border)]">
                    {isProfileOpen && (
                        <div className="absolute bottom-full mb-2 left-3 right-3 glass border border-[var(--border)] rounded-lg shadow-lg overflow-hidden animate-modal-in z-50">
                            <Link
                                href="/settings"
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center gap-2 px-4 py-3 hover:bg-black/5 transition-colors text-sm"
                            >
                                <Settings size={16} className="text-[var(--muted)]" /> Settings
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-black/5 transition-colors text-sm text-left border-t border-[var(--border)]"
                            >
                                <LogOut size={16} className="text-[var(--muted)]" /> Sign Out
                            </button>
                        </div>
                    )}
                    <div className="mb-2 w-full flex justify-center">
                        <SparkBalance />
                    </div>
                    {authLoading || !user ? (
                        <div className="w-full flex items-center gap-2 p-2 rounded-xl animate-pulse">
                            <div className="w-8 h-8 rounded-full bg-[var(--border)]" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-[var(--border)] rounded w-3/4" />
                                <div className="h-2 bg-[var(--border)] rounded w-1/2 opacity-50" />
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[var(--accent)]/5 transition-all text-left group"
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-md shadow-[var(--accent)]/20 group-hover:scale-105 transition-transform">
                                    {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-[var(--text)] truncate">
                                        {user?.displayName || 'User'}
                                    </p>
                                    <p className="text-[10px] text-[var(--muted)] truncate capitalize font-medium tracking-wide">
                                        {user?.subscriptionTier === 'pro' ? '✦ Pro Plan' : 'Free Plan'}
                                    </p>
                                </div>
                            </div>
                            <ChevronUp
                                size={16}
                                className={`text-[var(--muted)] transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                    )}
                </div>
            </aside>

            <div className="md:hidden sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    {!logoError && (
                        <img
                            src="/logo.png"
                            alt=""
                            className="h-7 w-7 object-contain"
                            onError={() => setLogoError(true)}
                        />
                    )}
                    <span className="text-2xl font-display text-[var(--text)]">Serify</span>
                </Link>
                <div className="flex items-center gap-3">
                    <SparkBalance />
                    <div
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-medium cursor-pointer"
                    >
                        {user?.displayName?.charAt(0) || 'U'}
                    </div>
                </div>
            </div>

            {isProfileOpen && (
                <div className="md:hidden fixed top-14 right-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden animate-fade-in z-50 w-48">
                    <Link
                        href="/settings"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 hover:bg-black/5 transition-colors text-sm border-b border-[var(--border)]"
                    >
                        <Settings size={16} className="text-[var(--muted)]" /> Settings
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-black/5 transition-colors text-sm text-left"
                    >
                        <LogOut size={16} className="text-[var(--muted)]" /> Sign Out
                    </button>
                </div>
            )}

            <main className="flex-1 w-full flex flex-col min-h-[calc(100vh-64px)] md:min-h-screen pb-20 md:pb-0">
                {children}
            </main>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)]/90 backdrop-blur-xl border-t border-[var(--border)] flex items-center justify-around pb-safe">
                {navItems.slice(0, 5).map((item) => {
                    const isActive =
                        router.pathname.startsWith(item.href) &&
                        (item.href !== '/' || router.pathname === '/');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center py-2.5 px-1 w-full gap-1 transition-all relative ${isActive
                                ? 'text-[var(--accent)]'
                                : 'text-[var(--muted)] hover:text-[var(--text)]'
                                }`}
                        >
                            {isActive && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-b-full bg-[var(--accent)] shadow-[0_0_6px_var(--accent)]" />
                            )}
                            <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                                {item.icon}
                            </div>
                            <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <CommandPalette
                isOpen={isCommandPaletteOpen}
                onClose={() => setIsCommandPaletteOpen(false)}
            />
        </div>
    );
}
