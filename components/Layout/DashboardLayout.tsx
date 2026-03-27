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
            className="flex items-center gap-2 w-full px-3 py-2 transition-all text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] border-2 border-transparent hover:border-[var(--border-soft)] font-mono text-[11px]"
            style={{borderRadius:'3px'}}
        >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            <span>{theme === 'light' ? 'dark mode' : 'light mode'}</span>
        </button>
    );

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col md:flex-row font-mono relative">

            {/* Sidebar — The Architect's Pen */}
            <aside className="hidden md:flex flex-col w-[200px] border-r-2 border-[var(--border)] bg-[var(--surface)] h-screen sticky top-0 shrink-0 z-50 dot-grid-bg">
                {/* Logo */}
                <div className="px-4 pt-4 pb-3 border-b-2 border-[var(--border)]">
                    {backLink ? (
                        <Link
                            href={backLink}
                            className="inline-flex items-center gap-2 text-sm font-bold font-display text-[var(--muted)] hover:text-[var(--accent)] transition-colors mb-2 group"
                        >
                            <ChevronRight size={16} className="rotate-180" />
                            {backLinkText || 'Back'}
                        </Link>
                    ) : (
                        <Link
                            href={router.query.demo === 'true' ? '/?demo=true' : '/'}
                            className="inline-flex items-center gap-3 group text-left"
                        >
                            {!logoError && (
                                <div className="h-8 w-8 flex items-center justify-center shrink-0 border-2 border-[var(--border)] p-0.5" style={{boxShadow:'var(--shadow-hard-sm)'}}>
                                    <Image
                                        src="/logo.png"
                                        alt=""
                                        width={32}
                                        height={32}
                                        className="h-full w-full object-contain"
                                        onError={() => setLogoError(true)}
                                    />
                                </div>
                            )}
                            <div className="font-display font-bold text-xl text-[var(--text)] tracking-wide group-hover:text-[var(--accent)] transition-colors">
                                Serify
                            </div>
                        </Link>
                    )}
                </div>

                {/* Search */}
                <div className="px-3 py-2 border-b-2 border-[var(--border)]">
                    <button
                        onClick={() => setIsCommandPaletteOpen(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 border-2 border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-all group"
                        style={{borderRadius:'3px', boxShadow:'var(--shadow-hard-sm)'}}
                    >
                        <Search size={13} />
                        <span className="text-[11px] font-mono flex-1 text-left">search...</span>
                        <code className="text-[9px] font-mono bg-[var(--surface)] border border-[var(--border-soft)] px-1 py-0.5">⌘K</code>
                    </button>
                    <div className="mt-3">
                        <UsageIndicator className="w-full justify-between py-2 px-3 border border-[var(--border-soft)] bg-[var(--bg)] text-xs font-mono cursor-default" />
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
                    <div className="space-y-0.5">
                        <div className="px-3 mb-2 text-[9px] font-mono font-bold text-[var(--muted)] uppercase tracking-[0.25em] opacity-60">{'// main'}</div>
                        {navItems.map((item: any) => {
                            const isActive = router.pathname === item.href || (item.href !== '/' && router.pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={router.query.demo === 'true' ? `${item.href}${item.href.includes('?') ? '&' : '?'}demo=true` : item.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 transition-all duration-150 relative group ${
                                        isActive
                                            ? 'bg-[var(--accent)] text-[var(--surface)] border-2 border-[var(--ink)] font-bold'
                                            : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] border-2 border-transparent'
                                    }`}
                                    style={isActive ? {boxShadow:'var(--shadow-hard-sm)',borderRadius:'3px'} : {borderRadius:'3px'}}
                                >
                                    <div className="shrink-0 opacity-90">{item.icon}</div>
                                    <span className="text-[12px] font-mono">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="space-y-0.5">
                        <div className="px-3 mb-2 text-[9px] font-mono font-bold text-[var(--muted)] uppercase tracking-[0.25em] opacity-60">{'// library'}</div>
                        {secondaryItems.map((item: any) => {
                            const isActive = router.pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={router.query.demo === 'true' ? `${item.href}${item.href.includes('?') ? '&' : '?'}demo=true` : item.href}
                                    className={`flex items-center gap-3 px-3 py-2 transition-all duration-150 border-2 relative group ${
                                        isActive
                                            ? 'bg-[var(--bg)] text-[var(--text)] border-[var(--border)] font-bold'
                                            : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] border-transparent'
                                    }`}
                                    style={{borderRadius:'3px'}}
                                >
                                    <div className="shrink-0">{item.icon}</div>
                                    <span className="text-[11px] font-mono">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    <div>
                        {themeToggleItem}
                    </div>
                </nav>

                {/* Profile */}
                <div className="border-t-2 border-[var(--border)] relative" ref={profileRef}>
                    {isProfileOpen && (
                        <div className="absolute bottom-full left-3 right-3 mb-2 bg-[var(--surface)] border-2 border-[var(--border)] overflow-hidden animate-modal-in z-50" style={{boxShadow:'var(--shadow-hard)',borderRadius:'3px'}}>
                            <Link
                                href="/settings"
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--accent-soft)] transition-colors text-[11px] font-mono text-[var(--text)] border-b border-[var(--border-soft)]"
                            >
                                <Settings size={13} className="text-[var(--muted)]" /> Settings
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-[11px] font-mono text-left text-[var(--warn)]"
                            >
                                <LogOut size={13} /> Sign out
                            </button>
                        </div>
                    )}

                    {authLoading || !user ? (
                        <div className="flex items-center gap-3 p-4 animate-pulse">
                            <div className="w-8 h-8 bg-[var(--border-soft)] border border-[var(--border)]" />
                            <div className="flex-1 space-y-1.5">
                                <div className="skel-ink w-3/4" />
                                <div className="skel-ink w-1/2 opacity-50" />
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg)] transition-colors text-left group"
                        >
                            <div className="w-8 h-8 bg-[var(--accent)] text-[var(--surface)] flex items-center justify-center text-[12px] font-bold shrink-0 border-2 border-[var(--border)] font-mono" style={{boxShadow:'var(--shadow-hard-sm)'}}>
                                {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-bold font-mono text-[var(--text)] truncate">
                                    {user?.displayName || 'User'}
                                </p>
                                <p className="text-[10px] font-mono text-[var(--muted)] truncate">
                                    {user?.subscriptionTier === 'free' ? 'free plan' : user?.subscriptionTier}
                                </p>
                            </div>
                        </button>
                    )}
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden sticky top-0 z-[60] bg-[var(--surface)] border-b-2 border-[var(--border)] px-4 py-3 flex items-center justify-between">
                <Link href={router.query.demo === 'true' ? '/?demo=true' : '/'} className="flex items-center gap-2">
                    {!logoError && (
                        <Image src="/logo.png" alt="" width={24} height={24} className="h-6 w-6 object-contain border border-[var(--border-soft)] p-0.5" onError={() => setLogoError(true)} />
                    )}
                    <span className="text-xl font-display font-bold text-[var(--text)]">Serify</span>
                </Link>
                <div className="flex items-center gap-2">
                    <UsageIndicator />
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="w-9 h-9 bg-[var(--surface)] border-2 border-[var(--border)] flex items-center justify-center text-[var(--text)]" style={{boxShadow:'var(--shadow-hard-sm)',borderRadius:'3px'}}
                    >
                        {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                    <div className="relative" ref={mobileProfileRef}>
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="w-9 h-9 bg-[var(--accent)] text-[var(--surface)] flex items-center justify-center text-xs font-bold font-mono border-2 border-[var(--border)] cursor-pointer" style={{boxShadow:'var(--shadow-hard-sm)',borderRadius:'3px'}}
                        >
                            {user?.displayName?.charAt(0) || 'U'}
                        </button>
                        {isProfileOpen && (
                            <div className="absolute top-full mt-1.5 right-0 w-44 bg-[var(--surface)] border-2 border-[var(--border)] overflow-hidden animate-modal-in z-50" style={{boxShadow:'var(--shadow-hard)',borderRadius:'3px'}}>
                                <Link href="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-[var(--bg)] text-xs font-mono text-[var(--text)] border-b border-[var(--border-soft)]">
                                    <Settings size={13} className="text-[var(--muted)]" /> Settings
                                </Link>
                                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 text-xs font-mono text-[var(--warn)] hover:bg-[var(--bg)] text-left">
                                    <LogOut size={13} /> Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-[70] bg-[var(--bg)] dot-grid-bg animate-fade-in flex flex-col pt-14">
                    <div className="absolute top-3 right-3">
                        <button onClick={() => setIsMobileMenuOpen(false)} className="w-9 h-9 bg-[var(--surface)] border-2 border-[var(--border)] flex items-center justify-center" style={{boxShadow:'var(--shadow-hard-sm)',borderRadius:'3px'}}>
                            <X size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-5 py-8 space-y-6">
                        <nav className="space-y-1">
                            {navItems.map((item: any) => {
                                const isActive = router.pathname.startsWith(item.href) && (item.href !== '/' || router.pathname === '/');
                                return (
                                    <Link
                                        key={item.href}
                                        href={router.query.demo === 'true' ? `${item.href}${item.href.includes('?') ? '&' : '?'}demo=true` : item.href}
                                        className={`flex items-center gap-4 px-4 py-3 border-2 transition-all font-mono text-base ${
                                            isActive ? 'bg-[var(--accent)] text-[var(--surface)] border-[var(--ink)] font-bold' : 'text-[var(--text)] border-transparent hover:bg-[var(--surface)] hover:border-[var(--border-soft)]'
                                        }`}
                                        style={{borderRadius:'3px', boxShadow: isActive ? 'var(--shadow-hard-sm)' : 'none'}}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                            {themeToggleItem}
                        </nav>
                        {user && (
                            <div className="pt-4 border-t-2 border-[var(--border)]">
                                <UsageIndicator showAlways={true} className="w-full justify-between py-2 px-3 border border-[var(--border-soft)] bg-[var(--surface)] text-xs font-mono" />
                                <Link href="/settings/billing" className="btn-secondary w-full mt-3 justify-center">Manage plan</Link>
                                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 mt-2 border-2 border-[var(--warn)]/40 text-[var(--warn)] hover:bg-[var(--warn-soft)] transition-colors font-mono text-sm" style={{borderRadius:'3px'}}>
                                    <LogOut size={16} /> Sign out
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

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] border-t-2 border-[var(--border)] flex items-center justify-around pb-safe">
                {navItems.slice(0, 5).map((item: any) => {
                    const isActive = router.pathname.startsWith(item.href) && (item.href !== '/' || router.pathname === '/');
                    return (
                        <Link
                            key={item.href}
                            href={router.query.demo === 'true' ? `${item.href}${item.href.includes('?') ? '&' : '?'}demo=true` : item.href}
                            className={`flex flex-col items-center justify-center py-2.5 px-1 w-full gap-1 transition-all relative font-mono ${
                                isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                            }`}
                        >
                            {isActive && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[var(--accent)]" />
                            )}
                            <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>{item.icon}</div>
                            <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-normal'}`}>{item.label}</span>
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
