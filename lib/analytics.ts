export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Analytics Event] ${eventName}`, properties || {});
    }
    
};
