import React, { useState } from 'react';
import { Calendar, Target, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (roadmap: any) => void;
  plan: string;
}

export function RoadmapModal({ isOpen, onClose, onSuccess, plan }: RoadmapModalProps) {
  const [goal, setGoal] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!goal || !targetDate) {
      setError('Please provide both a goal and a target date.');
      return;
    }
    setError('');
    setIsGenerating(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch('/api/serify/generate-roadmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token}`
        },
        body: JSON.stringify({ goal, targetDate, plan }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate roadmap');
      }

      const { roadmap } = await response.json();
      onSuccess(roadmap);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-[3rem] shadow-2xl p-10 md:p-14 relative animate-modal-in overflow-hidden group/modal">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover/modal:scale-110 transition-transform duration-1000 rotate-12">
            <Target size={180} strokeWidth={1} />
        </div>

        <div className="flex items-center gap-5 mb-8 relative z-10">
          <div className="w-12 h-12 bg-orange-500/10 text-orange-600 rounded-2xl flex items-center justify-center shadow-sm border border-orange-500/5">
            <Target size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[var(--text)] tracking-tight uppercase italic">
              Forge Roadmap
            </h2>
            <p className="text-[10px] font-black text-[var(--muted)]/50 uppercase tracking-[0.2em] mt-0.5">ESTABLISH LEARNING PROTOCOL</p>
          </div>
        </div>
        
        <p className="text-[14px] font-bold text-[var(--muted)]/60 leading-relaxed mb-10 relative z-10 max-w-sm">
          Set a crucial deadline — whether it&apos;s an exam, interview, or a personal milestone — and Serify will forge a high-density, day-by-day learning path.
        </p>

        {error && (
            <div className="mb-8 p-5 rounded-[1.5rem] bg-red-500/5 border border-red-500/10 text-[10px] font-black text-red-600 uppercase tracking-[0.1em] animate-shake relative z-10">
                SYSTEM ERROR: {error}
            </div>
        )}

        <div className="space-y-8 mb-12 relative z-10">
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-[var(--muted)]/40 uppercase tracking-[0.2em] ml-2">YOUR MASTER OBJECTIVE</label>
            <input 
              className="w-full bg-white text-[var(--text)] placeholder-[var(--muted)]/30 border border-[var(--border)]/60 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/[0.03] focus:border-indigo-500/30 transition-all disabled:opacity-50 font-black text-[15px] tracking-tight shadow-sm"
              placeholder="e.g. MASTER QUANTUM COMPUTING FUNDAMENTALS"
              value={goal}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGoal(e.target.value)}
              disabled={isGenerating}
            />
          </div>
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-[var(--muted)]/40 uppercase tracking-[0.2em] ml-2">TARGET COMPLETION DATE</label>
            <div className="relative group/input">
              <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)] group-focus-within/input:text-indigo-600 transition-colors" strokeWidth={2.5} />
              <input 
                type="date"
                className="w-full bg-white text-[var(--text)] placeholder-[var(--muted)]/30 border border-[var(--border)]/60 rounded-[1.5rem] px-6 py-4 pl-14 outline-none focus:ring-4 focus:ring-indigo-500/[0.03] focus:border-indigo-500/30 transition-all disabled:opacity-50 font-black text-[15px] tracking-tight shadow-sm uppercase tabular-nums"
                value={targetDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                disabled={isGenerating}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-6 relative z-10">
          <button 
            className="px-6 py-4 text-[11px] font-black text-[var(--muted)] hover:text-red-500 transition-all duration-300 disabled:opacity-50 uppercase tracking-[0.2em]" 
            onClick={onClose} 
            disabled={isGenerating}
          >
            ABORT
          </button>
          <button 
            onClick={handleGenerate} 
            disabled={isGenerating} 
            className="px-10 py-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 disabled:opacity-50 flex items-center gap-3 group/btn overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
            
            {isGenerating ? <Loader2 size={18} className="animate-spin" strokeWidth={3} /> : <Sparkles size={18} className="group-hover/btn:rotate-12 transition-transform duration-500" strokeWidth={3} />}
            <span className="text-[11px] font-black uppercase tracking-[0.2em] relative z-10">
                {isGenerating ? 'FORGING...' : 'FORGE PROTOCOL'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

