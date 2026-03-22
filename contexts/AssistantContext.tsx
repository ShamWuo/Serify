import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthContext';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useUsage } from '@/hooks/useUsage';
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics';

export type AssistantRole = 'user' | 'assistant' | 'system';

export interface AssistantMessage {
    id: string;
    role: AssistantRole;
    content: string;
    timestamp: string;
    tier?: 1 | 2 | 3;
    tokens_used?: number;
    launchChip?: {
        label: string;
        type: string;
        payload: any;
    };
    suggestions?: string[];
}

interface AssistantContextType {
    isOpen: boolean;
    isMinimized: boolean;
    messages: AssistantMessage[];
    hasUnreadSuggestion: boolean;
    isLoading: boolean;
    error: Error | undefined;
    tierWarning: number | null;
    proactiveSuggestion: {
        text: string;
        action: { label: string; href: string };
    } | null;
    setIsOpen: (open: boolean) => void;
    setIsMinimized: (minimized: boolean) => void;
    sendMessage: (content: string) => void;
    clearMessages: () => void;
    dismissSuggestion: () => void;
    setTierWarning: (tier: number | null) => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const AssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, token } = useAuth();
    const router = useRouter();
    
    const [isOpen, setOpen] = useState(false);
    const [isMinimized, setMinimized] = useState(false);
    const [hasUnreadSuggestion, setHasUnreadSuggestion] = useState(false);
    const [proactiveSuggestion, setProactiveSuggestion] = useState<{ text: string; action: { label: string; href: string } } | null>(null);
    const [tierWarning, setTierWarning] = useState<number | null>(null);
    const isDemo = router.query.demo === 'true';
    const { refresh: refreshUsage } = useUsage('ai_message_tier1');

    const chat = (useChat as any)({
        api: '/api/home-chat',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(isDemo ? { 'x-serify-demo': 'true' } : {})
        },
        onError: (err: any) => {
            if (err.message?.includes('limit_reached') || err.message?.includes('403')) {
                trackEvent('assistant_limit_reached');
            }
        },
        onFinish: () => {
            refreshUsage();
        }
    });

    const { messages: chatMessages, append, reload, input, setInput, isLoading, setMessages, error } = chat;

    const messages = (chatMessages as any[] || []).map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
        suggestions: m.suggestions 
    })) as AssistantMessage[];

    // Handle Pro+ Persistence
    useEffect(() => {
        if (!user || user.subscriptionTier !== 'pro_plus' || messages.length === 0) return;

        const saveMessages = async () => {
            await supabase.from('assistant_conversations').upsert({
                user_id: user.id,
                messages: messages,
                last_message_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        };

        const timeout = setTimeout(saveMessages, 2000);
        return () => clearTimeout(timeout);
    }, [messages, user]);

    // Load Pro+ persistence
    useEffect(() => {
        if (!user || user.subscriptionTier !== 'pro_plus' || messages.length > 0) return;

        const loadMessages = async () => {
            const { data } = await supabase.from('assistant_conversations')
                .select('messages')
                .eq('user_id', user.id)
                .maybeSingle();

            if (data?.messages && messages.length === 0) {
                setMessages(data.messages);
            }
        };

        loadMessages();
    }, [user, setMessages, messages.length]);

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim()) return;

        try {
            if (append) {
                await append({
                    role: 'user',
                    content: content
                });
            } else {
                console.error('No append function found for assistant chat');
            }
        } catch (err) {
            console.error('Error sending message:', err);
        }
    }, [append, chat]);

    const clearMessages = useCallback(() => {
        // useChat doesn't have a direct clear, but we can potentially reset transport or state
        // This is a bit tricky with useChat, but usually not critical for MVP
    }, []);

    const dismissSuggestion = useCallback(() => {
        setHasUnreadSuggestion(false);
        setProactiveSuggestion(null);
    }, []);

    // Proactive Suggestion Logic
    useEffect(() => {
        if (!user) return;

        const checkSuggestions = async () => {
            // Check for due reviews
            const { data: dueData } = await supabase.from('knowledge_nodes')
                .select('id')
                .eq('user_id', user.id)
                .in('current_mastery', ['shaky', 'revisit'])
                .limit(5);

            if (dueData && dueData.length > 0) {
                setHasUnreadSuggestion(true);
                setProactiveSuggestion({
                    text: `You have ${dueData.length} concepts due for review today (~${dueData.length * 2} min).`,
                    action: { label: 'Start Review', href: '/practice' }
                });
                return;
            }

            // Check for gap sessions > 48h
            const { data: sessionData } = await supabase.from('reflection_sessions')
                .select('id, title, created_at, depth_score')
                .eq('user_id', user.id)
                .lt('depth_score', 70)
                .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: false })
                .limit(1);

            if (sessionData && sessionData.length > 0) {
                setHasUnreadSuggestion(true);
                setProactiveSuggestion({
                    text: `Your last session "${sessionData[0].title}" has unresolved gaps.`,
                    action: { label: 'Fix them now', href: `/session/${sessionData[0].id}` }
                });
            }
        };

        checkSuggestions();
    }, [user]);

    // Handle session analytics
    useEffect(() => {
        if (isOpen) {
            setHasUnreadSuggestion(false);
        }
    }, [isOpen]);

    return (
        <AssistantContext.Provider
            value={{
                isOpen,
                isMinimized,
                messages,
                hasUnreadSuggestion,
                isLoading,
                error: (error as Error),
                tierWarning,
                proactiveSuggestion,
                setIsOpen: setOpen,
                setIsMinimized: setMinimized,
                sendMessage,
                clearMessages,
                dismissSuggestion,
                setTierWarning,
            }}
        >
            {children}
        </AssistantContext.Provider>
    );
};

export const useAssistant = () => {
    const context = useContext(AssistantContext);
    if (context === undefined) {
        throw new Error('useAssistant must be used within an AssistantProvider');
    }
    return context;
};
