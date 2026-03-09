"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export default function MonterraChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi! I'm Flora 🌿 Monterra's plant assistant. Ask me anything about plants — care tips, choosing the right plant, or fixing plant problems!"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
      setHasNewMessage(false);
    }
  }, [messages, open]);

  useEffect(() => {
    const t = setTimeout(() => setHasNewMessage(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // ✅ Sends { message } to match route.ts
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Oops! Something went wrong 🌵 Please try again in a moment." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* ── CHAT WINDOW ── */}
      {open && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[380px] flex flex-col"
          style={{
            height: "520px",
            borderRadius: "1.5rem",
            boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
            background: "#ffffff",
            border: "1px solid #e8f5e9",
            overflow: "hidden",
            animation: "floraOpen 0.3s cubic-bezier(0.34,1.56,0.64,1)"
          }}
        >
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg, #1a5c2a 0%, #2d8a4e 100%)", padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>
                🌿
              </div>
              <div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem", margin: 0, lineHeight: 1.2 }}>Flora</p>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.7rem", margin: 0 }}>Monterra Plant Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Badge */}
          <div style={{ background: "#f0faf3", borderBottom: "1px solid #e8f5e9", padding: "0.3rem 1.25rem", display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
            <Sparkles size={10} color="#2d8a4e" />
            <span style={{ fontSize: "0.65rem", color: "#2d8a4e", fontWeight: 600, letterSpacing: "0.05em" }}>
              POWERED BY GEMINI AI · FREE
            </span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem", scrollbarWidth: "none" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "floraMsg 0.2s ease" }}>
                {msg.role === "assistant" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", marginRight: "0.5rem", flexShrink: 0, alignSelf: "flex-end" }}>
                    🌿
                  </div>
                )}
                <div style={{
                  maxWidth: "78%",
                  padding: "0.65rem 0.9rem",
                  borderRadius: msg.role === "user" ? "1.2rem 1.2rem 0.25rem 1.2rem" : "1.2rem 1.2rem 1.2rem 0.25rem",
                  background: msg.role === "user" ? "linear-gradient(135deg, #1a5c2a, #2d8a4e)" : "#f0faf3",
                  color: msg.role === "user" ? "#fff" : "#1a2e1f",
                  fontSize: "0.82rem",
                  lineHeight: 1.55,
                  border: msg.role === "assistant" ? "1px solid #d4edda" : "none",
                  wordBreak: "break-word"
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>
                  🌿
                </div>
                <div style={{ padding: "0.65rem 1rem", background: "#f0faf3", borderRadius: "1.2rem 1.2rem 1.2rem 0.25rem", border: "1px solid #d4edda", display: "flex", gap: "4px", alignItems: "center" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#2d8a4e", animation: `floraDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions */}
          {messages.length === 1 && (
            <div style={{ padding: "0 1rem 0.5rem", display: "flex", gap: "0.5rem", overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
              {["Best indoor plants?", "How to water succulents?", "Yellow leaves fix?"].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50); }}
                  style={{ whiteSpace: "nowrap", padding: "0.35rem 0.75rem", borderRadius: "2rem", border: "1px solid #c8e6c9", background: "#f0faf3", color: "#1a5c2a", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid #e8f5e9", display: "flex", gap: "0.5rem", alignItems: "center", background: "#fff", flexShrink: 0 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about plants..."
              disabled={loading}
              style={{ flex: 1, border: "1.5px solid #c8e6c9", borderRadius: "2rem", padding: "0.6rem 1rem", fontSize: "0.82rem", outline: "none", background: "#f9fef9", color: "#1a2e1f" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#2d8a4e")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#c8e6c9")}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{ width: 38, height: 38, borderRadius: "50%", background: loading || !input.trim() ? "#e8f5e9" : "linear-gradient(135deg, #1a5c2a, #2d8a4e)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: loading || !input.trim() ? "not-allowed" : "pointer" }}
            >
              {loading
                ? <Loader2 size={16} color="#2d8a4e" style={{ animation: "spin 1s linear infinite" }} />
                : <Send size={15} color={input.trim() ? "#fff" : "#a5d6a7"} />
              }
            </button>
          </div>
        </div>
      )}

      {/* ── FLOATING BUBBLE ── */}
      <button
        onClick={() => { setOpen((v) => !v); setHasNewMessage(false); }}
        style={{ position: "fixed", bottom: "1.25rem", right: "1.25rem", zIndex: 50, width: 58, height: 58, borderRadius: "50%", background: open ? "#e8f5e9" : "linear-gradient(135deg, #1a5c2a 0%, #2d8a4e 100%)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(26,92,42,0.35)", transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
        aria-label="Open plant assistant"
      >
        {open ? <X size={22} color="#1a5c2a" /> : <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>🌿</span>}
        {hasNewMessage && !open && (
          <span style={{ position: "absolute", top: 4, right: 4, width: 12, height: 12, borderRadius: "50%", background: "#ef4444", border: "2px solid #fff", animation: "floraPulse 1.5s ease-in-out infinite" }} />
        )}
      </button>

      {/* ── KEYFRAMES ── */}
      <style>{`
        @keyframes floraOpen  { from { opacity:0; transform:scale(0.85) translateY(20px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes floraMsg   { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes floraDot   { 0%,80%,100% { transform:scale(0.6); opacity:0.4; } 40% { transform:scale(1); opacity:1; } }
        @keyframes floraPulse { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.3); opacity:0.7; } }
        @keyframes spin       { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>
    </>
  );
}
