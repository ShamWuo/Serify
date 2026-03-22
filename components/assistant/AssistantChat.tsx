import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Send, User, Sparkles, AlertCircle } from 'lucide-react';
import { useAssistant } from '../../contexts/AssistantContext';
import AssistantSuggestedAction from './AssistantSuggestedAction';

const AssistantChat: React.FC = () => {
    const { messages, sendMessage, proactiveSuggestion, tierWarning } = useAssistant();
    const router = useRouter();
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;
        sendMessage(input);
        setInput('');
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                {proactiveSuggestion && (
                    <div className="bg-[var(--accent)] text-white p-5 rounded-3xl shadow-lg animate-slide-up relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Sparkles size={64} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={16} className="text-orange-300" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-orange-200">Daily Tip</span>
                            </div>
                            <p className="text-sm font-medium leading-relaxed mb-4">{proactiveSuggestion.text}</p>
                            <button 
                                onClick={() => router.push(proactiveSuggestion.action.href)}
                                className="inline-flex items-center gap-2 bg-white text-[var(--accent)] px-4 py-2 rounded-xl text-xs font-bold hover:shadow-lg transition-all"
                            >
                                {proactiveSuggestion.action.label} →
                            </button>
                        </div>
                    </div>
                )}

                {messages.length === 0 && !proactiveSuggestion && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-[var(--muted)] mb-4 border border-[var(--border)]">
                            <Sparkles size={24} />
                        </div>
                        <h4 className="text-sm font-bold text-[var(--text)] mb-1">How can I help you today?</h4>
                        <p className="text-xs text-[var(--muted)] max-w-[200px]">Ask me anything about your concepts or materials.</p>
                    </div>
                )}
                
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-chat-in`}>
                        <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                                msg.role === 'user' ? 'bg-gray-100 text-gray-600' : 'bg-[var(--accent)] text-white'
                            }`}>
                                {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                            </div>
                            <div className={`p-4 rounded-2xl text-[13.5px] leading-relaxed shadow-sm ${
                                msg.role === 'user' 
                                    ? 'bg-gray-50 text-[var(--text)] rounded-tr-none border border-gray-100' 
                                    : 'bg-[var(--bg)] text-[var(--text)] rounded-tl-none border border-[var(--border)]'
                            }`}>
                                {msg.content}
                                {msg.suggestions && msg.suggestions.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {msg.suggestions.map((s: string, i: number) => (
                                            <AssistantSuggestedAction 
                                                key={i} 
                                                label={s} 
                                                onClick={() => sendMessage(s)} 
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-gray-50/50 border-t border-[var(--border)]">
                {tierWarning && (
                    <div className="flex items-center gap-2 px-3 py-1.5 mb-2 bg-[#FFF9F2] border border-orange-100 rounded-lg animate-fade-in">
                        <AlertCircle size={14} className="text-orange-500" />
                        <span className="text-[10px] font-bold text-orange-700">This request will use {tierWarning} tokens.</span>
                    </div>
                )}
                <div className="relative flex items-center bg-white rounded-xl border border-[var(--border)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/10 transition-all p-1">
                    <input 
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-2 px-3"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="p-2 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-30 disabled:grayscale transition-all"
                    >
                        <Send size={16} />
                    </button>
                </div>
                <p className="text-[10px] text-[var(--muted)]/50 text-center mt-3">Serify Assistant can make mistakes. Verify important info.</p>
            </div>
        </div>
    );
};

export default AssistantChat;
