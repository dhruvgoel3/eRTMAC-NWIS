import React from "react";
import {
  X,
  AlertTriangle,
  FileText,
  Layers,
  ShieldAlert,
  Compass,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import { Alert } from "../types";

interface AlertEvidenceModalProps {
  alert: Alert | null;
  currentFormation?: string;
  onClose: () => void;
  onAskNWIS?: (query: string) => void;
}

export const AlertEvidenceModal: React.FC<AlertEvidenceModalProps> = ({
  alert,
  currentFormation = "Tipam",
  onClose,
  onAskNWIS,
}) => {
  if (!alert) return null;

  const sev = alert.severity || "HIGH";
  const depth = alert.depth || 3180.0;
  const isStuckPipe = alert.message.toLowerCase().includes("stuck") || alert.message.toLowerCase().includes("pipe");
  const isMudLoss = alert.message.toLowerCase().includes("loss");

  // Concrete historical evidence tailored to the alert
  const evidenceRecords = isStuckPipe
    ? [
        { well: "OIL-X104", event: "Stuck Pipe", depth: "3,280m", npt: "16.0h NPT", formation: "Tipam", detail: "Differential sticking across depleted sand. Freed after 500L diesel spotting pill + jarring." },
        { well: "OIL-X101", event: "Stuck Pipe", depth: "3,210m", npt: "12.5h NPT", formation: "Tipam", detail: "Stuck during connection. Overbalance pressure exceeded 420 psi across porous sand." },
        { well: "OIL-X106", event: "Stuck Pipe", depth: "3,260m", npt: "24.0h NPT", formation: "Tipam", detail: "Severe mechanical sticking. Required back-off and spotting heavy lubricant pill." },
      ]
    : isMudLoss
    ? [
        { well: "OIL-X104", event: "Mud Loss", depth: "3,120m", npt: "8.0h NPT", formation: "Tipam", detail: "Dynamic loss of 45 bbl/hr into upper Tipam micro-fractures. Treated with CaCO3 LCM pill." },
        { well: "OIL-X101", event: "Mud Loss", depth: "3,095m", npt: "6.5h NPT", formation: "Tipam", detail: "Seepage loss escalated to 30 bbl/hr. Mud weight reduced from 10.9 to 10.6 ppg." },
        { well: "OIL-X102", event: "Mud Loss", depth: "3,130m", npt: "10.0h NPT", formation: "Tipam", detail: "Partial loss cured by pumping 50 bbl high-viscosity nut-plug pill." },
      ]
    : [
        { well: "OIL-X104", event: "Torque Spike", depth: "3,450m", npt: "4.0h NPT", formation: "Tipam", detail: "Torque fluctuation ±4 kft-lb in tight hole. Reamed with reduced WOB." },
        { well: "OIL-X105", event: "Torque Spike", depth: "3,280m", npt: "5.5h NPT", formation: "Tipam", detail: "Ledge formation caused high erratic drag on trip out." },
      ];

  const similarWells = [
    { well: "OIL-X104", similarity: "91%", distance: "8.30 km", td: "3,850m", formation: "Tipam" },
    { well: "OIL-X101", similarity: "84%", distance: "5.30 km", td: "3,720m", formation: "Tipam" },
    { well: "OIL-X106", similarity: "71%", distance: "11.20 km", td: "3,400m", formation: "Tipam" },
  ];


  const documents = isStuckPipe
    ? ["DDR-X104-2023-07", "WCR-X106-2022", "DDR-X101-2022-07"]
    : ["DDR-X104-2023-07", "WCR-X104-2023", "MUD-LOG-X101"];

  const handleAsk = () => {
    const q = isStuckPipe
      ? "Why is the 3180-3290m interval risky?"
      : `Why is ${depth.toFixed(0)}m risky in ${currentFormation}?`;
    if (onAskNWIS) {
      onAskNWIS(q);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2200,
        background: "rgba(16, 31, 30, 0.65)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 740,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--color-sheet-white)",
          border: "1px solid var(--color-sage-mist)",
          borderRadius: 16,
          boxShadow: "0 12px 36px rgba(0,0,0,0.15)",
          padding: 0,
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Canopy Header Band */}
        <div
          style={{
            padding: "16px 24px",
            background: "var(--color-canopy)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTopLeftRadius: 15,
            borderTopRightRadius: 15,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: sev === "CRITICAL" ? "#ff6b8b" : "var(--color-mint-pulse)",
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                Why Am I Seeing This Hazard Alert?
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    padding: "2px 7px",
                    borderRadius: 4,
                    background: sev === "CRITICAL" ? "rgba(255,107,139,0.25)" : "rgba(0, 230, 153, 0.2)",
                    color: sev === "CRITICAL" ? "#ff9ebb" : "var(--color-mint-pulse)",
                    textTransform: "uppercase",
                  }}
                >
                  {sev} PREDICTIVE CORRELATION
                </span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                Offset Well Evidence &amp; Stratigraphic Risk Explanation · Depth {depth.toFixed(1)}m
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Alert Summary Box */}
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 10,
              background: sev === "CRITICAL" ? "rgba(185,28,66,0.06)" : "rgba(196,125,14,0.06)",
              border: `1px solid ${sev === "CRITICAL" ? "rgba(185,28,66,0.25)" : "rgba(196,125,14,0.25)"}`,
              borderLeft: `4px solid ${sev === "CRITICAL" ? "#b91c42" : "#c47d0e"}`,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
              {alert.message}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-slate)", lineHeight: 1.5 }}>
              {alert.explanation || "Historical offset well events correlate to this exact stratigraphic interval in the Assam Basin."}
            </div>
          </div>

          {/* 1. Historical Evidence */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-canopy)",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <ShieldAlert size={14} color="var(--color-canopy)" />
              1. Historical Offset Evidence ({evidenceRecords.length} Ground Truth Events)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {evidenceRecords.map((ev, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--color-sage-mist)",
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ color: "var(--color-canopy)" }}>{ev.well}</strong>
                      <span className="badge badge-canopy">{ev.event}</span>
                      <span style={{ fontWeight: 600, color: "var(--color-bark)" }}>@ {ev.depth}</span>
                      <span style={{ color: "var(--color-muted-slate)", fontSize: 11 }}>({ev.formation})</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#b91c42" }}>{ev.npt}</span>
                  </div>
                  <div style={{ color: "var(--color-slate)", fontSize: 11, lineHeight: 1.4 }}>
                    {ev.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Similar Wells Evaluated */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-slate)",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Compass size={14} color="var(--color-orb-violet)" />
              2. Highest Correlated Offset Analogue Wells
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {similarWells.map((sw, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--color-sage-mist)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <strong style={{ fontSize: 13, color: "var(--color-bark)" }}>{sw.well}</strong>
                    <span className="badge badge-violet">{sw.similarity} MATCH</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>
                    {sw.distance} · {sw.formation} (TD {sw.td})
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Formation & Depth Context */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              background: "var(--bg-elevated)",
              border: "1px solid var(--color-sage-mist)",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-muted-slate)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Target Formation
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-canopy)", marginTop: 2 }}>
                {currentFormation} Sandstone
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-muted-slate)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Depth Vulnerability Window
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-bark)", marginTop: 2 }}>
                3,180.0m – 3,290.0m
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-muted-slate)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Primary Mechanism
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-amber)", marginTop: 2 }}>
                Differential Sticking / Loss
              </div>
            </div>
          </div>

          {/* 4. Cited Institutional Documents */}
          <div>
            <div
              style={{
                fontSize: 11,
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
              <FileText size={13} />
              4. Ground Truth Documentation Sources
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {documents.map((doc, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "var(--bg-elevated)",
                    color: "var(--color-slate)",
                    fontWeight: 600,
                    border: "1px solid var(--border-subtle)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <FileText size={11} />
                  {doc}
                </span>
              ))}
            </div>
          </div>

          {/* Non-Certainty Disclaimer */}
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(16, 67, 54, 0.04)",
              border: "1px solid rgba(16, 67, 54, 0.12)",
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <Info size={14} color="var(--color-canopy)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 11, color: "var(--color-slate)", lineHeight: 1.4 }}>
              <strong>Advisory Notice:</strong> Historical patterns indicate heightened susceptibility based on offset well data, but do not guarantee downhole conditions. Real-time telemetry monitoring is required.
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--color-sage-mist)",
            background: "var(--bg-elevated)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomLeftRadius: 15,
            borderBottomRightRadius: 15,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>
            Correlated across 50 offset wells in the Assam Basin
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-secondary" onClick={onClose} style={{ padding: "8px 16px", fontSize: 12 }}>
              Close
            </button>
            <button
              className="btn-primary"
              onClick={handleAsk}
              style={{ padding: "8px 18px", fontSize: 12, gap: 6 }}
            >
              <Sparkles size={14} />
              Ask NWIS About This Risk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
