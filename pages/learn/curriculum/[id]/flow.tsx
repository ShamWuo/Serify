import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
    Zap,
    Brain,
    Loader2,
    ChevronRight,
    CheckCircle2,
    BookOpen,
    HelpCircle,
    Target,
    Route,
    ShieldAlert,
    Replace,
    Send,
    Layers
} from 'lucide-react';
import { FlowSession, FlowStep, FlowStepType } from '@/types/serify';

// Flow Mode internal components
function ProgressBar({
    concepts,
    currentConceptId
}: {
    concepts: any[];
    currentConceptId?: string;
}) {
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
            <span className="text-xs text-[var(--muted)] whitespace-nowrap">
                {done}/{total} concepts
            </span>
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
        confirm: <CheckCircle2 size={16} />
    };
    return MAP[type] || <Zap size={16} />;
}

function ActionButton({
    label,
    icon,
    primary,
    secondary,
    onClick,
    disabled
}: {
    label: string;
    icon?: JSX.Element;
    primary?: boolean;
    secondary?: boolean;
    onClick: () => void;
    disabled?: boolean;
}) {
    const bg = primary ? 'var(--accent)' : secondary ? 'transparent' : 'var(--surface)';
    const border = primary ? 'var(--accent)' : secondary ? 'var(--border)' : 'var(--border)';
    const text = primary ? 'white' : 'var(--text-primary)';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: bg,
                color: text,
                border: `1.5px solid ${border}`,
                borderRadius: 10,
                padding: '9px 18px',
                fontSize: 14,
                fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                transition: 'all 0.15s'
            }}
        >
            {icon}
            {label}
        </button>
    );
}

function OrientStep({ content, onNext }: { content: any; onNext: (response: string) => void }) {
    return (
        <div>
            <p className="text-xs text-[var(--accent)] font-bold uppercase tracking-widest mb-2 flex items-center">
                <Target size={14} className="mr-1.5" /> Orientation
            </p>
            <div className="leading-relaxed text-[15.5px] flow-markdown">
                <ReactMarkdown>{content.text}</ReactMarkdown>
            </div>
            <div className="flex mt-5">
                <ActionButton
                    label="Got it"
                    icon={<ChevronRight size={16} />}
                    primary
                    onClick={() => onNext('got_it')}
                />
            </div>
        </div>
    );
}

function BuildLayerStep({ content, onNext }: { content: any; onNext: (response: string) => void }) {
    const isMechanism = content.layerType === 'mechanism';
    const isExample = content.layerType === 'example';
    const isConnection = content.layerType === 'connection';

    let containerClass = 'mb-4 flow-markdown';
    if (isMechanism)
        containerClass +=
            ' font-mono bg-[var(--surface-2,var(--surface))] p-4 rounded-xl border border-[var(--border)]';
    if (isExample)
        containerClass += ' bg-[var(--accent)]/5 border border-[var(--accent)]/20 p-5 rounded-xl';
    if (isConnection) containerClass += ' border-l-4 border-[var(--accent)] pl-4';

    return (
        <div>
            <div className={containerClass}>
                <div className="leading-relaxed text-[15.5px]">
                    <ReactMarkdown>{content.text}</ReactMarkdown>
                </div>
            </div>
            <div className="flex mt-5">
                <ActionButton
                    label="Continue"
                    icon={<ChevronRight size={16} />}
                    primary
                    onClick={() => onNext('continue')}
                />
            </div>
        </div>
    );
}

function AnchorStep({ content, onNext }: { content: any; onNext: (response: string) => void }) {
    return (
        <div>
            <div className="leading-relaxed text-[15.5px] flow-markdown">
                <ReactMarkdown>{content.text}</ReactMarkdown>
            </div>
            <div className="flex gap-2.5 mt-6">
                <ActionButton label="Makes sense" primary onClick={() => onNext('makes_sense')} />
                <ActionButton
                    label="That doesn't help"
                    secondary
                    onClick={() => onNext('needs_work')}
                />
            </div>
        </div>
    );
}

