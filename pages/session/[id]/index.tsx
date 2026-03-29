import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Pause, X, CheckCircle2, Circle, Zap, ChevronLeft } from 'lucide-react';
import { UsageGate } from '@/components/billing/UsageEnforcement';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import VoiceSynthesis from '@/components/shared/VoiceSynthesis';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

const DEMO_CONCEPTS = [
    { id: 'c1', name: 'Self-Attention Mechanism', answered: true },
    { id: 'c2', name: 'Positional Encoding', answered: false },
    { id: 'c3', name: 'Multi-Head Attention', answered: false },
    { id: 'c4', name: 'Key, Query, Value Vectors', answered: false }
];

const DEMO_QUESTIONS = [
    {
        id: 'q1',
        type: 'RETRIEVAL',
        target_concept_id: 'c1',
        text: 'Explain the core difference between self-attention and traditional recurrent networks when processing a sequence of text.'
    },
    {
        id: 'q2',
        type: 'MISCONCEPTION PROBE',
        target_concept_id: 'c2',
        text: 'If transformers process all words simultaneously, how do they understand the difference between "The cat ate the mouse" and "The mouse ate the cat"?'
    },
    {
        id: 'q3',
        type: 'APPLICATION',
        target_concept_id: 'c3',
        text: 'Imagine you are designing a transformer to translate English to French. Why might you want multiple "heads" of attention rather than just one large attention mechanism?'
    }
];

