/**
 * AuthContext.tsx
 * Purpose: Manages user authentication state and profile data across the application.
 * Key Logic: Utilizes Supabase Auth for session management, handles profile loading and 
 * creation, manages onboarding status, and provides auth-related methods via React Context.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

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

async function loadProfile(userId: string, email: string): Promise<UserProfile | null> {
    let profile = null;

    try {
        const { data, error: profileError } = await supabase
            .from('profiles')
            .select(
                'display_name, subscription_tier, preferences, created_at, onboarding_completed, user_type'
            )
            .eq('id', userId)
            .single();

        if (profileError) {
            if (profileError.code === 'PGRST116') {
            }
        } else {
            profile = data;
        }

        // Fetch usage tracking
        const { data: usage, error: usageError } = await supabase
            .from('usage_tracking')
            .select('tokens_used, monthly_limit')
            .eq('user_id', userId)
            .single();

        if (!usageError && usage) {
            profile = { ...profile, ...usage };
        }
    } catch (err: any) {
    }

    if (!profile) {
        const fallbackName = email
            ? email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)
            : 'User';

        return {
            id: userId,
            email: email || '',
            displayName: fallbackName,
            createdAt: new Date().toISOString(),
            subscriptionTier: 'free',
            plan: 'free',
            preferences: { tone: 'supportive', questionCount: 6 },
            onboardingCompleted: false,
            tokensUsed: 0,
            monthlyLimit: 50,
            percentUsed: 0
        };
    }

    const tokensUsed = (profile as any).tokens_used || 0;
    const monthlyLimit = (profile as any).monthly_limit || 50;
    const percentUsed = monthlyLimit > 0 ? (tokensUsed / monthlyLimit) * 100 : 0;

    const formatDisplayName = (
        name: string | null | undefined,
        email: string | undefined
    ): string => {
        if (name && name.trim()) {
            const trimmed = name.trim();
            return trimmed
                .split(' ')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        }
        if (email) {
            const username = email.split('@')[0];
            return username.charAt(0).toUpperCase() + username.slice(1);
        }
        return 'User';
    };

    return {
        id: userId,
        email: email || '',
        displayName: formatDisplayName(profile.display_name, email),
        createdAt: profile.created_at,
        subscriptionTier: profile.subscription_tier ?? 'free',
        plan: profile.subscription_tier ?? 'free',
        preferences: profile.preferences ?? { tone: 'supportive', questionCount: 6 },
        onboardingCompleted: profile.onboarding_completed ?? false,
        userType: profile.user_type ?? undefined,
        tokensUsed,
        monthlyLimit,
        percentUsed
    };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const state = useRef({
        isMounted: true,
        fetchingFor: null as string | null,
        profilePromise: null as Promise<void> | null,
        currentUser: null as UserProfile | null
    });

    const syncUser = (newUser: UserProfile | null) => {
        state.current.currentUser = newUser;
        if (state.current.isMounted) {
            setUser(newUser);
        }
    };

    const syncLoading = (isLoading: boolean) => {
        if (state.current.isMounted) {
            setLoading(isLoading);
        }
    };

    const ensureProfile = useCallback(async (userId: string, email: string) => {
        if (state.current.currentUser?.id === userId) {
            syncLoading(false);
            return;
        }

        if (state.current.fetchingFor === userId && state.current.profilePromise) {
            await state.current.profilePromise;
            return;
        }

        syncLoading(true);
        state.current.fetchingFor = userId;

        const promise = (async () => {
            try {
                const profile = await loadProfile(userId, email);
                syncUser(profile);
            } catch (err) {
                syncUser(null);
            } finally {
                if (state.current.fetchingFor === userId) {
                    state.current.fetchingFor = null;
                    state.current.profilePromise = null;
                }
                syncLoading(false);
            }
        })();

        state.current.profilePromise = promise;
        await promise;
    }, []);

    useEffect(() => {
        state.current.isMounted = true;

        const isOAuth =
            typeof window !== 'undefined' &&
            (window.location.hash.includes('access_token=') ||
                window.location.hash.includes('type=recovery') ||
                window.location.search.includes('code='));

        const init = async () => {
            // If OAuth, we wait a bit for the internal Supabase client to process the URL
            if (isOAuth) {
                syncLoading(true);
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            try {
                // If we aren't in an OAuth flow, we can just wait for the listener
                // Safety timeout to ensure we don't stay loading forever 
                // if Supabase listener fails to fire INITIAL_SESSION or SIGNED_IN
                setTimeout(() => {
                    if (state.current.isMounted) {
                        setLoading(prev => {
                            if (prev) console.log('Auth hydration fallback triggered');
                            return false;
                        });
                    }
                }, isOAuth ? 10000 : 5000); 
            } catch (err: any) {
                // Also catch if the promise itself rejects (like the Navigator Lock timeout sometimes does)
                if (err?.message?.includes('LockManager') || err?.message?.includes('timeout')) {
                    console.warn('Caught Supabase lock timeout exception - relying on auth state listener');
                    return;
                }
                console.error('Error during auth init:', err);
                if (state.current.isMounted) {
                    syncUser(null);
                    setToken(null);
                    syncLoading(false);
                }
            }
        };

        init();

        // Listen for auth state changes
        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!state.current.isMounted) return;

            console.log('Auth state change:', event, !!session);

            if (event === 'SIGNED_OUT') {
                syncUser(null);
                setToken(null);
                syncLoading(false);
            } else if (session?.user) {
                setToken(session.access_token);
                await ensureProfile(session.user.id, session.user.email || '');
            } else if (event === 'INITIAL_SESSION' && !session) {
                // If we're in an OAuth flow, we don't want to stop loading until we get a SIGNED_IN event
                if (!isOAuth) {
                    syncLoading(false);
                }
            } else if (event === 'SIGNED_IN' && !session) {
                if (!isOAuth) {
                    syncLoading(false);
                }
            }
        });

        return () => {
            state.current.isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string): Promise<UserProfile> => {
        console.log('[Auth] Starting login for:', email);
        if (!email || !email.trim()) {
            throw new Error('Email is required');
        }
        if (!password || !password.trim()) {
            throw new Error('Password is required');
        }

        if (!supabase) {
            throw new Error(
                'Supabase client is not initialized. Please check your environment variables.'
            );
        }

        try {
            console.log('[Auth] Calling signInWithPassword');
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password.trim()
            });

            if (error) {
                console.error('[Auth] signInWithPassword error:', error);
                const errorMessage = error.message || '';
                const errorStatus = (error as any).status;

                if (
                    errorMessage.includes('Invalid login credentials') ||
                    errorMessage.includes('invalid_credentials') ||
                    errorStatus === 400
                ) {
                    throw new Error(
                        'Invalid email or password. Please check your credentials and try again.'
                    );
                } else if (
                    errorMessage.includes('Email not confirmed') ||
                    errorMessage.includes('email_not_confirmed')
                ) {
                    throw new Error(
                        'Please confirm your email before logging in. Check your inbox for a confirmation link.'
                    );
                } else if (
                    errorMessage.includes('Too many requests') ||
                    errorMessage.includes('too_many_requests') ||
                    errorStatus === 429
                ) {
                    throw new Error(
                        'Too many login attempts. Please wait a few minutes and try again.'
                    );
                } else if (errorMessage.includes('User not found')) {
                    throw new Error(
                        'No account found with this email address. Please sign up first.'
                    );
                } else {
                    throw new Error(errorMessage || 'Login failed. Please try again.');
                }
            }

            if (data?.user) {
                console.log('[Auth] Login successful, user:', data.user.id);
                setToken(data.session?.access_token || null);
                const profile = await loadProfile(data.user.id, data.user.email || '');
                syncUser(profile);
                console.log('[Auth] Profile ensured');
                if (!profile) throw new Error('Failed to load user profile after login');
                return profile;
            }
            throw new Error('Login failed: No user data returned');
        } catch (err: any) {
            console.error('[Auth] Login catch block:', err);
            if (err instanceof Error) {
                throw err;
            }
            throw new Error(err?.message || 'Login failed. Please try again.');
        }
    };

    const register = async (email: string, password: string, displayName: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName } }
        });
        if (error) throw new Error(error.message);

        if (data?.user) {
            setToken(data.session?.access_token || null);
            await new Promise((resolve) => setTimeout(resolve, 500));
            await ensureProfile(data.user.id, email);
        }
    };

    const loginWithGoogle = async () => {
        const appUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
        const baseUrl = appUrl
            ? appUrl.replace(/\/$/, '')
            : typeof window !== 'undefined'
                ? window.location.origin
                : '';

        const redirectTo = `${baseUrl}/auth/callback`;

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                skipBrowserRedirect: false
            }
        });

        if (error) throw new Error(error.message);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        syncUser(null);
        setToken(null);
    };

    const updatePreferences = async (prefs: Partial<UserProfile['preferences']>) => {
        if (!user) return;
        const merged = { ...user.preferences, ...prefs };
        await supabase.from('profiles').update({ preferences: merged }).eq('id', user.id);
        syncUser({ ...user, preferences: merged });
    };

    const markOnboardingComplete = async () => {
        if (!user) throw new Error('No user found');

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    onboarding_completed: true,
                    onboarding_completed_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (updateError) {
                throw updateError;
            }

            const updatedProfile = await loadProfile(user.id, user.email);
            if (updatedProfile) {
                syncUser(updatedProfile);
            } else {
                syncUser({ ...user, onboardingCompleted: true });
            }
        } catch (err) {
            throw err;
        }
    };

    const refreshUsage = async () => {
        if (!user) return;
        const updated = await loadProfile(user.id, user.email);
        if (updated) syncUser(updated);
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
