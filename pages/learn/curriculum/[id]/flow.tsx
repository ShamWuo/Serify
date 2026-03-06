import { useState, useEffect, useCallback, useRef } from 'react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
    Zap, Brain, Loader2, ChevronRight, ChevronLeft, CheckCircle2,
    BookOpen, HelpCircle, Target, Route, ShieldAlert, Replace, Send,
    Layers, Trophy, Lock
} from 'lucide-react';
import { FlowSession, FlowStep, FlowStepType } from '@/types/serify';
import CurriculumSidebar from '@/components/dashboard/CurriculumSidebar';

// ────────────────────────────────────────────────────────────
// Small utilities
// ────────────────────────────────────────────────────────────

function ProgressBar({ concepts, currentConceptId }: { concepts: any[]; currentConceptId?: string }) {
    const done = concepts.filter((c) => c.status === 'completed').length;
    const total = concepts.length;
    return (
        <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                    className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                    style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                />
            </div>
            <span className="text-xs text-[var(--muted)] whitespace-nowrap">{done}/{total} concepts</span>
        </div>
    );
}

function StepIcon({ type }: { type: FlowStepType }) {
    const MAP: Partial<Record<string, JSX.Element>> = {
        orient: <Target size={16} />,
        build_layer: <Layers size={16} />,
        anchor: <BookOpen size={16} />,
        check: <HelpCircle size={16} />,
        reinforce: <Replace size={16} />,
        confirm: <CheckCircle2 size={16} />,
    };
    return MAP[type] || <Zap size={16} />;
}

function ActionButton({ label, icon, primary, secondary, onClick, disabled }: {
    label: string; icon?: JSX.Element; primary?: boolean; secondary?: boolean;
    onClick: () => void; disabled?: boolean;
}) {
    const bg = primary ? 'var(--accent)' : 'transparent';
    const border = primary ? 'var(--accent)' : 'var(--border)';
    const text = primary ? 'white' : 'var(--text)';
    return (
        <button onClick={onClick} disabled={disabled}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, background: bg, color: text,
                border: `1.5px solid ${border}`, borderRadius: 10, padding: '9px 18px', fontSize: 14,
                fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
                transition: 'all 0.15s'
            }}
        >
            {icon}{label}
        </button>
    );
}

// ────────────────────────────────────────────────────────────
// Step components (read-only aware)
// ────────────────────────────────────────────────────────────

function ReadOnlyNotice() {
    return (
        <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5">
            <BookOpen size={12} /> Reviewing past step
        </div>
    );
}

