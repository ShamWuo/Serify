import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
    Search,
    ChevronDown,
    ChevronRight,
    X,
    FolderTree,
    Folder,
    BookOpen,
    Zap,
    Archive,
    Brain,
    Filter,
    XCircle,
    MoreHorizontal,
    Plus,
    LayoutList,
    Layers,
    Trash2,
    Check,
    Edit2,
    FolderOpen,
    GitMerge,
    RotateCcw,
    Box
} from 'lucide-react';

import { KnowledgeNode, VaultCategory, StudySet, MasteryState } from '@/types/serify';

// --- Constants & Config ---

const MASTERY_CONFIG: Record<MasteryState, { label: string; color: string; bg: string; dot: string; weight: number }> = {
    solid: { label: 'Solid', color: 'text-[#2A5C45]', bg: 'bg-[#2A5C45]/10', dot: 'bg-[#2A5C45]', weight: 3 },
    developing: { label: 'Developing', color: 'text-[#4A90A4]', bg: 'bg-[#4A90A4]/10', dot: 'bg-[#4A90A4]', weight: 2 },
    shaky: { label: 'Shaky', color: 'text-[#B8860B]', bg: 'bg-[#B8860B]/10', dot: 'bg-[#B8860B]', weight: 1 },
    revisit: { label: 'Revisit', color: 'text-[#C4541A]', bg: 'bg-[#C4541A]/10', dot: 'bg-[#C4541A]', weight: 0 }
};

const DEFAULT_MASTERY = { label: 'Not Studied', color: 'text-[var(--muted)]', bg: 'bg-[var(--border)]', dot: 'bg-[var(--border)]', weight: -1 };

type Tab = 'all' | 'needs_work' | 'solid';
type SortOption = 'last_seen' | 'alpha' | 'mastery';

// --- Helper Components ---

function MasteryDot({ state, size = 10, className = '' }: { state: MasteryState | string | null; size?: number, className?: string }) {
    const cfg = state ? (MASTERY_CONFIG[state as MasteryState] || MASTERY_CONFIG['developing']) : DEFAULT_MASTERY;
    return (
        <span
            className={`inline-block rounded-full shrink-0 ${cfg.dot} ${className}`}
            style={{ width: size, height: size }}
        />
    );
}

// --- Main Page Component ---