function CheckQuestionStep({
    content,
    stepId,
    isEvaluated,
    onEvaluated
}: {
    content: any;
    stepId: string;
    isEvaluated: boolean;
    onEvaluated: (response: string, evaluation: any) => void;
}) {
    const [answer, setAnswer] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        if (!answer.trim() || submitting) return;
        setSubmitting(true);
        try {
            const {
                data: { session }
            } = await supabase.auth.getSession();
            const res = await fetch('/api/flow/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ stepId, userResponse: answer })
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
                <ReactMarkdown>{content.questionText}</ReactMarkdown>
            </div>
            <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
                }}
                disabled={isEvaluated || submitting}
                placeholder="Type your answer here…"
                rows={4}
                className="w-full bg-[var(--surface)] border-2 border-[var(--border)] text-[var(--text)] rounded-xl p-3.5 text-[14.5px] leading-relaxed resize-y focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--muted)]/50"
            />
            {!isEvaluated && (
                <div className="flex justify-end mt-3">
                    <ActionButton
                        label={submitting ? 'Evaluating…' : 'Submit'}
                        icon={
                            submitting ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Send size={16} />
                            )
                        }
                        primary
                        onClick={submit}
                        disabled={!answer.trim() || submitting}
                    />
                </div>
            )}
        </div>
    );
}

function ReinforceStep({ content, onNext }: { content: any; onNext: (response: string) => void }) {
    const isPathB = content.path === 'B';
    const bgClass = isPathB ? 'bg-amber-50 border border-amber-500/40 p-5' : '';

    return (
        <div className={`rounded-xl ${bgClass}`}>
            {isPathB && (
                <p className="text-xs font-bold text-amber-500 uppercase mb-2 tracking-wider">
                    Alternative Angle
                </p>
            )}
            <p className="leading-relaxed text-[15.5px]">{content.text}</p>
            <div className="flex mt-6">
                <ActionButton
                    label="I see now"
                    primary
                    icon={<ChevronRight size={16} />}
                    onClick={() => onNext('got_it')}
                />
            </div>
        </div>
    );
}

function EvaluationBanner({ evaluation, onContinue }: { evaluation: any; onContinue: () => void }) {
    let bgColor = 'var(--surface)';
    let borderColor = 'var(--border)';
    let textColor = 'var(--text-primary)';
    let headerText = 'Review';
    let headerColor = 'var(--text-muted)';

    if (evaluation.path === 'A') {
        bgColor = '#22c55e10';
        borderColor = '#22c55e40';
        headerColor = '#22c55e';
        headerText = '✓ Excellent';
    } else if (evaluation.path === 'B') {
        bgColor = '#eab30810';
        borderColor = '#eab30840';
        headerColor = '#eab308';
        headerText = '◑ Almost there';
    } else {
        headerText = "Let's align";
    }

    return (
        <div
            style={{ background: bgColor, border: `1.5px solid ${borderColor}` }}
            className="rounded-xl p-5 mt-6"
        >
            <p
                style={{ color: headerColor }}
                className="font-bold text-xs uppercase tracking-wider mb-2"
            >
                {headerText}
            </p>
            <div
                className="text-[15px] mb-4 leading-relaxed flow-markdown"
                style={{ color: textColor }}
            >
                <ReactMarkdown>{evaluation.feedbackText}</ReactMarkdown>
            </div>
            <ActionButton
                label="Continue"
                icon={<ChevronRight size={16} />}
                primary
                onClick={onContinue}
            />
        </div>
    );
}

