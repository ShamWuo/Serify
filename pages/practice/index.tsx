import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import SEO from '@/components/Layout/SEO';
import { 
    Activity, 
    BookOpen, 
    Brain, 
    CheckCircle, 
    Clock, 
    FileText, 
    Layers, 
    Printer, 
    Sparkles, 
    Target, 
    Zap, 
    ChevronRight,
    X,
    History
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

type ToolId = 'test' | 'quiz' | 'exam' | 'scenario' | 'flashcards' | 'review';

interface ToolDef {
    id: ToolId;
    title: string;
    description: string;
    icon: React.FC<any>;
    color: string;
    bgColor: string;
    cost: number;
    hasDifficulty: boolean;
}

const TOOLS: ToolDef[] = [
    {
        id: 'test',
        title: 'Practice Test',
        description: '6-8 comprehensive questions to test your depth of understanding.',
        icon: Target,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        cost: 8,
        hasDifficulty: true
    },
    {
        id: 'quiz',
        title: 'Quick Quiz',
        description: '5 rapid-fire questions for a quick knowledge check.',
        icon: Zap,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        cost: 3,
        hasDifficulty: true
    },
    {
        id: 'exam',
        title: 'Timed Exam',
        description: 'Full simulation under pressure. Exposes hidden misconceptions.',
        icon: Clock,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        cost: 10,
        hasDifficulty: true
    },
    {
        id: 'scenario',
        title: 'Real Scenario',
        description: 'Apply your knowledge to solve a realistic, domain-specific problem.',
        icon: Activity,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        cost: 5,
        hasDifficulty: false
    },
    {
        id: 'flashcards',
        title: 'Flashcards',
        description: 'Build familiarity with key terms, mechanisms, and distinctions.',
        icon: Layers,
        color: 'text-teal-600',
        bgColor: 'bg-teal-50',
        cost: 2,
        hasDifficulty: false
    },
    {
        id: 'review',
        title: 'Spaced Review',
        description: 'Optimize long-term retention. Only reviews what\'s due today.',
        icon: Brain,
        color: 'text-slate-700',
        bgColor: 'bg-slate-100',
        cost: 0,
        hasDifficulty: false
    }
];

export default function PracticeDashboard() {
    const { user } = useAuth();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [dueReviews, setDueReviews] = useState<any[]>([]);
    const [recentSessions, setRecentSessions] = useState<any[]>([]);
    const [vaultConcepts, setVaultConcepts] = useState<any[]>([]);
    
    const [selectedTool, setSelectedTool] = useState<ToolDef | null>(null);
    const [topicInput, setTopicInput] = useState('');
    const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
    const [difficulty, setDifficulty] = useState<'auto' | 'easy' | 'medium' | 'hard'>('auto');
    const [isGenerating, setIsGenerating] = useState(false);

    const inputPanelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                // Fetch Due Reviews
                const { data: reviews } = await supabase
                    .from('review_schedule')
                    .select('*')
                    .eq('user_id', user.id)
                    .lte('next_review_date', new Date().toISOString().split('T')[0])
                    .eq('is_mastered', false);
                setDueReviews(reviews || []);

                // Fetch Recent Sessions
                const { data: sessions } = await supabase
                    .from('practice_sessions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('started_at', { ascending: false })
                    .limit(3);
                setRecentSessions(sessions || []);

                // Fetch Vault Concepts
                const { data: concepts } = await supabase
                    .from('knowledge_nodes')
                    .select('id, display_name, current_mastery')
                    .eq('user_id', user.id)
                    .eq('is_archived', false)
                    .order('last_seen_at', { ascending: false })
                    .limit(20);
                setVaultConcepts(concepts || []);

            } catch (error) {
                console.error("Error fetching practice data:", error);
                toast.error("Failed to load dashboard data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    const handleToolClick = (tool: ToolDef) => {
        if (tool.id === 'review') {
            // Spaced Review has no input, just go
            if (dueReviews.length === 0) {
                toast("You have no concepts due for review right now.", { icon: '🙌' });
                return;
            }
            router.push('/practice/review');
            return;
        }
        
        setSelectedTool(tool);
        setTimeout(() => {
            inputPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
    };

    const toggleConcept = (id: string) => {
        setSelectedConcepts(prev => 
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const handleGenerate = async () => {
        if (!selectedTool) return;
        if (!topicInput.trim() && selectedConcepts.length === 0) {
            toast.error("Please enter a topic or select a concept to practice.");
            return;
        }

        setIsGenerating(true);
        // We will pass data via URL or a temporary storage/API
        // For now, redirect to the tool page with query params.
        // The actual generation logic will live on the target tool page, OR we do it here. 
        // According to the spec: "Clicking a tool card opens the input panel... Token cost shows correctly on Generate button"
        // Let's redirect to the tool page which will handle the generation loading state.
        
        const params = new URLSearchParams();
        if (topicInput.trim()) params.append('topic', topicInput.trim());
        if (selectedConcepts.length > 0) params.append('concepts', selectedConcepts.join(','));
        if (selectedTool.hasDifficulty) params.append('diff', difficulty);
        
        router.push(`/practice/${selectedTool.id}?${params.toString()}`);
    };

    if (!user && !isLoading) {
        return (
            <div className="flex h-screen items-center justify-center p-4 text-center bg-[var(--bg)]">
                <p className="text-[var(--muted)]">Please sign in to access Practice Mode.</p>
            </div>
        );
    }

    return (
        <DashboardLayout>
            <SEO title="Practice | Serify" description="Unified tools for knowledge application and testing." />

            <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 md:py-8 relative z-10 pb-32">
                <div className="max-w-5xl mx-auto space-y-10">
                    
                    {/* Header */}
                    <header className="space-y-4 animate-fade-in-up">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full text-xs font-bold uppercase tracking-wider">
                            <Sparkles size={14} /> Knowledge Application
                        </div>
                        <h1 className="text-4xl md:text-5xl font-display text-[var(--text)] tracking-tight">
                            Practice & <span className="text-[var(--accent)]">Verify</span>
                        </h1>
                        <p className="text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
                            Select a tool to test your understanding, find your blind spots, and embed knowledge into long-term memory.
                        </p>
                    </header>

                    {/* Due Review Banner */}
                    {dueReviews.length > 0 && (
                        <div className="animate-fade-in-up bg-orange-50 border border-orange-200 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
                            <div className="relative z-10 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
                                    <Brain size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-orange-900">Spaced Review Due</h3>
                                    <p className="text-sm text-orange-700">You have {dueReviews.length} concept{dueReviews.length !== 1 ? 's' : ''} ready for optimal review.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleToolClick(TOOLS.find(t => t.id === 'review')!)}
                                className="relative z-10 w-full md:w-auto px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                            >
                                Start Review <ChevronRight size={18} />
                            </button>
                        </div>
                    )}

                    {/* Tool Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                        {TOOLS.map((tool) => (
                            <button
                                key={tool.id}
                                onClick={() => handleToolClick(tool)}
                                className={`text-left p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden group hover:-translate-y-1 ${
                                    selectedTool?.id === tool.id 
                                    ? 'bg-white border-[var(--accent)] shadow-md ring-1 ring-[var(--accent)]' 
                                    : 'bg-white border-[var(--border)] shadow-sm hover:shadow-md hover:border-slate-300'
                                }`}
                            >
                                <div className="space-y-4 relative z-10">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tool.bgColor} ${tool.color} transition-transform group-hover:scale-110`}>
                                        <tool.icon size={24} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <h3 className="font-display text-xl text-[var(--text)]">{tool.title}</h3>
                                        <p className="text-sm text-[var(--muted)] leading-relaxed h-[60px]">{tool.description}</p>
                                    </div>
                                    <div className="pt-2 flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                                            tool.cost > 0 
                                            ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                            : 'bg-green-50 text-green-700 border-green-100'
                                        }`}>
                                            {tool.cost > 0 ? `${tool.cost} TOKENS` : 'FREE'}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Universal Input Panel */}
                    {selectedTool && selectedTool.id !== 'review' && (
                        <div ref={inputPanelRef} className="animate-fade-in-up premium-card border-[1.5px] border-[var(--accent)] shadow-xl shadow-[var(--accent)]/10 rounded-3xl overflow-hidden mt-8 relative bg-white">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent)] to-blue-400" />
                            <div className="p-6 md:p-8 space-y-8">
                                
                                <div className="flex items-center justify-between border-b pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedTool.bgColor} ${selectedTool.color}`}>
                                            <selectedTool.icon size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-display text-[var(--text)]">{selectedTool.title} Setup</h2>
                                            <p className="text-xs text-[var(--muted)]">{selectedTool.id === 'exam' ? 'Configure your simulation' : 'Choose what to practice'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedTool(null)} className="p-2 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Topic Input */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[var(--text)]">What do you want to practice?</label>
                                        <input 
                                            type="text"
                                            value={topicInput}
                                            onChange={(e) => setTopicInput(e.target.value)}
                                            placeholder="e.g. Mitochondria, React Hooks, or The French Revolution..."
                                            className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:outline-none transition-shadow"
                                        />
                                    </div>

                                    {/* Vault Concepts */}
                                    {vaultConcepts.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-bold text-[var(--text)]">Or select from your Vault</label>
                                                <span className="text-xs text-[var(--muted)]">{selectedConcepts.length} selected</span>
                                            </div>
                                            <div className="flex gap-2 flex-wrap max-h-40 overflow-y-auto p-2 -mx-2">
                                                {vaultConcepts.map(c => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => toggleConcept(c.id)}
                                                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                                                            selectedConcepts.includes(c.id)
                                                            ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md scale-105'
                                                            : 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {c.display_name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Difficulty */}
                                    {selectedTool.hasDifficulty && (
                                        <div className="space-y-2 pt-2 border-t border-[var(--border)]/50">
                                            <label className="text-sm font-bold text-[var(--text)]">Starting Difficulty</label>
                                            <div className="flex bg-[var(--surface)] rounded-xl p-1 border border-[var(--border)] w-fit">
                                                {['auto', 'easy', 'medium', 'hard'].map(level => (
                                                    <button
                                                        key={level}
                                                        onClick={() => setDifficulty(level as any)}
                                                        className={`px-4 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
                                                            difficulty === level 
                                                            ? 'bg-white text-[var(--accent)] shadow-sm' 
                                                            : 'text-[var(--muted)] hover:text-[var(--text)]'
                                                        }`}
                                                    >
                                                        {level}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-[var(--muted)] mt-1 ml-1">
                                                {difficulty === 'auto' ? 'Adapts based on your Vault mastery.' : 'Overrides adaptive starting level.'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Generate Button */}
                                <div className="pt-6 border-t flex items-center justify-between">
                                    <div className="text-xs text-[var(--muted)]">
                                        Generates instantly. Requires <span className="font-bold text-[var(--text)]">{selectedTool.cost} Tokens</span>.
                                    </div>
                                    <button 
                                        onClick={handleGenerate}
                                        disabled={isGenerating || (!topicInput && selectedConcepts.length === 0)}
                                        className="px-8 py-3 bg-[var(--accent)] text-white font-bold rounded-xl shadow-lg shadow-[var(--accent)]/20 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2"
                                    >
                                        {isGenerating ? 'Prepping...' : `Start ${selectedTool.title}`} 
                                        {!isGenerating && <ChevronRight size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent Practice */}
                    <div className="mt-16 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-display flex items-center gap-2">
                                <History size={20} className="text-[var(--muted)]" /> Recent Practice
                            </h2>
                            {recentSessions.length > 0 && (
                                <Link href="/practice/results" className="text-sm text-[var(--accent)] font-medium hover:underline">
                                    View All
                                </Link>
                            )}
                        </div>
                        
                        {isLoading ? (
                            <div className="h-32 flex items-center justify-center">
                                <span className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></span>
                            </div>
                        ) : recentSessions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {recentSessions.map(session => {
                                    const toolDef = TOOLS.find(t => t.id === session.tool) || TOOLS[0];
                                    return (
                                        <Link 
                                            key={session.id} 
                                            href={`/practice/results/${session.id}`}
                                            className="p-5 rounded-2xl bg-white border border-[var(--border)] hover:border-[var(--accent)]/30 hover:shadow-md transition-all group flex flex-col justify-between h-[140px]"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-xs font-bold text-[var(--muted)] uppercase tracking-wider group-hover:text-[var(--accent)] transition-colors">
                                                    <toolDef.icon size={14} />
                                                    {toolDef.title}
                                                </div>
                                                <h3 className="font-medium text-[var(--text)] line-clamp-2 leading-snug">
                                                    {session.topic || 'Vault Review'}
                                                </h3>
                                            </div>
                                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border)]/50">
                                                <span className="text-xs text-[var(--muted)]">
                                                    {new Date(session.started_at).toLocaleDateString()}
                                                </span>
                                                {session.status === 'completed' ? (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                        session.overall_performance === 'strong' ? 'bg-green-100 text-green-700' :
                                                        session.overall_performance === 'weak' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {session.overall_performance?.toUpperCase() || 'COMPLETED'}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                                                        {session.status}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white border border-[var(--border)] border-dashed rounded-3xl">
                                <p className="text-[var(--muted)]">No recent practice sessions found.</p>
                            </div>
                        )}
                    </div>

                    {/* Printable Target */}
                    <div className="text-center pt-8 pb-12 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                        <button className="text-sm font-medium text-[var(--muted)] hover:text-[var(--accent)] transition-colors inline-flex items-center gap-1.5 group">
                            <Printer size={16} className="group-hover:scale-110 transition-transform" /> 
                            Just want a printable test? Generate one without completing it in Serify &rarr;
                        </button>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}
