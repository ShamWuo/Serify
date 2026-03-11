import type { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '@/styles/globals.css';
import 'katex/dist/katex.min.css';
import SEO from '@/components/Layout/SEO';
import { SpeedInsights } from "@vercel/speed-insights/next";


export default function App({ Component, pageProps }: AppProps) {
    return (
        <ErrorBoundary>
            <SEO />
            <AuthProvider>
                <Component {...pageProps} />
                <SpeedInsights />
            </AuthProvider>
        </ErrorBoundary>
    );
}