export default function VaultPage() {
    const { user } = useAuth();
    const router = useRouter();

    // Data State
    const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
    const [categories, setCategories] = useState<VaultCategory[]>([]);
    const [studySets, setStudySets] = useState<StudySet[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Filter/Sort State
    const [tab, setTab] = useState<Tab>('all');
    const [sort, setSort] = useState<SortOption>('last_seen');
    const [selectedMasteries, setSelectedMasteries] = useState<MasteryState[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [hierarchyMode, setHierarchyMode] = useState<'hierarchical' | 'flat'>('hierarchical');

    // UI State
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

    // Backfill
    const [backfilling, setBackfilling] = useState(false);
    const [backfillIndicators, setBackfillIndicators] = useState(0);

    const fetchVaultData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return;
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            const res = await fetch(`/api/vault/nodes?tab=${tab}&sort=${sort}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const d = await res.json();
                setNodes(d.nodes || []);
                setCategories(d.categories || []);
                setStudySets(d.studySets || []);

                // Initialize collapsed categories from DB
                if (d.categories) {
                    const collapsed = new Set<string>();
                    d.categories.forEach((c: any) => {
                        if (c.is_collapsed) collapsed.add(c.id);
                    });
                    setCollapsedCategories(collapsed);
                }
            }
        } catch (e) {
            console.error('[vault] Error fetching data:', e);
        } finally {
            setLoading(false);
        }
    }, [tab, sort]);

    // Per-Concept Actions State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [renamingNode, setRenamingNode] = useState<KnowledgeNode | null>(null);
    const [newName, setNewName] = useState('');
    const [movingNode, setMovingNode] = useState<KnowledgeNode | null>(null);
    const [selectedMoveCatId, setSelectedMoveCatId] = useState('');
    const [mergingNode, setMergingNode] = useState<KnowledgeNode | null>(null);
    const [selectedMergeTargetId, setSelectedMergeTargetId] = useState('');
    const [mergeSearch, setMergeSearch] = useState('');
    const [isAddingConcept, setIsAddingConcept] = useState(false);
    const [newConceptForm, setNewConceptForm] = useState({
        displayName: '',
        definition: '',
        categoryId: '',
        parentId: '',
        isSub: false
    });

    // Drag and Drop State
    const draggedNodeRef = useRef<string | null>(null);
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);
    const [lastMove, setLastMove] = useState<{ nodeId: string; prevUpdates: any } | null>(null);
    const [showUndoToast, setShowUndoToast] = useState(false);

    const handleDragStart = (e: React.DragEvent, nodeId: string) => {
        setDraggedNodeId(nodeId);
        draggedNodeRef.current = nodeId;
        e.dataTransfer.setData('text/plain', nodeId);
        e.dataTransfer.effectAllowed = 'move';
        document.body.classList.add('dragging-active');
    };

    const handleDragEnd = (e: React.DragEvent) => {
        document.body.classList.remove('dragging-active');
        setDraggedNodeId(null);
        draggedNodeRef.current = null;
        setDropTargetId(null);
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        // Use ref (not state) to avoid stale closure issues
        if (draggedNodeRef.current === targetId) return;
        setDropTargetId(targetId);
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only clear if we're actually leaving the drop zone (not entering a child)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDropTargetId(null);
        }
    };

    const handleDrop = async (e: React.DragEvent, targetId: string, targetType: 'category' | 'concept') => {
        e.preventDefault();
        setDropTargetId(null);
        const sourceId = draggedNodeRef.current || draggedNodeId || e.dataTransfer.getData('text/plain');

        // Clear drag state immediately
        setDraggedNodeId(null);
        draggedNodeRef.current = null;

        if (!sourceId || sourceId === targetId) return;

        const sourceNode = nodes.find(n => n.id === sourceId);
        if (!sourceNode) return;

        const prevUpdates = {
            category_id: sourceNode.category_id,
            parent_concept_id: sourceNode.parent_concept_id,
            is_sub_concept: sourceNode.is_sub_concept
        };

        const updates: any = {};
        if (targetType === 'category') {
            updates.category_id = targetId === 'other' ? null : targetId;
            updates.parent_concept_id = null;
            updates.is_sub_concept = false;
        } else {
            updates.parent_concept_id = targetId;
            updates.is_sub_concept = true;
            const targetNode = nodes.find(n => n.id === targetId);
            if (targetNode) updates.category_id = targetNode.category_id;
        }

        // Optimistic Update
        setNodes(prev => prev.map(n => n.id === sourceId ? { ...n, ...updates } : n));

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/vault/nodes/${sourceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ updates })
            });

            if (res.ok) {
                setLastMove({ nodeId: sourceId, prevUpdates });
                setShowUndoToast(true);
                setTimeout(() => setShowUndoToast(false), 6000);
            } else {
                // Revert on error
                setNodes(prev => prev.map(n => n.id === sourceId ? { ...n, ...prevUpdates } : n));
                const err = await res.json();
                console.error('[vault] Update failed:', err.error);
            }
        } catch (e) {
            setNodes(prev => prev.map(n => n.id === sourceId ? { ...n, ...prevUpdates } : n));
            console.error('[vault] Drop error:', e);
        }
        // Note: drag state is already cleared above before async work
    };

    const handleUndoMove = async () => {
        if (!lastMove) return;
        const { nodeId, prevUpdates } = lastMove;
        setShowUndoToast(false);
        setActionLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/vault/nodes/${nodeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ updates: prevUpdates })
            });
            if (res.ok) {
                await fetchVaultData();
                setLastMove(null);
            }
        } catch (e) {
            console.error('Undo error:', e);
        } finally {
            setActionLoading(false);
        }
    };

    const handleMergeNodes = async (sourceId: string, targetId: string) => {
        try {
            setActionLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/vault/merge-nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ sourceId, targetId })
            });
            if (res.ok) {
                await fetchVaultData();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
            setMergingNode(null);
            setActiveMenuId(null);
        }
    };

    const handleAddConcept = async () => {
        if (!newConceptForm.displayName) return;
        setActionLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/vault/add-node', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({
                    display_name: newConceptForm.displayName,
                    definition: newConceptForm.definition,
                    category_id: newConceptForm.categoryId,
                    parent_concept_id: newConceptForm.parentId,
                    is_sub_concept: newConceptForm.isSub
                })
            });
            if (res.ok) {
                setIsAddingConcept(false);
                setNewConceptForm({ displayName: '', definition: '', categoryId: '', parentId: '', isSub: false });
                await fetchVaultData();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to add concept');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to add concept');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateNode = async (nodeId: string, updates: any) => {
        try {
            setActionLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/vault/nodes/${nodeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ updates })
            });
            if (res.ok) {
                await fetchVaultData();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
            setRenamingNode(null);
            setMovingNode(null);
            setActiveMenuId(null);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClick = () => setActiveMenuId(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    useEffect(() => {
        if (user) fetchVaultData();
    }, [fetchVaultData, user]);

    // Filter Logic
    const toggleMasteryFilter = (mastery: MasteryState) => {
        setSelectedMasteries(prev =>
            prev.includes(mastery) ? prev.filter(m => m !== mastery) : [...prev, mastery]
        );
    };

    const toggleSourceFilter = (source: string) => {
        setSelectedSources(prev =>
            prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
        );
    };

    const clearFilters = () => {
        setSelectedMasteries([]);
        setSelectedSources([]);
        setIsFilterOpen(false);
    };

    const hasActiveFilters = useMemo(() => selectedMasteries.length > 0 || selectedSources.length > 0, [selectedMasteries, selectedSources]);

    // Data Processing
    const filteredNodes = useMemo(() => {
        let result = nodes;

        // 1. Array filters (Mastery & Source)
        if (selectedMasteries.length > 0) {
            result = result.filter(n => selectedMasteries.includes(n.current_mastery));
        }
        if (selectedSources.length > 0) {
            result = result.filter(n => {
                const sources = n.mastery_history?.map(h => h.sourceType) || [];
                return selectedSources.some(s => sources.includes(s as any));
            });
        }

        // 2. Search filter
        if (search.trim()) {
            const q = search.toLowerCase();
            const matchingCatIds = new Set(categories.filter(c => c.name.toLowerCase().includes(q)).map(c => c.id));
            const parentMatches = new Set(result.filter(n => !n.is_sub_concept && (n.display_name || '').toLowerCase().includes(q)).map(n => n.id));

            result = result.filter(n => {
                if ((n.display_name || '').toLowerCase().includes(q)) return true;
                if (n.parent_concept_id && parentMatches.has(n.parent_concept_id)) return true;
                if (parentMatches.has(n.id)) return true;
                if (n.category_id && matchingCatIds.has(n.category_id)) return true;
                return false;
            });
        }

        return result;
    }, [nodes, categories, search, selectedMasteries, selectedSources]);

    // Construct Hierarchy Optimized O(N)
    const hierarchy = useMemo(() => {
        // Group everything by category and parent
        const nodesByCategory = new Map<string | null, KnowledgeNode[]>();
        const nodesByParent = new Map<string, KnowledgeNode[]>();

        nodes.forEach(n => {
            const cid = n.category_id || null;
            if (!nodesByCategory.has(cid)) nodesByCategory.set(cid, []);
            nodesByCategory.get(cid)!.push(n);
        });

        filteredNodes.forEach(n => {
            if (n.parent_concept_id) {
                if (!nodesByParent.has(n.parent_concept_id)) nodesByParent.set(n.parent_concept_id, []);
                nodesByParent.get(n.parent_concept_id)!.push(n);
            }
        });

        const grouped: any[] = [];
        const processedIds = new Set<string>();

        // 1. Process Categorized Nodes
        categories.sort((a, b) => a.display_order - b.display_order).forEach(cat => {
            const allInCat = nodesByCategory.get(cat.id) || [];
            const filteredInCat = filteredNodes.filter(n => n.category_id === cat.id);

            const parentNodes = filteredInCat.filter(n => !n.is_sub_concept && !n.parent_concept_id);
            const parentGroups = parentNodes.map(parent => {
                const subs = nodesByParent.get(parent.id) || [];
                const ids = [parent.id, ...subs.map(s => s.id)];
                ids.forEach(id => processedIds.add(id));

                const allMasteries = [parent, ...subs].map(n => (n.current_mastery || 'developing') as MasteryState);
                let aggregateMastery: MasteryState = 'solid';
                if (allMasteries.includes('revisit')) aggregateMastery = 'revisit';
                else if (allMasteries.includes('shaky')) aggregateMastery = 'shaky';
                else if (allMasteries.some(m => !m || m === 'developing')) aggregateMastery = 'developing';

                return {
                    parent,
                    subs,
                    aggregateMastery,
                    needsWork: allMasteries.filter(m => m === 'shaky' || m === 'revisit').length,
                    allMasteries
                };
            });

            if (parentGroups.length > 0 || allInCat.some(n => !processedIds.has(n.id))) {
                const totalNodes = allInCat.length;
                const stats = {
                    solid: allInCat.filter(n => n.current_mastery === 'solid').length,
                    developing: allInCat.filter(n => n.current_mastery === 'developing').length,
                    shaky: allInCat.filter(n => n.current_mastery === 'shaky').length,
                    revisit: allInCat.filter(n => n.current_mastery === 'revisit').length,
                    not_studied: allInCat.filter(n => !n.current_mastery).length
                };
                grouped.push({
                    category: cat,
                    parentGroups,
                    totalNodes,
                    stats,
                    progress: totalNodes > 0 ? (stats.solid / totalNodes) * 100 : 0
                });
            }
        });

        // 2. Process Uncategorized Hierarchically
        const remainingNodes = filteredNodes.filter(n => !processedIds.has(n.id) && (!n.category_id || !new Set(categories.map(c => c.id)).has(n.category_id)));
        const uncategorizedParents = remainingNodes.filter(n => !n.is_sub_concept && !n.parent_concept_id);

        const uncategorizedGroups = uncategorizedParents.map(parent => {
            const subs = nodesByParent.get(parent.id) || [];
            subs.forEach(s => processedIds.add(s.id));
            processedIds.add(parent.id);

            const allMasteries = [parent, ...subs].map(n => (n.current_mastery || 'developing') as MasteryState);
            let aggregateMastery: MasteryState = 'solid';
            if (allMasteries.includes('revisit')) aggregateMastery = 'revisit';
            else if (allMasteries.includes('shaky')) aggregateMastery = 'shaky';
            else if (allMasteries.some(m => !m || m === 'developing')) aggregateMastery = 'developing';

            return {
                parent,
                subs,
                aggregateMastery,
                needsWork: allMasteries.filter(m => m === 'shaky' || m === 'revisit').length,
                allMasteries
            };
        });

        // Any subs whose parents were NOT in the uncategorized list (shouldn't happen with filteredNodes, but for safety)
        const Orphans = remainingNodes.filter(n => !processedIds.has(n.id));

        return { grouped, uncategorizedGroups, orphans: Orphans };
    }, [categories, nodes, filteredNodes]);

    const toggleSelection = (ids: string[], e: React.MouseEvent | React.ChangeEvent) => {
        e.stopPropagation();
        setSelectedNodeIds(prev => {
            const next = new Set(prev);
            const allSelected = ids.every(id => next.has(id));
            if (allSelected) ids.forEach(id => next.delete(id));
            else ids.forEach(id => next.add(id));
            return next;
        });
    };

    const toggleCategory = async (id: string) => {
        const isCurrentlyCollapsed = collapsedCategories.has(id);
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            isCurrentlyCollapsed ? next.delete(id) : next.add(id);
            return next;
        });

        // Update persistence in DB
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            await fetch('/api/vault/update-category', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ id, updates: { is_collapsed: !isCurrentlyCollapsed } })
            });
        } catch (e) {
            console.error('Failed to update category collapse state:', e);
        }
    };

    const toggleParent = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setCollapsedParents(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const hasAnyConcepts = nodes.length > 0;
    const selectedArray = Array.from(selectedNodeIds);

    // Handlers
    const handleBulkAction = async (action: 'delete' | 'archive') => {
        if (selectedNodeIds.size === 0) return;
        const confirmMsg = action === 'delete' ? 'Are you sure you want to permanently delete these concepts?' : 'Archive these concepts?';
        if (!window.confirm(confirmMsg)) return;

        setActionLoading(true);
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            const res = await fetch('/api/vault/bulk-action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ action, concept_ids: Array.from(selectedNodeIds) })
            });

            if (res.ok) {
                setSelectedNodeIds(new Set());
                fetchVaultData();
            } else {
                alert('Action failed');
            }
        } catch (e) {
            console.error(e);
            alert('Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateStudySet = async () => {
        if (selectedNodeIds.size === 0) return;
        const name = window.prompt('Enter name for the new Study Set:');
        if (!name) return;

        setActionLoading(true);
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            const res = await fetch('/api/vault/study-sets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name, concept_ids: Array.from(selectedNodeIds) })
            });

            if (res.ok) {
                setSelectedNodeIds(new Set());
                fetchVaultData();
            } else {
                alert('Failed to create Study Set');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to create Study Set');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <Head><title>Concept Vault | Serify</title></Head>

            <div className="max-w-[1000px] mx-auto px-6 py-8 pb-32">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-display text-[var(--text)]">Concept Vault</h1>
                        <p className="text-[var(--muted)] text-sm mt-1">
                            Your organized library of mastered and developing concepts.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                        <button
                            onClick={() => setIsAddingConcept(true)}
                            className="hidden sm:flex h-10 px-4 rounded-xl bg-[var(--surface)] text-[var(--text)] font-semibold items-center gap-2 border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all glass shadow-sm"
                        >
                            <Plus size={16} />
                            Add Concept
                        </button>
                        <div className="relative w-full sm:w-auto">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                            <input
                                type="text"
                                placeholder="Search concepts…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 h-10 w-full sm:w-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm outline-none focus:border-[var(--accent)] transition-colors glass"
                            />
                        </div>
                    </div>
                </div>

                {/* Filters & View Toggles */}
                {hasAnyConcepts && (
                    <div className="flex flex-col gap-4 mb-8">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1 glass">
                                {([
                                    ['all', 'All'],
                                    ['needs_work', 'Needs Work'],
                                    ['solid', 'Solid']
                                ] as [Tab, string][]).map(([t, label]) => (
                                    <button
                                        key={t}
                                        onClick={() => setTab(t)}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 relative">
                                <button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className={`h-9 px-3 rounded-xl border text-sm font-medium flex items-center gap-2 transition-colors ${hasActiveFilters || isFilterOpen
                                        ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)] dark:text-[var(--accent-light)]'
                                        : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)]'
                                        }`}
                                >
                                    <Filter size={14} />
                                    Filter {hasActiveFilters && <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-xs flex items-center justify-center">{selectedMasteries.length + selectedSources.length}</span>}
                                </button>

                                {isFilterOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 p-4">
                                        <div className="mb-4">
                                            <h4 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Mastery</h4>
                                            <div className="space-y-1">
                                                {(['solid', 'developing', 'shaky', 'revisit'] as MasteryState[]).map(m => (
                                                    <label key={m} className="flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer hover:bg-[var(--bg)] p-1.5 rounded">
                                                        <input type="checkbox" checked={selectedMasteries.includes(m)} onChange={() => toggleMasteryFilter(m)} className="accent-[var(--accent)] rounded" />
                                                        <span className="capitalize">{m}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Source</h4>
                                            <div className="space-y-1">
                                                {['session', 'flashcards', 'quiz', 'feynman', 'tutor'].map(s => (
                                                    <label key={s} className="flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer hover:bg-[var(--bg)] p-1.5 rounded">
                                                        <input type="checkbox" checked={selectedSources.includes(s)} onChange={() => toggleSourceFilter(s)} className="accent-[var(--accent)] rounded" />
                                                        <span className="capitalize">{s}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        {hasActiveFilters && (
                                            <button onClick={clearFilters} className="w-full mt-4 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)] border border-[var(--border)] rounded-lg transition-colors">
                                                Clear Filters
                                            </button>
                                        )}
                                    </div>
                                )}

                                <select
                                    value={sort}
                                    onChange={(e) => setSort(e.target.value as SortOption)}
                                    className="h-9 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors"
                                >
                                    <option value="last_seen">Recently Seen</option>
                                    <option value="alpha">Alphabetical</option>
                                    <option value="mastery">Mastery State</option>
                                </select>
                                <div className="flex">
                                    <button
                                        onClick={() => setHierarchyMode('hierarchical')}
                                        className={`h-9 px-3 border border-[var(--border)] rounded-l-xl flex items-center justify-center transition-colors ${hierarchyMode === 'hierarchical' ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'}`}
                                    >
                                        <FolderTree size={16} />
                                    </button>
                                    <button
                                        onClick={() => setHierarchyMode('flat')}
                                        className={`h-9 px-3 border border-l-0 border-[var(--border)] rounded-r-xl flex items-center justify-center transition-colors ${hierarchyMode === 'flat' ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'}`}
                                    >
                                        <LayoutList size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Active Filter Chips */}
                        {hasActiveFilters && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium text-[var(--muted)]">Active Filters:</span>
                                {selectedMasteries.map(m => (
                                    <span key={m} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] dark:text-[var(--accent-light)] border border-[var(--accent)]/20 text-xs font-medium capitalize">
                                        {m}
                                        <button onClick={() => toggleMasteryFilter(m)} className="hover:text-red-500 transition-colors">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                                {selectedSources.map(s => (
                                    <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] dark:text-[var(--accent-light)] border border-[var(--accent)]/20 text-xs font-medium capitalize">
                                        Source: {s}
                                        <button onClick={() => toggleSourceFilter(s)} className="hover:text-red-500 transition-colors">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                                <button onClick={clearFilters} className="text-xs text-[var(--muted)] hover:text-[var(--text)] underline ml-2">
                                    Clear all
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Study Sets Row (Pinned) */}
                {studySets.length > 0 && !search && tab === 'all' && hierarchyMode === 'hierarchical' && (
                    <div className="mb-8 overflow-hidden">
                        <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3 px-1">
                            Study Sets
                        </h2>
                        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x -mx-6 px-6 sm:mx-0 sm:px-0 pt-2">
                            {studySets.map(set => (
                                <Link
                                    key={set.id}
                                    href={`/vault/drill?set=${set.id}`}
                                    className="shrink-0 w-64 p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl hover:border-[var(--accent)] hover:shadow-md transition-all card-hover glass group snap-start block"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center transition-colors group-hover:bg-[var(--accent)] group-hover:text-white">
                                            <Layers size={18} />
                                        </div>
                                        <span className="text-xs text-[var(--muted)] font-medium bg-[var(--bg)] px-2 py-1 rounded-full border border-[var(--border)]">
                                            {set.concept_ids.length} concepts
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-[var(--text)] text-lg mb-1 group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                                        {set.name}
                                    </h3>
                                    <p className="text-xs text-[var(--muted)] mt-2">
                                        Last studied {set.last_studied_at ? new Date(set.last_studied_at).toLocaleDateString() : 'Never'}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                {!loading && hasAnyConcepts && (
                    <div className="space-y-6">
                        {hierarchyMode === 'hierarchical' ? (
                            <>
                                {hierarchy.grouped.map(({ category, parentGroups, totalNodes, progress, stats }) => {
                                    const isCollapsed = search ? false : collapsedCategories.has(category.id);
                                    return (
                                        <div key={category.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden glass shadow-sm">
                                            {/* Category Header */}
                                            <div
                                                onClick={() => toggleCategory(category.id)}
                                                onDragOver={(e) => handleDragOver(e, category.id)}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, category.id, 'category')}
                                                className={`px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-[var(--bg)] transition-all group border-b border-transparent ${dropTargetId === category.id ? 'bg-[var(--accent)]/10 border-[var(--accent)] !border-b-[var(--accent)] shadow-inner' : ''}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        onClick={(e) => {
                                                            const categoryNodes = (hierarchy.grouped[category.id] || []).flatMap(g => [g.parent.id, ...g.subs.map(s => s.id)]);
                                                            toggleSelection(categoryNodes, e);
                                                        }}
                                                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mr-1 cursor-pointer transition-colors ${(hierarchy.grouped[category.id] || []).flatMap(g => [g.parent.id, ...g.subs.map(s => s.id)]).length > 0 && (hierarchy.grouped[category.id] || []).flatMap(g => [g.parent.id, ...g.subs.map(s => s.id)]).every(id => selectedNodeIds.has(id)) ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface)] group-hover:border-[var(--accent)]'}`}
                                                    >
                                                        {(hierarchy.grouped[category.id] || []).flatMap(g => [g.parent.id, ...g.subs.map(s => s.id)]).length > 0 && (hierarchy.grouped[category.id] || []).flatMap(g => [g.parent.id, ...g.subs.map(s => s.id)]).every(id => selectedNodeIds.has(id)) && <Check size={12} className="text-white" strokeWidth={3} />}
                                                    </div>
                                                    {isCollapsed ? <ChevronRight size={18} className="text-[var(--muted)] group-hover:text-[var(--text)] transition-colors" /> : <ChevronDown size={18} className="text-[var(--muted)] group-hover:text-[var(--text)] transition-colors" />}
                                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] group-hover:border-[var(--accent)] transition-colors">
                                                        <Folder size={14} />
                                                    </div>
                                                    <h2 className="text-lg font-bold text-[var(--text)]">{category.name}</h2>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="hidden sm:flex items-center gap-2">
                                                        <div className="w-24 h-1.5 bg-[var(--border)] rounded-full overflow-hidden flex">
                                                            <div className="h-full bg-[#2A5C45]" style={{ width: `${totalNodes > 0 ? (stats.solid / totalNodes) * 100 : 0}%` }} />
                                                            <div className="h-full bg-[#4A90A4]" style={{ width: `${totalNodes > 0 ? (stats.developing / totalNodes) * 100 : 0}%` }} />
                                                            <div className="h-full bg-[#B8860B]" style={{ width: `${totalNodes > 0 ? (stats.shaky / totalNodes) * 100 : 0}%` }} />
                                                            <div className="h-full bg-[#C4541A]" style={{ width: `${totalNodes > 0 ? (stats.revisit / totalNodes) * 100 : 0}%` }} />
                                                        </div>
                                                        <span className="text-xs font-medium text-[var(--muted)]">{Math.round(progress)}% Solid</span>
                                                    </div>
                                                    <span className="text-sm font-medium text-[var(--muted)] bg-[var(--bg)] px-2.5 py-1 rounded-lg border border-[var(--border)]">
                                                        {totalNodes} concepts
                                                    </span>
                                                    <Link
                                                        href={`/vault/drill?category=${category.id}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="hidden sm:flex h-8 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-xs font-bold items-center gap-1.5 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors shadow-sm group-hover:bg-[var(--bg)]"
                                                    >
                                                        <Brain size={14} />
                                                        Study
                                                    </Link>
                                                </div>
                                            </div>

                                            {/* Category Content */}
                                            {!isCollapsed && (
                                                <div
                                                    onDragOver={(e) => handleDragOver(e, category.id)}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={(e) => handleDrop(e, category.id, 'category')}
                                                    className={`border-t border-[var(--border)] bg-[#fafafa] dark:bg-[#0a0a0a] min-h-[40px] transition-colors ${dropTargetId === category.id ? 'bg-[var(--accent)]/5' : ''}`}
                                                >
                                                    {parentGroups.map(({ parent, subs, needsWork, allMasteries, aggregateMastery }: { parent: KnowledgeNode; subs: KnowledgeNode[]; needsWork: number; allMasteries: MasteryState[]; aggregateMastery: MasteryState }) => {
                                                        const pCollapsed = search ? false : collapsedParents.has(parent.id);
                                                        return (
                                                            <div key={parent.id} className="border-b border-[var(--border)] last:border-0 relative">
                                                                {/* Parent Row */}
                                                                <div
                                                                    onClick={(e) => toggleParent(parent.id, e)}
                                                                    draggable
                                                                    onDragStart={(e) => handleDragStart(e, parent.id)}
                                                                    onDragEnd={handleDragEnd}
                                                                    onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, parent.id); }}
                                                                    onDragLeave={handleDragLeave}
                                                                    onDrop={(e) => { e.stopPropagation(); handleDrop(e, parent.id, 'concept'); }}
                                                                    className={`flex items-center pl-10 pr-5 py-3.5 hover:bg-[var(--accent)]/[0.03] transition-all cursor-pointer group relative ${selectedNodeIds.has(parent.id) ? 'bg-[var(--accent)]/[0.03]' : ''} ${draggedNodeId === parent.id ? 'opacity-40' : ''} ${dropTargetId === parent.id ? 'bg-[var(--accent)]/10 ring-2 ring-[var(--accent)] ring-inset z-10' : ''}`}
                                                                >
                                                                    <div
                                                                        onClick={(e) => toggleSelection([parent.id, ...subs.map(s => s.id)], e)}
                                                                        className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 mr-3 cursor-pointer transition-colors ${[parent.id, ...subs.map(s => s.id)].every(id => selectedNodeIds.has(id)) ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface)] group-hover:border-[var(--accent)]'}`}
                                                                    >
                                                                        {[parent.id, ...subs.map(s => s.id)].every(id => selectedNodeIds.has(id)) && <Check size={12} className="text-white" strokeWidth={3} />}
                                                                    </div>

                                                                    <div className="flex-1 min-w-0 pr-4">
                                                                        <div className="flex items-center gap-2">
                                                                            {subs.length > 0 && (
                                                                                <div className="shrink-0 text-[var(--muted)] opacity-50 group-hover:opacity-100 transition-opacity">
                                                                                    {pCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                                                                </div>
                                                                            )}
                                                                            <span className="font-semibold text-[15px] text-[var(--text)] truncate">
                                                                                {parent.display_name}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex items-center gap-2 mr-2">
                                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${MASTERY_CONFIG[aggregateMastery].bg} ${MASTERY_CONFIG[aggregateMastery].color} border-current`}>
                                                                                {MASTERY_CONFIG[aggregateMastery].label}
                                                                            </span>
                                                                            <div className="flex items-center">
                                                                                {allMasteries.slice(0, 5).map((m: any, i: number) => (
                                                                                    <MasteryDot key={i} state={m} size={10} className="border-2 border-[var(--surface)] relative -ml-1 first:ml-0" />
                                                                                ))}
                                                                                {allMasteries.length > 5 && (
                                                                                    <span className="text-[10px] text-[var(--muted)] font-bold ml-1">+{allMasteries.length - 5}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {needsWork > 0 && (
                                                                            <span className="text-[10px] font-bold text-[#B8860B] bg-[#B8860B]/10 px-2 py-0.5 rounded-md border border-[#B8860B]/20">
                                                                                {needsWork} shaky
                                                                            </span>
                                                                        )}
                                                                        <Link
                                                                            href={`/vault/drill?parent=${parent.id}`}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="opacity-0 group-hover:opacity-100 flex h-7 px-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-[11px] font-bold items-center gap-1.5 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all shadow-sm"
                                                                        >
                                                                            <Brain size={12} />
                                                                            Study
                                                                        </Link>
                                                                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === parent.id ? null : parent.id); }}
                                                                                className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border)] transition-all text-[var(--muted)] hover:text-[var(--text)]"
                                                                            >
                                                                                <MoreHorizontal size={16} />
                                                                            </button>
                                                                            {activeMenuId === parent.id && (
                                                                                <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-[100] p-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2">
                                                                                    <button onClick={() => { setRenamingNode(parent); setNewName(parent.display_name); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--bg)] flex items-center gap-2">
                                                                                        <Edit2 size={14} className="text-[var(--muted)]" /> Rename
                                                                                    </button>
                                                                                    <button onClick={() => { setMovingNode(parent); setSelectedMoveCatId(parent.category_id || ''); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--bg)] flex items-center gap-2">
                                                                                        <FolderOpen size={14} className="text-[var(--muted)]" /> Move Category
                                                                                    </button>
                                                                                    <button onClick={() => { setMergingNode(parent); setSelectedMergeTargetId(''); setMergeSearch(''); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--bg)] flex items-center gap-2">
                                                                                        <GitMerge size={14} className="text-[var(--muted)]" /> Merge Into...
                                                                                    </button>
                                                                                    <div className="h-px bg-[var(--border)] my-1 w-[90%] mx-auto" />
                                                                                    <button onClick={() => handleUpdateNode(parent.id, { is_archived: true })} className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2">
                                                                                        <Archive size={14} /> Archive
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Sub-concepts */}
                                                                {!pCollapsed && subs.length > 0 && (
                                                                    <div className="pl-16 relative py-1 border-t border-[var(--border)] bg-[var(--surface)]">
                                                                        <div className="absolute left-[54px] top-0 bottom-4 w-px bg-[var(--border)]" />
                                                                        {subs.map((sub: KnowledgeNode) => (
                                                                            <div
                                                                                key={sub.id}
                                                                                onClick={(e) => toggleSelection([sub.id], e)}
                                                                                draggable
                                                                                onDragStart={(e) => handleDragStart(e, sub.id)}
                                                                                onDragEnd={handleDragEnd}
                                                                                onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, sub.id); }}
                                                                                onDragLeave={handleDragLeave}
                                                                                onDrop={(e) => { e.stopPropagation(); handleDrop(e, sub.id, 'concept'); }}
                                                                                className={`relative flex items-center pr-5 py-2 hover:bg-[var(--accent)]/[0.03] transition-all cursor-pointer group ${draggedNodeId === sub.id ? 'opacity-40' : ''} ${dropTargetId === sub.id ? 'bg-[var(--accent)]/10 ring-2 ring-[var(--accent)] ring-inset z-10' : ''}`}
                                                                            >
                                                                                <div className="absolute left-[-22px] top-1/2 w-4 h-px bg-[var(--border)]" />
                                                                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mr-3 cursor-pointer transition-colors z-10 ${selectedNodeIds.has(sub.id) ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)] bg-[var(--bg)] group-hover:border-[var(--accent)]'}`} onClick={(e) => toggleSelection([sub.id], e)}>
                                                                                    {selectedNodeIds.has(sub.id) && <Check size={12} className="text-white" strokeWidth={3} />}
                                                                                </div>
                                                                                <div className="w-2 h-2 rounded-full mr-2 shrink-0">
                                                                                    <MasteryDot state={sub.current_mastery} size={8} />
                                                                                </div>
                                                                                <span className="text-sm font-medium text-[var(--muted)] group-hover:text-[var(--text)] transition-colors truncate">
                                                                                    {sub.display_name}
                                                                                </span>
                                                                                <span className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    <span className="text-[11px] text-[var(--accent)] font-medium">View →</span>
                                                                                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === sub.id ? null : sub.id); }}
                                                                                            className="flex items-center justify-center w-6 h-6 rounded-lg hover:bg-[var(--border)] transition-colors text-[var(--muted)] hover:text-[var(--text)]"
                                                                                        >
                                                                                            <MoreHorizontal size={14} />
                                                                                        </button>
                                                                                        {activeMenuId === sub.id && (
                                                                                            <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-[100] p-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2">
                                                                                                <button onClick={() => { setRenamingNode(sub); setNewName(sub.display_name); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--bg)] flex items-center gap-2">
                                                                                                    <Edit2 size={14} className="text-[var(--muted)]" /> Rename
                                                                                                </button>
                                                                                                <button onClick={() => { setMovingNode(sub); setSelectedMoveCatId(sub.category_id || ''); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--bg)] flex items-center gap-2">
                                                                                                    <FolderOpen size={14} className="text-[var(--muted)]" /> Move Category
                                                                                                </button>
                                                                                                <button onClick={() => { setMergingNode(sub); setSelectedMergeTargetId(''); setMergeSearch(''); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--bg)] flex items-center gap-2">
                                                                                                    <GitMerge size={14} className="text-[var(--muted)]" /> Merge Into...
                                                                                                </button>
                                                                                                <div className="h-px bg-[var(--border)] my-1 w-[90%] mx-auto" />
                                                                                                <button onClick={() => handleUpdateNode(sub.id, { is_archived: true })} className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2">
                                                                                                    <Archive size={14} /> Archive
                                                                                                </button>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Uncategorized */}
                                {(hierarchy.uncategorizedGroups.length > 0 || hierarchy.orphans.length > 0) && (
                                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden glass shadow-sm">
                                        <div
                                            onDragOver={(e) => handleDragOver(e, 'other')}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, 'other', 'category')}
                                            className={`px-5 py-4 border-b border-[var(--border)] bg-[var(--bg)] flex items-center justify-between transition-colors ${dropTargetId === 'other' ? 'bg-[var(--accent)]/10 ring-2 ring-[var(--accent)] ring-inset' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    onClick={(e) => toggleSelection([...hierarchy.uncategorizedGroups.flatMap(g => [g.parent.id, ...g.subs.map(s => s.id)]), ...hierarchy.orphans.map(o => o.id)], e)}
                                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mr-1 cursor-pointer transition-colors ${[...hierarchy.uncategorizedGroups.flatMap(g => [g.parent.id, ...g.subs.map(s => s.id)]), ...hierarchy.orphans.map(o => o.id)].length > 0 && [...hierarchy.uncategorizedGroups.flatMap(g => [g.parent.id, ...g.subs.map(s => s.id)]), ...hierarchy.orphans.map(o => o.id)].every(id => selectedNodeIds.has(id)) ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]'}`}
                                                >
                                                    {[...hierarchy.uncategorizedGroups.flatMap(g => [g.parent.id, ...g.subs.map(s => s.id)]), ...hierarchy.orphans.map(o => o.id)].length > 0 && [...hierarchy.uncategorizedGroups.flatMap(g => [g.parent.id, ...g.subs.map(s => s.id)]), ...hierarchy.orphans.map(o => o.id)].every(id => selectedNodeIds.has(id)) && <Check size={12} className="text-white" strokeWidth={3} />}
                                                </div>
                                                <div className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
                                                    <Layers size={14} />
                                                </div>
                                                <h2 className="text-lg font-bold text-[var(--text)]">General Concepts</h2>
                                            </div>
                                        </div>
                                        <div
                                            onDragOver={(e) => handleDragOver(e, 'other')}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, 'other', 'category')}
                                            className={`divide-y divide-[var(--border)] min-h-[40px] transition-colors ${dropTargetId === 'other' ? 'bg-[var(--accent)]/5' : ''}`}
                                        >
                                            {hierarchy.uncategorizedGroups.map(({ parent, subs, needsWork, allMasteries, aggregateMastery }: { parent: KnowledgeNode; subs: KnowledgeNode[]; needsWork: number; allMasteries: MasteryState[]; aggregateMastery: MasteryState }) => {
                                                const pCollapsed = search ? false : collapsedParents.has(parent.id);
                                                return (
                                                    <div key={parent.id} className="border-b border-[var(--border)] last:border-0 relative">
                                                        {/* Parent Row */}
                                                        <div
                                                            onClick={(e) => toggleParent(parent.id, e)}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, parent.id)}
                                                            onDragEnd={handleDragEnd}
                                                            onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, parent.id); }}
                                                            onDragLeave={handleDragLeave}
                                                            onDrop={(e) => { e.stopPropagation(); handleDrop(e, parent.id, 'concept'); }}
                                                            className={`flex items-center pl-10 pr-5 py-3.5 hover:bg-[var(--accent)]/[0.03] transition-all cursor-pointer group relative ${selectedNodeIds.has(parent.id) ? 'bg-[var(--accent)]/[0.03]' : ''} ${draggedNodeId === parent.id ? 'opacity-40' : ''} ${dropTargetId === parent.id ? 'bg-[var(--accent)]/10 ring-2 ring-[var(--accent)] ring-inset z-10' : ''}`}
                                                        >
                                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                                <div
                                                                    onClick={(e) => toggleSelection([parent.id, ...subs.map(s => s.id)], e)}
                                                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors z-10 ${[parent.id, ...subs.map(s => s.id)].every(id => selectedNodeIds.has(id)) ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface)] group-hover:border-[var(--accent)]'}`}
                                                                >
                                                                    {[parent.id, ...subs.map(s => s.id)].every(id => selectedNodeIds.has(id)) && <Check size={12} className="text-white" strokeWidth={3} />}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3 min-w-0 flex-1 ml-2">
                                                                <div className="relative flex items-center">
                                                                    <div className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] group-hover:border-[var(--accent)] transition-colors">
                                                                        <Box size={14} />
                                                                    </div>
                                                                    {subs.length > 0 && (
                                                                        <div className="absolute -left-1.5 -top-1.5 w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[9px] font-bold flex items-center justify-center shadow-sm border border-[var(--surface)]">
                                                                            {subs.length}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                                                    {subs.length > 0 && (
                                                                        <div className="shrink-0 text-[var(--muted)] opacity-50 group-hover:opacity-100 transition-opacity">
                                                                            {pCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                                                        </div>
                                                                    )}
                                                                    <span className="font-semibold text-[15px] text-[var(--text)] truncate">
                                                                        {parent.display_name}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <div className="flex items-center gap-2 mr-2">
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${MASTERY_CONFIG[aggregateMastery].bg} ${MASTERY_CONFIG[aggregateMastery].color} border-current`}>
                                                                        {MASTERY_CONFIG[aggregateMastery].label}
                                                                    </span>
                                                                </div>
                                                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === parent.id ? null : parent.id); }}
                                                                        className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border)] transition-all text-[var(--muted)] hover:text-[var(--text)]"
                                                                    >
                                                                        <MoreHorizontal size={16} />
                                                                    </button>
                                                                    {activeMenuId === parent.id && (
                                                                        <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-[100] p-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2">
                                                                            <button onClick={() => { setRenamingNode(parent); setNewName(parent.display_name); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--bg)] flex items-center gap-2">
                                                                                <Edit2 size={14} className="text-[var(--muted)]" /> Rename
                                                                            </button>
                                                                            <button onClick={() => { setMovingNode(parent); setSelectedMoveCatId(parent.category_id || ''); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--bg)] flex items-center gap-2">
                                                                                <FolderOpen size={14} className="text-[var(--muted)]" /> Move Category
                                                                            </button>
                                                                            <button onClick={() => { setMergingNode(parent); setSelectedMergeTargetId(''); setMergeSearch(''); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--bg)] flex items-center gap-2">
                                                                                <GitMerge size={14} className="text-[var(--muted)]" /> Merge Into...
                                                                            </button>
                                                                            <div className="h-px bg-[var(--border)] my-1 w-[90%] mx-auto" />
                                                                            <button onClick={() => handleUpdateNode(parent.id, { is_archived: true })} className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2">
                                                                                <Archive size={14} /> Archive
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Sub-concepts */}
                                                        {!pCollapsed && subs.length > 0 && (
                                                            <div className="pl-16 relative py-1 border-t border-[var(--border)] bg-[var(--surface)]">
                                                                <div className="absolute left-[54px] top-0 bottom-4 w-px bg-[var(--border)]" />
                                                                {subs.map((sub: KnowledgeNode) => (
                                                                    <div
                                                                        key={sub.id}
                                                                        onClick={(e) => toggleSelection([sub.id], e)}
                                                                        draggable
                                                                        onDragStart={(e) => handleDragStart(e, sub.id)}
                                                                        onDragEnd={handleDragEnd}
                                                                        onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, sub.id); }}
                                                                        onDragLeave={handleDragLeave}
                                                                        onDrop={(e) => { e.stopPropagation(); handleDrop(e, sub.id, 'concept'); }}
                                                                        className={`relative flex items-center pr-5 py-2 hover:bg-[var(--accent)]/[0.03] transition-all cursor-pointer group ${draggedNodeId === sub.id ? 'opacity-40' : ''} ${dropTargetId === sub.id ? 'bg-[var(--accent)]/10 ring-2 ring-[var(--accent)] ring-inset z-10' : ''}`}
                                                                    >
                                                                        <div className="absolute left-[-22px] top-1/2 w-4 h-px bg-[var(--border)]" />
                                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mr-3 cursor-pointer transition-colors z-10 ${selectedNodeIds.has(sub.id) ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)] bg-[var(--bg)] group-hover:border-[var(--accent)]'}`} onClick={(e) => toggleSelection([sub.id], e)}>
                                                                            {selectedNodeIds.has(sub.id) && <Check size={12} className="text-white" strokeWidth={3} />}
                                                                        </div>
                                                                        <div className="w-2 h-2 rounded-full mr-2 shrink-0">
                                                                            <MasteryDot state={sub.current_mastery} size={8} />
                                                                        </div>
                                                                        <span className="text-sm font-medium text-[var(--muted)] group-hover:text-[var(--text)] transition-colors truncate">
                                                                            {sub.display_name}
                                                                        </span>
                                                                        <span className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <span className="text-[11px] text-[var(--accent)] font-medium">View →</span>
                                                                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === sub.id ? null : sub.id); }}
                                                                                    className="flex items-center justify-center w-6 h-6 rounded-lg hover:bg-[var(--border)] transition-colors text-[var(--muted)] hover:text-[var(--text)]"
                                                                                >
                                                                                    <MoreHorizontal size={14} />
                                                                                </button>
                                                                                {activeMenuId === sub.id && (
                                                                                    <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-[100] p-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2">
                                                                                        <button onClick={() => { setRenamingNode(sub); setNewName(sub.display_name); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--bg)] flex items-center gap-2">
                                                                                            <Edit2 size={14} className="text-[var(--muted)]" /> Rename
                                                                                        </button>
                                                                                        <button onClick={() => { setMovingNode(sub); setSelectedMoveCatId(sub.category_id || ''); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--bg)] flex items-center gap-2">
                                                                                            <FolderOpen size={14} className="text-[var(--muted)]" /> Move Category
                                                                                        </button>
                                                                                        <button onClick={() => { setMergingNode(sub); setSelectedMergeTargetId(''); setMergeSearch(''); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--bg)] flex items-center gap-2">
                                                                                            <GitMerge size={14} className="text-[var(--muted)]" /> Merge Into...
                                                                                        </button>
                                                                                        <div className="h-px bg-[var(--border)] my-1 w-[90%] mx-auto" />
                                                                                        <button onClick={() => handleUpdateNode(sub.id, { is_archived: true })} className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2">
                                                                                            <Archive size={14} /> Archive
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div
                                                            onDragOver={(e) => handleDragOver(e, 'other')}
                                                            onDragLeave={handleDragLeave}
                                                            onDrop={(e) => handleDrop(e, 'other', 'category')}
                                                            className={`h-4 w-full transition-colors ${dropTargetId === 'other' ? 'bg-[var(--accent)]/10 border-t border-[var(--accent)]' : ''}`}
                                                        />
                                                    </div>
                                                );
                                            })}
                                            {hierarchy.orphans.map(node => (
                                                <div
                                                    key={node.id}
                                                    onClick={(e) => toggleSelection([node.id], e)}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, node.id)}
                                                    onDragEnd={handleDragEnd}
                                                    onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, node.id); }}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={(e) => { e.stopPropagation(); handleDrop(e, node.id, 'concept'); }}
                                                    className={`flex items-center px-5 py-3 cursor-pointer hover:bg-[var(--accent)]/[0.03] transition-all group relative ${selectedNodeIds.has(node.id) ? 'bg-[var(--accent)]/[0.03]' : ''} ${draggedNodeId === node.id ? 'opacity-40' : ''} ${dropTargetId === node.id ? 'bg-[var(--accent)]/10 ring-2 ring-[var(--accent)] ring-inset z-10' : ''}`}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mr-3 cursor-pointer transition-colors ${selectedNodeIds.has(node.id) ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface)] group-hover:border-[var(--accent)]'}`} onClick={(e) => toggleSelection([node.id], e)}>
                                                        {selectedNodeIds.has(node.id) && <Check size={12} className="text-white" strokeWidth={3} />}
                                                    </div>
                                                    <MasteryDot state={node.current_mastery} size={10} className="mr-3" />
                                                    <span className="font-medium text-[15px] text-[var(--text)]">{node.display_name}</span>

                                                    <div className="ml-auto relative" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === node.id ? null : node.id); }}
                                                            className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[var(--bg)] border border-transparent hover:border-[var(--border)] transition-all text-[var(--muted)] hover:text-[var(--text)]"
                                                        >
                                                            <MoreHorizontal size={16} />
                                                        </button>
                                                        {activeMenuId === node.id && (
                                                            <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-[100] p-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2">
                                                                <button onClick={() => { setRenamingNode(node); setNewName(node.display_name); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--bg)] flex items-center gap-2">
                                                                    <Edit2 size={14} className="text-[var(--muted)]" /> Rename
                                                                </button>
                                                                <button onClick={() => { setMovingNode(node); setSelectedMoveCatId(node.category_id || ''); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--bg)] flex items-center gap-2">
                                                                    <FolderOpen size={14} className="text-[var(--muted)]" /> Move Category
                                                                </button>
                                                                <button onClick={() => { setMergingNode(node); setSelectedMergeTargetId(''); setMergeSearch(''); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] rounded-lg hover:bg-[var(--bg)] flex items-center gap-2">
                                                                    <GitMerge size={14} className="text-[var(--muted)]" /> Merge Into...
                                                                </button>
                                                                <div className="h-px bg-[var(--border)] my-1 w-[90%] mx-auto" />
                                                                <button onClick={() => handleUpdateNode(node.id, { is_archived: true })} className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2">
                                                                    <Archive size={14} /> Archive
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)] glass stagger-children">
                                {filteredNodes.map((node) => (
                                    <div
                                        key={node.id}
                                        onClick={(e) => toggleSelection([node.id], e)}
                                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-black/[0.02] transition-colors cursor-pointer group card-hover text-left"
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${selectedNodeIds.has(node.id) ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface)] group-hover:border-[var(--accent)]'}`} onClick={(e) => toggleSelection([node.id], e)}>
                                            {selectedNodeIds.has(node.id) && <Check size={12} className="text-white" strokeWidth={3} />}
                                        </div>
                                        <MasteryDot state={node.current_mastery} size={9} />
                                        <span className="flex-1 min-w-0">
                                            <span className="text-[15px] font-medium text-[var(--text)] truncate block">
                                                {node.display_name}
                                            </span>
                                            {node.is_sub_concept && <span className="text-[11px] text-[var(--muted)]">Sub-concept</span>}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {!loading && !hasAnyConcepts && (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <div className="w-20 h-20 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mb-6 glass">
                            <Brain size={32} className="text-[var(--accent)]" />
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--text)] mb-3">Your Vault is Empty</h2>
                        <p className="text-[var(--muted)] max-w-md mb-8">
                            This is where all your learned concepts live. Start a Learning Session or upload materials to extract and diagnose new concepts!
                        </p>
                        <Link
                            href="/"
                            className="h-11 px-6 rounded-xl bg-[var(--accent)] text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-[var(--accent)]/20"
                        >
                            <Zap size={18} />
                            Start Learning
                        </Link>
                    </div>
                )}
            </div>

            {/* Action Bar (slide up from bottom) */}
            <div
                className={`fixed bottom-0 left-0 right-0 md:left-64 bg-[var(--surface)] border-t border-[var(--border)] shadow-[var(--shadow-premium)] p-4 flex items-center justify-between transition-transform duration-300 z-50 glass sm:px-8
                ${selectedNodeIds.size > 0 ? 'translate-y-0' : 'translate-y-full'}`}
            >
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedNodeIds(new Set())}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    >
                        <X size={16} />
                    </button>
                    <div>
                        <span className="text-[15px] font-bold text-[var(--text)] block leading-none">{selectedNodeIds.size}</span>
                        <span className="text-[11px] text-[var(--muted)] font-medium uppercase tracking-wider block mt-0.5">Selected</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        onClick={() => handleBulkAction('delete')}
                        disabled={actionLoading}
                        className="h-10 px-3 sm:px-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] font-medium flex items-center justify-center gap-2 hover:border-[#C4541A] hover:text-[#C4541A] transition-colors shadow-sm text-sm disabled:opacity-50"
                    >
                        <Trash2 size={16} />
                        <span className="hidden sm:inline">Delete</span>
                    </button>
                    <button
                        onClick={() => handleBulkAction('archive')}
                        disabled={actionLoading}
                        className="h-10 px-3 sm:px-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] font-medium flex items-center justify-center gap-2 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors shadow-sm text-sm disabled:opacity-50"
                    >
                        <Archive size={16} />
                        <span className="hidden sm:inline">Archive</span>
                    </button>
                    <div className="w-px h-6 bg-[var(--border)] mx-1" />
                    <button
                        onClick={handleCreateStudySet}
                        disabled={actionLoading}
                        className="h-10 px-3 sm:px-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-medium flex items-center justify-center gap-2 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors shadow-sm text-sm border-dashed disabled:opacity-50"
                    >
                        <Plus size={16} className="text-[var(--accent)]" />
                        <span className="hidden sm:inline">Create Study Set</span>
                    </button>
                    <Link
                        href={`/vault/drill?nodes=${encodeURIComponent(selectedArray.join(','))}`}
                        onClick={(e) => {
                            if (selectedNodeIds.size > 8 && !window.confirm('You have selected a lot of concepts. Studying more than 8 concepts at once can overwhelm the AI and reduce focus. Continue anyway?')) {
                                e.preventDefault();
                            }
                        }}
                        className="h-10 px-4 sm:px-6 rounded-xl bg-[var(--accent)] text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-[var(--accent)]/20 text-sm ml-1"
                    >
                        <Brain size={16} />
                        Study Selected
                    </Link>
                </div>
            </div>

            {/* Rename Modal */}
            {
                renamingNode && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl w-full max-w-md p-6">
                            <h3 className="text-xl font-bold text-[var(--text)] mb-4">Rename Concept</h3>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)] mb-6"
                                placeholder="Concept Name"
                                autoFocus
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setRenamingNode(null)}
                                    className="px-4 py-2 rounded-lg font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleUpdateNode(renamingNode.id, { display_name: newName })}
                                    disabled={actionLoading || !newName.trim()}
                                    className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Move Modal */}
            {
                movingNode && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl w-full max-w-md p-6">
                            <h3 className="text-xl font-bold text-[var(--text)] mb-4">Move Concept</h3>
                            <p className="text-sm border border-[var(--border)] rounded-lg p-3 bg-[var(--bg)] text-[var(--muted)] mb-4">Moving <strong>{movingNode.display_name}</strong> to:</p>

                            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedMoveCatId(cat.id)}
                                        className={`w-full text-left px-4 py-3 rounded-xl border flex items-center gap-3 transition-colors ${selectedMoveCatId === cat.id
                                            ? 'border-[var(--accent)] bg-[var(--bg)]'
                                            : 'border-[var(--border)] hover:border-[var(--muted)] bg-[var(--surface)]'
                                            }`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${selectedMoveCatId === cat.id ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}>
                                            {selectedMoveCatId === cat.id && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                                        </div>
                                        <span className="font-medium text-[var(--text)]">{cat.name}</span>
                                    </button>
                                ))}
                                <button
                                    onClick={() => setSelectedMoveCatId('')}
                                    className={`w-full text-left px-4 py-3 rounded-xl border flex items-center gap-3 transition-colors ${selectedMoveCatId === ''
                                        ? 'border-[var(--accent)] bg-[var(--bg)]'
                                        : 'border-[var(--border)] hover:border-[var(--muted)] bg-[var(--surface)]'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${selectedMoveCatId === '' ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}>
                                        {selectedMoveCatId === '' && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                                    </div>
                                    <span className="font-medium text-[var(--text)]">Uncategorized (No Category)</span>
                                </button>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setMovingNode(null)}
                                    className="px-4 py-2 rounded-lg font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleUpdateNode(movingNode.id, { category_id: selectedMoveCatId || null })}
                                    disabled={actionLoading || movingNode.category_id === (selectedMoveCatId || null)}
                                    className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    Move
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Merge Modal */}
            {
                mergingNode && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl w-full max-w-md p-6">
                            <h3 className="text-xl font-bold text-[var(--text)] mb-4">Merge Concept</h3>
                            <p className="text-sm border border-[var(--border)] rounded-lg p-3 bg-[var(--bg)] text-[var(--muted)] mb-4">
                                Merging <strong>{mergingNode.display_name}</strong> into another concept. The other concept will absorb this one&apos;s history. This concept will be archived.
                            </p>

                            <div className="mb-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search target concept..."
                                        value={mergeSearch}
                                        onChange={(e) => setMergeSearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)] transition-colors text-[var(--text)]"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="space-y-1 mb-6 max-h-48 overflow-y-auto">
                                {nodes
                                    .filter(n => n.id !== mergingNode.id && n.display_name.toLowerCase().includes(mergeSearch.toLowerCase()))
                                    .slice(0, 20)
                                    .map((targetNode) => (
                                        <button
                                            key={targetNode.id}
                                            onClick={() => setSelectedMergeTargetId(targetNode.id)}
                                            className={`w-full text-left px-3 py-2 rounded-xl border flex flex-col gap-1 transition-colors ${selectedMergeTargetId === targetNode.id
                                                ? 'border-[var(--accent)] bg-[var(--bg)]'
                                                : 'border-transparent hover:bg-[var(--bg)] bg-transparent'
                                                }`}
                                        >
                                            <span className="font-medium text-[var(--text)] text-sm line-clamp-1">{targetNode.display_name}</span>
                                        </button>
                                    ))}
                                {nodes.filter(n => n.id !== mergingNode.id && n.display_name.toLowerCase().includes(mergeSearch.toLowerCase())).length === 0 && (
                                    <div className="text-center py-4 text-[var(--muted)] text-sm">No matching concepts found.</div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setMergingNode(null)}
                                    className="px-4 py-2 rounded-lg font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleMergeNodes(mergingNode.id, selectedMergeTargetId)}
                                    disabled={actionLoading || !selectedMergeTargetId}
                                    className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                                >
                                    <GitMerge size={16} /> Merge
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Add Concept Modal */}
            {
                isAddingConcept && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl w-full max-w-md p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-[var(--text)]">Add New Concept</h3>
                                <button onClick={() => setIsAddingConcept(false)} className="text-[var(--muted)] hover:text-[var(--text)] p-1">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5 ml-1">Concept Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Backpropagation, French Revolution"
                                        value={newConceptForm.displayName}
                                        onChange={(e) => setNewConceptForm(prev => ({ ...prev, displayName: e.target.value }))}
                                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5 ml-1">Definition (Optional)</label>
                                    <textarea
                                        placeholder="Brief explanation of the concept..."
                                        value={newConceptForm.definition}
                                        onChange={(e) => setNewConceptForm(prev => ({ ...prev, definition: e.target.value }))}
                                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors min-h-[100px] resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5 ml-1">Category</label>
                                        <select
                                            value={newConceptForm.categoryId}
                                            onChange={(e) => setNewConceptForm(prev => ({ ...prev, categoryId: e.target.value }))}
                                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] appearance-none cursor-pointer"
                                        >
                                            <option value="">No Category</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5 ml-1">Parent Concept</label>
                                        <select
                                            value={newConceptForm.parentId}
                                            onChange={(e) => setNewConceptForm(prev => ({ ...prev, parentId: e.target.value }))}
                                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] appearance-none cursor-pointer"
                                        >
                                            <option value="">No Parent (General)</option>
                                            {nodes.filter(n => !n.is_sub_concept && !n.is_archived).map(n => (
                                                <option key={n.id} value={n.id}>{n.display_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
                                    <input
                                        type="checkbox"
                                        id="isSub"
                                        checked={newConceptForm.isSub}
                                        onChange={(e) => setNewConceptForm(prev => ({ ...prev, isSub: e.target.checked }))}
                                        className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] bg-transparent cursor-pointer"
                                    />
                                    <label htmlFor="isSub" className="text-sm font-medium text-[var(--text)] cursor-pointer select-none">
                                        Mark as Sub-concept
                                    </label>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={() => setIsAddingConcept(false)}
                                    className="flex-1 py-3 rounded-xl font-bold text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--text)] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddConcept}
                                    disabled={actionLoading || !newConceptForm.displayName.trim()}
                                    className="flex-1 py-3 rounded-xl bg-[var(--accent)] text-white font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-md shadow-[var(--accent)]/20"
                                >
                                    {actionLoading ? 'Adding...' : 'Add Concept'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Overlay for backdrop - simple global loading state if needed */}
            {
                actionLoading && (
                    <div className="fixed inset-0 bg-black/5 z-[1000] cursor-wait" />
                )
            }

            {/* Undo Toast */}
            {
                showUndoToast && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[2000] animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-[var(--surface)] text-[var(--text)] px-5 py-3 rounded-2xl shadow-2xl border border-[var(--accent)]/20 flex items-center gap-4 min-w-[320px] glass-premium">
                            <div className="flex-1">
                                <p className="text-sm font-semibold tracking-tight">Concept reorganized</p>
                            </div>
                            <button
                                onClick={handleUndoMove}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-md shadow-[var(--accent)]/20"
                            >
                                <RotateCcw size={12} strokeWidth={3} /> Undo
                            </button>
                            <button
                                onClick={() => setShowUndoToast(false)}
                                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                )
            }
        </DashboardLayout >
    );
}

