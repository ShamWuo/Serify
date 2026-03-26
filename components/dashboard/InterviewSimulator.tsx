import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Send, MessageSquare, Play, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Message {
  role: 'user' | 'ai' | 'system';
  content: string;
}

interface InterviewSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  plan: string;
}

export function InterviewSimulator({ isOpen, onClose, plan }: InterviewSimulatorProps) {
  const [scenario, setScenario] = useState('');
  const [conceptsInput, setConceptsInput] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [history, setHistory] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'in_progress' | 'passed' | 'failed' | 'idle'>('idle');
  const [feedback, setFeedback] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  if (!isOpen) return null;

  const handleStart = async () => {
    if (!scenario || !conceptsInput) return;
    setIsStarted(true);
    setStatus('in_progress');
    setIsLoading(true);

    const targetConcepts = conceptsInput.split(',').map(c => ({ name: c.trim(), description: '' }));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch('/api/serify/interview-turn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData?.session?.access_token}`
        },
        body: JSON.stringify({ 
          scenario, 
          history: [], 
          userResponse: 'Hello, I am ready to begin the interview.', 
          targetConcepts, 
          plan 
        }),
      });

      if (!response.ok) throw new Error('Failed to start interview');

      const data = await response.json();
      setHistory([{ role: 'ai', content: data.aiResponse }]);
      setStatus(data.status);
    } catch (err) {
      console.error(err);
      alert('Error starting interview.');
      setIsStarted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;
    
    const newHistory = [...history, { role: 'user' as const, content: inputText }];
    setHistory(newHistory);
    setInputText('');
    setIsLoading(true);

    const targetConcepts = conceptsInput.split(',').map(c => ({ name: c.trim(), description: '' }));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch('/api/serify/interview-turn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData?.session?.access_token}`
        },
        body: JSON.stringify({ 
          scenario, 
          history: newHistory.slice(0, -1), // Send previous history
          userResponse: inputText, 
          targetConcepts, 
          plan 
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      setHistory([...newHistory, { role: 'ai', content: data.aiResponse }]);
      setStatus(data.status);
      if (data.feedback) {
        setFeedback(data.feedback);
      }
    } catch (err) {
      console.error(err);
      alert('Error sending message.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-modal-in group/modal relative">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover/modal:scale-110 transition-transform duration-1000 rotate-12">
            <MessageSquare size={240} strokeWidth={1} />
        </div>

        <div className="px-10 py-8 border-b border-[var(--border)]/50 flex justify-between items-center bg-white relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-500/5">
                <MessageSquare size={22} strokeWidth={2.5} />
            </div>
            <div>
                <h2 className="text-xl font-black text-[var(--text)] tracking-tight uppercase italic">
                    SIMULATOR
                </h2>
                <p className="text-[9px] font-black text-[var(--muted)]/50 uppercase tracking-[0.2em] mt-0.5">PRESSURE TEST PROTOCOL</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center text-[var(--muted)]/40 hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all duration-300"
          >
            <span className="sr-only">Abort</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {!isStarted ? (
          <div className="p-12 md:p-16 flex-1 overflow-y-auto space-y-10 scrollbar-hide relative z-10">
            <div className="space-y-4">
                <h3 className="text-2xl font-black text-[var(--text)] tracking-tight leading-tight">
                    CONFIGURE YOUR <br/> HIGH-PRESSURE SCENARIO.
                </h3>
                <p className="text-[14px] font-bold text-[var(--muted)]/60 leading-relaxed max-w-md">
                    The AI will strictly test your real-world mastery of specific concepts in a targeted simulation.
                </p>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-[var(--muted)]/40 uppercase tracking-[0.2em] ml-2">SIMULATION SCENARIO / ROLE</label>
                <input 
                  className="w-full bg-white text-[var(--text)] placeholder-[var(--muted)]/30 border border-[var(--border)]/60 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/[0.03] focus:border-indigo-500/30 transition-all font-black text-[15px] tracking-tight shadow-sm"
                  placeholder="e.g. SENIOR FRONTEND ENGINEER AT STRIPE"
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-[var(--muted)]/40 uppercase tracking-[0.2em] ml-2">TARGET CONCEPTS FOR EXTRACTION</label>
                <input 
                  className="w-full bg-white text-[var(--text)] placeholder-[var(--muted)]/30 border border-[var(--border)]/60 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/[0.03] focus:border-indigo-500/30 transition-all font-black text-[15px] tracking-tight shadow-sm"
                  placeholder="REACT HOOKS, SYSTEM DESIGN, STATE MANAGEMENT"
                  value={conceptsInput}
                  onChange={(e) => setConceptsInput(e.target.value)}
                />
                <p className="text-[9px] font-black text-[var(--muted)]/30 uppercase tracking-[0.1em] ml-2 italic">SEPARATE PROTOCOLS WITH COMMAS</p>
              </div>
            </div>

            <div className="pt-8 flex justify-end">
              <button 
                onClick={handleStart} 
                disabled={!scenario || !conceptsInput || isLoading}
                className="px-10 py-5 bg-indigo-600 text-white rounded-[1.5rem] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 disabled:opacity-50 flex items-center gap-3 group/btn relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
                {isLoading ? <Loader2 size={18} className="animate-spin" strokeWidth={3} /> : <Play size={18} className="fill-current group-hover/btn:scale-110 transition-transform duration-500" strokeWidth={0} />}
                <span className="text-[14px] font-black uppercase tracking-[0.2em] relative z-10">BEGIN PROTOCOL</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]/10">
            <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-hide">
              {history.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`max-w-[85%] rounded-[2rem] px-8 py-6 shadow-2xl shadow-black/[0.02] ${
                    msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-500/10' 
                        : 'bg-white border border-[var(--border)]/60 text-[var(--text)] rounded-tl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed font-bold tracking-tight">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-white border border-indigo-500/10 rounded-[2rem] rounded-tl-sm px-8 py-5 flex items-center gap-4 shadow-xl shadow-indigo-500/[0.02]">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                    </div>
                    <span className="text-[10px] font-black text-indigo-600/50 uppercase tracking-[0.2em]">ANALYZING...</span>
                  </div>
                </div>
              )}
              {feedback && (
                <div className="my-12 p-10 bg-white border border-indigo-500/20 rounded-[3rem] shadow-2xl shadow-indigo-500/5 animate-fade-in-up relative overflow-hidden group/feedback">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none group-hover/feedback:scale-110 transition-transform duration-1000 rotate-12">
                      <Target size={120} strokeWidth={1} />
                  </div>
                  
                  <div className="flex items-center gap-4 mb-10 relative z-10">
                    <div className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border ${
                        status === 'passed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/10' : 'bg-red-500/10 text-red-600 border-red-500/10'
                    }`}>
                        {status}
                    </div>
                    <h3 className="text-xl font-black text-[var(--text)] tracking-tight uppercase italic">PROTOCOL ANALYSIS</h3>
                  </div>
                  <p className="text-[15px] font-bold text-[var(--muted)]/70 leading-relaxed mb-10 relative z-10 italic">"{feedback.overall}"</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 text-emerald-600">
                        <div className="w-2 h-2 rounded-full bg-current shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">STRENGTHS</h4>
                      </div>
                      <ul className="space-y-4">
                        {feedback.strengths.map((s: string, i: number) => (
                            <li key={i} className="text-[13px] font-bold text-[var(--text)] flex items-start gap-4 group/li">
                                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-500/20 flex-shrink-0 group-hover/li:bg-emerald-500 transition-colors" />
                                <span className="tracking-tight leading-snug">{s}</span>
                            </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 text-orange-600">
                        <div className="w-2 h-2 rounded-full bg-current shadow-[0_0_12px_rgba(249,115,22,0.5)]" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">AREAS FOR GROWTH</h4>
                      </div>
                      <ul className="space-y-4">
                        {feedback.weaknesses.map((s: string, i: number) => (
                            <li key={i} className="text-[13px] font-bold text-[var(--text)] flex items-start gap-4 group/li">
                                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-500/20 flex-shrink-0 group-hover/li:bg-orange-500 transition-colors" />
                                <span className="tracking-tight leading-snug">{s}</span>
                            </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-8" />
            </div>

            {status === 'in_progress' && (
              <div className="px-10 py-8 bg-white border-t border-[var(--border)]/50 shadow-[0_-20px_40px_rgba(0,0,0,0.02)]">
                <div className="relative group/input">
                  <input
                    className="w-full bg-[var(--bg)]/50 text-[var(--text)] placeholder-[var(--muted)]/40 border border-[var(--border)] rounded-[2rem] pl-8 pr-20 py-5 outline-none focus:ring-4 focus:ring-indigo-500/[0.03] focus:border-indigo-500/30 transition-all font-bold text-[15px] tracking-tight shadow-inner"
                    placeholder="TYPE YOUR RESPONSE PROTOCOL..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                    disabled={isLoading}
                  />
                  <div className="absolute right-3 top-3">
                    <button 
                        onClick={handleSend}
                        disabled={!inputText.trim() || isLoading}
                        className="w-12 h-12 flex items-center justify-center bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 hover:scale-110 active:scale-90 transition-all duration-500 disabled:opacity-50"
                    >
                        <Send size={20} className="-mr-1" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {status !== 'in_progress' && status !== 'idle' && (
              <div className="px-10 py-8 bg-white border-t border-[var(--border)]/50 flex justify-center">
                <button 
                    onClick={onClose} 
                    className="px-10 py-4 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-[1.5rem] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 hover:scale-[1.05] transition-all duration-500"
                >
                  RETURN TO VAULT
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
