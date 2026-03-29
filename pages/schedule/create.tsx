import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { 
    ChevronRight, 
    ChevronLeft, 
    Sparkles, 
    Target, 
    Calendar as CalendarIcon, 
    Clock, 
    CheckCircle2, 
    Loader2, 
    AlertCircle,
    Trash2,
    Plus,
    MessageCircle,
    Send,
    Edit2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ScheduleTopic } from '@/types/serify';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    format, 
    addMonths, 
    subMonths, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    isSameDay, 
    isWithinInterval, 
    eachDayOfInterval,
    isSameMonth,
    addDays
} from 'date-fns';

// Minimalist Architect's Pen Calendar
const SimpleCalendar = ({ selectedDate, onSelect, startDate, minDate }: { 
    selectedDate: string; 
    onSelect: (date: string) => void;
    startDate?: string;
    minDate?: string;
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate || new Date()));
    
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDatePage = startOfWeek(monthStart);
    const endDatePage = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDatePage, end: endDatePage });

    const handlePrev = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNext = () => setCurrentMonth(addMonths(currentMonth, 1));

    return (
        <div className="paper-card p-4 space-y-4 bg-[var(--surface-raised)] border-l-4 border-l-[var(--accent)]">
            <div className="flex items-center justify-between px-2">
                <span className="text-sm font-mono font-bold uppercase tracking-tight">
                    {format(currentMonth, 'MMMM yyyy')}
                </span>
                <div className="flex gap-2">
                    <button onClick={handlePrev} className="p-1 hover:text-[var(--accent)] transition-colors"><ChevronLeft size={16} /></button>
                    <button onClick={handleNext} className="p-1 hover:text-[var(--accent)] transition-colors"><ChevronRight size={16} /></button>
                </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                    <div key={d} className="text-[10px] font-mono text-[var(--muted)] text-center font-bold py-2">{d}</div>
                ))}
                {days.map(day => {
                    const isSelected = selectedDate && isSameDay(day, new Date(selectedDate));
                    const isStart = startDate && isSameDay(day, new Date(startDate));
                    const isInRange = startDate && selectedDate && isWithinInterval(day, { 
                        start: new Date(startDate), 
                        end: new Date(selectedDate) 
                    });
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isPast = minDate && day < new Date(minDate) && !isSameDay(day, new Date(minDate));

                    return (
                        <div 
                            key={day.toString()}
                            onClick={() => !isPast && onSelect(format(day, 'yyyy-MM-dd'))}
                            className={`
                                aspect-square flex items-center justify-center text-[10px] font-mono cursor-pointer transition-all
                                ${!isCurrentMonth ? 'text-[var(--muted-light)]' : 'text-[var(--text)]'}
                                ${isSelected ? 'bg-[var(--accent)] text-white font-bold ring-2 ring-[var(--accent)]' : ''}
                                ${isStart && !isSelected ? 'border-2 border-[var(--accent)] text-[var(--accent)] font-bold' : ''}
                                ${isInRange && !isSelected && !isStart ? 'bg-[var(--accent-soft)]' : ''}
                                ${isPast ? 'opacity-20 cursor-not-allowed' : 'hover:bg-[var(--surface)]'}
                            `}
                            style={{ borderRadius: isSelected ? '2px' : '0px' }}
                        >
                            {format(day, 'd')}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


export default function CreateSchedule() {
    const { token } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [refining, setRefining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Step 1: Goal
    const [goal, setGoal] = useState('');
    const [examDate, setExamDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
    });
    
    // Step 2: Topics
    const [topics, setTopics] = useState<ScheduleTopic[]>([]);
    const [newTopicTitle, setNewTopicTitle] = useState('');
    const [refinementInput, setRefinementInput] = useState('');

    // Step 3: Schedule
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [dailyMinutes, setDailyMinutes] = useState(60);
    const [offDays, setOffDays] = useState<number[]>([]); // 0-6 (Sun-Sat)

    // Step 4: Finalize
    const [scheduleId, setScheduleId] = useState<string | null>(null);

    const handleGenerateDraft = async () => {
        if (!goal.trim()) {
            setError('Please define your exam goal or what you are studying for.');
            return;
        }
        if (!examDate) {
            setError('Please select a target completion date.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/serify/schedule/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ goal, examDate })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to generate initial plan');

            const mappedTopics = data.topics.map((t: any, idx: number) => ({
                id: Math.random().toString(36).substr(2, 9),
                title: t.title,
                unit: t.unit || 'General',
                weight: t.importance === 'high' ? 3 : t.importance === 'medium' ? 2 : 1,
                sessions_allocated: t.estimatedSessions || 1,
                status: 'not_started',
                position: idx,
                is_stretch_goal: false,
                sessions_completed: 0
            }));
            setTopics(mappedTopics);
            setStep(2);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRefineTopics = async () => {
        if (!refinementInput.trim()) return;

        setRefining(true);
        setError(null);
        const currentRefinement = refinementInput;
        setRefinementInput('');

        try {
            const res = await fetch('/api/serify/schedule/refine', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    goal, 
                    currentTopics: topics, 
                    instruction: currentRefinement 
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to refine topics');

            const mappedTopics = data.topics.map((t: any, idx: number) => ({
                id: Math.random().toString(36).substr(2, 9),
                title: t.title,
                unit: t.unit || 'General',
                weight: t.importance === 'high' ? 3 : t.importance === 'medium' ? 2 : 1,
                sessions_allocated: t.estimatedSessions || 1,
                status: 'not_started',
                position: idx,
                is_stretch_goal: false,
                sessions_completed: 0
            }));
            setTopics(mappedTopics);
        } catch (err: any) {
            setError(err.message);
            setRefinementInput(currentRefinement); // Put it back on error
        } finally {
            setRefining(false);
        }
    };

    const handleFinalize = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/serify/schedule/finalize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    goal,
                    examDate,
                    topics,
                    startDate,
                    dailyMinutes,
                    offDays
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to finalize schedule');

            setScheduleId(data.scheduleId);
            setStep(4);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addTopic = () => {
        if (!newTopicTitle.trim()) return;
        const newTopic: any = {
            id: Math.random().toString(36).substr(2, 9),
            title: newTopicTitle.trim(),
            unit: 'Custom',
            weight: 2,
            sessions_allocated: 1,
            status: 'not_started',
            position: topics.length,
            is_stretch_goal: false,
            sessions_completed: 0
        };
        setTopics([...topics, newTopic]);
        setNewTopicTitle('');
    };

    const removeTopic = (id: string) => {
        setTopics(topics.filter(t => t.id !== id));
    };

    const updateTopic = (idx: number, updates: Partial<ScheduleTopic>) => {
        const newTopics = [...topics];
        newTopics[idx] = { ...newTopics[idx], ...updates };
        setTopics(newTopics);
    };

    const toggleOffDay = (day: number) => {
        if (offDays.includes(day)) {
            setOffDays(offDays.filter(d => d !== day));
        } else {
            setOffDays([...offDays, day]);
        }
    };

    return (
        <DashboardLayout backLink="/schedule" backLinkText="Schedules">
            <Head>
                <title>Architect Your Schedule | Serify</title>
            </Head>

            <div className="max-w-7xl mx-auto px-6 py-12 pb-24">
                <div className="grid lg:grid-cols-12 gap-10 items-start">
                    {/* Left Side: Architecting Hub */}
                    <div className="lg:col-span-12 xl:col-span-7 min-h-[500px]">
                        <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div 
                                key="step1"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-10"
                            >
                                <div className="paper-card p-10 space-y-10">
                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--muted)]">Target Goal</label>
                                        <div className="relative">
                                            <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={20} />
                                            <input 
                                                type="text"
                                                placeholder="e.g. AWS Certified Solutions Architect"
                                                className="input-paper pl-12 text-xl py-6 font-display font-bold"
                                                value={goal}
                                                onChange={(e) => setGoal(e.target.value)}
                                            />
                                        </div>
                                        <p className="text-[10px] text-[var(--muted)] font-mono italic">Enter the specific exam or certification title.</p>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--muted)]">Start Date</label>
                                                <input 
                                                    type="date"
                                                    className="input-paper font-mono"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    min={new Date().toISOString().split('T')[0]}
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--muted)]">Exam Date</label>
                                                <div className="relative">
                                                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
                                                    <input 
                                                        type="date"
                                                        className="input-paper pl-12 font-mono"
                                                        value={examDate}
                                                        onChange={(e) => setExamDate(e.target.value)}
                                                        min={startDate || new Date().toISOString().split('T')[0]}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--muted)]">Visual Timeline</label>
                                            <SimpleCalendar 
                                                selectedDate={examDate}
                                                startDate={startDate}
                                                onSelect={(d) => {
                                                    // Logic: If d is after startDate, set examDate. If before, set startDate.
                                                    if (!startDate || d < startDate) {
                                                        setStartDate(d);
                                                    } else {
                                                        setExamDate(d);
                                                    }
                                                }}
                                                minDate={new Date().toISOString().split('T')[0]}
                                            />
                                            <div className="flex items-center gap-4 pt-2">
                                                <div className="flex items-center gap-1.5 font-mono text-[9px] text-[var(--muted)]">
                                                    <div className="w-2 h-2 border border-[var(--accent)]" /> Start
                                                </div>
                                                <div className="flex items-center gap-1.5 font-mono text-[9px] text-[var(--muted)]">
                                                    <div className="w-2 h-2 bg-[var(--accent)]" /> Target
                                                </div>
                                                {startDate && examDate && (
                                                    <div className="flex-1 text-right font-mono text-[10px] font-bold text-[var(--accent)]">
                                                        {Math.ceil((new Date(examDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} Days Remaining
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {error && step === 1 && (
                                        <div className="p-4 bg-[var(--warn-soft)] border-2 border-[var(--warn)] text-[var(--warn)] flex gap-3 items-center rounded-sm font-mono text-xs">
                                            <AlertCircle size={16} />
                                            {error}
                                        </div>
                                    )}

                                    <div className="pt-6 border-t border-[var(--border-soft)] flex justify-end">
                                        <button 
                                            className="btn-primary min-w-[240px] py-4"
                                            onClick={handleGenerateDraft}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    Architecting...
                                                </>
                                            ) : (
                                                <>
                                                    Initialize Blueprint
                                                    <ChevronRight size={18} />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div 
                                key="step2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <div className="grid gap-3">
                                    {topics.map((topic, idx) => (
                                        <div key={topic.id} className="paper-card p-4 flex items-center gap-4 group hover:border-[var(--accent)] transition-all bg-[var(--surface)]">
                                            <div className="w-8 h-8 shrink-0 border border-[var(--border-soft)] flex items-center justify-center font-mono text-xs font-bold text-[var(--muted)]">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <input 
                                                    type="text"
                                                    value={topic.title}
                                                    onChange={(e) => updateTopic(idx, { title: e.target.value })}
                                                    className="w-full bg-transparent border-none p-0 font-bold text-sm tracking-tight outline-none focus:text-[var(--accent)]"
                                                />
                                                <input 
                                                    type="text"
                                                    value={topic.unit}
                                                    onChange={(e) => updateTopic(idx, { unit: e.target.value })}
                                                    className="w-full bg-transparent border-none p-0 text-[10px] text-[var(--muted)] font-mono outline-none focus:text-[var(--accent)]"
                                                />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <select 
                                                    className="bg-transparent border-none text-[10px] font-bold font-mono text-[var(--accent)] uppercase cursor-pointer outline-none"
                                                    value={topic.weight}
                                                    onChange={(e) => updateTopic(idx, { weight: parseInt(e.target.value) })}
                                                >
                                                    <option value={3}>High Priority</option>
                                                    <option value={2}>Medium</option>
                                                    <option value={1}>Low</option>
                                                </select>
                                                <button 
                                                    onClick={() => removeTopic(topic.id)}
                                                    className="p-2 text-[var(--muted)] hover:text-[var(--warn)] transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="paper-card p-2 border-dashed border-2 flex items-center gap-2 bg-[var(--surface-raised)]">
                                        <Plus size={16} className="text-[var(--muted)] ml-2" />
                                        <input 
                                            type="text"
                                            placeholder="Add custom topic..."
                                            className="flex-1 bg-transparent outline-none font-mono text-xs p-2"
                                            value={newTopicTitle}
                                            onChange={(e) => setNewTopicTitle(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                                        />
                                        <button 
                                            onClick={addTopic}
                                            className="px-4 py-2 bg-[var(--border)] text-[var(--surface)] text-[10px] font-bold rounded-sm uppercase tracking-tighter"
                                        >
                                            Add
                                        </button>
                                    </div>

                                    <div className="pt-6 flex justify-between items-center">
                                        <button className="btn-secondary py-3 px-6" onClick={() => setStep(1)}>
                                            <ChevronLeft size={16} /> Back
                                        </button>
                                        <button className="btn-primary py-3 px-8" onClick={() => setStep(3)}>
                                            Configure Habits <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div 
                                key="step3"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="paper-card p-8 md:p-10 space-y-10 max-w-4xl mx-auto"
                            >
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Study Start Date</label>
                                        <input 
                                            type="date"
                                            className="input-paper"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Daily Study Capacity</label>
                                        <div className="flex items-center gap-4">
                                            <input 
                                                type="range"
                                                min="30"
                                                max="480"
                                                step="30"
                                                className="flex-1 accent-[var(--accent)]"
                                                value={dailyMinutes}
                                                onChange={(e) => setDailyMinutes(parseInt(e.target.value))}
                                            />
                                            <div className="w-20 tally-box justify-center">
                                                {Math.floor(dailyMinutes / 60)}h {dailyMinutes % 60 > 0 ? `${dailyMinutes % 60}m` : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Designated Break Days</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                            <button
                                                key={day}
                                                onClick={() => toggleOffDay(idx)}
                                                className={`px-4 py-2 border-2 font-mono text-xs font-bold transition-all ${
                                                    offDays.includes(idx)
                                                        ? 'bg-[var(--warn-soft)] border-[var(--warn)] text-[var(--warn)] shadow-hard-sm'
                                                        : 'bg-[var(--surface-raised)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)]'
                                                }`}
                                                style={{ borderRadius: '4px' }}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-[var(--muted)] font-mono italic">Studies will not be scheduled on these days. Rest is as vital as focus.</p>
                                </div>

                                {error && (
                                    <div className="p-4 bg-[var(--warn-soft)] border-2 border-[var(--warn)] text-[var(--warn)] flex gap-3 items-center rounded-sm font-mono text-xs">
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                <div className="pt-6 flex justify-between">
                                    <button className="btn-secondary" onClick={() => setStep(2)}>
                                        <ChevronLeft size={18} />
                                        Back
                                    </button>
                                    <button 
                                        className="btn-primary px-8" 
                                        onClick={handleFinalize}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Finalizing Schedule...
                                            </>
                                        ) : (
                                            <>
                                                Initialize Schedule
                                                <Sparkles size={18} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div 
                                key="step4"
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="paper-card p-12 text-center space-y-8"
                            >
                                <div className="w-20 h-20 bg-[var(--accent)] text-[var(--surface)] border-4 border-[var(--ink)] rounded-full flex items-center justify-center mx-auto shadow-hard-lg">
                                    <CheckCircle2 size={40} />
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-display font-bold">Protocol Established</h2>
                                    <p className="font-mono text-[var(--muted)] max-w-sm mx-auto">
                                        Your study schedule is ready, synced with your calendar, and analyzed for peak efficiency.
                                    </p>
                                </div>

                                <div className="pt-8">
                                    <button 
                                        className="btn-primary px-12 py-4 text-lg" 
                                        onClick={() => router.push(`/schedule/${scheduleId}`)}
                                    >
                                        Enter Progress Hub
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Column: AI Architect & Data Preview */}
                <div className="lg:col-span-12 xl:col-span-5 space-y-8 lg:sticky lg:top-24">
                    {/* Perspective Label */}
                    <div className="flex items-center gap-3">
                        <div className="h-[2px] flex-1 bg-[var(--border-soft)]" />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Plan Architect</span>
                        <div className="h-[2px] flex-1 bg-[var(--border-soft)]" />
                    </div>

                    {/* AI Chat Area */}
                    <div className="paper-card p-6 bg-[var(--surface-raised)] border-l-8 border-l-[var(--ink)] space-y-6">
                        <div className="space-y-4">
                            <div className="p-4 bg-[var(--surface)] border border-[var(--border-soft)] rounded-sm text-xs font-mono text-[var(--muted)] leading-relaxed relative">
                                <MessageCircle size={14} className="absolute -left-2 -top-2 text-[var(--accent)] bg-white" />
                                {step === 1 ? (
                                    "Define your target and timeline. I'll architect a high-yield path based on thousands of successful patterns."
                                ) : step === 2 ? (
                                    `I've analyzed ${goal}. This blueprint covers the core syllabus. Need to focus on specific sections?`
                                ) : (
                                    "Almost there. Configure your daily availability so I can space out the sessions logically."
                                )}
                            </div>
                        </div>

                        {step === 2 && (
                            <div className="space-y-4">
                                <div className="relative">
                                    <textarea 
                                        placeholder="e.g. 'Add focus on networking', 'Make it easier'..."
                                        className="input-paper w-full min-h-[100px] text-xs font-mono pt-3 pb-12 pr-4 resize-none"
                                        value={refinementInput}
                                        onChange={(e) => setRefinementInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleRefineTopics();
                                            }
                                        }}
                                    />
                                    <div className="absolute bottom-3 right-3 flex items-center gap-3">
                                        {refining && (
                                            <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--accent)] font-bold italic animate-pulse">
                                                <Loader2 size={12} className="animate-spin" />
                                                Refining...
                                            </div>
                                        )}
                                        <button 
                                            className="w-8 h-8 rounded-full bg-[var(--accent)] text-[var(--surface)] flex items-center justify-center shadow-hard-sm hover:translate-y-[-2px] transition-transform disabled:opacity-50"
                                            disabled={refining || !refinementInput.trim()}
                                            onClick={handleRefineTopics}
                                        >
                                            <Send size={14} />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    {["More advanced", "Practical focus", "Add mocks", "Simplified"].map(hint => (
                                        <button 
                                            key={hint}
                                            onClick={() => setRefinementInput(hint)}
                                            className="p-2 border border-[var(--border-soft)] text-[9px] font-mono text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-left rounded-sm transition-colors"
                                        >
                                            + {hint}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="p-4 border border-dashed border-[var(--border-soft)] rounded-sm space-y-4">
                                <div className="flex justify-between text-[10px] font-mono uppercase font-bold text-[var(--muted)]">
                                    <span>Intensity Preview</span>
                                    <span className="text-[var(--accent)]">
                                        {Math.ceil(topics.length / 5)} Sessions/Week
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-[var(--bg)] rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-[var(--accent)] transition-all duration-500" 
                                        style={{ width: `${Math.min((topics.length / 20) * 100, 100)}%` }} 
                                    />
                                </div>
                                <p className="text-[9px] font-mono italic text-[var(--muted)]">Calculated based on {topics.length} topics and your deadline.</p>
                            </div>
                        )}
                    </div>

                    {/* Stats/Help Card */}
                    <div className="paper-card p-6 border-t-4 border-t-[var(--accent)] space-y-4">
                        <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--muted)]">Blueprint Stats</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-[var(--surface-raised)] rounded-sm">
                                <div className="text-[10px] font-mono text-[var(--muted)]">Topics</div>
                                <div className="text-xl font-display font-bold">{topics.length}</div>
                            </div>
                            <div className="p-3 bg-[var(--surface-raised)] rounded-sm">
                                <div className="text-[10px] font-mono text-[var(--muted)]">Days</div>
                                <div className="text-xl font-display font-bold">
                                    {startDate && examDate ? Math.ceil((new Date(examDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) : '--'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <style jsx>{`
            input[type="date"]::-webkit-calendar-picker-indicator {
                filter: invert(0.3);
                cursor: pointer;
            }
            .dark input[type="date"]::-webkit-calendar-picker-indicator {
                filter: invert(0.8);
            }
        `}</style>
    </DashboardLayout>
);
}
