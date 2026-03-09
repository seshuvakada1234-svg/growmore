'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Leaf, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'bot';
  text: string;
}

const SUGGESTIONS = [
  "Best indoor plants?",
  "How to water succulents?",
  "Yellow leaves fix?",
];

export default function MonterraChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: "Hi! I'm Flora, your Monterra plant expert. How can I help your garden grow today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Notification dot logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) setShowNotification(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Auto-scroll logic
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setShowNotification(false);
  };

  const handleSend = async (text: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    const newMessages = [...messages, { role: 'user', text: messageText }];
    setMessages(newMessages as Message[]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      });

      const data = await response.json();
      setMessages([...newMessages, { role: 'bot', text: data.reply || "I'm having trouble connecting to my plant roots. Please try again!" }] as Message[]);
    } catch (error) {
      setMessages([...newMessages, { role: 'bot', text: "Sorry, I'm offline. My leaves need some water!" }] as Message[]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Bubble */}
      <button
        onClick={toggleChat}
        className={cn(
          "fixed bottom-6 right-6 w-[58px] h-[58px] rounded-full shadow-2xl z-[100] transition-all duration-300 flex items-center justify-center group hover:scale-110 active:scale-95",
          isOpen ? "bg-white text-primary border border-muted" : "bg-gradient-to-tr from-[#1a5c2a] to-[#2d8a4e] text-white"
        )}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageCircle className="w-7 h-7" />
            {showNotification && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-bounce" />
            )}
          </>
        )}
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-24 right-6 w-[calc(100vw-48px)] sm:w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl z-[100] flex flex-col overflow-hidden transition-all duration-500 origin-bottom-right border border-muted",
          isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-10 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a5c2a] to-[#2d8a4e] p-4 text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-none">Flora</h3>
            <p className="text-[10px] text-white/70 font-medium uppercase tracking-widest mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Online Assistant
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f0faf3]/30">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-col max-w-[85%]",
                msg.role === 'user' ? "ml-auto items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "p-3 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-[#2d8a4e] text-white rounded-tr-none" 
                    : "bg-white text-primary shadow-sm border border-muted rounded-tl-none"
                )}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-start max-w-[85%]">
              <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-muted flex gap-1">
                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length < 3 && !isTyping && (
          <div className="px-4 py-2 flex flex-wrap gap-2 bg-[#f0faf3]/30">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                className="text-[11px] font-bold bg-white border border-emerald-100 text-[#2d8a4e] px-3 py-1.5 rounded-full hover:bg-emerald-50 transition-colors shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 bg-white border-t border-muted flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend('')}
            placeholder="Ask Flora anything about plants..."
            className="flex-1 bg-muted/50 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2d8a4e]/20 transition-all"
          />
          <button
            onClick={() => handleSend('')}
            disabled={!input.trim() || isTyping}
            className="bg-[#2d8a4e] text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[#1a5c2a] transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
}
