import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FeatureName, UsageCheckResult, incrementUsage } from '@/lib/usage';

export function useUsage(feature?: FeatureName) {
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [usage, setUsage] = useState<UsageCheckResult | null>(null);
    const [allUsage, setAllUsage] = useState<any>(null);

    const fetchUsage = useCallback(async () => {
        if (!token || !user) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/usage${feature ? `?feature=${feature}` : ''}`, {
                headers: { Authorization: `Bearer ${token}` }
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

    const increment = useCallback(async (amount: number = 1) => {
        if (!user || !feature) return;
        await incrementUsage(user.id, feature, amount);
        await fetchUsage();
    }, [user, feature, fetchUsage]);

    return {
        usage,
        allUsage,
        loading,
        isAllowed: usage?.allowed ?? true,
        refresh: fetchUsage,
        increment
    };
}
