import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import SEO from '@/components/Layout/SEO';
import { 
    ArrowLeft, 
    Send, 
    CheckCircle, 
    AlertTriangle, 
    Activity,
    ChevronRight,
    Target,
    Zap,
    GraduationCap,
    Lightbulb,
    Puzzle,
    Clock,
    Sparkles,
    RefreshCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

type ScenarioPhase = 'setup' | 'simulating' | 'feedback';

export default function ScenarioPractice() {
    const { user } = useAuth();
    const router = useRouter();
    
    // Core State
    const [phase, setPhase] = useState<ScenarioPhase>('setup');
    const [isLoading, setIsLoading] = useState(false);
    
    // Setup State
    const [setupMode, setSetupMode] = useState<'vault' | 'adhoc'>('adhoc');
    const [adhocTopic, setAdhocTopic] = useState('');
    const [availableConcepts, setAvailableConcepts] = useState<any[]>([]);
    const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
    const [vaultSubMode, setVaultSubMode] = useState<'weakest' | 'specific' | 'category' | 'random'>('specific');
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    // Sim State
    const [scenarioText, setScenarioText] = useState('');
    const [questionText, setQuestionText] = useState('');
    const [userAnswer, setUserAnswer] = useState('');
    const [sessionData, setSessionData] = useState<{ sessionId: string; responseId: string } | null>(null);
    const [sessionStartTs, setSessionStartTs] = useState<number>(0);

    // Feedback State
    const [evaluation, setEvaluation] = useState<{ score: string; feedback: string } | null>(null);

    // Fetch Concepts on Load
    useEffect(() => {
        if (!user) return;
        const fetchConcepts = async () => {
             const { data } = await supabase
                 .from('knowledge_nodes')
                 .select('id, display_name, created_at, session_ids, current_mastery, category_id')
                 .eq('node_type', 'concept')
                 .eq('user_id', user.id)
                 .order('created_at', { ascending: false });
             
             const { data: catData } = await supabase
                .from('vault_categories')
                .select('*')
                .eq('user_id', user.id);
             
             if (catData) setCategories(catData);
             
             if (data) {
                 setAvailableConcepts(data);
                 if (data.length > 0) {
                     setSetupMode('vault');
                 }
                 
                 if (router.query.topic) {
                     setAdhocTopic(router.query.topic as string);
                     setSetupMode('adhoc');
                 } else if (router.query.session) {
                     const sessionId = router.query.session as string;
                     const sessionConceptIds = data
                         .filter(c => c.session_ids?.includes(sessionId))
                         .map(c => c.id);
                     if (sessionConceptIds.length > 0) {
                         setSelectedConcepts(sessionConceptIds.slice(0, 2));
                         setSetupMode('vault');
                     }
                 }
             }
        };
        if (router.isReady) {
            fetchConcepts();
        }
    }, [user, router.isReady, router.query.session, router.query.topic]);

    const handleGenerateScenario = async () => {
        if (setupMode === 'vault' && selectedConcepts.length === 0) {
            toast.error("Select 1-2 concepts to base the scenario on.");
            return;
        }
        if (setupMode === 'vault' && selectedConcepts.length > 2) {
            toast.error("Scenarios work best when focused on 1-2 concepts. Please reduce your selection.");
            return;
        }
        if (setupMode === 'adhoc' && !adhocTopic.trim()) {
            toast.error("Please enter a topic or paste content.");
            return;
        }

        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/practice/scenario/generate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ 
                    conceptIds: setupMode === 'vault' ? selectedConcepts : [],
                    topic: setupMode === 'adhoc' ? adhocTopic : null
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to generate scenario');
            }

            const data = await res.json();
            setSessionData({ sessionId: data.sessionId, responseId: data.responseId });
            setScenarioText(data.scenarioText);
            setQuestionText(data.questionText);
            setSessionStartTs(Date.now());
            setPhase('simulating');
            
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitScenario = async () => {
        if (!userAnswer.trim()) {
            toast.error("Please provide an answer.");
            return;
        }

        setIsLoading(true);
        const timeSpentSecs = Math.floor((Date.now() - sessionStartTs) / 1000);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/practice/scenario/evaluate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    sessionId: sessionData?.sessionId,
                    responseId: sessionData?.responseId,
                    scenarioText,
                    questionText,
                    userAnswer,
                    timeSpentSeconds: timeSpentSecs
                })
            });

            if (!res.ok) throw new Error("Evaluation failed");
            
            const data = await res.json();
            setEvaluation(data.evaluation);
            setPhase('feedback');

        } catch (error: any) {
             toast.error(error.message || "Failed to submit scenario");
        } finally {
             setIsLoading(false);
        }
    };

    if (!user) return null;

    if (phase === 'setup') {
        return (
            <DashboardLayout>
                <SEO title="Scenario Lab | Serify" />
                <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in-up">
                    <header className="space-y-6">
                        <Link href="/practice" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--accent)] transition-colors uppercase tracking-widest">
                            <ArrowLeft size={14} /> Back to Arena
                        </Link>
                        
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wider border border-purple-100">
                                <Puzzle size={14} /> Application Training
                            </div>
                            <h1 className="text-4xl md:text-5xl font-display text-[var(--text)] tracking-tight">Scenario <span className="text-purple-600">Simulations</span></h1>
                            <p className="text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
                                Apply your knowledge to messy, real-world problems. We&apos;ll generate a unique scenario based on your selected concepts to test how well you can execute in practice.
                            </p>
                        </div>
                    </header>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-8 premium-card rounded-3xl p-8 space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-display text-[var(--text)]">Knowledge Scope</h3>
                                    
                                    {availableConcepts.length > 0 && (
                                        <div className="flex bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)]">
                                            <button 
                                                onClick={() => setSetupMode('adhoc')}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${setupMode === 'adhoc' ? 'bg-white shadow-sm text-[var(--text)]' : 'text-[var(--muted)]'}`}
                                            >
                                                Ad-hoc
                                            </button>
                                            <button 
                                                onClick={() => setSetupMode('vault')}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${setupMode === 'vault' ? 'bg-white shadow-sm text-[var(--text)]' : 'text-[var(--muted)]'}`}
                                            >
                                                Vault
                                            </button>
                                        </div>
                                    )}
                                </div>
                                    
                                    {setupMode === 'vault' && availableConcepts.length > 0 && (
                                        <div className="flex flex-wrap gap-2 animate-fade-in-up">
                                            {[
                                                { id: 'weakest', label: 'Weakest' },
                                                { id: 'specific', label: 'Specific' },
                                                { id: 'category', label: 'Category' },
                                                { id: 'random', label: 'Random' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => {
                                                        setVaultSubMode(opt.id as any);
                                                        if (opt.id === 'random') {
                                                            const shuffled = [...availableConcepts].sort(() => 0.5 - Math.random());
                                                            setSelectedConcepts(shuffled.slice(0, 2).map(c => c.id));
                                                        } else if (opt.id === 'weakest') {
                                                            const weakest = availableConcepts
                                                                .filter(c => ['revisit', 'shaky'].includes(c.current_mastery))
                                                                .sort(() => 0.5 - Math.random())
                                                                .slice(0, 2);
                                                            setSelectedConcepts(weakest.map(c => c.id));
                                                        } else {
                                                            setSelectedConcepts([]);
                                                        }
                                                    }}
                                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                                        vaultSubMode === opt.id 
                                                        ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm' 
                                                        : 'bg-white border-[var(--border)] text-[var(--muted)] hover:border-purple-100'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {setupMode === 'adhoc' ? (
                                    <div className="space-y-4 animate-fade-in-up">
                                        <p className="text-sm text-[var(--muted)]">Generate a simulation from any topic or pasted content. We&apos;ll create a real-world scenario for you.</p>
                                        <textarea 
                                            value={adhocTopic}
                                            onChange={(e) => setAdhocTopic(e.target.value)}
                                            placeholder="What do you want to practice? (e.g. 'Customer Negotiation', 'Emergency Room Triage', or paste a case study...)"
                                            className="w-full h-32 p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all outline-none resize-none font-serif"
                                        />
                                        {availableConcepts.length === 0 && (
                                            <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl flex gap-3">
                                                <Zap size={16} className="text-purple-500 shrink-0 mt-0.5" />
                                                <p className="text-[11px] text-purple-800 leading-relaxed font-medium">
                                                    You don&apos;t have any Vault concepts yet. This session will help you build your knowledge base by extracting core principles from your simulation.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-fade-in-up">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-[var(--muted)] italic">Select 1-2 concepts to base the scenario on.</p>
                                            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest bg-[var(--bg)] border border-[var(--border)] px-2 py-0.5 rounded-full">
                                                Max 2 Items
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar p-1">
                                            {vaultSubMode === 'category' ? (
                                                categories.map(cat => {
                                                    const count = availableConcepts.filter(c => c.category_id === cat.id).length;
                                                    const isSelected = selectedCategoryId === cat.id;
                                                    return (
                                                        <div 
                                                            key={cat.id}
                                                            onClick={() => {
                                                                setSelectedCategoryId(cat.id);
                                                                // Pick 2 random from category
                                                                const catConcepts = availableConcepts.filter(c => c.category_id === cat.id);
                                                                const shuffled = [...catConcepts].sort(() => 0.5 - Math.random());
                                                                setSelectedConcepts(shuffled.slice(0, 2).map(c => c.id));
                                                            }}
                                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                                                                isSelected 
                                                                ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-100 shadow-sm' 
                                                                : 'bg-white border-[var(--border)] hover:border-purple-200'
                                                            }`}
                                                        >
                                                            <div className="space-y-1 text-left">
                                                                <p className={`text-sm font-bold ${isSelected ? 'text-purple-900' : 'text-[var(--text)]'}`}>{cat.name}</p>
                                                                <p className="text-[10px] font-bold text-[var(--muted)]">{count} concepts</p>
                                                            </div>
                                                            {isSelected && <CheckCircle size={16} className="text-purple-600" />}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                availableConcepts
                                                    .filter(c => {
                                                        if (vaultSubMode === 'weakest') return ['revisit', 'shaky'].includes(c.current_mastery);
                                                        return true;
                                                    })
                                                    .map(c => {
                                                        const isSelected = selectedConcepts.includes(c.id);
                                                        const isDisabled = !isSelected && selectedConcepts.length >= 2;
                                                        
                                                        return (
                                                            <div 
                                                                key={c.id} 
                                                                onClick={() => {
                                                                    if (isSelected) setSelectedConcepts(selectedConcepts.filter(id => id !== c.id));
                                                                    else if (!isDisabled) setSelectedConcepts([...selectedConcepts, c.id]);
                                                                }}
                                                                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                                                                    isSelected 
                                                                    ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-100 shadow-sm' 
                                                                    : isDisabled 
                                                                    ? 'opacity-40 grayscale cursor-not-allowed border-transparent' 
                                                                    : 'bg-white border-[var(--border)] hover:border-purple-200 hover:shadow-sm'
                                                                }`}
                                                            >
                                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                                                    isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-[var(--border)] bg-white'
                                                                }`}>
                                                                    {isSelected && <CheckCircle size={12} strokeWidth={3} />}
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className={`text-sm font-bold ${isSelected ? 'text-purple-900' : 'text-[var(--text)]'}`}>{c.display_name}</p>
                                                                    <p className={`text-[10px] font-bold uppercase tracking-wider ${
                                                                        ['revisit', 'shaky'].includes(c.current_mastery) ? 'text-red-600' : 'text-[var(--muted)]'
                                                                    }`}>{c.current_mastery}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                        <div className="lg:col-span-4 space-y-6">
                            <div className="premium-card p-6 rounded-3xl bg-gradient-to-br from-purple-50 to-white border-purple-100 space-y-6">
                                <div className="space-y-2">
                                    <h3 className="font-bold text-sm uppercase tracking-wider text-purple-700">Lab Requirements</h3>
                                    <p className="text-xs text-purple-900/60 leading-relaxed font-medium">
                                        Each scenario session utilizes generative AI to create contextually relevant problems tailored to your current level of mastery.
                                    </p>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-purple-100">
                                        <span className="text-xs font-bold text-purple-800 uppercase tracking-tight">AI Fuel Cost</span>
                                        <span className="text-sm font-black text-purple-600 flex items-center gap-1">
                                            <Zap size={14} className="fill-purple-600" /> 0.5
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-purple-100">
                                        <span className="text-xs font-bold text-purple-800 uppercase tracking-tight">Focus Limit</span>
                                        <span className="text-sm font-black text-purple-600">2 NODES</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleGenerateScenario}
                                    disabled={isLoading || (setupMode === 'vault' && selectedConcepts.length === 0) || (setupMode === 'adhoc' && !adhocTopic.trim())}
                                    className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-30 shadow-lg shadow-purple-600/20 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 hover:-translate-y-1 active:translate-y-0"
                                >
                                    {isLoading ? (
                                        <><RefreshCcw size={18} className="animate-spin" /> Igniting Sim...</>
                                    ) : (
                                        <><Sparkles size={18} /> Initialize Scenario</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (phase === 'simulating') {
        return (
            <DashboardLayout>
                <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col h-[calc(100vh-8rem)] animate-fade-in-up">
                    <div className="flex-grow flex flex-col lg:flex-row gap-8 min-h-0 overflow-hidden">
                        
                        {/* Scenario Narrative */}
                        <div className="w-full lg:w-1/2 flex flex-col min-h-0">
                            <div className="premium-card rounded-3xl p-8 md:p-10 flex flex-col min-h-0 overflow-hidden border border-purple-100 shadow-xl shadow-purple-600/[0.03]">
                                <div className="flex items-center justify-between mb-8 flex-shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
                                            <Puzzle size={16} />
                                        </div>
                                        <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text)]">Case Simulation</h2>
                                    </div>
                                    <div className="text-[10px] font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100 uppercase tracking-wider">
                                        Active Response Required
                                    </div>
                                </div>
                                
                                <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar space-y-10">
                                    <div className="prose prose-slate max-w-none text-lg text-[var(--text)] font-serif leading-relaxed line-height-relaxed italic md:px-6">
                                        <ReactMarkdown>{scenarioText}</ReactMarkdown>
                                    </div>
                                    
                                    <div className="bg-purple-50 p-8 rounded-2xl border-2 border-dashed border-purple-200 space-y-6">
                                        <h3 className="text-xs font-black text-purple-800 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Target size={14} /> The Directive
                                        </h3>
                                        <div className="text-xl md:text-2xl text-purple-900 font-display leading-tight">
                                            <ReactMarkdown>{questionText}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="w-full lg:w-1/2 flex flex-col min-h-0">
                            <div className="flex-grow flex flex-col bg-white border border-[var(--border)] rounded-3xl p-4 md:p-6 shadow-sm overflow-hidden">
                                <textarea
                                    value={userAnswer}
                                    onChange={(e) => setUserAnswer(e.target.value)}
                                    placeholder="Outline your strategic approach, diagnostic patterns, or direct solution here..."
                                    className="flex-grow bg-[#fcfdfc] border border-[var(--border)] rounded-2xl p-6 md:p-10 text-lg text-[var(--text)] placeholder-[#ccd4d3] resize-none focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all leading-relaxed font-serif"
                                    autoFocus
                                />
                                <div className="mt-6 flex items-center justify-between px-2">
                                     <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
                                         <Clock size={12} /> Live evaluation window
                                     </div>
                                     <button
                                        onClick={handleSubmitScenario}
                                        disabled={isLoading || !userAnswer.trim()}
                                        className="px-12 py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-30 shadow-xl shadow-purple-600/20 text-white font-bold rounded-2xl transition-all flex items-center gap-3 hover:-translate-y-1 active:translate-y-0"
                                     >
                                        {isLoading ? (
                                            <><RefreshCcw size={18} className="animate-spin" /> Evaluating Analysis...</>
                                        ) : (
                                            <><Send size={18} /> Submit Solution</>
                                        )}
                                     </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (phase === 'feedback') {
        const isStrong = evaluation?.score === 'strong';
        const isWeak = evaluation?.score === 'weak';
        
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto px-4 py-12 space-y-10 animate-fade-in-up">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-display text-[var(--text)] tracking-tight">Simulation Result</h1>
                            <p className="text-sm font-bold text-[var(--muted)] uppercase tracking-[0.2em]">{isStrong ? 'Mission Success' : 'Debriefing Required'}</p>
                        </div>
                        <button 
                            onClick={() => router.push('/practice')} 
                            className="px-8 py-3 bg-[var(--text)] text-white hover:bg-black font-bold rounded-xl transition-all shadow-md active:scale-95"
                        >
                            Return to Dashboard
                        </button>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                        {/* Score Indicator */}
                        <div className="md:col-span-4 space-y-6">
                            <div className={`premium-card p-10 rounded-3xl text-center space-y-4 border-2 ${
                                isStrong ? 'bg-green-50 border-green-200 shadow-green-600/[0.05]' : 
                                isWeak ? 'bg-orange-50 border-orange-200 shadow-orange-600/[0.05]' : 
                                'bg-yellow-50 border-yellow-200 shadow-yellow-600/[0.05]'
                            }`}>
                                <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center shadow-lg transition-transform hover:scale-110 duration-500 overflow-hidden relative">
                                    <div className={`absolute inset-0 opacity-20 ${isStrong ? 'bg-green-600' : isWeak ? 'bg-orange-600' : 'bg-yellow-600'}`} />
                                    {isStrong ? (
                                        <CheckCircle size={40} className="text-green-600 relative z-10" />
                                    ) : (
                                        <AlertTriangle size={40} className={`relative z-10 ${isWeak ? 'text-orange-600' : 'text-yellow-600'}`} />
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)]">Performance Grade</h3>
                                    <p className={`text-5xl font-display capitalize ${
                                        isStrong ? 'text-green-700' : isWeak ? 'text-orange-700' : 'text-yellow-700'
                                    }`}>
                                        {evaluation?.score}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="premium-card p-6 rounded-3xl space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
                                    <Lightbulb size={14} className="text-yellow-500" /> Focus Point
                                </h3>
                                <p className="text-sm text-[var(--text)] font-medium leading-relaxed">
                                    {isStrong 
                                        ? "You've demonstrated structural integrity in your application. Proceed to more complex multivariable scenarios."
                                        : "Review the theoretical foundations and look for connections between the missed variables in your solution."
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Detailed Analysis */}
                        <div className="md:col-span-8 space-y-8">
                            <div className="premium-card rounded-3xl overflow-hidden shadow-xl shadow-[var(--accent)]/[0.03]">
                                <div className="p-8 md:p-10 space-y-8">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" /> Narrative Analysis
                                        </h3>
                                        <div className="text-xl text-[var(--text)] leading-relaxed font-serif prose prose-slate max-w-none prose-p:mb-6">
                                            <ReactMarkdown>{evaluation?.feedback || ''}</ReactMarkdown>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-10 border-t border-[var(--border)] space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Original Input</h3>
                                        <div className="bg-[var(--bg)] p-8 rounded-2xl border border-[var(--border)] shadow-inner text-lg text-[var(--muted)] font-serif italic leading-relaxed relative overflow-hidden">
                                            <span className="text-[100px] font-serif absolute left-2 top-[-20px] opacity-[0.03] text-[var(--accent)] pointer-events-none">&ldquo;</span>
                                            {userAnswer}
                                            <span className="text-[100px] font-serif absolute right-2 bottom-[-100px] opacity-[0.03] text-[var(--accent)] pointer-events-none">&rdquo;</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </DashboardLayout>
        );
    }

    return null;
}
