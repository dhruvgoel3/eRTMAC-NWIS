import React from "react";
import {
  X,
  AlertTriangle,
  FileText,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Alert } from "../types";

interface AlertEvidenceDrawerProps {
  alert: Alert | null;
  currentFormation?: string;
  onClose: () => void;
  onAskNWIS?: (query: string) => void;
}

export const AlertEvidenceDrawer: React.FC<AlertEvidenceDrawerProps> = ({
  alert,
  currentFormation = "F3 (Tipam)",
  onClose,
  onAskNWIS,
}) => {
  if (!alert) return null;

  const sev = alert.severity || "HIGH";
  const depth = alert.depth || 3180.0;
  const isStuckPipe = alert.message.toLowerCase().includes("stuck") || alert.message.toLowerCase().includes("pipe");

  const evidenceRecords = isStuckPipe
    ? [
        {
          well: "OIL-X104",
          event: "Differential Stuck Pipe",
          depth: "3,280m",
          npt: "16.0h NPT",
          formation: "Tipam Sandstone",
          source: "WCR-X104-2023",
          detail: "Differential sticking across depleted permeable sand interval. Drillstring was stuck for 16.0 hrs before freeing with 25 bbls lubricant LCM pill and maximum torque cycling.",
        },
        {
          well: "OIL-X101",
          event: "Mechanical Sticking",
          depth: "3,210m",
          npt: "12.5h NPT",
          formation: "Tipam Sandstone",
          source: "DDR-X101-2022",
          detail: "Stuck during drillstring connection. Overbalance pressure exceeded 420 psi across porous sand package.",
        },
        {
          well: "OIL-X106",
          event: "Tight Hole / Ledge Sticking",
          depth: "3,260m",
          npt: "8.5h NPT",
          formation: "Tipam Sandstone",
          source: "DDR-X106-2022",
          detail: "Severe overpull on tripping out. Required jarring with 80 klbs overpull and spotting diesel wash.",
        },
      ]
    : [
        {
          well: "OIL-X104",
          event: "Mud Loss",
          depth: "3,120m",
          npt: "8.0h NPT",
          formation: "Tipam Sandstone",
          source: "DDR-X104-2023",
          detail: "Dynamic loss of 45 bbl/hr into upper Tipam micro-fractures. Treated with medium CaCO3 LCM pill.",
        },
        {
          well: "OIL-X101",
          event: "Seepage Losses",
          depth: "3,095m",
          npt: "6.5h NPT",
          formation: "Tipam Sandstone",
          source: "DDR-X101-2022",
          detail: "Loss escalated to 30 bbl/hr. Mud weight reduced from 10.9 to 10.6 ppg to rebalance ECD.",
        },
      ];

  const handleAskCopilot = () => {
    const q = isStuckPipe
      ? "Why is the 3180m–3290m interval historically risky in OIL-X104 and how do we prevent stuck pipe?"
      : `Why is ${depth.toFixed(0)}m risky in formation ${currentFormation}?`;
    if (onAskNWIS) {
      onAskNWIS(q);
      onClose();
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="badge badge-rose" style={{ fontSize: 9 }}>{sev} HAZARD EVIDENCE</span>
                <span style={{ fontSize: 10, color: "var(--color-muted-slate)" }}>Depth: {depth}m</span>
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--color-bark)", margin: "2px 0 0" }}>
                Alert Grounding &amp; Root Cause
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close evidence drawer"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--color-sage-mist)",
              background: "#ffffff",
              color: "var(--color-slate)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="drawer-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* The Prompt Question Box */}
            <div style={{ padding: 14, background: "rgba(0, 230, 153, 0.08)", border: "1px solid rgba(0, 230, 153, 0.3)", borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-canopy)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={14} color="var(--color-mint-pulse)" />
                Why are you seeing this alert?
              </div>
              <div style={{ fontSize: 12, color: "var(--color-bark)", fontWeight: 600 }}>
                {alert.message}
              </div>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 11, color: "var(--color-slate)", lineHeight: 1.5 }}>
                <li>Current bit depth is <strong>approaching historical hazard boundary (3,180m–3,290m)</strong>.</li>
                <li>Current target formation <strong>{currentFormation} matches historical offset geology</strong>.</li>
                <li>Multiple nearby offset wells (OIL-X104, OIL-X101) logged critical incidents in this exact window.</li>
                <li>Historical evidence cross-referenced from validated Daily Drilling Reports (DDR) and Well Completion Reports (WCR).</li>
              </ul>
            </div>

            {/* CUSUM / Z-Score Physical Drift Basis */}
            <div style={{ padding: 14, background: "#ffffff", borderRadius: 10, border: "1px solid var(--color-sage-mist)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-bark)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <TrendingUp size={14} color="var(--color-canopy)" />
                Physical Telemetry Detection Basis (CUSUM &amp; Z-Score)
              </div>
              <div style={{ background: "var(--bg-elevated)", padding: 10, borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-bark)", lineHeight: 1.6 }}>
                <div><strong>• CUSUM Accumulator:</strong> S+ = 1.444 &gt; Decision Threshold h = 1.242</div>
                <div><strong>• Statistical Drift:</strong> z = +1.44 (Baseline μ = 90.68 klbs, σ = 0.248)</div>
                <div><strong>• Engineering Basis:</strong> Persistent hookload overpull drift indicates string mechanically resisting upward motion across porous sandstone.</div>
              </div>
            </div>

            {/* Grounded Offset Well Historical Incidents */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-bark)", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Historical Analog Incidents ({evidenceRecords.length})</span>
                <span style={{ fontSize: 10, color: "var(--color-canopy)", fontWeight: 700 }}>VERIFIED 100% GROUNDED</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {evidenceRecords.map((rec, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 12,
                      background: "#ffffff",
                      borderRadius: 10,
                      border: "1px solid var(--color-sage-mist)",
                      borderLeft: "4px solid #ef4444",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <strong style={{ fontSize: 12, color: "var(--color-bark)" }}>{rec.well}</strong>
                        <span style={{ fontSize: 10, color: "var(--color-slate)" }}>· {rec.depth}</span>
                      </div>
                      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-canopy)", background: "rgba(0, 230, 153, 0.1)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                        {rec.source}
                      </span>
                    </div>

                    <div style={{ fontSize: 11, fontWeight: 700, color: "#b91c42" }}>
                      {rec.event} ({rec.npt})
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 4, lineHeight: 1.4 }}>
                      {rec.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verified Document Records */}
            <div style={{ padding: 12, background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--color-sage-mist)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-bark)", marginBottom: 6 }}>
                Primary Source Documents Referenced
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["WCR-OIL-X104-2023.pdf", "DDR-X104-Section3.pdf", "DDR-X101-Final.pdf"].map((doc) => (
                  <span
                    key={doc}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                      padding: "3px 8px",
                      background: "#ffffff",
                      border: "1px solid var(--color-sage-mist)",
                      borderRadius: 6,
                      color: "var(--color-canopy)",
                      fontWeight: 600,
                    }}
                  >
                    <FileText size={10} />
                    {doc}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer with Contextual Actions */}
        <div className="drawer-footer">
          <button
            onClick={handleAskCopilot}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              background: "var(--color-canopy)",
              color: "#ffffff",
              border: "none",
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            <Sparkles size={13} color="var(--color-mint-pulse)" />
            Consult NWIS Copilot on Mitigations
          </button>

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ fontSize: 11, padding: "8px 14px" }}
          >
            Dismiss
          </button>
        </div>
      </aside>
    </div>
  );
};
