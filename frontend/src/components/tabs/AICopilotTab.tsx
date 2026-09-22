import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Sparkles,
  FileText,
  Compass,
  Zap,
  MessageSquare,
} from "lucide-react";
import { AICitation, AIQueryResponse, SimulationState } from "../../types";
import { api } from "../../services/api";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  citations?: AICitation[];
  provider?: string;
}

interface AICopilotTabProps {
  simulation: SimulationState | null;
  activeWellId?: string;
  formation?: string;
}

const SAMPLE_PROMPTS = [
  "What offset drilling hazards exist around 3,100m – 3,250m in Tipam formation?",
  "What mud weight and LCM pill program was successfully used on well OIL-X104?",
  "What caused the stuck pipe incident on OIL-X106 at 3,260m and how was it resolved?",
  "Compare mud weights used by offset wells in Tipam vs Barail formations.",
];

export const AICopilotTab: React.FC<AICopilotTabProps> = ({
  simulation,
  activeWellId = "OIL-X123",
  formation = "Tipam",
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: `Hello, Drilling Engineer. I am the eRTMAC-NWIS AI Copilot for Oil India Limited operations. I have synthesized historical knowledge from 50 offset wells, 16 End of Well Reports, and 178 drilling events in the Assam Basin.\n\nCurrently monitoring **${activeWellId}** at **${
        simulation ? simulation.current_depth.toFixed(1) : "3,050.0"
      }m** in **${formation}** formation. How can I assist your drilling decisions today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || inputQuery).trim();
    if (!q || isQuerying) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsQuerying(true);

    try {
      const depth = simulation ? simulation.current_depth : 3050.0;
      const res: AIQueryResponse = await api.queryAI(q, activeWellId, depth, formation);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: res.answer,
        citations: res.citations,
        provider: res.provider,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: "Error connecting to AI intelligence service. Please check your backend connection.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, height: "calc(100vh - 220px)" }}>

      {/* Chat Window */}
      <div
        className="glass-card"
        style={{ display: "flex", flexDirection: "column", height: "100%", padding: 0, overflow: "hidden" }}
      >
        {/* Chat Header — Canopy band */}
        <div
          style={{
            padding: "14px 20px",
            background: "var(--color-canopy)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-mint-pulse)",
              }}
            >
              <Bot size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "white" }}>
                OIL Drilling Intelligence Assistant
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>
                {activeWellId} · {simulation?.current_depth.toFixed(1)}m · {formation}
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: 9999,
              background: "var(--color-mint-pulse)",
              color: "var(--color-bark)",
            }}
          >
            RAG Engine Ready
          </span>
        </div>

        {/* Message Thread */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            background: "#faf9f6",
          }}
        >
          {messages.map((m) => {
            const isUser = m.sender === "user";
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isUser ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "12px 16px",
                    borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: isUser ? "var(--color-canopy)" : "var(--color-sheet-white)",
                    border: isUser ? "none" : "1px solid var(--color-sage-mist)",
                    color: isUser ? "white" : "var(--color-bark)",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>

                  {/* Citations */}
                  {m.citations && m.citations.length > 0 && (
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: "1px solid var(--color-sage-mist)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-canopy)", display: "flex", alignItems: "center", gap: 5 }}>
                        <FileText size={11} />
                        Ground Truth Evidence ({m.citations.length} Sources)
                      </div>
                      {m.citations.map((c, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 6,
                            background: "rgba(16,67,54,0.06)",
                            borderLeft: "2px solid var(--color-canopy)",
                            fontSize: 11,
                          }}
                        >
                          <div style={{ fontWeight: 600, color: "var(--color-bark)", marginBottom: 2 }}>
                            {c.source_doc} · Well: {c.well_id} ({c.depth_range})
                          </div>
                          <div style={{ color: "var(--color-slate)", fontStyle: "italic" }}>
                            "{c.text_snippet}"
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 10, color: "var(--color-muted-slate)", marginTop: 4, paddingInline: 4 }}>
                  {m.timestamp}{m.provider ? ` · via ${m.provider}` : ""}
                </div>
              </div>
            );
          })}

          {isQuerying && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-muted-slate)", fontSize: 12 }}>
              <Sparkles size={15} style={{ animation: "spin 1.5s linear infinite" }} color="var(--color-canopy)" />
              Synthesizing offset well knowledge and institutional reports…
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--color-sage-mist)",
            display: "flex",
            gap: 10,
            background: "var(--color-sheet-white)",
          }}
        >
          <input
            type="text"
            className="input-control"
            style={{ flex: 1, borderRadius: 8 }}
            placeholder={`Ask about risks at ${simulation?.current_depth.toFixed(0) ?? "3050"}m, offset mitigations…`}
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            className="btn-primary"
            onClick={() => handleSend()}
            disabled={isQuerying || !inputQuery.trim()}
            style={{ gap: 6, padding: "8px 16px" }}
          >
            <Send size={14} />
            Ask
          </button>
        </div>
      </div>

      {/* Right: Prompts + Context */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Suggested Prompts */}
        <div className="glass-card">
          <div className="card-title" style={{ marginBottom: 14 }}>
            <Sparkles size={15} color="var(--color-orb-violet)" />
            Recommended Prompts
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SAMPLE_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--color-sage-mist)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  textAlign: "left",
                  fontSize: 12,
                  color: "var(--color-slate)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  lineHeight: 1.5,
                  fontFamily: "var(--font-sans)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-canopy)";
                  e.currentTarget.style.color = "var(--color-bark)";
                  e.currentTarget.style.background = "rgba(16,67,54,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-sage-mist)";
                  e.currentTarget.style.color = "var(--color-slate)";
                  e.currentTarget.style.background = "var(--bg-elevated)";
                }}
              >
                <MessageSquare size={11} style={{ display: "inline", marginRight: 6, verticalAlign: "middle", opacity: 0.5 }} />
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Context Card */}
        <div className="glass-card">
          <div className="card-title" style={{ marginBottom: 14 }}>
            <Compass size={15} color="var(--color-canopy)" />
            Drilling Context Passed to AI
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
            {[
              { label: "Active Well",      val: activeWellId, color: "var(--color-canopy)" },
              { label: "Current Depth",    val: `${simulation?.current_depth.toFixed(1) ?? "3,050.0"} m`, color: "var(--color-canopy)" },
              { label: "Formation",        val: formation, color: "var(--color-canopy)" },
              { label: "Search Radius",    val: "20.0 km", color: "var(--color-bark)" },
              { label: "Analogue Wells",   val: "OIL-X104, OIL-X101, OIL-X106", color: "var(--color-bark)" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-sage-mist)", paddingBottom: 8 }}>
                <span style={{ color: "var(--color-muted-slate)", fontSize: 12 }}>{row.label}</span>
                <strong style={{ fontSize: 12, color: row.color }}>{row.val}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
