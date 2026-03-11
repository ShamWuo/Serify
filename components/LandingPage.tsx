import { useEffect, useRef } from 'react';
import Link from 'next/link';
import SEO from '@/components/Layout/SEO';
import {
    Brain,
    Sparkles,
    Target,
    BookOpen,
    ArrowRight,
    ChevronRight,
    Zap,
    FileText,
    Youtube,
    Search,
    Shield,
    TrendingUp,
    Star,
    Check,
    X,
    BrainCircuit,
    Layers,
    RefreshCw,
    MessageSquare,
    Activity
} from 'lucide-react';

// Intersection Observer hook for scroll animations
function useScrollReveal() {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
        );

        const el = ref.current;
        if (el) {
            const children = el.querySelectorAll('.scroll-reveal');
            children.forEach((child) => observer.observe(child));
        }

        return () => observer.disconnect();
    }, []);

    return ref;
}

export default function LandingPage() {
    const revealRef = useScrollReveal();

    return (
        <div ref={revealRef} className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans overflow-x-hidden">
            <SEO />
            {/* ─── NAVBAR ─── */}
            <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg)]/80 border-b border-[var(--border)]/50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="text-2xl font-display tracking-tight text-[var(--text)]">
                        Serify
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                        >
                            Log in
                        </Link>
                        <Link
                            href="/?demo=true"
                            className="hidden sm:inline-flex text-sm font-medium px-4 py-2 border border-[var(--border)] rounded-xl hover:bg-[var(--surface)] transition-colors"
                        >
                            Try Demo
                        </Link>
                        <Link
                            href="/signup"
                            className="text-sm font-semibold px-5 py-2 bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent)]/90 transition-colors shadow-sm shadow-[var(--accent)]/20"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ─── HERO ─── */}
            <section className="relative pt-20 pb-28 md:pt-32 md:pb-40 overflow-hidden">
                {/* Background blobs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="landing-blob landing-blob-1" />
                    <div className="landing-blob landing-blob-2" />
                    <div className="landing-blob landing-blob-3" />
                </div>

                <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                    <div className="scroll-reveal">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-light)] text-[var(--accent)] text-xs font-bold uppercase tracking-wider mb-8">
                            <Sparkles size={14} />
                            AI-Powered Active Recall
                        </div>
                    </div>

                    <h1 className="scroll-reveal text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display leading-[0.95] tracking-tight mb-6">
                        Master Your{' '}
                        <span className="relative inline-block">
                            Understanding
                            <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 8C50 3 100 2 150 5C200 8 250 4 298 6" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
                            </svg>
                        </span>
                    </h1>

                    <p className="scroll-reveal text-lg md:text-xl text-[var(--muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
                        Serify uses context-aware AI to analyze what you&apos;re learning, expose hidden gaps in your understanding, and build a personalized map of your knowledge.
                    </p>

                    <div className="scroll-reveal flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href="/signup"
                            className="group flex items-center gap-2 px-7 py-3.5 bg-[var(--accent)] text-white rounded-xl font-semibold text-base hover:bg-[var(--accent)]/90 transition-all shadow-lg shadow-[var(--accent)]/20 hover:shadow-xl hover:shadow-[var(--accent)]/30"
                        >
                            Start Reflecting Free
                            <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                        <Link
                            href="/?demo=true"
                            className="flex items-center gap-2 px-7 py-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl font-semibold text-base text-[var(--text)] hover:border-[var(--accent)]/40 hover:shadow-sm transition-all"
                        >
                            Try the Demo
                        </Link>
                    </div>

                    {/* Hero visual — animated concept nodes */}
                    <div className="scroll-reveal mt-16 md:mt-20 relative mx-auto max-w-3xl">
                        <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl shadow-black/5 p-6 md:p-8 overflow-hidden glass">
                            {/* Fake app screenshot representation */}
                            <div className="flex items-center gap-2 mb-5">
                                <div className="w-3 h-3 rounded-full bg-red-400/70" />
                                <div className="w-3 h-3 rounded-full bg-amber-400/70" />
                                <div className="w-3 h-3 rounded-full bg-emerald-400/70" />
                                <span className="ml-3 text-xs text-[var(--muted)] font-medium">Serify — Session Analysis</span>
                            </div>

                            <div className="grid grid-cols-3 gap-3 md:gap-4">
                                {/* Concept cards */}
                                {[
                                    { name: 'Neural Networks', mastery: 'solid', color: 'bg-emerald-500', pct: 92 },
                                    { name: 'Gradient Descent', mastery: 'developing', color: 'bg-blue-400', pct: 68 },
                                    { name: 'Backpropagation', mastery: 'shaky', color: 'bg-amber-400', pct: 41 },
                                ].map((c, i) => (
                                    <div
                                        key={i}
                                        className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3 md:p-4 hover:border-[var(--accent)]/40 transition-colors"
                                        style={{ animationDelay: `${i * 150}ms` }}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`w-2 h-2 rounded-full ${c.color}`} />
                                            <span className="text-xs font-bold text-[var(--text)] truncate">{c.name}</span>
                                        </div>
                                        <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden mb-1.5">
                                            <div className={`h-full ${c.color} rounded-full`} style={{ width: `${c.pct}%` }} />
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[10px] text-[var(--muted)] capitalize">{c.mastery}</span>
                                            <span className="text-[10px] font-bold text-[var(--text)]">{c.pct}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Fake chat message */}
                            <div className="mt-4 flex items-start gap-3">
                                <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
                                    <Brain size={14} className="text-white" />
                                </div>
                                <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl rounded-tl-md px-4 py-2.5 text-sm text-[var(--text)]">
                                    <span className="text-[var(--muted)]">Your understanding of</span>{' '}
                                    <strong>Backpropagation</strong>{' '}
                                    <span className="text-[var(--muted)]">seems surface-level. Let&apos;s probe deeper with a scenario question…</span>
                                </div>
                            </div>
                        </div>

                        {/* Floating decorative badges */}
                        <div className="absolute -top-4 -right-4 md:-right-8 bg-white border border-[var(--border)] rounded-xl px-3 py-2 shadow-lg animate-fade-in-up text-xs font-bold flex items-center gap-1.5" style={{ animationDelay: '300ms' }}>
                            <Activity size={12} className="text-[var(--accent)]" /> Pro Tier
                        </div>
                        <div className="absolute -bottom-3 -left-4 md:-left-8 bg-white border border-[var(--border)] rounded-xl px-3 py-2 shadow-lg animate-fade-in-up text-xs font-bold flex items-center gap-1.5" style={{ animationDelay: '500ms' }}>
                            <Target size={12} className="text-[var(--accent)]" /> 3 Gaps Found
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── TRUST BAR ─── */}
            <section className="py-10 border-y border-[var(--border)]/50 bg-[var(--surface)]/50">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-5">Works with any content you&apos;re studying</p>
                    <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
                        {[
                            { icon: Youtube, label: 'YouTube', color: 'text-red-500' },
                            { icon: FileText, label: 'Articles', color: 'text-blue-500' },
                            { icon: BookOpen, label: 'Textbooks', color: 'text-emerald-600' },
                            { icon: Layers, label: 'PDFs', color: 'text-purple-500' },
                            { icon: MessageSquare, label: 'Notes', color: 'text-amber-600' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-[var(--muted)]">
                                <item.icon size={18} className={item.color} />
                                <span className="text-sm font-medium">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── HOW IT WORKS ─── */}
            <section className="py-24 md:py-32">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16 scroll-reveal">
                        <h2 className="text-3xl md:text-4xl font-display mb-4">How Serify Works</h2>
                        <p className="text-[var(--muted)] max-w-lg mx-auto">
                            Three steps to move from passive consumption to real mastery.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 md:gap-6">
                        {[
                            {
                                step: '01',
                                icon: Search,
                                title: 'Paste Anything',
                                desc: 'Drop a YouTube link, article URL, PDF, or raw notes. Serify extracts the key concepts automatically.',
                            },
                            {
                                step: '02',
                                icon: Brain,
                                title: 'AI Reflects With You',
                                desc: 'Scenario-based questions probe your real understanding — not just memorization. The AI adapts to your knowledge gaps.',
                            },
                            {
                                step: '03',
                                icon: TrendingUp,
                                title: 'Map Your Knowledge',
                                desc: 'Get a detailed Strength Map, Misconception Report, and actionable focus suggestions. Track mastery over time.',
                            },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="scroll-reveal group relative bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-7 hover:border-[var(--accent)]/40 hover:shadow-lg hover:shadow-[var(--accent)]/5 transition-all duration-300"
                            >
                                <div className="absolute top-6 right-6 text-5xl font-display text-[var(--border)] group-hover:text-[var(--accent-light)] transition-colors">
                                    {item.step}
                                </div>
                                <div className="w-11 h-11 rounded-xl bg-[var(--accent-light)] flex items-center justify-center mb-5">
                                    <item.icon size={20} className="text-[var(--accent)]" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                                <p className="text-sm text-[var(--muted)] leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── FEATURE SHOWCASE ─── */}
            <section className="py-24 md:py-32 bg-[var(--surface)] border-y border-[var(--border)]/50">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16 scroll-reveal">
                        <h2 className="text-3xl md:text-4xl font-display mb-4">Built for Deep Learning</h2>
                        <p className="text-[var(--muted)] max-w-lg mx-auto">
                            Not another flashcard app. Serify diagnoses your understanding at a conceptual level.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: BrainCircuit,
                                title: 'Cognitive Analysis',
                                desc: 'AI evaluates depth of understanding, not surface recall. Get scored on retrieval, application, and misconception detection.',
                                accent: 'from-emerald-500/10 to-teal-500/10',
                                iconColor: 'text-emerald-600',
                            },
                            {
                                icon: Shield,
                                title: 'Misconception Detection',
                                desc: 'Probe questions specifically designed to surface false confidence — the "illusion of competence" that blocks real learning.',
                                accent: 'from-purple-500/10 to-fuchsia-500/10',
                                iconColor: 'text-purple-600',
                            },
                            {
                                icon: Target,
                                title: 'Concept Vault',
                                desc: 'Every concept you study is tracked across sessions. Watch mastery evolve from "shaky" to "solid" with spaced repetition.',
                                accent: 'from-blue-500/10 to-cyan-500/10',
                                iconColor: 'text-blue-600',
                            },
                            {
                                icon: BookOpen,
                                title: 'Learn Mode',
                                desc: 'Structured curriculum generation for any topic. Serify builds a personalized learning path and teaches you step-by-step.',
                                accent: 'from-amber-500/10 to-orange-500/10',
                                iconColor: 'text-amber-600',
                            },
                            {
                                icon: RefreshCw,
                                title: 'Flow Sessions',
                                desc: 'Adaptive practice on your weakest concepts. The AI selects what you need to drill and adjusts difficulty in real-time.',
                                accent: 'from-rose-500/10 to-pink-500/10',
                                iconColor: 'text-rose-600',
                            },
                            {
                                icon: Target,
                                title: 'Smart Usage',
                                desc: 'Generous monthly limits across all features. Track your progress with transparent usage meters and never lose work.',
                                accent: 'from-yellow-500/10 to-amber-500/10',
                                iconColor: 'text-amber-500',
                            },
                        ].map((feature, i) => (
                            <div
                                key={i}
                                className={`scroll-reveal group bg-gradient-to-br ${feature.accent} border border-[var(--border)]/60 rounded-2xl p-6 hover:border-[var(--accent)]/30 hover:shadow-md transition-all duration-300`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-white/80 border border-[var(--border)]/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <feature.icon size={20} className={feature.iconColor} />
                                </div>
                                <h3 className="font-bold mb-2">{feature.title}</h3>
                                <p className="text-sm text-[var(--muted)] leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── TESTIMONIALS ─── */}
            <section className="py-24 md:py-32">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16 scroll-reveal">
                        <h2 className="text-3xl md:text-4xl font-display mb-4">What Learners Say</h2>
                        <p className="text-[var(--muted)] max-w-lg mx-auto">
                            Students, self-learners, and professionals trust Serify to deepen their understanding.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                quote: "I thought I understood machine learning until Serify's misconception probes showed me I was confusing regularization with normalization. Game changer.",
                                name: 'Alex K.',
                                role: 'CS Graduate Student',
                                stars: 5,
                            },
                            {
                                quote: "The Strength Map after each session is incredible. I can see exactly which concepts are solid and which ones I'm fooling myself about.",
                                name: 'Priya M.',
                                role: 'Medical Student',
                                stars: 5,
                            },
                            {
                                quote: "Learn Mode built me a complete curriculum for organic chemistry in seconds. The step-by-step teaching with inline quizzes is better than most textbooks.",
                                name: 'Marcus T.',
                                role: 'Pre-Med Undergraduate',
                                stars: 5,
                            },
                        ].map((testimonial, i) => (
                            <div
                                key={i}
                                className="scroll-reveal bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex flex-col hover:shadow-lg hover:shadow-black/5 transition-all duration-300"
                            >
                                <div className="flex gap-0.5 mb-4">
                                    {Array.from({ length: testimonial.stars }).map((_, j) => (
                                        <Star key={j} size={14} className="text-amber-400" fill="currentColor" />
                                    ))}
                                </div>
                                <p className="text-sm text-[var(--text)] leading-relaxed flex-1 mb-5">
                                    &ldquo;{testimonial.quote}&rdquo;
                                </p>
                                <div className="flex items-center gap-3 pt-4 border-t border-[var(--border)]">
                                    <div className="w-9 h-9 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-sm font-bold text-[var(--accent)]">
                                        {testimonial.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--text)]">{testimonial.name}</p>
                                        <p className="text-xs text-[var(--muted)]">{testimonial.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── PRICING TEASER ─── */}
            <section className="py-24 md:py-32 bg-[var(--surface)] border-y border-[var(--border)]/50">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="text-center mb-14 scroll-reveal">
                        <h2 className="text-3xl md:text-4xl font-display mb-4">Simple, Transparent Pricing</h2>
                        <p className="text-[var(--muted)] max-w-lg mx-auto">
                            Start free. Upgrade when you&apos;re ready for deeper analysis.
                        </p>
                    </div>

                    <div className="scroll-reveal grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                        {/* Free */}
                        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-7 flex flex-col">
                            <h3 className="text-xl font-bold mb-1">Free</h3>
                            <p className="text-[var(--muted)] text-sm mb-4">Try it. Find out what you actually know.</p>
                            <div className="flex items-baseline gap-1 mb-5">
                                <span className="text-4xl font-bold">$0</span>
                                <span className="text-sm text-[var(--muted)]">/mo</span>
                            </div>
                            <ul className="space-y-2.5 mb-6 flex-1">
                                {[
                                    '3 sessions per month',
                                    '5 flashcard generations',
                                    '3 practice quizzes',
                                    '10 AI assistant messages',
                                    '1 Flow Mode session',
                                    'Basic feedback report',
                                    'Concept Vault (10 concepts)'
                                ].map((f, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-[var(--muted)]">
                                        <Check size={14} className="text-emerald-500 shrink-0" /> {f}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href="/signup"
                                className="block text-center px-5 py-2.5 border border-[var(--accent)] text-[var(--accent)] rounded-xl font-semibold text-sm hover:bg-[var(--accent)] hover:text-white transition-colors"
                            >
                                Get Started
                            </Link>
                        </div>

                        {/* Pro */}
                        <div className="relative bg-[var(--bg)] border-2 border-[var(--accent)] rounded-2xl p-7 flex flex-col">
                            <div className="absolute -top-3 right-6">
                                <span className="bg-[var(--accent)] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                                    Recommended
                                </span>
                            </div>
                            <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                                Pro <BrainCircuit size={18} className="text-[var(--accent)]" />
                            </h3>
                            <p className="text-[var(--muted)] text-sm mb-4">For students and learners who are serious about understanding, not just finishing.</p>
                            <div className="flex items-baseline gap-1 mb-5">
                                <span className="text-4xl font-bold">$7.99</span>
                                <span className="text-sm text-[var(--muted)]">/mo</span>
                            </div>
                            <ul className="space-y-2.5 mb-6 flex-1">
                                {[
                                    '20 sessions per month',
                                    '50 flashcard generations',
                                    '30 practice quizzes',
                                    '150 AI assistant messages',
                                    '10 Flow Mode sessions',
                                    '5 Learn Mode curricula',
                                    'Full cognitive feedback',
                                    '20 Deep Dives',
                                    'Concept Vault up to 200'
                                ].map((f, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-[var(--muted)]">
                                        <Check size={14} className="text-[var(--accent)] shrink-0" /> {f}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href="/signup?intent=pro"
                                className="block text-center px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl font-semibold text-sm hover:bg-[var(--accent)]/90 transition-colors shadow-sm shadow-[var(--accent)]/20"
                            >
                                Start Pro
                            </Link>
                        </div>
                    </div>

                    <p className="text-center mt-6 scroll-reveal">
                        <Link href="/pricing" className="text-sm font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1">
                            See full pricing details <ChevronRight size={14} />
                        </Link>
                    </p>
                </div>
            </section>

            {/* ─── FINAL CTA ─── */}
            <section className="py-24 md:py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)] via-emerald-700 to-teal-800" />
                <div className="absolute inset-0 opacity-10">
                    <div className="landing-blob landing-blob-1" style={{ background: 'rgba(255,255,255,0.3)' }} />
                    <div className="landing-blob landing-blob-2" style={{ background: 'rgba(255,255,255,0.2)' }} />
                </div>

                <div className="relative z-10 max-w-3xl mx-auto px-6 text-center scroll-reveal">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-display text-white mb-5 leading-tight">
                        Stop Guessing.<br />Start Understanding.
                    </h2>
                    <p className="text-white/70 text-lg max-w-xl mx-auto mb-10">
                        Join thousands of learners who use Serify to move beyond the illusion of competence and achieve real mastery.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href="/signup"
                            className="group flex items-center gap-2 px-8 py-4 bg-white text-[var(--accent)] rounded-xl font-bold text-base hover:bg-white/90 transition-all shadow-xl shadow-black/20"
                        >
                            Create Free Account
                            <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                        <Link
                            href="/?demo=true"
                            className="flex items-center gap-2 px-8 py-4 border border-white/30 text-white rounded-xl font-semibold text-base hover:bg-white/10 transition-all"
                        >
                            Try Demo First
                        </Link>
                    </div>
                </div>
            </section>

            {/* ─── FOOTER ─── */}
            <footer className="py-12 border-t border-[var(--border)]">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <span className="text-xl font-display text-[var(--text)]">Serify</span>
                            <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                                <Link href="/pricing" className="hover:text-[var(--text)] transition-colors">Pricing</Link>
                                <Link href="/login" className="hover:text-[var(--text)] transition-colors">Log in</Link>
                                <Link href="/signup" className="hover:text-[var(--text)] transition-colors">Sign up</Link>
                            </div>
                        </div>
                        <p className="text-xs text-[var(--muted)]">
                            &copy; {new Date().getFullYear()} Serify. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
