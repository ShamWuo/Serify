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
    ChevronUp,
    Search,
    Menu,
    X,
    Info,
    ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import CommandPalette from '@/components/Layout/CommandPalette';
import { useUsage } from '@/hooks/useUsage';

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
    const [isUsageExpanded, setIsUsageExpanded] = useState(false);
    const { usage: sessionsUsage, allUsage, loading: usageLoading } = useUsage('sessions');

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

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    const navItems = [
        { href: '/', label: 'Home', icon: <Home size={20} /> },
        { href: '/analyze', label: 'New Session', icon: <PlusCircle size={20} /> },
        {
            href: '/learn',
            label: 'Learn',
            icon: <LibraryBig size={20} className="text-[var(--accent)]" />
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

                {/* Usage Indicator Card */}
                {user && !usageLoading && sessionsUsage && (
                    <div className="px-3 mb-6">
                        <div
                            className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-300 ${isUsageExpanded ? 'bg-[var(--surface)] shadow-lg' : 'bg-gradient-to-br from-[var(--surface)]/60 to-[var(--bg)]/40 hover:border-[var(--accent)]/50'
                                } border-[var(--border)] backdrop-blur-xl group/card`}
                        >
                            {/* Pro+ Unlimited State */}
                            {user.subscriptionTier === 'proplus' ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                                                <Sparkles size={14} />
                                            </div>
                                            <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-wider">Serify Pro+</span>
                                        </div>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">Active</span>
                                    </div>
                                    <div className="py-1">
                                        <div className="text-sm font-display bg-gradient-to-r from-[var(--accent)] to-[#a855f7] bg-clip-text text-transparent font-bold">
                                            Unlimited Access
                                        </div>
                                        <p className="text-[10px] text-[var(--muted)] mt-0.5">Priority AI & Best Models</p>
                                    </div>
                                    <Link
                                        href="/settings/billing"
                                        className="flex items-center justify-between group/link text-[10px] font-bold text-[var(--muted)] hover:text-[var(--text)] transition-colors mt-2"
                                    >
                                        Manage Plan <ArrowUpRight size={12} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] group-hover/card:text-[var(--accent)] transition-colors">
                                                <History size={14} />
                                            </div>
                                            <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider italic">Sessions</span>
                                        </div>
                                        <button
                                            onClick={() => setIsUsageExpanded(!isUsageExpanded)}
                                            className="p-1 hover:bg-[var(--bg)] rounded-md transition-colors text-[var(--muted)] hover:text-[var(--text)]"
                                        >
                                            <Info size={14} />
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-medium text-[var(--muted)]">Plan Usage</span>
                                            <span className="text-[10px] font-bold text-[var(--text)]">
                                                {sessionsUsage.used} <span className="text-[var(--muted)]">/ {sessionsUsage.limit}</span>
                                            </span>
                                        </div>
                                        <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden shadow-inner relative">
                                            <div
                                                className={`h-full transition-all duration-700 rounded-full relative z-10 ${(sessionsUsage.percentUsed || 0) > 85 ? 'bg-orange-500' : 'bg-[var(--accent)]'
                                                    }`}
                                                style={{ width: `${Math.min(sessionsUsage.percentUsed || 0, 100)}%` }}
                                            />
                                            {/* Glow effect */}
                                            <div
                                                className={`absolute inset-0 z-0 blur-sm opacity-30 ${(sessionsUsage.percentUsed || 0) > 85 ? 'bg-orange-500' : 'bg-[var(--accent)]'
                                                    }`}
                                                style={{ width: `${Math.min(sessionsUsage.percentUsed || 0, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {isUsageExpanded && allUsage?.tracking && (
                                        <div className="pt-3 border-t border-[var(--border)] space-y-2 animate-fade-in">
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-[var(--muted)]">Flashcards</span>
                                                <span className="text-[var(--text)]">{allUsage.tracking.flashcards_used || 0}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-[var(--muted)]">AI Messages</span>
                                                <span className="text-[var(--text)]">{allUsage.tracking.ai_messages_used || 0}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-[var(--muted)]">Deep Dives</span>
                                                <span className="text-[var(--text)]">{allUsage.tracking.deep_dives_used || 0}</span>
                                            </div>
                                        </div>
                                    )}

                                    <Link
                                        href="/settings/billing"
                                        className={`flex items-center justify-center py-1.5 rounded-lg border transition-all text-[10px] font-bold ${(sessionsUsage.percentUsed || 0) >= 100
                                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-500 hover:bg-orange-500/20'
                                            : 'border-[var(--border)] bg-[var(--bg)]/50 text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)]/50'
                                            }`}
                                    >
                                        {(sessionsUsage.percentUsed || 0) >= 100 ? 'Limit Reached' : 'View All Limits'}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="p-3 relative border-t border-[var(--border)]">
                    {isProfileOpen && (
                        <div className="absolute bottom-full mb-2 left-3 right-3 glass border border-[var(--border)] rounded-lg shadow-lg overflow-hidden animate-modal-in z-50">
                            <Link
                                href={router.query.demo === 'true' ? '/settings?demo=true' : '/settings'}
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
                                        {user?.subscriptionTier === 'free' ? 'Free Plan' : `✦ ${user?.subscriptionTier} Plan`}
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
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text)]"
                    >
                        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <div
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-emerald-700 text-white flex items-center justify-center text-xs font-bold cursor-pointer shadow-md"
                    >
                        {user?.displayName?.charAt(0) || 'U'}
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

                        {user && !usageLoading && sessionsUsage && (
                            <div className="pt-6 border-t border-[var(--border)]">
                                <div className={`p-5 rounded-2xl border ${user.subscriptionTier === 'proplus' ? 'bg-[var(--accent)]/5 border-[var(--accent)]/20' : 'bg-[var(--surface)] border-[var(--border)]'} shadow-sm`}>
                                    {user.subscriptionTier === 'proplus' ? (
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
                                                <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider italic">Session Usage</span>
                                                <span className="text-sm font-bold text-[var(--text)]">{sessionsUsage.used} / {sessionsUsage.limit}</span>
                                            </div>
                                            <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden shadow-inner relative">
                                                <div
                                                    className={`h-full transition-all duration-700 rounded-full ${(sessionsUsage.percentUsed || 0) > 85 ? 'bg-orange-500' : 'bg-[var(--accent)]'
                                                        }`}
                                                    style={{ width: `${Math.min(sessionsUsage.percentUsed || 0, 100)}%` }}
                                                />
                                            </div>
                                            <Link href="/settings/billing" className={`block text-center py-2 rounded-xl border font-bold text-xs transition-all ${(sessionsUsage.percentUsed || 0) >= 100 ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' : 'bg-[var(--bg)] border-[var(--border)] text-[var(--accent)]'}`}>
                                                {(sessionsUsage.percentUsed || 0) >= 100 ? 'Limit reached - Upgrade' : 'Manage Subscription →'}
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
        </div>
    );
}
