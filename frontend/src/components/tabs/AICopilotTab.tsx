import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Sparkles,
  FileText,
  Compass,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
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
      text: `Hello, Drilling Engineer. I am the eRTMAC-NWIS AI Copilot for Oil India Limited operations. I have synthesized historical knowledge from 50 offset wells, 16 End of Well Reports (EOWR), and 178 drilling events in the Assam Basin.\n\nCurrently monitoring **${activeWellId}** at **${
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
    } catch (err: any) {
      console.error("AI query failed", err);
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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, height: "calc(100vh - 180px)" }}>
      {/* Left Chat Window */}
      <div className="glass-card" style={{ display: "flex", flexDirection: "column", height: "100%", padding: 0, overflow: "hidden" }}>
        {/* Chat Header */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(11, 17, 32, 0.5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-sm)",
                background: "linear-gradient(135deg, #0284c7, #38bdf8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <Bot size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>OIL Drilling Intelligence Assistant</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Active Rig Context: {activeWellId} • Depth: {simulation?.current_depth.toFixed(1)}m • {formation}
              </div>
            </div>
          </div>

          <span className="badge badge-emerald">
            <Zap size={10} />
            Domain RAG Engine Ready
          </span>
        </div>

        {/* Message Thread */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
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
                    maxWidth: "80%",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-md)",
                    background: isUser
                      ? "linear-gradient(135deg, #0284c7, #0369a1)"
                      : "var(--bg-elevated)",
                    border: isUser ? "none" : "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  }}
                >
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>

                  {/* Citations / Evidence Cards */}
                  {m.citations && m.citations.length > 0 && (
                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 10,
                        borderTop: "1px solid rgba(255,255,255,0.1)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: 6 }}>
                        <FileText size={12} />
                        GROUND TRUTH EVIDENCE ({m.citations.length} Sources):
                      </div>

                      {m.citations.map((c, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: "rgba(0,0,0,0.3)",
                            padding: "8px 10px",
                            borderRadius: 4,
                            borderLeft: "2px solid var(--accent-cyan)",
                            fontSize: 11,
                          }}
                        >
                          <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                            {c.source_doc} • Well: {c.well_id} ({c.depth_range})
                          </div>
                          <div style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
                            "{c.text_snippet}"
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, padding: "0 4px" }}>
                  {m.timestamp} {m.provider ? `• via ${m.provider}` : ""}
                </div>
              </div>
            );
          })}

          {isQuerying && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 12 }}>
              <Sparkles size={16} className="animate-spin" color="var(--accent-cyan)" />
              Synthesizing offset well knowledge and institutional reports...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            gap: 10,
            background: "rgba(11, 17, 32, 0.6)",
          }}
        >
          <input
            type="text"
            className="input-control"
            style={{ flex: 1 }}
            placeholder={`Ask about risks at ${simulation?.current_depth.toFixed(0)}m, offset mitigations, or casing designs...`}
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
          >
            <Send size={16} />
            Ask
          </button>
        </div>
      </div>

      {/* Right Prompt Shortcuts & Context Info */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Suggested Queries Card */}
        <div className="glass-card">
          <div className="card-title" style={{ marginBottom: 12 }}>
            <Sparkles size={16} color="var(--accent-cyan)" />
            Recommended Prompts
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SAMPLE_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                  textAlign: "left",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  lineHeight: 1.4,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-cyan)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                "{p}"
              </button>
            ))}
          </div>
        </div>

        {/* Real-Time Context Card */}
        <div className="glass-card">
          <div className="card-title" style={{ marginBottom: 12 }}>
            <Compass size={16} color="var(--accent-emerald)" />
            Drilling Context Passed to AI
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Active Well:</span>
              <strong>{activeWellId}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Current Depth:</span>
              <strong style={{ color: "var(--accent-cyan)" }}>
                {simulation ? simulation.current_depth.toFixed(1) : "3,050.0"} m
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Current Formation:</span>
              <strong style={{ color: "#38bdf8" }}>{formation}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Search Radius:</span>
              <span>20.0 km</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Analogue Wells:</span>
              <span>OIL-X104, OIL-X101, OIL-X106</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
