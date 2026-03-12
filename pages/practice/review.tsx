import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import SEO from '@/components/Layout/SEO';
import { 
    Brain, 
    Send, 
    CheckCircle, 
    ArrowRight, 
    XCircle, 
    ChevronRight, 
    Award,
    Target,
    Zap,
    History,
    RefreshCcw,
    GraduationCap,
    Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

export default function SpacedRepetitionReview() {
    const { user } = useAuth();
    const router = useRouter();
    
    // Core State
    const [isLoading, setIsLoading] = useState(true);
    const [isEvaluating, setIsEvaluating] = useState(false);
    
    // Data State
    const [dueReviews, setDueReviews] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    
    // Feedback State
    const [showFeedback, setShowFeedback] = useState(false);
    const [currentEvaluation, setCurrentEvaluation] = useState<any>(null);
    const [completedReviews, setCompletedReviews] = useState<any[]>([]);
    const [hasConcepts, setHasConcepts] = useState(false);

    useEffect(() => {
        if (!user) return;
        const fetchDueReviews = async () => {
             try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch('/api/practice/review/due', {
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    
                    // Also check if any concepts exist at all to distinguish empty vault
                    const { count } = await supabase
                        .from('knowledge_nodes')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id);
                    
                    setHasConcepts((count || 0) > 0);
                    
                    const prompts = [
                        "Explain {concept} to someone who has no background in this field.",
                        "What is the exact mechanism by which {concept} works?",
                        "What is the main problem that {concept} solves?",
                        "Compare {concept} to its closest alternative. Why use {concept}?",
                        "What are the limitations or edge cases of {concept}?"
                    ];

                    const reviewsWithPrompts = (data.dueReviews || []).map((review: any) => {
                        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
                        return {
                            ...review,
                            promptUsed: randomPrompt.replace('{concept}', review.knowledge_nodes.name)
                        };
                    });

                    setDueReviews(reviewsWithPrompts);
                }
             } catch (error) {
                 toast.error("Failed to fetch due reviews");
             } finally {
                 setIsLoading(false);
             }
        };
        fetchDueReviews();
    }, [user]);

    const handleSubmit = async () => {
        if (!userAnswer.trim()) {
            toast.error("Please provide an answer.");
            return;
        }

        setIsEvaluating(true);
        const currentReview = dueReviews[currentIndex];

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/practice/review/evaluate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    reviewId: currentReview.id,
                    conceptId: currentReview.concept_id,
                    promptUsed: currentReview.promptUsed,
                    userAnswer
                })
            });

            if (!res.ok) throw new Error("Evaluation failed");
            
            const data = await res.json();
            
            setCurrentEvaluation(data);
            setShowFeedback(true);
            
            setCompletedReviews(prev => [...prev, {
                review: currentReview,
                evaluation: data.evaluation,
                newInterval: data.newInterval,
                isMastered: data.isMastered
            }]);

        } catch (error: any) {
             toast.error(error.message || "Failed to submit review");
        } finally {
             setIsEvaluating(false);
        }
    };

    const handleNext = () => {
        setUserAnswer('');
        setShowFeedback(false);
        setCurrentEvaluation(null);
        setCurrentIndex(prev => prev + 1);
    };

    if (!user) return null;

    if (isLoading) {
         return (
             <DashboardLayout>
                 <div className="flex flex-col justify-center items-center h-[calc(100vh-8rem)] space-y-4">
                      <div className="animate-pulse-glow text-[var(--accent)]"><Brain size={64} /></div>
                      <p className="text-sm font-bold uppercase tracking-widest text-[var(--muted)] animate-pulse">Scanning Neural Paths...</p>
                 </div>
             </DashboardLayout>
         );
    }

    if (dueReviews.length === 0) {
        // use the state we fetched in useEffect

        return (
            <DashboardLayout>
                <div className="max-w-2xl mx-auto px-4 py-24 text-center animate-fade-in-up">
                     <div className="w-24 h-24 bg-[var(--accent)]/10 text-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-sm">
                         {hasConcepts ? <CheckCircle size={48} /> : <Brain size={48} />}
                     </div>
                     <h1 className="text-5xl font-display text-[var(--text)] mb-4 tracking-tight">
                         {hasConcepts ? "You're all caught up!" : "Your Vault is empty"}
                     </h1>
                     <p className="text-lg text-[var(--muted)] mb-10 leading-relaxed max-w-md mx-auto">
                         {hasConcepts 
                            ? "There are no concepts due for review right now. Your long-term retention is secure for today."
                            : "Start a practice session or add content to build your long-term memory. Once you practice, concepts will appear here for reinforcement."}
                     </p>
                     <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button 
                            onClick={() => router.push('/practice')} 
                            className="w-full sm:w-auto px-8 py-3 bg-[var(--accent)] hover:shadow-lg hover:-translate-y-0.5 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                             Return to Arena <ChevronRight size={18} />
                        </button>
                        {!hasConcepts && (
                            <button 
                                onClick={() => router.push('/practice/exam?adhoc=true')} 
                                className="w-full sm:w-auto px-8 py-3 bg-white border border-[var(--border)] text-[var(--text)] font-bold rounded-xl transition-all hover:bg-slate-50"
                            >
                                Start First Session
                            </button>
                        )}
                     </div>
                </div>
            </DashboardLayout>
        );
    }

    // Summary Screen
    if (currentIndex >= dueReviews.length) {
         return (
             <DashboardLayout>
                 <div className="max-w-3xl mx-auto px-4 py-12 space-y-10 animate-fade-in-up">
                      <div className="text-center space-y-4">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">
                              <GraduationCap size={14} /> Training Complete
                          </div>
                          <h1 className="text-5xl font-display text-[var(--text)] tracking-tight">Review Session Complete</h1>
                          <p className="text-lg text-[var(--muted)]">Knowledge nodes reinforced: <span className="text-[var(--text)] font-bold">{completedReviews.length}</span></p>
                      </div>

                      <div className="space-y-4">
                          {completedReviews.map((item, i) => (
                              <div key={i} className="premium-card p-6 rounded-2xl flex items-center justify-between group">
                                  <div className="flex items-center gap-6">
                                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                                          item.evaluation.score === 'strong' ? 'bg-green-50 text-green-600 border border-green-100' :
                                          item.evaluation.score === 'weak' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                          'bg-yellow-50 text-yellow-600 border border-yellow-100'
                                      }`}>
                                          {item.isMastered ? <Award size={28} /> : <Brain size={28} />}
                                      </div>
                                      <div className="space-y-1">
                                          <p className="font-display text-2xl text-[var(--text)]">{item.review.knowledge_nodes.name}</p>
                                          <div className="flex items-center gap-3">
                                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                                  item.evaluation.score === 'strong' ? 'bg-green-50 text-green-700 border-green-100' :
                                                  item.evaluation.score === 'weak' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                  'bg-yellow-50 text-yellow-700 border-yellow-100'
                                              }`}>
                                                  {item.evaluation.score} recall
                                              </span>
                                              {item.isMastered && (
                                                  <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100">Mastered</span>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div className="text-right space-y-1">
                                      <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-widest block">Next Interval</span>
                                      <span className="text-lg font-display text-[var(--text)]">{item.newInterval} days</span>
                                  </div>
                              </div>
                          ))}
                      </div>

                      <div className="pt-6 flex justify-center">
                           <button 
                                onClick={() => router.push('/practice')} 
                                className="px-10 py-4 bg-[var(--text)] text-white hover:bg-black font-bold rounded-2xl transition-all shadow-md active:scale-95"
                            >
                                Finish Session
                           </button>
                      </div>
                 </div>
             </DashboardLayout>
         );
    }

    // Review Screen
    const currentReview = dueReviews[currentIndex];

    return (
        <DashboardLayout>
            <SEO title={`Testing: ${currentReview.knowledge_nodes.name} | Serify`} />
            
            <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col h-[calc(100vh-8rem)]">
                
                {/* Minimal Header */}
                <header className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--border)]">
                     <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white shadow-sm">
                             <Brain size={20} />
                         </div>
                         <div>
                             <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--accent)]">Active Recall</h2>
                             <p className="text-[10px] font-medium text-[var(--muted)]">STIMULATE NEURAL RETRIEVAL</p>
                         </div>
                     </div>
                     <div className="flex items-baseline gap-1 bg-[var(--surface)] border border-[var(--border)] px-4 py-1.5 rounded-full">
                         <span className="text-sm font-bold text-[var(--text)]">{currentIndex + 1}</span>
                         <span className="text-[10px] font-bold text-[var(--muted)] uppercase">/ {dueReviews.length}</span>
                     </div>
                </header>
                
                {/* Main Content Area */}
                <div className="flex-grow flex flex-col gap-6 lg:gap-8 overflow-hidden">
                    
                    {/* The Prompt Card */}
                    <div className="premium-card rounded-3xl p-8 md:p-12 relative overflow-hidden flex-shrink-0">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                            <Brain size={280} />
                        </div>
                        
                        <div className="relative z-10 space-y-8">
                            <div className="space-y-2 text-center">
                                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.2em]">Target Identification</span>
                                <h1 className="text-5xl md:text-7xl font-display text-[var(--text)] tracking-tight">
                                    {currentReview.knowledge_nodes.name}
                                </h1>
                            </div>
                            
                            <div className="bg-[var(--bg)] border border-[var(--border)] p-6 rounded-2xl shadow-inner max-w-2xl mx-auto">
                                <p className="text-xl md:text-2xl text-[var(--text)] font-display italic text-center leading-relaxed">
                                    &quot;{currentReview.promptUsed}&quot;
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Interaction / Feedback Area */}
                    <div className="flex-grow flex flex-col min-h-0">
                        {!showFeedback ? (
                            <div className="flex-grow flex flex-col bg-white border border-[var(--border)] rounded-3xl p-4 md:p-6 shadow-sm">
                                <textarea
                                    value={userAnswer}
                                    onChange={(e) => setUserAnswer(e.target.value)}
                                    placeholder="Explain the concept in detail from memory..."
                                    className="flex-grow bg-[#fcfdfc] border border-[var(--border)] rounded-2xl p-6 md:p-8 text-lg text-[var(--text)] placeholder-[#c0ccca] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all leading-relaxed font-serif"
                                    autoFocus
                                />
                                <div className="mt-4 flex items-center justify-between">
                                     <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--muted)] px-4">
                                         <Clock size={12} /> SPADE-ALGORITHM ACTIVE
                                     </div>
                                     <button
                                         onClick={handleSubmit}
                                         disabled={isEvaluating || !userAnswer.trim()}
                                         className="px-10 py-3.5 bg-[var(--text)] hover:bg-black text-white font-bold rounded-2xl transition-all flex items-center gap-3 shadow-lg disabled:opacity-30 disabled:translate-y-0 hover:-translate-y-1 active:translate-y-0"
                                     >
                                         {isEvaluating ? (
                                             <><RefreshCcw size={18} className="animate-spin" /> Evaluating Recall...</>
                                         ) : (
                                             <><Send size={18} /> Grade Explanation</>
                                         )}
                                     </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-grow flex flex-col bg-white border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-sm overflow-hidden animate-fade-in-up">
                                <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar space-y-10">
                                     
                                     {/* Evaluation Results */}
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         {currentEvaluation?.evaluation?.score === 'strong' && (
                                             <div className="bg-green-50 border border-green-100 p-6 rounded-2xl flex items-start gap-4">
                                                 <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-green-200">
                                                     <CheckCircle size={24} />
                                                 </div>
                                                 <div className="space-y-1">
                                                     <h3 className="text-lg font-bold text-green-800">Perfect Retrieval</h3>
                                                     <p className="text-sm text-green-700 leading-relaxed font-medium">Concept reinforced. Interval extended to {currentEvaluation?.newInterval} days.</p>
                                                 </div>
                                             </div>
                                         )}
                                         
                                         {currentEvaluation?.evaluation?.score === 'developing' && (
                                             <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-2xl flex items-start gap-4">
                                                 <div className="w-10 h-10 rounded-full bg-yellow-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-yellow-200">
                                                     <Brain size={24} />
                                                 </div>
                                                 <div className="space-y-1">
                                                     <h3 className="text-lg font-bold text-yellow-800">Concept Gaps Detected</h3>
                                                     <p className="text-sm text-yellow-700 leading-relaxed font-medium">Core idea present, but missing key technical nuances.</p>
                                                 </div>
                                             </div>
                                         )}

                                         {currentEvaluation?.evaluation?.score === 'weak' && (
                                             <div className="bg-orange-50 border border-orange-100 p-6 rounded-2xl flex items-start gap-4">
                                                 <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-200">
                                                     <RefreshCcw size={24} />
                                                 </div>
                                                 <div className="space-y-1">
                                                     <h3 className="text-lg font-bold text-orange-800">Critical Misconception</h3>
                                                     <p className="text-sm text-orange-700 leading-relaxed font-medium">The explanation failed to capture the essence. Review required.</p>
                                                 </div>
                                             </div>
                                         )}

                                         <div className="premium-card p-6 rounded-2xl flex items-start gap-4 border-dashed">
                                             <div className="w-10 h-10 rounded-full bg-[var(--bg)] text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--border)]">
                                                 <Zap size={20} />
                                             </div>
                                             <div className="space-y-1">
                                                 <h3 className="text-lg font-display text-[var(--text)]">Cognitive Boost</h3>
                                                 <p className="text-[11px] text-[var(--muted)] uppercase font-bold tracking-widest leading-relaxed">Active recall strength: High</p>
                                             </div>
                                         </div>
                                     </div>

                                     {/* Detailed Feedback */}
                                     <div className="space-y-4">
                                         <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
                                             <span className="w-1 h-1 bg-[var(--accent)] rounded-full" /> Diagnostic Feedback
                                         </h3>
                                         <div className="text-lg text-[var(--text)] leading-relaxed font-serif prose prose-slate max-w-none">
                                             <ReactMarkdown>{currentEvaluation?.evaluation?.feedback}</ReactMarkdown>
                                         </div>
                                     </div>

                                     {/* The Actual Definition */}
                                     <div className="space-y-4 pt-10 border-t border-[var(--border)]">
                                         <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Reference Definition</h3>
                                         <div className="bg-[var(--bg)] p-8 rounded-3xl border border-[var(--border)] text-xl font-display leading-relaxed text-[var(--text)] italic md:px-20 relative">
                                             <span className="text-[60px] font-serif absolute left-6 top-0 opacity-10 text-[var(--accent)] leading-none">&ldquo;</span>
                                             {currentReview.knowledge_nodes.description}
                                             <span className="text-[60px] font-serif absolute right-6 bottom-[-20px] opacity-10 text-[var(--accent)] leading-none">&rdquo;</span>
                                         </div>
                                     </div>

                                </div>

                                <div className="mt-8 pt-4 border-t border-[var(--border)] flex justify-end">
                                    <button
                                         onClick={handleNext}
                                         className="px-10 py-4 bg-[var(--text)] text-white hover:bg-black font-bold rounded-2xl transition-all flex items-center gap-3 shadow-lg hover:-translate-y-1 active:translate-y-0"
                                     >
                                         Continue to Next <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
}
