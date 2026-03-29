import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FeatureName, UsageCheckResult, incrementUsage } from '@/lib/usage';

export function useUsage(feature?: FeatureName) {
    const { token, user, refreshUsage: refreshGlobalUsage } = useAuth();
    const [loading, setLoading] = useState(!user);
    const [usage, setUsage] = useState<UsageCheckResult | null>(null);
    const [allUsage, setAllUsage] = useState<any>(user ? {
        tokensUsed: user.tokensUsed,
        monthlyLimit: user.monthlyLimit,
        percentUsed: user.percentUsed,
        plan: user.plan
    } : null);

    const fetchUsage = useCallback(async () => {
        const isDemo = typeof window !== 'undefined' && window.location.search.includes('demo=true');
        if (!user && !isDemo) return;
        if ((!token || token === 'null' || token === 'undefined') && !isDemo) {
            if (!isDemo) return;
        }
        
        // If we just want global usage and already have it in user context, skip fetch
        if (!feature && user && !isDemo) {
            setAllUsage({
                tokensUsed: user.tokensUsed,
                monthlyLimit: user.monthlyLimit,
                percentUsed: user.percentUsed,
                plan: user.plan
            });
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (isDemo) headers['x-serify-demo'] = 'true';

            const res = await fetch(`/api/usage${feature ? `?feature=${feature}` : ''}`, {
                headers
            });
            if (res.ok) {
                const data = await res.json();
                if (feature) setUsage(data);
                else setAllUsage(data);
            }
        } catch (err) {
            console.error('Error fetching usage:', err);
        } finally {
            setLoading(false);
        }
    }, [token, user, feature]);

    useEffect(() => {
        fetchUsage();
    }, [fetchUsage]);

    // Update allUsage if user context changes
    useEffect(() => {
        if (!feature && user) {
            setAllUsage({
                tokensUsed: user.tokensUsed,
                monthlyLimit: user.monthlyLimit,
                percentUsed: user.percentUsed,
                plan: user.plan
            });
        }
    }, [user, feature]);

    const increment = useCallback(async (amount: number = 1) => {
        if (!user || !feature) return;
        await incrementUsage(user.id, feature, amount);
        // Refresh both local and global
        await Promise.all([
            fetchUsage(),
            refreshGlobalUsage()
        ]);
    }, [user, feature, fetchUsage, refreshGlobalUsage]);

    return {
        usage,
        allUsage,
        loading,
        isAllowed: usage?.allowed ?? true,
        refresh: fetchUsage,
        increment
    };
}
