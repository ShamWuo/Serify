import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap } from 'lucide-react';
import Link from 'next/link';

interface KnowledgeMiniMapProps {
    userId?: string;
}

export default function KnowledgeMiniMap({ userId }: KnowledgeMiniMapProps) {
    const [nodes, setNodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        const fetchNodes = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                if (!token) return;

                const res = await fetch(`/api/vault/nodes?tab=all`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const d = await res.json();
                    setNodes(d.nodes || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchNodes();
    }, [userId]);

    const stats = useMemo(() => {
        if (nodes.length === 0) return null;
        const masteryCounts = nodes.reduce((acc, node) => {
            acc[node.current_mastery] = (acc[node.current_mastery] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            total: nodes.length,
            solid: masteryCounts.solid || 0,
            developing: masteryCounts.developing || 0,
            shaky: masteryCounts.shaky || 0,
            revisit: masteryCounts.revisit || 0,
        };
    }, [nodes]);

    if (loading) {
        return (
            <div className="w-full h-32 flex items-center justify-center bg-[var(--bg)]/50 rounded-2xl animate-pulse">
                <Zap size={20} className="text-[var(--accent)]/30" />
            </div>
        );
    }

    if (!stats || stats.total === 0) {
        return (
            <div className="w-full p-6 text-center border border-dashed border-[var(--border)] rounded-2xl">
                <p className="text-xs text-[var(--muted)]">Your knowledge map will appear here once you start learning.</p>
            </div>
        );
    }

    return (
        <Link href="/knowledge-map" className="block group">
            <div className="premium-card p-5 rounded-2xl overflow-hidden relative">
                <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-[var(--accent)] opacity-[0.03] blur-2xl rounded-full" />

                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">Knowledge Map</h3>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full text-[10px] font-bold">
                        {stats.total} Nodes
                    </div>
                </div>

                <div className="flex items-end gap-1 h-12 mb-4">
                    {['solid', 'developing', 'shaky', 'revisit'].map((level) => {
                        const count = (stats as any)[level];
                        const height = Math.max((count / stats.total) * 100, 10);
                        const colors: any = {
                            solid: 'bg-[#2A5C45]',
                            developing: 'bg-[#4A90A4]',
                            shaky: 'bg-[#B8860B]',
                            revisit: 'bg-[#C4541A]'
                        };
                        return (
                            <div
                                key={level}
                                className={`flex-1 ${colors[level]} rounded-sm transition-all duration-500 group-hover:opacity-80`}
                                style={{ height: `${height}%` }}
                                title={`${level}: ${count}`}
                            />
                        );
                    })}
                </div>

                <div className="flex items-center justify-between text-[10px] text-[var(--muted)] font-medium">
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#2A5C45]" />
                        Solid ({stats.solid})
                    </div>
                    <span className="group-hover:text-[var(--accent)] transition-colors">Visual Map →</span>
                </div>
            </div>
        </Link>
    );
}
