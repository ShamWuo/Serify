import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Maximize2, ZoomIn, ZoomOut, Zap, Network, PlayCircle, Brain } from 'lucide-react';
import { KnowledgeNode, VaultCategory, MasteryState } from '@/types/serify';

const MASTERY_COLORS: Record<MasteryState, string> = {
    solid: '#2A5C45',      // Accent
    developing: '#4A90A4', // Blue/Teal
    shaky: '#B8860B',      // Shallow
    revisit: '#C4541A'     // Warn
};

interface Point {
    x: number;
    y: number;
}

interface MapNode extends Point {
    id: string;
    label: string;
    type: 'root' | 'topic' | 'concept';
    r: number;
    color: string;
    data?: any;
}

interface MapLink {
    source: Point;
    target: Point;
    color: string;
}

export default function KnowledgeMap() {
    const { user } = useAuth();
    const router = useRouter();

    const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
    const [categories, setCategories] = useState<VaultCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const [backfilling, setBackfilling] = useState(false);
    const [backfillDone, setBackfillDone] = useState(false);

    // Physics State
    const [nodePositions, setNodePositions] = useState<Record<string, Point>>({});
    const [zoom, setZoom] = useState(0.8);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

    // Constants for physics
    const REPULSION = 40000;
    const ATTRACTION = 0.035;
    const DAMPING = 0.82;
    const CENTER_X = 800;
    const CENTER_Y = 600;

    useEffect(() => {
        if (!user) return;
        const fetchNodes = async () => {
            setLoading(true);
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
                    setCategories(d.categories || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchNodes();
    }, [user]);

    // Initial Layout Seed
    useEffect(() => {
        if (nodes.length === 0) return;
        const initial: Record<string, Point> = {
            'root': { x: CENTER_X, y: CENTER_Y }
        };

        categories.forEach((c, i) => {
            const angle = (i / categories.length) * Math.PI * 2;
            initial[`category-${c.id}`] = {
                x: CENTER_X + Math.cos(angle) * 350,
                y: CENTER_Y + Math.sin(angle) * 350
            };
        });

        nodes.forEach((n, i) => {
            const angle = Math.random() * Math.PI * 2;
            const dist = 500 + Math.random() * 300;
            initial[n.id] = {
                x: CENTER_X + Math.cos(angle) * dist,
                y: CENTER_Y + Math.sin(angle) * dist
            };
        });

        setNodePositions(initial);
    }, [nodes, categories]);

    // Physics Loop
    useEffect(() => {
        if (loading || nodes.length === 0 || isDragging) return;

        let animationFrame: number;
        let velocities: Record<string, { vx: number; vy: number }> = {};

        const step = () => {
            setNodePositions(prev => {
                const next = { ...prev };
                const allIds = Object.keys(next);

                // Initialize velocities if needed
                allIds.forEach(id => {
                    if (!velocities[id]) velocities[id] = { vx: 0, vy: 0 };
                });

                // 1. Repulsion (All nodes push each other)
                for (let i = 0; i < allIds.length; i++) {
                    for (let j = i + 1; j < allIds.length; j++) {
                        const idA = allIds[i];
                        const idB = allIds[j];
                        const a = next[idA];
                        const b = next[idB];
                        const dx = b.x - a.x;
                        const dy = b.y - a.y;
                        const distSq = dx * dx + dy * dy || 1;
                        const dist = Math.sqrt(distSq);
                        const force = REPULSION / distSq;

                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;

                        velocities[idA].vx -= fx;
                        velocities[idA].vy -= fy;
                        velocities[idB].vx += fx;
                        velocities[idB].vy += fy;
                    }
                }

                // 2. Attraction (Hierarchy)
                // Categories to Root
                categories.forEach(c => {
                    const id = `category-${c.id}`;
                    if (!next[id]) return;
                    const dx = next['root'].x - next[id].x;
                    const dy = next['root'].y - next[id].y;
                    velocities[id].vx += dx * ATTRACTION;
                    velocities[id].vy += dy * ATTRACTION;
                });

                // Concepts to Categories
                nodes.forEach(n => {
                    if (!next[n.id]) return;
                    const targetId = n.category_id ? `category-${n.category_id}` : 'root';
                    const target = next[targetId];
                    if (!target) return;
                    const dx = target.x - next[n.id].x;
                    const dy = target.y - next[n.id].y;
                    velocities[n.id].vx += dx * ATTRACTION * 1.5;
                    velocities[n.id].vy += dy * ATTRACTION * 1.5;
                });

                // 3. Center Gravity
                allIds.forEach(id => {
                    if (id === 'root') return;
                    const dx = CENTER_X - next[id].x;
                    const dy = CENTER_Y - next[id].y;
                    velocities[id].vx += dx * 0.005;
                    velocities[id].vy += dy * 0.005;
                });

                // Apply velocities and damping
                allIds.forEach(id => {
                    if (id === 'root' && !draggedNodeId) return; // Keep root stable unless dragged
                    const v = velocities[id];
                    next[id] = {
                        x: next[id].x + v.vx,
                        y: next[id].y + v.vy
                    };
                    v.vx *= DAMPING;
                    v.vy *= DAMPING;
                });

                return next;
            });

            animationFrame = requestAnimationFrame(step);
        };

        animationFrame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(animationFrame);
    }, [loading, nodes, categories, isDragging, draggedNodeId]);

    const triggerBackfill = async () => {
        if (backfilling || backfillDone) return;
        setBackfilling(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const res = await fetch('/api/vault/backfill', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const d = await res.json();
            if (d.backfilled > 0) {
                const res2 = await fetch(`/api/vault/nodes?tab=all`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res2.ok) {
                    const d2 = await res2.json();
                    setNodes(d2.nodes || []);
                    setCategories(d2.categories || []);
                }
            }
        } catch (e) {
            console.error('Backfill failed', e);
        } finally {
            setBackfilling(false);
            setBackfillDone(true);
        }
    };

    useEffect(() => {
        if (!loading && nodes.length === 0 && !backfillDone && !backfilling) {
            triggerBackfill();
        }
    }, [loading, nodes.length, backfillDone, backfilling]);

    // Graph Data Helpers
    const mapNodes = useMemo(() => {
        const out: MapNode[] = [];
        if (!nodePositions['root']) return [];

        out.push({
            id: 'root',
            label: 'Your Mind',
            type: 'root',
            x: nodePositions['root'].x,
            y: nodePositions['root'].y,
            r: 32,
            color: 'var(--text)'
        });

        categories.forEach(c => {
            const pos = nodePositions[`category-${c.id}`];
            if (!pos) return;
            out.push({
                id: `category-${c.id}`,
                label: c.name,
                type: 'topic',
                x: pos.x,
                y: pos.y,
                r: 18,
                color: 'var(--muted)',
                data: c
            });
        });

        nodes.forEach(n => {
            const pos = nodePositions[n.id];
            if (!pos) return;
            out.push({
                id: n.id,
                label: n.display_name || n.canonical_name,
                type: 'concept',
                x: pos.x,
                y: pos.y,
                r: 8 + Math.min(n.session_count, 8),
                color: MASTERY_COLORS[n.current_mastery] || MASTERY_COLORS.developing,
                data: n
            });
        });

        return out;
    }, [nodes, categories, nodePositions]);

    const mapLinks = useMemo(() => {
        const out: MapLink[] = [];
        if (mapNodes.length === 0) return [];

        categories.forEach(c => {
            const source = nodePositions['root'];
            const target = nodePositions[`category-${c.id}`];
            if (source && target) {
                out.push({ source, target, color: 'var(--border)' });
            }
        });

        nodes.forEach(n => {
            const sourceId = n.category_id ? `category-${n.category_id}` : 'root';
            const source = nodePositions[sourceId];
            const target = nodePositions[n.id];
            if (source && target) {
                out.push({ source, target, color: 'var(--border)' });
            }
        });

        return out;
    }, [nodes, categories, nodePositions, mapNodes]);

    // Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleWheel = (e: React.WheelEvent) => {
        const zoomDelta = e.deltaY > 0 ? 0.94 : 1.06;
        const nextZoom = Math.max(0.1, Math.min(zoom * zoomDelta, 4));

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Project cursor into map-space
        const mapX = (x - pan.x) / zoom;
        const mapY = (y - pan.y) / zoom;

        // Adjust pan to keep the projected point at the same screen position
        setPan({
            x: x - mapX * nextZoom,
            y: y - mapY * nextZoom
        });
        setZoom(nextZoom);
    };

    // Native listener to prevent page zoom on pinch
    useEffect(() => {
        const canvas = document.getElementById('map-canvas-container');
        if (!canvas) return;

        const preventPageZoom = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
            }
        };

        canvas.addEventListener('wheel', preventPageZoom, { passive: false });
        return () => canvas.removeEventListener('wheel', preventPageZoom);
    }, []);

    const handleNodeClick = (node: MapNode) => {
        if (node.type === 'concept') {
            router.push(`/vault?concept=${node.id}`);
        }
    };

    const hoveredNode = hoveredNodeId ? mapNodes.find(n => n.id === hoveredNodeId) : null;

    return (
        <DashboardLayout>
            <Head>
                <title>Knowledge Map | Serify</title>
            </Head>

            <div className="flex flex-col h-[calc(100vh-64px)] bg-[var(--bg)] relative overflow-hidden font-sans">
                {/* Header Overlay */}
                <div
                    className={`absolute top-4 left-4 md:top-8 md:left-8 z-10 p-6 md:p-8 bg-[var(--surface)]/70 backdrop-blur-2xl border border-[var(--border)] rounded-[24px] md:rounded-[32px] shadow-2xl shadow-black/10 transition-all duration-500 animate-fade-in group
                    ${isHeaderCollapsed ? 'w-14 h-14 overflow-hidden p-0 rounded-2xl flex items-center justify-center cursor-pointer shadow-none border-none' : 'max-w-md'}
                    `}
                    onClick={() => isHeaderCollapsed && setIsHeaderCollapsed(false)}
                >
                    {isHeaderCollapsed ? (
                        <div className="flex items-center justify-center w-full h-full text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all rounded-2xl">
                            <Brain size={24} />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <Link href="/vault" className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--accent)] transition-all text-[10px] font-bold uppercase tracking-[0.2em]">
                                    <ChevronLeft size={14} /> Back to Vault
                                </Link>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsHeaderCollapsed(true); }}
                                    className="p-1.5 rounded-lg hover:bg-[var(--accent)]/10 text-[var(--muted)] hover:text-[var(--accent)] transition-all"
                                    title="Collapse"
                                >
                                    <ChevronLeft size={16} className="-rotate-90" />
                                </button>
                            </div>
                            <h1 className="text-2xl md:text-4xl font-display font-medium text-[var(--text)] tracking-tight mb-2">Knowledge Map</h1>
                            <p className="text-[var(--muted)] text-xs md:text-sm max-w-[260px] leading-relaxed opacity-80">
                                A dynamic constellation of your conceptual understanding.
                            </p>
                        </>
                    )}
                </div>

                {/* Separate Legend Layer (Bottom Left) */}
                {!isHeaderCollapsed && (
                    <div className="absolute bottom-24 left-4 md:bottom-8 md:left-8 z-10 p-4 bg-[var(--surface)]/40 backdrop-blur-md border border-[var(--border)] rounded-2xl flex flex-wrap gap-x-4 gap-y-2 animate-fade-in pointer-events-none md:pointer-events-auto">
                        {Object.entries(MASTERY_COLORS).map(([lvl, color]) => (
                            <div key={lvl} className="flex items-center gap-2">
                                <div className="w-2 rounded-full h-2" style={{ backgroundColor: color }} />
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">{lvl}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Controls overlay */}
                <div className="absolute top-6 right-6 z-10 flex flex-col gap-3">
                    <div className="bg-[var(--surface)]/70 backdrop-blur-md border border-[var(--border)] rounded-2xl p-1.5 flex flex-col gap-1 shadow-xl">
                        <button onClick={() => setZoom(z => Math.min(z * 1.2, 4))} className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text)] hover:bg-[var(--accent)] hover:text-white transition-all">
                            <ZoomIn size={20} />
                        </button>
                        <button onClick={() => setZoom(z => Math.max(z * 0.8, 0.1))} className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text)] hover:bg-[var(--accent)] hover:text-white transition-all">
                            <ZoomOut size={20} />
                        </button>
                        <div className="h-px bg-[var(--border)] mx-2 my-1" />
                        <button onClick={() => { setZoom(0.8); setPan({ x: 0, y: 0 }); }} className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text)] hover:bg-[var(--accent)] hover:text-white transition-all" title="Reset View">
                            <Maximize2 size={18} />
                        </button>
                    </div>
                </div>

                {/* Canvas */}
                <div
                    id="map-canvas-container"
                    className="flex-1 w-full h-full cursor-grab active:cursor-grabbing transition-opacity duration-700"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel as any}
                    style={{ opacity: loading ? 0.3 : 1 }}
                >
                    {loading ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="flex flex-col items-center">
                                <Zap className="text-[var(--accent)] animate-pulse mb-4" size={42} />
                                <p className="text-[var(--muted)] font-bold tracking-[0.2em] uppercase text-[10px]">Projecting Neural Map...</p>
                            </div>
                        </div>
                    ) : nodes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-full text-center px-6 max-w-lg mx-auto page-transition">
                            <div className="relative mb-10">
                                <div className="w-24 h-24 bg-[var(--accent)]/5 rounded-[40px] flex items-center justify-center animate-breathe relative z-10 border border-[var(--accent)]/10">
                                    <Network size={40} className="text-[var(--accent)] opacity-60" />
                                </div>
                                <div className="absolute -inset-8 bg-[var(--accent)]/5 rounded-full animate-pulse opacity-30" />
                            </div>

                            <h2 className="text-3xl font-display font-medium text-[var(--text)] mb-4 tracking-tight italic">Tabula Rasa.</h2>
                            <p className="text-[var(--muted)] text-base mb-10 leading-relaxed">
                                Your knowledge map is empty. Start your first AI-guided learning session to begin charting your conceptual universe.
                            </p>

                            <Link
                                href="/"
                                className="h-14 px-10 bg-[var(--text)] text-[var(--surface)] rounded-2xl text-base font-bold hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3"
                            >
                                <PlayCircle size={22} fill="currentColor" />
                                Begin Learning
                            </Link>
                        </div>
                    ) : (
                        <svg className="w-full h-full select-none overflow-visible">
                            <defs>
                                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="4" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                                {Object.entries(MASTERY_COLORS).map(([lvl, color]) => (
                                    <radialGradient id={`grad-${lvl}`} key={lvl}>
                                        <stop offset="0%" stopColor={color} />
                                        <stop offset="100%" stopColor={color} stopOpacity="0.4" />
                                    </radialGradient>
                                ))}
                            </defs>

                            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                                {/* Links layer */}
                                {mapLinks.map((link, i) => (
                                    <line
                                        key={i}
                                        x1={link.source.x} y1={link.source.y}
                                        x2={link.target.x} y2={link.target.y}
                                        stroke={link.color}
                                        strokeWidth={1}
                                        strokeOpacity={0.15}
                                    />
                                ))}

                                {/* Nodes layer */}
                                {mapNodes.map((node) => {
                                    const isHovered = hoveredNodeId === node.id;
                                    const isConcept = node.type === 'concept';
                                    const isTopic = node.type === 'topic';
                                    const isRoot = node.type === 'root';

                                    return (
                                        <g
                                            key={node.id}
                                            transform={`translate(${node.x}, ${node.y})`}
                                            onClick={() => handleNodeClick(node)}
                                            onMouseEnter={() => setHoveredNodeId(node.id)}
                                            onMouseLeave={() => setHoveredNodeId(null)}
                                            className={`${isConcept ? 'cursor-pointer' : ''} transition-all duration-300`}
                                        >
                                            {/* Glow background for concepts */}
                                            {isConcept && (
                                                <circle
                                                    r={node.r * 2.2}
                                                    fill={`url(#grad-${(node.data as KnowledgeNode).current_mastery})`}
                                                    opacity={isHovered ? 0.3 : 0.15}
                                                    className="animate-pulse-glow"
                                                />
                                            )}

                                            {/* Topic ring */}
                                            {isTopic && (
                                                <circle
                                                    r={node.r + 8}
                                                    fill="none"
                                                    stroke="var(--border)"
                                                    strokeWidth={1}
                                                    strokeDasharray="4 4"
                                                    className="animate-slow-spin"
                                                />
                                            )}

                                            {/* Core node */}
                                            <circle
                                                r={node.r}
                                                fill={isRoot ? 'var(--text)' : (isTopic ? 'var(--surface)' : node.color)}
                                                stroke={isTopic ? 'var(--muted)' : 'none'}
                                                strokeWidth={isTopic ? 1 : 0}
                                                className={`transition-all duration-300 ${isHovered ? 'scale-125 shadow-2xl' : ''}`}
                                                style={isHovered && isConcept ? { filter: 'url(#glow)' } : {}}
                                            />

                                            {/* Icon for topics/root */}
                                            {isRoot && <Brain size={16} className="text-[var(--surface)] -translate-x-2 -translate-y-2" />}

                                            {/* Labels (Visible only when zoomed in or hovered) */}
                                            {(zoom > 0.6 || isHovered || isTopic || isRoot) && (
                                                <text
                                                    y={node.r + 16}
                                                    textAnchor="middle"
                                                    className={`fill-[var(--text)] font-bold pointer-events-none transition-opacity duration-300 select-none
                                                        ${isRoot ? 'text-lg' : (isTopic ? 'text-xs uppercase tracking-widest fill-[var(--muted)]' : 'text-[10px]')}
                                                    `}
                                                    style={{ opacity: isConcept && !isHovered && zoom < 1.2 ? 0.4 : 1 }}
                                                >
                                                    {node.label}
                                                </text>
                                            )}
                                        </g>
                                    );
                                })}
                            </g>
                        </svg>
                    )}
                </div>

                {/* Hover Tooltip Overlay */}
                {hoveredNode && hoveredNode.type === 'concept' && (
                    <div className="absolute bottom-6 left-6 z-20 w-80 bg-[var(--surface)]/80 backdrop-blur-xl border border-[var(--border)] rounded-3xl shadow-2xl p-6 animate-fade-in-up">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredNode.color }} />
                                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--muted)]">Concept Node</span>
                            </div>
                            <div className="px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-bold">
                                {hoveredNode.data?.session_count} Sessions
                            </div>
                        </div>

                        <h3 className="text-xl font-display font-medium text-[var(--text)] leading-tight mb-3">{hoveredNode.label}</h3>

                        {hoveredNode.data?.definition ? (
                            <p className="text-xs text-[var(--muted)] line-clamp-3 mb-5 leading-relaxed">
                                {hoveredNode.data.definition}
                            </p>
                        ) : (
                            <div className="h-px bg-[var(--border)] w-full mb-5" />
                        )}

                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: hoveredNode.color }}>
                                {hoveredNode.data?.current_mastery} Mastery
                            </span>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] group cursor-pointer" onClick={() => handleNodeClick(hoveredNode)}>
                                View Context <ChevronLeft size={14} className="rotate-180 transition-transform group-hover:translate-x-1" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
