import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import { Filter, Layers, MapPin, Search, ShieldAlert, Eye, ChevronRight } from "lucide-react";
import { Well } from "../../types";

interface GISMapTabProps {
  wells: Well[];
  activeWell: Well | null;
  onSelectWell: (well: Well) => void;
  radiusKm: number;
  setRadiusKm: (r: number) => void;
  selectedFormation: string;
  setSelectedFormation: (f: string) => void;
}

// Custom Leaflet DivIcons
const createWellIcon = (isActive: boolean, hasCritical: boolean, hasHigh: boolean) => {
  const color = isActive
    ? "#00d2ff"
    : hasCritical
    ? "#f43f5e"
    : hasHigh
    ? "#f59e0b"
    : "#10b981";

  const size = isActive ? 24 : 16;

  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 0 ${isActive ? "14px #00d2ff" : "6px rgba(0,0,0,0.5)"};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        ${isActive ? '<div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>' : ""}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

export const GISMapTab: React.FC<GISMapTabProps> = ({
  wells,
  activeWell,
  onSelectWell,
  radiusKm,
  setRadiusKm,
  selectedFormation,
  setSelectedFormation,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("ALL");

  const centerLat = activeWell ? activeWell.latitude : 27.2;
  const centerLon = activeWell ? activeWell.longitude : 95.1;

  // Filter wells
  const filteredWells = wells.filter((w) => {
    if (w.is_active) return true; // always show active well
    if (selectedFormation !== "ALL" && w.formation !== selectedFormation) return false;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchName = w.name.toLowerCase().includes(q) || w.well_id.toLowerCase().includes(q);
      if (!matchName) return false;
    }
    return true;
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
      {/* Map Main Panel */}
      <div className="glass-card" style={{ padding: 16 }}>
        {/* Map Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MapPin size={20} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>
              Assam Basin Offset Wells Spatial Explorer
            </h2>
            <span className="badge badge-cyan">
              {filteredWells.length} Wells Displayed
            </span>
          </div>

          {/* Map Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#00d2ff" }} />
              <span>Active Well ({activeWell?.well_id || "OIL-X123"})</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f43f5e" }} />
              <span>Critical Incidents</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
              <span>Moderate Incidents</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981" }} />
              <span>Normal Operation</span>
            </div>
          </div>
        </div>

        {/* Leaflet Map */}
        <MapContainer
          center={[centerLat, centerLon]}
          zoom={11}
          scrollWheelZoom={true}
          style={{ height: "620px", borderRadius: "var(--radius-md)", overflow: "hidden" }}
        >
          {/* CartoDB Dark Matter Basemap */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CartoDB</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Active Well Radius Circle */}
          {activeWell && (
            <Circle
              center={[activeWell.latitude, activeWell.longitude]}
              radius={radiusKm * 1000}
              pathOptions={{
                color: "#00d2ff",
                fillColor: "#00d2ff",
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: "6, 8",
              }}
            />
          )}

          {/* Well Markers */}
          {filteredWells.map((well) => {
            const isActive = well.is_active;
            const hasCritical = well.events?.some((e) => e.severity === "CRITICAL") || false;
            const hasHigh = well.events?.some((e) => e.severity === "HIGH") || false;

            return (
              <Marker
                key={well.id}
                position={[well.latitude, well.longitude]}
                icon={createWellIcon(isActive, hasCritical, hasHigh)}
              >
                <Popup>
                  <div style={{ padding: 4, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <strong style={{ fontSize: 14, color: "#38bdf8" }}>{well.name}</strong>
                      {isActive && <span className="badge badge-emerald">ACTIVE</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>
                      ID: <strong>{well.well_id}</strong> • {well.field}
                    </div>
                    <div style={{ fontSize: 12, color: "#cbd5e1" }}>
                      Formation: <strong>{well.formation}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: "#cbd5e1" }}>
                      Total Depth: <strong>{well.total_depth}m</strong>
                    </div>
                    <div style={{ fontSize: 12, color: "#cbd5e1" }}>
                      Mud Weight: <strong>{well.mud_weight} ppg</strong>
                    </div>
                    {well.distance_km != null && (
                      <div style={{ fontSize: 12, color: "#34d399", marginTop: 2 }}>
                        Distance: <strong>{Number(well.distance_km).toFixed(1)} km</strong> from active rig
                      </div>
                    )}
                    <button
                      className="btn-primary"
                      onClick={() => onSelectWell(well)}
                      style={{
                        marginTop: 10,
                        width: "100%",
                        padding: "5px 10px",
                        fontSize: 11,
                        justifyContent: "center",
                      }}
                    >
                      <Eye size={12} />
                      Open Full Well Dossier
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Filter & Wells List Sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Controls Card */}
        <div className="glass-card">
          <div className="card-title" style={{ marginBottom: 14 }}>
            <Filter size={16} color="var(--accent-cyan)" />
            Spatial & Geological Filters
          </div>

          {/* Search Box */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              SEARCH WELL
            </label>
            <input
              type="text"
              className="input-control"
              style={{ width: "100%" }}
              placeholder="Search by ID or name (e.g. OIL-X104)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Radius Slider */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: "var(--text-muted)" }}>Offset Radius:</span>
              <strong style={{ color: "var(--accent-cyan)" }}>{radiusKm} km</strong>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent-cyan)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)" }}>
              <span>5 km</span>
              <span>20 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Formation Filter */}
          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              FORMATION LAYER
            </label>
            <select
              className="input-control"
              style={{ width: "100%" }}
              value={selectedFormation}
              onChange={(e) => setSelectedFormation(e.target.value)}
            >
              <option value="ALL">All Formations (Regional View)</option>
              <option value="Tipam">Tipam Sandstone (Active Layer)</option>
              <option value="Barail">Barail Formation</option>
              <option value="Kopili">Kopili Shale</option>
              <option value="Sylhet">Sylhet Limestone</option>
              <option value="Langpur">Langpur Formation</option>
              <option value="Namsang">Namsang Sandstone</option>
            </select>
          </div>
        </div>

        {/* Wells List Card */}
        <div className="glass-card" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="card-header" style={{ marginBottom: 10 }}>
            <div className="card-title">
              <Layers size={16} color="var(--accent-emerald)" />
              Wells in Radius ({filteredWells.length})
            </div>
          </div>

          <div
            style={{
              overflowY: "auto",
              maxHeight: "410px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              paddingRight: 4,
            }}
          >
            {filteredWells.map((w) => (
              <div
                key={w.id}
                onClick={() => onSelectWell(w)}
                style={{
                  background: w.is_active ? "rgba(0, 210, 255, 0.1)" : "var(--bg-elevated)",
                  border: "1px solid " + (w.is_active ? "rgba(0, 210, 255, 0.4)" : "var(--border-subtle)"),
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <strong style={{ fontSize: 13, color: w.is_active ? "var(--accent-cyan)" : "inherit" }}>
                      {w.well_id}
                    </strong>
                    {w.is_active && <span className="badge badge-emerald">ACTIVE</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {w.formation} • TD: {w.total_depth}m
                  </div>
                  {w.distance_km != null && !w.is_active && (
                    <div style={{ fontSize: 11, color: "var(--accent-emerald)" }}>
                      {Number(w.distance_km).toFixed(1)} km away
                    </div>
                  )}
                </div>

                <ChevronRight size={14} color="var(--text-muted)" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
