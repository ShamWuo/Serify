import type { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <Component {...pageProps} />
            </AuthProvider>
        </ErrorBoundary>
    );
}
