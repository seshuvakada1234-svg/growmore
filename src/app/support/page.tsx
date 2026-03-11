"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Package, Truck, RefreshCcw, MessageCircle, Leaf } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const QUICK_QUESTIONS = [
  { icon: <Package className="h-4 w-4" />, text: "Where is my order?" },
  { icon: <Truck className="h-4 w-4" />, text: "How long does delivery take?" },
  { icon: <RefreshCcw className="h-4 w-4" />, text: "How do I return an item?" },
  { icon: <MessageCircle className="h-4 w-4" />, text: "My order hasn't arrived yet" },
];

const SYSTEM_PROMPT = `You are a friendly and knowledgeable customer support agent for Monterra, a premium online plant shop based in India. You are warm, helpful, and concise.

You help customers with:
1. **Order tracking & status** - Explain that orders can be tracked via the order confirmation email or by visiting /orders page when logged in. COD orders are "Pending" until delivery. Online paid orders are "Approved" immediately.
2. **Delivery questions** - Standard delivery takes 3-7 business days across India. Free delivery on orders above ₹999. Shipping charge is ₹150 for orders below ₹999. We deliver to all Indian states and UTs.
3. **Returns & refunds** - Monterra offers a 15-day plant health guarantee. If the plant arrives damaged or unhealthy, customers can raise a return request by contacting support with photos. Refunds are processed within 5-7 business days after the return is approved.

General info:
- Store name: Monterra
- Support hours: 9 AM – 6 PM IST, Monday to Saturday
- For urgent issues, customers can WhatsApp us
- We sell indoor plants, outdoor plants, succulents, and air-purifying plants

Keep responses short and friendly. Use bullet points for clarity when listing steps. Always end with "Is there anything else I can help you with? 🌿" if the conversation feels complete.

If asked about something outside your scope, politely say you can help with orders, delivery, and returns, and suggest they email support@monterra.in for other queries.`;

export default function SupportPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi there! 👋 I'm Monterra's support assistant. I can help you with **order tracking**, **delivery questions**, and **returns & refunds**.\n\nWhat can I help you with today? 🌿",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setIsLoading(true);

    try {
      // Groq API — free, fast, llama-3.3-70b model
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
            ...updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          ],
        }),
      });

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that. Please try again.";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I'm having trouble connecting right now. Please try again in a moment. 🌿",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Render markdown-lite: bold, bullet points, line breaks
  const renderMessage = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const rendered = parts.map((part, j) =>
        j % 2 === 1 ? <strong key={j}>{part}</strong> : part
      );
      const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("• ");
      return isBullet ? (
        <li key={i} className="ml-4 list-disc">{rendered.slice(1)}</li>
      ) : (
        <p key={i} className={line.trim() === "" ? "h-2" : ""}>{rendered}</p>
      );
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF7]">
      <Header />

      <main className="flex-grow container mx-auto px-4 max-w-3xl py-8 md:py-12">

        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1B5E20] text-white mb-4">
            <Leaf className="h-7 w-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1A2E1A] font-headline">Plant Support</h1>
          <p className="text-muted-foreground mt-2 text-sm">Ask me about your orders, delivery & returns</p>
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">AI Support · Available 24/7</span>
          </div>
        </div>

        {/* Chat Container */}
        <div
          className="bg-white rounded-3xl shadow-sm border border-[#E8E8E8] overflow-hidden flex flex-col"
          style={{ height: "60vh", minHeight: "420px" }}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white
                  ${msg.role === "assistant" ? "bg-[#1B5E20]" : "bg-[#388E3C]"}`}>
                  {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>

                {/* Bubble */}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-1
                  ${msg.role === "assistant"
                    ? "bg-[#F1F8E9] text-[#1A2E1A] rounded-tl-sm"
                    : "bg-[#1B5E20] text-white rounded-tr-sm"}`}>
                  {renderMessage(msg.content)}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1B5E20] flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-[#F1F8E9] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-[#388E3C] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-[#388E3C] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-[#388E3C] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#F0F0F0] px-4 py-3 bg-white">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your question..."
                disabled={isLoading}
                className="flex-1 resize-none rounded-2xl border border-[#E8E8E8] px-4 py-3 text-sm focus:outline-none focus:border-[#388E3C] bg-[#FAFAF7] placeholder:text-muted-foreground disabled:opacity-50 max-h-32"
                style={{ lineHeight: "1.5" }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 128) + "px";
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="w-11 h-11 rounded-2xl bg-[#1B5E20] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:bg-[#2E7D32] transition-colors"
              >
                {isLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Questions */}
        <div className="mt-5">
          <p className="text-xs text-muted-foreground font-semibold mb-3 text-center">COMMON QUESTIONS</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q.text)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-[#E8E8E8] bg-white text-sm font-medium text-[#1A2E1A] hover:border-[#388E3C] hover:bg-[#F1F8E9] transition-all text-left disabled:opacity-40"
              >
                <span className="text-[#388E3C]">{q.icon}</span>
                {q.text}
              </button>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Need more help? Email us at{" "}
          <a href="mailto:support@monterra.in" className="text-[#388E3C] font-semibold hover:underline">
            support@monterra.in
          </a>
        </p>

      </main>

      <Footer />
    </div>
  );
}