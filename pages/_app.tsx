import type { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import { AssistantProvider } from '@/contexts/AssistantContext';
import { FeatureFlagProvider } from '@/contexts/FeatureFlagContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '@/styles/globals.css';
import 'katex/dist/katex.min.css';
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function App({ Component, pageProps }: AppProps) {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <FeatureFlagProvider>
                    <AssistantProvider>
                        <Component {...pageProps} />
                        <SpeedInsights />
                    </AssistantProvider>
                </FeatureFlagProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}
