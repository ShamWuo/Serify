import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
    Clock,
    BookOpen,
    Zap,
    CheckCircle2,
    ChevronRight,
    ArrowRight,
    Brain,
    Globe
} from 'lucide-react';
import Link from 'next/link';

export default function PublicCurriculumView() {
    const router = useRouter();
    const { id } = router.query;

    const [curriculum, setCurriculum] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!id) return;

        const fetchPublic = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/share/curriculum/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setCurriculum(data.curriculum);
                } else {
                    setError(true);
                }
            } catch (e) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchPublic();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]" />
            </div>
        );
    }

    if (error || !curriculum) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-[var(--surface)] rounded-2xl flex items-center justify-center mb-6 border border-[var(--border)]">
                    <Globe size={40} className="text-[var(--muted)]" />
                </div>
                <h1 className="text-2xl font-display mb-2">Curriculum not found</h1>
                <p className="text-[var(--muted)] mb-8">This curriculum might be private or deleted.</p>
                <Link href="/" className="px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-medium">
                    Go to Serify Home
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] selection:bg-[var(--accent)] selection:text-white">
            <Head>
                <title>{curriculum.title} | Shared on Serify</title>
            </Head>

            {/* TOP BAR */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[var(--border)]">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                            <Zap size={18} className="text-white fill-white" />
                        </div>
                        <span>Serify</span>
                    </Link>
                    <Link href="/login" className="px-5 py-2 bg-black text-white rounded-full text-sm font-bold hover:scale-105 transition-transform">
                        Join Serify
                    </Link>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-6 py-12 lg:py-20">
                {/* HEADER */}
                <div className="mb-16 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--accent)]/5 border border-[var(--accent)]/10 rounded-full text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest mb-6">
                        <Globe size={12} />
                        Publicly Shared Curriculum
                    </div>
                    <h1 className="text-4xl md:text-6xl font-display mb-6 tracking-tight leading-tight">
                        {curriculum.title}
                    </h1>
                    <p className="text-lg md:text-xl text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
                        {curriculum.target_description}
                    </p>

                    <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-[var(--muted)] text-sm font-medium">
                        <div className="flex items-center gap-2">
                            <BookOpen size={18} className="text-[var(--accent)]" />
                            {curriculum.concept_count} Concepts
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock size={18} className="text-[var(--accent)]" />
                            ~{Math.round((curriculum.estimated_minutes || curriculum.concept_count * 15) / 60)} hours
                        </div>
                        <div className="flex items-center gap-2">
                            <Brain size={18} className="text-[var(--accent)]" />
                            AI Powered Path
                        </div>
                    </div>
                </div>

                {/* CALL TO ACTION */}
                <div className="mb-16 p-8 bg-black text-white rounded-[2.5rem] shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                        <Zap size={200} fill="white" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="text-center md:text-left">
                            <h2 className="text-2xl md:text-3xl font-display mb-2">Want to learn this?</h2>
                            <p className="text-white/70 max-w-md">Save this curriculum to your account and start your personalized learning journey with Serify AI.</p>
                        </div>
                        <Link href="/login" className="whitespace-nowrap px-8 py-4 bg-white text-black rounded-2xl font-bold flex items-center gap-2 hover:bg-white/90 transition-colors shadow-xl">
                            Sign up to start
                            <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>

                {/* CURRICULUM MAP */}
                <div className="space-y-12">
                    <div className="flex items-center gap-4 mb-4">
                        <h2 className="text-2xl font-display">Learning Path</h2>
                        <div className="flex-1 h-px bg-[var(--border)]" />
                    </div>

                    {curriculum.units.map((unit: any, uIdx: number) => (
                        <div key={uIdx} className="space-y-6">
                            <div className="flex items-center gap-3">
                                <span className="text-[var(--accent)] font-mono text-sm font-bold">0{unit.unitNumber}</span>
                                <h3 className="text-xl font-bold">{unit.unitTitle}</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {unit.concepts.map((concept: any, cIdx: number) => (
                                    <div key={cIdx} className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-3xl hover:border-[var(--accent)] transition-colors group">
                                        <div className="flex items-start justify-between mb-3">
                                            <h4 className="font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{concept.name}</h4>
                                            <div className="w-6 h-6 rounded-full border border-[var(--border)] flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-[var(--border)] group-hover:bg-[var(--accent)] transition-colors" />
                                            </div>
                                        </div>
                                        <p className="text-xs text-[var(--muted)] leading-relaxed italic mb-4 line-clamp-2">
                                            "{concept.definition}"
                                        </p>
                                        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-[var(--muted)]">
                                            <span>Difficulty: {concept.difficulty}</span>
                                            <span className="opacity-30">&middot;</span>
                                            <span>{concept.estimatedMinutes} min</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* BOTTOM CTA */}
                <div className="mt-24 pt-12 border-t border-[var(--border)] text-center">
                    <p className="text-[var(--muted)] mb-8">Ready to master any topic with AI-driven active recall?</p>
                    <Link href="/signup" className="inline-flex items-center gap-2 text-2xl font-display hover:text-[var(--accent)] transition-colors">
                        Build your unique curriculum with Serify
                        <ChevronRight size={28} />
                    </Link>
                </div>
            </main>

            <footer className="py-12 border-t border-[var(--border)] text-center text-xs text-[var(--muted)]">
                &copy; {new Date().getFullYear()} Serify AI. Personalized cognitive feedback engine.
            </footer>
        </div>
    );
}
