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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div
                style={{
                    flex: 1,
                    height: 6,
                    background: 'var(--border)',
                    borderRadius: 99,
                    overflow: 'hidden'
                }}
            >
                <div
                    style={{
                        height: '100%',
                        width: `${total ? (done / total) * 100 : 0}%`,
                        background: 'var(--accent)',
                        borderRadius: 99,
                        transition: 'width 0.5s ease'
                    }}
                />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
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
            <p
                style={{
                    fontSize: 13,
                    color: 'var(--accent)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    marginBottom: 8
                }}
            >
                <Target size={14} style={{ display: 'inline', marginRight: 6, marginBottom: -2 }} />
                Orientation
            </p>
            <div style={{ lineHeight: 1.8, fontSize: 16 }} className="flow-markdown">
                <ReactMarkdown>{content.text}</ReactMarkdown>
            </div>
            <div style={{ display: 'flex', marginTop: 20 }}>
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

    let containerStyle: React.CSSProperties = { marginBottom: 16 };
    let textStyle: React.CSSProperties = { lineHeight: 1.8, fontSize: 15.5 };

    if (isMechanism) {
        textStyle = {
            ...textStyle,
            fontFamily: 'monospace',
            background: 'var(--surface-2, var(--surface))',
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid var(--border)'
        };
    } else if (isExample) {
        containerStyle = {
            ...containerStyle,
            background: 'var(--accent)08',
            border: '1px solid var(--accent)20',
            padding: '16px 20px',
            borderRadius: 12
        };
    } else if (isConnection) {
        containerStyle = {
            ...containerStyle,
            borderLeft: '4px solid var(--accent)',
            paddingLeft: 16
        };
    }

    return (
        <div>
            <div
                style={containerStyle}
                className={isMechanism ? 'flow-markdown font-mono' : 'flow-markdown'}
            >
                <div style={textStyle}>
                    <ReactMarkdown>{content.text}</ReactMarkdown>
                </div>
            </div>
            <div style={{ display: 'flex', marginTop: 20 }}>
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
            <div style={{ lineHeight: 1.8, fontSize: 15.5 }} className="flow-markdown">
                <ReactMarkdown>{content.text}</ReactMarkdown>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
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
            <div
                style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}
                className="flow-markdown"
            >
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
                style={{
                    width: '100%',
                    background: 'var(--surface)',
                    border: '1.5px solid var(--border)',
                    color: 'var(--text-primary)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 14.5,
                    lineHeight: 1.6,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box'
                }}
            />
            {!isEvaluated && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <ActionButton
                        label={submitting ? 'Evaluating…' : 'Submit'}
                        icon={
                            submitting ? (
                                <Loader2
                                    size={16}
                                    style={{ animation: 'spin 1s linear infinite' }}
                                />
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
    const isPathC = content.path === 'C';

    const borderStyle = isPathB ? '1px solid #eab30840' : '1px solid var(--border)';
    const bgStyle = isPathB ? '#eab3080a' : 'transparent';

    return (
        <div
            style={{
                background: bgStyle,
                border: borderStyle,
                padding: isPathB ? '16px 20px' : 0,
                borderRadius: 12
            }}
        >
            {isPathB && (
                <p
                    style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#eab308',
                        textTransform: 'uppercase',
                        marginBottom: 8,
                        letterSpacing: 0.5
                    }}
                >
                    Alternative Angle
                </p>
            )}
            <p style={{ lineHeight: 1.8, fontSize: 15.5 }}>{content.text}</p>
            <div style={{ display: 'flex', marginTop: 24 }}>
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
            style={{
                background: bgColor,
                border: `1.5px solid ${borderColor}`,
                borderRadius: 12,
                padding: '16px 20px',
                marginTop: 24
            }}
        >
            <p
                style={{
                    fontWeight: 700,
                    color: headerColor,
                    marginBottom: 8,
                    fontSize: 13,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                }}
            >
                {headerText}
            </p>
            <div
                style={{ fontSize: 15, color: textColor, margin: '0 0 16px', lineHeight: 1.6 }}
                className="flow-markdown"
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

export default function FlowSessionPage() {
    const router = useRouter();
    const { id } = router.query as { id?: string };
    const { user, loading: authLoading } = useAuth();

    const [flowSession, setFlowSession] = useState<FlowSession | null>(null);
    const [currentConceptIndex, setCurrentConceptIndex] = useState(0);
    const [currentStep, setCurrentStep] = useState<FlowStep | null>(null);
    const [pendingEvaluation, setPendingEvaluation] = useState<any | null>(null);
    const [stepHistory, setStepHistory] = useState<FlowStep[]>([]);
    const [conceptStatuses, setConceptStatuses] = useState<
        Record<string, 'not_started' | 'in_progress' | 'completed'>
    >({});
    const [loading, setLoading] = useState(true);
    const [stepping, setStepping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sessionDone, setSessionDone] = useState(false);

    const currentConcept = flowSession?.initial_plan?.concepts?.[currentConceptIndex];
    const totalConcepts = flowSession?.initial_plan?.concepts?.length || 0;

    useEffect(() => {
        if (authLoading) return;
        if (!id || !user) {
            setLoading(false);
            return;
        }
        (async () => {
            setLoading(true);
            const { data, error: dbErr } = await supabase
                .from('flow_sessions')
                .select('*')
                .eq('id', id)
                .single();

            if (dbErr || !data) {
                setError('Session not found.');
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
    }, [id, user, authLoading]);

    const fetchNextStep = useCallback(async () => {
        if (!flowSession || !currentConcept || stepping) return;
        setStepping(true);
        setPendingEvaluation(null);
        setError(null);

        try {
            const {
                data: { session: authSession }
            } = await supabase.auth.getSession();

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
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '60vh'
                    }}
                >
                    <Loader2
                        size={36}
                        style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }}
                    />
                </div>
            </DashboardLayout>
        );

    if (sessionDone)
        return (
            <DashboardLayout>
                <div
                    style={{
                        maxWidth: 600,
                        margin: '4rem auto',
                        textAlign: 'center',
                        padding: '0 1rem'
                    }}
                >
                    <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>
                        Flow complete!
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>
                        You worked through {totalConcepts} concept{totalConcepts !== 1 ? 's' : ''}{' '}
                        in this session.
                    </p>
                    <div
                        style={{
                            display: 'flex',
                            gap: 12,
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                        }}
                    >
                        <ActionButton label="Back to Vault" onClick={() => router.push('/vault')} />
                        <ActionButton
                            label="New Flow Session"
                            primary
                            onClick={() => router.push('/flow')}
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
                <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem' }}>
                    {}
                    <div style={{ marginBottom: 20 }}>
                        {flowSession && (
                            <ProgressBar
                                concepts={(flowSession.initial_plan?.concepts || []).map((c) => ({
                                    ...c,
                                    status: conceptStatuses[c.conceptId] || 'not_started'
                                }))}
                                currentConceptId={currentConcept?.conceptId}
                            />
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                                style={{
                                    background: 'linear-gradient(135deg, #7c3aed22, #4f46e522)',
                                    border: '1px solid #7c3aed55',
                                    borderRadius: 10,
                                    padding: '6px 12px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: '#a78bfa'
                                }}
                            >
                                {currentConcept?.conceptName || '—'}
                            </div>
                            {currentStep && (
                                <span
                                    style={{
                                        fontSize: 12,
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4
                                    }}
                                >
                                    <StepIcon type={currentStep.step_type as FlowStepType} />
                                    {currentStep.step_type.replace(/_/g, ' ')}
                                </span>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div
                            style={{
                                background: '#ef444420',
                                border: '1px solid #ef4444',
                                color: '#ef4444',
                                borderRadius: 10,
                                padding: '12px 16px',
                                marginBottom: 16,
                                fontSize: 14
                            }}
                        >
                            {error}
                            <button
                                onClick={() => fetchNextStep()}
                                style={{
                                    marginLeft: 12,
                                    cursor: 'pointer',
                                    background: 'none',
                                    border: 'none',
                                    color: '#ef4444',
                                    textDecoration: 'underline',
                                    fontSize: 13
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {}
                    <div
                        style={{
                            background: 'var(--surface)',
                            border: '1.5px solid var(--border)',
                            borderRadius: 18,
                            padding: '1.75rem 2rem',
                            minHeight: 220,
                            transition: 'all 0.2s'
                        }}
                    >
                        {stepping ? (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: 180,
                                    gap: 14,
                                    color: 'var(--text-muted)'
                                }}
                            >
                                <Loader2
                                    size={30}
                                    style={{
                                        animation: 'spin 1s linear infinite',
                                        color: 'var(--accent)'
                                    }}
                                />
                                <span style={{ fontSize: 14 }}>
                                    Orchestrating the next connection…
                                </span>
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

                    {}
                    {stepHistory.length > 1 && (
                        <div style={{ marginTop: 20, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {stepHistory.slice(0, -1).map((s, i) => (
                                <div
                                    key={s.id}
                                    style={{
                                        fontSize: 11,
                                        color: 'var(--text-muted)',
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 6,
                                        padding: '3px 8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4
                                    }}
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
