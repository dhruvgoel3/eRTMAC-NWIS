import React from "react";
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
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
          Connecting to eRTMAC real-time telemetry stream…
        </div>
      </div>
    );
  }

  const depth    = simulation.current_depth.toFixed(1);
  const rop      = simulation.current_rop.toFixed(1);
  const wob      = simulation.current_wob.toFixed(1);
  const rpm      = simulation.current_rpm.toFixed(0);
  const torque   = simulation.current_torque.toFixed(1);
  const pressure = simulation.current_pressure.toFixed(0);
  const flow     = simulation.current_mud_flow.toFixed(0);
  const inc      = simulation.current_inclination.toFixed(1);
  const az       = simulation.current_azimuth.toFixed(0);

  const isPressureAbnormal =
    simulation.current_pressure > 3200 || simulation.current_pressure < 2500;
  const isTorqueHigh = simulation.current_torque > 22.0;

  return (
    <div className="telemetry-bar">
      {/* Well Identity */}
      <div className="well-identity">
        <div className="active-pulse-beacon" title="Live Operation Active" />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.92)", letterSpacing: "-0.01em" }}>
              {activeWellName}
            </span>
            <span
              style={{
                fontSize: 9,
                padding: "2px 7px",
                borderRadius: 9999,
                background: "var(--color-mint-pulse)",
                color: "var(--color-bark)",
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
              }}
            >
              eRTMAC LIVE
            </span>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>
            {formation}
          </div>
        </div>
      </div>

      {/* Telemetry Readouts */}
      <div className="telemetry-metrics-grid">
        <div className="telemetry-item">
          <span className="telemetry-label">Measured Depth</span>
          <div className="telemetry-value-box">
            <span className="telemetry-val highlight-depth">{depth}</span>
            <span className="telemetry-unit">m</span>
          </div>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">ROP</span>
          <div className="telemetry-value-box">
            <span className="telemetry-val" style={{ color: "rgba(15,255,135,0.85)" }}>{rop}</span>
            <span className="telemetry-unit">m/hr</span>
          </div>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">WOB</span>
          <div className="telemetry-value-box">
            <span className="telemetry-val">{wob}</span>
            <span className="telemetry-unit">klbs</span>
          </div>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">Rotary RPM</span>
          <div className="telemetry-value-box">
            <span className="telemetry-val">{rpm}</span>
            <span className="telemetry-unit">rpm</span>
          </div>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">Surface Torque</span>
          <div className="telemetry-value-box">
            <span
              className="telemetry-val"
              style={{ color: isTorqueHigh ? "#fca5a5" : undefined }}
            >
              {torque}
            </span>
            <span className="telemetry-unit">kft-lb</span>
            {isTorqueHigh && (
              <span style={{ fontSize: 9, color: "#fca5a5", fontWeight: 700, marginLeft: 2 }}>▲</span>
            )}
          </div>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">SPP Pressure</span>
          <div className="telemetry-value-box">
            <span
              className="telemetry-val"
              style={{ color: isPressureAbnormal ? "#fcd34d" : undefined }}
            >
              {pressure}
            </span>
            <span className="telemetry-unit">psi</span>
            {isPressureAbnormal && (
              <span style={{ fontSize: 9, color: "#fcd34d", fontWeight: 700, marginLeft: 2 }}>!</span>
            )}
          </div>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">Flow Rate</span>
          <div className="telemetry-value-box">
            <span className="telemetry-val">{flow}</span>
            <span className="telemetry-unit">gpm</span>
          </div>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">Inc / Az</span>
          <div className="telemetry-value-box">
            <span className="telemetry-val">{inc}°</span>
            <span className="telemetry-unit" style={{ marginLeft: 3 }}>/ {az}°</span>
          </div>
        </div>
      </div>
    </div>
  );
};
