/**
 * AuthContext.tsx - SIMPLIFIED TEST VERSION
 * Testing if the component can render at all
 */

import React, { createContext, useContext, useState } from 'react';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    console.warn('🔥🔥🔥 AUTH PROVIDER IS RENDERING - TEST MODE 🔥🔥🔥');
    
    // Simplified state - force loading to false immediately
    const [user] = useState<UserProfile | null>(null);
    const [token] = useState<string | null>(null);
    const [loading] = useState(false); // FORCE FALSE FOR TESTING
    
    console.warn('🔥 Auth state:', { user: !!user, token: !!token, loading });

    // Dummy functions for context
    const login = async (email: string, password: string): Promise<UserProfile> => {
        throw new Error('Not implemented in test mode');
    };

    const register = async (email: string, password: string, displayName: string) => {
        throw new Error('Not implemented in test mode');
    };

    const loginWithGoogle = async () => {
        throw new Error('Not implemented in test mode');
    };

    const logout = async () => {
        console.warn('Logout called');
    };

    const updatePreferences = async (prefs: Partial<UserProfile['preferences']>) => {
        console.warn('Update preferences called');
    };

    const markOnboardingComplete = async () => {
        console.warn('Mark onboarding complete called');
    };

    const refreshUsage = async () => {
        console.warn('Refresh usage called');
    };

    console.warn('🔥 About to return AuthContext.Provider');

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading, // This is FALSE
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
