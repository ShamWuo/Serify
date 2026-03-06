import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import {
    Search,
    Command,
    Home,
    PlusCircle,
    Sparkles,
    History,
    Archive,
    Settings,
    ChevronRight,
    Zap,
    X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ id: string; name: string; type: 'concept' | 'session'; date?: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const navShortcuts = [
        { name: 'Dashboard', icon: <Home size={16} />, href: '/' },
        { name: 'New Session', icon: <PlusCircle size={16} />, href: '/analyze' },
        { name: 'Learn Mode', icon: <Sparkles size={16} />, href: '/learn' },
        { name: 'Session History', icon: <History size={16} />, href: '/sessions' },
        { name: 'Concept Vault', icon: <Archive size={16} />, href: '/vault' },
        { name: 'Settings', icon: <Settings size={16} />, href: '/settings' },
    ];

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleSearch = async () => {
            if (query.trim().length < 2) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                // Search concepts
                const { data: concepts } = await supabase
                    .from('knowledge_nodes')
                    .select('id, display_name, canonical_name')
                    .or(`display_name.ilike.%${query}%,canonical_name.ilike.%${query}%`)
                    .eq('user_id', user?.id)
                    .limit(3);

                // Search sessions
                const { data: sessions } = await supabase
                    .from('reflection_sessions')
                    .select('id, created_at, content_source')
                    .eq('user_id', user?.id)
                    .ilike('content_source->>title', `%${query}%`)
                    .limit(3);

                const formattedConcepts = (concepts || []).map(c => ({
                    id: c.id,
                    name: c.display_name || c.canonical_name,
                    type: 'concept' as const
                }));

                const formattedSessions = (sessions || []).map(s => ({
                    id: s.id,
                    name: (s.content_source as any)?.title || 'Untitled Session',
                    type: 'session' as const,
                    date: new Date(s.created_at).toLocaleDateString()
                }));

                setResults([...formattedConcepts, ...formattedSessions]);
            } catch (err) {
                console.error('Search failed', err);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(handleSearch, 300);
        return () => clearTimeout(timer);
    }, [query, user?.id]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % (navShortcuts.length + results.length));
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + (navShortcuts.length + results.length)) % (navShortcuts.length + results.length));
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const items = [...navShortcuts, ...results];
                const selected = items[selectedIndex];
                if (selected) {
                    if ('href' in selected) {
                        router.push(selected.href);
                    } else if (selected.type === 'concept') {
                        router.push(`/vault?concept=${selected.id}`);
                    } else {
                        router.push(`/sessions?id=${selected.id}`);
                    }
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, navShortcuts, results, router, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 sm:px-0">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-backdrop"
                onClick={onClose}
            />

            {/* Palette */}
            <div className="relative w-full max-w-lg glass-premium rounded-2xl shadow-2xl overflow-hidden border border-white/20 animate-cmd-palette">
                <div className="flex items-center px-4 py-3 border-b border-[var(--border)] gap-3">
                    <Search className="text-[var(--muted)]" size={18} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search for concepts, sessions, or commands..."
                        className="flex-1 bg-transparent border-none outline-none text-[var(--text)] text-sm placeholder:text-[var(--muted)]"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg)] border border-[var(--border)] rounded-md text-[10px] text-[var(--muted)] font-bold">
                        <Command size={10} /> Esc
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {query.trim().length === 0 ? (
                        <>
                            <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-[var(--muted)]">Quick Navigation</div>
                            {navShortcuts.map((item, idx) => (
                                <div
                                    key={item.href}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${selectedIndex === idx ? 'bg-[var(--accent)] text-white' : 'text-[var(--text)] hover:bg-[var(--bg)]'
                                        }`}
                                    onClick={() => {
                                        router.push(item.href);
                                        onClose();
                                    }}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={selectedIndex === idx ? 'text-white' : 'text-[var(--muted)]'}>
                                            {item.icon}
                                        </div>
                                        <span className="text-sm font-medium">{item.name}</span>
                                    </div>
                                    {selectedIndex === idx && <ChevronRight size={14} className="opacity-70" />}
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="space-y-4 py-2">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-10">
                                    <Zap className="text-[var(--accent)] animate-pulse mb-3" size={24} />
                                    <span className="text-xs text-[var(--muted)] font-medium">Scouring your mind...</span>
                                </div>
                            ) : results.length > 0 ? (
                                <>
                                    <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-[var(--muted)]">Search Results</div>
                                    {results.map((result, idx) => {
                                        const globalIdx = idx + navShortcuts.length; // This is wrong if we don't show shortcuts
                                        // Simple mapping: if query exist, only show results
                                        return (
                                            <div
                                                key={result.id}
                                                className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${selectedIndex === idx ? 'bg-[var(--accent)] text-white' : 'text-[var(--text)] hover:bg-[var(--bg)]'
                                                    }`}
                                                onClick={() => {
                                                    if (result.type === 'concept') router.push(`/vault?concept=${result.id}`);
                                                    else router.push(`/sessions?id=${result.id}`);
                                                    onClose();
                                                }}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedIndex === idx ? 'bg-white/20' : result.type === 'concept' ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'bg-purple-100 text-purple-600'
                                                        }`}>
                                                        {result.type === 'concept' ? <Zap size={16} /> : <History size={16} />}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium">{result.name}</div>
                                                        <div className={`text-[10px] ${selectedIndex === idx ? 'text-white/70' : 'text-[var(--muted)]'}`}>
                                                            {result.type === 'concept' ? 'Concept' : `Session • ${result.date}`}
                                                        </div>
                                                    </div>
                                                </div>
                                                {selectedIndex === idx && <ChevronRight size={14} className="opacity-70" />}
                                            </div>
                                        );
                                    })}
                                </>
                            ) : (
                                <div className="text-center py-10">
                                    <div className="text-[var(--muted)] text-sm mb-1">No results for &quot;{query}&quot;</div>
                                    <div className="text-[10px] text-[var(--muted)] opacity-50 uppercase tracking-widest font-bold">Try searching for concepts like &apos;Quantum Mechanics&apos;</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-4 py-2 bg-[var(--bg)]/50 border-t border-[var(--border)] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)] font-medium">
                            <span className="px-1 py-0.5 bg-[var(--bg)] border border-[var(--border)] rounded lowercase font-bold">↑↓</span> to navigate
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)] font-medium">
                            <span className="px-1 py-0.5 bg-[var(--bg)] border border-[var(--border)] rounded lowercase font-bold">↵</span> to select
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[var(--muted)] hover:text-[var(--text)] transition-colors p-1"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
