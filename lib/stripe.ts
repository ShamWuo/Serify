import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey && typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
    console.warn(
        '⚠️ STRIPE_SECRET_KEY is missing. Stripe features will use a placeholder and may fail.'
    );
}

export const stripe = new Stripe(stripeKey || 'sk_test_placeholder', {
    apiVersion: '2026-01-28.clover',
    appInfo: {
        name: 'Serify',
        version: '0.1.0'
    }
});
