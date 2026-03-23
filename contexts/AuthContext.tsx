import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export interface UserProfile {
    id: string;
    email: string;
    displayName: string;
    createdAt: string;
    subscriptionTier: string;
    plan?: string;
    preferences: { tone?: string; questionCount?: number } | null;
    onboardingCompleted: boolean;
    userType?: string;
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

    const fetchProfileAndUsage = async (authUser: User, sessionToken?: string): Promise<UserProfile | null> => {
        try {
            // 1. Fetch profile with timeout
            const profilePromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            const profileTimeout = new Promise<{ data?: any; error?: any; timeout: boolean }>((resolve) => 
                setTimeout(() => resolve({ timeout: true }), 5000)
            );
            
            const profileRaceResult = await Promise.race([
                profilePromise.then(res => ({ data: res.data, error: res.error, timeout: false })),
                profileTimeout
            ]);

            const isTimeout = profileRaceResult.timeout || false;
            const hasError = profileRaceResult.error || !profileRaceResult.data;

            let profile = null;
            
            if (isTimeout) {
                console.warn('[AuthContext] Profile fetch timeout (5s), using fallback');
            } else if (hasError) {
                console.error('[AuthContext] Error fetching profile, using fallback:', profileRaceResult.error);
            } else {
                profile = profileRaceResult.data;
            }

            let tokensUsed = 0;
            let monthlyLimit = 100;
            let percentUsed = 0;
            let plan = profile?.subscription_tier || 'free';

            try {
                const jwt = sessionToken || (await supabase.auth.getSession()).data.session?.access_token;
                
                if (jwt) {
                    const usageResPromise = fetch('/api/usage', {
                        headers: {
                            Authorization: `Bearer ${jwt}`
                        }
                    });
                    const usageTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
                    const usageRes = await Promise.race([
                        usageResPromise as any,
                        usageTimeout as any
                    ]);

                    if (usageRes && usageRes.ok) {
                        const usageData = await usageRes.json();
                        tokensUsed = usageData.tokensUsed || 0;
                        monthlyLimit = usageData.monthlyLimit || 100;
                        percentUsed = usageData.percentUsed || 0;
                        plan = usageData.plan || plan;
                    }
                }
            } catch (usageError) {
                console.warn('Could not fetch usage info:', usageError);
            }

            const parsedPreferences = profile?.preferences 
                ? (typeof profile.preferences === 'string' ? JSON.parse(profile.preferences) : profile.preferences)
                : { tone: 'encouraging', questionCount: 5 };

            return {
                id: authUser.id,
                email: authUser.email || '',
                displayName: profile?.display_name || authUser.user_metadata?.display_name || 'User',
                createdAt: profile?.created_at || authUser.created_at || new Date().toISOString(),
                subscriptionTier: profile?.subscription_tier || 'free',
                plan: plan,
                preferences: parsedPreferences,
                onboardingCompleted: profile?.onboarding_completed ?? true, // Assume complete on timeout to avoid blocking
                userType: profile?.user_type || 'user',
                tokensUsed,
                monthlyLimit,
                percentUsed,
            };
        } catch (error) {
            console.error('Error in fetchProfileAndUsage, returning fallback profile:', error);
            // Crucial: return a basic profile instead of null to prevent app hang/redirect
            return {
                id: authUser.id,
                email: authUser.email || '',
                displayName: authUser.user_metadata?.display_name || 'User',
                createdAt: authUser.created_at || new Date().toISOString(),
                subscriptionTier: 'free',
                plan: 'free',
                preferences: { tone: 'encouraging', questionCount: 5 },
                onboardingCompleted: true,
                userType: 'user',
                tokensUsed: 0,
                monthlyLimit: 10,
                percentUsed: 0,
            };
        }
    };

    const handleAuthChange = async (event: string, session: Session | null) => {
        try {
            console.log(`[AuthContext] handleAuthChange event: ${event}`);
            if (session?.user) {
                setToken(session.access_token);
                // Wrap the whole profile fetch in a safety net so it can't hang the app
                const userProfile = await fetchProfileAndUsage(session.user, session.access_token);
                
                if (userProfile) {
                    setUser(userProfile);
                } else {
                    // If fetch completely failed, only wipe if we don't have a user already.
                    setUser(prev => prev);
                }
            } else {
                setUser(null);
                setToken(null);
            }
        } finally {
            // CERTAINLY set loading to false so the app can render (e.g., login page)
            setLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        
        async function loadInitialSession() {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                if (mounted) {
                    await handleAuthChange('INITIAL_SESSION', session);
                }
            } catch (err) {
                console.error('Initial session fetch error:', err);
                if (mounted) setLoading(false);
            }
        }
        
        loadInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string): Promise<UserProfile> => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.user) throw new Error('No user returned from login');
        
        const profile = await fetchProfileAndUsage(data.user, data.session?.access_token);
        if (!profile) throw new Error('Failed to load user profile');
        
        setUser(profile);
        setToken(data.session?.access_token || null);
        return profile;
    };

    const register = async (email: string, password: string, displayName: string): Promise<void> => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName,
                }
            }
        });
        if (error) throw error;
    };

    const loginWithGoogle = async (): Promise<void> => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/api/auth/callback`
            }
        });
        if (error) throw error;
    };

    const logout = async (): Promise<void> => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
        setToken(null);
    };

    const updatePreferences = async (prefs: Partial<UserProfile['preferences']>): Promise<void> => {
        if (!user) return;
        
        const newPrefs = { ...user.preferences, ...prefs };
        const { error } = await supabase
            .from('profiles')
            .update({ preferences: newPrefs as any })
            .eq('id', user.id);
            
        if (error) throw error;
        setUser({ ...user, preferences: newPrefs });
    };

    const markOnboardingComplete = async (): Promise<void> => {
        if (!user) return;
        
        const { error } = await supabase
            .from('profiles')
            .update({ 
                onboarding_completed: true,
                onboarding_completed_at: new Date().toISOString()
            })
            .eq('id', user.id);
            
        if (error) throw error;
        setUser({ ...user, onboardingCompleted: true });
    };

    const refreshUsage = async (): Promise<void> => {
        if (!user) return;
        const authSession = await supabase.auth.getSession();
        if (authSession.data.session?.user) {
            const updatedProfile = await fetchProfileAndUsage(authSession.data.session.user, authSession.data.session.access_token);
            if (updatedProfile) {
                setUser(updatedProfile);
            }
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
