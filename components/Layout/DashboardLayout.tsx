import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
    Search,
    Menu,
    X,
    Brain,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import CommandPalette from '@/components/Layout/CommandPalette';
import { UsageIndicator } from '@/components/usage/UsageIndicator';
import FeedbackWidget from '@/components/dashboard/FeedbackWidget';

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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [vaultNeedsWork, setVaultNeedsWork] = useState(0);
    const [logoError, setLogoError] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const mobileProfileRef = useRef<HTMLDivElement>(null);

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
        setIsMobileMenuOpen(false);
        setIsCommandPaletteOpen(false);
    }, [router.asPath]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
            if (mobileProfileRef.current && !mobileProfileRef.current.contains(event.target as Node)) {
                // We only want to close it if it's the specific header dropdown
                // but usually both share the same state so it's fine
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!user || !token) {
            if (router.query.demo === 'true') return; // Allowed in demo mode
            if (!authLoading && !user && !router.pathname.startsWith('/auth') && router.pathname !== '/404') {
                router.push('/');
            }
            return;
        }

        // Prevent non-onboarded users from accessing dashboard pages
        if (user.onboardingCompleted === false && !router.pathname.startsWith('/onboarding')) {
            router.push('/onboarding');
        }

        if (!token) return;

        fetch('/api/vault/stats', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (d) setVaultNeedsWork(d.needsWork || 0);
            })
            .catch(() => { });
    }, [user, token, authLoading, router]);

    const handleLogout = async () => {
        setIsProfileOpen(false);
        try {
            await logout();
        } catch (err) {
            console.error('Logout error:', err);
        }
        window.location.href = '/';
    };

    const navItems = [
        { href: '/', label: 'Home', icon: <Home size={20} /> },
        { href: '/analyze', label: 'New Session', icon: <PlusCircle size={20} /> },
        {
            href: '/learn',
            label: 'Learn',
            icon: <LibraryBig size={20} className="text-[var(--accent)]" />
        },
        { href: '/practice', label: 'Practice', icon: <Brain size={20} /> },
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
                        <Link
                            href={router.query.demo === 'true' ? '/?demo=true' : '/'}
                            className="inline-flex items-center gap-3 group mb-2 text-left"
                        >
                            {!logoError && (
                                <div className="h-10 w-10 flex items-center justify-center shrink-0">
                                    <Image
                                        src="/logo.png"
                                        alt=""
                                        width={40}
                                        height={40}
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
                                    href={router.query.demo === 'true'
                                        ? `${item.href}${item.href.includes('?') ? '&' : '?'}demo=true`
                                        : item.href}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                                        ? 'bg-[var(--accent)]/5 text-[var(--accent)] font-semibold shadow-sm'
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
                {/* Sidebar Usage Card removed in favor of integrated profile bar */}


                <div className="p-3 relative border-t border-[var(--border)]" ref={profileRef}>
                    {isProfileOpen && (
                        <div className="absolute bottom-full mb-2 left-3 right-3 glass border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-modal-in z-50">
                            <Link
                                href="/settings"
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center gap-2 px-4 py-3 hover:bg-[var(--accent)]/5 transition-colors text-xs font-semibold"
                            >
                                <Settings size={14} className="text-[var(--muted)]" /> Settings
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-red-500/5 transition-colors text-xs font-semibold text-left border-t border-[var(--border)] text-red-500"
                            >
                                <LogOut size={14} /> Sign Out
                            </button>
                        </div>
                    )}

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
                            className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-[var(--accent)]/5 transition-all text-left group overflow-hidden"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-md shadow-[var(--accent)]/20 group-hover:scale-105 transition-transform">
                                {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[var(--text)] truncate">
                                    {user?.displayName || 'User'}
                                </p>
                                <div className="flex items-center justify-between gap-2 mt-0.5">
                                    <p className="text-[9px] text-[var(--muted)] truncate uppercase font-bold tracking-wider">
                                        {user?.subscriptionTier === 'free' ? 'Free' : user?.subscriptionTier}
                                    </p>
                                    {user.plan !== 'proplus' && (
                                        <span className="text-[9px] font-bold text-[var(--muted)]">
                                            {user.tokensUsed} / {user.monthlyLimit}
                                        </span>
                                    )}
                                </div>
                                
                                {user.plan !== 'proplus' && (
                                    <div className="h-1 w-full bg-[var(--border)] rounded-full mt-1 overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-700 ${user.percentUsed > 85 ? 'bg-orange-500' : 'bg-[var(--accent)]'}`}
                                            style={{ width: `${Math.min(user.percentUsed, 100)}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        </button>
                    )}
                </div>
            </aside>

            <div className="md:hidden sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
                <Link href={router.query.demo === 'true' ? '/?demo=true' : '/'} className="flex items-center gap-2">
                    {!logoError && (
                        <Image
                            src="/logo.png"
                            alt=""
                            width={28}
                            height={28}
                            className="h-7 w-7 object-contain"
                            onError={() => setLogoError(true)}
                        />
                    )}
                    <span className="text-2xl font-display text-[var(--text)]">Serify</span>
                </Link>
                <div className="flex items-center gap-3">
                    <UsageIndicator />
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text)]"
                    >
                        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <div className="relative" ref={mobileProfileRef}>
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-emerald-700 text-white flex items-center justify-center text-xs font-bold cursor-pointer shadow-md overflow-hidden hover:scale-105 transition-transform"
                        >
                            {user?.displayName?.charAt(0) || 'U'}
                        </button>

                        {isProfileOpen && (
                            <div className="absolute top-full mt-2 right-0 w-48 glass border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-modal-in z-50">
                                <Link
                                    href="/settings"
                                    onClick={() => setIsProfileOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--accent)]/5 transition-colors text-sm font-semibold"
                                >
                                    <Settings size={16} className="text-[var(--muted)]" /> Settings
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/5 transition-colors text-sm font-semibold text-left border-t border-[var(--border)] text-red-500"
                                >
                                    <LogOut size={16} /> Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 bg-[var(--bg)] animate-fade-in flex flex-col pt-16">
                    <div className="absolute top-4 right-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-10 space-y-8">
                        <nav className="space-y-2">
                            {navItems.map((item) => {
                                const isActive =
                                    router.pathname.startsWith(item.href) &&
                                    (item.href !== '/' || router.pathname === '/');
                                return (
                                    <Link
                                        key={item.href}
                                        href={router.query.demo === 'true'
                                            ? `${item.href}${item.href.includes('?') ? '&' : '?'}demo=true`
                                            : item.href}
                                        className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${isActive
                                            ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-bold'
                                            : 'text-[var(--text)] hover:bg-[var(--surface)]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            {item.icon}
                                            <span className="text-lg">{item.label}</span>
                                        </div>
                                        {item.badge !== undefined && (
                                            <span className="bg-[var(--accent)] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>

                        {sidebarContent && (
                            <div className="pt-6 border-t border-[var(--border)]">
                                {sidebarContent}
                            </div>
                        )}

                        {user && (
                            <div className="pt-6 border-t border-[var(--border)]">
                                <div className={`p-5 rounded-2xl border ${user.plan === 'proplus' ? 'bg-[var(--accent)]/5 border-[var(--accent)]/20' : 'bg-[var(--surface)] border-[var(--border)]'} shadow-sm`}>
                                    {user.plan === 'proplus' ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Sparkles size={16} className="text-[var(--accent)]" />
                                                <span className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">Serify Pro+</span>
                                            </div>
                                            <div className="text-lg font-display font-bold bg-gradient-to-r from-[var(--accent)] to-[#a855f7] bg-clip-text text-transparent">
                                                Unlimited Access
                                            </div>
                                            <Link href="/settings/billing" className="block text-xs font-bold text-[var(--accent)] pt-2">
                                                Manage Subscription →
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider italic">Usage</span>
                                                <span className="text-sm font-bold text-[var(--text)]">{user.tokensUsed} / {user.monthlyLimit}</span>
                                            </div>
                                            <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden shadow-inner relative">
                                                <div
                                                    className={`h-full transition-all duration-700 rounded-full ${user.percentUsed > 85 ? 'bg-orange-500' : 'bg-[var(--accent)]'
                                                        }`}
                                                    style={{ width: `${Math.min(user.percentUsed, 100)}%` }}
                                                />
                                            </div>
                                            <Link href="/settings/billing" className={`block text-center py-2 rounded-xl border font-bold text-xs transition-all ${user.percentUsed >= 100 ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' : 'bg-[var(--bg)] border-[var(--border)] text-[var(--accent)]'}`}>
                                                {user.percentUsed >= 100 ? 'Limit reached - Upgrade' : 'Manage Subscription →'}
                                            </Link>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-500/5 transition-all mt-4 font-bold border border-red-500/10"
                                >
                                    <LogOut size={20} />
                                    <span className="text-lg">Sign Out</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Mobile Profile Dropdown removed in favor of direct settings link and menu logout */}

            <main className="flex-1 w-full flex flex-col min-h-[calc(100vh-64px)] md:min-h-screen pb-20 md:pb-0">
                {router.query.demo === 'true' && (
                    <div className="bg-amber-50 border-b border-amber-200 text-amber-700 px-6 py-2.5 text-sm font-medium flex items-center justify-center gap-2 shadow-sm animate-fade-in shrink-0">
                        <Sparkles size={14} fill="currentColor" />
                        <span>You&apos;re in demo mode — <strong>sign up</strong> to save progress and unlock full features.</span>
                    </div>
                )}
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
                            href={router.query.demo === 'true'
                                ? `${item.href}${item.href.includes('?') ? '&' : '?'}demo=true`
                                : item.href}
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

            <FeedbackWidget />
        </div>
    );
}
