import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Youtube, FileText, FileUp, ClipboardPaste, ArrowRight, Zap, Target, ArrowUpRight, AlertTriangle, History, Clock, Lock, BookOpen, Brain, Sparkles, CheckCircle, BarChart, Layers, Shield, Star, PlayCircle } from 'lucide-react';
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
  const [activeCurriculum, setActiveCurriculum] = useState<any>(null);

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

    // Fetch active curriculum
    if (user) {
      supabase.from('curricula')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .neq('status', 'abandoned')
        .order('last_activity_at', { ascending: false })
        .limit(1)
        .single()
        .then(({ data }) => setActiveCurriculum(data));
    }
  }, [user]);

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
        const errorMessage = errData.message || "Failed to extract concepts";
        const details = errData.details ? `\nAI Raw Response: ${errData.details}` : "";
        throw new Error(`${errorMessage}${details}`);
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
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans overflow-x-hidden selection:bg-[var(--accent-light)] selection:text-[var(--accent)]">
        <Head><title>Serify | Context-Aware Learning Reflection</title></Head>

        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center z-50 bg-[var(--bg)]/80 backdrop-blur-md border-b border-[var(--border)]/50">
          <div className="text-2xl font-display tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white">
              <Zap size={18} fill="currentColor" />
            </div>
            Serify
          </div>
          <div className="space-x-3 md:space-x-4 flex items-center">
            <Link href="/login" className="text-[var(--text)] hover:text-[var(--accent)] font-medium text-sm md:text-base transition-colors">Log in</Link>
            <Link href="/?demo=true" className="px-4 py-2 bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)] rounded-full text-sm font-bold shadow-sm hover:shadow transition-all flex items-center gap-2">
              <PlayCircle size={16} /> <span className="hidden sm:inline">Try Demo</span>
            </Link>
            <Link href="/signup" className="hidden sm:block px-5 py-2 bg-[var(--dark)] text-white rounded-full text-sm font-bold hover:bg-black transition-all">
              Sign Up Free
            </Link>
          </div>
        </nav>

        <main className="pt-24 md:pt-32 pb-20 flex flex-col items-center">
          {/* Hero Section */}
          <section className="w-full max-w-5xl mx-auto px-6 text-center animate-fade-in mt-10 md:mt-20 mb-24 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent)]/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-light)] text-[var(--accent)] text-xs font-bold uppercase tracking-widest mb-6 border border-[var(--accent)]/20 animate-slide-up">
              <Sparkles size={14} /> The Next-Gen Learning Engine
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-display leading-[1.05] tracking-tight text-balance mx-auto animate-slide-up" style={{ animationDelay: '100ms' }}>
              Stop Testing.<br />
              <span className="text-[var(--accent)] italic">Start Mastering.</span>
            </h1>

            <p className="text-lg md:text-xl text-[var(--muted)] max-w-2xl mx-auto mt-6 mb-10 text-balance animate-slide-up" style={{ animationDelay: '200ms' }}>
              Serify is an AI-powered diagnostic engine that moves beyond simple flashcards. We analyze what you read, watch, or study, and generate metacognitive probes to map your exact knowledge gaps.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
              <Link href="/signup" className="w-full sm:w-auto px-8 py-4 bg-[var(--accent)] text-white rounded-full font-bold text-lg hover:bg-[var(--accent)]/90 hover:scale-[1.02] transition-all shadow-lg shadow-[var(--accent)]/20 flex items-center justify-center gap-2">
                Start Reflecting <ArrowRight size={20} />
              </Link>
              <Link href="/?demo=true" className="w-full sm:w-auto px-8 py-4 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-full font-bold text-lg hover:border-[var(--text)] hover:shadow-sm transition-all flex items-center justify-center gap-2">
                See How It Works
              </Link>
            </div>

            <div className="mt-12 flex items-center justify-center gap-6 text-sm font-medium text-[var(--muted)] animate-slide-up" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center gap-1.5"><CheckCircle size={16} className="text-[var(--accent)]" /> No credit card required</div>
              <div className="flex items-center gap-1.5"><CheckCircle size={16} className="text-[var(--accent)]" /> 15 Free Sparks</div>
            </div>
          </section>

          {/* Social Proof / Dashboard Preview */}
          <section className="w-full max-w-6xl mx-auto px-6 mb-32 relative z-10 animate-fade-in" style={{ animationDelay: '500ms' }}>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur shadow-2xl overflow-hidden">
              <div className="h-12 border-b border-[var(--border)] bg-[#FDFCF9] flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="p-4 md:p-8 bg-gradient-to-br from-[var(--surface)] to-[var(--bg)]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <div className="h-8 w-48 bg-[var(--border)] rounded animate-pulse"></div>
                    <div className="h-4 w-full max-w-md bg-[var(--border)]/60 rounded animate-pulse"></div>
                    <div className="grid grid-cols-4 gap-4 pt-4">
                      <div className="h-16 bg-white border border-[var(--border)] rounded-xl shadow-sm flex items-center justify-center text-[var(--muted)]"><Youtube size={24} /></div>
                      <div className="h-16 bg-white border border-[var(--border)] rounded-xl shadow-sm flex items-center justify-center text-[var(--muted)]"><FileText size={24} /></div>
                      <div className="h-16 bg-white border border-[var(--border)] rounded-xl shadow-sm flex items-center justify-center text-[var(--muted)]"><FileUp size={24} /></div>
                      <div className="h-16 bg-[var(--accent)] text-white rounded-xl shadow-inner flex flex-col items-center justify-center gap-1 font-bold text-sm">
                        <Zap size={16} fill="currentColor" /> Analyze
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-[var(--border)] rounded-xl p-5 shadow-sm">
                    <div className="text-xs font-bold uppercase text-[var(--warn)] mb-2">Knowledge Gap</div>
                    <div className="w-full h-2 bg-[var(--border)] rounded-full mb-3"><div className="w-[60%] h-full bg-[var(--warn)] rounded-full"></div></div>
                    <div className="h-4 w-3/4 bg-[var(--border)]/60 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="w-full max-w-5xl mx-auto px-6 mb-32">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-display mb-4 text-balance">The active recall pipeline.</h2>
              <p className="text-[var(--muted)] text-lg max-w-xl mx-auto">Skip the manual flashcard creation. Let Serify map out your active recall sessions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              <div className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-0.5 bg-[var(--border)] -z-10"></div>

              {[
                { step: '01', title: 'Input', desc: 'Paste a YouTube link, PDF, or article.', icon: <ClipboardPaste size={24} /> },
                { step: '02', title: 'Extract', desc: 'AI identifies core concepts instantly.', icon: <Brain size={24} /> },
                { step: '03', title: 'Recall', desc: 'Answer diagnostic, scenario-based probes.', icon: <Target size={24} /> },
                { step: '04', title: 'Master', desc: 'See your knowledge gaps visually mapped.', icon: <BarChart size={24} /> },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center group">
                  <div className="w-14 h-14 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:-translate-y-2 group-hover:bg-[var(--accent)] group-hover:text-white group-hover:border-[var(--accent)] transition-all duration-300">
                    {item.icon}
                  </div>
                  <div className="text-xs font-bold text-[var(--muted)] mb-2">STEP {item.step}</div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Bento Features */}
          <section className="w-full max-w-6xl mx-auto px-6 mb-32">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-auto md:auto-rows-[280px]">

              <div className="md:col-span-2 bg-gradient-to-br from-[#1A1916] to-[#2C2A25] rounded-3xl p-8 md:p-10 flex flex-col justify-between text-white overflow-hidden relative group">
                <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                  <Brain size={240} className="-mr-10 -mb-10" />
                </div>
                <div className="relative z-10 max-w-md">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md mb-6 border border-white/10">
                    <Zap size={24} className="text-amber-400" fill="currentColor" />
                  </div>
                  <h3 className="text-3xl font-display mb-3">Context-Aware AI</h3>
                  <p className="text-white/70 text-lg leading-relaxed">Questions derived precisely from your source text. No generic trivia, just targeted metacognitive reflection.</p>
                </div>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div className="w-12 h-12 bg-[var(--shallow-light)] text-[var(--shallow)] rounded-xl flex items-center justify-center mb-6">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Expose the Illusion of Competence</h3>
                  <p className="text-sm text-[var(--muted)]">Reading feels like learning. Serify quickly finds out if you actually understand the core mechanics.</p>
                </div>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div className="w-12 h-12 bg-[var(--accent-light)] text-[var(--accent)] rounded-xl flex items-center justify-center mb-6">
                  <Layers size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Spaced Tracking</h3>
                  <p className="text-sm text-[var(--muted)]">Every session creates a persistent Knowledge Map updating over time as you review.</p>
                </div>
              </div>

              <div className="md:col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--missing-light)] text-[var(--missing)] font-bold text-xs uppercase mb-4">
                    <Shield size={14} /> Built for Students & Pros
                  </div>
                  <h3 className="text-3xl font-display mb-3 text-balance">Any format. Any topic.</h3>
                  <p className="text-[var(--muted)] text-balance">Whether it's a 2-hour technical lecture on YouTube, an academic paper PDF, or your raw lecture notes, Serify digests it instantly.</p>
                </div>
                <div className="shrink-0 flex flex-wrap gap-4 md:flex-col justify-center">
                  {['YouTube', 'PDF', 'Articles', 'Notes'].map((type, i) => (
                    <div key={i} className="px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-center font-medium shadow-sm flex items-center gap-2 text-sm">
                      <CheckCircle size={14} className="text-[var(--accent)]" /> {type}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </section>

          {/* Bottom CTA */}
          <section className="w-full max-w-4xl mx-auto px-6 mt-16 pb-16">
            <div className="bg-[var(--accent)] rounded-[3rem] p-10 md:p-16 text-center text-white relative flex flex-col items-center">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
              <div className="relative z-10">
                <h2 className="text-4xl md:text-6xl font-display mb-6">Ready to actually learn?</h2>
                <p className="text-white/80 text-lg max-w-xl mx-auto mb-10">Sign up in seconds. Get 15 Sparks free. See exactly what you've proven you know.</p>
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[var(--accent)] rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl">
                  Get Started For Free <ArrowRight size={20} />
                </Link>
                <div className="mt-6 text-white/60 text-sm font-medium">No credit card required. Cancel anytime.</div>
              </div>
            </div>
          </section>

        </main>

        <footer className="w-full border-t border-[var(--border)] bg-[var(--surface)] py-8 mt-auto">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-xl font-display flex items-center gap-2 text-[var(--text)]">
              <Zap size={16} fill="currentColor" className="text-[var(--accent)]" /> Serify
            </div>
            <div className="text-sm text-[var(--muted)] font-medium">
              © {new Date().getFullYear()} Serify Engine. All rights reserved.
            </div>
          </div>
        </footer>
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

        <div className={latestSessions.length === 0 && !isDemo ? "grid grid-cols-1 md:grid-cols-3 gap-8 items-start" : "space-y-12"}>
          <div className={latestSessions.length === 0 && !isDemo ? "md:col-span-2 space-y-8" : "space-y-8"}>

            {activeCurriculum && (
              <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-widest mb-1.5 flex items-center gap-1.5">
                      <BookOpen size={12} /> Active Curriculum
                    </div>
                    <h2 className="text-2xl font-display text-[var(--text)]">{activeCurriculum.title}</h2>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-light text-[var(--text)]">
                      {Math.round(((activeCurriculum.current_concept_index || 0) / Math.max(1, activeCurriculum.concept_count)) * 100)}%
                    </div>
                    <div className="text-xs text-[var(--muted)]">{activeCurriculum.current_concept_index || 0} of {activeCurriculum.concept_count}</div>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-[var(--border)] rounded-full mb-6 overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                    style={{ width: `${Math.round(((activeCurriculum.current_concept_index || 0) / Math.max(1, activeCurriculum.concept_count)) * 100)}%` }}
                  />
                </div>

                <Link
                  href={`/learn/curriculum/${activeCurriculum.id}`}
                  className="inline-flex w-full justify-center items-center bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 py-3 rounded-xl font-medium transition-colors shadow-sm"
                >
                  Resume Learning &rarr;
                </Link>
              </section>
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

                  {latestSessions.length === 0 && !isDemo && (
                    <p className="text-sm text-[var(--muted)] mt-5 font-medium">Start with something you recently watched, read, or studied. The more recent the better.</p>
                  )}

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
          </div>

          {latestSessions.length === 0 && !isDemo && (
            <div className="md:col-span-1">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm sticky top-8">
                <h2 className="text-xl font-display font-medium text-[var(--text)] mb-6">You&apos;re all set.</h2>
                <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm mb-6">
                  <Zap size={16} fill="currentColor" className="text-amber-500" />
                  <span>15 Sparks ready</span>
                </div>
                <p className="text-[var(--text)] text-sm mb-4 font-medium">Paste anything you&apos;ve been studying into the box.</p>
                <p className="text-[var(--muted)] text-sm leading-relaxed">Your gaps, Concept Vault, and learning history appear here after your first session.</p>
              </div>
            </div>
          )}

          {(latestSessions.length > 0 || isDemo) && (
            <>
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
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