function TeachStep({ content, onNext, readOnly }: { content: any; onNext: (r: string) => void; readOnly?: boolean }) {
    const quickChecks: any[] = content.quickChecks || [];
    const [answers, setAnswers] = useState<(number | null)[]>(Array(quickChecks.length).fill(null));
    const allAnswered = quickChecks.length === 0 || answers.every((a) => a !== null);

    const handleSelect = (qIdx: number, optIdx: number) => {
        if (readOnly || answers[qIdx] !== null) return;
        setAnswers((prev) => { const next = [...prev]; next[qIdx] = optIdx; return next; });
    };

    return (
        <div>
            {/* Full lesson content */}
            <div className="flow-markdown leading-relaxed text-[15.5px] mb-8">
                <MarkdownRenderer>{content.text}</MarkdownRenderer>
            </div>

            {/* Inline MCQ quick-checks */}
            {quickChecks.length > 0 && (
                <div className="space-y-5 border-t border-[var(--border)] pt-6">
                    <p className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest mb-1">Quick checks</p>
                    {quickChecks.map((qc: any, qIdx: number) => {
                        const selected = answers[qIdx];
                        const correct = qc.correctIndex;
                        const answered = selected !== null;
                        return (
                            <div key={qIdx} className="rounded-xl border border-[var(--border)] overflow-hidden">
                                <div className="px-4 py-3 text-[14px] font-semibold text-[var(--text)] bg-[var(--surface)]">
                                    <MarkdownRenderer>{qc.question}</MarkdownRenderer>
                                </div>
                                <div className="divide-y divide-[var(--border)]">
                                    {(qc.options || []).map((opt: string, oIdx: number) => {
                                        const isSelected = selected === oIdx;
                                        const isCorrect = oIdx === correct;
                                        let bg = 'transparent';
                                        let textCls = 'text-[var(--text)]';
                                        let icon = null;
                                        if (answered) {
                                            if (isCorrect) { bg = '#22c55e12'; textCls = 'text-emerald-700 font-semibold'; icon = '✓'; }
                                            else if (isSelected && !isCorrect) { bg = '#ef444412'; textCls = 'text-red-600'; icon = '✗'; }
                                        }
                                        return (
                                            <button key={oIdx} onClick={() => handleSelect(qIdx, oIdx)}
                                                disabled={answered || readOnly}
                                                style={{ background: bg }}
                                                className={`w-full text-left px-4 py-2.5 text-[13.5px] flex items-center gap-2.5 transition-colors ${!answered && !readOnly ? 'hover:bg-[var(--accent)]/5 cursor-pointer' : 'cursor-default'} ${textCls}`}
                                            >
                                                <span className="w-5 h-5 rounded-full border border-[var(--border)] flex items-center justify-center text-[11px] shrink-0"
                                                    style={answered && isCorrect ? { background: '#22c55e', borderColor: '#22c55e', color: 'white' } : answered && isSelected ? { background: '#ef4444', borderColor: '#ef4444', color: 'white' } : {}}
                                                >
                                                    {answered ? (isCorrect ? '✓' : isSelected ? '✗' : String.fromCharCode(65 + oIdx)) : String.fromCharCode(65 + oIdx)}
                                                </span>
                                                <MarkdownRenderer>{opt}</MarkdownRenderer>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex mt-6">
                {readOnly ? <ReadOnlyNotice /> : (
                    <ActionButton
                        label={allAnswered ? 'Continue' : `Answer all questions to continue`}
                        icon={<ChevronRight size={16} />}
                        primary
                        onClick={() => onNext('completed_teach')}
                        disabled={!allAnswered}
                    />
                )}
            </div>
        </div>
    );
}



function CheckQuestionStep({ content, stepId, isEvaluated, onEvaluated, readOnly, savedAnswer }: {
    content: any; stepId: string; isEvaluated: boolean;
    onEvaluated: (response: string, evaluation: any) => void;
    readOnly?: boolean; savedAnswer?: string;
}) {
    const [answer, setAnswer] = useState(savedAnswer || '');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { if (savedAnswer) setAnswer(savedAnswer); }, [savedAnswer]);

    const submit = async () => {
        if (!answer.trim() || submitting || readOnly) return;
        setSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/flow/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ stepId, userResponse: answer }),
            });
            const data = await res.json();
            onEvaluated(answer, data.evaluation);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <div className="text-base font-semibold mb-3 flow-markdown">
                <MarkdownRenderer>{content.questionText}</MarkdownRenderer>
            </div>
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
                disabled={isEvaluated || submitting || readOnly}
                placeholder={readOnly ? '' : 'Type your answer here…'}
                rows={4}
                className="w-full bg-[var(--surface)] border-2 border-[var(--border)] text-[var(--text)] rounded-xl p-3.5 text-[14.5px] leading-relaxed resize-y focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--muted)]/50"
            />
            {readOnly ? <ReadOnlyNotice /> : !isEvaluated && (
                <div className="flex justify-end mt-3">
                    <ActionButton
                        label={submitting ? 'Evaluating…' : 'Submit'}
                        icon={submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        primary onClick={submit} disabled={!answer.trim() || submitting}
                    />
                </div>
            )}
        </div>
    );
}

function ReinforceStep({ content, onNext, readOnly }: { content: any; onNext: (r: string) => void; readOnly?: boolean }) {
    const isPathB = content.path === 'B';
    const bgClass = isPathB ? 'bg-amber-50 border border-amber-500/40 p-5' : '';
    return (
        <div className={`rounded-xl ${bgClass}`}>
            {isPathB && <p className="text-xs font-bold text-amber-500 uppercase mb-2 tracking-wider">Alternative Angle</p>}
            <div className="flow-markdown leading-relaxed text-[15.5px]">
                <MarkdownRenderer>{content.text}</MarkdownRenderer>
            </div>
            <div className="flex mt-6">
                {readOnly ? <ReadOnlyNotice /> : (
                    <ActionButton label="I see now" primary icon={<ChevronRight size={16} />} onClick={() => onNext('got_it')} />
                )}
            </div>
        </div>
    );
}

function EvaluationBanner({ evaluation, onContinue }: { evaluation: any; onContinue: () => void }) {
    const isA = evaluation.path === 'A';
    const isB = evaluation.path === 'B';
    const bg = isA ? '#22c55e10' : isB ? '#eab30810' : 'var(--surface)';
    const border = isA ? '#22c55e40' : isB ? '#eab30840' : 'var(--border)';
    const headerColor = isA ? '#22c55e' : isB ? '#eab308' : 'var(--muted)';
    const headerText = isA ? '✓ Excellent' : isB ? '◑ Almost there' : "Let's align";
    return (
        <div style={{ background: bg, border: `1.5px solid ${border}` }} className="rounded-xl p-5 mt-6">
            <p style={{ color: headerColor }} className="font-bold text-xs uppercase tracking-wider mb-2">{headerText}</p>
            <div className="text-[15px] mb-4 leading-relaxed flow-markdown">
                <MarkdownRenderer>{evaluation.feedbackText}</MarkdownRenderer>
            </div>
            <ActionButton label="Continue" icon={<ChevronRight size={16} />} primary onClick={onContinue} />
        </div>
    );
}

// Concept-complete interstitial shown after a concept is mastered
function ConceptCompleteCard({ conceptName, onNext, isLast }: {
    conceptName: string; onNext: () => void; isLast: boolean;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <Trophy size={32} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text)] mb-1">Concept Mastered!</h2>
            <p className="text-[var(--muted)] text-sm mb-6 max-w-xs">
                You&apos;ve completed <span className="font-semibold text-[var(--text)]">{conceptName}</span>.
                {isLast ? ' You\u2019ve finished the entire curriculum!' : ' Ready for the next concept?'}
            </p>
            {isLast ? (
                <ActionButton label="See Results 🎉" primary onClick={onNext} />
            ) : (
                <ActionButton label="Continue to Next Concept" icon={<ChevronRight size={16} />} primary onClick={onNext} />
            )}
        </div>
    );
}

// ────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────

export default function CurriculumFlowSessionPage() {
    const router = useRouter();
    const { id: curriculumId } = router.query as { id?: string };
    const { user, loading: authLoading } = useAuth();

    const [flowSessionId, setFlowSessionId] = useState<string | null>(null);
    const [flowSession, setFlowSession] = useState<FlowSession | null>(null);
    const [currentConceptIndex, setCurrentConceptIndex] = useState(0);

    // Step history is the full ordered list of steps for the current concept
    const [stepHistory, setStepHistory] = useState<FlowStep[]>([]);
    // Which step in history we are viewing (not necessarily the last)
    const [viewingStepIndex, setViewingStepIndex] = useState(-1);
    const [pendingEvaluation, setPendingEvaluation] = useState<any | null>(null);

    // When true, concept just completed — show interstitial instead of next step
    const [conceptJustCompleted, setConceptJustCompleted] = useState(false);

    const [conceptStatuses, setConceptStatuses] = useState<Record<string, 'not_started' | 'in_progress' | 'completed'>>({});

    const [loading, setLoading] = useState(true);
    const [stepping, setStepping] = useState(false);
    const [loadingTime, setLoadingTime] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [sessionDone, setSessionDone] = useState(false);

    const currentConcept = flowSession?.initial_plan?.concepts?.[currentConceptIndex];
    const totalConcepts = flowSession?.initial_plan?.concepts?.length || 0;

    // Derived: the step we're currently displaying
    const displayStep = viewingStepIndex >= 0 ? stepHistory[viewingStepIndex] : null;
    const isReadOnly = viewingStepIndex >= 0 && viewingStepIndex < stepHistory.length - 1;
    const currentLiveStep = stepHistory[stepHistory.length - 1] ?? null;

    // ── Timer for loading states ────────────────────────────
    useEffect(() => {
        let timer: any;
        if (stepping) {
            timer = setInterval(() => {
                setLoadingTime((t) => t + 1);
            }, 1000);
        } else {
            setLoadingTime(0);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [stepping]);

    // ── 1. Initialize flow session ──────────────────────────
    useEffect(() => {
        if (authLoading || !curriculumId || !user) { setLoading(false); return; }

        (async () => {
            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch('/api/serify/start-curriculum-flow', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ curriculumId }),
                });
                const data = await res.json();
                if (!res.ok) {
                    if (data.error === 'Curriculum already completed') { setSessionDone(true); setLoading(false); return; }
                    throw new Error(data.error || 'Failed to initialize session');
                }
                setFlowSessionId(data.flowSessionId);
            } catch (err: any) {
                setError(err.message);
                setLoading(false);
            }
        })();
    }, [curriculumId, user, authLoading]);

    // ── 2. Load flow session + concept statuses ─────────────
    useEffect(() => {
        if (!flowSessionId) return;
        (async () => {
            const { data, error: dbErr } = await supabase.from('flow_sessions').select('*').eq('id', flowSessionId).single();
            if (dbErr || !data) { setError('Flow Engine connection lost.'); setLoading(false); return; }
            setFlowSession(data as FlowSession);

            const statuses: Record<string, 'not_started' | 'in_progress' | 'completed'> = {};
            let firstUncompleted = -1;
            (data.initial_plan?.concepts || []).forEach((c: any, idx: number) => {
                const done = data.concepts_completed.includes(c.conceptId);
                statuses[c.conceptId] = done ? 'completed' : 'not_started';
                if (!done && firstUncompleted === -1) firstUncompleted = idx;
            });
            setConceptStatuses(statuses);

            if (firstUncompleted !== -1) {
                setCurrentConceptIndex(firstUncompleted);
            } else if ((data.initial_plan?.concepts?.length || 0) > 0) {
                setCurrentConceptIndex(data.initial_plan.concepts.length - 1);
                setSessionDone(true);
            }
            setLoading(false);

            // Kick off background orchestration for the next 3 concepts immediately
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            const allConcepts = data.initial_plan?.concepts || [];
            const completed: string[] = data.concepts_completed || [];
            const toPreload = allConcepts
                .filter((c: any) => !completed.includes(c.conceptId))
                .slice(0, 3);
            toPreload.forEach((c: any) => {
                fetch('/api/flow/orchestrate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ sessionId: data.id, conceptId: c.conceptId }),
                }).catch(() => { /* silently ignore prefetch failures */ });
            });
        })();
    }, [flowSessionId]);

    // ── 3. Fetch next step for current concept ──────────────
    const fetchNextStep = useCallback(async () => {
        if (!flowSession || !currentConcept || stepping) return;
        setStepping(true);
        setPendingEvaluation(null);
        setError(null);

        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();

            // Orchestrate if no plan yet
            const { data: progress } = await supabase
                .from('flow_concept_progress')
                .select('orchestrator_plan')
                .eq('flow_session_id', flowSession.id)
                .eq('concept_id', currentConcept.conceptId)
                .maybeSingle();

            if (!progress?.orchestrator_plan) {
                const orchRes = await fetch('/api/flow/orchestrate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
                    body: JSON.stringify({ sessionId: flowSession.id, conceptId: currentConcept.conceptId }),
                });
                if (!orchRes.ok) {
                    const orchData = await orchRes.json();
                    throw new Error(orchData.error || 'Orchestration failed');
                }
            }

            // Get next step
            const res = await fetch('/api/flow/step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
                body: JSON.stringify({ sessionId: flowSession.id, conceptId: currentConcept.conceptId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Step failed');

            if (data.action === 'concept_complete') {
                // Mark completed locally and in DB
                const updatedCompleted = [...(flowSession.concepts_completed || []), currentConcept.conceptId];
                await supabase.from('flow_sessions').update({ concepts_completed: updatedCompleted }).eq('id', flowSession.id);
                setConceptStatuses((prev) => ({ ...prev, [currentConcept.conceptId]: 'completed' }));
                setConceptJustCompleted(true); // show interstitial — do NOT auto-advance
            } else {
                const history = data.stepHistory || [...stepHistory, data.step];
                setStepHistory(history);
                setViewingStepIndex(history.length - 1);
                setConceptStatuses((prev) => ({ ...prev, [currentConcept.conceptId]: 'in_progress' }));
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setStepping(false);
        }
    }, [flowSession, currentConcept, stepping, stepHistory]);

    // ── Auto-fetch first step when concept changes ──────────
    useEffect(() => {
        if (flowSession && !stepping && currentConcept && !sessionDone && !conceptJustCompleted && stepHistory.length === 0) {
            fetchNextStep();
        }
    }, [flowSession, currentConcept, sessionDone]);

    // ── Handle "Got it / Continue" buttons ──────────────────
    const handleUserResponse = async (responseType: string) => {
        if (!displayStep || isReadOnly) return;

        // Fire-and-forget the response record (best effort)
        supabase.auth.getSession().then(({ data: { session } }) => {
            fetch('/api/flow/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ stepId: displayStep.id, userResponse: responseType }),
            }).catch(() => { });
        });

        fetchNextStep();
    };

    const handleEvaluated = (_response: string, evaluation: any) => {
        setPendingEvaluation(evaluation);
    };

    // ── Concept-complete advancement ────────────────────────
    const handleAdvanceConcept = () => {
        const nextIdx = currentConceptIndex + 1;
        if (nextIdx < totalConcepts) {
            setCurrentConceptIndex(nextIdx);
            setStepHistory([]);
            setViewingStepIndex(-1);
            setPendingEvaluation(null);
            setConceptJustCompleted(false);

            // Prefetch orchestration for the 3 concepts after the one we're moving to
            if (flowSession) {
                const completed = (flowSession.concepts_completed || []).concat(
                    currentConcept?.conceptId ? [currentConcept.conceptId] : []
                );
                const upcoming = (flowSession.initial_plan?.concepts || [])
                    .filter((c: any) => !completed.includes(c.conceptId))
                    .slice(1, 4); // skip the one we just moved to (already being loaded), grab next 3
                supabase.auth.getSession().then(({ data: { session: s } }) => {
                    upcoming.forEach((c: any) => {
                        fetch('/api/flow/orchestrate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.access_token}` },
                            body: JSON.stringify({ sessionId: flowSession.id, conceptId: c.conceptId }),
                        }).catch(() => { });
                    });
                });
            }
        } else {
            setSessionDone(true);
            setConceptJustCompleted(false);
        }
    };

    // ── Sidebar: load completed concept for review ──────────
    const handleSidebarConceptClick = async (conceptIndex: number) => {
        const concept = flowSession?.initial_plan?.concepts?.[conceptIndex];
        if (!concept || !flowSession) return;
        const status = conceptStatuses[concept.conceptId];

        // Jump back to in-progress/completed concept, loading its history
        if (status === 'completed' || status === 'in_progress') {
            setStepping(true);
            setError(null);
            setConceptJustCompleted(false);
            try {
                const { data: { session: authSession } } = await supabase.auth.getSession();
                const res = await fetch(
                    `/api/flow/get-steps?sessionId=${flowSession.id}&conceptId=${concept.conceptId}`,
                    { headers: { Authorization: `Bearer ${authSession?.access_token}` } }
                );
                const data = await res.json();
                const steps: FlowStep[] = data.steps || [];
                setCurrentConceptIndex(conceptIndex);
                setStepHistory(steps);
                setViewingStepIndex(steps.length - 1);
                setPendingEvaluation(null);
                // If completed, show review mode
                if (status === 'completed') {
                    setConceptJustCompleted(true);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setStepping(false);
            }
        }
        // not_started: do nothing (no clicking ahead)
    };

    // ── Render current visible step ─────────────────────────
    const renderStep = () => {
        if (!displayStep) return null;
        const { step_type, content, user_response } = displayStep;
        const savedAnswer = user_response || '';

        if (step_type === 'teach') return <TeachStep content={content} onNext={handleUserResponse} readOnly={isReadOnly} />;
        if (step_type === 'check' || step_type === 'confirm')
            return (
                <CheckQuestionStep content={content} stepId={displayStep.id} isEvaluated={!!pendingEvaluation || isReadOnly}
                    onEvaluated={handleEvaluated} readOnly={isReadOnly} savedAnswer={savedAnswer} />
            );
        if (step_type === 'reinforce') return <ReinforceStep content={content} onNext={handleUserResponse} readOnly={isReadOnly} />;

        return null;
    };

    // ────────────────────────────────────────────────────────
    // Render states
    // ────────────────────────────────────────────────────────

    if (loading)
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center min-h-[60vh]">
                    <Loader2 size={36} className="animate-spin text-[var(--accent)]" />
                </div>
            </DashboardLayout>
        );

    if (sessionDone)
        return (
            <DashboardLayout>
                <div className="max-w-xl mx-auto mt-16 text-center px-4">
                    <div className="text-6xl mb-6">🎉</div>
                    <h1 className="text-3xl font-display font-bold mb-3 text-[var(--text)]">Curriculum Complete!</h1>
                    <p className="text-[var(--muted)] mb-8">
                        You've successfully mastered {totalConcepts} concept{totalConcepts !== 1 ? 's' : ''} in this curriculum path.
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <ActionButton label="Back to Curriculum" onClick={() => router.push(`/learn/curriculum/${curriculumId}`)} />
                        <ActionButton label="Go to Vault" primary onClick={() => router.push('/vault')} />
                    </div>
                </div>
            </DashboardLayout>
        );

    const concepts = flowSession?.initial_plan?.concepts || [];

    return (
        <>
            <Head><title>Flow Mode — {currentConcept?.conceptName || 'Loading'}</title></Head>
            <DashboardLayout
                backLink={`/learn/curriculum/${curriculumId}`}
                sidebarContent={
                    <CurriculumSidebar
                        concepts={concepts}
                        currentIndex={currentConceptIndex}
                        conceptStatuses={concepts.reduce((acc: any, c: any) => {
                            acc[c.conceptId] = conceptStatuses[c.conceptId] || 'not_started';
                            return acc;
                        }, {})}
                        onConceptClick={handleSidebarConceptClick}
                        title={flowSession?.initial_plan?.overallStrategy?.replace('Curriculum: ', '')}
                    />
                }
            >
                <div className="max-w-5xl mx-auto px-4 py-6">

                    {/* Top bar */}
                    <div className="mb-5">
                        {flowSession && (
                            <ProgressBar
                                concepts={concepts.map((c) => ({ ...c, status: conceptStatuses[c.conceptId] || 'not_started' }))}
                                currentConceptId={currentConcept?.conceptId}
                            />
                        )}
                        <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/25 rounded-lg px-3 py-1.5 text-sm font-bold text-[var(--accent)] truncate max-w-xs">
                                    {currentConcept?.conceptName || '—'}
                                </div>
                                {displayStep && !conceptJustCompleted && (
                                    <span className="hidden sm:flex text-[10px] text-[var(--muted)] items-center gap-1 uppercase tracking-widest font-semibold">
                                        <StepIcon type={displayStep.step_type as FlowStepType} />
                                        {displayStep.step_type.replace(/_/g, ' ')}
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-[var(--muted)] shrink-0">{currentConceptIndex + 1} / {totalConcepts}</span>
                        </div>
                    </div>

                    <div className="flex gap-6 items-start">
                        {/* Main step card */}
                        <div className="flex-1 min-w-0">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 mb-4 text-sm flex items-center justify-between">
                                    <span>{error}</span>
                                    <button onClick={() => fetchNextStep()} className="underline font-medium hover:text-red-700 ml-4 shrink-0">Retry</button>
                                </div>
                            )}

                            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 md:p-8 min-h-[280px] shadow-sm">
                                {stepping ? (
                                    <div className="flex flex-col items-center justify-center min-h-[240px] gap-6 text-[var(--muted)]">
                                        <div className="relative">
                                            <Loader2 size={40} className="animate-spin text-[var(--accent)]" />
                                            {loadingTime > 8 && (
                                                <div className="absolute -inset-4 border-2 border-[var(--accent)]/20 rounded-full animate-ping" />
                                            )}
                                        </div>
                                        <div className="flex flex-col items-center gap-2 text-center max-w-sm">
                                            <span className="text-base font-medium text-[var(--text)] animate-pulse">
                                                {loadingTime < 4 ? 'Thinking…' :
                                                    loadingTime < 8 ? 'Analyzing your response…' :
                                                        loadingTime < 15 ? 'Connecting concepts…' :
                                                            'Taking longer than usual…'}
                                            </span>
                                            {loadingTime >= 8 && (
                                                <span className="text-xs opacity-70 animate-fade-in">
                                                    Don&apos;t worry, Serify is busy building your custom learning path.
                                                </span>
                                            )}
                                            {loadingTime >= 15 && (
                                                <button
                                                    onClick={() => fetchNextStep()}
                                                    className="mt-4 px-4 py-2 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 rounded-xl text-xs font-bold hover:bg-[var(--accent)]/20 transition-all flex items-center gap-2"
                                                >
                                                    <Zap size={14} /> Retry Request
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : conceptJustCompleted ? (
                                    /* If reviewing a completed concept from sidebar, show history review + complete card */
                                    <>
                                        {stepHistory.length > 0 && (
                                            <>
                                                {renderStep()}
                                                {!isReadOnly && pendingEvaluation && (
                                                    <EvaluationBanner evaluation={pendingEvaluation}
                                                        onContinue={() => {
                                                            setPendingEvaluation(null);
                                                            setConceptJustCompleted(true);
                                                        }}
                                                    />
                                                )}
                                            </>
                                        )}
                                        {/* Show interstitial at end of history for completed concept */}
                                        {(viewingStepIndex === stepHistory.length - 1 || stepHistory.length === 0) && (
                                            <ConceptCompleteCard
                                                conceptName={currentConcept?.conceptName || ''}
                                                onNext={handleAdvanceConcept}
                                                isLast={currentConceptIndex + 1 >= totalConcepts}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {renderStep()}
                                        {!isReadOnly && pendingEvaluation && (
                                            <EvaluationBanner evaluation={pendingEvaluation} onContinue={fetchNextStep} />
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Back / Forward navigation */}
                            {stepHistory.length > 1 && !conceptJustCompleted && (
                                <div className="flex items-center justify-between mt-4">
                                    <button
                                        onClick={() => {
                                            if (viewingStepIndex > 0) {
                                                setViewingStepIndex((i) => i - 1);
                                                setPendingEvaluation(null);
                                            }
                                        }}
                                        disabled={viewingStepIndex <= 0}
                                        className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={16} /> Back
                                    </button>

                                    {/* Step counter */}
                                    <span className="text-xs text-[var(--muted)]">
                                        Step {viewingStepIndex + 1} of {stepHistory.length}
                                    </span>

                                    <button
                                        onClick={() => {
                                            if (viewingStepIndex < stepHistory.length - 1) {
                                                setViewingStepIndex((i) => i + 1);
                                                setPendingEvaluation(null);
                                            }
                                        }}
                                        disabled={viewingStepIndex >= stepHistory.length - 1}
                                        className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Forward <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </>
    );
}
