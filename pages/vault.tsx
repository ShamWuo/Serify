import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SEO from '@/components/Layout/SEO';
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
    Box,
    AlertCircle,
} from 'lucide-react';

import { KnowledgeNode, VaultCategory, StudySet, MasteryState } from '@/types/serify';

const MASTERY_CONFIG: Record<MasteryState, { label: string; color: string; bg: string; dot: string; weight: number; glow?: string; border?: string }> = {
    mastered: { label: 'Mastered', color: 'text-[#1A4A38]', bg: 'bg-[#1A4A38]/10', dot: 'bg-[#1A4A38]', weight: 4 },
    solid: { label: 'Solid', color: 'text-[#1B4332]', bg: 'bg-[#1B4332]/10', dot: 'bg-[#1B4332]', weight: 3 }, 
    developing: { label: 'Developing', color: 'text-[#0E4F64]', bg: 'bg-[#0E4F64]/10', dot: 'bg-[#0E4F64]', weight: 2 }, 
    shaky: { label: 'Shaky', color: 'text-[#856404]', bg: 'bg-[#FFF3CD]', dot: 'bg-[#856404]', weight: 1, glow: 'shadow-[0_0_15px_-3px_rgba(255,243,205,0.4)]', border: 'border-yellow-400/50' }, 
    revisit: { label: 'Action Required', color: 'text-[#721C24]', bg: 'bg-[#F8D7DA]', dot: 'bg-[#721C24]', weight: 0, glow: 'shadow-[0_0_20px_-5px_rgba(248,215,218,0.5)]', border: 'border-red-400/60' } 
};

const MASTERY_DESCRIPTIONS: Record<MasteryState, string> = {
    mastered: 'Concept deeply understood and correctly applied in multiple contexts.',
    solid: 'High accuracy, low friction recall.',
    developing: 'Basic understanding, needs reinforcement.',
    shaky: 'Misconceptions detected or failed recall.',
    revisit: 'Not seen for a while, retention at risk.'
};

const DEFAULT_MASTERY = { label: 'Not Studied', color: 'text-[var(--muted)]', bg: 'bg-[var(--border)]', dot: 'bg-[var(--border)]', weight: -1 };

type Tab = 'all' | 'needs_work' | 'solid';
type SortOption = 'last_seen' | 'alpha' | 'mastery';

function MasteryDot({ state, size = 10, className = '' }: { state: MasteryState | string | null; size?: number, className?: string }) {
    const cfg = state ? (MASTERY_CONFIG[state as MasteryState] || MASTERY_CONFIG['developing']) : DEFAULT_MASTERY;
    return (
        <span
            className={`inline-block rounded-full shrink-0 ${cfg.dot} ${className}`}
            style={{ width: size, height: size }}
        />
    );
}

function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
    return (
        <div className="group relative flex items-center">
            {children}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[var(--text)] text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-white/10 z-[200]">
                {content}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[var(--text)]" />
            </div>
        </div>
    );
}

