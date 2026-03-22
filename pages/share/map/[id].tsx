import { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { Maximize2, ZoomIn, ZoomOut, Zap, Brain, Globe } from 'lucide-react';
import { KnowledgeNode, MasteryState } from '@/types/serify';
import Link from 'next/link';

const MASTERY_COLORS: Record<MasteryState, string> = {
    mastered: '#1A4A38',
    solid: '#2A5C45',
    developing: '#4A90A4',
    shaky: '#B8860B',
    revisit: '#C4541A'
};

interface Point { x: number; y: number; }
const CENTER_X = 800;
const CENTER_Y = 600;

export default function PublicKnowledgeMap() {
    const router = useRouter();
    const { id: shareToken } = router.query;

    const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [nodePositions, setNodePositions] = useState<Record<string, Point>>({});
    const [zoom, setZoom] = useState(0.8);
    const [pan, setPan] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!router.isReady || !shareToken) return;

        const fetchData = async () => {
            try {
                // 1. Fetch Profile by Share Token
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, display_name, is_map_public')
                    .eq('share_token', shareToken)
                    .single();

                if (profileError || !profileData || !profileData.is_map_public) {
                    setError('This knowledge map is private or does not exist.');
                    return;
                }
                setProfile(profileData);

                // 2. Fetch Public Nodes
                const { data: nodesData } = await supabase
                    .from('knowledge_nodes')
                    .select('*')
                    .eq('user_id', profileData.id);

                setNodes(nodesData || []);
            } catch (e) {
                setError('Failed to load knowledge map.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router.isReady, shareToken]);

    // Simple layout seed
    useEffect(() => {
        if (nodes.length === 0) return;
        const initial: Record<string, Point> = { 'root': { x: CENTER_X, y: CENTER_Y } };
        nodes.forEach((node, i) => {
            const angle = (i / nodes.length) * Math.PI * 2;
            const dist = 250 + Math.random() * 100;
            initial[node.id] = {
                x: CENTER_X + Math.cos(angle) * dist,
                y: CENTER_Y + Math.sin(angle) * dist
            };
        });
        setNodePositions(initial);
    }, [nodes]);

    if (loading) return (
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
            <Zap className="text-[var(--accent)] animate-pulse" size={48} />
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-4xl font-display text-[var(--text)] mb-4">Void.</h1>
            <p className="text-[var(--muted)] mb-8">{error}</p>
            <Link href="/" className="px-6 py-2 bg-[var(--accent)] text-white rounded-xl font-bold">Try Serify</Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-[var(--bg)] relative overflow-hidden font-sans select-none">
            <Head>
                <title>{profile?.display_name}&apos;s Mastery Map | Serify</title>
            </Head>

            {/* Public Header */}
            <div className="absolute top-8 left-8 z-10 p-6 bg-[var(--surface)]/70 backdrop-blur-2xl border border-[var(--border)] rounded-[32px] shadow-2xl max-w-sm">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white">
                        <Globe size={20} />
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest">Mastery Map</div>
                        <div className="text-lg font-display text-[var(--text)]">{profile?.display_name}</div>
                    </div>
                </div>
                <p className="text-[var(--muted)] text-xs leading-relaxed">
                    Visualizing conceptual understanding across {nodes.length} nodes.
                </p>
            </div>

            {/* Branding Overlay */}
            <Link href="/" className="absolute bottom-8 right-8 z-10 p-4 bg-white border border-[var(--border)] rounded-2xl shadow-xl flex items-center gap-3 hover:scale-105 transition-transform group">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white">
                    <Brain size={18} />
                </div>
                <div>
                    <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest leading-none mb-1">Created with</div>
                    <div className="text-sm font-display font-medium text-[var(--text)] leading-none">Serify</div>
                </div>
            </Link>

            {/* Controls */}
            <div className="absolute top-8 right-8 z-10 flex flex-col gap-3">
                <div className="bg-[var(--surface)]/70 backdrop-blur-md border border-[var(--border)] rounded-2xl p-1.5 flex flex-col gap-1 shadow-xl">
                    <button onClick={() => setZoom(z => Math.min(z * 1.2, 4))} className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text)] hover:bg-[var(--accent)] hover:text-white transition-all">
                        <ZoomIn size={20} />
                    </button>
                    <button onClick={() => setZoom(z => Math.max(z * 0.8, 0.1))} className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text)] hover:bg-[var(--accent)] hover:text-white transition-all">
                        <ZoomOut size={20} />
                    </button>
                    <button onClick={() => { setZoom(0.8); setPan({ x: 0, y: 0 }); }} className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text)] hover:bg-[var(--accent)] hover:text-white transition-all">
                        <Maximize2 size={18} />
                    </button>
                </div>
            </div>

            {/* Minimal Canvas (Read-only) */}
            <div className="w-full h-full bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:40px_40px]">
                <svg width="100%" height="100vh" viewBox="0 0 1600 1200" className="transition-transform duration-300 ease-out" style={{ 
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center'
                }}>
                    {nodes.map(node => {
                        const pos = nodePositions[node.id] || { x: CENTER_X, y: CENTER_Y };
                        const color = MASTERY_COLORS[node.current_mastery as MasteryState] || '#ccc';
                        return (
                            <g key={node.id}>
                                <line x1={CENTER_X} y1={CENTER_Y} x2={pos.x} y2={pos.y} stroke={color} strokeWidth="1" opacity="0.2" />
                                <circle cx={pos.x} cy={pos.y} r="8" fill={color} />
                                <text x={pos.x} y={pos.y + 20} textAnchor="middle" fill={color} fontSize="10" fontWeight="bold" className="uppercase tracking-tighter">
                                    {node.display_name}
                                </text>
                            </g>
                        );
                    })}
                    <circle cx={CENTER_X} cy={CENTER_Y} r="12" fill="var(--text)" />
                </svg>
            </div>
        </div>
    );
}
