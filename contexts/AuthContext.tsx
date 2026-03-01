import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
}

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, displayName: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    updatePreferences: (prefs: Partial<UserProfile['preferences']>) => Promise<void>;
    markOnboardingComplete: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadProfile(userId: string, email: string): Promise<UserProfile | null> {
    let profile = null;

    try {
        console.log(`AuthContext: Call started for ${userId}`);
        const { data, error: profileError } = await supabase
            .from('profiles')
            .select(
                'display_name, subscription_tier, preferences, created_at, onboarding_completed, user_type'
            )
            .eq('id', userId)
            .single();
        console.log(
            `AuthContext: Call completed for ${userId}. Data exist: ${!!data}, Error: ${profileError?.message || 'none'}`
        );

        if (profileError) {
            console.error('Error loading profile from profiles table:', {
                message: profileError.message,
                details: profileError.details,
                code: profileError.code
            });

            if (profileError.code === 'PGRST116') {
                console.warn('Profile not found in profiles table for:', userId);
            }
        } else {
            profile = data;
            console.log('Profile loaded successfully for:', userId);
        }
    } catch (err: any) {
        console.error('Exception while loading profile:', err);
    }

    if (!profile) {
        console.warn(
            `Creating fallback profile for ${userId} because profiles table returned null`
        );
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
            onboardingCompleted: false
        };
    }

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
        userType: profile.user_type ?? undefined
    };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
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

    const ensureProfile = async (userId: string, email: string) => {
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
                console.error('AuthContext: Profile fetch failed', err);
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
    };

    useEffect(() => {
        state.current.isMounted = true;

        const init = async () => {
            const isOAuth =
                typeof window !== 'undefined' &&
                (window.location.hash.includes('access_token=') ||
                    window.location.search.includes('code='));

            if (isOAuth) {
                console.log(
                    'AuthContext: Detected OAuth callback. Waiting for AuthStateChange to fire...'
                );

                return;
            }

            try {
                const {
                    data: { session },
                    error
                } = await supabase.auth.getSession();
                if (error) throw error;

                if (session?.user) {
                    await ensureProfile(session.user.id, session.user.email || '');
                } else {
                    syncUser(null);
                    syncLoading(false);
                }
            } catch (err) {
                console.error('AuthContext: Initialization failed', err);
                syncUser(null);
                syncLoading(false);
            }
        };

        init();

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('AuthContext: Auth event:', event);
            if (!state.current.isMounted) return;

            if (event === 'SIGNED_OUT') {
                syncUser(null);
                syncLoading(false);
            } else if (session?.user) {
                await ensureProfile(session.user.id, session.user.email || '');
            }
        });

        const currentState = state.current;
        return () => {
            currentState.isMounted = false;
            subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = async (email: string, password: string) => {
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
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password.trim()
            });

            if (error) {
                console.error('Login error:', {
                    message: error.message,
                    status: (error as any).status,
                    name: error.name
                });

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
                await ensureProfile(data.user.id, data.user.email || '');
            }
        } catch (err: any) {
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
                console.error('Failed to update onboarding status:', updateError);
                throw updateError;
            }

            const updatedProfile = await loadProfile(user.id, user.email);
            if (updatedProfile) {
                syncUser(updatedProfile);
                console.log('Onboarding marked complete, profile reloaded');
            } else {
                syncUser({ ...user, onboardingCompleted: true });
                console.warn('Profile reload failed, using local state update');
            }
        } catch (err) {
            console.error('Failed to mark onboarding complete:', err);
            throw err;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                loginWithGoogle,
                logout,
                updatePreferences,
                markOnboardingComplete
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
