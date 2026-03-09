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

  /* Scroll + focus */
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
      setHasNewMessage(false);
    }
  }, [messages, open]);

  /* Notification dot */
  useEffect(() => {
    const timer = setTimeout(() => setHasNewMessage(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  /* Send message */
  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = { role: "user", text: trimmed };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: trimmed })
      });

      if (!res.ok) {
        throw new Error("API request failed");
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reply || "I'm having trouble responding right now 🌿"
        }
      ]);

    } catch (error) {

      console.error("Chat error:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Oops! Something went wrong 🌵 Please try again in a moment."
        }
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
      {/* CHAT WINDOW */}
      {open && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[380px] flex flex-col"
          style={{
            height: "520px",
            borderRadius: "1.5rem",
            boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
            background: "#ffffff",
            border: "1px solid #e8f5e9",
            overflow: "hidden"
          }}
        >

          {/* HEADER */}
          <div
            style={{
              background: "linear-gradient(135deg,#1a5c2a,#2d8a4e)",
              padding: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                🌿
              </div>

              <div>
                <p style={{ color: "#fff", fontWeight: 700, margin: 0 }}>
                  Flora
                </p>
                <p style={{ color: "#d7ffd9", fontSize: "12px", margin: 0 }}>
                  Monterra Plant Assistant
                </p>
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: "50%",
                width: 30,
                height: 30,
                color: "#fff",
                cursor: "pointer"
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* GEMINI BADGE */}
          <div
            style={{
              background: "#f0faf3",
              padding: "4px 16px",
              borderBottom: "1px solid #e8f5e9",
              display: "flex",
              alignItems: "center",
              gap: 5
            }}
          >
            <Sparkles size={10} color="#2d8a4e" />
            <span style={{ fontSize: 11, color: "#2d8a4e", fontWeight: 600 }}>
              POWERED BY GEMINI AI · FREE
            </span>
          </div>

          {/* MESSAGES */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start"
                }}
              >
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "10px 14px",
                    borderRadius:
                      msg.role === "user"
                        ? "16px 16px 4px 16px"
                        : "16px 16px 16px 4px",
                    background:
                      msg.role === "user"
                        ? "#1a5c2a"
                        : "#f0faf3",
                    color: msg.role === "user" ? "#fff" : "#1a2e1f",
                    fontSize: 13,
                    lineHeight: 1.5
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={16} className="animate-spin" />
                <span style={{ fontSize: 12 }}>Flora is thinking...</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* QUICK SUGGESTIONS */}
          {messages.length === 1 && (
            <div style={{ padding: "0 16px 10px", display: "flex", gap: 6 }}>
              {[
                "Best indoor plants?",
                "How to water succulents?",
                "Why are leaves yellow?"
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 20,
                    border: "1px solid #c8e6c9",
                    background: "#f0faf3",
                    fontSize: 11,
                    cursor: "pointer"
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* INPUT */}
          <div
            style={{
              borderTop: "1px solid #e8f5e9",
              padding: 10,
              display: "flex",
              gap: 8
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about plants..."
              disabled={loading}
              style={{
                flex: 1,
                borderRadius: 20,
                border: "1px solid #c8e6c9",
                padding: "8px 12px",
                fontSize: 13
              }}
            />

            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#1a5c2a",
                border: "none",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >
              <Send size={15} />
            </button>
          </div>

        </div>
      )}

      {/* FLOATING BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 58,
          height: 58,
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg,#1a5c2a,#2d8a4e)",
          color: "#fff",
          fontSize: 22,
          cursor: "pointer",
          zIndex: 50,
          boxShadow: "0 10px 25px rgba(0,0,0,0.25)"
        }}
      >
        {open ? <X size={22}/> : "🌿"}

        {hasNewMessage && !open && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "red",
              border: "2px solid white"
            }}
          />
        )}
      </button>
    </>
  );
}