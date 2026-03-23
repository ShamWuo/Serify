import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getAllEnabledFlags } from '@/lib/flags';

type FeatureFlagContextType = {
    flags: string[];
    isEnabled: (flagKey: string) => boolean;
    isLoading: boolean;
};

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [flags, setFlags] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadFlags() {
            try {
                
                const metadata = user ? { tier: user.subscriptionTier } : undefined;
                const enabledFlags = await getAllEnabledFlags(user?.id, metadata);
                setFlags(enabledFlags);
            } catch (error) {
                console.error('[Feature Flags] Failed to load flags:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadFlags();
    }, [user?.id, user?.subscriptionTier]);

    const isEnabled = (flagKey: string) => flags.includes(flagKey);

    return (
        <FeatureFlagContext.Provider value={{ flags, isEnabled, isLoading }}>
            {children}
        </FeatureFlagContext.Provider>
    );
};

export const useFeatureFlags = () => {
    const context = useContext(FeatureFlagContext);
    if (context === undefined) {
        throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
    }
    return context;
};

export const FeatureFlag: React.FC<{ 
    flag: string; 
    children: React.ReactNode;
    fallback?: React.ReactNode;
}> = ({ flag, children, fallback = null }) => {
    const { isEnabled, isLoading } = useFeatureFlags();

    if (isLoading) return null; 

    return isEnabled(flag) ? <>{children}</> : <>{fallback}</>;
};
