import React from "react";
import { Gauge, ArrowUpRight, ShieldAlert } from "lucide-react";
import { SimulationState } from "../types";

interface LiveTelemetryBarProps {
  simulation: SimulationState | null;
  activeWellName?: string;
  formation?: string;
}

export const LiveTelemetryBar: React.FC<LiveTelemetryBarProps> = ({
  simulation,
  activeWellName = "OIL-X123",
  formation = "Tipam Sandstone",
}) => {
  if (!simulation) {
    return (
      <div className="telemetry-bar">
        <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
          Connecting to eRTMAC real-time telemetry stream...
        </div>
      </div>
    );
  }

  const depth = simulation.current_depth.toFixed(1);
  const rop = simulation.current_rop.toFixed(1);
  const wob = simulation.current_wob.toFixed(1);
  const rpm = simulation.current_rpm.toFixed(0);
  const torque = simulation.current_torque.toFixed(1);
  const pressure = simulation.current_pressure.toFixed(0);
  const flow = simulation.current_mud_flow.toFixed(0);
  const inc = simulation.current_inclination.toFixed(1);
  const az = simulation.current_azimuth.toFixed(0);

  // Parameter warning flags
  const isPressureAbnormal = simulation.current_pressure > 3200 || simulation.current_pressure < 2500;
  const isTorqueHigh = simulation.current_torque > 22.0;

  return (
    <div className="telemetry-bar">
      {/* Active Well Badge */}
      <div className="well-identity">
        <div className="active-pulse-beacon" title="Live Operation Active" />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.02em" }}>
              {activeWellName}
            </span>
            <span
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 4,
                background: "rgba(16, 185, 129, 0.2)",
                color: "var(--accent-emerald)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                fontWeight: 600,
              }}
            >
              eRTMAC LIVE
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            Formation: <strong style={{ color: "#38bdf8" }}>{formation}</strong>
          </div>
        </div>
      </div>

      {/* Telemetry Readouts Grid */}
      <div className="telemetry-metrics-grid">
        {/* Measured Depth */}
        <div className="telemetry-item">
          <span className="telemetry-label">Measured Depth (MD)</span>
          <div className="telemetry-value-box">
            <span className="telemetry-val highlight-depth">{depth}</span>
            <span className="telemetry-unit">m</span>
          </div>
        </div>

        {/* Rate of Penetration */}
        <div className="telemetry-item">
          <span className="telemetry-label">ROP</span>
          <div className="telemetry-value-box">
            <span className="telemetry-val" style={{ color: "#34d399" }}>{rop}</span>
            <span className="telemetry-unit">m/hr</span>
          </div>
        </div>

        {/* Weight on Bit */}
        <div className="telemetry-item">
          <span className="telemetry-label">WOB</span>
          <div className="telemetry-value-box">
            <span className="telemetry-val">{wob}</span>
            <span className="telemetry-unit">klbs</span>
          </div>
        </div>

        {/* Rotary Speed */}
        <div className="telemetry-item">
          <span className="telemetry-label">Rotary (RPM)</span>
          <div className="telemetry-value-box">
            <span className="telemetry-val">{rpm}</span>
            <span className="telemetry-unit">rpm</span>
          </div>
        </div>

        {/* Torque */}
        <div className="telemetry-item">
          <span className="telemetry-label">Surface Torque</span>
          <div className="telemetry-value-box">
            <span
              className="telemetry-val"
              style={{ color: isTorqueHigh ? "var(--accent-rose)" : "inherit" }}
            >
              {torque}
            </span>
            <span className="telemetry-unit">kft-lb</span>
          </div>
        </div>

        {/* Standpipe Pressure */}
        <div className="telemetry-item">
          <span className="telemetry-label">SPP Pressure</span>
          <div className="telemetry-value-box">
            <span
              className="telemetry-val"
              style={{ color: isPressureAbnormal ? "var(--accent-amber)" : "inherit" }}
            >
              {pressure}
            </span>
            <span className="telemetry-unit">psi</span>
          </div>
        </div>

        {/* Mud Flow Rate */}
        <div className="telemetry-item">
          <span className="telemetry-label">Flow Rate</span>
          <div className="telemetry-value-box">
            <span className="telemetry-val">{flow}</span>
            <span className="telemetry-unit">gpm</span>
          </div>
        </div>

        {/* Direction: Inc & Az */}
        <div className="telemetry-item">
          <span className="telemetry-label">Trajectory (Inc / Az)</span>
          <div className="telemetry-value-box">
            <span className="telemetry-val">{inc}°</span>
            <span className="telemetry-unit" style={{ marginLeft: 3 }}>/ {az}°</span>
          </div>
        </div>
      </div>
    </div>
  );
};
