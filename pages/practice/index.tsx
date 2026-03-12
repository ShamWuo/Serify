import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/types/db_types_new';
import { PracticeSession, ReviewSchedule } from '@/types/serify';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import SEO from '@/components/Layout/SEO';
import { 
    Activity, 
    Beaker, 
    Brain, 
    CheckCircle, 
    FileText, 
    Printer, 
    Play, 
    Target, 
    Zap, 
    ChevronRight,
    Sparkles,
    GraduationCap,
    Clock,
    History
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function PracticeDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [dueReviews, setDueReviews] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<PracticeSession[]>([]);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    }

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // Fetch Due Reviews via API
            const { data: { session } } = await supabase.auth.getSession();
            const reviewRes = await fetch('/api/practice/review/due', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            if (reviewRes.ok) {
                const reviewData = await reviewRes.json();
                setDueReviews(reviewData.dueReviews || []);
            }

            // Fetch Recent Sessions
            const { data: sessions, count, error } = await supabase
                .from('practice_sessions')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .order('started_at', { ascending: false })
                .limit(4);

            if (!error && sessions) {
                setRecentSessions(sessions as any as PracticeSession[]);
                setSessionCount(count || 0);
            }
        } catch (error) {
            console.error("Error fetching practice data:", error);
            toast.error("Failed to load dashboard data");
        } finally {
            setIsLoading(false);
        }
    };

    fetchDashboardData();
  }, [user]);

  if (!user && !isLoading) {
    return (
        <div className="flex h-screen items-center justify-center p-4 text-center bg-[var(--bg)]">
            <p className="text-[var(--muted)]">Please sign in to access Practice Mode.</p>
        </div>
    );
  }

  return (
    <DashboardLayout>
      <SEO 
        title="Practice Lab | Serify" 
        description="Master your knowledge through active recall, scenario simulations, and spaced repetition."
      />

      <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 md:py-8 relative z-10">
        <div className="max-w-6xl mx-auto space-y-12">
            
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-in-up">
                <div className="space-y-4 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full text-xs font-bold uppercase tracking-wider">
                        <Target size={14} /> Cognitive Practice Lab
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display text-[var(--text)] tracking-tight">
                        Perfect Your <span className="text-[var(--accent)]">Execution</span>
                    </h1>
                    <p className="text-lg text-[var(--muted)] leading-relaxed">
                        The lab is where knowledge transforms into intuition. Start from your Vault or practice something entirely new.
                    </p>
                </div>
            </header>

            {/* Frictionless Ad-hoc Entry */}
            <div className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                <div className="premium-card p-6 md:p-8 rounded-3xl bg-white border-[var(--border)] shadow-xl shadow-[var(--accent)]/5 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 blur-3xl rounded-full -mr-16 -mt-16" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-1 space-y-4">
                            <h2 className="text-2xl font-display text-[var(--text)]">Practice Something New</h2>
                            <p className="text-sm text-[var(--muted)]">Type a topic, a concept, or paste an article URL to generate instant practice materials. No Vault required.</p>
                            
                            <form 
                                className="relative group"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const topic = (e.currentTarget.elements.namedItem('topic') as HTMLInputElement).value;
                                    if (topic) router.push(`/practice/exam?topic=${encodeURIComponent(topic)}`);
                                }}
                            >
                                <input 
                                    name="topic"
                                    type="text" 
                                    placeholder="e.g. How TCP/IP works, The French Revolution, or paste a URL..."
                                    className="w-full pl-6 pr-32 py-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl text-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all outline-none"
                                />
                                <button 
                                    type="submit"
                                    className="absolute right-2 top-2 bottom-2 px-6 bg-[var(--accent)] text-white text-xs font-bold rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                                >
                                    Start <ChevronRight size={14} />
                                </button>
                            </form>
                        </div>
                        
                        <div className="hidden md:flex items-center gap-4 text-[var(--muted)] px-8 border-l border-[var(--border)]">
                            <div className="text-center space-y-1">
                                <p className="text-2xl font-display text-[var(--text)]">Day 1</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest">Ready</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Action Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Primary Actions (Left/Center) */}
                <div className="lg:col-span-8 space-y-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    
                    {/* Spaced Repetition Hero Card */}
                    <div className="relative overflow-hidden premium-card rounded-3xl group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)] blur-[100px] opacity-[0.05] -mr-32 -mt-32 transition-opacity group-hover:opacity-[0.08]" />
                        
                        <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center relative z-10">
                            <div className="w-full md:w-auto flex-shrink-0">
                                <div className={`w-24 h-24 md:w-32 md:h-32 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all ${
                                    dueReviews.length > 0 
                                    ? 'bg-[var(--accent)] shadow-[var(--accent)]/20 animate-pulse-glow' 
                                    : 'bg-[var(--muted)]/20 shadow-none'
                                }`}>
                                    <Brain size={48} className="md:w-16 md:h-16" />
                                </div>
                            </div>
                            
                            <div className="flex-1 space-y-6 text-center md:text-left">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-center md:justify-start gap-4">
                                        <h2 className="text-3xl font-display text-[var(--text)]">Spaced Repetition</h2>
                                        {dueReviews.length > 0 ? (
                                            <span className="bg-orange-500/10 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-500/20">Action Required</span>
                                        ) : (
                                            <span className="bg-[var(--border)] text-[var(--muted)] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[var(--border)]">Vault Logic</span>
                                        )}
                                    </div>
                                    <p className="text-[var(--muted)] md:max-w-lg">
                                        {dueReviews.length > 0 
                                            ? "Our algorithm identifies the exact moment before you forget a concept. Complete your due reviews to graduate nodes."
                                            : "This mode requires active nodes in your Vault to identify review cycles. Start a session or use Flow Mode to build your schedule."
                                        }
                                    </p>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-4xl font-display ${dueReviews.length > 0 ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>{dueReviews.length}</span>
                                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Nodes due for review</span>
                                    </div>
                                    
                                    <Link 
                                        href="/practice/review" 
                                        className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                                            dueReviews.length > 0 
                                            ? 'bg-[var(--accent)] text-white hover:shadow-md hover:-translate-y-0.5' 
                                            : 'bg-[var(--border)] text-[var(--muted)]'
                                        }`}
                                    >
                                        {dueReviews.length > 0 ? 'Start Review Session' : 'View Schedule'} <ChevronRight size={18} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Mode Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Exam Sim */}
                        <div className="premium-card p-6 rounded-2xl space-y-4 hover:border-orange-200 group transition-all">
                            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                                <FileText size={24} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-display text-[var(--text)]">Exam Simulation</h3>
                                <p className="text-sm text-[var(--muted)] leading-relaxed">
                                    Standardized testing to expose misconceptions. Works with Vault concepts or any topic.
                                </p>
                            </div>
                            <div className="pt-2 flex items-center justify-between">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                                    <Zap size={10} /> 1 AI SESSION
                                </div>
                                <Link 
                                    href="/practice/exam" 
                                    className="text-sm font-bold text-[var(--accent)] hover:translate-x-1 transition-transform inline-flex items-center gap-1"
                                >
                                    Start Sim <ChevronRight size={16} />
                                </Link>
                            </div>
                        </div>

                        {/* Scenario Practice */}
                        <div className="premium-card p-6 rounded-2xl space-y-4 hover:border-[#7c3d9e]/30 group transition-all">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-[#7c3d9e] border border-purple-100 group-hover:bg-[#7c3d9e] group-hover:text-white transition-all duration-300">
                                <Activity size={24} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-display text-[var(--text)]">Scenario Practice</h3>
                                <p className="text-sm text-[var(--muted)] leading-relaxed">
                                    Real-world problem solving. Perfect for ad-hoc case studies or applying Vault knowledge.
                                </p>
                            </div>
                            <div className="pt-2 flex items-center justify-between">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-[#7c3d9e] bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                                    <Zap size={10} /> 0.5 AI SESSION
                                </div>
                                <Link 
                                    href="/practice/scenario" 
                                    className="text-sm font-bold text-[var(--accent)] hover:translate-x-1 transition-transform inline-flex items-center gap-1"
                                >
                                    Apply Concepts <ChevronRight size={16} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Stats & History (Right) */}
                <div className="lg:col-span-4 space-y-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    
                    {/* Historical Feed */}
                    <div className="premium-card rounded-2xl overflow-hidden flex flex-col min-h-[400px]">
                        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]/50">
                            <div className="flex items-center gap-2">
                                <History size={18} className="text-[var(--muted)]" />
                                <h3 className="font-bold text-sm uppercase tracking-wider">Practice Record</h3>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-[var(--bg)] border border-[var(--border)] rounded-full text-[var(--muted)]">
                                {sessionCount} Total
                            </span>
                        </div>
                        
                        <div className="flex-grow p-5">
                            {isLoading ? (
                                <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-50">
                                    <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                                    <span className="text-xs font-medium">Analyzing history...</span>
                                </div>
                            ) : recentSessions.length > 0 ? (
                                <div className="space-y-6">
                                    {recentSessions.map((session, idx) => (
                                        <div key={session.id} className="relative pl-6 group/item">
                                            {idx !== recentSessions.length - 1 && (
                                                <div className="absolute left-1 top-4 bottom-[-24px] w-px bg-[var(--border)]" />
                                            )}
                                            <div className={`absolute left-0 top-1 w-2 h-2 rounded-full border-2 bg-white transition-all ${
                                                session.type === 'exam' ? 'border-orange-500' :
                                                session.type === 'scenario' ? 'border-[#7c3d9e]' :
                                                'border-[var(--accent)]'
                                            }`} />
                                            
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-bold text-[var(--text)] capitalize">
                                                        {session.type} Practice
                                                    </p>
                                                    <span className="text-[9px] font-bold text-[var(--muted)]">
                                                        {new Date(session.started_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                                                    {session.status === 'completed' 
                                                        ? `Performance rated as ${session.overall_performance || 'Standard'}`
                                                        : 'Session interrupted'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    <button className="w-full py-2 bg-[var(--bg)] hover:bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--text)] transition-all mt-4">
                                        View Full History
                                    </button>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-10 opacity-60">
                                    <div className="w-16 h-16 rounded-3xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
                                        <Beaker size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold">Lab is empty</p>
                                        <p className="text-[11px]">Start your first practice session to see the laboratory logs.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Print Utility Card */}
                    <div className="premium-card p-6 rounded-2xl bg-gradient-to-br from-[#f0f7f4] to-[#ffffff] border-[#e8f2ee] shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-110 transition-transform">
                            <Printer size={80} />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[var(--accent)] shadow-sm">
                                    <Printer size={16} />
                                </div>
                                <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--accent)]">Analog Mode</h3>
                            </div>
                            <p className="text-xs text-[#2a5c45] font-medium leading-relaxed">
                                Need to study away from a screen? Generate customized printable practice worksheets for any exam configuration.
                            </p>
                            <Link 
                                href="/practice/exam?print=true" 
                                className="inline-flex items-center gap-2 text-xs font-black text-[var(--accent)] group-hover:translate-x-1 transition-transform"
                            >
                                Generate PDF <ChevronRight size={14} />
                            </Link>
                        </div>
                    </div>

                </div>
            </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
