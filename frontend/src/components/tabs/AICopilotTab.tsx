import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Sparkles,
  FileText,
  Compass,
  AlertTriangle,
  Layers,
  ShieldAlert,
  HelpCircle,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { AICitation, AIQueryResponse, SimulationState } from "../../types";
import { api } from "../../services/api";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  summary?: string;
  historical_evidence?: Array<Record<string, any>>;
  similar_wells?: string[];
  risk_interpretation?: string;
  sources?: string[];
  citations?: AICitation[];
  provider?: string;
}

interface AICopilotTabProps {
  simulation: SimulationState | null;
  activeWellId?: string;
  formation?: string;
}

const SAMPLE_PROMPTS = [
  "What happened around 3200m?",
  "Which nearby well is most similar?",
  "Why is 3180m risky?",
  "What happened in OIL-X104?",
  "What historical stuck-pipe events occurred?",
  "What mitigation was documented?",
  "What formations are associated with mud loss?",
];

export const AICopilotTab: React.FC<AICopilotTabProps> = ({
  simulation,
  activeWellId = "OIL-X123",
  formation = "Tipam",
}) => {
  const currentDepth = simulation ? simulation.current_depth : 3050.0;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: `Hello, Drilling Engineer. I am **Ask NWIS** — the Offset Well Intelligence Assistant for Oil India Limited operations.\n\nI synthesize verified ground truth from 50 offset wells, 16 End of Well Reports, and 234 drilling events across the Assam Basin.\n\nCurrently monitoring **${activeWellId}** at **${currentDepth.toFixed(1)}m** in **${formation}** formation. How can I assist your operational decisions today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      provider: "Ask NWIS (Deterministic Ground Truth)",
    },
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isQuerying]);

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
      const res: AIQueryResponse = await api.queryAI(q, activeWellId, currentDepth, formation);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: res.answer,
        summary: res.summary,
        historical_evidence: res.historical_evidence,
        similar_wells: res.similar_wells,
        risk_interpretation: res.risk_interpretation,
        sources: res.sources,
        citations: res.citations,
        provider: res.provider || "Ask NWIS",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: "Error connecting to Ask NWIS intelligence service. Please check your backend connection.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, height: "calc(100vh - 220px)" }}>

      {/* Main Chat Window */}
      <div
        className="glass-card"
        style={{ display: "flex", flexDirection: "column", height: "100%", padding: 0, overflow: "hidden" }}
      >
        {/* Chat Header — Canopy Band */}
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
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-mint-pulse)",
              }}
            >
              <Bot size={20} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 8 }}>
                Ask NWIS
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "rgba(0, 230, 153, 0.18)",
                    color: "var(--color-mint-pulse)",
                    letterSpacing: "0.03em",
                  }}
                >
                  ASSAM BASIN RAG
                </span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 1 }}>
                Offset Well Knowledge & Real-Time Decision Support · {activeWellId} @ {currentDepth.toFixed(1)}m ({formation})
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "4px 10px",
              borderRadius: 9999,
              background: "var(--color-mint-pulse)",
              color: "#081a15",
            }}
          >
            Ask NWIS Engine Ready
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
            gap: 18,
            background: "var(--bg-core)",
          }}
        >
          {messages.map((m) => {
            const isUser = m.sender === "user";
            const hasStructuredData = Boolean(
              !isUser &&
              (m.summary || (m.historical_evidence && m.historical_evidence.length > 0))
            );

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
                    maxWidth: isUser ? "75%" : "90%",
                    padding: isUser ? "12px 18px" : "18px 20px",
                    borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: isUser ? "var(--color-canopy)" : "var(--color-sheet-white)",
                    border: isUser ? "none" : "1px solid var(--color-sage-mist)",
                    color: isUser ? "white" : "var(--color-bark)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    boxShadow: isUser ? "none" : "0 2px 8px rgba(0,0,0,0.03)",
                  }}
                >
                  {isUser ? (
                    <div style={{ whiteSpace: "pre-wrap", fontWeight: 500 }}>{m.text}</div>
                  ) : hasStructuredData ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {/* 1. SUMMARY */}
                      {m.summary && (
                        <div
                          style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            background: "var(--accent-cyan-dim)",
                            borderLeft: "3px solid var(--color-canopy)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--color-canopy)",
                              marginBottom: 4,
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <Sparkles size={12} color="var(--color-canopy)" />
                            Summary
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-bark)", lineHeight: 1.5 }}>
                            {m.summary}
                          </div>
                        </div>
                      )}

                      {/* 2. HISTORICAL EVIDENCE */}
                      {m.historical_evidence && m.historical_evidence.length > 0 && (
                        <div>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--color-slate)",
                              marginBottom: 8,
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <ShieldAlert size={12} color="var(--color-canopy)" />
                            Historical Evidence ({m.historical_evidence.length} Records)
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
                            {m.historical_evidence.map((ev, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: 6,
                                  background: "var(--bg-elevated)",
                                  border: "1px solid var(--border-subtle)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  fontSize: 12,
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <strong style={{ color: "var(--color-canopy)", fontWeight: 700 }}>
                                    {ev.well_id || "Offset Well"}
                                  </strong>
                                  <span style={{ color: "var(--color-bark)" }}>
                                    {ev.event || "Incident"} @ {typeof ev.depth === "number" ? `${ev.depth.toFixed(0)}m` : ev.depth}
                                  </span>
                                  {ev.formation && (
                                    <span style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>
                                      ({ev.formation})
                                    </span>
                                  )}
                                </div>
                                {ev.severity && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: "2px 6px",
                                      borderRadius: 4,
                                      background:
                                        ev.severity === "CRITICAL"
                                          ? "var(--accent-rose-dim)"
                                          : ev.severity === "HIGH"
                                          ? "var(--accent-amber-dim)"
                                          : "var(--accent-emerald-dim)",
                                      color:
                                        ev.severity === "CRITICAL"
                                          ? "var(--accent-rose)"
                                          : ev.severity === "HIGH"
                                          ? "var(--accent-amber)"
                                          : "var(--accent-emerald)",
                                    }}
                                  >
                                    {ev.severity}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. SIMILAR WELLS */}
                      {m.similar_wells && m.similar_wells.length > 0 && (
                        <div>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--color-slate)",
                              marginBottom: 6,
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <Layers size={12} color="var(--color-canopy)" />
                            Analogue Wells Evaluated
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {m.similar_wells.map((sw, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: 11,
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  background: "var(--accent-cyan-dim)",
                                  color: "var(--color-canopy)",
                                  fontWeight: 600,
                                  border: "1px solid var(--border-subtle)",
                                }}
                              >
                                {sw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 4. RISK INTERPRETATION */}
                      {m.risk_interpretation && (
                        <div
                          style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            background: "var(--accent-amber-dim)",
                            border: "1px solid var(--accent-amber)",
                            borderLeft: "3px solid var(--accent-amber)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--accent-amber)",
                              marginBottom: 4,
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <AlertTriangle size={12} color="var(--accent-amber)" />
                            Risk Interpretation & Operational Advisory
                          </div>
                          <div style={{ fontSize: 12, color: "var(--color-bark)", lineHeight: 1.5 }}>
                            {m.risk_interpretation}
                          </div>
                        </div>
                      )}

                      {/* 5. SOURCES */}
                      {m.sources && m.sources.length > 0 && (
                        <div style={{ borderTop: "1px solid var(--color-sage-mist)", paddingTop: 10 }}>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--color-muted-slate)",
                              marginBottom: 6,
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <FileText size={11} />
                            Sources & Documents Cited ({m.sources.length})
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {m.sources.map((src, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: 11,
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  background: "var(--bg-elevated)",
                                  color: "var(--color-slate)",
                                  fontWeight: 600,
                                  border: "1px solid var(--border-subtle)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                {src}
                                <ExternalLink size={10} style={{ opacity: 0.6 }} />
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                  )}
                </div>

                <div style={{ fontSize: 10, color: "var(--color-muted-slate)", marginTop: 4, paddingInline: 4 }}>
                  {m.timestamp}{m.provider ? ` · ${m.provider}` : ""}
                </div>
              </div>
            );
          })}

          {isQuerying && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-muted-slate)", fontSize: 12 }}>
              <Sparkles size={15} style={{ animation: "spin 1.5s linear infinite" }} color="var(--color-canopy)" />
              Searching offset wells, DDR chunks, and vector embeddings in Assam Basin knowledge base…
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
            placeholder={`Ask NWIS: "Why is 3180m risky?", "What happened around 3200m?", "Which nearby well is most similar?"…`}
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
            style={{ gap: 6, padding: "8px 18px" }}
          >
            <Send size={14} />
            Ask NWIS
          </button>
        </div>
      </div>

      {/* Right Column: Suggested Questions & Context */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Operational Query Prompts */}
        <div className="glass-card">
          <div className="card-title" style={{ marginBottom: 12 }}>
            <HelpCircle size={15} color="var(--color-canopy)" />
            Recommended Operational Inquiries
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {SAMPLE_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--color-sage-mist)",
                  borderRadius: 8,
                  padding: "9px 11px",
                  textAlign: "left",
                  fontSize: 12,
                  color: "var(--color-slate)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  lineHeight: 1.4,
                  fontFamily: "var(--font-sans)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
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
                <span>{p}</span>
                <ChevronRight size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>

        {/* Drilling Context Panel */}
        <div className="glass-card">
          <div className="card-title" style={{ marginBottom: 12 }}>
            <Compass size={15} color="var(--color-canopy)" />
            Real-Time Query Context
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 13 }}>
            {[
              { label: "Active Wellbore",   val: activeWellId, color: "var(--color-canopy)" },
              { label: "Current Bit Depth", val: `${currentDepth.toFixed(1)} m`, color: "var(--color-canopy)" },
              { label: "Litho Formation",   val: formation, color: "var(--color-canopy)" },
              { label: "Primary Analogue",  val: "OIL-X104 (91%)", color: "var(--color-bark)" },
              { label: "Secondary Wells",   val: "OIL-X101, OIL-X106", color: "var(--color-bark)" },
              { label: "Knowledge Base",    val: "50 Wells · 234 Events · 328 Chunks", color: "var(--color-slate)" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-sage-mist)", paddingBottom: 6 }}>
                <span style={{ color: "var(--color-muted-slate)", fontSize: 11 }}>{row.label}</span>
                <strong style={{ fontSize: 11, color: row.color }}>{row.val}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
