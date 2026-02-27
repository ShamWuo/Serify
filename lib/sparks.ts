import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase as browserClient } from './supabase';
import { SparkBalance, SparkDeductionResult } from '../types/sparks';
import type { NextApiRequest } from 'next';

let internalAdminClient: SupabaseClient | null = null;

export const getSparkAdminClient = () => {
    if (typeof window !== 'undefined') {
        throw new Error('sparkAdminClient should only be used in server-side contexts');
    }

    if (!internalAdminClient) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (!supabaseServiceKey) {
            console.warn('⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations will fail.');
        }

        internalAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        });
    }
    return internalAdminClient;
};


const getClient = () => (typeof window !== 'undefined' ? browserClient : getSparkAdminClient());

export const DEMO_USER_ID = 'd3300000-0000-0000-0000-000000000000';


export async function getSparkBalance(userId: string): Promise<SparkBalance | null> {
    const client = getSparkAdminClient();
    const { data, error } = await client
        .from('spark_balances')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {

        if (error.code === 'PGRST116') {
            console.log(`Spark balance row missing for ${userId}. Attempting auto-initialization.`);


            const { data: newData, error: initError } = await client
                .from('spark_balances')
                .insert({
                    user_id: userId,
                    trial_sparks: 15,
                    topup_sparks: 0,
                    subscription_sparks: 0
                })
                .select()
                .single();

            if (initError) {
                console.error('Failed to auto-initialize spark balance:', initError);
                return null;
            }


            await client.from('spark_transactions').insert({
                user_id: userId,
                amount: 15,
                pool: 'trial',
                transaction_type: 'trial_grant',
                action: 'auto_initialization',
                balance_after: 15
            });


            await client.from('spark_grants').insert({
                user_id: userId,
                reason: 'auto_initialization',
                sparks_granted: 15,
                sparks_remaining: 15,
                expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            });

            return newData as SparkBalance;
        }

        console.error('Error fetching spark balance:', error);
        return null;
    }

    if (!data) return null;
    return data as SparkBalance;
}

export async function deductSparks(
    userId: string,
    amount: number,
    action: string,
    referenceId: string | null = null
): Promise<SparkDeductionResult> {
    if (amount <= 0) {
        return { success: true, remainingBalance: 0 };
    }

    if (userId === DEMO_USER_ID) {
        return { success: true, remainingBalance: 999 };
    }

    const client = getSparkAdminClient();
    const { data, error } = await client.rpc('deduct_sparks', {
        p_user_id: userId,
        p_amount: amount,
        p_action: action,
        p_reference_id: referenceId
    });

    if (error) {
        console.error('Error deducting sparks:', error);
        return { success: false, remainingBalance: 0 };
    }

    return data as SparkDeductionResult;
}

export const SPARK_COSTS = {

    SESSION_INGESTION: 2,
    CURRICULUM_GENERATION: 2,
    QUESTION_GENERATION: 1,
    SESSION_ANSWER_ANALYSIS: 1,
    BASIC_FEEDBACK_REPORT: 1,
    FULL_FEEDBACK_UPGRADE: 2,
    HINT_REQUEST: 1,

    FLASHCARD_DECK: 1,
    EXPLAIN_IT_TO_ME: 1,
    FEYNMAN_SUBMISSION: 2,
    AI_TUTOR_OPEN: 1,
    AI_TUTOR_MESSAGE: 1,
    PRACTICE_QUIZ_GEN: 1,
    PRACTICE_QUIZ_EVAL: 1,
    CONCEPT_DEEP_DIVE: 2,

    FLOW_MODE_PLAN: 5,
    FLOW_MODE_TEACH_NEW: 0,
    FLOW_MODE_EVAL: 0,

    VAULT_SYNTHESIS: 1,
    KNOWLEDGE_REPORT_CARD: 1,
};

export async function hasEnoughSparks(userId: string, requiredAmount: number): Promise<boolean> {
    if (userId === DEMO_USER_ID) return true;
    const balance = await getSparkBalance(userId);
    if (!balance) return false;
    return balance.total_sparks >= requiredAmount;
}

export async function authenticateApiRequest(req: NextApiRequest): Promise<string | null> {
    const authHeader = req.headers.authorization;
    const isDemoHeader = req.headers['x-serify-demo'] === 'true';

    if (!authHeader) {
        return isDemoHeader ? DEMO_USER_ID : null;
    }

    const token = authHeader.replace('Bearer ', '');

    if (token === 'demo-token' || isDemoHeader) {
        return DEMO_USER_ID;
    }



    const { data: { user } } = await getClient().auth.getUser(token);
    return user?.id || null;
}
