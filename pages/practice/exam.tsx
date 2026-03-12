import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import SEO from '@/components/Layout/SEO';
import { 
    ArrowLeft, 
    Clock, 
    AlertTriangle, 
    CheckCircle, 
    ChevronRight, 
    ChevronLeft, 
    Save,
    GraduationCap,
    FileText,
    Zap,
    Target,
    Settings,
    History,
    RefreshCcw,
    Award,
    TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

// Types
type ExamPhase = 'setup' | 'simulating' | 'report' | 'printable';
type Question = {
    id: string;
    fallbackId: number;
    text: string;
    type: string;
    conceptId: string;
    difficulty: number;
    answer: string;
};

export default function ExamSimulation() {
    const { user } = useAuth();
    const router = useRouter();
    
    // Core State
    const [phase, setPhase] = useState<ExamPhase>('setup');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [evaluationResult, setEvaluationResult] = useState<any | null>(null);
    const [isPrintMode, setIsPrintMode] = useState(false);

    // Setup State
    const [setupMode, setSetupMode] = useState<'vault' | 'adhoc'>('adhoc');
    const [adhocTopic, setAdhocTopic] = useState('');
    const [availableConcepts, setAvailableConcepts] = useState<any[]>([]);
    const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
    const [format, setFormat] = useState('standard');
    const [timeLimit, setTimeLimit] = useState<number>(30);
    const [questionCount, setQuestionCount] = useState<number>(5);
    const [vaultSubMode, setVaultSubMode] = useState<'all' | 'weakest' | 'specific' | 'category'>('specific');
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    // Simulation State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [sessionStartTs, setSessionStartTs] = useState<number>(0);

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

                 if (router.query.print === 'true') {
                     setIsPrintMode(true);
                     setFormat('standard');
                     setQuestionCount(10);
                     setTimeLimit(0);
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
                         setSelectedConcepts(sessionConceptIds);
                         setSetupMode('vault');
                     }
                 }
             }
        };
        if (router.isReady) {
            fetchConcepts();
        }
    }, [user, router.isReady, router.query.session, router.query.topic, router.query.print]);

    // Timer Logic
    useEffect(() => {
        if (phase === 'simulating' && timeRemaining !== null) {
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev === null || prev <= 0) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        handleAutoSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [phase, timeRemaining]); // eslint-disable-line

    const formatTime = (seconds: number) => {
         const m = Math.floor(seconds / 60);
         const s = seconds % 60;
         return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleStartExam = async () => {
        if (setupMode === 'vault' && selectedConcepts.length === 0) {
            toast.error("Select at least one concept to test");
            return;
        }
        if (setupMode === 'adhoc' && !adhocTopic.trim()) {
            toast.error("Please enter a topic or paste content");
            return;
        }

        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/practice/exam/start', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    conceptIds: setupMode === 'vault' ? selectedConcepts : [],
                    topic: setupMode === 'adhoc' ? adhocTopic : null,
                    format,
                    questionCount,
                    timeLimitMinutes: timeLimit
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to start exam');
            }

            const data = await res.json();
            setSessionId(data.sessionId);
            
            const mappedQuestions: Question[] = data.questions.map((q: any, i: number) => ({
                id: `fallback-${i}`,
                fallbackId: i,
                text: q.text,
                type: q.type,
                conceptId: q.conceptId,
                difficulty: q.difficulty,
                answer: ''
            }));
            
            setQuestions(mappedQuestions);
            
            if (timeLimit > 0 && !isPrintMode) {
                setTimeRemaining(timeLimit * 60);
            } else {
                setTimeRemaining(null);
            }
            setSessionStartTs(Date.now());
            
            if (isPrintMode) {
                setPhase('printable');
                // Small delay to allow layout calculation before print dialog
                setTimeout(() => {
                    window.print();
                }, 1000);
            } else {
                setPhase('simulating');
            }
            
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswerChange = (val: string) => {
        const newQs = [...questions];
        newQs[currentQuestionIndex].answer = val;
        setQuestions(newQs);
    };

    const handleAutoSubmit = () => {
        toast.error("Time is up! Submitting exam...");
        handleSubmitExam();
    };

    const handleSubmitExam = async () => {
        if (!sessionId) return;
        setIsLoading(true);

        const timeSpentSecs = Math.floor((Date.now() - sessionStartTs) / 1000);

        try {
            const { data: dbResponses } = await supabase
               .from('practice_responses')
               .select('id, question_number')
               .eq('practice_session_id', sessionId)
               .order('question_number', { ascending: true });

            const formattedAnswers = dbResponses?.map((dbR, i) => ({
                questionId: dbR.id,
                answer: questions[i]?.answer || ''
            })) || [];

            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/practice/exam/submit', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    sessionId,
                    answers: formattedAnswers,
                    timeSpentSeconds: timeSpentSecs
                })
            });

            if (!res.ok) throw new Error("Grading failed");
            
            const data = await res.json();
            setEvaluationResult(data.evaluation);
            setPhase('report');
            if (timerRef.current) clearInterval(timerRef.current);

        } catch (error: any) {
             toast.error(error.message || "Failed to submit exam");
        } finally {
             setIsLoading(false);
        }
    };

    if (!user) return null;

    if (phase === 'setup') {
        return (
            <DashboardLayout>
                <SEO title="Exam Config | Serify" />
                <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in-up">
                    <header className="space-y-4">
                        <Link href="/practice" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--accent)] transition-colors uppercase tracking-widest">
                            <ArrowLeft size={14} /> Back to Arena
                        </Link>
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold uppercase tracking-wider border border-red-100">
                                <GraduationCap size={14} /> Academic Benchmark
                            </div>
                            <h1 className="text-4xl md:text-5xl font-display text-[var(--text)] tracking-tight">
                                {isPrintMode ? 'Printable' : 'Exam'} <span className="text-red-600">{isPrintMode ? 'Worksheet' : 'Simulation'}</span>
                            </h1>
                            <p className="text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
                                {isPrintMode 
                                    ? "Generate custom anlog worksheets to study away from a screen. Perfect for deep focus and manual ideation."
                                    : "High-pressure, closed-book tests to brutally expose your true level of mastery."}
                            </p>
                        </div>
                    </header>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-8 space-y-8">
                            <div className="premium-card rounded-3xl p-8 space-y-8">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-display text-[var(--text)] flex items-center gap-2">
                                            <Target size={20} className="text-red-500" /> 1. Knowledge Scope
                                        </h3>
                                        
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
                                                { id: 'weakest', label: `Weakest (${availableConcepts.filter(c => ['revisit', 'shaky'].includes(c.current_mastery)).length})` },
                                                { id: 'specific', label: 'Specific' },
                                                { id: 'category', label: 'Category' },
                                                { id: 'all', label: 'Everything' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => {
                                                        setVaultSubMode(opt.id as any);
                                                        if (opt.id === 'all') {
                                                            setSelectedConcepts(availableConcepts.map(c => c.id));
                                                        } else if (opt.id === 'weakest') {
                                                            setSelectedConcepts(availableConcepts.filter(c => ['revisit', 'shaky'].includes(c.current_mastery)).map(c => c.id));
                                                        } else {
                                                            setSelectedConcepts([]);
                                                        }
                                                    }}
                                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                                        vaultSubMode === opt.id 
                                                        ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' 
                                                        : 'bg-white border-[var(--border)] text-[var(--muted)] hover:border-red-100'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {setupMode === 'adhoc' ? (
                                        <div className="space-y-4 animate-fade-in-up">
                                            <p className="text-sm text-[var(--muted)]">Generate an exam from any topic or pasted content. No pre-existing nodes needed.</p>
                                            <textarea 
                                                value={adhocTopic}
                                                onChange={(e) => setAdhocTopic(e.target.value)}
                                                placeholder="What do you want to practice? (e.g. 'Photosynthesis', 'React Hooks', or paste an article...)"
                                                className="w-full h-32 p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all outline-none resize-none font-serif"
                                            />
                                            {availableConcepts.length === 0 && (
                                                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex gap-3">
                                                    <Zap size={16} className="text-orange-500 shrink-0 mt-0.5" />
                                                    <p className="text-[11px] text-orange-800 leading-relaxed font-medium">
                                                        You don&apos;t have any Vault concepts yet. Once you complete this exam, relevant concepts will be automatically extracted and added to your Vault.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-fade-in-up">
                                            {vaultSubMode === 'category' ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar p-1">
                                                    {categories.map(cat => {
                                                        const count = availableConcepts.filter(c => c.category_id === cat.id).length;
                                                        return (
                                                            <div 
                                                                key={cat.id}
                                                                onClick={() => {
                                                                    setSelectedCategoryId(cat.id);
                                                                    setSelectedConcepts(availableConcepts.filter(c => c.category_id === cat.id).map(c => c.id));
                                                                }}
                                                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                                                                    selectedCategoryId === cat.id 
                                                                    ? 'bg-red-50 border-red-200 ring-1 ring-red-100 shadow-sm' 
                                                                    : 'bg-white border-[var(--border)] hover:border-red-200'
                                                                }`}
                                                            >
                                                                <div className="space-y-1 text-left">
                                                                    <p className={`text-sm font-bold ${selectedCategoryId === cat.id ? 'text-red-900' : 'text-[var(--text)]'}`}>{cat.name}</p>
                                                                    <p className="text-[10px] font-bold text-[var(--muted)]">{count} concepts</p>
                                                                </div>
                                                                {selectedCategoryId === cat.id && <CheckCircle size={16} className="text-red-600" />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar p-1">
                                                    {availableConcepts
                                                        .filter(c => {
                                                            if (vaultSubMode === 'weakest') return ['revisit', 'shaky'].includes(c.current_mastery);
                                                            return true;
                                                        })
                                                        .map(c => (
                                                        <div 
                                                            key={c.id} 
                                                            onClick={() => {
                                                                if (selectedConcepts.includes(c.id)) setSelectedConcepts(selectedConcepts.filter(id => id !== c.id));
                                                                else setSelectedConcepts([...selectedConcepts, c.id]);
                                                            }}
                                                            className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                                                                selectedConcepts.includes(c.id) 
                                                                ? 'bg-red-50 border-red-200 ring-1 ring-red-100 shadow-sm' 
                                                                : 'bg-white border-[var(--border)] hover:border-red-200 hover:shadow-sm'
                                                            }`}
                                                        >
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                                                selectedConcepts.includes(c.id) ? 'bg-red-600 border-red-600 text-white' : 'border-[var(--border)] bg-white'
                                                            }`}>
                                                                {selectedConcepts.includes(c.id) && <CheckCircle size={12} strokeWidth={3} />}
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className={`text-sm font-bold ${selectedConcepts.includes(c.id) ? 'text-red-900' : 'text-[var(--text)]'}`}>{c.display_name}</p>
                                                                <p className={`text-[10px] font-bold uppercase tracking-wider ${
                                                                    ['revisit', 'shaky'].includes(c.current_mastery) ? 'text-red-600' : 'text-[var(--muted)]'
                                                                }`}>{c.current_mastery || c.current_mastery}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-8 border-t border-[var(--border)]">
                                    <h3 className="text-xl font-display text-[var(--text)] flex items-center gap-2">
                                        <Settings size={20} className="text-red-500" /> 2. Simulation Logic
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {['standard', 'problem_set', 'essay', 'case'].map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setFormat(f)}
                                                className={`py-3 px-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                                                    format === f 
                                                    ? 'bg-red-600 text-white border-red-600 shadow-md' 
                                                    : 'bg-white text-[var(--muted)] border-[var(--border)] hover:border-red-300'
                                                }`}
                                            >
                                                {f.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-4 space-y-6">
                            <div className="premium-card p-8 rounded-3xl bg-gradient-to-br from-red-50 to-white border-red-100 space-y-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-red-800">Complexity Density</label>
                                        <input 
                                             type="range" min="1" max="15" 
                                             value={questionCount} onChange={e => setQuestionCount(parseInt(e.target.value))}
                                             className="w-full accent-red-600"
                                        />
                                        <div className="flex justify-between text-[10px] font-bold text-red-700/60 uppercase">
                                            <span>Light</span>
                                            <span className="text-red-600 text-sm">{questionCount} Qs</span>
                                            <span>Intense</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-red-800">Temporal Constraint</label>
                                        <select 
                                             value={timeLimit} onChange={e => setTimeLimit(parseInt(e.target.value))}
                                             className="w-full bg-white border border-red-200 rounded-xl p-3 text-sm font-bold text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                        >
                                             <option value={0}>Free Execution (Untimed)</option>
                                             <option value={5}>Stress Test (5m)</option>
                                             <option value={15}>Brisk (15m)</option>
                                             <option value={30}>Standard (30m)</option>
                                             <option value={60}>Marathon (60m)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-red-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest">Energy Consumption</span>
                                        <span className="text-xs font-black text-red-600 flex items-center gap-1">
                                            <Zap size={14} className="fill-red-600" /> 1.0 Full
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleStartExam}
                                    disabled={isLoading || (setupMode === 'vault' && selectedConcepts.length === 0) || (setupMode === 'adhoc' && !adhocTopic.trim())}
                                    className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:opacity-30 shadow-xl shadow-red-600/20 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 hover:-translate-y-1 active:translate-y-0"
                                >
                                    {isLoading ? (
                                        <><RefreshCcw size={18} className="animate-spin" /> Sequencing...</>
                                    ) : (
                                        <>{isPrintMode ? <FileText size={18} /> : <Target size={18} />} {isPrintMode ? 'Generate Printable' : 'Initialize Benchmark'}</>
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
        const q = questions[currentQuestionIndex];
        return (
            <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-[var(--text)]">
                <SEO title={`Exam: Question ${currentQuestionIndex + 1} | Serify`} />
                
                {/* Fixed Header */}
                <header className="border-b border-[var(--border)] bg-white/80 backdrop-blur-md px-6 md:px-10 py-5 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex items-center gap-6">
                        <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/20">
                            <GraduationCap size={20} />
                        </div>
                        <div className="hidden md:block">
                            <h1 className="text-sm font-black uppercase tracking-widest text-[var(--text)]">Benchmark Simulation</h1>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--muted)]">
                                <span className="text-red-600">LIVE SESSION</span> • {questions.length} TOTAL QUESTIONS
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 md:gap-10">
                        {timeLimit > 0 && (
                            <div className={`flex items-center gap-3 font-display text-2xl md:text-3xl ${timeRemaining !== null && timeRemaining < 120 ? 'text-red-500 animate-pulse' : 'text-[var(--text)]'}`}>
                                <Clock size={24} className={timeRemaining !== null && timeRemaining < 120 ? 'text-red-500' : 'text-[var(--muted)]'} />
                                {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
                            </div>
                        )}
                        <button 
                            onClick={() => {
                                if (confirm("Are you sure you want to finish and grade your responses?")) {
                                    handleSubmitExam();
                                }
                            }}
                            className="px-6 md:px-8 py-3 bg-[var(--text)] hover:bg-black text-white text-sm font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Finalizing...' : 'Submit Benchmark'}
                        </button>
                    </div>
                </header>

                {/* Progress Strip */}
                <div className="h-1.5 w-full bg-[var(--border)] flex">
                    {questions.map((_, i) => (
                        <div 
                            key={i} 
                            className={`h-full flex-1 transition-all duration-500 ${
                                i === currentQuestionIndex ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 
                                questions[i].answer.trim() !== '' ? 'bg-[var(--accent)] opacity-40' : 'bg-transparent'
                            }`}
                        />
                    ))}
                </div>

                <main className="flex-grow max-w-5xl w-full mx-auto px-6 py-10 flex flex-col min-h-0">
                    <div className="flex-grow flex flex-col gap-8 lg:gap-12 min-h-0">
                        
                        {/* Question View */}
                        <div className="space-y-6 flex-shrink-0 animate-fade-in-up">
                            <div className="flex items-center gap-2">
                                <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-0.5 rounded border border-red-100 uppercase tracking-widest">
                                    Target identification {currentQuestionIndex + 1}
                                </span>
                            </div>
                            <div className="prose prose-slate max-w-none text-2xl md:text-3xl font-display text-[var(--text)] leading-tight italic">
                                <ReactMarkdown>{q?.text || ''}</ReactMarkdown>
                            </div>
                        </div>

                        {/* Answer Area */}
                        <div className="flex-grow flex flex-col min-h-0 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                            <textarea
                                value={q?.answer || ''}
                                onChange={(e) => handleAnswerChange(e.target.value)}
                                placeholder="Construct your technical explanation here..."
                                className="flex-grow bg-white border border-[var(--border)] rounded-3xl p-8 md:p-12 text-xl text-[var(--text)] placeholder-[#ccd4d3] resize-none focus:outline-none focus:ring-4 focus:ring-red-500/5 transition-all leading-relaxed font-serif shadow-sm overflow-y-auto custom-scrollbar"
                                autoFocus
                            />
                        </div>

                        {/* Footer Nav */}
                        <footer className="flex items-center justify-between pt-4 transition-all">
                            <button
                                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentQuestionIndex === 0}
                                className="px-6 py-3 flex items-center gap-2 text-sm font-bold text-[var(--muted)] hover:text-[var(--text)] transition-all disabled:opacity-0 active:scale-95"
                            >
                                <ChevronLeft size={20} /> PREVIOUS
                            </button>
                            
                            <div className="flex items-center gap-2 text-xs font-black text-[var(--muted)] uppercase tracking-[0.2em] font-mono">
                                {currentQuestionIndex + 1} <span className="opacity-30">/</span> {questions.length}
                            </div>

                            <button
                                onClick={() => {
                                    if (currentQuestionIndex === questions.length - 1) {
                                        if (confirm("You have reached the end. Submit current answers for grading?")) {
                                            handleSubmitExam();
                                        }
                                    } else {
                                        setCurrentQuestionIndex(prev => prev + 1);
                                    }
                                }}
                                className="px-10 py-3.5 bg-white border border-[var(--border)] hover:border-red-200 text-[var(--text)] hover:text-red-700 font-bold rounded-2xl transition-all flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95"
                            >
                                {currentQuestionIndex === questions.length - 1 ? 'FINISH' : 'NEXT'} <ChevronRight size={20} />
                            </button>
                        </footer>
                    </div>
                </main>
            </div>
        );
    }

    if (phase === 'report') {
       const isStrong = evaluationResult?.overallPerformance === 'strong';
       const isShaky = evaluationResult?.overallPerformance === 'shaky';
       
       return (
           <DashboardLayout>
                <SEO title="Benchmark Results | Serify" />
                <div className="max-w-5xl mx-auto px-4 py-12 space-y-12 animate-fade-in-up">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="space-y-2">
                             <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--bg)] border border-[var(--border)] rounded-full text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
                                 <History size={12} /> SESSION ID: {sessionId?.slice(-8).toUpperCase()}
                             </div>
                             <h1 className="text-5xl font-display text-[var(--text)] tracking-tight">Performance Summary</h1>
                        </div>
                        <button 
                            onClick={() => router.push('/practice')} 
                            className="px-10 py-4 bg-[var(--text)] text-white hover:bg-black font-bold rounded-2xl transition-all shadow-lg active:scale-95"
                        >
                            Return to Arena
                        </button>
                    </header>

                    {/* High Level Card */}
                    <div className={`premium-card rounded-3xl overflow-hidden border-2 ${
                        isStrong ? 'bg-green-50/30 border-green-100 shadow-green-600/[0.03]' : 
                        isShaky ? 'bg-red-50/30 border-red-100 shadow-red-600/[0.03]' : 
                        'bg-yellow-50/30 border-yellow-100 shadow-yellow-600/[0.03]'
                    }`}>
                        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-[var(--border)]">
                            <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden">
                                     <div className={`absolute inset-0 opacity-20 ${isStrong ? 'bg-green-600' : isShaky ? 'bg-red-600' : 'bg-yellow-600'}`} />
                                     {isStrong ? (
                                         <Award size={32} className="text-green-600" />
                                     ) : (
                                         <AlertTriangle size={32} className={isShaky ? 'text-red-600' : 'text-yellow-600'} />
                                     )}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Calculated Mastery</h3>
                                    <p className={`text-4xl font-display capitalize ${
                                        isStrong ? 'text-green-700' : isShaky ? 'text-red-700' : 'text-yellow-700'
                                    }`}>
                                        {evaluationResult?.overallPerformance}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 rounded-2xl bg-white border border-[var(--border)] flex items-center justify-center shadow-sm">
                                    <TrendingUp size={32} className="text-[var(--accent)]" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Questions Tracked</h3>
                                    <p className="text-4xl font-display text-[var(--text)]">
                                        {questions.length}
                                    </p>
                                </div>
                            </div>

                            <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 rounded-2xl bg-white border border-[var(--border)] flex items-center justify-center shadow-sm">
                                    <Clock size={32} className="text-[var(--muted)]" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Engagement</h3>
                                    <p className="text-4xl font-display text-[var(--text)]">
                                        {Math.floor((Date.now() - sessionStartTs) / 60000)}m
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Feed */}
                    <div className="space-y-8">
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-[var(--muted)] flex items-center gap-3">
                            <span className="h-px bg-[var(--border)] flex-grow" /> Granular Feedback <span className="h-px bg-[var(--border)] flex-grow" />
                        </h3>
                        <div className="space-y-6">
                            {questions.map((q, i) => {
                                const feedbackEntry = evaluationResult?.questionFeedback?.[i] || {};
                                const isItemStrong = feedbackEntry.score === 'strong';
                                const isItemWeak = feedbackEntry.score === 'shaky' || feedbackEntry.score === 'blank';
                                
                                return (
                                    <div key={q.id} className="premium-card rounded-3xl overflow-hidden group">
                                        <div className="p-8 md:p-10 space-y-8">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-4">
                                                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm ${
                                                         isItemStrong ? 'bg-green-600 text-white' : isItemWeak ? 'bg-red-600 text-white' : 'bg-yellow-500 text-white'
                                                     }`}>
                                                         {i + 1}
                                                     </div>
                                                     <p className="text-xl font-display text-[var(--text)] italic leading-tight">&ldquo;{q.text}&rdquo;</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                                <div className="space-y-3">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Construction Provided</h4>
                                                    <div className="bg-[var(--bg)] p-6 rounded-2xl border border-[var(--border)] text-sm font-serif italic text-[var(--muted)] leading-relaxed min-h-[100px]">
                                                        {q.answer || <span className="text-red-400">NO RESPONSE CAPTURED</span>}
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${
                                                        isItemStrong ? 'text-green-700' : isItemWeak ? 'text-red-700' : 'text-yellow-700'
                                                    }`}>Analysis Result</h4>
                                                    <div className={`p-6 rounded-2xl border leading-relaxed font-sans text-sm ${
                                                        isItemStrong ? 'bg-green-50 border-green-100 text-green-900' :
                                                        isItemWeak ? 'bg-red-50 border-red-100 text-red-900' :
                                                        'bg-yellow-50 border-yellow-100 text-yellow-900'
                                                    }`}>
                                                        <span className="block font-black text-[10px] uppercase mb-2 tracking-widest opacity-60">Grade: {feedbackEntry.score}</span>
                                                        <ReactMarkdown>{feedbackEntry.feedback}</ReactMarkdown>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
           </DashboardLayout>
       );
    }

    if (phase === 'printable') {
        return (
            <div className="min-h-screen bg-white p-8 md:p-16 max-w-4xl mx-auto print:m-0 print:p-8">
                <SEO title={`Printable: ${adhocTopic || 'Custom Exam'} | Serify`} />
                <div className="flex items-center justify-between mb-12 border-b-2 border-black pb-8">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-display text-black tracking-tight">{adhocTopic || 'Knowledge Benchmark'}</h1>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Serify Assessment Lab • Generated {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Session ID</div>
                        <div className="text-sm font-mono font-bold text-slate-950">{sessionId?.slice(-8).toUpperCase()}</div>
                    </div>
                </div>

                <div className="space-y-12">
                    {questions.map((q, i) => (
                        <div key={q.id} className="space-y-4 break-inside-avoid">
                            <div className="flex gap-4">
                                <span className="text-lg font-black text-slate-900">{i + 1}.</span>
                                <div className="space-y-4 flex-1">
                                    <h3 className="text-xl font-display leading-relaxed text-black italic">
                                        <ReactMarkdown>{q.text}</ReactMarkdown>
                                    </h3>
                                    <div className="h-64 w-full border border-slate-200 rounded-lg relative overflow-hidden bg-slate-50/30">
                                         <div className="absolute top-0 left-0 w-full h-full opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '100% 2rem' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <footer className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-end">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        End of Assessment • Serify Learning Engine
                    </div>
                    <button 
                        onClick={() => setPhase('setup')} 
                        className="print:hidden px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold rounded-lg transition-all"
                    >
                        Back to Configuration
                    </button>
                </footer>
            </div>
        );
    }

    return null;
}
