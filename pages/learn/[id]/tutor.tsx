import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function TutorMode() {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputStr, setInputStr] = useState('');
    const [sending, setSending] = useState(false);
    const [isPro, setIsPro] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!id) return;

        const initDeck = async () => {
            try {

                const proStatus = user?.subscriptionTier === 'pro' || user?.plan === 'pro';
                setIsPro(proStatus);

                const stored = localStorage.getItem('serify_feedback_report');
                if (!stored) {
                    router.push('/analyze');
                    return;
                }

                const parsed = JSON.parse(stored);

                const wk = (parsed.report?.strength_map || []).filter(
                    (item: any) => ['revisit', 'shaky', 'skipped'].includes(item.mastery_state)
                ).map((item: any) => ({
                    id: item.concept_id,
                    name: parsed.concepts?.find((c: any) => c.id === item.concept_id)?.name || 'Concept',
                    masteryState: item.mastery_state,
                    feedbackNote: item.feedback_text
                }));

                const st = (parsed.report?.strength_map || []).filter(
                    (item: any) => ['solid'].includes(item.mastery_state)
                ).map((item: any) => ({
                    id: item.concept_id,
                    name: parsed.concepts?.find((c: any) => c.id === item.concept_id)?.name || 'Concept'
                }));

                const ctx = {
                    userId: user?.id || 'placeholder-user-id',
                    sessionId: id as string,
                    weakConcepts: wk,
                    strongConcepts: st,
                    sourceContent: parsed.report?.overview || 'Recent study session'
                };

                setSessionData(ctx);

                if (proStatus) {

                    const { data: { session } } = await supabase.auth.getSession();
                    const token = session?.access_token;
                    const headers: any = { 'Content-Type': 'application/json' };
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    const isRegenerating = router.query.regenerate === 'true';

                    const startRes = await fetch(`/api/sessions/${id}/tutor/start${isRegenerating ? '?regenerate=true' : ''}`, {
                        method: 'POST',
                        headers
                    });

                    if (startRes.ok) {
                        const data = await startRes.json();
                        if (data.messages && data.messages.length > 0) {
                            setMessages(data.messages);
                        } else {
                            if (wk.length > 0) {
                                setMessages([
                                    { role: 'model', content: `Hi there. I noticed you had some trouble with **${wk[0].name}** during your last session. Specifically, it looked like: *${wk[0].feedbackNote}*\n\nHow can I help clear that up for you? We can walk through it step-by-step or do a quick practice.` }
                                ]);
                            } else {
                                setMessages([
                                    { role: 'model', content: "Hi! You did great in your last session. What would you like to drill into today?" }
                                ]);
                            }
                        }
                    } else {
                        const errorData = await startRes.json().catch(() => ({}));
                        throw new Error(errorData.error || 'Could not initialize tutor session');
                    }
                }

            } catch (err: any) {
                console.error(err);
                setError(err.message || 'An unexpected error occurred.');
            } finally {
                setLoading(false);
            }
        };

        initDeck();
    }, [id, router, user]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async () => {
        if (!inputStr.trim() || sending) return;

        const userMsg = { role: 'user', content: inputStr };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInputStr('');
        setSending(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`/api/sessions/${id}/tutor/message`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    messages: newMessages,
                    sessionContext: sessionData
                })
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, { role: 'model', content: data.reply }]);
            } else {
                setMessages(prev => [...prev, { role: 'model', content: "Sorry, I ran into an error connecting to my brain." }]);
            }
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'model', content: "Sorry, I ran into a network error." }]);
        } finally {
            setSending(false);
        }
    };

    const handleExit = async () => {
        if (messages.length > 2) {

            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                const headers: any = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                fetch(`/api/sessions/${id}/tutor/end`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        sessionContext: sessionData
                    })
                }).then(async (res) => {
                    if (res.ok) {
                        const data = await res.json();

                        if (data.updates && data.updates.length > 0) {
                            for (const update of data.updates) {
                                await fetch('/api/learn/mastery-update', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', ...headers },
                                    body: JSON.stringify({
                                        conceptId: update.conceptId,
                                        mode: 'tutor',
                                        outcome: update.outcome,
                                        sessionId: sessionData.sessionId
                                    })
                                });
                            }
                        }
                    }
                });
            } catch (e) {
                console.error("Failed to sync tutor conversation state", e);
            }
        }
        router.push(`/session/${id}/feedback`);
    };

    const isActuallyPro = user?.subscriptionTier === 'pro' || user?.plan === 'pro';

    if (!loading && !isActuallyPro) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--text)] flex flex-col pt-12">
                <div className="max-w-[500px] mx-auto w-full px-6 flex-1 flex flex-col items-center pt-24">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center mb-6 text-3xl shadow-lg">🧠</div>
                    <h2 className="text-3xl font-display mb-4 text-center">AI Tutor is a Pro Feature</h2>
                    <p className="text-[var(--muted)] text-center mb-8 text-lg leading-relaxed">
                        Upgrade to Serify Pro to get 1-on-1 personalized tutoring directly connected to your learning gaps and Concept Vault.
                    </p>
                    <div className="flex flex-col gap-4 w-full sm:w-auto">
                        <Link
                            href="/pricing"
                            className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all text-center shadow-md shadow-indigo-500/20"
                        >
                            Upgrade to Pro
                        </Link>
                        <Link href={`/session/${id}/feedback`} className="px-8 py-3.5 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-xl font-medium hover:bg-black/5 transition-all text-center">
                            Return to Report
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--text)] flex flex-col pt-12">
                <div className="max-w-[500px] mx-auto w-full px-6 flex-1 flex flex-col items-center pt-24 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-[var(--warn-light)] text-[var(--warn)] flex items-center justify-center mb-6 text-3xl shadow-lg">⚠️</div>
                    <h2 className="text-3xl font-display mb-4 text-center">Initialization Failed</h2>
                    <p className="text-[var(--muted)] text-center mb-8 text-lg leading-relaxed">
                        {error}
                    </p>
                    <Link href={`/session/${id}/feedback`} className="px-8 py-3.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-xl font-medium hover:bg-black/5 transition-colors">
                        Return to Report
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[var(--background)] text-[var(--text)] flex flex-col overflow-hidden">
            <Head>
                <title>AI Tutor | Serify</title>
            </Head>

            { }
            <header className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-white/80 backdrop-blur-md z-10 shrink-0">
                <button onClick={handleExit} className="text-[var(--muted)] hover:text-[var(--text)] transition-colors text-sm font-medium flex items-center gap-2">
                    &larr; Exit Tutor
                </button>
                <div className="font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-bold">Serify Tutor</span>
                </div>
                <div className="w-24 text-right">
                    <span className="text-[10px] uppercase tracking-widest text-indigo-600 font-black bg-indigo-50 px-2 py-1 rounded">PRO</span>
                </div>
            </header>

            { }
            <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 flex flex-col items-center">
                <div className="w-full max-w-[800px] flex flex-col gap-6 pb-20">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-br-sm'
                                : 'bg-white border border-[var(--border)] shadow-sm text-[var(--text)] rounded-bl-sm'
                                }`}>
                                <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'text-white prose-p:text-white' : 'text-[var(--text)]'} prose-p:leading-relaxed`}>
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}

                    {sending && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-[var(--border)] shadow-sm rounded-2xl rounded-bl-sm px-5 py-4">
                                <span className="flex gap-1">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            </main>

            { }
            <footer className="p-4 md:p-6 bg-white border-t border-[var(--border)] shrink-0">
                <div className="max-w-[800px] mx-auto relative flex items-end gap-2">
                    <textarea
                        value={inputStr}
                        onChange={(e) => setInputStr(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        placeholder="Message your tutor..."
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-5 py-4 pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none min-h-[60px] max-h-[200px]"
                        rows={1}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!inputStr.trim() || sending}
                        className="absolute right-3 bottom-3 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                        </svg>
                    </button>
                </div>
                <div className="text-center mt-3 text-[11px] text-[var(--muted)]">
                    Tutor mode analyzes your conversation to automatically update the Concept Vault when you exit.
                </div>
            </footer>
        </div>
    );
}
