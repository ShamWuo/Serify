import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import {
    Youtube,
    FileText,
    FileUp,
    ClipboardPaste,
    ArrowRight,
    Zap,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react';
import { storage } from '@/lib/storage';
import { useSparks } from '@/hooks/useSparks';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { z } from 'zod';

const conceptSchema = z.object({
    title: z.string(),
    concepts: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            definition: z.string(),
            importance: z.enum(['primary', 'secondary', 'contextual']),
            misconception_risk: z.boolean()
        })
    )
});

const questionSchema = z.object({
    questions: z.array(
        z.object({
            id: z.string(),
            target_concept_id: z.string(),
            type: z.enum(['RETRIEVAL', 'APPLICATION', 'MISCONCEPTION PROBE']),
            text: z.string()
        })
    )
});

export default function Analyze() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'youtube' | 'article' | 'pdf' | 'notes'>('youtube');
    const [inputValue, setInputValue] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [authToken, setAuthToken] = useState<string>('');

    const { balance, loading: sparksLoading } = useSparks();

    useEffect(() => {
        supabase.auth
            .getSession()
            .then(({ data }) => setAuthToken(data.session?.access_token || ''));
        setInputValue('');
        setErrorMsg('');
    }, [activeTab]);

    const {
        submit: startConceptStream,
        object: conceptData,
        isLoading: isConceptStreaming,
        error: conceptStreamError
    } = useObject({
        api: '/api/process-content',
        schema: conceptSchema,
        headers: {
            Authorization: `Bearer ${authToken}`
        },
        onFinish: ({ object, error }) => {
            if (error || !object || !object.concepts || object.concepts.length === 0) {
                setErrorMsg(error?.message || 'Failed to extract concepts');
                setIsProcessing(false);
                return;
            }
            // Once concepts finish, stream the questions
            startQuestionStream({ concepts: object.concepts, method: 'standard' });
        },
        onError: (e) => {
            console.error('Concept stream error:', e);
            setErrorMsg(e.message || 'Failed to extract concepts.');
            setIsProcessing(false);
        }
    });

    const {
        submit: startQuestionStream,
        object: questionData,
        isLoading: isQuestionStreaming,
        error: questionStreamError
    } = useObject({
        api: '/api/generate-questions',
        schema: questionSchema,
        headers: {
            Authorization: `Bearer ${authToken}`
        },
        onFinish: async ({ object, error }) => {
            if (error || !object || !object.questions) {
                setErrorMsg(error?.message || 'Failed to generate questions');
                setIsProcessing(false);
                return;
            }

            try {
                // Now initialize the session since both streams are complete
                const finalConcepts = conceptData?.concepts || [];
                const finalTitle =
                    conceptData?.title && conceptData.title !== 'New Session'
                        ? conceptData.title
                        : finalConcepts.length > 0
                          ? finalConcepts[0]?.name
                          : activeTab === 'pdf'
                            ? pdfFile?.name || 'New PDF Session'
                            : 'New Session';

                const contentPayload =
                    activeTab === 'pdf' ? `[PDF File: ${pdfFile?.name}]` : inputValue;

                const initRes = await fetch('/api/sessions/init', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        title: finalTitle,
                        contentType: activeTab,
                        content: contentPayload,
                        difficulty: 'medium'
                    })
                });

                const initData = await initRes.json();
                if (!initRes.ok)
                    throw new Error(initData.message || 'Failed to initialize session');

                const dbSession = initData.session;

                const sessionData = {
                    id: dbSession.id,
                    title: dbSession.title,
                    content: contentPayload,
                    concepts: finalConcepts,
                    questions: object.questions,
                    isBasicMode: balance && balance.total_sparks >= 11 && balance.total_sparks < 13
                };

                localStorage.setItem('serify_active_session', JSON.stringify(sessionData));

                storage.saveSession({
                    id: sessionData.id,
                    title: sessionData.title,
                    type:
                        activeTab === 'youtube'
                            ? 'YouTube Video'
                            : activeTab === 'pdf'
                              ? 'PDF Upload'
                              : activeTab === 'article'
                                ? 'Article URL'
                                : 'Notes',
                    date: new Date().toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    }),
                    status: 'In Progress'
                });

                router.push(`/session/${sessionData.id}`);
            } catch (err: any) {
                console.error(err);
                setErrorMsg(err.message || 'Failed to finalize session.');
                setIsProcessing(false);
            }
        },
        onError: (e) => {
            console.error('Question stream error:', e);
            setErrorMsg(e.message || 'Failed to generate questions.');
            setIsProcessing(false);
        }
    });

    const handleAnalyze = () => {
        if (!inputValue.trim() && activeTab !== 'pdf') return;
        if (activeTab === 'pdf' && !pdfFile) return;

        setErrorMsg('');
        setIsProcessing(true);

        const contentPayload = activeTab === 'pdf' ? `[PDF File: ${pdfFile?.name}]` : inputValue;
        startConceptStream({ content: contentPayload, contentType: activeTab });
    };

    const isStreaming = isProcessing && (isConceptStreaming || isQuestionStreaming || conceptData);

    return (
        <DashboardLayout>
            <Head>
                <title>New Session | Serify</title>
            </Head>

            <div className="flex-1 flex items-center justify-center p-6 md:p-10 min-h-[calc(100vh-64px)]">
                <div className="w-full max-w-4xl">
                    <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 md:p-12 relative overflow-hidden shadow-sm min-h-[500px] flex items-center justify-center">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>

                        {isStreaming ? (
                            <div className="w-full relative z-10 animate-fade-in text-left">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-display text-[var(--accent)] flex items-center gap-3">
                                        <Zap className="animate-pulse" size={24} />
                                        {isConceptStreaming
                                            ? 'Extracting Concepts...'
                                            : isQuestionStreaming
                                              ? 'Drafting Questions...'
                                              : 'Finalizing...'}
                                    </h2>
                                    <p className="text-[var(--muted)] text-sm mt-1">
                                        {conceptData?.title
                                            ? `Subject: ${conceptData.title}`
                                            : 'Reading your content...'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--muted)] mb-4 flex items-center justify-between">
                                            <span>Concept Map</span>
                                            {!isConceptStreaming && conceptData?.concepts && (
                                                <CheckCircle2
                                                    className="text-emerald-500"
                                                    size={16}
                                                />
                                            )}
                                        </h3>
                                        <div className="space-y-3">
                                            {conceptData?.concepts?.map((c, i) => (
                                                <div
                                                    key={i}
                                                    className="animate-fade-in-up bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 shadow-sm text-sm border-l-2 border-l-[var(--accent)]"
                                                >
                                                    <strong className="text-[var(--text)] block mb-1">
                                                        {c?.name || '...'}
                                                    </strong>
                                                    <span className="text-[var(--muted)] leading-relaxed">
                                                        {c?.definition || '...'}
                                                    </span>
                                                </div>
                                            ))}
                                            {isConceptStreaming && (
                                                <div className="p-4 rounded-xl border border-[var(--border)] border-dashed bg-black/5 animate-pulse text-[var(--muted)] text-sm">
                                                    Thinking...
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {(isQuestionStreaming || questionData?.questions) && (
                                        <div className="animate-fade-in">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--muted)] mb-4 flex items-center justify-between">
                                                <span>Diagnostic Questions</span>
                                                {!isQuestionStreaming &&
                                                    questionData?.questions &&
                                                    questionData.questions.length > 0 && (
                                                        <CheckCircle2
                                                            className="text-emerald-500"
                                                            size={16}
                                                        />
                                                    )}
                                            </h3>
                                            <div className="space-y-3">
                                                {questionData?.questions?.map((q, i) => (
                                                    <div
                                                        key={i}
                                                        className="animate-fade-in-up bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-sm text-sm"
                                                    >
                                                        <span className="text-xs font-bold text-[var(--accent)]/70 uppercase mb-2 block tracking-wider">
                                                            {q?.type || 'Drafting...'}
                                                        </span>
                                                        <span className="text-[var(--text)] leading-relaxed block">
                                                            {q?.text || '...'}
                                                        </span>
                                                    </div>
                                                ))}
                                                {isQuestionStreaming && (
                                                    <div className="p-4 rounded-xl border border-[var(--border)] border-dashed bg-black/5 animate-pulse text-[var(--muted)] text-sm">
                                                        Drafting question...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="relative z-10 text-center max-w-xl mx-auto w-full">
                                <div className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-widest mb-3">
                                    Analyze Something New
                                </div>
                                <h1 className="text-4xl md:text-5xl font-display text-[var(--text)] mb-4">
                                    What did you just learn?
                                </h1>
                                <p className="text-[var(--muted)] text-base mb-8">
                                    Paste a link, upload a PDF, or drop in your notes. Serify will
                                    tell you what you actually understood.
                                </p>

                                {errorMsg && (
                                    <div className="mb-6 bg-[var(--warn-light)] border border-[var(--warn)]/30 text-[var(--warn)] px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center animate-fade-in shadow-sm">
                                        <AlertTriangle size={16} className="mr-2 shrink-0" />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                                    {[
                                        {
                                            id: 'youtube',
                                            label: 'YouTube URL',
                                            icon: <Youtube size={16} />
                                        },
                                        {
                                            id: 'article',
                                            label: 'Article URL',
                                            icon: <FileText size={16} />
                                        },
                                        {
                                            id: 'pdf',
                                            label: 'PDF Upload',
                                            icon: <FileUp size={16} />
                                        },
                                        {
                                            id: 'notes',
                                            label: 'Paste Notes',
                                            icon: <ClipboardPaste size={16} />
                                        }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                                activeTab === tab.id
                                                    ? 'bg-[var(--text)] text-[var(--surface)] shadow-md'
                                                    : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                                            }`}
                                        >
                                            {tab.icon} {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex flex-col gap-4 text-left">
                                    <div className="w-full">
                                        {activeTab === 'youtube' && (
                                            <input
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                type="text"
                                                placeholder="https://youtube.com/watch?v=..."
                                                className="w-full h-14 px-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors text-base"
                                            />
                                        )}
                                        {activeTab === 'article' && (
                                            <input
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                type="text"
                                                placeholder="https://..."
                                                className="w-full h-14 px-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors text-base"
                                            />
                                        )}
                                        {activeTab === 'pdf' && (
                                            <label className="w-full h-14 px-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] border-dashed flex items-center justify-center text-[var(--muted)] cursor-pointer hover:bg-[var(--border)]/20 text-base relative overflow-hidden transition-colors">
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) setPdfFile(file);
                                                    }}
                                                />
                                                <FileUp size={18} className="mr-2 shrink-0" />
                                                <span className="truncate">
                                                    {pdfFile
                                                        ? pdfFile.name
                                                        : 'Click to select or drag and drop .pdf'}
                                                </span>
                                            </label>
                                        )}
                                        {activeTab === 'notes' && (
                                            <textarea
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                placeholder="Paste your notes, highlights, or any text here..."
                                                className="w-full min-h-[160px] p-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors resize-y text-base"
                                            />
                                        )}
                                    </div>
                                    <button
                                        onClick={handleAnalyze}
                                        disabled={
                                            sparksLoading ||
                                            !balance ||
                                            balance.total_sparks < 11 ||
                                            (activeTab === 'pdf' ? !pdfFile : !inputValue.trim())
                                        }
                                        className={`w-full h-14 rounded-xl font-medium transition-colors flex flex-col items-center justify-center text-lg ${(activeTab === 'pdf' ? pdfFile : inputValue.trim()) ? (balance && balance.total_sparks >= 11 ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-md shadow-[var(--accent)]/20 hover:-translate-y-0.5' : 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed') : 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed'}`}
                                    >
                                        <span className="flex items-center">
                                            {sparksLoading ? (
                                                'Checking Sparks...'
                                            ) : (
                                                <>
                                                    Analyze Content{' '}
                                                    <ArrowRight size={20} className="ml-2" />
                                                </>
                                            )}
                                        </span>
                                        {(activeTab === 'pdf' ? pdfFile : inputValue.trim()) &&
                                            !sparksLoading &&
                                            balance &&
                                            balance.total_sparks >= 11 && (
                                                <span className="text-xs opacity-80 mt-0.5 flex items-center gap-1 font-normal">
                                                    <Zap size={12} fill="currentColor" />{' '}
                                                    {balance.total_sparks >= 13 ? '13' : '11'}{' '}
                                                    Sparks
                                                </span>
                                            )}
                                    </button>
                                </div>

                                {balance && balance.total_sparks < 13 && (
                                    <div className="mt-8 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 shadow-sm text-left">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="bg-amber-100 text-amber-600 p-2 rounded-lg">
                                                <Zap className="w-5 h-5" fill="currentColor" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-[var(--text)] m-0">
                                                Not enough Sparks for a full session
                                            </h3>
                                        </div>
                                        <p className="text-[var(--muted)] mb-6 text-base">
                                            You need 13 Sparks to start a full session. You have{' '}
                                            {balance.total_sparks}.
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <Link
                                                href="/sparks"
                                                className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-medium py-3 px-6 rounded-xl transition-colors flex-1 text-center"
                                            >
                                                Buy Sparks &rarr;
                                            </Link>
                                            {balance.total_sparks >= 11 && (
                                                <button
                                                    onClick={handleAnalyze}
                                                    className="bg-[var(--surface)] hover:bg-[var(--border)]/20 border border-[var(--border)] text-[var(--text)] font-medium py-3 px-6 rounded-xl transition-colors flex-1 text-center flex items-center justify-center gap-2"
                                                >
                                                    Use Basic Mode (11 Sparks)
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </DashboardLayout>
    );
}
