import { useState, useEffect, useRef, useMemo } from 'react';
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
    Users,
    MessageSquarePlus,
    Zap,
    Image as ImageIcon,
    Moon,
    Sun,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import CommandPalette from '@/components/Layout/CommandPalette';
import { UsageIndicator } from '@/components/usage/UsageIndicator';
import AssistantFAB from '../assistant/AssistantFAB';
import AssistantPanel from '../assistant/AssistantPanel';

interface DashboardLayoutProps {
    children: React.ReactNode;
    sidebarContent?: React.ReactNode;
    backLink?: string;
    backLinkText?: string;
    hideWidgets?: boolean;
}

export default function DashboardLayout({ children, sidebarContent, backLink, backLinkText, hideWidgets = false }: DashboardLayoutProps) {
    const { user, logout, token, loading: authLoading } = useAuth();
    const router = useRouter();
    const isDemo = router.query.demo === 'true';
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [vaultNeedsWork, setVaultNeedsWork] = useState(0);
    const [logoError, setLogoError] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const mobileProfileRef = useRef<HTMLDivElement>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            
            setTheme('dark');
            document.documentElement.classList.add('dark');
        } else {
            
            
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

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
                
                
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!authLoading && !user && !token) {
            if (router.query.demo === 'true') return; 
            
            // Only redirect if we are not on a public page and not currently in an auth flow
            const isPublicPage = router.pathname.startsWith('/auth') || router.pathname === '/404' || router.pathname === '/privacy' || router.pathname === '/terms';
            
            if (!isPublicPage && router.pathname !== '/') {
                console.log('[DashboardLayout] No user/token found, redirecting to home...');
                router.push('/');
            }
            return;
        }

        
        if (user?.onboardingCompleted === false && !router.pathname.startsWith('/onboarding')) {
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

    const navItems = useMemo(() => [
        { href: '/', label: 'Workbench', icon: <Home size={20} /> },
        { href: '/analyze', label: 'Analyze', icon: <PlusCircle size={20} className="text-blue-500" /> },
        { href: '/learn', label: 'Curriculum', icon: <LibraryBig size={20} className="text-emerald-500" /> },
        { href: '/practice', label: 'Study', icon: <Brain size={20} className="text-orange-500" /> },
        { href: '/flow', label: 'Learn Mode', icon: <Zap size={20} className="text-purple-500" /> },
    ], []);

    const secondaryItems = useMemo(() => [
        { href: '/vault', label: 'Concept Vault', icon: <Archive size={18} /> },
        { href: '/sessions', label: 'Journal', icon: <History size={18} /> },
        { href: '/settings', label: 'Settings', icon: <Settings size={18} /> }
    ], []);

    const themeToggleItem = (
        <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl transition-all duration-200 group text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
        >
            <div className="flex items-center gap-3">
                <div className="group-hover:scale-110 transition-transform">
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <span className="text-sm tracking-wide">
                    {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </span>
            </div>
        </button>
    );

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col md:flex-row font-sans relative">
            {}
            <div className="fixed top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-[var(--accent)] rounded-full filter blur-[80px] opacity-[0.03] pointer-events-none z-0" />
            <div className="fixed bottom-[-10%] right-[-5%] w-[35vw] h-[35vw] bg-[#7c3d9e] rounded-full filter blur-[80px] opacity-[0.03] pointer-events-none z-0" />

            <aside className="hidden md:flex flex-col w-[220px] border-r border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md h-screen sticky top-0 shrink-0 z-50 shadow-sm">
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

                <div className="px-4 mb-6 space-y-4">
                    <button
                        onClick={() => setIsCommandPaletteOpen(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)]/50 text-[var(--muted)] hover:text-[var(--text)] hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/[0.02] transition-all group"
                    >
                        <Search size={14} className="group-hover:text-indigo-500 transition-colors" />
                        <span className="text-[11px] font-bold flex-1 text-left uppercase tracking-wider">Search</span>
                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded text-[9px] font-black opacity-40">
                            ⌘K
                        </div>
                    </button>
                    <div className="px-1">
                        <UsageIndicator className="w-full justify-between py-2.5 px-4 rounded-2xl border border-[var(--border)] shadow-sm bg-[var(--surface)] hover:border-indigo-500/30 transition-all cursor-default" />
                    </div>
                </div>


                <nav className="flex-1 px-3 py-4 space-y-8 overflow-y-auto custom-scrollbar">
                    {}
                    <div className="space-y-1.5">
                        <div className="px-4 mb-3 text-[9px] font-black text-[var(--muted)]/40 uppercase tracking-[0.3em]">Main</div>
                        {navItems.map((item: any) => {
                            const isActive = router.pathname === item.href || (item.href !== '/' && router.pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={router.query.demo === 'true' ? `${item.href}${item.href.includes('?') ? '&' : '?'}demo=true` : item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${
                                        isActive
                                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 font-bold translate-x-1'
                                            : 'text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--text)] hover:translate-x-1'
                                    }`}
                                >
                                    <div className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform shrink-0`}>
                                        {item.icon}
                                    </div>
                                    <span className={`text-[13px] tracking-tight ${isActive ? 'font-black' : 'font-bold'}`}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>


                    {}
                    <div className="space-y-1.5">
                        <div className="px-4 mb-3 text-[9px] font-black text-[var(--muted)]/40 uppercase tracking-[0.3em]">Library</div>
                        {secondaryItems.map((item: any) => {
                            const isActive = router.pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={router.query.demo === 'true' ? `${item.href}${item.href.includes('?') ? '&' : '?'}demo=true` : item.href}
                                    className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300 group ${
                                        isActive
                                            ? 'bg-[var(--bg)] text-[var(--text)] font-bold translate-x-1'
                                            : 'text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--text)] hover:translate-x-1'
                                    }`}
                                >
                                    <div className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform shrink-0`}>
                                        {item.icon}
                                    </div>
                                    <span className={`text-[12px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                                        {item.label}
                                    </span>

                                </Link>
                            );
                        })}
                    </div>


                    {}
                    <div className="pt-2">
                        {themeToggleItem}
                    </div>
                </nav>
                {}

                <div className="p-3 relative border-t border-[var(--border)]" ref={profileRef}>
                    {isProfileOpen && (
                        <div className="absolute bottom-full mb-4 left-4 right-4 bg-[var(--surface)] border border-[var(--border)] rounded-[1.5rem] shadow-2xl overflow-hidden animate-modal-in z-50">
                            <Link
                                href="/settings"
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center gap-3 px-5 py-4 hover:bg-indigo-500/5 transition-colors text-[11px] font-bold uppercase tracking-widest text-[var(--text)]"
                            >
                                <Settings size={14} className="text-[var(--muted)]" /> Settings
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-500/5 transition-colors text-[11px] font-bold uppercase tracking-widest text-left border-t border-[var(--border)]/50 text-red-500"
                            >
                                <LogOut size={14} /> Sign Out
                            </button>
                        </div>
                    )}


                    {authLoading || !user ? (
                        <div className="w-full flex items-center gap-3 p-3 rounded-2xl animate-pulse">
                            <div className="w-10 h-10 rounded-full bg-[var(--border)]" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-[var(--border)] rounded w-3/4" />
                                <div className="h-3 bg-[var(--border)] rounded w-1/2 opacity-50" />
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-indigo-500/[0.03] transition-all text-left group overflow-hidden"
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-[14px] font-black shrink-0 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                                {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-black text-[var(--text)] truncate tracking-tight">
                                    {user?.displayName || 'User'}
                                </p>
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[9px] text-[var(--muted)] truncate uppercase font-black tracking-widest opacity-60">
                                        {user?.subscriptionTier === 'free' ? 'Scholar' : user?.subscriptionTier}
                                    </p>
                                </div>
                            </div>
                        </button>
                    )}

                </div>
            </aside>

            <div className="md:hidden sticky top-0 z-[60] bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
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

            {}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-[70] bg-[var(--bg)] animate-fade-in flex flex-col pt-16">
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
                            {navItems.map((item: any) => {
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
                            {themeToggleItem}
                        </nav>

                        {sidebarContent && (
                            <div className="pt-6 border-t border-[var(--border)]">
                                {sidebarContent}
                            </div>
                        )}

                        {user && (
                            <div className="pt-6 border-t border-[var(--border)]">
                                <div className={`p-5 rounded-2xl border ${user?.plan === 'proplus' ? 'bg-[var(--accent)]/5 border-[var(--accent)]/20' : 'bg-[var(--surface)] border-[var(--border)]'} shadow-sm`}>
                                    {user?.plan === 'proplus' ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Sparkles size={16} className="text-[var(--accent)]" />
                                                <span className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">Serify Pro Plus</span>
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
                                                <UsageIndicator showAlways={true} className="w-full justify-between" />
                                            </div>
                                            <Link href="/settings/billing" className={`block text-center py-2 rounded-xl border font-bold text-xs transition-all ${(user.percentUsed || 0) >= 100 ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' : 'bg-[var(--bg)] border-[var(--border)] text-[var(--accent)]'}`}>
                                                {(user.percentUsed || 0) >= 100 ? 'Limit reached - Upgrade' : 'Manage Subscription →'}
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

            {}

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
                {navItems.slice(0, 5).map((item: any) => {
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

            {}
            {!hideWidgets && (
                <>
                    <AssistantFAB />
                    <AssistantPanel />
                </>
            )}
        </div>
    );
}