export default function VaultPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
    const [categories, setCategories] = useState<VaultCategory[]>([]);
    const [studySets, setStudySets] = useState<StudySet[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    
    const [tab, setTab] = useState<Tab>('all');
    const [sort, setSort] = useState<SortOption>('last_seen');
    const [selectedMasteries, setSelectedMasteries] = useState<MasteryState[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [hierarchyMode, setHierarchyMode] = useState<'hierarchical' | 'flat'>('hierarchical');
    const [showOnlyShaky, setShowOnlyShaky] = useState(false);

    
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

    
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
                const normalized = (d.nodes || []).map((n: KnowledgeNode) => ({
                    ...n,
                    display_name: n.display_name || n.canonical_name || 'Unnamed Concept'
                }));
                setNodes(normalized);
                setCategories(d.categories || []);
                setStudySets(d.studySets || []);

                
                if (d.categories) {
                    const collapsed = new Set<string>();
                    d.categories.forEach((c: any) => {
                        if (c.is_collapsed) collapsed.add(c.id);
                    });
                    setCollapsedCategories(collapsed);
                }
            } else {
                console.error('[vault] API error:', res.status, await res.text());
            }
        } catch (e) {
            console.error('[vault] Error fetching data:', e);
        } finally {
            setLoading(false);
        }
    }, [tab, sort]);

    
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
        
        if (draggedNodeRef.current === targetId) return;
        setDropTargetId(targetId);
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragLeave = (e: React.DragEvent) => {
        
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDropTargetId(null);
        }
    };

    const handleDrop = async (e: React.DragEvent, targetId: string, targetType: 'category' | 'concept') => {
        e.preventDefault();
        setDropTargetId(null);
        const sourceId = draggedNodeRef.current || draggedNodeId || e.dataTransfer.getData('text/plain');

        
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
                
                setNodes(prev => prev.map(n => n.id === sourceId ? { ...n, ...prevUpdates } : n));
                const err = await res.json();
                console.error('[vault] Update failed:', err.error);
            }
        } catch (e) {
            setNodes(prev => prev.map(n => n.id === sourceId ? { ...n, ...prevUpdates } : n));
            console.error('[vault] Drop error:', e);
        }
        
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

    const handleBulkAction = async (type: 'delete' | 'archive') => {
        if (!selectedNodeIds.size) return;
        const confirmMsg = type === 'delete' 
            ? `Are you sure you want to permanently delete ${selectedNodeIds.size} concepts?` 
            : `Archive ${selectedNodeIds.size} concepts?`;
        
        if (!window.confirm(confirmMsg)) return;

        setActionLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/vault/bulk-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ concept_ids: Array.from(selectedNodeIds), action: type })
            });

            if (res.ok) {
                setSelectedNodeIds(new Set());
                await fetchVaultData();
            } else {
                const err = await res.json();
                alert(err.error || `Failed to ${type} concepts`);
            }
        } catch (e) {
            console.error(e);
            alert(`Failed to ${type} concepts`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateStudySet = async () => {
        if (!selectedNodeIds.size) return;
        const name = window.prompt("Enter a name for this study set:");
        if (!name) return;

        setActionLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/vault/study-sets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ name, concept_ids: Array.from(selectedNodeIds) })
            });

            if (res.ok) {
                setSelectedNodeIds(new Set());
                await fetchVaultData();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create study set');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to create study set');
        } finally {
            setActionLoading(false);
        }
    };

    
    useEffect(() => {
        const handleClick = () => setActiveMenuId(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    useEffect(() => {
        if (user) fetchVaultData();
    }, [fetchVaultData, user]);

    
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

    
    const filteredNodes = useMemo(() => {
        let result = nodes;

        
        if (selectedMasteries.length > 0) {
            result = result.filter(n => selectedMasteries.includes(n.current_mastery));
        }
        if (selectedSources.length > 0) {
            result = result.filter(n => {
                const sources = n.mastery_history?.map(h => h.sourceType) || [];
                return selectedSources.some(s => sources.includes(s as any));
            });
        }
        if (showOnlyShaky) {
            result = result.filter(n => n.current_mastery === 'shaky' || n.current_mastery === 'revisit');
        }

        
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
    }, [nodes, categories, search, selectedMasteries, selectedSources, showOnlyShaky]);

    
    const vaultStats = useMemo(() => {
        const total = nodes.length;
        const needsAttention = nodes.filter(
            (n) => n.current_mastery === 'shaky' || n.current_mastery === 'revisit'
        ).length;
        const strong = nodes.filter(
            (n) => n.current_mastery === 'mastered' || n.current_mastery === 'solid'
        ).length;
        const developing = nodes.filter(n => n.current_mastery === 'developing').length;
        const shaky = nodes.filter(n => n.current_mastery === 'shaky').length;
        const revisit = nodes.filter(n => n.current_mastery === 'revisit').length;

        return { total, needsAttention, strong, developing, shaky, revisit };
    }, [nodes]);

    const hierarchy = useMemo(() => {
        const processedIds = new Set<string>();
        const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

        
        const nodesByParent = new Map<string, KnowledgeNode[]>();
        filteredNodes.forEach(n => {
            if (n.parent_concept_id && filteredNodeIds.has(n.parent_concept_id)) {
                if (!nodesByParent.has(n.parent_concept_id)) nodesByParent.set(n.parent_concept_id, []);
                nodesByParent.get(n.parent_concept_id)!.push(n);
            }
        });

        
        const getDescendants = (parentId: string): KnowledgeNode[] => {
            const direct = nodesByParent.get(parentId) || [];
            let all: KnowledgeNode[] = [...direct];
            direct.forEach(d => {
                all = [...all, ...getDescendants(d.id)];
            });
            return all;
        };

        const createGroup = (p: KnowledgeNode) => {
            const subs = getDescendants(p.id);
            const allNodes = [p, ...subs];
            allNodes.forEach(n => processedIds.add(n.id));

            const allMasteries = allNodes.map(n => (n.current_mastery || 'developing') as MasteryState);
            let aggregateMastery: MasteryState = 'solid';
            if (allMasteries.includes('revisit')) aggregateMastery = 'revisit';
            else if (allMasteries.includes('shaky')) aggregateMastery = 'shaky';
            else if (allMasteries.some(m => !m || m === 'developing')) aggregateMastery = 'developing';

            return {
                parent: p,
                subs,
                aggregateMastery,
                needsWork: allMasteries.filter(m => m === 'shaky' || m === 'revisit').length,
                allMasteries
            };
        };

        
        const grouped: any[] = [];
        categories.sort((a, b) => a.display_order - b.display_order).forEach(cat => {
            const inCat = filteredNodes.filter(n => n.category_id === cat.id);
            
            const roots = inCat.filter(n => !n.parent_concept_id || !filteredNodeIds.has(n.parent_concept_id));

            const parentGroups = roots.map(createGroup);

            
            const stragglers = inCat.filter(n => !processedIds.has(n.id));
            stragglers.forEach(s => parentGroups.push(createGroup(s)));

            if (parentGroups.length > 0) {
                const allNodesInCat = nodes.filter(n => n.category_id === cat.id);
                const stats = {
                    solid: allNodesInCat.filter(n => n.current_mastery === 'solid').length,
                    developing: allNodesInCat.filter(n => n.current_mastery === 'developing').length,
                    shaky: allNodesInCat.filter(n => n.current_mastery === 'shaky').length,
                    revisit: allNodesInCat.filter(n => n.current_mastery === 'revisit').length,
                    not_studied: allNodesInCat.filter(n => !n.current_mastery).length
                };
                grouped.push({
                    category: cat,
                    parentGroups,
                    totalNodes: allNodesInCat.length,
                    stats,
                    progress: allNodesInCat.length > 0 ? (stats.solid / allNodesInCat.length) * 100 : 0
                });
            }
        });

        
        const uncategorizedRoots = filteredNodes.filter(n =>
            !processedIds.has(n.id) &&
            !n.category_id &&
            (!n.parent_concept_id || !filteredNodeIds.has(n.parent_concept_id))
        );
        const uncategorizedGroups = uncategorizedRoots.map(createGroup);

        
        const subjectGroupsMap: Record<string, typeof uncategorizedGroups> = {};
        const realUncategorized: typeof uncategorizedGroups = [];

        uncategorizedGroups.forEach(group => {
            const match = group.parent.display_name.match(/^([^:]+):/);
            if (match && match[1]) {
                const subject = match[1].trim();
                if (!subjectGroupsMap[subject]) subjectGroupsMap[subject] = [];
                subjectGroupsMap[subject].push(group);
            } else {
                realUncategorized.push(group);
            }
        });

        
        const orphans = filteredNodes.filter(n => !processedIds.has(n.id));

        return {
            grouped,
            subjectGroups: Object.entries(subjectGroupsMap).map(([name, items]) => ({
                name,
                items,
                totalNodes: items.reduce((acc, i) => acc + 1 + i.subs.length, 0)
            })),
            uncategorizedGroups: realUncategorized,
            orphans
        };
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

    const [selectedNodeForDetail, setSelectedNodeForDetail] = useState<KnowledgeNode | null>(null);

    const toggleParent = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setCollapsedParents(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const collapseAll = () => {
        const catIds = categories.map(c => c.id);
        const parentIds = nodes.filter(n => !n.is_sub_concept).map(n => n.id);
        setCollapsedCategories(new Set(catIds));
        setCollapsedParents(new Set(parentIds));
    };

    const expandAll = () => {
        setCollapsedCategories(new Set());
        setCollapsedParents(new Set());
    };

    const renderParentNode = ({ parent, subs, needsWork, allMasteries, aggregateMastery }: { parent: KnowledgeNode; subs: KnowledgeNode[]; needsWork: number; allMasteries: MasteryState[]; aggregateMastery: MasteryState }) => {
        const pCollapsed = search ? false : collapsedParents.has(parent.id);
        const mConfig = MASTERY_CONFIG[aggregateMastery] || DEFAULT_MASTERY;
        const isNeedsWork = aggregateMastery === 'shaky' || aggregateMastery === 'revisit';
        
        // Clean display name by removing category prefix if it exists
        let displayName = parent.display_name;
        const currentCategory = categories.find(c => c.id === parent.category_id);
        if (currentCategory && displayName.toLowerCase().startsWith(currentCategory.name.toLowerCase())) {
            displayName = displayName.substring(currentCategory.name.length).replace(/^[:\s-]+/, '');
        }

        return (
            <div 
                key={parent.id} 
                className={`group paper-card overflow-hidden h-fit transition-all duration-300 border-2 ${isNeedsWork ? `${mConfig.glow} ${mConfig.border} ring-1 ring-inset ${mConfig.border}/30` : 'border-[var(--border)]'}`}
            >
                {isNeedsWork && <div className="absolute inset-0 hatch-bg opacity-[0.05] pointer-events-none" />}
                
                <div
                    onClick={(e) => {
                        const isAction = (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.checkbox-area');
                        if (isAction) return;
                        setSelectedNodeForDetail(parent);
                    }}
                    className={`relative flex flex-col p-4 sm:p-5 transition-all cursor-pointer ${selectedNodeIds.has(parent.id) ? 'bg-[var(--accent)]/[0.04]' : 'hover:bg-[var(--bg)]/50'} ${draggedNodeId === parent.id ? 'opacity-40' : ''} ${dropTargetId === parent.id ? 'bg-[var(--accent)]/10 ring-2 ring-[var(--accent)] ring-inset' : ''}`}
                >
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const allIds = [parent.id, ...subs.map((s) => s.id)];
                                    toggleSelection(allIds, e);
                                }}
                                className="checkbox-area mt-0.5 w-4.5 h-4.5 rounded-[2px] border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all border-[var(--border-soft)] bg-[var(--surface-raised)] group-hover:border-[var(--accent)]"
                            >
                                {[parent.id, ...subs.map((s) => s.id)].every(id => selectedNodeIds.has(id)) ? (
                                    <div className="w-full h-full bg-[var(--accent)] flex items-center justify-center">
                                        <Check size={12} className="text-white" strokeWidth={4} />
                                    </div>
                                ) : [parent.id, ...subs.map((s) => s.id)].some(id => selectedNodeIds.has(id)) ? (
                                    <div className="w-2.5 h-2.5 bg-[var(--accent)] rounded-[1px]" />
                                ) : null}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 border ${mConfig.bg} ${mConfig.color} border-current`}>
                                        {mConfig.label}
                                    </span>
                                    {isNeedsWork && <AlertCircle size={12} className={`${mConfig.color} animate-pulse`} />}
                                </div>
                                <h3 className="font-display font-black text-base text-[var(--text)] leading-tight tracking-tight group-hover:text-[var(--accent)] transition-colors">
                                    {displayName}
                                </h3>
                            </div>
                        </div>
                        <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === parent.id ? null : parent.id); }}
                                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--bg)] border border-[var(--border)] shadow-[2px_2px_0px_var(--border)] active:translate-y-[1px] active:shadow-none transition-all text-[var(--muted)] hover:text-[var(--text)]"
                            >
                                <MoreHorizontal size={16} />
                            </button>
                            {activeMenuId === parent.id && (
                                <div className="absolute right-0 top-full mt-2 w-52 bg-[var(--surface)] border-2 border-[var(--border)] shadow-[var(--shadow-hard)] z-[100] p-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2">
                                    <button onClick={() => { setRenamingNode(parent); setNewName(parent.display_name); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--text)] hover:bg-[var(--bg)] flex items-center gap-2">
                                        <Edit2 size={14} className="text-[var(--muted)]" /> Rename
                                    </button>
                                    <button onClick={() => { setMovingNode(parent); setSelectedMoveCatId(parent.category_id || ''); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--text)] hover:bg-[var(--bg)] flex items-center gap-2">
                                        <FolderOpen size={14} className="text-[var(--muted)]" /> Move Category
                                    </button>
                                    <div className="h-px bg-[var(--border)] my-1 w-[90%] mx-auto" />
                                    <button onClick={() => { setActiveMenuId(null); router.push(`/vault/${parent.id}`); }} className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--accent)] hover:bg-[var(--accent)]/[0.05] flex items-center gap-2">
                                        <BookOpen size={14} /> Full Record
                                    </button>
                                    <div className="h-px bg-[var(--border)] my-1 w-[90%] mx-auto" />
                                    <button onClick={() => { setActiveMenuId(null); router.push(`/practice/exam?concepts=${parent.id}`) }} className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--text)] hover:bg-[var(--bg)] flex items-center gap-2">
                                        <Brain size={14} className="text-[var(--accent)]" /> Exam Mode
                                    </button>
                                    <button onClick={() => { setActiveMenuId(null); router.push(`/practice/scenario?concepts=${parent.id}`) }} className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--text)] hover:bg-[var(--bg)] flex items-center gap-2">
                                        <Zap size={14} className="text-amber-500 fill-amber-500" /> Application
                                    </button>
                                    <div className="h-px bg-[var(--border)] my-1 w-[90%] mx-auto" />
                                    <button onClick={() => handleUpdateNode(parent.id, { is_archived: true })} className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wide text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2">
                                        <Archive size={14} /> Archive
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {parent.definition && (
                        <p className="text-[11px] text-[var(--muted)] line-clamp-2 mb-4 font-mono leading-relaxed">
                            {parent.definition}
                        </p>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border)]/10">
                        <div className="flex items-center gap-3">
                            {subs.length > 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleParent(parent.id, e); }}
                                    className="flex items-center gap-1.5 py-1 px-2 border border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--text)] text-[10px] font-bold uppercase tracking-wider transition-all"
                                >
                                    {subs.length} Components
                                    {pCollapsed ? <ChevronRight size={12} strokeWidth={3}/> : <ChevronDown size={12} strokeWidth={3}/>}
                                </button>
                            )}
                        </div>
                        <div className="flex gap-1.5 flex-wrap justify-end">
                             <div className="flex h-1.5 w-16 bg-[var(--bg)] border border-[var(--border)]/20 rounded-full overflow-hidden">
                                {allMasteries.map((m, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`h-full ${MASTERY_CONFIG[m]?.dot || 'bg-[var(--border-soft)]'}`} 
                                        style={{ width: `${100 / allMasteries.length}%` }} 
                                    />
                                ))}
                             </div>
                        </div>
                    </div>
                </div>

                {!pCollapsed && subs.length > 0 && (
                    <div className="border-t border-[var(--border)] bg-[var(--bg)]/40 dot-grid-bg">
                        {subs.map((sub: KnowledgeNode) => (
                            <div
                                key={sub.id}
                                onClick={(e) => {
                                    const isAction = (e.target as HTMLElement).closest('.checkbox-area') || (e.target as HTMLElement).closest('button');
                                    if (isAction) return;
                                    setSelectedNodeForDetail(sub);
                                }}
                                className={`flex items-center pl-12 pr-4 py-2 hover:bg-[var(--accent)]/[0.04] border-b border-[var(--border)]/5 last:border-0 transition-all cursor-pointer group/sub relative ${selectedNodeIds.has(sub.id) ? 'bg-[var(--accent)]/[0.04]' : ''}`}
                            >
                                <div
                                    onClick={(e) => { e.stopPropagation(); toggleSelection([sub.id], e); }}
                                    className="checkbox-area w-3.5 h-3.5 rounded-[1px] border flex items-center justify-center shrink-0 mr-3 cursor-pointer transition-colors border-[var(--border-soft)] bg-[var(--surface)] group-hover/sub:border-[var(--accent)]"
                                >
                                    {selectedNodeIds.has(sub.id) && <Check size={10} className="text-white" strokeWidth={4} />}
                                </div>
                                <Tooltip content={MASTERY_DESCRIPTIONS[sub.current_mastery as MasteryState] || 'Not studied yet'}>
                                    <MasteryDot state={sub.current_mastery} size={7} className="mr-2.5 cursor-help" />
                                </Tooltip>
                                <span className="text-xs font-mono text-[var(--muted)] group-hover/sub:text-[var(--text)] truncate flex-1 tracking-tight">
                                    {sub.display_name.split(':').pop()?.trim()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const hasAnyConcepts = nodes.length > 0;
    const selectedArray = Array.from(selectedNodeIds);

    if (!user && !loading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6 relative overflow-hidden font-mono transition-colors duration-500">
                <div className="absolute inset-0 hatch-bg opacity-[0.03] pointer-events-none" />
                
                <div className="max-w-md w-full paper-card p-10 md:p-14 text-center space-y-10 animate-fade-in relative z-10">
                    <div className="mx-auto w-20 h-20 border-2 border-[var(--ink)] bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center -rotate-[5deg] shadow-[var(--shadow-hard-sm)]">
                        <FolderTree size={44} />
                    </div>
                    
                    <div className="space-y-4">
                        <h1 className="text-4xl font-display font-black text-[var(--text)] leading-tight tracking-tight">
                            Explore Your <br/>
                            <span className="text-[var(--accent)] italic">Concept Vault</span>
                        </h1>
                        <p className="text-[13px] text-[var(--muted)] leading-relaxed italic">
                            &quot;The Vault catalogs every concept you&apos;ve analyzed, tracking your mastery path across all subjects.&quot;
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 py-4 text-left border-y-2 border-[var(--border-soft)] border-dashed">
                        {[
                            { icon: Layers, text: 'Hierarchical Knowledge Mapping' },
                            { icon: GitMerge, text: 'Automated Concept Merging' },
                            { icon: Archive, text: 'Deep Mastery Analytics' }
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <item.icon size={16} className="text-[var(--accent)]" />
                                <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-wider">{item.text}</span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-6">
                        <Link 
                            href="/login" 
                            className="btn-primary w-full py-5 text-xl"
                        >
                            Log In to Enter
                        </Link>
                        
                        <Link 
                            href="/" 
                            className="block text-[11px] font-black text-[var(--muted)] uppercase tracking-[0.2em] hover:text-[var(--accent)] transition-all"
                        >
                            &larr; Back to Base
                        </Link>
                    </div>
                </div>
                
                <div className="mt-12 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.5em] opacity-30">
                    Serify Vault Engine // Ver 2.5
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout>
            <SEO title="Vault" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-32">
                {/* Header & Stats Section */}
                <section className="relative mb-8 overflow-hidden border-2 border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-hard)] md:p-10">
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] rotate-12 pointer-events-none">
                        <Box size={128} />
                    </div>
                    
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[var(--accent)]">
                                <span className="w-8 h-px bg-[var(--accent)]" />
                                Knowledge Catalog
                            </div>
                            <h1 className="text-4xl md:text-5xl font-display font-black text-[var(--text)] tracking-tight">
                                Concept <span className="text-[var(--accent)]">Vault</span>
                            </h1>
                            <p className="max-w-xl text-[13px] text-[var(--muted)] font-medium leading-relaxed italic">
                                &quot;A living repository of your mastered concepts, structural pillars, and unexplored territories.&quot;
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch gap-3">
                            <div className="relative min-w-[280px]">
                                <Search
                                    size={16}
                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                                    strokeWidth={3}
                                />
                                <input
                                    type="search"
                                    placeholder="Search architecture..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-12 w-full border-2 border-[var(--border)] bg-[var(--surface-raised)] pl-12 pr-4 font-mono text-sm text-[var(--text)] outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:bg-[var(--surface)] shadow-inner"
                                    autoComplete="off"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddingConcept(true)}
                                className="btn-primary h-12 px-6 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-sm shadow-[var(--shadow-hard-sm)] hover:shadow-[var(--shadow-hard)] hover:-translate-y-0.5 active:translate-y-0 transition-all"
                            >
                                <Plus size={18} strokeWidth={3} />
                                New Concept
                            </button>
                        </div>
                    </div>

                    {hasAnyConcepts && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Total Nodes', value: vaultStats.total, icon: Layers, color: 'text-[var(--text)]' },
                                { label: 'Stronghold', value: vaultStats.strong, icon: Check, color: 'text-emerald-600' },
                                { label: 'Needs Revisit', value: vaultStats.needsAttention, icon: AlertCircle, color: 'text-rose-600' },
                                { label: 'Pillars', value: categories.length, icon: FolderTree, color: 'text-[var(--accent)]' },
                            ].map((s) => (
                                <div
                                    key={s.label}
                                    className="group flex flex-col p-4 border-2 border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--surface-raised)] transition-colors shadow-[4px_4px_0px_var(--border)]"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className={`p-2 border border-[var(--border)] bg-[var(--surface)] ${s.color} shadow-[2px_2px_0] group-hover:rotate-3 transition-transform`}>
                                            <s.icon size={18} strokeWidth={2.5} />
                                        </div>
                                        <div className="font-display text-2xl font-black tabular-nums">{s.value}</div>
                                    </div>
                                    <div className="font-mono text-[9px] font-black uppercase tracking-widest text-[var(--muted)] mt-auto">
                                        {s.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Controls & Filters Area */}
                <div className="sticky top-0 z-[60] py-4 bg-[var(--bg)]/80 backdrop-blur-md mb-8 border-b-2 border-dashed border-[var(--border)]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center p-1 border-2 border-[var(--border)] bg-[var(--surface-raised)] shadow-[2px_2px_0px_var(--border)]">
                            {['all', 'needs_work', 'solid'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t as Tab)}
                                    className={`px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${tab === t ? 'bg-[var(--accent)] text-white shadow-inner' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]'}`}
                                >
                                    {t.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                             <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`flex items-center gap-2 px-4 h-10 border-2 font-mono text-[10px] font-black uppercase tracking-widest transition-all ${hasActiveFilters || isFilterOpen ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--bg)]'}`}
                            >
                                <Filter size={14} />
                                Filters {hasActiveFilters && <span className="ml-1 bg-white text-[var(--accent)] px-1">{selectedMasteries.length + selectedSources.length}</span>}
                            </button>

                            <div className="flex border-2 border-[var(--border)] bg-[var(--surface-raised)] p-0.5">
                                <button
                                    onClick={() => setHierarchyMode('hierarchical')}
                                    className={`p-1.5 ${hierarchyMode === 'hierarchical' ? 'bg-[var(--accent)] text-white shadow-inner' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                                >
                                    <FolderTree size={16} />
                                </button>
                                <button
                                    onClick={() => setHierarchyMode('flat')}
                                    className={`p-1.5 ${hierarchyMode === 'flat' ? 'bg-[var(--accent)] text-white shadow-inner' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                                >
                                    <LayoutList size={16} />
                                </button>
                            </div>

                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value as SortOption)}
                                className="h-10 border-2 border-[var(--border)] bg-[var(--surface)] px-4 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text)] outline-none focus:border-[var(--accent)]"
                            >
                                <option value="last_seen">Chronology</option>
                                <option value="alpha">Lexical</option>
                                <option value="mastery">Authority</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Active Filters Bar */}
                    {hasActiveFilters && (
                        <div className="mt-4 flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-2">
                             <span className="font-mono text-[9px] font-black uppercase tracking-widest text-[var(--muted)] mr-2">Active Spec:</span>
                             {selectedMasteries.map(m => (
                                <button key={m} onClick={() => toggleMasteryFilter(m)} className="flex items-center gap-2 px-3 py-1 bg-[var(--accent)]/[0.08] border border-[var(--accent)]/30 text-[var(--accent)] text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-[var(--accent)]/20">
                                    {m} <X size={10} />
                                </button>
                             ))}
                             {selectedSources.map(s => (
                                <button key={s} onClick={() => toggleSourceFilter(s)} className="flex items-center gap-2 px-3 py-1 bg-[var(--accent)]/[0.08] border border-[var(--accent)]/30 text-[var(--accent)] text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-[var(--accent)]/20">
                                    Source: {s} <X size={10} />
                                </button>
                             ))}
                             <button onClick={clearFilters} className="text-[9px] font-black text-[var(--muted)] uppercase hover:text-red-600 transition-colors ml-2">Clear Selection</button>
                        </div>
                    )}
                </div>

                {}
                {studySets.length > 0 && !search && tab === 'all' && hierarchyMode === 'hierarchical' && (
                    <div className="mb-8">

                        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 pt-1 hide-scrollbar sm:mx-0 sm:px-0">
                            {studySets.map((set) => (
                                <Link
                                    key={set.id}
                                    href={`/vault/drill?set=${set.id}`}
                                    className="paper-card-sm group block w-64 shrink-0 snap-start p-5 transition-transform hover:-translate-y-0.5"
                                >
                                    <div className="mb-4 flex items-start justify-between gap-2">
                                        <div className="flex h-11 w-11 items-center justify-center border-2 border-[var(--border)] bg-[var(--bg)] text-[var(--accent)] transition-colors group-hover:bg-[var(--accent)] group-hover:text-[var(--surface)]">
                                            <Layers size={20} strokeWidth={2} />
                                        </div>
                                        <span className="border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 font-mono text-[10px] font-bold tabular-nums text-[var(--muted)]">
                                            {set.concept_ids.length} concepts
                                        </span>
                                    </div>
                                    <h3 className="font-display text-lg font-bold leading-tight text-[var(--text)] transition-colors group-hover:text-[var(--accent)] line-clamp-2">
                                        {set.name}
                                    </h3>
                                    <p className="mt-3 font-mono text-[10px] text-[var(--muted)]">
                                        Last studied{' '}
                                        {set.last_studied_at ? new Date(set.last_studied_at).toLocaleDateString() : 'never'}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- Results Section --- */}
                {!loading && hasAnyConcepts && (
                    <div className="space-y-12 min-h-[400px]">
                        {filteredNodes.length === 0 ? (
                            <div className="border-4 border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-24 text-center shadow-[var(--shadow-hard-sm)]">
                                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center border-4 border-[var(--border)] bg-[var(--bg)] text-[var(--accent)] shadow-[var(--shadow-hard)] hover:rotate-6 transition-transform">
                                    <Search size={40} strokeWidth={3} />
                                </div>
                                <h3 className="font-display text-2xl font-black text-[var(--text)] mb-3">No matching specs found</h3>
                                <p className="mx-auto max-w-sm font-mono text-xs leading-relaxed text-[var(--muted)] uppercase tracking-widest font-black">
                                    Try adjusting your architectural filters or search query to find specific nodes in your catalog.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => { setTab('all'); setSearch(''); clearFilters(); }}
                                    className="mt-10 px-8 py-3 bg-[var(--border)] text-[var(--bg)] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[var(--accent)] hover:text-white transition-all shadow-[var(--shadow-hard-sm)]"
                                >
                                    Reset Schema
                                </button>
                            </div>
                        ) : hierarchyMode === 'hierarchical' ? (
                            <div className="space-y-10">
                                {/* Grouped by Category/Pillar */}
                                {hierarchy?.grouped.map(({ category, parentGroups, totalNodes, progress, stats }) => {
                                    const isCollapsed = search ? false : collapsedCategories.has(category.id);
                                    const hasNeedsWork = stats.shaky > 0 || stats.revisit > 0;

                                    return (
                                        <div
                                            key={category.id}
                                            className={`group overflow-hidden border-2 bg-[var(--surface)] shadow-[var(--shadow-hard)] transition-all duration-300 ${hasNeedsWork ? 'border-[var(--accent)]/40' : 'border-[var(--border)]'}`}
                                        >
                                            {/* Category Header */}
                                            <div
                                                onClick={() => toggleCategory(category.id)}
                                                onDragOver={(e) => handleDragOver(e, category.id)}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, category.id, 'category')}
                                                className={`flex cursor-pointer items-center justify-between border-b-2 border-[var(--border)] px-5 py-5 transition-colors hover:bg-[var(--bg)] ${dropTargetId === category.id ? 'bg-[var(--accent-soft)]' : ''}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div 
                                                        className={`hidden sm:flex w-10 h-10 border-2 items-center justify-center transition-all -rotate-3 group-hover:rotate-0 ${hasNeedsWork ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-[var(--bg)] border-[var(--border)] text-[var(--muted)]'}`}
                                                    >
                                                        <FolderTree size={18} strokeWidth={2.5} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h2 className="font-display text-xl font-bold tracking-tight text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{category.name}</h2>
                                                            {hasNeedsWork && <div className="flex h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />}
                                                        </div>
                                                        <div className="flex items-center gap-3 font-mono text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">
                                                            <span>{totalNodes} CONCEPTS</span>
                                                            <span className="w-1 h-1 rounded-full bg-[var(--border)] opacity-30" />
                                                            <span className="text-[var(--accent)]">{Math.round(progress)}% Mastery</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-4">
                                                    <div className="hidden lg:flex flex-col items-end gap-1 min-w-[120px]">
                                                        <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden flex shadow-inner">
                                                            <div className="h-full bg-[var(--accent)]" style={{ width: `${totalNodes > 0 ? (stats.solid / totalNodes) * 100 : 0}%` }} />
                                                            <div className="h-full bg-[#3b82f6]" style={{ width: `${totalNodes > 0 ? (stats.developing / totalNodes) * 100 : 0}%` }} />
                                                            <div className="h-full bg-[#f59e0b]" style={{ width: `${totalNodes > 0 ? (stats.shaky / totalNodes) * 100 : 0}%` }} />
                                                            <div className="h-full bg-[#ef4444]" style={{ width: `${totalNodes > 0 ? (stats.revisit / totalNodes) * 100 : 0}%` }} />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            href={`/vault/drill?category=${category.id}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="hidden sm:flex h-9 px-4 items-center gap-2 bg-[var(--surface-raised)] border-2 border-[var(--border)] text-[10px] font-black uppercase tracking-widest text-[var(--text)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] shadow-[var(--shadow-hard-sm)] hover:-translate-y-0.5 transition-all"
                                                        >
                                                            <Zap size={14} />
                                                            Drill
                                                        </Link>
                                                        <div className="p-1 text-[var(--muted)] group-hover:text-[var(--text)] transition-colors border-2 border-transparent group-hover:border-[var(--border)]">
                                                            {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Nested Nodes List */}
                                            {!isCollapsed && (
                                                <div className="p-6 bg-[var(--bg)] dot-grid-bg">
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                        {parentGroups.map((group: any) => renderParentNode(group))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Standalones & Orphans Area */}
                                {(hierarchy?.uncategorizedGroups.length > 0 || hierarchy?.orphans.length > 0) && (
                                    <div className="border-2 border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-hard-sm)]">
                                        <div className="flex items-center gap-3 px-6 py-5 border-b-2 border-[var(--border)] bg-[var(--bg)]">
                                            <div className="p-2 border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
                                                <Box size={16} />
                                            </div>
                                            <h2 className="font-display text-lg font-black tracking-tight text-[var(--text)] uppercase">Uncategorized Nodes</h2>
                                            <span className="font-mono text-[9px] font-black uppercase tracking-widest text-[var(--muted)] ml-auto">
                                                {hierarchy.uncategorizedGroups.length + hierarchy.orphans.length} STANDALONE
                                            </span>
                                        </div>
                                        <div className="p-6 space-y-8 bg-[var(--bg)] dot-grid-bg">
                                            {hierarchy.uncategorizedGroups.length > 0 && (
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    {hierarchy.uncategorizedGroups.map((group: any) => renderParentNode(group))}
                                                </div>
                                            )}
                                            {hierarchy.orphans.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                    {hierarchy.orphans.map(node => (
                                                        <div
                                                            key={node.id}
                                                            onClick={(e) => toggleSelection([node.id], e)}
                                                            className={`group flex items-center gap-3 px-4 py-3 border-2 transition-all cursor-pointer ${selectedNodeIds.has(node.id) ? 'bg-[var(--accent-soft)] border-[var(--accent)] shadow-[var(--shadow-hard-sm)] scale-[1.02]' : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--muted)] hover:shadow-[var(--shadow-hard-sm)]'}`}
                                                        >
                                                            <div className={`w-4 h-4 border-2 flex items-center justify-center transition-colors ${selectedNodeIds.has(node.id) ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)] group-hover:border-[var(--accent)]'}`}>
                                                                {selectedNodeIds.has(node.id) && <Check size={10} className="text-white" strokeWidth={3} />}
                                                            </div>
                                                            <MasteryDot state={node.current_mastery} size={8} />
                                                            <span className="text-[13px] font-bold text-[var(--text)] truncate flex-1">{node.display_name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Flat Grid View */
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredNodes.map((node) => (
                                    <div
                                        key={node.id}
                                        onClick={(e) => toggleSelection([node.id], e)}
                                        className={`group relative flex flex-col p-5 border-2 transition-all cursor-pointer ${selectedNodeIds.has(node.id) ? 'bg-[var(--accent-soft)] border-[var(--accent)] shadow-[var(--shadow-hard-sm)] translate-x-1 translate-y-1' : 'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--bg)] hover:shadow-[var(--shadow-hard-sm)]'}`}
                                    >
                                        <div className="flex items-center justify-between mb-6">
                                            <div className={`p-1.5 border-2 ${selectedNodeIds.has(node.id) ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-[var(--bg)] border-[var(--border)] text-[var(--muted)]'}`}>
                                                <Layers size={14} />
                                            </div>
                                            <div className={`w-5 h-5 border-2 flex items-center justify-center transition-colors ${selectedNodeIds.has(node.id) ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)] group-hover:border-[var(--accent)]'}`}>
                                                {selectedNodeIds.has(node.id) && <Check size={12} className="text-white" strokeWidth={4} />}
                                            </div>
                                        </div>
                                        <h3 className="text-base font-black text-[var(--text)] leading-tight mb-2 tracking-tight group-hover:text-[var(--accent)] transition-colors">{node.display_name}</h3>
                                        <div className="mt-auto pt-4 flex items-center justify-between border-t border-dashed border-[var(--border)]">
                                            <div className="flex items-center gap-2">
                                                <MasteryDot state={node.current_mastery} size={7} />
                                                <span className="font-mono text-[8px] font-black uppercase tracking-widest text-[var(--muted)]">{(node.current_mastery || 'NEW')}</span>
                                            </div>
                                            <ChevronRight size={14} className="text-[var(--border)] group-hover:text-[var(--accent)] transition-all group-hover:translate-x-1" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State Fallback */}
                {!loading && !hasAnyConcepts && (
                    <div className="border-4 border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-24 text-center shadow-[var(--shadow-hard)]">
                        <div className="mx-auto mb-10 flex h-28 w-28 items-center justify-center border-4 border-[var(--border)] bg-[var(--bg)] text-[var(--accent)] shadow-[var(--shadow-hard-lg)] animate-bounce-slow">
                            <Brain size={48} strokeWidth={1.5} />
                        </div>
                        <h2 className="font-display text-4xl font-black text-[var(--text)] mb-4 tracking-tight">Vault Initialized but <span className="text-[var(--accent)]">Vacant</span></h2>
                        <p className="mx-auto max-w-lg font-mono text-sm leading-relaxed text-[var(--muted)] italic mb-10">
                            &quot;The catalog is ready to record your conceptual breakthroughs. Process your first session to populate the vault.&quot;
                        </p>
                        <Link href="/" className="btn-primary inline-flex h-14 px-10 items-center gap-3 font-black uppercase tracking-[0.2em] text-sm shadow-[var(--shadow-hard)] hover:shadow-[var(--shadow-hard-lg)] hover:-translate-y-1 active:translate-y-0 transition-all">
                            <Zap size={20} strokeWidth={2.5} />
                            Deploy First Analysis
                        </Link>
                    </div>
                )}
            </div>
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

            {}
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

            {}
            {
                movingNode && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                            <h3 className="text-xl font-bold text-[var(--text)] mb-4">Move Concept</h3>
                            <p className="text-sm border border-[var(--border)] rounded-lg p-3 bg-[var(--bg)] text-[var(--muted)] mb-4">Moving <strong>{movingNode.display_name}</strong> to:</p>

                            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
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

            {}
            {selectedNodeForDetail && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border-2 border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-hard-lg)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        <div className="flex items-start justify-between border-b-2 border-[var(--border)] p-6">
                            <div className="flex items-center gap-4">
                                <div
                                    className={`flex h-12 w-12 items-center justify-center border-2 border-[var(--border)] shadow-[var(--shadow-hard-sm)] ${MASTERY_CONFIG[(selectedNodeForDetail.current_mastery || 'developing') as MasteryState].bg} ${MASTERY_CONFIG[(selectedNodeForDetail.current_mastery || 'developing') as MasteryState].color}`}
                                >
                                    <Brain size={24} strokeWidth={2} />
                                </div>
                                <div>
                                    <h3 className="font-display text-xl font-bold text-[var(--text)]">{selectedNodeForDetail.display_name}</h3>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <span
                                            className={`border border-current px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${MASTERY_CONFIG[(selectedNodeForDetail.current_mastery || 'developing') as MasteryState].bg} ${MASTERY_CONFIG[(selectedNodeForDetail.current_mastery || 'developing') as MasteryState].color}`}
                                        >
                                            {MASTERY_CONFIG[(selectedNodeForDetail.current_mastery || 'developing') as MasteryState].label} mastery
                                        </span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] bg-[var(--bg)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                                            {selectedNodeForDetail.session_count || 0} Sessions
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedNodeForDetail(null)}
                                className="p-2 hover:bg-[var(--bg)] rounded-xl text-[var(--muted)] hover:text-[var(--text)] transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                            <section className="mb-10">
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] mb-4">Conceptual Definition</h4>
                                <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-5 text-[var(--text)] leading-relaxed shadow-inner">
                                    {selectedNodeForDetail.definition || "No definition available for this concept."}
                                </div>
                            </section>

                            <div className="grid grid-cols-2 gap-6 mb-10">
                                <div>
                                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] mb-3">Quick Actions</h4>
                                    <div className="flex flex-col gap-2">
                                        <Link
                                            href={`/vault/drill?nodes=${selectedNodeForDetail.id}`}
                                            className="flex items-center gap-3 px-4 py-2.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-xl text-sm font-bold hover:bg-[var(--accent)]/20 transition-all"
                                        >
                                            <Zap size={16} fill="currentColor" /> Practice Concept
                                        </Link>
                                        <button
                                            onClick={() => { setRenamingNode(selectedNodeForDetail); setSelectedNodeForDetail(null); }}
                                            className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl text-sm font-medium hover:bg-[var(--surface)] transition-all"
                                        >
                                            <Edit2 size={16} /> Rename
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] mb-3">Related Metadata</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm py-1 border-b border-[var(--border)]/50">
                                            <span className="text-[var(--muted)]">Source:</span>
                                            <span className="font-medium text-[var(--text)]">Extraction Session</span>
                                        </div>
                                        <div className="flex justify-between text-sm py-1 border-b border-[var(--border)]/50">
                                            <span className="text-[var(--muted)]">First Learned:</span>
                                            <span className="font-medium text-[var(--text)]">
                                                {selectedNodeForDetail.created_at ? new Date(selectedNodeForDetail.created_at).toLocaleDateString() : 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-[var(--bg)] border-t border-[var(--border)] flex justify-end">
                            <button
                                onClick={() => setSelectedNodeForDetail(null)}
                                className="px-6 py-2.5 bg-[var(--text)] text-[var(--surface)] rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-black/10"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {}
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
            {}
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

            {}
            {
                actionLoading && (
                    <div className="fixed inset-0 bg-black/5 z-[1000] cursor-wait" />
                )
            }

            {}
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

