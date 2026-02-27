import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Youtube, FileText, FileUp, ClipboardPaste, ArrowRight, Zap, Target, ArrowUpRight, AlertTriangle, History, Clock, Lock } from 'lucide-react';
import { storage, SessionSummary } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useSparks } from '@/hooks/useSparks';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { demo } = router.query;
  const isDemo = demo === 'true';

  const { balance, loading: sparksLoading } = useSparks();

  const [activeTab, setActiveTab] = useState<'youtube' | 'article' | 'pdf' | 'notes'>('youtube');
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [latestSessions, setLatestSessions] = useState<SessionSummary[]>([]);

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

  useEffect(() => {
    const history = storage.getHistory();
    setLatestSessions(history.slice(0, 3));
  }, []);

  const handleCheckout = async (priceId: string) => {
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, priceId }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Checkout failed:', errorText);
        alert('Checkout failed. Please try again later.');
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };

  const handleAnalyze = async () => {
    if (!inputValue.trim() && activeTab !== 'pdf') return;
    setIsProcessing(true);
    setErrorMsg('');

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(!token && isDemo ? { 'x-serify-demo': 'true' } : {})
      };


      const conceptsRes = await fetch('/api/process-content', {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: inputValue, contentType: activeTab })
      });

      if (!conceptsRes.ok) {
        const errData = await conceptsRes.json();
        throw new Error(errData.message || "Failed to extract concepts");
      }
      const { concepts, title } = await conceptsRes.json();

      if (!concepts) throw new Error("Failed to extract concepts");


      const reqRes = await fetch('/api/generate-questions', {
        method: 'POST',
        headers,
        body: JSON.stringify({ concepts, method: 'standard' })
      });

      if (!reqRes.ok) {
        const errData = await reqRes.json();
        throw new Error(errData.message || "Failed to generate questions");
      }
      const { questions } = await reqRes.json();

      if (!questions) throw new Error("Failed to generate questions");


      const initRes = await fetch('/api/sessions/init', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: title && title !== 'New Session' ? title : (concepts && concepts.length > 0 ? concepts[0].name : 'New Session'),
          contentType: activeTab,
          content: inputValue,
          difficulty: 'medium'
        })
      });

      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.message || "Failed to initialize session");

      const dbSession = initData.session;

      const sessionData = {
        id: dbSession.id,
        title: dbSession.title,
        content: inputValue,
        concepts,
        questions,
        type: activeTab === 'youtube' ? 'YouTube Video' : activeTab === 'pdf' ? 'PDF Upload' : activeTab === 'article' ? 'Article URL' : 'Notes',
        isBasicMode: balance && balance.total_sparks >= 11 && balance.total_sparks < 13
      };

      localStorage.setItem('serify_active_session', JSON.stringify(sessionData));

      storage.saveSession({
        id: sessionData.id,
        title: sessionData.title,
        type: sessionData.type,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'In Progress'
      });

      router.push(`/session/${sessionData.id}`);
    } catch (error) {
      console.error(error);
      setErrorMsg(error instanceof Error ? error.message : "Failed to analyze content. Please try again.");
      setIsProcessing(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'YouTube Video': return <Youtube size={20} className="text-red-500" />;
      case 'PDF Upload': return <FileUp size={20} className="text-blue-500" />;
      case 'Article URL': return <FileText size={20} className="text-green-500" />;
      case 'Notes': return <ClipboardPaste size={20} className="text-orange-500" />;
      default: return <Clock size={20} className="text-gray-400" />;
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[var(--bg)]" />;
  }

  if (!user && !isDemo) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans">
        <Head><title>Serify | Context-Aware Learning Reflection</title></Head>
        <nav className="w-full p-6 flex justify-between items-center z-10">
          <div className="text-2xl font-display tracking-tight">Serify</div>
          <div className="space-x-4">
            <Link href="/login" className="text-[var(--text)] hover:text-black font-medium">Log in</Link>
            <Link href="/?demo=true" className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg font-medium hover:bg-black/5 transition-colors">Try Demo</Link>
          </div>
        </nav>
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-3xl space-y-6">
            <h1 className="text-6xl md:text-8xl font-display leading-none">Master Your <br />Understanding</h1>
            <p className="text-xl text-[var(--muted)] max-w-xl mx-auto">
              Serify moves beyond simple testing. It analyzes your conceptual depth, identifies misconceptions, and maps your knowledge gaps using context-aware AI.
            </p>
            <div className="pt-8 flex items-center justify-center gap-4">
              <Link href="/signup" className="px-6 py-3 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent)]/90 transition-colors">
                Start Reflection
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Dashboard | Serify</title>
      </Head>

      <div className="max-w-[1100px] mx-auto w-full px-6 md:px-10 py-8 space-y-12 pb-24">

        {isDemo && latestSessions.length === 0 && (
          <div className="bg-[var(--accent-light)] text-[var(--accent)] px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 mb-4">
            <Zap size={16} /> You&apos;re in demo mode — sign up to save your results.
          </div>
        )}

        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-sm">
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
            <div className="relative z-10">
              <div className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-widest mb-2">Analyze Something New</div>
              <h1 className="text-3xl font-display text-[var(--text)] mb-2">What did you just learn?</h1>
              <p className="text-[var(--muted)] text-[13.5px] mb-6">Paste a link, upload a PDF, or drop in your notes. Serify will tell you what you actually understood.</p>

              {errorMsg && (
                <div className="mb-6 bg-[var(--warn-light)] border border-[var(--warn)]/30 text-[var(--warn)] px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center animate-fade-in shadow-sm">
                  <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mb-4">
                {[
                  { id: 'youtube', label: 'YouTube URL', icon: <Youtube size={16} /> },
                  { id: 'article', label: 'Article URL', icon: <FileText size={16} /> },
                  { id: 'pdf', label: 'PDF Upload', icon: <FileUp size={16} /> },
                  { id: 'notes', label: 'Paste Notes', icon: <ClipboardPaste size={16} /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === tab.id
                      ? 'bg-[var(--text)] text-[var(--surface)] shadow-md'
                      : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                      }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 items-stretch">
                <div className="flex-1">
                  {activeTab === 'youtube' && <input value={inputValue} onChange={e => setInputValue(e.target.value)} type="text" placeholder="https://youtube.com/watch?v=..." className="w-full h-12 px-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors" />}
                  {activeTab === 'article' && <input value={inputValue} onChange={e => setInputValue(e.target.value)} type="text" placeholder="https://..." className="w-full h-12 px-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors" />}
                  {activeTab === 'pdf' && (
                    <div className="w-full h-12 px-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] border-dashed flex items-center justify-center text-[var(--muted)] cursor-pointer hover:bg-black/5">
                      <FileUp size={16} className="mr-2" /> Click to select or drag and drop .pdf
                    </div>
                  )}
                  {activeTab === 'notes' && <textarea value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Paste your notes, highlights, or any text here..." className="w-full h-24 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors resize-none" />}
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={(loading || !balance || balance.total_sparks < 11) || (!inputValue.trim() && activeTab !== 'pdf')}
                  className={`px-6 rounded-lg font-medium transition-colors flex flex-col items-center justify-center shrink-0 ${activeTab === 'notes' ? 'h-24' : 'h-12'} ${inputValue.trim() || activeTab === 'pdf' ? (balance && balance.total_sparks >= 11 ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-md shadow-[var(--accent)]/20' : 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed') : 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed'}`}
                >
                  <span className="flex items-center">Analyze <ArrowRight size={18} className="ml-2" /></span>
                  {(inputValue.trim() || activeTab === 'pdf') && balance && balance.total_sparks >= 11 && (
                    <span className="text-[10px] opacity-80 mt-0.5 flex items-center gap-1">
                      <Zap size={10} fill="currentColor" /> {balance.total_sparks >= 13 ? '13' : '11'} Sparks
                    </span>
                  )}
                </button>
              </div>

              {balance && balance.total_sparks < 13 && (
                <div className="mt-6 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-amber-100 text-amber-600 p-2 rounded-lg">
                      <Zap className="w-4 h-4" fill="currentColor" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text)] m-0">
                      Not enough Sparks for a full session
                    </h3>
                  </div>
                  <p className="text-[var(--muted)] mb-4 text-sm">
                    You need 13 Sparks to start a full session. You have {balance.total_sparks}.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/sparks"
                      className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-medium py-2 px-4 rounded-lg transition-colors flex-1 text-center"
                    >
                      Buy Sparks &rarr;
                    </Link>
                    {balance.total_sparks >= 11 && (
                      <button
                        onClick={handleAnalyze}
                        className="bg-[var(--surface)] hover:bg-[var(--border)]/20 border border-[var(--border)] text-[var(--text)] font-medium py-2 px-4 rounded-lg transition-colors flex-1 text-center flex items-center justify-center gap-2"
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

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Your Knowledge Gaps</h2>
            <Link href="/knowledge-map" className="text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] flex items-center">
              View all <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {latestSessions.filter(s => s.status === 'Completed' && s.result !== 'Strong').length > 0 ? (

              Array.from(new Map(latestSessions.filter(s => s.status === 'Completed' && s.result !== 'Strong').map(s => [s.title, s])).values())
                .slice(0, 3)
                .map((s, idx) => (
                  <Link key={s.id} href={`/session/${s.id}/feedback`} className="block bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer">
                    <div className="text-xs text-[var(--muted)] font-medium mb-1 truncate">{s.title}</div>
                    <h3 className="text-lg font-bold text-[var(--text)] mb-3 leading-tight">Identified Gaps</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--shallow-light)] text-[var(--shallow)]">
                        Shallow
                      </span>
                    </div>
                    <div className="w-full bg-[var(--border)] h-1 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--shallow)] w-[60%]"></div>
                    </div>
                  </Link>
                ))
            ) : latestSessions.some(s => s.status === 'Completed') ? (
              <div className="col-span-3 border-2 border-[var(--border)] border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 text-2xl font-bold font-display">✓</div>
                <h3 className="text-lg font-bold text-[var(--text)] mb-1">No Knowledge Gaps</h3>
                <p className="text-[var(--muted)] font-medium max-w-sm mx-auto">You've mastered all your recent sessions. Keep up the great work!</p>
              </div>
            ) : (
              <div className="col-span-3 border-2 border-[var(--border)] border-dashed rounded-xl p-8 flex items-center justify-center text-center">
                <p className="text-[var(--muted)] font-medium">Complete your first session to see your gaps here.</p>
              </div>
            )}
          </div>
        </section>

        {latestSessions.length > 0 && (
          <section className="bg-[var(--dark)] rounded-xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-[var(--shallow)]"><Target size={20} /></div>
              <div>
                <p className="text-white font-medium text-sm md:text-base leading-snug">
                  {latestSessions[0].status === 'Completed'
                    ? `Latest synthesis: Your grasp on ${latestSessions[0].title} is ${latestSessions[0].result === 'Strong' ? 'excellent' : 'developing'}.`
                    : "Focusing on your active session. Complete it to generate a new knowledge insight."
                  }
                </p>
              </div>
            </div>
            <Link href="/knowledge-map" className="shrink-0 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
              Review Now &rarr;
            </Link>
          </section>
        )}

        <section>
          <h2 className="text-xl font-bold mb-4">Recent Sessions</h2>
          <div className="space-y-3">
            {latestSessions.length > 0 ? (
              latestSessions.map(session => (
                <Link key={session.id} href={session.status === 'Completed' ? `/session/${session.id}/feedback` : `/session/${session.id}`} className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--accent)]/30 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center shrink-0">
                      {getIcon(session.type)}
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{session.title}</h4>
                      <p className="text-xs text-[var(--muted)] mt-0.5">{session.date} • {session.type}</p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-4">
                    {session.status === 'Completed' ? (
                      <>
                        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${session.result === 'Strong' ? 'text-[var(--accent)] bg-[var(--accent-light)]' : 'text-[var(--warn)] bg-[var(--warn-light)]'}`}>
                          {session.result === 'Strong' ? <ArrowUpRight size={12} /> : <AlertTriangle size={12} />}
                          {session.result === 'Strong' ? 'Strong Understanding' : 'Gaps Detected'}
                        </span>
                        <div className="flex h-1.5 w-24 rounded-full overflow-hidden bg-[var(--border)] opacity-80">
                          <div className={`h-full ${session.result === 'Strong' ? 'bg-[var(--accent)] w-full' : 'bg-[var(--shallow)] w-[60%]'}`}></div>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] animate-pulse">In Progress</span>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-[var(--bg)] rounded-full flex items-center justify-center mb-3">
                  <History size={24} className="text-[var(--muted)]" />
                </div>
                <h4 className="font-bold text-[var(--text)] mb-1">No sessions yet</h4>
                <p className="text-sm text-[var(--muted)] mb-4">Analyze something to get started.</p>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="px-5 py-2.5 bg-[var(--text)] text-[var(--surface)] rounded-lg text-sm font-medium hover:bg-black/80 transition-colors">
                  Analyze Now &rarr;
                </button>
              </div>
            )}
          </div>
          {latestSessions.length > 0 && (
            <div className="mt-4 text-center md:text-left">
              <Link href="/sessions" className="text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]">View all sessions &rarr;</Link>
            </div>
          )}
        </section>

      </div>
    </DashboardLayout>
  );
}
