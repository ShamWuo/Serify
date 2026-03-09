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

function TeachStep({ content, onNext, readOnly, stepNumber, totalSteps }: {
    content: any; onNext: (r: string) => void; readOnly?: boolean;
    stepNumber?: number; totalSteps?: number;
}) {
    const quickChecks: any[] = content.quickChecks || [];
    const [answers, setAnswers] = useState<(number | null)[]>(Array(quickChecks.length).fill(null));
    const [qIdx, setQIdx] = useState(0);
    const allAnswered = quickChecks.length === 0 || answers.every((a) => a !== null);

    const handleSelect = (optIdx: number) => {
        if (readOnly || answers[qIdx] !== null) return;
        setAnswers((prev) => { const next = [...prev]; next[qIdx] = optIdx; return next; });
    };

    const currentQ = quickChecks[qIdx];
    const selected = currentQ ? answers[qIdx] : null;
    const answered = selected !== null;

    return (
        <div className="relative">
            {stepNumber && totalSteps && (
                <div className="absolute -top-4 -right-4 bg-[var(--surface)] px-2.5 py-1 rounded-bl-xl border-b border-l border-[var(--border)] text-[10px] font-bold text-[var(--muted)]/60 tracking-widest uppercase shadow-sm z-10">
                    Step {stepNumber} / {totalSteps}
                </div>
            )}

            <div className="prose-content flow-markdown text-[15.5px] mb-10 px-1">
                <MarkdownRenderer>{content.text}</MarkdownRenderer>
            </div>

            {quickChecks.length > 0 && (
                <div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--accent-soft)]/30 mb-8 shadow-sm">
                    <div className="px-5 py-4 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Brain size={14} className="text-[var(--accent)]" />
                            <p className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-widest">Knowledge Check</p>
                        </div>
                        {quickChecks.length > 1 && (
                            <div className="flex gap-1">
                                {quickChecks.map((_: any, i: number) => {
                                    let dot = 'h-1.5 rounded-full transition-all duration-200 ';
                                    if (i === qIdx) dot += 'w-4 bg-[var(--accent)]';
                                    else if (answers[i] !== null) dot += 'w-2 bg-emerald-500';
                                    else dot += 'w-2 bg-[var(--border)]';
                                    return <div key={i} className={dot} />;
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-5">
                        <div className="text-[15px] font-semibold text-[var(--text)] mb-5 leading-snug">
                            <MarkdownRenderer>{currentQ?.question}</MarkdownRenderer>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(currentQ?.options || []).map((opt: string, oIdx: number) => {
                                const isSelected = selected === oIdx;
                                const isCorrect = answered && oIdx === currentQ.correctIndex;
                                const isWrong = answered && isSelected && !isCorrect;

                                let cls = 'p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-all duration-200 shadow-sm ';
                                if (isCorrect) cls += 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10';
                                else if (isWrong) cls += 'border-rose-500 bg-rose-50 dark:bg-rose-500/10';
                                else if (isSelected) cls += 'border-[var(--accent)] bg-[var(--accent)]/5 ring-4 ring-[var(--accent)]/10';
                                else if (answered) cls += 'border-[var(--border)] bg-[var(--surface)] opacity-50';
                                else cls += 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 hover:-translate-y-0.5';

                                return (
                                    <button
                                        key={oIdx}
                                        onClick={() => handleSelect(oIdx)}
                                        disabled={answered || readOnly}
                                        className={cls}
                                    >
                                        <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-black transition-all ${isCorrect ? 'bg-emerald-500 border-emerald-500 text-white' :
                                            isWrong ? 'bg-rose-500 border-rose-500 text-white' :
                                                isSelected ? 'bg-[var(--accent)] border-[var(--accent)] text-white' :
                                                    'border-[var(--border)] text-[var(--muted)]'
                                            }`}>
                                            {isCorrect ? '✓' : isWrong ? '✗' : String.fromCharCode(65 + oIdx)}
                                        </div>
                                        <div className="text-[14px] leading-relaxed flex-1 pt-0.5 font-medium">
                                            <MarkdownRenderer>{opt}</MarkdownRenderer>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {quickChecks.length > 1 && (
                        <div className="px-4 py-3 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-between">
                            <button
                                onClick={() => setQIdx(p => Math.max(0, p - 1))}
                                disabled={qIdx === 0}
                                className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-all disabled:opacity-30"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-[11px] text-[var(--muted)] font-bold tracking-widest uppercase">
                                Question {qIdx + 1} of {quickChecks.length}
                            </span>
                            <button
                                onClick={() => setQIdx(p => Math.min(quickChecks.length - 1, p + 1))}
                                disabled={qIdx === quickChecks.length - 1}
                                className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-all disabled:opacity-30"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="flex mt-8">
                {readOnly ? <ReadOnlyNotice /> : (
                    <div className="flex items-center gap-4">
                        <ActionButton
                            label={allAnswered ? 'Continue' : `Answer all checks`}
                            icon={<ChevronRight size={16} />}
                            primary
                            onClick={() => onNext('completed_teach')}
                            disabled={!allAnswered}
                        />
                        {!allAnswered && <span className="text-[13px] text-[var(--muted)] italic animate-pulse">Verify understanding before moving on</span>}
                    </div>
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

function ReinforceStep({ content, onNext, readOnly, stepNumber, totalSteps }: {
    content: any; onNext: (r: string) => void; readOnly?: boolean;
    stepNumber?: number; totalSteps?: number;
}) {
    const isPathB = content.path === 'B';
    const isPathC = content.path === 'C';

    return (
        <div className="relative">
            {stepNumber && totalSteps && (
                <div className="absolute -top-4 -right-4 bg-[var(--surface)] px-2.5 py-1 rounded-bl-xl border-b border-l border-[var(--border)] text-[10px] font-bold text-[var(--muted)]/60 tracking-widest uppercase shadow-sm z-10">
                    Step {stepNumber} / {totalSteps}
                </div>
            )}

            <div className={`rounded-2xl border-2 transition-all duration-300 ${(isPathB || isPathC) ? 'border-amber-400/40 bg-amber-50/30' : 'border-transparent'}`}>
                {(isPathB || isPathC) && (
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-400/20">
                        <Replace size={14} className="text-amber-600" />
                        <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest">Alternative Explanation</p>
                    </div>
                )}

                <div className={`prose-content flow-markdown leading-relaxed text-[16px] ${(isPathB || isPathC) ? 'p-6' : 'px-1'}`}>
                    <MarkdownRenderer>{content.text}</MarkdownRenderer>
                </div>
            </div>

            <div className="flex mt-8 px-1">
                {readOnly ? <ReadOnlyNotice /> : (
                    <ActionButton label="Got it" primary icon={<ChevronRight size={16} />} onClick={() => onNext('got_it')} />
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
function ConceptCompleteCard({ conceptName, onNext, onReview, isLast }: {
    conceptName: string; onNext: () => void; onReview: () => void; isLast: boolean;
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
            <div className="flex flex-col sm:flex-row gap-3">
                <ActionButton
                    label="Review Concept"
                    icon={<BookOpen size={16} />}
                    onClick={onReview}
                />
                {isLast ? (
                    <ActionButton label="See Results 🎉" primary onClick={onNext} />
                ) : (
                    <ActionButton label="Continue to Next Concept" icon={<ChevronRight size={16} />} primary onClick={onNext} />
                )}
            </div>
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
    const [progress, setProgress] = useState(0);
    const [displayProgress, setDisplayProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('Initializing...');
    const [error, setError] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [sessionDone, setSessionDone] = useState(false);

    const currentConcept = flowSession?.initial_plan?.concepts?.[currentConceptIndex];
    const totalConcepts = flowSession?.initial_plan?.concepts?.length || 0;

    // Derived: the step we're currently displaying
    const displayStep = viewingStepIndex >= 0 ? stepHistory[viewingStepIndex] : null;
    const isReadOnly = viewingStepIndex >= 0 && viewingStepIndex < stepHistory.length - 1;
    const currentLiveStep = stepHistory[stepHistory.length - 1] ?? null;

    // Timer-based loading is now replaced by real-time SSE updates

    // Smooth count-up for percentage
    useEffect(() => {
        if (displayProgress < progress) {
            const timer = setTimeout(() => {
                setDisplayProgress(prev => Math.min(prev + 1, progress));
            }, 30);
            return () => clearTimeout(timer);
        } else if (displayProgress > progress) {
            setDisplayProgress(progress);
        }
    }, [displayProgress, progress]);

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
    const fetchNextStep = useCallback(async (retryOrchestrate = true) => {
        if (!flowSession || !currentConcept || stepping) return;
        setStepping(true);
        setPendingEvaluation(null);
        setError(null);
        setFetchError(null);

        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();

            // Try to get step directly
            const res = await fetch('/api/flow/step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
                body: JSON.stringify({ sessionId: flowSession.id, conceptId: currentConcept.conceptId }),
            });
            const data = await res.json();

            // If plan is not initialized, we need to orchestrate first
            if (!res.ok && data.error === 'Orchestrator plan not initialized. Call /api/flow/orchestrate first.' && retryOrchestrate) {
                console.log('[flow] Plan not initialized, triggering orchestration...');
                setStatusMessage('Generating learning path...');

                const orchRes = await fetch('/api/flow/orchestrate-stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
                    body: JSON.stringify({ sessionId: flowSession.id, conceptId: currentConcept.conceptId }),
                });

                if (!orchRes.ok) {
                    const orchData = await orchRes.json();
                    throw new Error(orchData.error || 'Orchestration failed');
                }

                const reader = orchRes.body?.getReader();
                const decoder = new TextDecoder();
                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const d = JSON.parse(line.slice(6));
                                    if (d.error) {
                                        setError(d.error);
                                        setStepping(false);
                                        return; // Stop processing
                                    }
                                    if (d.progress) setProgress(d.progress);
                                    if (d.status) setStatusMessage(d.status);
                                } catch (e) {
                                    console.error('Failed to parse SSE chunk', e);
                                }
                            }
                        }
                    }
                }

                // After orchestration, try fetching the step again (disable retry to avoid infinite loop)
                return fetchNextStep(false);
            }

            if (!res.ok) throw new Error(data.error || 'Step failed');

            if (data.stepHistory) {
                setStepHistory(data.stepHistory);
                setViewingStepIndex(data.stepHistory.length - 1);
            }

            if (data.action === 'concept_complete') {
                const alreadyDone = conceptStatuses[currentConcept.conceptId] === 'completed';
                const updatedCompleted = [...new Set([...(flowSession.concepts_completed || []), currentConcept.conceptId])];

                if (updatedCompleted.length > (flowSession.concepts_completed?.length || 0)) {
                    await supabase.from('flow_sessions').update({
                        concepts_completed: updatedCompleted,
                        last_activity_at: new Date().toISOString()
                    }).eq('id', flowSession.id);

                    const { data: curriculum } = await supabase.from('curricula').select('completed_concept_ids, concept_count').eq('id', flowSession.source_session_id).single();
                    const currCompleted = [...new Set([...(curriculum?.completed_concept_ids || []), currentConcept.conceptId])];

                    await supabase.from('curricula').update({
                        completed_concept_ids: currCompleted,
                        current_concept_index: currCompleted.length,
                        status: (curriculum?.concept_count && currCompleted.length >= curriculum.concept_count) ? 'completed' : 'active',
                        last_activity_at: new Date().toISOString()
                    }).eq('id', flowSession.source_session_id);

                    setFlowSession(prev => prev ? { ...prev, concepts_completed: updatedCompleted } : null);
                    setConceptStatuses((prev) => ({ ...prev, [currentConcept.conceptId]: 'completed' }));
                }

                if (!alreadyDone) {
                    setConceptJustCompleted(true);
                }
            } else {
                setConceptStatuses((prev) => ({ ...prev, [currentConcept.conceptId]: 'in_progress' }));
            }
        } catch (err: any) {
            console.error('Flow step error:', err);
            setFetchError(err.message || 'An unexpected error occurred');
        } finally {
            setStepping(false);
        }
    }, [flowSession, currentConcept, stepping, fetchError, conceptStatuses]);

    // ── Auto-fetch first step when concept changes ──────────
    useEffect(() => {
        if (flowSession && !stepping && currentConcept && !sessionDone && !conceptJustCompleted && stepHistory.length === 0 && !fetchError) {
            fetchNextStep();
        }
    }, [flowSession, currentConcept, sessionDone, stepping, conceptJustCompleted, stepHistory.length, fetchNextStep, fetchError]);

    // ── Handle "Got it / Continue" buttons ──────────────────
    const handleUserResponse = async (responseType: string) => {
        if (!displayStep || isReadOnly) return;

        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            await fetch('/api/flow/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
                body: JSON.stringify({ stepId: displayStep.id, userResponse: responseType }),
            });
        } catch (e) {
            console.error('Failed to record response', e);
        }

        fetchNextStep();
    };

    const handleEvaluated = (_response: string, evaluation: any) => {
        setPendingEvaluation(evaluation);
    };

    // ── Concept-complete advancement ────────────────────────
    const handleAdvanceConcept = () => {
        const nextIdx = currentConceptIndex + 1;
        setConceptJustCompleted(false);
        if (nextIdx < totalConcepts) {
            setCurrentConceptIndex(nextIdx);
            setStepHistory([]);
            setViewingStepIndex(-1);
            setPendingEvaluation(null);

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
        }
    };

    const handleReviewConcept = () => {
        setConceptJustCompleted(false);
        setFetchError(null);
        // Step history should already be populated from the mastery flow
        if (stepHistory.length > 0) {
            setViewingStepIndex(stepHistory.length - 1);
        }
    };

    const handleConceptSelect = (index: number) => {
        if (index === currentConceptIndex && !conceptJustCompleted) return;

        const targetConcept = flowSession?.initial_plan?.concepts?.[index];
        if (!targetConcept) return;

        setCurrentConceptIndex(index);
        setStepHistory([]);
        setViewingStepIndex(-1);
        setPendingEvaluation(null);
        setConceptJustCompleted(false);
        setError(null);
        setFetchError(null);
    };

    // ── Sidebar: load completed concept for review ──────────
    // const handleSidebarConceptClick = async (conceptIndex: number) => { // Replaced by handleConceptSelect
    //     const concept = flowSession?.initial_plan?.concepts?.[conceptIndex];
    //     if (!concept || !flowSession) return;
    //     const status = conceptStatuses[concept.conceptId];

    //     // Jump back to in-progress/completed concept, loading its history
    //     if (status === 'completed' || status === 'in_progress') {
    //         setStepping(true);
    //         setError(null);
    //         setConceptJustCompleted(false);
    //         try {
    //             const { data: { session: authSession } } = await supabase.auth.getSession();
    //             const res = await fetch(
    //                 `/api/flow/get-steps?sessionId=${flowSession.id}&conceptId=${concept.conceptId}`,
    //                 { headers: { Authorization: `Bearer ${authSession?.access_token}` } }
    //             );
    //             const data = await res.json();
    //             const steps: FlowStep[] = data.steps || [];
    //             setCurrentConceptIndex(conceptIndex);
    //             setStepHistory(steps);
    //             setViewingStepIndex(steps.length - 1);
    //             setPendingEvaluation(null);
    //             // If completed, show review mode
    //             if (status === 'completed') {
    //                 setConceptJustCompleted(true);
    //             }
    //         } catch (err: any) {
    //             setError(err.message);
    //         } finally {
    //             setStepping(false);
    //         }
    //     }
    //     // not_started: do nothing (no clicking ahead)
    // };

    // ── Render current visible step ─────────────────────────
    const renderStep = () => {
        if (!displayStep) return null;
        const { step_type, content, user_response } = displayStep;
        const savedAnswer = user_response || '';

        if (step_type === 'teach') {
            if (!content?.text) return (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-red-50/50 rounded-xl border border-red-100">
                    <ShieldAlert className="text-red-400 mb-2" size={24} />
                    <p className="text-sm font-medium text-red-600">Lesson content missing</p>
                    <p className="text-xs text-red-500/80 mt-1">Serify failed to generate the lesson text for this step.</p>
                    <button onClick={() => fetchNextStep()} className="mt-4 text-xs font-bold text-red-700 underline">Try Re-generating</button>
                </div>
            );
            return <TeachStep content={content} onNext={handleUserResponse} readOnly={isReadOnly} stepNumber={displayStep.step_number} totalSteps={stepHistory.length} />;
        }
        if (step_type === 'check' || step_type === 'confirm')
            return (
                <CheckQuestionStep content={content} stepId={displayStep.id} isEvaluated={!!pendingEvaluation || isReadOnly}
                    onEvaluated={handleEvaluated} readOnly={isReadOnly} savedAnswer={savedAnswer} />
            );
        if (step_type === 'reinforce') return <ReinforceStep content={content} onNext={handleUserResponse} readOnly={isReadOnly} stepNumber={displayStep.step_number} totalSteps={stepHistory.length} />;

        return (
            <div className="flex flex-col items-center justify-center p-8 text-[var(--muted)]">
                <Replace size={32} className="opacity-20 mb-3" />
                <p className="text-sm">Unknown step type: {step_type}</p>
            </div>
        );
    };

    // ────────────────────────────────────────────────────────
    // Render states
    // ────────────────────────────────────────────────────────

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 animate-fade-in">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full border-4 border-[var(--border)] border-t-[var(--accent)] animate-spin-slow" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 animate-pulse-subtle flex items-center justify-center">
                                <span className="text-[var(--accent)] font-bold text-lg">S</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 text-center">
                        <h2 className="text-xl font-semibold text-[var(--text)]">Serify is preparing your flow</h2>
                        <p className="text-[var(--muted)] animate-pulse-subtle">
                            Initializing personalized curriculum orchestration...
                        </p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }
    if (sessionDone)
        return (
            <DashboardLayout>
                <div className="max-w-xl mx-auto mt-16 text-center px-4">
                    <div className="text-6xl mb-6">🎉</div>
                    <h1 className="text-3xl font-display font-bold mb-3 text-[var(--text)]">Curriculum Complete!</h1>
                    <p className="text-[var(--muted)] mb-8">
                        You&apos;ve successfully mastered {totalConcepts} concept{totalConcepts !== 1 ? 's' : ''} in this curriculum path.
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
                        onConceptClick={handleConceptSelect}
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

                    {/* Error State */}
                    {fetchError && (
                        <div className="max-w-2xl mx-auto mb-8 bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-500/20 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
                                    <ShieldAlert size={24} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-rose-700 dark:text-rose-400 mb-1">Navigation Error</h3>
                                    <p className="text-[14px] text-rose-600/80 dark:text-rose-300/60 leading-relaxed mb-4">
                                        {fetchError}
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { setFetchError(null); fetchNextStep(); }}
                                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                                        >
                                            Retry Request
                                        </button>
                                        <button
                                            onClick={() => window.location.reload()}
                                            className="px-4 py-2 bg-white dark:bg-[var(--surface)] border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-lg transition-all"
                                        >
                                            Reload Page
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 md:p-8 min-h-[280px] shadow-sm">
                        {stepping ? (
                            <div className="flex flex-col items-center justify-center min-h-[320px] gap-8 animate-fade-in">
                                <div className="relative">
                                    {/* The core spinner */}
                                    <div className="w-20 h-20 rounded-full border-4 border-[var(--border)] border-t-[var(--accent)] animate-spin-slow transition-all duration-300 relative z-10"
                                        style={{
                                            borderTopColor: 'var(--accent)',
                                            borderRightColor: progress > 50 ? 'var(--accent)' : 'transparent',
                                            borderBottomColor: progress > 75 ? 'var(--accent)' : 'transparent'
                                        }}
                                    />

                                    {/* Center percentage */}
                                    <div className="absolute inset-0 flex items-center justify-center z-20">
                                        <div className="flex flex-col items-center">
                                            <span className="text-sm font-black text-[var(--accent)] transition-none">
                                                {displayProgress}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center gap-4 text-center max-w-sm animate-fade-in-up">
                                    <div className="space-y-1">
                                        <span className="text-lg font-semibold text-[var(--text)] block">
                                            {statusMessage}
                                        </span>
                                        <span className="text-xs font-medium text-[var(--accent)] tracking-widest uppercase opacity-70">
                                            {progress < 40 ? "Phase 1: Knowledge Extraction" :
                                                progress < 80 ? "Phase 2: Path Architecture" :
                                                    "Phase 3: Finalizing Steps"}
                                        </span>
                                    </div>

                                    <div className="w-56 h-2 bg-[var(--border)] rounded-full overflow-hidden relative shadow-inner">
                                        <div
                                            className="h-full bg-[var(--accent)] transition-all duration-300 rounded-full relative overflow-hidden"
                                            style={{ width: `${progress}%` }}
                                        >
                                            {/* Shimmer effect inside progress */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer"
                                                style={{ animationDuration: '2s' }} />
                                        </div>
                                    </div>

                                    <p className="text-xs text-[var(--muted)] leading-relaxed animate-pulse-subtle">
                                        Tailoring this concept based on your mastery profile...
                                    </p>
                                </div>
                            </div>
                        ) : conceptJustCompleted ? (
                            /* Show interstitial trophy screen when concept is mastered */
                            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 shadow-sm">
                                <ConceptCompleteCard
                                    conceptName={currentConcept?.conceptName || ''}
                                    onNext={handleAdvanceConcept}
                                    onReview={handleReviewConcept}
                                    isLast={currentConceptIndex === totalConcepts - 1}
                                />
                            </div>
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
            </DashboardLayout >
        </>
    );
}
