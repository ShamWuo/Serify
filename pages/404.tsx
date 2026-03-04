import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Compass } from 'lucide-react';

export default function Custom404() {
    return (
        <DashboardLayout>
            <Head>
                <title>Page Not Found | Serify</title>
            </Head>
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[60vh]">
                <div className="glass p-10 md:p-14 rounded-3xl border border-[var(--border)] shadow-2xl flex flex-col items-center max-w-lg w-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--accent)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                    <div className="w-20 h-20 rounded-full bg-[var(--surface)] border-2 border-[var(--border)] flex items-center justify-center mb-6 shadow-sm animate-fade-in-up relative z-10">
                        <Compass size={32} className="text-[var(--accent)]" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display text-gradient mb-4 relative z-10">404</h1>
                    <h2 className="text-xl md:text-2xl font-medium text-[var(--text)] mb-4 relative z-10">
                        Off the beaten path
                    </h2>
                    <p className="text-[var(--muted)] max-w-md mx-auto mb-8 leading-relaxed relative z-10">
                        The page you&apos;re looking for doesn&apos;t exist or has been moved.
                        Let&apos;s get you back to your learning journey.
                    </p>
                    <Link
                        href="/"
                        className="px-8 py-3.5 bg-[var(--accent)] text-white font-medium rounded-xl shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all animate-pulse-glow relative z-10"
                    >
                        Return Home
                    </Link>
                </div>
            </div>
        </DashboardLayout>
    );
}
