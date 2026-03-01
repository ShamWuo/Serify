import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface SessionMaterialsSummary {
    flashcards: {
        exists: boolean;
        cardCount?: number;
        generatedAt?: string;
        progress?: any;
        generationCount?: number;
    };
    practiceQuiz: {
        exists: boolean;
        questionCount?: number;
        generatedAt?: string;
        attempts?: any;
        generationCount?: number;
    };
    deepDive: {
        exists: boolean;
        conceptName?: string;
        generatedAt?: string;
        readAt?: string;
        generationCount?: number;
    };
    conceptExplanations: { exists: boolean; count: number; conceptIds: string[] };
    tutorConversation: { exists: boolean; messageCount?: number; lastMessageAt?: string };
    feynman: { exists: boolean; attemptCount: number; latestAssessment?: any };
}

const emptyMaterials: SessionMaterialsSummary = {
    flashcards: { exists: false },
    practiceQuiz: { exists: false },
    deepDive: { exists: false },
    conceptExplanations: { exists: false, count: 0, conceptIds: [] },
    tutorConversation: { exists: false },
    feynman: { exists: false, attemptCount: 0 }
};

export function useSessionMaterials(sessionId: string | null) {
    const [materials, setMaterials] = useState<SessionMaterialsSummary>(emptyMaterials);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchMaterials = useCallback(async () => {
        if (!sessionId || sessionId === 'undefined') {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const {
                data: { session }
            } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const response = await fetch(`/api/sessions/${sessionId}/materials`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.error || response.statusText;
                setError(new Error(`Failed to fetch materials: ${errorMsg}`));
                return;
            }

            const data = await response.json();
            setMaterials(data);
        } catch (err: any) {
            setError(err);
            console.error('Error fetching materials summary:', err);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchMaterials();
    }, [fetchMaterials]);

    return { materials, isLoading, error, refetch: fetchMaterials };
}
