import React, { useState, useRef, useEffect } from 'react';
import { AirQualityData, HouseholdPreferences } from '@shared/types';
import { api } from '../services/api';
import { Bot, Send, Sparkles, User, AlertCircle, Loader2 } from 'lucide-react';

interface AssistantPageProps {
  airQuality: AirQualityData | null;
  preferences: HouseholdPreferences | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  modelUsed?: string;
}

const PROMPT_SUGGESTIONS = [
  'Is it suitable to go outside for a run today?',
  'How should I plan my morning commute with current smog?',
  'How can I improve my indoor air quality?',
  'What should my family do during severe winter smog?',
  'Which low-emission commute alternatives are practical today?',
  'Are houseplants effective for removing PM2.5?'
];

export const AssistantPage: React.FC<AssistantPageProps> = ({ airQuality, preferences }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am **AirWise AI**, your intelligent environmental health assistant.\n\nI am connected to verified atmospheric data for **${airQuality?.location.name || 'your area'}** (Current status: **${airQuality?.categoryLabel || 'Live Monitoring'}**). How can I help protect your health or reduce your environmental footprint today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'Grounded Assistant'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await api.sendChatMessage({
        message: query,
        location: airQuality?.location,
        preferences: preferences || undefined
      });

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: res.usedModel
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'I encountered an issue connecting to the inference server. Please check your network connection or try again in a moment.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'System Notice'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 py-4 max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)] min-h-[550px]">
      {/* Header Context Banner */}
      <div className="bg-navy-800/90 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span>AirWise AI Conversational Assistant</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/30">
                Grounded GenAI
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Active Context: {airQuality?.location.name || 'Global'} • AQI: {airQuality?.aqi ?? 'N/A'} ({airQuality?.categoryLabel ?? 'Unspecified'})
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 self-start sm:self-center">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Evidence-aware guidance. Not clinical medical advice.</span>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div
        className="flex-1 bg-navy-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 overflow-y-auto space-y-4 shadow-inner"
        role="log"
        aria-live="polite"
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-teal-600 text-white font-medium rounded-tr-sm shadow-md'
                  : 'bg-navy-800 border border-slate-700/80 text-slate-100 rounded-tl-sm shadow-md'
              }`}
            >
              <div className="whitespace-pre-line">{msg.text}</div>
              <div
                className={`mt-2 flex items-center justify-between text-[10px] ${
                  msg.sender === 'user' ? 'text-teal-200' : 'text-slate-400'
                }`}
              >
                <span>{msg.timestamp}</span>
                {msg.modelUsed && (
                  <span className="font-semibold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-black/20">
                    {msg.modelUsed}
                  </span>
                )}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-700 text-slate-200 flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-navy-800 border border-slate-700/80 rounded-2xl p-4 text-xs text-slate-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
              <span>Synthesizing grounded environmental recommendation...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Pills */}
      <div className="shrink-0 overflow-x-auto pb-1 flex gap-2">
        {PROMPT_SUGGESTIONS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={loading}
            className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-medium text-slate-300 hover:text-teal-300 transition-colors shrink-0 disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3 inline mr-1 text-teal-400" />
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <div className="shrink-0">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative"
        >
          <input
            type="text"
            aria-label="Ask assistant a question about air quality or health"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask anything about air quality, masks, purifiers, commuting, or health..."
            disabled={loading}
            className="w-full pl-4 pr-14 py-3.5 rounded-xl bg-navy-800 border border-slate-700 text-sm text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none shadow-lg disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-40 transition-colors focus:outline-none"
            aria-label="Send message to assistant"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

