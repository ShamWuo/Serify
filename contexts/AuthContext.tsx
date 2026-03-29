import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
    const lastSessionIdRef = useRef<string | null>(null);
    const initializationStartedRef = useRef(false);

    const fetchProfileAndUsage = useCallback(async (authUser: User, sessionToken?: string): Promise<UserProfile | null> => {
        try {
            // Fetch profile with exponential backoff or simple retries
            const maxRetries = 3;
            let profile = null;
            let lastError = null;

            for (let attempt = 0; attempt < maxRetries; attempt++) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authUser.id)
                    .maybeSingle();

                if (data) {
                    profile = data;
                    break;
                } else {
                    lastError = error;
                    // If it's a new user, the trigger might still be running
                    await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
                }
            }
            
            if (!profile) {
                console.warn('[AuthContext] Profile not found after retries, using auth metadata:', lastError);
            }

            let tokensUsed = 0;
            let monthlyLimit = 100;
            let percentUsed = 0;
            let plan = profile?.subscription_tier || 'free';

            try {
                const jwt = sessionToken || (await supabase.auth.getSession()).data.session?.access_token;
                
                if (jwt) {
                    const usageRes = await fetch('/api/usage', {
                        headers: { Authorization: `Bearer ${jwt}` },
                        // Short timeout for usage fetch to not block auth
                        signal: AbortSignal.timeout(2500)
                    }).catch(() => null);

                    if (usageRes && usageRes.ok) {
                        const usageData = await usageRes.json();
                        tokensUsed = usageData.tokensUsed || 0;
                        monthlyLimit = usageData.monthlyLimit || 100;
                        percentUsed = usageData.percentUsed || 0;
                        plan = usageData.plan || plan;
                    }
                }
            } catch (usageError) {
                console.warn('[AuthContext] Could not fetch usage info:', usageError);
            }

            const parsedPreferences = profile?.preferences 
                ? (typeof profile.preferences === 'string' ? JSON.parse(profile.preferences) : profile.preferences)
                : { tone: 'encouraging', questionCount: 5 };

            return {
                id: authUser.id,
                email: authUser.email || '',
                displayName: profile?.display_name || authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || 'User',
                createdAt: profile?.created_at || authUser.created_at || new Date().toISOString(),
                subscriptionTier: profile?.subscription_tier || 'free',
                plan: plan,
                preferences: parsedPreferences,
                onboardingCompleted: profile?.onboarding_completed ?? true, 
                userType: profile?.user_type || 'user',
                tokensUsed,
                monthlyLimit,
                percentUsed,
            };
        } catch (error) {
            console.error('[AuthContext] Error in fetchProfileAndUsage:', error);
            return null;
        }
    }, []);

    const handleAuthChange = useCallback(async (event: string, session: Session | null) => {
        const sessionId = session?.access_token || 'none';
        
        // Prevent redundant processing of the same session
        if (sessionId !== 'none' && sessionId === lastSessionIdRef.current && event !== 'TOKEN_REFRESHED') {
            console.log(`[AuthContext] Skipping redundant auth event: ${event}`);
            return;
        }
        
        console.log(`[AuthContext] Processing auth event: ${event}`);
        lastSessionIdRef.current = sessionId === 'none' ? null : sessionId;

        if (session?.user) {
            setToken(session.access_token);
            const userProfile = await fetchProfileAndUsage(session.user, session.access_token);
            if (userProfile) {
                setUser(userProfile);
            }
        } else {
            setUser(null);
            setToken(null);
        }
        
        setLoading(false);
    }, [fetchProfileAndUsage]);

    useEffect(() => {
        if (initializationStartedRef.current) return;
        initializationStartedRef.current = true;

        console.log('[AuthContext] Initializing auth flow...');

        // 1. Set up the listener first so we don't miss the initial event if getSession is slow
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            handleAuthChange(event, session);
        });

        // 2. Then get the current session to ensure we have it immediately
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                handleAuthChange('INITIAL_SESSION', session);
            } else {
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [handleAuthChange]);

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
        console.log('[AuthContext] Starting logout sequence...');
        try {
            // Using scope: 'local' and clearing state manually is often more reliable
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.warn('[AuthContext] Supabase signOut returned an error (clearing anyway):', error);
            }
        } catch (err) {
            console.error('[AuthContext] Exception during signOut:', err);
        } finally {
            // ALWAYS clear local state regardless of Supabase response
            setUser(null);
            setToken(null);
            
            // Forcefully clear the storage key to prevent auto-re-auth on reload
            if (typeof window !== 'undefined') {
                try {
                    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                    const ref = url.includes('supabase.co') ? url.split('.')[0].split('//')[1] : 'local';
                    const key = `sb-${ref}-auth-token`;
                    localStorage.removeItem(key);
                    
                    // Cleanup any other potential supabase keys
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
                            localStorage.removeItem(k);
                        }
                    }
                } catch (e) {
                    console.error('[AuthContext] Error manually clearing storage:', e);
                }
            }
            console.log('[AuthContext] Logout sequence complete.');
        }
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
