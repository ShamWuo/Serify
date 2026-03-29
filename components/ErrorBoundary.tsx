import React from 'react';
import { RefreshCcw } from 'lucide-react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, errorMessage: '' };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, errorMessage: error.message };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
                    <div className="max-w-md text-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <RefreshCcw className="text-red-500" size={28} />
                        </div>
                        <h1 className="text-2xl font-display font-bold text-[var(--text)] mb-3">System offline</h1>
                        <p className="text-[var(--muted)] mb-8 text-sm font-mono leading-relaxed">
                            {'// error_caught: '}{this.state.errorMessage || 'An unexpected error occurred.'}
                            <br />
                            Refreshing the page usually restores connectivity.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2.5 bg-[var(--accent)] text-white font-bold hover:opacity-90 transition-all shadow-[var(--shadow-hard-sm)]"
                            >
                                RELOAD
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="px-6 py-2.5 border-2 border-[var(--border)] text-[var(--text)] font-bold hover:bg-[var(--surface)] transition-all"
                            >
                                GO HOME
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
