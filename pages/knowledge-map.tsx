import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Maximize2, ZoomIn, ZoomOut, Zap } from 'lucide-react';
import { KnowledgeNode, ConceptTopic, MasteryState } from '@/types/serify';

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
    const [topics, setTopics] = useState<ConceptTopic[]>([]);
    const [loading, setLoading] = useState(true);

    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const [hoveredNode, setHoveredNode] = useState<MapNode | null>(null);

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
                    setTopics(d.topics || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchNodes();
    }, [user]);

    // Calculate layout
    const { mapNodes, mapLinks } = useMemo(() => {
        const outNodes: MapNode[] = [];
        const outLinks: MapLink[] = [];

        if (nodes.length === 0) return { mapNodes: [], mapLinks: [] };

        const centerX = 800;
        const centerY = 600;

        // Root node
        outNodes.push({
            id: 'root',
            label: 'Your Mind',
            type: 'root',
            x: centerX,
            y: centerY,
            r: 40,
            color: 'var(--text)'
        });

        const activeTopics = topics.filter(t => nodes.some(n => n.topic_id === t.id));
        const topicRadius = Math.max(250, activeTopics.length * 40);

        activeTopics.forEach((topic, i) => {
            const angle = (i / activeTopics.length) * Math.PI * 2;
            const tx = centerX + Math.cos(angle) * topicRadius;
            const ty = centerY + Math.sin(angle) * topicRadius;

            outNodes.push({
                id: `topic-${topic.id}`,
                label: topic.name,
                type: 'topic',
                x: tx,
                y: ty,
                r: 25,
                color: 'var(--muted)',
                data: topic
            });

            outLinks.push({
                source: { x: centerX, y: centerY },
                target: { x: tx, y: ty },
                color: 'rgba(0,0,0,0.05)'
            });

            // Concepts for this topic
            const topicConcepts = nodes.filter(n => n.topic_id === topic.id);
            const conceptRadius = Math.max(80, topicConcepts.length * 15);

            topicConcepts.forEach((concept, j) => {
                const cAngle = (j / topicConcepts.length) * Math.PI * 2 + angle; // Slight offset
                const cx = tx + Math.cos(cAngle) * conceptRadius;
                const cy = ty + Math.sin(cAngle) * conceptRadius;

                const color = MASTERY_COLORS[concept.current_mastery] || MASTERY_COLORS.developing;

                outNodes.push({
                    id: concept.id,
                    label: concept.display_name || concept.canonical_name,
                    type: 'concept',
                    x: cx,
                    y: cy,
                    r: 8 + Math.min(concept.session_count, 10), // Size by experience
                    color,
                    data: concept
                });

                outLinks.push({
                    source: { x: tx, y: ty },
                    target: { x: cx, y: cy },
                    color: 'rgba(0,0,0,0.05)'
                });
            });
        });

        // Uncategorized concepts
        const uncategorized = nodes.filter(n => !n.topic_id);
        const uncatRadius = topicRadius + 150;
        uncategorized.forEach((concept, i) => {
            const angle = (i / uncategorized.length) * Math.PI * 2;
            const cx = centerX + Math.cos(angle) * uncatRadius;
            const cy = centerY + Math.sin(angle) * uncatRadius;

            const color = MASTERY_COLORS[concept.current_mastery] || MASTERY_COLORS.developing;

            outNodes.push({
                id: concept.id,
                label: concept.display_name || concept.canonical_name,
                type: 'concept',
                x: cx,
                y: cy,
                r: 8 + Math.min(concept.session_count, 10),
                color,
                data: concept
            });

            outLinks.push({
                source: { x: centerX, y: centerY },
                target: { x: cx, y: cy },
                color: 'rgba(0,0,0,0.05)'
            });
        });

        return { mapNodes: outNodes, mapLinks: outLinks };
    }, [nodes, topics]);

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
        e.preventDefault();
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(z => Math.max(0.2, Math.min(z * zoomDelta, 3)));
    };

    const handleNodeClick = (node: MapNode) => {
        if (node.type === 'concept') {
            router.push(`/vault?concept=${node.id}`);
        }
    };

    return (
        <DashboardLayout>
            <Head>
                <title>Knowledge Map | Serify</title>
            </Head>

            <div className="flex flex-col h-[calc(100vh-64px)] bg-[var(--bg)] relative overflow-hidden">
                {/* Header Overlay */}
                <div className="absolute top-6 left-6 z-10 p-4 bg-[var(--surface)]/80 backdrop-blur-md border border-[var(--border)] rounded-2xl shadow-sm">
                    <Link href="/vault" className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-3 text-sm font-medium">
                        <ChevronLeft size={16} /> Back to Vault List
                    </Link>
                    <h1 className="text-2xl font-display font-medium text-[var(--text)]">Knowledge Map</h1>
                    <p className="text-[var(--muted)] text-sm mt-1">
                        A visual constellation of everything you&apos;ve learned.
                    </p>
                </div>

                {/* Controls overlay */}
                <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
                    <button onClick={() => setZoom(z => Math.min(z * 1.2, 3))} className="w-10 h-10 bg-[var(--surface)] border border-[var(--border)] rounded-full flex items-center justify-center text-[var(--text)] hover:border-[var(--accent)] transition-colors shadow-sm">
                        <ZoomIn size={18} />
                    </button>
                    <button onClick={() => setZoom(z => Math.max(z * 0.8, 0.2))} className="w-10 h-10 bg-[var(--surface)] border border-[var(--border)] rounded-full flex items-center justify-center text-[var(--text)] hover:border-[var(--accent)] transition-colors shadow-sm">
                        <ZoomOut size={18} />
                    </button>
                    <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="w-10 h-10 bg-[var(--surface)] border border-[var(--border)] rounded-full flex items-center justify-center text-[var(--text)] hover:border-[var(--accent)] transition-colors shadow-sm mt-2">
                        <Maximize2 size={16} />
                    </button>
                </div>

                {/* Canvas */}
                <div
                    className="flex-1 w-full h-full cursor-grab active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                >
                    {loading ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="animate-pulse flex flex-col items-center">
                                <Zap className="text-[var(--accent)] mb-4" size={32} />
                                <p className="text-[var(--muted)] font-medium tracking-wide text-sm">Mapping your mind...</p>
                            </div>
                        </div>
                    ) : nodes.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center bg-[var(--surface)] p-8 rounded-3xl border border-[var(--border)] shadow-sm max-w-sm">
                                <h3 className="text-lg font-bold mb-2">Your map is empty</h3>
                                <p className="text-[var(--muted)] text-sm mb-6">Complete learning sessions to watch your knowledge constellation grow.</p>
                                <Link href="/learn" className="inline-flex h-10 items-center justify-center px-6 bg-[var(--accent)] text-white rounded-xl font-bold text-sm">
                                    Start Learning
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <svg className="w-full h-full">
                            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                                {/* Links layer */}
                                {mapLinks.map((link, i) => (
                                    <line
                                        key={i}
                                        x1={link.source.x} y1={link.source.y}
                                        x2={link.target.x} y2={link.target.y}
                                        stroke={link.color}
                                        strokeWidth={1.5}
                                    />
                                ))}

                                {/* Nodes layer */}
                                {mapNodes.map((node) => (
                                    <g
                                        key={node.id}
                                        transform={`translate(${node.x}, ${node.y})`}
                                        onClick={() => handleNodeClick(node)}
                                        onMouseEnter={() => setHoveredNode(node)}
                                        onMouseLeave={() => setHoveredNode(null)}
                                        className={node.type === 'concept' ? 'cursor-pointer transition-transform duration-200 hover:scale-110' : ''}
                                    >
                                        <circle
                                            r={node.r}
                                            fill={node.type === 'concept' ? node.color + '20' : node.color + '10'}
                                            stroke={node.color}
                                            strokeWidth={node.type === 'root' ? 0 : 2}
                                            className={node.type === 'concept' ? 'animate-pulse-glow shadow-sm' : ''}
                                        />
                                        <circle
                                            r={node.type === 'concept' ? node.r / 2 : node.r}
                                            fill={node.color}
                                        />
                                    </g>
                                ))}
                            </g>
                        </svg>
                    )}
                </div>

                {/* Hover Tooltip Overlay */}
                {hoveredNode && hoveredNode.type === 'concept' && (
                    <div className="absolute top-6 right-6 z-20 w-72 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl p-5 animate-fade-in-up">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: hoveredNode.color }} />
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Concept Node</span>
                        </div>
                        <h3 className="text-base font-bold text-[var(--text)] leading-tight mb-2">{hoveredNode.label}</h3>
                        <p className="text-xs text-[var(--muted)] line-clamp-3 mb-4">
                            {hoveredNode.data?.definition || 'No definition available.'}
                        </p>
                        <div className="text-[10px] text-[var(--muted)] flex items-center justify-between">
                            <span>{hoveredNode.data?.session_count} sessions</span>
                            <span className="font-bold" style={{ color: hoveredNode.color }}>
                                {hoveredNode.data?.current_mastery.charAt(0).toUpperCase() + hoveredNode.data?.current_mastery.slice(1)} Mastery
                            </span>
                        </div>
                        <div className="text-xs text-[var(--accent)] font-medium mt-3 border-t border-[var(--border)] pt-3">
                            Click to view in Vault →
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
