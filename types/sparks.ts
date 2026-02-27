export type SparkPool = 'trial' | 'topup' | 'subscription';

export interface SparkBalance {
    user_id: string;
    subscription_sparks: number;
    topup_sparks: number;
    trial_sparks: number;
    total_sparks: number;
    updated_at: string;
}

export interface SparkTransaction {
    id: string;
    user_id: string;
    amount: number;
    pool: SparkPool;
    transaction_type: string;
    action: string;
    reference_id: string | null;
    stripe_payment_intent_id: string | null;
    balance_after: number;
    created_at: string;
}

export interface SparkPurchase {
    id: string;
    user_id: string;
    pack_id: string;
    sparks_granted: number;
    sparks_remaining: number;
    price_cents: number;
    stripe_payment_intent_id: string | null;
    purchased_at: string;
    expires_at: string | null;
}

export interface SparkGrant {
    id: string;
    user_id: string;
    reason: string;
    sparks_granted: number;
    sparks_remaining: number;
    granted_at: string;
    expires_at: string | null;
}

export interface SparkDeductionResult {
    success: boolean;
    remainingBalance: number;
}
