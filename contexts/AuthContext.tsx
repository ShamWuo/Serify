import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface UserProfile {
    id: string;
    email: string;
    displayName: string;
    createdAt: string;
    subscriptionTier: string;
    plan?: string;
    preferences: { tone: string; questionCount: number };
    onboardingCompleted: boolean;
    userType?: string;
    learningContext?: string;
    tokensUsed: number;
    monthlyLimit: number;
    percentUsed: number;
}

interface AuthContextType {
    user: UserProfile | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<UserProfile>;
    register: (email: string, password: string, displayName: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    updatePreferences: (prefs: Partial<UserProfile['preferences']>) => Promise<void>;
    markOnboardingComplete: () => Promise<void>;
    refreshUsage: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async (session: Session) => {
        try {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            const { data: usage, error: usageError } = await supabase
                .from('usage_tracking')
                .select('tokens_used, monthly_limit, plan')
                .eq('user_id', session.user.id)
                .single();

            if (profileError) throw profileError;

            const tokensUsed = usage?.tokens_used || 0;
            const monthlyLimit = usage?.monthly_limit || 50;

            const userData: UserProfile = {
                id: session.user.id,
                email: session.user.email!,
                displayName: profile.display_name || 'User',
                createdAt: profile.created_at,
                subscriptionTier: profile.subscription_tier || 'free',
                plan: usage?.plan || profile.subscription_tier || 'free',
                preferences: profile.preferences || { tone: 'supportive', questionCount: 6 },
                onboardingCompleted: profile.onboarding_completed,
                userType: profile.user_type,
                learningContext: profile.learning_context,
                tokensUsed,
                monthlyLimit,
                percentUsed: (tokensUsed / monthlyLimit) * 100
            };

            setUser(userData);
            setToken(session.access_token);
        } catch (err) {
            console.error('Error fetching profile:', err);
            // Handle profile fetch error (e.g., redirect to login)
        }
    }, []);

    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                fetchProfile(session).finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });

        // Listen for changes on auth state (sign in, sign out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
                await fetchProfile(session);
            } else {
                setUser(null);
                setToken(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [fetchProfile]);

    const login = async (email: string, password: string): Promise<UserProfile> => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.session) throw new Error('Failed to create session');
        
        // Profiles are updated via the useEffect listener, but we return the user for immediate routing
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        const { data: usage } = await supabase.from('usage_tracking').select('*').eq('user_id', data.user.id).single();
        
        return {
            id: data.user.id,
            email: data.user.email!,
            displayName: profile?.display_name || 'User',
            createdAt: profile?.created_at,
            subscriptionTier: profile?.subscription_tier || 'free',
            preferences: profile?.preferences || { tone: 'supportive', questionCount: 6 },
            onboardingCompleted: profile?.onboarding_completed || false,
            tokensUsed: usage?.tokens_used || 0,
            monthlyLimit: usage?.monthly_limit || 50,
            percentUsed: ((usage?.tokens_used || 0) / (usage?.monthly_limit || 50)) * 100
        };
    };

    const register = async (email: string, password: string, displayName: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { display_name: displayName }
            }
        });
        if (error) throw error;
    };

    const loginWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`
            }
        });
        if (error) throw error;
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setToken(null);
    };

    const updatePreferences = async (prefs: Partial<UserProfile['preferences']>) => {
        if (!user) return;
        const newPrefs = { ...user.preferences, ...prefs };
        const { error } = await supabase.from('profiles').update({ preferences: newPrefs }).eq('id', user.id);
        if (error) throw error;
        setUser({ ...user, preferences: newPrefs });
    };

    const markOnboardingComplete = async () => {
        if (!user) return;
        const { error } = await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);
        if (error) throw error;
        setUser({ ...user, onboardingCompleted: true });
    };

    const refreshUsage = async () => {
        if (!user) return;
        const { data: usage } = await supabase.from('usage_tracking').select('tokens_used, monthly_limit, plan').eq('user_id', user.id).single();
        if (usage) {
            setUser(prev => prev ? {
                ...prev,
                tokensUsed: usage.tokens_used,
                monthlyLimit: usage.monthly_limit,
                percentUsed: (usage.tokens_used / usage.monthly_limit) * 100,
                plan: usage.plan
            } : null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                login,
                register,
                loginWithGoogle,
                logout,
                updatePreferences,
                markOnboardingComplete,
                refreshUsage
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