export default function CurriculumFlowSessionPage() {
    const router = useRouter();
    const { id: curriculumId } = router.query as { id?: string };
    const { user, loading: authLoading } = useAuth();

    const [flowSessionId, setFlowSessionId] = useState<string | null>(null);
    const [flowSession, setFlowSession] = useState<FlowSession | null>(null);
    const [currentConceptIndex, setCurrentConceptIndex] = useState(0);
    const [currentStep, setCurrentStep] = useState<FlowStep | null>(null);
    const [pendingEvaluation, setPendingEvaluation] = useState<any | null>(null);
    const [stepHistory, setStepHistory] = useState<FlowStep[]>([]);
    const [conceptStatuses, setConceptStatuses] = useState<
        Record<string, 'not_started' | 'in_progress' | 'completed'>
    >({});

    // UI State
    const [loading, setLoading] = useState(true);
    const [stepping, setStepping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sessionDone, setSessionDone] = useState(false);

    const currentConcept = flowSession?.initial_plan?.concepts?.[currentConceptIndex];
    const totalConcepts = flowSession?.initial_plan?.concepts?.length || 0;

    // 1. Initialize Curriculum Flow Session
    useEffect(() => {
        if (authLoading) return;
        if (!curriculumId || !user) {
            setLoading(false);
            return;
        }

        const initFlow = async () => {
            setLoading(true);
            try {
                const {
                    data: { session }
                } = await supabase.auth.getSession();
                const res = await fetch('/api/serify/start-curriculum-flow', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({ curriculumId })
                });

                const data = await res.json();
                if (!res.ok) {
                    if (data.error === 'Curriculum already completed') {
                        setSessionDone(true);
                        setLoading(false);
                        return;
                    }
                    throw new Error(data.error || 'Failed to initialize session');
                }

                setFlowSessionId(data.flowSessionId);
            } catch (err: any) {
                setError(err.message);
                setLoading(false);
            }
        };

        initFlow();
    }, [curriculumId, user, authLoading]);

    // 2. Fetch the newly created flow_session data
    useEffect(() => {
        if (!flowSessionId) return;

        (async () => {
            const { data, error: dbErr } = await supabase
                .from('flow_sessions')
                .select('*')
                .eq('id', flowSessionId)
                .single();

            if (dbErr || !data) {
                setError('Flow Engine connection lost.');
                setLoading(false);
                return;
            }
            setFlowSession(data as FlowSession);

            const statuses: Record<string, 'not_started' | 'in_progress' | 'completed'> = {};
            let firstUncompletedIndex = -1;

            (data.initial_plan?.concepts || []).forEach((c: any, idx: number) => {
                const isCompleted = data.concepts_completed.includes(c.conceptId);
                statuses[c.conceptId] = isCompleted ? 'completed' : 'not_started';
                if (!isCompleted && firstUncompletedIndex === -1) {
                    firstUncompletedIndex = idx;
                }
            });

            setConceptStatuses(statuses);

            if (firstUncompletedIndex !== -1) {
                setCurrentConceptIndex(firstUncompletedIndex);
            } else if ((data.initial_plan?.concepts?.length || 0) > 0) {
                setCurrentConceptIndex(data.initial_plan.concepts.length - 1);
                setSessionDone(true);
            }

            setLoading(false);
        })();
    }, [flowSessionId]);

    const fetchNextStep = useCallback(async () => {
        if (!flowSession || !currentConcept || stepping) return;
        setStepping(true);
        setPendingEvaluation(null);
        setError(null);

        try {
            const {
                data: { session: authSession }
            } = await supabase.auth.getSession();

            // Setup orchestrator plan if needed
            const { data: progress } = await supabase
                .from('flow_concept_progress')
                .select('orchestrator_plan')
                .eq('flow_session_id', flowSession.id)
                .eq('concept_id', currentConcept.conceptId)
                .maybeSingle();

            if (!progress || !progress.orchestrator_plan) {
                await fetch('/api/flow/orchestrate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authSession?.access_token}`
                    },
                    body: JSON.stringify({
                        sessionId: flowSession.id,
                        conceptId: currentConcept.conceptId
                    })
                });
            }

            // Step forward
            const res = await fetch('/api/flow/step', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authSession?.access_token}`
                },
                body: JSON.stringify({
                    sessionId: flowSession.id,
                    conceptId: currentConcept.conceptId
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Step failed');

            if (data.action === 'concept_complete') {
                const updatedConceptsCompleted = [
                    ...(flowSession.concepts_completed || []),
                    currentConcept.conceptId
                ];
                await supabase
                    .from('flow_sessions')
                    .update({ concepts_completed: updatedConceptsCompleted })
                    .eq('id', flowSession.id);

                setConceptStatuses((prev) => ({
                    ...prev,
                    [currentConcept.conceptId]: 'completed'
                }));

                if (currentConceptIndex + 1 < totalConcepts) {
                    setCurrentConceptIndex((i) => i + 1);
                    setCurrentStep(null);
                    setStepHistory([]);
                } else {
                    setSessionDone(true);
                }
            } else {
                setCurrentStep(data.step);
                if (data.stepHistory) {
                    setStepHistory(data.stepHistory);
                } else {
                    setStepHistory((prev) => [...prev, data.step]);
                }
                setConceptStatuses((prev) => ({
                    ...prev,
                    [currentConcept.conceptId]: 'in_progress'
                }));
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setStepping(false);
        }
    }, [flowSession, currentConcept, currentConceptIndex, totalConcepts, stepping]);

    // 3. Step fetching engine
    useEffect(() => {
        if (flowSession && !currentStep && !stepping && currentConcept && !sessionDone) {
            fetchNextStep();
        }
    }, [flowSession, currentConcept, sessionDone, currentStep, fetchNextStep, stepping]);

    const handleUserResponse = async (responseType: string) => {
        if (!currentStep) return;

        supabase.auth.getSession().then(({ data: { session } }) => {
            fetch('/api/flow/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ stepId: currentStep.id, userResponse: responseType })
            }).catch(() => {});
        });

        fetchNextStep();
    };

    const handleEvaluated = (response: string, evaluation: any) => {
        setPendingEvaluation(evaluation);
    };

    const renderStep = () => {
        if (!currentStep) return null;
        const { step_type, content } = currentStep;
        const onSimpleNext = (r: string) => handleUserResponse(r);

        if (step_type === 'orient') return <OrientStep content={content} onNext={onSimpleNext} />;
        if (step_type === 'build_layer')
            return <BuildLayerStep content={content} onNext={onSimpleNext} />;
        if (step_type === 'anchor') return <AnchorStep content={content} onNext={onSimpleNext} />;
        if (step_type === 'check' || step_type === 'confirm')
            return (
                <CheckQuestionStep
                    content={content}
                    stepId={currentStep.id}
                    isEvaluated={!!pendingEvaluation}
                    onEvaluated={handleEvaluated}
                />
            );
        if (step_type === 'reinforce')
            return <ReinforceStep content={content} onNext={onSimpleNext} />;

        return null;
    };

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
                    <h1 className="text-3xl font-display font-bold mb-3 text-[var(--text)]">
                        Curriculum Complete!
                    </h1>
                    <p className="text-[var(--muted)] mb-8">
                        You&apos;ve successfully mastered {totalConcepts} concept
                        {totalConcepts !== 1 ? 's' : ''} in this curriculum path.
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <ActionButton
                            label="Back to Curriculum"
                            onClick={() => router.push(`/learn/curriculum/${curriculumId}`)}
                        />
                        <ActionButton
                            label="Go to Vault"
                            primary
                            onClick={() => router.push('/vault')}
                        />
                    </div>
                </div>
            </DashboardLayout>
        );

    return (
        <>
            <Head>
                <title>Flow Mode — {currentConcept?.conceptName || 'Loading'}</title>
            </Head>
            <DashboardLayout>
                <div className="max-w-3xl mx-auto px-4 py-8 relative">
                    {/* Header Context */}
                    <div className="mb-6">
                        {flowSession && (
                            <ProgressBar
                                concepts={(flowSession.initial_plan?.concepts || []).map((c) => ({
                                    ...c,
                                    status: conceptStatuses[c.conceptId] || 'not_started'
                                }))}
                                currentConceptId={currentConcept?.conceptId}
                            />
                        )}
                        <div className="flex items-center gap-3 mt-4">
                            <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-xl px-4 py-2 text-sm font-bold text-[var(--accent)] truncate max-w-sm">
                                {currentConcept?.conceptName || '—'}
                            </div>
                            {currentStep && (
                                <span className="text-sm text-[var(--muted)] flex items-center gap-1.5 uppercase tracking-widest font-semibold text-[10px]">
                                    <StepIcon type={currentStep.step_type as FlowStepType} />
                                    {currentStep.step_type.replace(/_/g, ' ')}
                                </span>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-500 text-red-600 rounded-xl p-4 mb-4 text-sm flex items-center justify-between">
                            <span>{error}</span>
                            <button
                                onClick={() => fetchNextStep()}
                                className="underline font-medium hover:text-red-700"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Main Step Engine */}
                    <div className="bg-[var(--surface)] border-[1.5px] border-[var(--border)] rounded-2xl p-6 md:p-8 min-h-[260px] shadow-sm relative z-10 transition-all duration-300">
                        {stepping ? (
                            <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 text-[var(--muted)]">
                                <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
                                <span className="text-sm">Orchestrating next connection…</span>
                            </div>
                        ) : (
                            <>
                                {renderStep()}
                                {pendingEvaluation && (
                                    <EvaluationBanner
                                        evaluation={pendingEvaluation}
                                        onContinue={() => fetchNextStep()}
                                    />
                                )}
                            </>
                        )}
                    </div>

                    {/* Breadcrumbs History */}
                    {stepHistory.length > 1 && (
                        <div className="mt-6 flex gap-2 flex-wrap">
                            {stepHistory.slice(0, -1).map((s, i) => (
                                <div
                                    key={s.id}
                                    className="text-[11px] text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2.5 py-1 flex items-center gap-1.5 opacity-60"
                                >
                                    <StepIcon type={s.step_type as FlowStepType} />
                                    {s.step_type.replace(/_/g, ' ')}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </>
    );
}
