import React, { useState, useEffect, useCallback, useRef } from 'react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
    BookOpen, Brain, Loader2, ChevronRight, ChevronLeft, CheckCircle2,
    HelpCircle, Target, Route, ShieldAlert, Replace, Send,
    Layers, Trophy, Lock, AlertTriangle
} from 'lucide-react';
import { FlowSession, FlowStep, FlowStepType } from '@/types/serify';
import { normalizeTitle } from '@/lib/formatters';
import CurriculumSidebar from '@/components/dashboard/CurriculumSidebar';
import { useUsage } from '@/hooks/useUsage';
import { UsageGate, UsageWarning } from '@/components/billing/UsageEnforcement';
import confetti from 'canvas-confetti';

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
    const MAP: Partial<Record<string, React.ReactNode>> = {
        orient: <Target size={16} />,
        build_layer: <Layers size={16} />,
        anchor: <BookOpen size={16} />,
        check: <HelpCircle size={16} />,
        reinforce: <Replace size={16} />,
        confirm: <CheckCircle2 size={16} />,
    };
    return MAP[type] || <Brain size={16} />;
}

function ActionButton({ label, icon, primary, secondary, onClick, disabled }: {
    label: string; icon?: React.ReactNode; primary?: boolean; secondary?: boolean;
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

function ReadOnlyNotice() {
    return (
        <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5">
            <BookOpen size={12} /> Reviewing past step
        </div>
    );
}

function TeachStep({ content, onNext, readOnly, stepNumber, totalSteps, savedAnswer }: {
    content: any; onNext: (r: string) => void; readOnly?: boolean;
    stepNumber?: number; totalSteps?: number; savedAnswer?: string;
}) {
    const quickChecks: any[] = content.quickChecks || [];

    const initializeAnswers = () => {
        if (savedAnswer) {
            try {
                const parsed = JSON.parse(savedAnswer);
                if (parsed.answers) return parsed.answers;
            } catch (e) {
                
            }
        }
        return Array(quickChecks.length).fill(null);
    };

    const [answers, setAnswers] = useState<(number | null)[]>(initializeAnswers);
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

            <div className="prose-content flow-markdown text-[15.5px] mb-2 px-1 text-balance">
                <MarkdownRenderer>{content.text}</MarkdownRenderer>
            </div>

            {quickChecks.length > 0 && (
                <div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--surface)] mb-2 shadow-sm">
                    <div className="px-5 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BookOpen size={16} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.15em]">Knowledge Check</span>
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

                    <div className="p-4">
                        {content.accelerated && (
                            <div className="flex items-center gap-1.5 mb-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-1.5 rounded-lg w-fit animate-in fade-in slide-in-from-top-2 duration-500">
                                <BookOpen size={14} className="text-amber-500 fill-amber-500" />
                                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Accelerated Path — Based on your mastery</span>
                            </div>
                        )}

                        <div className="text-[15px] font-semibold text-[var(--text)] mb-3 leading-snug">
                            <MarkdownRenderer>{currentQ?.question}</MarkdownRenderer>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(currentQ?.options || []).map((opt: string, oIdx: number) => {
                                const isSelected = selected === oIdx;
                                const isCorrect = answered && oIdx === currentQ.correctIndex;
                                const isWrong = answered && isSelected && !isCorrect;

                                let cls = 'p-4 rounded-2xl border-2 text-left flex items-center gap-3 transition-all duration-200 group relative overflow-hidden shadow-sm ';
                                if (isCorrect) cls += 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-emerald-500/10';
                                else if (isWrong) cls += 'border-rose-500 bg-rose-50 dark:bg-rose-500/10 shadow-rose-500/10';
                                else if (isSelected) cls += 'border-[var(--accent)] bg-[var(--accent)]/5 ring-4 ring-[var(--accent)]/10';
                                else if (answered) cls += 'border-[var(--border)] bg-[var(--surface)] opacity-40 grayscale';
                                else cls += 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40 hover:-translate-y-0.5 hover:shadow-md';

                                return (
                                    <button
                                        key={oIdx}
                                        onClick={() => handleSelect(oIdx)}
                                        disabled={answered || readOnly}
                                        className={cls}
                                    >
                                        <div className={`shrink-0 w-8 h-8 rounded-xl border-2 flex items-center justify-center text-[11px] font-black transition-all ${
                                            isCorrect ? 'bg-emerald-500 border-emerald-500 text-white' :
                                            isWrong ? 'bg-rose-500 border-rose-500 text-white' :
                                            isSelected ? 'bg-[var(--accent)] border-[var(--accent)] text-white' :
                                            'border-[var(--border)] text-[var(--muted)] group-hover:border-[var(--accent)]/50 group-hover:text-[var(--accent)]'
                                        }`}>
                                            {isCorrect ? '✓' : isWrong ? '✗' : String.fromCharCode(65 + oIdx)}
                                        </div>
                                        <div className="text-[14px] leading-snug flex-1 font-medium">
                                            <MarkdownRenderer>{opt}</MarkdownRenderer>
                                        </div>
                                        {isCorrect && (
                                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                        )}
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

            <div className="flex mt-4">
                {readOnly ? <ReadOnlyNotice /> : (
                    <div className="flex items-center gap-4">
                        <ActionButton
                            label={allAnswered ? 'Continue' : `Answer all checks`}
                            icon={<ChevronRight size={16} />}
                            primary
                            onClick={() => onNext(JSON.stringify({ type: 'completed_teach', answers }))}
                            disabled={!allAnswered}
                        />
                        {!allAnswered && <span className="text-[13px] text-[var(--muted)] italic animate-pulse">Verify understanding before moving on</span>}
                    </div>
                )}
            </div>
        </div>
    );
}

function ApplicationStep({ content, stepId, isEvaluated, onEvaluated, readOnly, savedAnswer }: {
    content: any; stepId: string; isEvaluated: boolean;
    onEvaluated: (response: string, evaluation: any) => void;
    readOnly?: boolean; savedAnswer?: string;
}) {
    const [answer, setAnswer] = useState(savedAnswer || '');
    const [submitting, setSubmitting] = useState(false);
    const [showHint, setShowHint] = useState(false);

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
        } catch (e) {
            console.error('Failed to submit application', e);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-6 bg-[var(--accent)]/5 border border-[var(--accent)]/10 p-4 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
                    <Target size={20} className="text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-[var(--accent)] uppercase tracking-widest">Active Application</h3>
                    <p className="text-xs text-[var(--muted)]">Put theory into practice by completing the task below.</p>
                </div>
            </div>

            <div className="prose-content flow-markdown text-[16px] mb-4 bg-[var(--bg)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
                <MarkdownRenderer>{content.taskPrompt}</MarkdownRenderer>
            </div>

            {content.hint && !isEvaluated && (
                <div className="mb-6">
                    {!showHint ? (
                        <button
                            onClick={() => setShowHint(true)}
                            className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-widest flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                        >
                            <HelpCircle size={14} /> Need a hint?
                        </button>
                    ) : (
                        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 rounded-xl animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 mb-1.5">
                                <BookOpen size={14} className="text-amber-500" />
                                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase">Hint</span>
                            </div>
                            <div className="text-[14px] leading-relaxed font-medium">
                                <MarkdownRenderer className="hint-markdown text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{content.hint}</MarkdownRenderer>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!isEvaluated ? (
                <div className="space-y-4">
                    <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Write your solution here..."
                        disabled={submitting || readOnly}
                        className="w-full min-h-[160px] p-5 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] text-[15px] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 outline-none transition-all resize-none shadow-inner"
                    />
                    <div className="flex justify-end">
                        <ActionButton
                            label={submitting ? 'Analyzing...' : 'Submit Solution'}
                            icon={submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            primary
                            onClick={submit}
                            disabled={!answer.trim() || submitting}
                        />
                    </div>
                </div>
            ) : (
                <div className="p-5 rounded-2xl bg-[var(--surface)] border-2 border-[var(--border)] opacity-80 shadow-sm">
                    <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Your Solution</p>
                    <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{answer}</div>
                </div>
            )}
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

            <div className="flex mt-6 px-1">
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

function SessionSidebar({
    concept, onSkip, onSelect, concepts, currentIdx, conceptStatuses, isStepping, isReadOnly
}: {
    concept: any; onSkip: () => void; onSelect: (idx: number) => void;
    concepts: any[]; currentIdx: number; conceptStatuses: Record<string, string>;
    isStepping: boolean; isReadOnly: boolean;
}) {
    return (
        <div className="flex flex-col gap-6">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Target size={14} className="text-[var(--accent)]" />
                    <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest">Mastery Focus</span>
                </div>
                <h3 className="text-sm font-bold mb-1 leading-tight">{normalizeTitle(concept?.conceptName) || 'Calculating...'}</h3>
                <p className="text-[11px] text-[var(--muted)] mb-5 leading-relaxed">
                    Progressing through the foundational layers of this concept.
                </p>
                
                {!isReadOnly && (
                    <button
                        onClick={onSkip}
                        disabled={isStepping}
                        className="w-full py-2 px-3 rounded-lg border border-[var(--border)] text-[11px] font-bold text-[var(--muted)] hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all uppercase tracking-wider disabled:opacity-30"
                    >
                        Skip to next part
                    </button>
                )}
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Route size={14} className="text-[var(--muted)]" />
                    <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Learning Path</span>
                </div>
                <div className="space-y-2">
                    {concepts.map((c, i) => {
                        const status = conceptStatuses[c.conceptId] || 'not_started';
                        const isActive = i === currentIdx;
                        const isDone = status === 'completed';
                        
                        return (
                            <button
                                key={c.conceptId}
                                onClick={() => onSelect(i)}
                                disabled={isStepping}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${
                                    isActive 
                                        ? 'bg-[var(--accent)]/5 border-[var(--accent)]/20 shadow-sm' 
                                        : 'bg-transparent border-transparent hover:bg-[var(--bg)]'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 ${
                                    isDone 
                                        ? 'bg-emerald-500 border-emerald-500' 
                                        : isActive 
                                            ? 'border-[var(--accent)]' 
                                            : 'border-[var(--border)]'
                                }`}>
                                    {isDone && <CheckCircle2 size={10} className="text-white" />}
                                    {!isDone && isActive && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
                                </div>
                                <span className={`text-[12px] font-medium truncate ${
                                    isActive ? 'text-[var(--text)]' : 'text-[var(--muted)]'
                                }`}>
                                    {normalizeTitle(c.conceptName)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function QuickLearnFlowSessionPage() {
    const router = useRouter();
    const { session: urlSessionId } = router.query as { session?: string };
    const { user, loading: authLoading } = useAuth();

    const [flowSessionId, setFlowSessionId] = useState<string | null>(null);
    const [flowSession, setFlowSession] = useState<FlowSession | null>(null);
    const [currentConceptIndex, setCurrentConceptIndex] = useState(0);
    const [plannedSteps, setPlannedSteps] = useState<number>(0);

    const [stepHistory, setStepHistory] = useState<FlowStep[]>([]);
    const [viewingStepIndex, setViewingStepIndex] = useState(-1);
    const [pendingEvaluation, setPendingEvaluation] = useState<any | null>(null);

    const [conceptJustCompleted, setConceptJustCompleted] = useState(false);
    const [conceptStatuses, setConceptStatuses] = useState<Record<string, 'not_started' | 'in_progress' | 'completed'>>({});
    const [isLimitReached, setIsLimitReached] = useState(false);

    const [loading, setLoading] = useState(true);
    const [stepping, setStepping] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('Initializing...');
    const [error, setError] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [sessionDone, setSessionDone] = useState(false);

    const currentConcept = flowSession?.initial_plan?.concepts?.[currentConceptIndex];
    const totalConcepts = flowSession?.initial_plan?.concepts?.length || 0;

    const displayStep = viewingStepIndex >= 0 ? stepHistory[viewingStepIndex] : null;
    const isReadOnly = viewingStepIndex >= 0 && viewingStepIndex < stepHistory.length - 1;

    useEffect(() => {
        if (!router.isReady) return;
        if (authLoading || !user) { setLoading(false); return; }
        if (urlSessionId) {
            setFlowSessionId(urlSessionId);
        } else {
            setError('No session ID provided');
            setLoading(false);
        }
    }, [urlSessionId, user, authLoading, router.isReady]);

    useEffect(() => {
        if (!flowSessionId) return;
        (async () => {
            const { data, error: dbErr } = await supabase.from('flow_sessions').select('*').eq('id', flowSessionId).single();
            if (dbErr || !data) { setError('Learning Engine connection lost.'); setLoading(false); return; }
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
        })();
    }, [flowSessionId]);

    const fetchNextStep = useCallback(async (retryOrchestrate = true, bypassSteppingCheck = false) => {
        if (!flowSession || !currentConcept?.conceptId || (stepping && !bypassSteppingCheck)) return;
        setStepping(true);
        setPendingEvaluation(null);
        setError(null);
        setFetchError(null);

        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            const res = await fetch('/api/flow/step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
                body: JSON.stringify({ sessionId: flowSession.id, conceptId: currentConcept.conceptId }),
            });
            const data = await res.json();

            if (data.action === 'initialize' && retryOrchestrate) {
                const orchRes = await fetch('/api/flow/orchestrate-stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
                    body: JSON.stringify({ sessionId: flowSession.id, conceptId: currentConcept.conceptId }),
                });
                if (!orchRes.ok) throw new Error('Orchestration failed');
                const reader = orchRes.body?.getReader();
                const decoder = new TextDecoder();
                let streamError: Error | null = null;
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
                                    if (d.progress) setProgress(d.progress);
                                    if (d.status) setStatusMessage(d.status);
                                    if (d.error) streamError = new Error(String(d.error));
                                } catch (e) {}
                            }
                        }
                    }
                }
                if (streamError) throw streamError;
                // After stream completes, call fetchNextStep again to get the actual first step.
                // Reset stepping first so the guard check doesn't block it.
                setStepping(false);
                return fetchNextStep(false, true);
            }

            // If we still get 'initialize' after the stream ran (e.g. concept_id mismatch),
            // surface an error instead of looping forever with a blank card.
            if (data.action === 'initialize') {
                setFetchError('Failed to load lesson content. The plan may not have saved correctly. Please retry.');
                return;
            }

            if (!res.ok) throw new Error(data.error || 'Step failed');

            if (data.stepHistory) {
                setStepHistory(data.stepHistory);
                setViewingStepIndex(data.stepHistory.length - 1);
            } else if (data.step) {
                // Fallback: no stepHistory in response, but we have the current step
                setStepHistory(prev => {
                    const updated = [...prev, data.step];
                    setViewingStepIndex(updated.length - 1);
                    return updated;
                });
            }
            if (data.plannedSteps) setPlannedSteps(data.plannedSteps);

            if (data.action === 'concept_complete') {
                const alreadyDone = conceptStatuses[currentConcept.conceptId] === 'completed';
                const updatedCompleted = [...new Set([...(flowSession.concepts_completed || []), currentConcept.conceptId])];
                await supabase.from('flow_sessions').update({ concepts_completed: updatedCompleted }).eq('id', flowSession.id);
                setFlowSession(prev => prev ? { ...prev, concepts_completed: updatedCompleted } : null);
                setConceptStatuses((prev) => ({ ...prev, [currentConcept.conceptId]: 'completed' }));
                if (!alreadyDone) {
                    setConceptJustCompleted(true);
                    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                }
            } else {
                setConceptStatuses((prev) => ({ ...prev, [currentConcept.conceptId]: 'in_progress' }));
            }
        } catch (err: any) {
            setFetchError(err.message || 'An unexpected error occurred');
        } finally {
            setStepping(false);
        }
    }, [flowSession, currentConcept, stepping, conceptStatuses]);

    useEffect(() => {
        if (flowSession && !stepping && currentConcept && !sessionDone && !conceptJustCompleted && stepHistory.length === 0 && !fetchError) {
            fetchNextStep();
        }
    }, [flowSession, currentConcept, sessionDone, stepping, conceptJustCompleted, stepHistory.length, fetchNextStep, fetchError]);

    const handleUserResponse = async (responseType: string) => {
        if (!displayStep || isReadOnly) return;
        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            await fetch('/api/flow/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
                body: JSON.stringify({ stepId: displayStep.id, userResponse: responseType }),
            });
        } catch (e) {}
        fetchNextStep();
    };

    const handleEvaluated = (_response: string, evaluation: any) => setPendingEvaluation(evaluation);

    const [completedRoadmapId, setCompletedRoadmapId] = useState<string | null>(null);

    const handleAdvanceConcept = () => {
        const nextIdx = currentConceptIndex + 1;
        setConceptJustCompleted(false);
        if (nextIdx < totalConcepts) {
            setCurrentConceptIndex(nextIdx);
            setStepHistory([]);
            setPlannedSteps(0);
            setViewingStepIndex(-1);
            setPendingEvaluation(null);
        } else {
            setSessionDone(true);
            // Handle Roadmap Synchronization
            if (flowSession?.source_type === 'roadmap' && flowSession.source_session_id) {
                const syncRoadmap = async () => {
                    try {
                        const { data: { session: authSession } } = await supabase.auth.getSession();
                        const res = await fetch('/api/serify/roadmap/complete-session', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${authSession?.access_token}`
                            },
                            body: JSON.stringify({ 
                                roadmapSessionId: flowSession.source_session_id,
                                flowSessionId: flowSession.id,
                                mastery: 'solid'
                            })
                        });
                        const data = await res.json();
                        if (data.roadmapId) setCompletedRoadmapId(data.roadmapId);
                    } catch (e) {
                        console.error('Failed to sync roadmap session completion:', e);
                    }
                };
                syncRoadmap();
            }
        }
    };

    const handleReviewConcept = () => {
        setConceptJustCompleted(false);
        setFetchError(null);
        if (stepHistory.length > 0) setViewingStepIndex(stepHistory.length - 1);
    };

    const handleConceptSelect = (index: number) => {
        if (index === currentConceptIndex && !conceptJustCompleted) return;
        setCurrentConceptIndex(index);
        setStepHistory([]);
        setPlannedSteps(0);
        setViewingStepIndex(-1);
        setPendingEvaluation(null);
        setConceptJustCompleted(false);
        setFetchError(null);
    };

    const handleSkip = async () => {
        if (!flowSession || !currentConcept || stepping) return;
        if (window.confirm("Are you sure you want to skip this step?")) {
            setStepping(true);
            try {
                const { data: { session: authSession } } = await supabase.auth.getSession();
                const res = await fetch('/api/flow/step', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
                    body: JSON.stringify({ sessionId: flowSession.id, conceptId: currentConcept.conceptId, skipCurrent: true }),
                });
                const data = await res.json();
                if (data.action === 'concept_complete') setConceptJustCompleted(true);
                else if (data.step) {
                    setStepHistory((prev) => {
                        const nextList = [...prev, data.step];
                        setViewingStepIndex(nextList.length - 1);
                        return nextList;
                    });
                }
            } catch (err: any) { setError(err.message); } finally { setStepping(false); }
        }
    };

    const renderStep = () => {
        if (!displayStep) return null;
        const { step_type, content, user_response } = displayStep;
        const savedAnswer = user_response ?? undefined;
        
        if (step_type === 'teach') return <TeachStep content={content} onNext={handleUserResponse} readOnly={isReadOnly} stepNumber={(viewingStepIndex >= 0 ? viewingStepIndex : stepHistory.length - 1) + 1} totalSteps={Math.max(plannedSteps, stepHistory.length)} savedAnswer={savedAnswer} />;
        if (step_type === 'application') return <ApplicationStep content={content} stepId={displayStep.id} isEvaluated={!!pendingEvaluation || isReadOnly} onEvaluated={handleEvaluated} readOnly={isReadOnly} savedAnswer={savedAnswer} />;
        if (step_type === 'check' || step_type === 'confirm') return <CheckQuestionStep content={content} stepId={displayStep.id} isEvaluated={!!pendingEvaluation || isReadOnly} onEvaluated={handleEvaluated} readOnly={isReadOnly} savedAnswer={savedAnswer} />;
        if (step_type === 'reinforce') return <ReinforceStep content={content} onNext={handleUserResponse} readOnly={isReadOnly} stepNumber={(viewingStepIndex >= 0 ? viewingStepIndex : stepHistory.length - 1) + 1} totalSteps={Math.max(plannedSteps, stepHistory.length)} />;
        return null;
    };


    const renderMainContent = () => {
        if (isLimitReached) return <div className="flex items-center justify-center min-h-[70vh] p-6"><UsageGate feature='flow_sessions' /></div>;
        if (loading) return <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 animate-fade-in"><div className="w-20 h-20 rounded-full border-4 border-[var(--border)] border-t-[var(--accent)] animate-spin-slow" /></div>;
        if (sessionDone) {
            const isRoadmap = flowSession?.source_type === 'roadmap';
            return (
                <div className="max-w-xl mx-auto mt-16 text-center px-4 space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-500 mb-4 transition-transform hover:scale-110">
                        <CheckCircle2 size={40} />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-4xl font-display font-black tracking-tight uppercase italic underline underline-offset-8 decoration-[var(--accent)]">Protocol Complete</h1>
                        <p className="font-mono text-[10px] text-[var(--muted)] tracking-widest leading-loose">
                            {isRoadmap ? 'STRATEGIC OBJECTIVE SECURED • ROADMAP UPDATED' : 'CONCEPTS SYNCHRONIZED • VAULT UPDATED'}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <ActionButton 
                            label={isRoadmap ? "View Roadmap Timeline" : "Back to Dashboard"} 
                            primary 
                            onClick={() => router.push(isRoadmap ? (completedRoadmapId ? `/roadmap/${completedRoadmapId}` : `/roadmap`) : `/`)}
                        />
                        <button 
                            onClick={() => router.push('/')}
                            className="text-xs font-bold text-[var(--muted)] hover:text-[var(--text)] transition-colors uppercase tracking-widest underline underline-offset-4"
                        >
                            Return Home
                        </button>
                    </div>
                </div>
            );
        }

        if (conceptJustCompleted && currentConcept) {
            return (
                <div className="max-w-2xl mx-auto px-6 py-12">
                    <ConceptCompleteCard
                        conceptName={normalizeTitle(currentConcept.conceptName)}
                        onNext={handleAdvanceConcept}
                        onReview={handleReviewConcept}
                        isLast={currentConceptIndex >= totalConcepts - 1}
                    />
                </div>
            );
        }

        return (
            <div className="max-w-4xl mx-auto px-6 py-6 font-sans">
                <div className="mb-6">
                    {flowSession && <ProgressBar concepts={concepts.map((c: any) => ({ ...c, status: conceptStatuses[c.conceptId] || 'not_started' }))} currentConceptId={currentConcept?.conceptId} />}
                    <div className="flex items-center justify-between mt-4">
                        <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/25 rounded-lg px-3 py-1.5 text-sm font-bold text-[var(--accent)] truncate max-w-sm">
                            {normalizeTitle(currentConcept?.conceptName) || '—'}
                        </div>
                        <span className="text-xs text-[var(--muted)] shrink-0 font-mono">{currentConceptIndex + 1} / {totalConcepts}</span>
                    </div>
                </div>
                
                <div className="min-w-0">
                    {fetchError ? (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-12 text-center">
                            <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
                            <p className="text-[var(--muted)] mb-6">{fetchError}</p>
                            <ActionButton label="Retry Step" primary onClick={() => { setFetchError(null); fetchNextStep(); }} />
                        </div>
                    ) : (stepping || !displayStep) ? (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl min-h-[400px] flex flex-col items-center justify-center gap-4 p-8">
                            <div className="w-10 h-10 rounded-full border-4 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
                            <span className="text-sm text-[var(--muted)]">{statusMessage || 'Preparing your lesson...'}</span>
                        </div>
                    ) : (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 md:p-6 min-h-[250px] shadow-sm">
                            {renderStep()}
                            {!isReadOnly && pendingEvaluation && <EvaluationBanner evaluation={pendingEvaluation} onContinue={fetchNextStep} />}
                        </div>
                    )}
                </div>
            </div>
        );
    };


    const concepts = flowSession?.initial_plan?.concepts || [];
    const sidebar = (
        <CurriculumSidebar
            concepts={concepts.map((c: any) => ({ ...c, name: c.conceptName }))}
            currentIndex={currentConceptIndex}
            conceptStatuses={conceptStatuses}
            onConceptClick={handleConceptSelect}
            title={normalizeTitle((flowSession as any)?.source_topic) || 'Learn Session'}
        />
    );

    return (
        <>
            <Head><title>Learn Mode — {normalizeTitle(currentConcept?.conceptName) || normalizeTitle((flowSession as any)?.source_topic) || 'Loading'}</title></Head>
            <DashboardLayout 
                replaceNav={true} 
                sidebarContent={sidebar}
                backLink="/learn"
                backLinkText={normalizeTitle((flowSession as any)?.source_topic) || 'Learn Session'}
            >
                {renderMainContent()}
            </DashboardLayout>
        </>
    );
}
