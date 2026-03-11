"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Package, Truck, RefreshCcw, MessageCircle } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const QUICK_QUESTIONS = [
  { icon: <Package className="h-3.5 w-3.5" />, text: "Where is my order?" },
  { icon: <Truck className="h-3.5 w-3.5" />, text: "How long does delivery take?" },
  { icon: <RefreshCcw className="h-3.5 w-3.5" />, text: "How do I return an item?" },
  { icon: <MessageCircle className="h-3.5 w-3.5" />, text: "Order hasn't arrived yet" },
];

const SYSTEM_PROMPT = `You are a friendly and knowledgeable customer support agent for Monterra, a premium online plant shop based in India. You are warm, helpful, and concise.

You help customers with:
1. Order tracking & status - Orders tracked via confirmation email or /orders page. COD orders are "Pending" until delivery. Online paid orders are "Approved" immediately.
2. Delivery questions - Standard delivery 3-7 business days across India. Free delivery above ₹999. Shipping ₹150 below ₹999. All Indian states and UTs covered.
3. Returns & refunds - 15-day plant health guarantee. Damaged/unhealthy plant? Raise return with photos. Refunds in 5-7 business days after approval.

General info:
- Store: Monterra
- Support hours: 9 AM – 6 PM IST, Mon–Sat
- Email: support@monterra.in

Keep responses short and friendly. Use bullet points for steps. End with "Is there anything else I can help you with? 🌿" when conversation feels complete. For out-of-scope questions, suggest support@monterra.in.`;

export default function SupportPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "👋 Welcome to Monterra Support. I'm your AI assistant — here to help with order tracking, delivery, and returns.\n\nHow can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1000,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      });

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment. 🌿",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); sendMessage(input); }
  };

  const renderMessage = (content: string) => {
    return content.split("\n").map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const rendered = parts.map((part, j) =>
        j % 2 === 1 ? <strong key={j} className="font-semibold">{part}</strong> : part
      );
      const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("• ") || line.trim().startsWith("* ");
      if (isBullet) return <li key={i} className="ml-3 list-disc text-[13px] leading-relaxed">{rendered.slice(1)}</li>;
      if (line.trim() === "") return <div key={i} className="h-1.5" />;
      return <p key={i} className="text-[13px] leading-relaxed">{rendered}</p>;
    });
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F0F2F5]">
      <Header />

      <main className="flex-grow flex flex-col">
        <div className="flex-grow flex flex-col max-w-2xl w-full mx-auto px-0 sm:px-4 sm:py-6">

          {/* Chat Card */}
          <div className="flex-grow flex flex-col bg-white sm:rounded-2xl sm:shadow-lg overflow-hidden"
            style={{ minHeight: "calc(100vh - 140px)" }}>

            {/* Chat Header */}
            <div className="bg-[#1B5E20] px-4 py-3.5 flex items-center gap-3 flex-shrink-0">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                  🌿
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#1B5E20]" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Support Bot</p>
                <p className="text-emerald-300 text-xs font-medium">Online · Monterra Plant Shop</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#F0F2F5]">

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>

                  {/* Bot avatar */}
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-[#1B5E20] flex items-center justify-center text-xs flex-shrink-0 mb-0.5">
                      🌿
                    </div>
                  )}

                  <div className={`flex flex-col gap-0.5 max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    {/* Sender label */}
                    <span className="text-[10px] text-gray-400 font-medium px-1">
                      {msg.role === "assistant" ? "Support Bot" : "Customer"}
                    </span>

                    {/* Bubble */}
                    <div className={`px-3.5 py-2.5 rounded-2xl space-y-0.5 shadow-sm
                      ${msg.role === "assistant"
                        ? "bg-white text-[#1a1a1a] rounded-tl-sm"
                        : "bg-[#1B5E20] text-white rounded-tr-sm"}`}>
                      <ul className="space-y-0.5">
                        {renderMessage(msg.content)}
                      </ul>
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10px] text-gray-400 px-1">{formatTime()}</span>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#1B5E20] flex items-center justify-center text-xs flex-shrink-0">
                    🌿
                  </div>
                  <div className="flex flex-col gap-0.5 items-start">
                    <span className="text-[10px] text-gray-400 font-medium px-1">Support Bot</span>
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="w-2 h-2 bg-gray-300 rounded-full inline-block"
                          style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick questions — show only at start */}
              {messages.length === 1 && !isLoading && (
                <div className="flex flex-col gap-2 pt-2">
                  <p className="text-[11px] text-gray-400 font-semibold text-center uppercase tracking-wide">Common Questions</p>
                  {QUICK_QUESTIONS.map((q, i) => (
                    <button key={i} onClick={() => sendMessage(q.text)}
                      className="flex items-center gap-2.5 bg-white hover:bg-[#F1F8E9] border border-gray-200 hover:border-[#A5D6A7] text-[#1A2E1A] text-[13px] font-medium px-4 py-3 rounded-2xl text-left transition-all shadow-sm active:scale-95">
                      <span className="text-[#2E7D32]">{q.icon}</span>
                      {q.text}
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input Bar */}
            <div className="bg-white border-t border-gray-100 px-3 py-3 flex items-center gap-2 flex-shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your question..."
                disabled={isLoading}
                className="flex-1 bg-[#F0F2F5] rounded-full px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-gray-400 outline-none border-none disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-full bg-[#1B5E20] flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:bg-[#2E7D32] active:scale-95 transition-all"
              >
                {isLoading
                  ? <Loader2 className="h-4 w-4 text-white animate-spin" />
                  : <Send className="h-4 w-4 text-white" />}
              </button>
            </div>

          </div>
        </div>
      </main>

      <Footer />

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}