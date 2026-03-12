export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    // Basic stub for analytics tracking, which could be replaced with Google Analytics, Posthog, Mixpanel, etc.
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Analytics Event] ${eventName}`, properties || {});
    }
    // E.g.: window.gtag('event', eventName, properties);
};
