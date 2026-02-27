import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Youtube, FileText, FileUp, ClipboardPaste, ArrowRight, Zap, AlertTriangle } from 'lucide-react';
import { storage } from '@/lib/storage';
import { useSparks } from '@/hooks/useSparks';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Analyze() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'youtube' | 'article' | 'pdf' | 'notes'>('youtube');
    const [inputValue, setInputValue] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');

    const { balance, loading: sparksLoading } = useSparks();

    const loadingMessages = [
        "Extracting content...",
        "Identifying key concepts...",
        "Building concept map...",
        "Generating your questions..."
    ];

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isProcessing) {
            interval = setInterval(() => {
                setLoadingMsgIdx(prev => (prev + 1) % loadingMessages.length);
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isProcessing, loadingMessages.length]);


    useEffect(() => {
        setInputValue('');
    }, [activeTab]);

    const handleAnalyze = async () => {
        if (!inputValue.trim() && activeTab !== 'pdf') return;
        if (activeTab === 'pdf' && !pdfFile) return;

        setErrorMsg('');
        setIsProcessing(true);

        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            const token = authSession?.access_token;
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };


            const contentPayload = activeTab === 'pdf' ? `[PDF File: ${pdfFile?.name}] (PDF parsing to be implemented)` : inputValue;

            const conceptsRes = await fetch('/api/process-content', {
                method: 'POST',
                headers,
                body: JSON.stringify({ content: contentPayload, contentType: activeTab })
            });
            const conceptsData = await conceptsRes.json();

            if (!conceptsRes.ok) throw new Error(conceptsData.message || "Failed to extract concepts");
            const { concepts, title } = conceptsData;

            if (!concepts) throw new Error("Failed to extract concepts");


            const reqRes = await fetch('/api/generate-questions', {
                method: 'POST',
                headers,
                body: JSON.stringify({ concepts, method: 'standard' })
            });
            const { questions } = await reqRes.json();

            if (!questions) throw new Error("Failed to generate questions");


            const initRes = await fetch('/api/sessions/init', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title: title && title !== 'New Session' ? title : (concepts && concepts.length > 0 ? concepts[0].name : (activeTab === 'pdf' ? (pdfFile?.name || 'New PDF Session') : 'New Session')),
                    contentType: activeTab,
                    content: contentPayload,
                    difficulty: 'medium'
                })
            });

            const initData = await initRes.json();
            if (!initRes.ok) throw new Error(initData.message || "Failed to initialize session");

            const dbSession = initData.session;

            const sessionData = {
                id: dbSession.id,
                title: dbSession.title,
                content: contentPayload,
                concepts,
                questions,
                isBasicMode: balance && balance.total_sparks >= 11 && balance.total_sparks < 13
            };

            localStorage.setItem('serify_active_session', JSON.stringify(sessionData));

            storage.saveSession({
                id: sessionData.id,
                title: sessionData.title,
                type: activeTab === 'youtube' ? 'YouTube Video' : activeTab === 'pdf' ? 'PDF Upload' : activeTab === 'article' ? 'Article URL' : 'Notes',
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                status: 'In Progress'
            });

            router.push(`/session/${sessionData.id}`);
        } catch (error: any) {
            console.error(error);

            setErrorMsg(error.message || "Failed to analyze content. Please try again.");
            setIsProcessing(false);
        }
    };

    return (
        <DashboardLayout>
            <Head>
                <title>New Session | Serify</title>
            </Head>

            <div className="flex-1 flex items-center justify-center p-6 md:p-10 min-h-[calc(100vh-64px)]">
                <div className="w-full max-w-3xl">
                    <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 md:p-12 relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>

                        {isProcessing ? (
                            <div className="h-48 flex flex-col items-center justify-center animate-fade-in relative z-10">
                                <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin mb-4"></div>
                                <p className="text-[var(--text)] font-medium text-lg animate-pulse">
                                    <span className="text-[var(--muted)] text-sm font-bold tracking-widest uppercase mr-2">Step {Math.min(loadingMsgIdx + 1, loadingMessages.length)} of {loadingMessages.length}</span>
                                    <br />{loadingMessages[loadingMsgIdx]}
                                </p>
                            </div>
                        ) : (
                            <div className="relative z-10 text-center max-w-xl mx-auto">
                                <div className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-widest mb-3">Analyze Something New</div>
                                <h1 className="text-4xl md:text-5xl font-display text-[var(--text)] mb-4">What did you just learn?</h1>
                                <p className="text-[var(--muted)] text-base mb-8">Paste a link, upload a PDF, or drop in your notes. Serify will tell you what you actually understood.</p>

                                {errorMsg && (
                                    <div className="mb-6 bg-[var(--warn-light)] border border-[var(--warn)]/30 text-[var(--warn)] px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center animate-fade-in shadow-sm">
                                        <AlertTriangle size={16} className="mr-2 shrink-0" />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                                    {[
                                        { id: 'youtube', label: 'YouTube URL', icon: <Youtube size={16} /> },
                                        { id: 'article', label: 'Article URL', icon: <FileText size={16} /> },
                                        { id: 'pdf', label: 'PDF Upload', icon: <FileUp size={16} /> },
                                        { id: 'notes', label: 'Paste Notes', icon: <ClipboardPaste size={16} /> },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === tab.id
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
                                        {activeTab === 'youtube' && <input value={inputValue} onChange={e => setInputValue(e.target.value)} type="text" placeholder="https://youtube.com/watch?v=..." className="w-full h-14 px-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors text-base" />}
                                        {activeTab === 'article' && <input value={inputValue} onChange={e => setInputValue(e.target.value)} type="text" placeholder="https://..." className="w-full h-14 px-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors text-base" />}
                                        {activeTab === 'pdf' && (
                                            <label className="w-full h-14 px-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] border-dashed flex items-center justify-center text-[var(--muted)] cursor-pointer hover:bg-black/5 text-base relative overflow-hidden">
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
                                                <span className="truncate">{pdfFile ? pdfFile.name : 'Click to select or drag and drop .pdf'}</span>
                                            </label>
                                        )}
                                        {activeTab === 'notes' && <textarea value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Paste your notes, highlights, or any text here..." className="w-full min-h-[160px] p-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors resize-y text-base" />}
                                    </div>
                                    <button
                                        onClick={handleAnalyze}
                                        disabled={sparksLoading || !balance || balance.total_sparks < 11 || (activeTab === 'pdf' ? !pdfFile : !inputValue.trim())}
                                        className={`w-full h-14 rounded-xl font-medium transition-colors flex flex-col items-center justify-center text-lg ${(activeTab === 'pdf' ? pdfFile : inputValue.trim()) ? (balance && balance.total_sparks >= 11 ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-md shadow-[var(--accent)]/20 hover:-translate-y-0.5' : 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed') : 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed'}`}
                                    >
                                        <span className="flex items-center">
                                            {sparksLoading ? 'Checking Sparks...' : (
                                                <>Analyze Content <ArrowRight size={20} className="ml-2" /></>
                                            )}
                                        </span>
                                        {(activeTab === 'pdf' ? pdfFile : inputValue.trim()) && !sparksLoading && balance && balance.total_sparks >= 11 && (
                                            <span className="text-xs opacity-80 mt-0.5 flex items-center gap-1 font-normal">
                                                <Zap size={12} fill="currentColor" /> {balance.total_sparks >= 13 ? '13' : '11'} Sparks
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
                                            You need 13 Sparks to start a full session. You have {balance.total_sparks}.
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