export default function ActiveSession() {
    const router = useRouter();
    const { id } = router.query;
    const { user, token } = useAuth();

    const [sessionData, setSessionData] = useState<any>(null);
    const [concepts, setConcepts] = useState<any[]>([]);
    const [questions, setQuestions] = useState<any[]>([]);
    const [title, setTitle] = useState('');

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [confidenceScore, setConfidenceScore] = useState<number>(3);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
    const [assessments, setAssessments] = useState<any[]>([]);

    const [explanations, setExplanations] = useState<
        Record<string, { requesting: boolean; text: string | null }>
    >({});

    const [elapsedTime, setElapsedTime] = useState(0);
    const [showFeedback, setShowFeedback] = useState(false);
    const [currentAssessment, setCurrentAssessment] = useState<any>(null);

    const [skippingId, setSkippingId] = useState<string | null>(null);

    const [isFirstSession, setIsFirstSession] = useState(false);
    const [showGuidance1, setShowGuidance1] = useState(false);
    const [showGuidance2, setShowGuidance2] = useState(false);
    const [isUsageLimitModalOpen, setIsUsageLimitModalOpen] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const confidenceRef = useRef<HTMLDivElement>(null);
    const [hasScrolledToConfidence, setHasScrolledToConfidence] = useState(false);
    const guidanceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const analysisPromises = useRef<Promise<any>[]>([]);

    useEffect(() => {
        const history = storage.getHistory();
        if (history.length <= 1) {
            
            setIsFirstSession(true);
            const dismissed = localStorage.getItem('serify_guidance_dismissed');
            if (!dismissed) {
                setShowGuidance1(true);
            }
        }
    }, []);

    const dismissGuidance1 = async () => {
        setShowGuidance1(false);
        localStorage.setItem('serify_guidance_dismissed', 'true');
        if (user) {
            await supabase
                .from('profiles')
                .update({ guidance_answer_dismissed: true })
                .eq('id', user.id);
        }
    };

    useEffect(() => {
        const handleBrowseAway = (url: string) => {
            if (currentIndex < questions.length && !isAnalyzing && questions.length > 0 && !showFeedback) {
                if (!window.confirm('Are you sure you want to leave? Your progress for the current question will be lost.')) {
                    router.events.emit('routeChangeError');
                    throw 'routeChange aborted.';
                }
            }
        };
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (currentIndex < questions.length && !isAnalyzing && questions.length > 0 && !showFeedback) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        router.events.on('routeChangeStart', handleBrowseAway);
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            router.events.off('routeChangeStart', handleBrowseAway);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [currentIndex, questions.length, isAnalyzing, router, showFeedback]);

    useEffect(() => {
        if (answer.trim() && !hasScrolledToConfidence && confidenceRef.current) {
            confidenceRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHasScrolledToConfidence(true);
        } else if (!answer.trim()) {
            setHasScrolledToConfidence(false);
        }
    }, [answer, hasScrolledToConfidence]);

    useEffect(() => {
        if (isFirstSession && currentIndex === 0 && !isAnalyzing && answer.length < 10) {
            guidanceTimerRef.current = setTimeout(() => {
                setShowGuidance2(true);
            }, 90000); 
        } else {
            if (guidanceTimerRef.current) clearTimeout(guidanceTimerRef.current);
            setShowGuidance2(false);
        }
        return () => {
            if (guidanceTimerRef.current) clearTimeout(guidanceTimerRef.current);
        };
    }, [isFirstSession, currentIndex, answer, isAnalyzing]);

    useEffect(() => {
        if (isAnalyzing || isPaused || showFeedback) return;
        const interval = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isAnalyzing, isPaused, showFeedback]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSaveAndExit = async () => {
        setIsAnalyzing(true);
        try {
            const resolvedAssessments = await Promise.all(analysisPromises.current);
            const allAssessments = [...assessments, ...resolvedAssessments];

            if (sessionData) {
                const updatedData = {
                    ...sessionData,
                    currentIndex,
                    assessments: allAssessments
                };
                localStorage.setItem('serify_active_session', JSON.stringify(updatedData));
            }
            router.push('/');
        } catch (e) {
            console.error(e);
            alert('Failed to pause safely. Please try again.');
            setIsAnalyzing(false);
            setIsPaused(false);
        }
    };

    const handleAbandon = () => {
        if (confirm('Are you sure you want to abandon this session? All progress will be lost.')) {
            localStorage.removeItem('serify_active_session');
            storage.removeSession(id as string);
            router.push('/');
        }
    };

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadSession = async () => {
            if (!id || id === 'undefined') {
                if (id === 'undefined') {
                    if (isMounted) {
                        setError('Invalid session ID. Please start a new session.');
                        setLoading(false);
                    }
                }
                return;
            }
            if (isMounted) {
                setLoading(true);
                setError(null);
            }

            
            const stored = localStorage.getItem('serify_active_session');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.id === id) {
                        if (isMounted) {
                            setSessionData(parsed);
                            setConcepts(parsed.concepts || []);
                            setQuestions(parsed.questions || []);
                            setTitle(parsed.title || 'New Session');
                            if (parsed.currentIndex) setCurrentIndex(parsed.currentIndex);
                            if (parsed.assessments) setAssessments(parsed.assessments);
                        }

                        
                        if (parsed.concepts?.length > 0 && (!parsed.questions || parsed.questions.length === 0)) {
                            generateMissingQuestions(id as string);
                        } else {
                            if (isMounted) setLoading(false);
                        }
                        return;
                    }
                } catch (e) {
                    console.error('Failed to parse session data', e);
                }
            }

            
            try {
                const res = await fetch(`/api/sessions/${id}`, {
                    headers: {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    }
                });

                if (!res.ok) throw new Error('Session not found');
                const data = await res.json();

                const sessionData = {
                    id: data.id,
                    title: data.title || 'Untitled Session',
                    concepts: data.concepts || [],
                    questions: data.questions || [],
                    type: data.contentType || 'Session',
                    status: data.status
                };

                if (isMounted) {
                    setSessionData(sessionData);
                    setConcepts(sessionData.concepts);
                    setQuestions(sessionData.questions);
                    setTitle(sessionData.title);
                }

                
                localStorage.setItem('serify_active_session', JSON.stringify(sessionData));

                
                if (sessionData.concepts.length > 0 && sessionData.questions.length === 0) {
                    generateMissingQuestions(id as string);
                } else if (sessionData.concepts.length === 0 && sessionData.status === 'processing') {
                    
                    if (isMounted) {
                        setTimeout(loadSession, 3000);
                    }
                } else {
                    if (isMounted) setLoading(false);
                }
            } catch (err: unknown) {
                console.error('Failed to load session from DB', err);
                if (isMounted) {
                    setError('Could not load this session. It may have expired or was deleted.');
                    setLoading(false);
                }
            }
        };

        const generateMissingQuestions = async (sid: string) => {
            try {
                const { data: { session: authSession } } = await supabase.auth.getSession();
                const token = authSession?.access_token;

                const res = await fetch(`/api/serify/assess?sessionId=${sid}`, {
                    headers: {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    }
                });

                if (res.ok) {
                    const { questions: newQuestions } = await res.json();
                    if (newQuestions && newQuestions.length > 0 && isMounted) {
                        setQuestions(newQuestions);
                        
                        const stored = localStorage.getItem('serify_active_session');
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            if (parsed.id === sid) {
                                localStorage.setItem('serify_active_session', JSON.stringify({
                                    ...parsed,
                                    questions: newQuestions
                                }));
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to generate missing questions', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadSession();

        return () => { isMounted = false; };
    }, [id, token]);

    useEffect(() => {
        if (sessionData && (currentIndex > 0 || assessments.length > 0)) {
            const updatedData = { ...sessionData, currentIndex, assessments };
            localStorage.setItem('serify_active_session', JSON.stringify(updatedData));
        }
    }, [currentIndex, assessments, sessionData]);

    const loadingMessages = isFirstSession
        ? ['Reading your answers carefully...']
        : [
            'Analyzing your responses...',
            'Mapping your understanding...',
            'Identifying gaps...',
            'Building your feedback report...'
        ];

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isAnalyzing) {
            interval = setInterval(() => {
                setLoadingMsgIdx((prev) => (prev + 1) % loadingMessages.length);
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isAnalyzing, loadingMessages.length]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin"></div>
                    <p className="text-[var(--muted)] text-sm animate-pulse">Preparing session...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center shadow-lg">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <X size={32} />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Session Unavailable</h1>
                    <p className="text-[var(--muted)] mb-8">{error}</p>
                    <Link href="/" className="inline-block bg-[var(--accent)] text-white font-bold py-3 px-8 rounded-xl hover:bg-[var(--accent)]/90 transition-all">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];

    const handleSubmit = async (isSkip: boolean = false) => {
        if (!isSkip && !answer.trim()) return;

        const currentAnswer = isSkip ? '' : answer;
        const currentQ = currentQuestion;
        if (!currentQ) return;

        const currentConcept = concepts.find((c) => c.id === currentQ.target_concept_id) || {
            name: 'Concept',
            definition: ''
        };

        setIsAnalyzing(true);
        const explanationRequested = !!explanations[currentQ.id]?.text;

        const {
            data: { session }
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        const isDemo = router.query.demo === 'true';

        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(!token && isDemo ? { 'x-serify-demo': 'true' } : {})
        };

        try {
            const res = await fetch('/api/serify/analyze-answer', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    answerText: currentAnswer,
                    question: currentQ,
                    concept: currentConcept,
                    explanationRequested,
                    skipped: isSkip,
                    confidenceScore: isSkip ? null : confidenceScore
                })
            });

            if (res.status === 429) {
                setIsUsageLimitModalOpen(true);
                setIsAnalyzing(false);
                return;
            }

            if (!res.ok) throw new Error('Analysis failed');
            
            const { assessment } = await res.json();
            const fullAssessment = {
                ...assessment,
                question_id: currentQ.id,
                concept_id: currentConcept.id,
                explanation_requested: explanationRequested,
                skipped: isSkip
            };

            setCurrentAssessment(fullAssessment);
            setAssessments(prev => [...prev, fullAssessment]);
            setShowFeedback(true);
            setIsAnalyzing(false);
            
            // Clear current inputs
            setAnswer('');
            setConfidenceScore(3);
            setSkippingId(null);

        } catch (error) {
            console.error(error);
            alert('Failed to analyze. Please try again.');
            setIsAnalyzing(false);
        }
    };

    const handleNext = async () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            setShowFeedback(false);
            setCurrentAssessment(null);
            setHasScrolledToConfidence(false);
        } else {
            finishSession();
        }
    };

    const finishSession = async () => {
        setIsAnalyzing(true);
        try {
            localStorage.setItem(
                'serify_feedback_report',
                JSON.stringify({
                    title,
                    isBasicMode: sessionData?.isBasicMode,
                    report: null, 
                    concepts,
                    assessments: assessments
                })
            );

            storage.saveSession({
                id: id as string,
                title,
                type: sessionData?.type || 'Session',
                date: new Date().toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                }),
                last_activity: new Date().toISOString(),
                status: 'Completed',
                result: 'Default'
            });

            router.push(`/session/${id}/feedback`);
        } catch (error) {
            console.error(error);
            alert('Failed to complete session. Progress was saved locally.');
            setIsAnalyzing(false);
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'RETRIEVAL':
                return 'text-[var(--accent)] bg-[var(--accent-light)]';
            case 'APPLICATION':
                return 'text-[var(--shallow)] bg-[var(--shallow-light)]';
            case 'MISCONCEPTION PROBE':
                return 'text-[var(--missing)] bg-[var(--missing-light)]';
            default:
                return 'text-[var(--muted)] bg-black/5';
        }
    };

    const requestExplanation = async () => {
        if (!currentQuestion) return;

        const qId = currentQuestion.id;
        const currentConcept = concepts.find((c) => c.id === currentQuestion.target_concept_id) || {
            name: 'Concept',
            definition: ''
        };

        setExplanations((prev) => ({
            ...prev,
            [qId]: { requesting: true, text: null }
        }));

        const {
            data: { session }
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        const isDemo = router.query.demo === 'true';

        try {
            const res = await fetch('/api/explain-concept', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...(!token && isDemo ? { 'x-serify-demo': 'true' } : {})
                },
                body: JSON.stringify({
                    question: currentQuestion,
                    concept: currentConcept
                })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data.error === 'limit_reached') {
                    setIsUsageLimitModalOpen(true);
                    setExplanations((prev) => ({
                        ...prev,
                        [qId]: { requesting: false, text: null }
                    }));
                    return;
                }
                throw new Error('Failed to fetch explanation');
            }

            const data = await res.json();

            setExplanations((prev) => ({
                ...prev,
                [qId]: { requesting: false, text: data.explanation }
            }));
        } catch (error) {
            console.error(error);
            setExplanations((prev) => ({
                ...prev,
                [qId]: { requesting: false, text: 'Failed to load explanation. Please try again.' }
            }));
        }
    };

    if (isAnalyzing && currentIndex >= questions.length - 1 && answer === '') {
        const remainingConceptsCount = concepts.length - questions.length;
        return (
            <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center font-sans">
                <Head>
                    <title>Analyzing | Serify</title>
                </Head>
                <div className="text-center animate-fade-in flex flex-col items-center px-4">
                    <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin mb-6"></div>
                    <p className="text-xl font-medium animate-pulse mb-2">
                        {loadingMessages[loadingMsgIdx]}
                    </p>
                    {isFirstSession && (
                        <p
                            className="text-lg text-[var(--accent)] font-medium animate-fade-in"
                            style={{ animationDelay: '1.5s', animationFillMode: 'both' }}
                        >
                            This is where Serify earns it.
                        </p>
                    )}
                    {remainingConceptsCount > 0 && !isFirstSession && (
                        <p
                            className="text-sm text-[var(--muted)] mt-6 max-w-sm animate-fade-in"
                            style={{ animationDelay: '2s', animationFillMode: 'both' }}
                        >
                            We focused on {questions.length} core concepts. <br />
                            The remaining {remainingConceptsCount} concepts are being saved to your
                            Vault for future practice.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (!currentQuestion) {
        return (
            <DashboardLayout replaceNav={true} backLink="/">
                <div className="flex-1 flex items-center justify-center p-6 min-h-[80vh]">
                    <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center shadow-lg animate-fade-in-up">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 size={32} />
                        </div>
                        <h1 className="text-2xl font-bold mb-2 text-[var(--text)]">Session Completed</h1>
                        <p className="text-[var(--muted)] mb-8">You&apos;ve completed all questions in this session.</p>
                        <Link href="/" className="inline-block bg-[var(--accent)] text-white font-bold py-3.5 px-10 rounded-xl hover:bg-[var(--accent)]/90 shadow-md shadow-[var(--accent)]/20 hover:-translate-y-0.5 transition-all">
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            replaceNav={true}
            backLink="/"
            sidebarContent={
                <div className="flex flex-col h-full">
                    <div className="px-4 py-6 border-b border-[var(--border)]/50">
                        <div className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-widest mb-2 opacity-50">
                            Session Map
                        </div>
                        <h2 className="text-base font-bold leading-tight text-[var(--text)] line-clamp-2">
                            {title}
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {concepts.map((concept, idx) => {
                            const qIdx = questions.findIndex(q => q.target_concept_id === concept.id);
                            const isAnswered = qIdx !== -1 && qIdx < currentIndex;
                            const isCurrent = questions[currentIndex]?.target_concept_id === concept.id;
                            const assessment = assessments.find(a => a.concept_id === concept.id);
                            const isSkipped = assessment?.skipped;

                            return (
                                <div
                                    key={concept.id || idx}
                                    className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${isCurrent ? 'bg-[var(--accent)]/5 border border-[var(--accent)]/20 shadow-sm' : ''
                                        }`}
                                >
                                    <div className="mt-0.5 shrink-0">
                                        {isAnswered ? (
                                            isSkipped ? (
                                                <X size={14} className="text-orange-400" />
                                            ) : (
                                                <CheckCircle2 size={14} className="text-emerald-500" />
                                            )
                                        ) : isCurrent ? (
                                            <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--accent)] flex items-center justify-center animate-pulse">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                                            </div>
                                        ) : (
                                            <Circle size={14} className="text-[var(--border)]" />
                                        )}
                                    </div>
                                    <span className={`text-xs leading-snug ${isAnswered ? 'text-[var(--text)] opacity-40 line-through' :
                                        isCurrent ? 'text-[var(--accent)] font-bold' :
                                            'text-[var(--muted)] font-medium'
                                        }`}>
                                        {concept.name}
                                        {isAnswered && isSkipped && <span className="ml-2 text-[10px] font-bold text-orange-400/60 uppercase tracking-tighter">(Skipped)</span>}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-auto pt-6 px-4 pb-4">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center gap-3 w-full p-2.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 rounded-xl transition-all group"
                        >
                            <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded-md border border-[var(--border)] group-hover:bg-white transition-all">
                                <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                            </div>
                            Exit to Dashboard
                        </button>
                    </div>
                </div>
            }
        >
            <Head>
                <title>{title ? `${title} | Serify` : 'Session | Serify'}</title>
            </Head>

            <div className="flex-1 flex flex-col min-h-full relative overflow-hidden">
                {}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--accent)]/5 rounded-full blur-[100px] -mr-64 -mt-64 pointer-events-none" />

                <div className="sticky top-0 z-10 w-full bg-[var(--bg)]/80 backdrop-blur-md border-b border-[var(--border)]/50">
                    <div className="h-1 w-full bg-[var(--border)] overflow-hidden">
                        <div 
                            className="h-full bg-[var(--accent)] transition-all duration-500 shadow-[0_0_8px_var(--accent)]"
                            style={{ width: `${((currentIndex + (showFeedback ? 1 : 0)) / questions.length) * 100}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between px-6 py-4 md:px-8">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={handleAbandon}
                                className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center bg-[var(--surface)] hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest">
                                        Question {currentIndex + 1} of {questions.length}
                                    </span>
                                    <div className="w-1 h-1 rounded-full bg-[var(--border)]" />
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--muted)]">
                                        <Pause size={10} /> {formatTime(elapsedTime)}
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-[var(--text)] truncate max-w-[200px]">{title}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsPaused(true)}
                                disabled={isAnalyzing}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] border border-transparent hover:border-[var(--border)] transition-all disabled:opacity-50"
                            >
                                <Pause size={14} /> <span className="hidden sm:inline">Pause</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full px-6 py-12 md:py-20 relative z-0">
                        {showFeedback ? (
                            <div className="w-full animate-fade-in space-y-8">
                                <div className="p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-xl relative overflow-hidden">
                                     <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-2xl text-[10px] font-bold uppercase tracking-widest ${
                                        currentAssessment?.depthScore >= 70 ? 'bg-emerald-500 text-white' : 
                                        currentAssessment?.depthScore >= 40 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                                    }`}>
                                        Mastery: {currentAssessment?.depthScore}%
                                    </div>

                                    <div className="flex items-center gap-3 mb-6">
                                        {currentAssessment?.depthScore >= 70 ? (
                                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                <CheckCircle2 size={24} />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                <Zap size={24} />
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="text-xl font-bold">Quick Feedback</h3>
                                            <p className="text-sm text-[var(--muted)]">Based on your last answer</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--border)]">
                                            <h4 className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-3">AI Analysis</h4>
                                            <p className="text-[var(--text)] leading-relaxed italic">
                                                &quot;{currentAssessment?.feedbackText || "Analysis complete."}&quot;
                                            </p>
                                        </div>

                                        {currentAssessment?.strengths?.length > 0 && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                                    <h5 className="text-[10px] font-bold text-emerald-600 uppercase mb-2">Strengths</h5>
                                                    <ul className="space-y-1">
                                                        {currentAssessment.strengths.map((s: string, i: number) => (
                                                            <li key={i} className="text-xs flex items-center gap-2">
                                                                <div className="w-1 h-1 rounded-full bg-emerald-500" /> {s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                {currentAssessment?.gaps?.length > 0 && (
                                                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                                        <h5 className="text-[10px] font-bold text-amber-600 uppercase mb-2">Areas to refine</h5>
                                                        <ul className="space-y-1">
                                                            {currentAssessment.gaps.map((g: string, i: number) => (
                                                                <li key={i} className="text-xs flex items-center gap-2">
                                                                    <div className="w-1 h-1 rounded-full bg-amber-500" /> {g}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-center">
                                    <button
                                        onClick={handleNext}
                                        className="inline-flex items-center gap-3 px-10 py-4 bg-[var(--accent)] text-white rounded-2xl font-bold shadow-lg shadow-[var(--accent)]/20 hover:-translate-y-1 transition-all"
                                    >
                                        {currentIndex === questions.length - 1 ? 'Finish Session' : 'Continue to Next Question \u2192'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full animate-slide-up" key={currentQuestion.id || currentIndex}>
                                {isFirstSession && currentIndex === 0 && showGuidance1 && (
                                    <div className="mb-8 p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm relative animate-fade-in group transition-all">
                                        <button
                                            onClick={dismissGuidance1}
                                            className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                        <div className="flex items-center gap-2 text-sm font-bold text-[var(--accent)] mb-3">
                                            <Zap size={16} /> Answer in your own words
                                        </div>
                                        <p className="text-[var(--text)] text-sm leading-relaxed max-w-[90%]">
                                            There&apos;s no right or wrong format. Write as much or as
                                            little as you naturally would. The quality of your feedback
                                            depends on the quality of your answer.
                                        </p>
                                    </div>
                                )}

                                <div className="group relative inline-block mb-6">
                                    <div
                                        className={`inline-flex items-center px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${getTypeColor(currentQuestion.type)} cursor-help`}
                                    >
                                        {currentQuestion.type}
                                    </div>
                                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl text-[10px] text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                        {currentQuestion.type === 'RETRIEVAL' && 'Tests your ability to recall information directly from the source.'}
                                        {currentQuestion.type === 'APPLICATION' && 'Tests if you can apply the concept to a new scenario.'}
                                        {currentQuestion.type === 'MISCONCEPTION PROBE' && 'Targets common misunderstandings to ensure deep clarity.'}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-6 mb-8">
                                    <h1 className="text-3xl md:text-4xl font-display leading-[1.3] text-[var(--text)]">
                                        {currentQuestion.text}
                                    </h1>
                                    <VoiceSynthesis text={currentQuestion.text} />
                                </div>

                                {explanations[currentQuestion.id]?.text ? (
                                    <div className="mb-8 p-5 rounded-2xl bg-[var(--accent-light)] border border-[var(--accent)]/20 animate-fade-in relative">
                                        <span className="absolute -top-3 left-6 px-3 py-0.5 bg-[var(--bg)] border border-[var(--accent)]/20 text-[11px] font-bold tracking-wider uppercase text-[var(--accent)] rounded-full">
                                            Concept Hint
                                        </span>
                                        <div className="space-y-4">
                                            <div className="text-[var(--text)] leading-relaxed text-[15px]">
                                                {explanations[currentQuestion.id]
                                                    .text!.split('\n')
                                                    .map((line, i) => (
                                                        <span key={i}>
                                                            {line}
                                                            {i <
                                                                explanations[currentQuestion.id].text!.split(
                                                                    '\n'
                                                                ).length -
                                                                1 && <br />}
                                                        </span>
                                                    ))}
                                            </div>
                                            <VoiceSynthesis text={explanations[currentQuestion.id].text!} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-8 flex justify-start">
                                        <button
                                            onClick={requestExplanation}
                                            disabled={explanations[currentQuestion.id]?.requesting}
                                            className="flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
                                        >
                                            <span className="w-5 h-5 flex items-center justify-center rounded-full border border-current text-xs">
                                                ?
                                            </span>
                                            {explanations[currentQuestion.id]?.requesting
                                                ? 'Loading hint...'
                                                : 'Explain this concept'}
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    <textarea
                                        value={answer}
                                        onChange={(e) => setAnswer(e.target.value)}
                                        disabled={isAnalyzing || skippingId === currentQuestion.id}
                                        placeholder="Write your answer here — use your own words."
                                        autoFocus
                                        className="w-full min-h-[160px] p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-lg outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all resize-y shadow-sm disabled:opacity-50"
                                    />

                                    {answer.trim() && skippingId !== currentQuestion.id && (
                                        <div ref={confidenceRef} className="space-y-3 animate-fade-in p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm focus-within:ring-2 ring-[var(--accent)]/20">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-bold text-[var(--text)]">Confidence Level</label>
                                                <span className="text-[10px] font-bold px-2 py-1 rounded bg-[var(--accent)] text-white uppercase tracking-wider">
                                                    {confidenceScore === 1 ? 'Wild Guess' : 
                                                     confidenceScore === 2 ? 'Unsure' : 
                                                     confidenceScore === 3 ? 'Moderate' : 
                                                     confidenceScore === 4 ? 'Confident' : 
                                                     'Total Mastery'}
                                                </span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="1" max="5" step="1" 
                                                value={confidenceScore} 
                                                onChange={(e) => setConfidenceScore(parseInt(e.target.value))} 
                                                className="w-full accent-[var(--accent)] cursor-pointer h-2 bg-[var(--border)] rounded-lg appearance-none"
                                                disabled={isAnalyzing}
                                            />
                                            <div className="flex justify-between text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest px-1">
                                                <span>Shaky</span>
                                                <span>Solid</span>
                                            </div>
                                        </div>
                                    )}

                                    {showGuidance2 &&
                                        currentIndex === 0 &&
                                        answer.length < 10 &&
                                        skippingId !== currentQuestion.id && (
                                            <div className="text-sm text-[var(--muted)] mt-3 animate-fade-in font-medium italic mb-2">
                                                Even a partial answer helps. Write what you know.
                                            </div>
                                        )}

                                    {skippingId === currentQuestion.id ? (
                                        <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 animate-fade-in flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <p className="text-orange-900 text-sm font-medium">
                                                Try writing anything, even partial — it helps Serify
                                                understand where the gap is.
                                            </p>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <button
                                                    onClick={() => setSkippingId(null)}
                                                    className="px-4 py-2 text-sm font-bold text-orange-900 bg-orange-200/50 hover:bg-orange-200 rounded-lg transition-colors"
                                                >
                                                    Try Anyway
                                                </button>
                                                <button
                                                    onClick={() => handleSubmit(true)}
                                                    className="px-4 py-2 text-sm font-medium text-orange-700 hover:text-orange-900 opacity-80 hover:opacity-100 transition-colors"
                                                >
                                                    Skip This One
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-[var(--muted)] font-bold uppercase tracking-widest">
                                                {currentIndex + 1} / {questions.length}
                                            </span>

                                            <div className="flex items-center gap-4 flex-row-reverse">
                                                <button
                                                    onClick={() => handleSubmit(false)}
                                                    disabled={!answer.trim() || isAnalyzing}
                                                    className={`px-8 py-3.5 rounded-xl font-bold transition-all flex items-center gap-2 ${answer.trim() && !isAnalyzing ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-lg shadow-[var(--accent)]/20 hover:-translate-y-0.5' : 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed opacity-50'}`}
                                                >
                                                    {isAnalyzing ? (
                                                        <>
                                                            <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                                            Analyzing...
                                                        </>
                                                    ) : (
                                                        <>Submit Answer & Review</>
                                                    )}
                                                </button>

                                                {!answer.trim() && !isAnalyzing && (
                                                    <button
                                                        onClick={() => setSkippingId(currentQuestion.id)}
                                                        className="text-xs font-bold text-[var(--muted)] hover:text-[var(--text)] transition-colors opacity-70 hover:opacity-100 uppercase tracking-widest"
                                                    >
                                                        I don&apos;t know
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        </div>
                    </div>

            {isPaused && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-scale-in text-center relative">
                        <div className="w-16 h-16 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <Pause size={28} className="text-[var(--text)] opacity-80" />
                        </div>
                        <h3 className="text-xl font-display mb-3">Session Paused</h3>
                        <p className="text-sm text-[var(--muted)] mb-8 leading-relaxed">Take a breather. Your progress is saved automatically. You can resume exactly where you left off from your dashboard.</p>
                        <div className="space-y-3">
                            <button onClick={() => setIsPaused(false)} className="w-full py-3.5 bg-[var(--accent)] text-white rounded-xl font-bold hover:bg-[var(--accent)]/90 transition-all shadow-md shadow-[var(--accent)]/20 hover:-translate-y-0.5">
                                Resume Session
                            </button>
                            <button onClick={handleSaveAndExit} className="w-full py-3.5 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl font-bold hover:bg-[var(--surface)] transition-all text-sm group">
                                <span className="opacity-80 group-hover:opacity-100 transition-opacity">Save & Exit to Dashboard</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <UsageGate
                feature='ai_message_tier1'
                forceShow={isUsageLimitModalOpen}
                onClose={() => setIsUsageLimitModalOpen(false)}
            />
        </DashboardLayout>
    );
}
