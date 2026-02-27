import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Pause, X, CheckCircle2, Circle, Zap } from 'lucide-react';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

const DEMO_CONCEPTS = [
    { id: 'c1', name: 'Self-Attention Mechanism', answered: true },
    { id: 'c2', name: 'Positional Encoding', answered: false },
    { id: 'c3', name: 'Multi-Head Attention', answered: false },
    { id: 'c4', name: 'Key, Query, Value Vectors', answered: false },
];

const DEMO_QUESTIONS = [
    {
        id: 'q1',
        type: 'RETRIEVAL',
        target_concept_id: 'c1',
        text: 'Explain the core difference between self-attention and traditional recurrent networks when processing a sequence of text.',
    },
    {
        id: 'q2',
        type: 'MISCONCEPTION PROBE',
        target_concept_id: 'c2',
        text: 'If transformers process all words simultaneously, how do they understand the difference between "The cat ate the mouse" and "The mouse ate the cat"?',
    },
    {
        id: 'q3',
        type: 'APPLICATION',
        target_concept_id: 'c3',
        text: 'Imagine you are designing a transformer to translate English to French. Why might you want multiple "heads" of attention rather than just one large attention mechanism?',
    }
];

export default function ActiveSession() {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();

    const [sessionData, setSessionData] = useState<any>(null);
    const [concepts, setConcepts] = useState<any[]>(DEMO_CONCEPTS);
    const [questions, setQuestions] = useState<any[]>(DEMO_QUESTIONS);
    const [title, setTitle] = useState("How Transformer Models Work");

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
    const [assessments, setAssessments] = useState<any[]>([]);

    const [explanations, setExplanations] = useState<Record<string, { requesting: boolean; text: string | null }>>({});

    const [skippingId, setSkippingId] = useState<string | null>(null);

    const [isFirstSession, setIsFirstSession] = useState(false);
    const [showGuidance1, setShowGuidance1] = useState(false);
    const [showGuidance2, setShowGuidance2] = useState(false);
    const guidanceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const analysisPromises = useRef<Promise<any>[]>([]);

    useEffect(() => {
        const history = storage.getHistory();
        if (history.length <= 1) { // It could be 1, or 0 if somehow not saved yet
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
            await supabase.from('profiles').update({ guidance_answer_dismissed: true }).eq('id', user.id);
        }
    };

    useEffect(() => {
        if (isFirstSession && currentIndex === 0 && !isAnalyzing && answer.length < 10) {
            guidanceTimerRef.current = setTimeout(() => {
                setShowGuidance2(true);
            }, 90000); // 90 seconds
        } else {
            if (guidanceTimerRef.current) clearTimeout(guidanceTimerRef.current);
            setShowGuidance2(false);
        }
        return () => {
            if (guidanceTimerRef.current) clearTimeout(guidanceTimerRef.current);
        };
    }, [isFirstSession, currentIndex, answer, isAnalyzing]);

    const handlePause = async () => {
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
            alert("Failed to pause safely. Please try again.");
            setIsAnalyzing(false);
        }
    };

    const handleAbandon = () => {
        if (confirm("Are you sure you want to abandon this session? All progress will be lost.")) {
            localStorage.removeItem('serify_active_session');
            storage.removeSession(id as string);
            router.push('/');
        }
    };

    useEffect(() => {
        const stored = localStorage.getItem('serify_active_session');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.id === id || true) {
                    setSessionData(parsed);
                    setConcepts(parsed.concepts || []);
                    setQuestions(parsed.questions || []);
                    setTitle(parsed.title || "New Session");
                    if (parsed.currentIndex) setCurrentIndex(parsed.currentIndex);
                    if (parsed.assessments) setAssessments(parsed.assessments);
                }
            } catch (e) {
                console.error("Failed to parse session data", e);
            }
        }
    }, [id]);

    useEffect(() => {
        if (sessionData && (currentIndex > 0 || assessments.length > 0)) {
            const updatedData = { ...sessionData, currentIndex, assessments };
            localStorage.setItem('serify_active_session', JSON.stringify(updatedData));
        }
    }, [currentIndex, assessments, sessionData]);

    const loadingMessages = isFirstSession ? [
        "Reading your answers carefully..."
    ] : [
        "Analyzing your responses...",
        "Mapping your understanding...",
        "Identifying gaps...",
        "Building your feedback report..."
    ];

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isAnalyzing) {
            interval = setInterval(() => {
                setLoadingMsgIdx(prev => (prev + 1) % loadingMessages.length);
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isAnalyzing, loadingMessages.length]);

    const currentQuestion = questions[currentIndex];

    const handleSubmit = async (isSkip: boolean = false) => {
        if (!isSkip && !answer.trim()) return;

        const currentAnswer = isSkip ? "" : answer;
        const currentQ = currentQuestion;
        const currentConcept = concepts.find(c => c.id === currentQ.target_concept_id) || { name: 'Concept', definition: '' };

        setAnswer('');
        setSkippingId(null);

        const explanationRequested = !!explanations[currentQ.id]?.text;

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const isDemo = router.query.demo === 'true';

        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(!token && isDemo ? { 'x-serify-demo': 'true' } : {})
        };

        const analysisPromise = fetch('/api/analyze-answer', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                answerText: currentAnswer,
                question: currentQ,
                concept: currentConcept,
                explanationRequested,
                skipped: isSkip
            })
        }).then(res => res.json()).then(({ assessment }) => {
            return {
                ...assessment,
                question_id: currentQ.id,
                concept_id: currentConcept.id,
                explanation_requested: explanationRequested,
                skipped: isSkip
            };
        });

        analysisPromises.current.push(analysisPromise);

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setIsAnalyzing(true);
            try {
                const newAssessments = await Promise.all(analysisPromises.current);
                const allAssessments = [...assessments, ...newAssessments];
                setAssessments(allAssessments);

                const { data: { session: authSession } } = await supabase.auth.getSession();
                const token = authSession?.access_token;
                const isDemo = router.query.demo === 'true';

                const synthRes = await fetch('/api/synthesize-feedback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        ...(!token && isDemo ? { 'x-serify-demo': 'true' } : {})
                    },
                    body: JSON.stringify({
                        sessionData: sessionData || { title },
                        assessments: allAssessments,
                        concepts: concepts,
                        isBasicMode: sessionData?.isBasicMode || false
                    })
                });

                const { report } = await synthRes.json();

                localStorage.setItem('serify_feedback_report', JSON.stringify({
                    title,
                    report,
                    concepts,
                    assessments: allAssessments
                }));

                storage.saveSession({
                    id: id as string,
                    title,
                    type: sessionData?.type || 'Session',
                    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    status: 'Completed',
                    result: (report.overall_counts?.['solid'] ?? 0) > (report.overall_counts?.['shaky'] ?? 0) + (report.overall_counts?.['revisit'] ?? 0) ? 'Strong' : 'Gaps Found'
                });

                router.push(`/session/${id}/feedback`);
            } catch (error) {
                console.error(error);
                alert("Failed to analyze. Please try again.");
                setIsAnalyzing(false);
                setAnswer(currentAnswer);
                analysisPromises.current.pop();
            }
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'RETRIEVAL': return 'text-[var(--accent)] bg-[var(--accent-light)]';
            case 'APPLICATION': return 'text-[var(--shallow)] bg-[var(--shallow-light)]';
            case 'MISCONCEPTION PROBE': return 'text-[var(--missing)] bg-[var(--missing-light)]';
            default: return 'text-[var(--muted)] bg-black/5';
        }
    };

    const requestExplanation = async () => {
        if (!currentQuestion) return;

        const qId = currentQuestion.id;
        const currentConcept = concepts.find(c => c.id === currentQuestion.target_concept_id) || { name: 'Concept', definition: '' };

        setExplanations(prev => ({
            ...prev,
            [qId]: { requesting: true, text: null }
        }));

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const isDemo = router.query.demo === 'true';

        try {
            const res = await fetch('/api/explain-concept', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    ...(!token && isDemo ? { 'x-serify-demo': 'true' } : {})
                },
                body: JSON.stringify({
                    question: currentQuestion,
                    concept: currentConcept
                })
            });

            if (!res.ok) throw new Error('Failed to fetch explanation');
            const data = await res.json();

            setExplanations(prev => ({
                ...prev,
                [qId]: { requesting: false, text: data.explanation }
            }));
        } catch (error) {
            console.error(error);
            setExplanations(prev => ({
                ...prev,
                [qId]: { requesting: false, text: "Failed to load explanation. Please try again." }
            }));
        }
    };

    if (isAnalyzing && currentIndex >= questions.length - 1 && answer === '') {
        const remainingConceptsCount = concepts.length - questions.length;
        return (
            <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center font-sans">
                <Head><title>Analyzing | Serify</title></Head>
                <div className="text-center animate-fade-in flex flex-col items-center px-4">
                    <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin mb-6"></div>
                    <p className="text-xl font-medium animate-pulse mb-2">{loadingMessages[loadingMsgIdx]}</p>
                    {isFirstSession && (
                        <p className="text-lg text-[var(--accent)] font-medium animate-fade-in" style={{ animationDelay: '1.5s', animationFillMode: 'both' }}>
                            This is where Serify earns it.
                        </p>
                    )}
                    {remainingConceptsCount > 0 && !isFirstSession && (
                        <p className="text-sm text-[var(--muted)] mt-6 max-w-sm animate-fade-in" style={{ animationDelay: '2s', animationFillMode: 'both' }}>
                            We focused on {questions.length} core concepts. <br />
                            The remaining {remainingConceptsCount} concepts are being saved to your Vault for future practice.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (!currentQuestion) return null;

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col md:flex-row font-sans">
            <Head>
                <title>Session | Serify</title>
            </Head>

            <aside className="hidden md:flex flex-col w-[260px] border-r border-[var(--border)] bg-[var(--surface)] h-screen sticky top-0 shrink-0">
                <div className="px-6 py-8 border-b border-[var(--border)]">
                    <div className="text-xs text-[var(--muted)] uppercase font-bold tracking-wider mb-2">Content Map</div>
                    <div className="text-lg font-bold leading-tight">{title}</div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {concepts.map((concept, idx) => {
                        const isAnswered = questions.findIndex(q => q.target_concept_id === concept.id) < currentIndex;
                        const isCurrent = questions[currentIndex]?.target_concept_id === concept.id;

                        return (
                            <div key={concept.id || idx} className="flex items-start gap-3">
                                <div className="mt-0.5 shrink-0">
                                    {isAnswered ? (
                                        <CheckCircle2 size={16} className="text-[var(--accent)]" />
                                    ) : isCurrent ? (
                                        <div className="w-4 h-4 rounded-full border-2 border-[var(--accent)] flex items-center justify-center animate-pulse">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                                        </div>
                                    ) : (
                                        <Circle size={16} className="text-[var(--border)]" />
                                    )}
                                </div>
                                <span className={`text-sm ${isAnswered ? 'text-[var(--text)] opacity-60 line-through' : isCurrent ? 'text-[var(--text)] font-semibold' : 'text-[var(--muted)]'}`}>
                                    {concept.name}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-h-screen relative">
                <div className="absolute top-0 right-0 p-6 flex items-center gap-4 z-10 w-full justify-between md:justify-end bg-gradient-to-b from-[var(--bg)] to-transparent">
                    <div className="md:hidden text-sm font-bold opacity-50">Serify</div>
                    <div className="flex items-center gap-3">
                        <button onClick={handlePause} disabled={isAnalyzing} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-black/5 hover:text-[var(--text)] transition-colors disabled:opacity-50">
                            <Pause size={14} /> Pause
                        </button>
                        <button onClick={handleAbandon} disabled={isAnalyzing} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--warn)] hover:bg-[var(--warn-light)] transition-colors disabled:opacity-50">
                            <X size={14} /> Abandon
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full px-6 py-24">
                    <div className="animate-slide-up" key={currentQuestion.id || currentIndex}>
                        {isFirstSession && currentIndex === 0 && showGuidance1 && (
                            <div className="mb-8 p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm relative animate-fade-in group transition-all">
                                <button onClick={dismissGuidance1} className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)] transition-colors"><X size={18} /></button>
                                <div className="flex items-center gap-2 text-sm font-bold text-[var(--accent)] mb-3">
                                    <Zap size={16} /> Answer in your own words
                                </div>
                                <p className="text-[var(--text)] text-sm leading-relaxed max-w-[90%]">
                                    There&apos;s no right or wrong format. Write as much or as little as you naturally would. The quality of your feedback depends on the quality of your answer.
                                </p>
                            </div>
                        )}

                        <div className={`inline-flex items-center px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider mb-6 ${getTypeColor(currentQuestion.type)}`}>
                            {currentQuestion.type}
                        </div>

                        <h1 className="text-3xl md:text-4xl font-display leading-[1.3] text-[var(--text)] mb-8">
                            {currentQuestion.text}
                        </h1>

                        {explanations[currentQuestion.id]?.text ? (
                            <div className="mb-8 p-5 rounded-2xl bg-[var(--accent-light)] border border-[var(--accent)]/20 animate-fade-in relative">
                                <span className="absolute -top-3 left-6 px-3 py-0.5 bg-[var(--bg)] border border-[var(--accent)]/20 text-[11px] font-bold tracking-wider uppercase text-[var(--accent)] rounded-full">Concept Hint</span>
                                <div className="text-[var(--text)] leading-relaxed text-[15px]">
                                    {explanations[currentQuestion.id].text!.split('\n').map((line, i) => (
                                        <span key={i}>{line}{i < explanations[currentQuestion.id].text!.split('\n').length - 1 && <br />}</span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="mb-8 flex justify-start">
                                <button
                                    onClick={requestExplanation}
                                    disabled={explanations[currentQuestion.id]?.requesting}
                                    className="flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
                                >
                                    <span className="w-5 h-5 flex items-center justify-center rounded-full border border-current text-xs">?</span>
                                    {explanations[currentQuestion.id]?.requesting ? 'Loading hint...' : 'Explain this concept (1 Spark)'}
                                </button>
                            </div>
                        )}

                        <div className="space-y-6">
                            <textarea
                                value={answer}
                                onChange={e => setAnswer(e.target.value)}
                                disabled={isAnalyzing || skippingId === currentQuestion.id}
                                placeholder="Write your answer here — use your own words."
                                className="w-full min-h-[160px] p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-lg outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all resize-y shadow-sm disabled:opacity-50"
                            />

                            {showGuidance2 && currentIndex === 0 && answer.length < 10 && skippingId !== currentQuestion.id && (
                                <div className="text-sm text-[var(--muted)] mt-3 animate-fade-in font-medium italic mb-2">
                                    Even a partial answer helps. Write what you know.
                                </div>
                            )}

                            {skippingId === currentQuestion.id ? (
                                <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 animate-fade-in flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <p className="text-orange-900 text-sm font-medium">
                                        Try writing anything, even partial — it helps Serify understand where the gap is.
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
                                    <span className="text-sm text-[var(--muted)] font-medium">Question {currentIndex + 1} of {questions.length}</span>

                                    <div className="flex items-center gap-4 flex-row-reverse">
                                        <button
                                            onClick={() => handleSubmit(false)}
                                            disabled={!answer.trim() || isAnalyzing}
                                            className={`px-8 py-3.5 rounded-xl font-medium transition-all flex items-center ${answer.trim() && !isAnalyzing ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-md shadow-[var(--accent)]/20 hover:-translate-y-0.5' : 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed opacity-50'}`}
                                        >
                                            {isAnalyzing && currentIndex < questions.length - 1 ? 'Analyzing...' : (
                                                currentIndex === questions.length - 1 ? (concepts.length > questions.length ? 'Submit & Save Remaining Concepts' : 'Submit & Finish Session') : 'Submit Answer \u2192'
                                            )}
                                        </button>

                                        {!answer.trim() && !isAnalyzing && (
                                            <button
                                                onClick={() => setSkippingId(currentQuestion.id)}
                                                className="text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors opacity-70 hover:opacity-100"
                                            >
                                                I can't recall this
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
