import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SparkBalance } from '@/types/sparks';
import { useRouter } from 'next/router';
import { DEMO_USER_ID } from '@/lib/sparks';

export function useSparks() {
    const { user } = useAuth();
    const [balance, setBalance] = useState<SparkBalance | null>(null);
    const [loading, setLoading] = useState(true);

    const router = useRouter();
    const { demo } = router.query;
    const isDemo = demo === 'true';

    useEffect(() => {
        if (!user?.id) {
            if (isDemo) {
                setBalance({
                    user_id: DEMO_USER_ID,
                    trial_sparks: 100,
                    topup_sparks: 0,
                    subscription_sparks: 0,
                    total_sparks: 100,
                    updated_at: new Date().toISOString()
                });
            } else {
                setBalance(null);
            }
            setLoading(false);
            return;
        }

        const fetchBalance = async () => {
            const { data, error } = await supabase
                .from('spark_balances')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (!error && data) {
                setBalance(data as SparkBalance);
            }
            setLoading(false);
        };

        fetchBalance();

        const subscription = supabase
            .channel(`public:spark_balances:user_id=eq.${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'spark_balances', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    setBalance(payload.new as SparkBalance);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user?.id]);

    return { balance, loading };
}
