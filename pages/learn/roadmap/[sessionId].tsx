
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Zap, Loader2 } from 'lucide-react';

/**
 * Transition Hub for Roadmap Sessions.
 * This page bridges the scheduled roadmap task with the interactive learning flow.
 */
export default function RoadmapSessionLoader() {
  const router = useRouter();
  const { sessionId } = router.query;
  const { user, token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Syncing Blueprint...');

  useEffect(() => {
    if (!user || !sessionId || !token) return;

    const startSession = async () => {
      try {
        setStatusMessage('Syncing with Exam Blueprint...');
        const response = await fetch('/api/serify/roadmap/start-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer \${token}`
          },
          body: JSON.stringify({ roadmapSessionId: sessionId })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to initialize session');
        }

        setStatusMessage('Opening Interactive Flow...');
        
        // Brief delay for transition smoothness
        setTimeout(() => {
          router.push(`/learn/quick/flow?session=\${data.flowSessionId}`);
        }, 800);

      } catch (err: any) {
        console.error('Session start error:', err);
        setError(err.message);
      }
    };

    startSession();
  }, [user, sessionId, token, router]);

  return (
    <DashboardLayout>
      <Head>
        <title>Initiating Protocol | Serify</title>
      </Head>

      <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-lg mx-auto p-8 text-center space-y-8">
        {!error ? (
          <>
            <div className="relative">
              <div className="w-20 h-20 border-4 border-[var(--border-soft)] border-t-[var(--accent)] rounded-full animate-spin shadow-hard" />
              <div className="absolute inset-0 flex items-center justify-center text-[var(--accent)]">
                <Zap size={24} fill="currentColor" className="animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-black tracking-tight text-[var(--foreground)] uppercase italic">
                {statusMessage}
              </h2>
              <p className="font-mono text-xs text-[var(--muted)] tracking-widest">
                PREPARING TARGETED CONTEXT FOR YOUR EXAM GOAL
              </p>
            </div>
            
            <div className="w-full max-w-xs h-1 bg-[var(--bg)] border border-[var(--border-soft)] overflow-hidden">
              <div className="h-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)] animate-loading-bar" />
            </div>
          </>
        ) : (
          <div className="paper-card border-2 border-[var(--warn)] p-8 space-y-6 bg-[var(--surface-raised)]">
            <div className="w-16 h-16 mx-auto bg-[var(--warn-soft)] rounded-full flex items-center justify-center text-[var(--warn)]">
              <AlertCircle size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-display font-black uppercase">Operation Failed</h2>
              <p className="font-mono text-sm text-[var(--muted)]">{error}</p>
            </div>
            <button 
              onClick={() => router.push('/roadmap')}
              className="btn-secondary w-full shadow-hard-sm"
            >
              Return to Roadmap Hub
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
        .animate-loading-bar {
          animation: loading-bar 2s infinite ease-in-out;
        }
      `}</style>
    </DashboardLayout>
  );
}
