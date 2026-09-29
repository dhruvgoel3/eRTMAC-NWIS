import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Zap,
  Server,
  FileCheck,
  AlertTriangle,
} from "lucide-react";

export const AdminProcessingPage: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pipelineState, setPipelineState] = useState<string>("IDLE");
  const [lastBatchTime, setLastBatchTime] = useState<string>("2026-09-28 09:15 UTC");

  const handleRunBatch = () => {
    setIsProcessing(true);
    setPipelineState("RUNNING");
    setTimeout(() => {
      setIsProcessing(false);
      setPipelineState("IDLE");
      setLastBatchTime(new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC");
    }, 1500);
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-sage-mist)", paddingBottom: 16 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 9999, background: "rgba(37, 99, 235, 0.08)", color: "#1d4ed8", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 6 }}>
            <Cpu size={12} />
            <span>INGESTION &amp; PIPELINE ENGINE</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
            Data Processing &amp; Embedding Pipeline
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--color-slate)", fontSize: 13 }}>
            Monitor institutional OCR extraction, semantic text chunking, and vector index generation jobs.
          </p>
        </div>

        <button
          onClick={handleRunBatch}
          disabled={isProcessing}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            borderRadius: 10,
            background: "var(--color-canopy)",
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
          }}
        >
          <Zap size={14} />
          <span>{isProcessing ? "Processing Queue..." : "Trigger Batch Ingestion"}</span>
        </button>
      </div>

      {/* Pipeline Status Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        <div style={{ background: "var(--color-sheet-white)", border: "1px solid var(--color-sage-mist)", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--color-muted-slate)", fontWeight: 700, marginBottom: 4 }}>Pipeline State</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: pipelineState === "RUNNING" ? "#2563eb" : "#0d7a4e", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: pipelineState === "RUNNING" ? "#2563eb" : "#0d7a4e" }} />
            {pipelineState === "RUNNING" ? "EXECUTING BATCH" : "READY (HEALTHY)"}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 6 }}>Last execution: {lastBatchTime}</div>
        </div>

        <div style={{ background: "var(--color-sheet-white)", border: "1px solid var(--color-sage-mist)", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--color-muted-slate)", fontWeight: 700, marginBottom: 4 }}>Extraction Accuracy</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-bark)" }}>99.4%</div>
          <div style={{ fontSize: 11, color: "#0d7a4e", fontWeight: 700, marginTop: 6 }}>Zero parse failures reported</div>
        </div>

        <div style={{ background: "var(--color-sheet-white)", border: "1px solid var(--color-sage-mist)", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--color-muted-slate)", fontWeight: 700, marginBottom: 4 }}>Vector Generation Latency</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-bark)" }}>42 ms / chunk</div>
          <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 6 }}>Dense embeddings normalized</div>
        </div>
      </div>

      {/* Pipeline Diagram */}
      <div style={{ background: "var(--color-sheet-white)", border: "1px solid var(--color-sage-mist)", borderRadius: 14, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--color-bark)", margin: "0 0 16px" }}>
          End-to-End Institutional Ingestion Architecture
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <div style={{ padding: 16, borderRadius: 12, border: "1px solid var(--color-sage-mist)", background: "var(--bg-elevated)" }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-canopy)", fontWeight: 700 }}>STAGE 1</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4, color: "var(--color-bark)" }}>Raw Document Parser</div>
            <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 4 }}>Extracts headers, DDR operational logs, and formation intervals.</div>
          </div>
          <div style={{ padding: 16, borderRadius: 12, border: "1px solid var(--color-sage-mist)", background: "var(--bg-elevated)" }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-canopy)", fontWeight: 700 }}>STAGE 2</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4, color: "var(--color-bark)" }}>Semantic Chunking</div>
            <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 4 }}>Splits narrative into 500-token chunks with 50-token overlap.</div>
          </div>
          <div style={{ padding: 16, borderRadius: 12, border: "1px solid var(--color-sage-mist)", background: "var(--bg-elevated)" }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-canopy)", fontWeight: 700 }}>STAGE 3</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4, color: "var(--color-bark)" }}>Embedding Generation</div>
            <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 4 }}>Generates normalized dense vector embeddings for cosine search.</div>
          </div>
          <div style={{ padding: 16, borderRadius: 12, border: "1px solid var(--color-sage-mist)", background: "var(--bg-elevated)" }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-canopy)", fontWeight: 700 }}>STAGE 4</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4, color: "var(--color-bark)" }}>Knowledge Store</div>
            <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 4 }}>Indexed into PostgreSQL vector store and linked in memory graph.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
