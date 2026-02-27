import { useState, useEffect } from 'react';
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
    ChevronUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SparkBalance from '@/components/sparks/SparkBalance';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [vaultNeedsWork, setVaultNeedsWork] = useState(0);

    useEffect(() => {
        setIsProfileOpen(false);
    }, [router.asPath]);


    useEffect(() => {
        if (!user) return;
        import('@/lib/supabase').then(({ supabase }) => {
            supabase.auth.getSession().then(({ data: { session } }) => {
                const token = session?.access_token;
                if (!token) return;
                fetch('/api/vault/stats', { headers: { Authorization: `Bearer ${token}` } })
                    .then(r => r.ok ? r.json() : null)
                    .then(d => { if (d) setVaultNeedsWork(d.needsWork || 0); })
                    .catch(() => { });
            });
        });
    }, [user]);

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    const navItems = [
        { href: '/', label: 'Home', icon: <Home size={20} /> },
        { href: '/analyze', label: 'New Session', icon: <PlusCircle size={20} /> },
        { href: '/sessions', label: 'Sessions', icon: <History size={20} /> },
        { href: '/flow', label: 'Flow Mode', icon: <LibraryBig size={20} className="text-purple-500" /> },
        { href: '/vault', label: 'Concept Vault', icon: <Archive size={20} />, badge: vaultNeedsWork > 0 ? vaultNeedsWork : undefined },
        { href: '/settings', label: 'Settings', icon: <Settings size={20} /> },
    ];

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col md:flex-row font-sans">
            <aside className="hidden md:flex flex-col w-[220px] border-r border-[var(--border)] bg-[var(--surface)] h-screen sticky top-0 shrink-0 z-40">
                <div className="px-6 pt-8 pb-8">
                    <Link href="/" className="block">
                        <div className="text-3xl font-display text-[var(--text)] tracking-tight">Serify</div>
                        <div className="text-xs text-[var(--muted)] mt-1 tracking-wide uppercase font-medium">Reflection Engine</div>
                    </Link>
                </div>

                <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = router.pathname.startsWith(item.href) && (item.href !== '/' || router.pathname === '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                                    ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                                    : 'text-[var(--text)] hover:bg-black/5'
                                    }`}
                            >
                                <div className={`${isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>
                                    {item.icon}
                                </div>
                                <span className="font-medium text-[15px] flex-1">{item.label}</span>
                                {(item as any).badge ? (
                                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                        {(item as any).badge}
                                    </span>
                                ) : null}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-3 relative border-t border-[var(--border)]">
                    {isProfileOpen && (
                        <div className="absolute bottom-full mb-2 left-3 right-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden animate-fade-in z-50">
                            <Link href="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-black/5 transition-colors text-sm">
                                <Settings size={16} className="text-[var(--muted)]" /> Settings
                            </Link>
                            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 hover:bg-black/5 transition-colors text-sm text-left border-t border-[var(--border)]">
                                <LogOut size={16} className="text-[var(--muted)]" /> Sign Out
                            </button>
                        </div>
                    )}
                    <div className="mb-2 w-full flex justify-center">
                        <SparkBalance />
                    </div>
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-black/5 transition-colors text-left"
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-medium shrink-0">
                                {user?.displayName?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--text)] truncate">{user?.displayName || 'User'}</p>
                                <p className="text-xs text-[var(--muted)] truncate capitalize">{user?.subscriptionTier || 'free'} Plan</p>
                            </div>
                        </div>
                        <ChevronUp size={16} className={`text-[var(--muted)] transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </aside>

            <div className="md:hidden sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
                <Link href="/" className="text-2xl font-display text-[var(--text)]">Serify</Link>
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
                    <Link href="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-black/5 transition-colors text-sm border-b border-[var(--border)]">
                        <Settings size={16} className="text-[var(--muted)]" /> Settings
                    </Link>
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 hover:bg-black/5 transition-colors text-sm text-left">
                        <LogOut size={16} className="text-[var(--muted)]" /> Sign Out
                    </button>
                </div>
            )}

            <main className="flex-1 w-full flex flex-col min-h-[calc(100vh-64px)] md:min-h-screen pb-20 md:pb-0">
                {children}
            </main>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-around pb-safe">
                {navItems.slice(0, 5).map((item) => {
                    const isActive = router.pathname.startsWith(item.href) && (item.href !== '/' || router.pathname === '/');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center py-2 px-1 w-full gap-1 transition-colors ${isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                                }`}
                        >
                            {item.icon}
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
