import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { FeatureFlag } from '@/contexts/FeatureFlagContext';

interface VoiceSynthesisProps {
    text: string;
    className?: string;
}

export default function VoiceSynthesis({ text, className = '' }: VoiceSynthesisProps) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        const checkSupport = () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                setIsSupported(true);
            }
        };
        
        checkSupport();
        
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = checkSupport;
        }
    }, []);

    const toggleSpeech = () => {
        if (!isSupported) return;

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        } else {
            const utterance = new SpeechSynthesisUtterance(text);
            
            
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => 
                v.name.includes('Google') || v.name.includes('Natural') || v.lang === 'en-US'
            );
            
            if (preferredVoice) utterance.voice = preferredVoice;
            utterance.rate = 0.9; 
            utterance.pitch = 1.0;

            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);

            setIsSpeaking(true);
            window.speechSynthesis.speak(utterance);
        }
    };

    
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    if (!isSupported) return null;

    return (
        <FeatureFlag flag="ai_voice_synthesis">
            <button
                onClick={toggleSpeech}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                    isSpeaking 
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 animate-pulse' 
                        : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-indigo-500 hover:border-indigo-500/30'
                } ${className}`}
                title={isSpeaking ? 'Stop Reading' : 'Read Aloud (Experimental)'}
            >
                {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                {isSpeaking ? 'Stop Reading' : 'Read Aloud'}
            </button>
        </FeatureFlag>
    );
}
