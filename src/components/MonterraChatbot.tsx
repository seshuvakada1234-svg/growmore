"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, ImagePlus, Brain, Leaf, Bug } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  text: string;
  image?: string;
}

interface Preferences {
  [key: string]: string;
}

const SUGGESTED_BUTTONS = [
  { label: "🌿 Best indoor plants", message: "What are the best indoor plants for beginners?" },
  { label: "🌑 Low light plants", message: "Suggest plants that grow well in low light" },
  { label: "🐾 Pet-safe plants", message: "Which plants are safe for pets?" },
  { label: "💛 Yellow leaves fix", message: "My plant has yellow leaves, what should I do?" },
  { label: "💧 Watering tips", message: "How often should I water my indoor plants?" },
  { label: "🛒 Buy plants", message: "Show me plants I can buy from Monterra" },
];

export default function MonterraChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi! I'm Flora 🌿 Ask me about plants, upload a photo to identify it, or detect diseases!"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({});
  const [showMemory, setShowMemory] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<"identify" | "disease" | "auto">("auto");
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setSelectedImage(base64);
    setShowImageOptions(false);
    e.target.value = "";
  };

  const sendMessage = async (overrideText?: string) => {
    const trimmed = overrideText || input.trim();
    if ((!trimmed && !selectedImage) || loading) return;

    const userText = trimmed || (imageMode === "identify" ? "What plant is this?" : "What is wrong with my plant?");
    const userMsg: Message = { role: "user", text: userText, image: selectedImage || undefined };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: messages,
          preferences,
          imageBase64: imageToSend,
          mode: imageToSend ? imageMode : undefined
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.extractedPreferences && Object.keys(data.extractedPreferences).length > 0) {
        setPreferences((prev) => ({ ...prev, ...data.extractedPreferences }));
      }

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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const renderText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part) ? (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          style={{ color: "#2d8a4e", fontWeight: 700, textDecoration: "underline", wordBreak: "break-all" }}>
          {part}
        </a>
      ) : <span key={i}>{part}</span>
    );
  };

  const memoryKeys = Object.keys(preferences);

  // ── Responsive sizes ──
  const chatWidth  = isMobile ? "calc(100vw - 1.5rem)" : "390px";
  const chatHeight = isMobile ? "75vh" : "580px";
  const chatRight  = isMobile ? "0.75rem" : "1.25rem";
  const fontSize   = isMobile ? "0.78rem" : "0.82rem";
  const headerPad  = isMobile ? "0.75rem 1rem" : "1rem 1.25rem";

  // ✅ Bubble: 32px on mobile, 58px on desktop
  const bubbleSize = isMobile ? 32 : 58;

  // ✅ On mobile: sit above bottom nav bar (bottom nav ~56px + gap)
  // On desktop: keep at 1rem from bottom
  const bubbleBottom = isMobile ? "4.5rem" : "1rem";

  // ✅ Chat window bottom: just above the bubble
  const chatBottom = isMobile ? `calc(4.5rem + ${bubbleSize}px + 0.5rem)` : "5.5rem";

  return (
    <>
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: chatBottom,
            right: chatRight,
            zIndex: 50,
            width: chatWidth,
            height: chatHeight,
            maxHeight: "85vh",
            borderRadius: "1.25rem",
            boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
            background: "#fff",
            border: "1px solid #e8f5e9",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            animation: "floraOpen 0.3s cubic-bezier(0.34,1.56,0.64,1)"
          }}
        >
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg, #1a5c2a 0%, #2d8a4e 100%)", padding: headerPad, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{ width: isMobile ? 34 : 40, height: isMobile ? 34 : 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? "1rem" : "1.25rem" }}>🌿</div>
              <div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: isMobile ? "0.85rem" : "0.95rem", margin: 0, lineHeight: 1.2 }}>Flora</p>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.65rem", margin: 0 }}>Monterra Plant Assistant</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button onClick={() => setShowMemory((v) => !v)} title="Memory"
                style={{ background: memoryKeys.length > 0 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", position: "relative" }}>
                <Brain size={13} />
                {memoryKeys.length > 0 && <span style={{ position: "absolute", top: 3, right: 3, width: 7, height: 7, borderRadius: "50%", background: "#4ade80", border: "1.5px solid #1a5c2a" }} />}
              </button>
              <button onClick={() => setOpen(false)}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Memory Panel */}
          {showMemory && (
            <div style={{ background: "#f0faf3", borderBottom: "1px solid #c8e6c9", padding: "0.6rem 1rem", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#1a5c2a", textTransform: "uppercase", letterSpacing: "0.05em" }}>🧠 Flora remembers</span>
                {memoryKeys.length > 0 && (
                  <button onClick={() => setPreferences({})} style={{ fontSize: "0.6rem", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Clear</button>
                )}
              </div>
              {memoryKeys.length === 0
                ? <p style={{ fontSize: "0.68rem", color: "#6b7280", margin: 0 }}>Nothing yet. Tell Flora your light, experience, or pets!</p>
                : <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                    {memoryKeys.map((k) => (
                      <span key={k} style={{ padding: "0.15rem 0.5rem", background: "#d4edda", borderRadius: "2rem", fontSize: "0.65rem", color: "#1a5c2a", fontWeight: 600 }}>{k}: {preferences[k]}</span>
                    ))}
                  </div>
              }
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "0.75rem" : "1rem", display: "flex", flexDirection: "column", gap: "0.6rem", scrollbarWidth: "none" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "floraMsg 0.2s ease" }}>
                {msg.role === "assistant" && (
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", marginRight: "0.4rem", flexShrink: 0, alignSelf: "flex-end" }}>🌿</div>
                )}
                <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  {msg.image && (
                    <div style={{ borderRadius: "0.75rem", overflow: "hidden", width: isMobile ? 90 : 120, height: isMobile ? 90 : 120, border: "2px solid #c8e6c9" }}>
                      <img src={msg.image} alt="plant" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <div style={{
                    padding: isMobile ? "0.5rem 0.75rem" : "0.65rem 0.9rem",
                    borderRadius: msg.role === "user" ? "1rem 1rem 0.2rem 1rem" : "1rem 1rem 1rem 0.2rem",
                    background: msg.role === "user" ? "linear-gradient(135deg, #1a5c2a, #2d8a4e)" : "#f0faf3",
                    color: msg.role === "user" ? "#fff" : "#1a2e1f",
                    fontSize, lineHeight: 1.55,
                    border: msg.role === "assistant" ? "1px solid #d4edda" : "none",
                    wordBreak: "break-word", whiteSpace: "pre-wrap"
                  }}>
                    {msg.role === "assistant" ? renderText(msg.text) : msg.text}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}>🌿</div>
                <div style={{ padding: "0.5rem 0.85rem", background: "#f0faf3", borderRadius: "1rem 1rem 1rem 0.2rem", border: "1px solid #d4edda", display: "flex", alignItems: "center", gap: "6px" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#2d8a4e", animation: `floraDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                  <span style={{ fontSize: "0.65rem", color: "#2d8a4e", fontWeight: 600 }}>Flora is thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested buttons */}
          {messages.length === 1 && (
            <div style={{ padding: `0 ${isMobile ? "0.75rem" : "1rem"} 0.4rem`, display: "flex", gap: "0.35rem", overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
              {SUGGESTED_BUTTONS.map((btn) => (
                <button key={btn.label} onClick={() => sendMessage(btn.message)}
                  style={{ whiteSpace: "nowrap", padding: "0.3rem 0.6rem", borderRadius: "2rem", border: "1px solid #c8e6c9", background: "#f0faf3", color: "#1a5c2a", fontSize: isMobile ? "0.65rem" : "0.7rem", fontWeight: 600, cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#c8e6c9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#f0faf3")}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}

          {/* Image preview + mode */}
          {selectedImage && (
            <div style={{ padding: `0 ${isMobile ? "0.75rem" : "1rem"} 0.4rem`, flexShrink: 0, display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{ position: "relative" }}>
                <img src={selectedImage} alt="selected" style={{ width: 46, height: 46, objectFit: "cover", borderRadius: "0.6rem", border: "2px solid #c8e6c9" }} />
                <button onClick={() => setSelectedImage(null)}
                  style={{ position: "absolute", top: -5, right: -5, width: 15, height: 15, borderRadius: "50%", background: "#ef4444", border: "none", color: "#fff", fontSize: "0.5rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>✕</button>
              </div>
              <div style={{ display: "flex", gap: "0.35rem" }}>
                {[
                  { mode: "identify" as const, icon: <Leaf size={10} />, label: "Identify" },
                  { mode: "disease" as const, icon: <Bug size={10} />, label: "Disease" },
                ].map((opt) => (
                  <button key={opt.mode} onClick={() => setImageMode(opt.mode)}
                    style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.2rem 0.5rem", borderRadius: "2rem", border: `1.5px solid ${imageMode === opt.mode ? "#1a5c2a" : "#c8e6c9"}`, background: imageMode === opt.mode ? "#1a5c2a" : "#f0faf3", color: imageMode === opt.mode ? "#fff" : "#1a5c2a", fontSize: "0.65rem", fontWeight: 600, cursor: "pointer" }}>
                    {opt.icon}{opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Image upload options */}
          {showImageOptions && (
            <div style={{ margin: `0 ${isMobile ? "0.75rem" : "1rem"} 0.4rem`, background: "#f0faf3", borderRadius: "0.85rem", border: "1px solid #c8e6c9", padding: "0.6rem", flexShrink: 0 }}>
              <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "#1a5c2a", margin: "0 0 0.4rem" }}>📸 Upload photo for:</p>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {[
                  { mode: "identify" as const, icon: "🌱", label: "Identify plant" },
                  { mode: "disease" as const, icon: "🦠", label: "Detect disease" },
                ].map((opt) => (
                  <button key={opt.mode}
                    onClick={() => { setImageMode(opt.mode); fileInputRef.current?.click(); }}
                    style={{ flex: 1, padding: "0.4rem", borderRadius: "0.65rem", border: "1.5px solid #c8e6c9", background: "#fff", color: "#1a5c2a", fontSize: "0.68rem", fontWeight: 600, cursor: "pointer", textAlign: "center" }}>
                    {opt.icon}<br />{opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input bar */}
          <div style={{ padding: isMobile ? "0.6rem 0.75rem" : "0.75rem 1rem", borderTop: "1px solid #e8f5e9", display: "flex", gap: "0.4rem", alignItems: "center", background: "#fff", flexShrink: 0 }}>
            <button
              onClick={() => setShowImageOptions((v) => !v)}
              style={{ width: 33, height: 33, borderRadius: "50%", background: showImageOptions ? "#1a5c2a" : "#f0faf3", border: "1.5px solid #c8e6c9", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }}>
              <ImagePlus size={14} color={showImageOptions ? "#fff" : "#2d8a4e"} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedImage ? "Describe..." : "Ask Flora anything..."}
              disabled={loading}
              style={{ flex: 1, border: "1.5px solid #c8e6c9", borderRadius: "2rem", padding: isMobile ? "0.5rem 0.85rem" : "0.6rem 1rem", fontSize, outline: "none", background: "#f9fef9", color: "#1a2e1f", minWidth: 0 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#2d8a4e")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#c8e6c9")}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || (!input.trim() && !selectedImage)}
              style={{ width: 34, height: 34, borderRadius: "50%", background: loading || (!input.trim() && !selectedImage) ? "#e8f5e9" : "linear-gradient(135deg, #1a5c2a, #2d8a4e)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: loading || (!input.trim() && !selectedImage) ? "not-allowed" : "pointer", flexShrink: 0 }}>
              {loading
                ? <Loader2 size={14} color="#2d8a4e" style={{ animation: "spin 1s linear infinite" }} />
                : <Send size={13} color={input.trim() || selectedImage ? "#fff" : "#a5d6a7"} />
              }
            </button>
          </div>
        </div>
      )}

      {/* ✅ Floating Bubble — 32px on mobile, sits above bottom nav */}
      <button
        onClick={() => { setOpen((v) => !v); setHasNewMessage(false); }}
        style={{
          position: "fixed",
          bottom: bubbleBottom,   // ✅ 4.5rem on mobile (above nav), 1rem on desktop
          right: "1rem",
          zIndex: 50,
          width: bubbleSize,       // ✅ 32px mobile, 58px desktop
          height: bubbleSize,
          borderRadius: "50%",
          background: open ? "#e8f5e9" : "linear-gradient(135deg, #1a5c2a 0%, #2d8a4e 100%)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 32px rgba(26,92,42,0.35)",
          transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)"
        }}
        aria-label="Open Flora"
      >
        {open
          ? <X size={isMobile ? 12 : 22} color="#1a5c2a" />
          : <span style={{ fontSize: isMobile ? "0.85rem" : "1.5rem", lineHeight: 1 }}>🌿</span>
        }
        {hasNewMessage && !open && (
          <span style={{
            position: "absolute",
            top: 2, right: 2,
            width: isMobile ? 7 : 10,
            height: isMobile ? 7 : 10,
            borderRadius: "50%",
            background: "#ef4444",
            border: "2px solid #fff",
            animation: "floraPulse 1.5s ease-in-out infinite"
          }} />
        )}
      </button>

      <style>{`
        @keyframes floraOpen  { from{opacity:0;transform:scale(0.88) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes floraMsg   { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
        @keyframes floraDot   { 0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1} }
        @keyframes floraPulse { 0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:0.7} }
        @keyframes spin       { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
      `}</style>
    </>
  );
}