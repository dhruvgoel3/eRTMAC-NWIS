import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polygon,
  Polyline,
  Tooltip as LeafletTooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  Filter,
  Layers,
  MapPin,
  Search,
  ShieldAlert,
  Eye,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Zap,
  Info,
  BarChart2,
  Target,
} from "lucide-react";
import { Well, SimilarWellResult } from "../../types";
import { api } from "../../services/api";

// ─── Types ──────────────────────────────────────────────────────────────────

interface NearbyWell extends Well {
  event_count?: number;
  event_types?: string[];
  max_severity?: string;
  total_npt?: number;
}

interface GISMapTabProps {
  wells: Well[];
  activeWell: Well | null;
  onSelectWell: (well: Well | SimilarWellResult) => void;
  radiusKm: number;
  setRadiusKm: (r: number) => void;
  selectedFormation: string;
  setSelectedFormation: (f: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  "ALL",
  "MUD_LOSS",
  "STUCK_PIPE",
  "KICK",
  "TORQUE_SPIKE",
  "OVERPRESSURE",
  "CEMENTING_ISSUE",
  "FISHING",
  "NPT",
  "GAS_INFLUX",
  "BLOWOUT",
  "WELLBORE_INSTABILITY",
];

const SEVERITY_LEVELS = ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

const FORMATIONS = [
  "ALL",
  "Tipam",
  "Barail",
  "Kopili",
  "Sylhet",
  "Langpur",
  "Namsang",
];

const RADIUS_PRESETS = [5, 10, 20, 50];

const SEVERITY_COLOR: Record<string, string> = {
  LOW: "#10b981",
  MEDIUM: "#f59e0b",
  HIGH: "#f97316",
  CRITICAL: "#f43f5e",
};

// ─── Leaflet Icon Helpers ─────────────────────────────────────────────────────

const createActiveWellIcon = () =>
  L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
        <div style="
          position:absolute;
          width:32px;height:32px;
          border-radius:50%;
          background:rgba(0,210,255,0.15);
          border:2px solid rgba(0,210,255,0.6);
          animation:pulse-ring 2s cubic-bezier(0.215,0.61,0.355,1) infinite;
        "></div>
        <div style="
          width:16px;height:16px;
          border-radius:50%;
          background:#00d2ff;
          border:2px solid white;
          box-shadow:0 0 18px #00d2ff;
          display:flex;align-items:center;justify-content:center;
          position:relative;z-index:2;
        ">
          <div style="width:4px;height:4px;border-radius:50%;background:white;"></div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });

const createOffsetWellIcon = (maxSeverity: string, similarityPct?: number) => {
  const color = SEVERITY_COLOR[maxSeverity] || "#10b981";
  const size = 14;
  const glow =
    maxSeverity === "CRITICAL"
      ? `0 0 10px ${color}`
      : maxSeverity === "HIGH"
      ? `0 0 6px ${color}`
      : "0 2px 6px rgba(0,0,0,0.5)";

  const simBar = similarityPct != null && similarityPct > 0
    ? `<div style="
        position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);
        width:20px;height:2px;border-radius:1px;
        background:linear-gradient(90deg,#a855f7 0%,#00d2ff ${similarityPct}%,rgba(255,255,255,0.1) ${similarityPct}%);
      "></div>`
    : "";

  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="
          width:${size}px;height:${size}px;
          border-radius:50%;
          background:${color};
          border:2px solid rgba(255,255,255,0.8);
          box-shadow:${glow};
          cursor:pointer;
        "></div>
        ${simBar}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
};

// ─── Map View Updater ────────────────────────────────────────────────────────

const MapViewUpdater: React.FC<{ center: [number, number]; zoom?: number }> = ({
  center,
  zoom,
}) => {
  const map = useMap();
  const prevCenter = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (
      prevCenter.current == null ||
      Math.abs(prevCenter.current[0] - center[0]) > 0.001 ||
      Math.abs(prevCenter.current[1] - center[1]) > 0.001
    ) {
      map.setView(center, zoom ?? map.getZoom(), { animate: true });
      prevCenter.current = center;
    }
  }, [center, zoom, map]);

  return null;
};

// ─── Severity Badge ──────────────────────────────────────────────────────────

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const color = SEVERITY_COLOR[severity] || "#64748b";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 7px",
        borderRadius: 99,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        background: color + "22",
        color,
        border: `1px solid ${color}55`,
      }}
    >
      {severity}
    </span>
  );
};

// ─── Similarity Mini-Bar ─────────────────────────────────────────────────────

const SimilarityBar: React.FC<{ score: number; label?: string }> = ({
  score,
  label,
}) => (
  <div style={{ marginTop: 6 }}>
    {label && (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "#64748b",
          marginBottom: 2,
        }}
      >
        <span>{label}</span>
        <span style={{ color: "#a855f7", fontWeight: 700 }}>
          {score.toFixed(0)}%
        </span>
      </div>
    )}
    <div
      style={{
        height: 4,
        borderRadius: 2,
        background: "rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${score}%`,
          borderRadius: 2,
          background: `linear-gradient(90deg, #a855f7, #00d2ff)`,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const GISMapTab: React.FC<GISMapTabProps> = ({
  wells: allWells,
  activeWell,
  onSelectWell,
  radiusKm,
  setRadiusKm,
  selectedFormation,
  setSelectedFormation,
}) => {
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [depthMin, setDepthMin] = useState<number | "">("");
  const [depthMax, setDepthMax] = useState<number | "">("");

  // Map API State (Carto basemaps & GIS layers)
  const [mapConfig, setMapConfig] = useState<any>(null);
  const [mapLayers, setMapLayers] = useState<any>(null);
  const [selectedBasemap, setSelectedBasemap] = useState<string>("carto-dark");
  const [showFields, setShowFields] = useState<boolean>(true);
  const [showFaults, setShowFaults] = useState<boolean>(true);

  // API-driven nearby wells
  const [nearbyWells, setNearbyWells] = useState<NearbyWell[]>([]);
  const [similarityMap, setSimilarityMap] = useState<
    Record<string, number>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Selected well for the sidebar dossier preview
  const [highlightedWell, setHighlightedWell] = useState<NearbyWell | null>(
    null
  );

  const centerLat = activeWell?.latitude ?? 27.2;
  const centerLon = activeWell?.longitude ?? 95.1;

  // ── Fetch GIS Basemap Config and Layers ──────────────────────────────────
  useEffect(() => {
    api.getMapConfig().then((cfg) => {
      if (cfg) {
        setMapConfig(cfg);
        if (cfg.default_provider) {
          setSelectedBasemap(cfg.default_provider);
        }
      }
    }).catch((err) => {
      console.warn("Failed to load map config:", err);
    });


    api.getMapLayers().then((layers) => {
      if (layers) setMapLayers(layers);
    }).catch((err) => {
      console.warn("Failed to load map layers:", err);
    });
  }, []);

  // ── Fetch nearby wells from Backend Map API ───────────────────────────────
  const fetchNearby = useCallback(async () => {
    if (!activeWell) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await api.getMapNearby({
        lat: activeWell.latitude,
        lon: activeWell.longitude,
        radius_km: radiusKm,
        formation: selectedFormation !== "ALL" ? selectedFormation : undefined,
        event_type: selectedEventType !== "ALL" ? selectedEventType : undefined,
        severity: selectedSeverity !== "ALL" ? selectedSeverity : undefined,
      });
      setNearbyWells(data);
      setLastFetch(new Date());
    } catch (err: any) {
      console.warn("Falling back to local offset wells query:", err);
      // Fallback to client-side offset distance calculation
      const fallback: NearbyWell[] = allWells
        .filter((w) => !w.is_active)
        .map((w) => {
          const dLat = (w.latitude - activeWell.latitude) * 111.32;
          const dLon =
            (w.longitude - activeWell.longitude) *
            111.32 *
            Math.cos((activeWell.latitude * Math.PI) / 180);
          const dist = Math.sqrt(dLat * dLat + dLon * dLon);
          return {
            ...w,
            distance_km: Math.round(dist * 10) / 10,
            event_count: 0,
            max_severity: "LOW",
            event_types: [],
            total_npt: 0,
          };
        })
        .filter((w) => (w.distance_km ?? 999) <= radiusKm);
      setNearbyWells(fallback);
      setFetchError(err.message || "Using cached offset wells");
    } finally {
      setIsLoading(false);
    }
  }, [activeWell, allWells, radiusKm, selectedFormation, selectedEventType, selectedSeverity]);

  // ── Fetch similarity scores ───────────────────────────────────────────────
  const fetchSimilarity = useCallback(async () => {
    if (!activeWell) return;
    try {
      const simWells = await api.getSimilarWells(activeWell.well_id, 50, 20);
      const map: Record<string, number> = {};
      simWells.forEach((s) => {
        map[s.well_id] = s.similarity_score * 100;
      });
      setSimilarityMap(map);
    } catch {
      // non-critical
    }
  }, [activeWell]);

  useEffect(() => {
    fetchNearby();
  }, [fetchNearby]);


  useEffect(() => {
    fetchSimilarity();
  }, [fetchSimilarity]);

  // ── Client-side depth + search filter on top of API results ──────────────
  const filteredWells = nearbyWells.filter((w) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !w.name.toLowerCase().includes(q) &&
        !w.well_id.toLowerCase().includes(q)
      )
        return false;
    }
    if (depthMin !== "" && w.total_depth < Number(depthMin)) return false;
    if (depthMax !== "" && w.total_depth > Number(depthMax)) return false;
    return true;
  });

  // ── Well list including active well pinned at top ─────────────────────────
  const activeWellEntry = activeWell
    ? [{ ...activeWell, event_count: 0, event_types: [], max_severity: "LOW", total_npt: 0 }]
    : [];

  const displayWells = [
    ...activeWellEntry,
    ...filteredWells,
  ] as NearbyWell[];

  const totalNPT = filteredWells.reduce((s, w) => s + (w.total_npt || 0), 0);
  const criticalCount = filteredWells.filter(
    (w) => w.max_severity === "CRITICAL"
  ).length;
  const highCount = filteredWells.filter(
    (w) => w.max_severity === "HIGH"
  ).length;

  // ── Reset filters ─────────────────────────────────────────────────────────
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedEventType("ALL");
    setSelectedSeverity("ALL");
    setDepthMin("");
    setDepthMax("");
    setSelectedFormation("ALL");
    setRadiusKm(20);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 360px",
        gap: 20,
        height: "100%",
      }}
    >
      {/* ── Left: Map Panel ── */}
      <div className="glass-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MapPin size={20} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>
              Assam Basin — Offset Wells Spatial Explorer
            </h2>
            <span className="badge badge-cyan">
              {filteredWells.length} Offset Wells
            </span>
            {isLoading && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <RefreshCw size={11} style={{ animation: "spin 1s linear infinite" }} />
                Loading…
              </span>
            )}
            {fetchError && (
              <span style={{ fontSize: 11, color: "var(--accent-rose)", display: "flex", alignItems: "center", gap: 4 }}>
                <AlertTriangle size={11} />
                {fetchError}
              </span>
            )}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 11 }}>
            {[
              { color: "#00d2ff", label: `Active (${activeWell?.well_id || "OIL-X123"})` },
              { color: "#f43f5e", label: "Critical" },
              { color: "#f97316", label: "High" },
              { color: "#f59e0b", label: "Medium" },
              { color: "#10b981", label: "Low" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, display: "inline-block" }} />
                <span style={{ color: "var(--text-muted)" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map Controls Toolbar: Radius, Basemap Switcher, Layer Toggles */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Radius:</span>
          {RADIUS_PRESETS.map((r) => (
            <button
              key={r}
              onClick={() => setRadiusKm(r)}
              style={{
                padding: "3px 12px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                border: "1px solid",
                borderColor: radiusKm === r ? "var(--accent-cyan)" : "var(--border-subtle)",
                background: radiusKm === r ? "rgba(0,210,255,0.15)" : "transparent",
                color: radiusKm === r ? "var(--accent-cyan)" : "var(--text-muted)",
                transition: "all 0.15s ease",
              }}
            >
              {r} km
            </button>
          ))}

          {/* Basemap Switcher */}
          <span style={{ marginLeft: 12, fontSize: 11, color: "var(--text-muted)" }}>Basemap:</span>
          <select
            value={selectedBasemap}
            onChange={(e) => setSelectedBasemap(e.target.value)}
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              fontSize: 11,
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
              cursor: "pointer",
            }}
          >
            <option value="esri-dark">Dark Canvas (Clean / No Watermark)</option>
            <option value="carto-dark">
              Carto Dark Matter {mapConfig?.carto_api_key_configured ? "✓" : "(API Key Required)"}
            </option>
            <option value="carto-light">
              Carto Positron {mapConfig?.carto_api_key_configured ? "✓" : "(API Key Required)"}
            </option>
            <option value="carto-voyager">
              Carto Voyager {mapConfig?.carto_api_key_configured ? "✓" : "(API Key Required)"}
            </option>
            <option value="satellite">Esri Satellite</option>
            <option value="osm">OpenStreetMap</option>
          </select>

          {/* Geological Layer Toggles */}
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)", cursor: "pointer", marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={showFields}
              onChange={(e) => setShowFields(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            Oil Fields
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showFaults}
              onChange={(e) => setShowFaults(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            Fault Hazards
          </label>

          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
            {lastFetch && `Updated ${lastFetch.toLocaleTimeString()}`}
          </span>
          <button
            onClick={fetchNearby}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              cursor: "pointer",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>

        {/* Leaflet Map */}
        <div style={{ flex: 1, minHeight: 540, borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          <MapContainer
            center={[centerLat, centerLon]}
            zoom={11}
            scrollWheelZoom
            style={{ height: "100%", width: "100%", minHeight: 540, borderRadius: "var(--radius-md)" }}
          >
            <MapViewUpdater center={[centerLat, centerLon]} zoom={11} />

            {/* Dynamic Basemap from Map API */}
            <TileLayer
              key={selectedBasemap}
              attribution={
                mapConfig?.providers?.[selectedBasemap]?.attribution ||
                '&copy; <a href="https://www.esri.com/">Esri</a>, CartoDB'
              }
              url={
                mapConfig?.providers?.[selectedBasemap]?.url ||
                (selectedBasemap === "carto-dark"
                  ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  : selectedBasemap === "carto-light"
                  ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  : selectedBasemap === "carto-voyager"
                  ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  : selectedBasemap === "satellite"
                  ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  : selectedBasemap === "osm"
                  ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  : "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}")
              }
            />

            {/* Geological Concession Field Overlays */}
            {showFields &&
              mapLayers?.fields?.features?.map((f: any, idx: number) => {
                const positions = f.geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);
                return (
                  <Polygon
                    key={`field-${idx}`}
                    positions={positions}
                    pathOptions={{
                      color: f.properties?.color || "#00d2ff",
                      fillColor: f.properties?.color || "#00d2ff",
                      fillOpacity: 0.08,
                      weight: 1.5,
                      dashArray: "4, 6",
                    }}
                  >
                    <LeafletTooltip sticky>
                      <div style={{ fontSize: 11, padding: 2 }}>
                        <strong>{f.properties?.name}</strong>
                        <div>{f.properties?.type}</div>
                      </div>
                    </LeafletTooltip>
                  </Polygon>
                );
              })}

            {/* Structural Fault Hazard Lines */}
            {showFaults &&
              mapLayers?.faults?.features?.map((f: any, idx: number) => {
                const positions = f.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
                return (
                  <Polyline
                    key={`fault-${idx}`}
                    positions={positions}
                    pathOptions={{
                      color: f.properties?.color || "#f43f5e",
                      weight: 2.5,
                      dashArray: "6, 6",
                    }}
                  >
                    <LeafletTooltip sticky>
                      <div style={{ fontSize: 11, padding: 2 }}>
                        <strong style={{ color: "#f43f5e" }}>{f.properties?.name}</strong>
                        <div>Hazard: {f.properties?.hazard_level}</div>
                        <div style={{ color: "#94a3b8" }}>{f.properties?.risk}</div>
                      </div>
                    </LeafletTooltip>
                  </Polyline>
                );
              })}


            {/* Radius circle */}
            {activeWell && (
              <Circle
                center={[activeWell.latitude, activeWell.longitude]}
                radius={radiusKm * 1000}
                pathOptions={{
                  color: "#00d2ff",
                  fillColor: "#00d2ff",
                  fillOpacity: 0.05,
                  weight: 1.5,
                  dashArray: "6, 8",
                }}
              />
            )}

            {/* Active well marker */}
            {activeWell && (
              <Marker
                position={[activeWell.latitude, activeWell.longitude]}
                icon={createActiveWellIcon()}
                zIndexOffset={1000}
              >
                <Popup>
                  <div style={{ padding: 6, minWidth: 220 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <strong style={{ fontSize: 14, color: "#00d2ff" }}>
                        {activeWell.name}
                      </strong>
                      <span className="badge badge-emerald">ACTIVE</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>
                      ID: <strong style={{ color: "#e2e8f0" }}>{activeWell.well_id}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      Formation: <strong style={{ color: "#e2e8f0" }}>{activeWell.formation}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      Total Depth: <strong style={{ color: "#e2e8f0" }}>{activeWell.total_depth}m</strong>
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      Trajectory: <strong style={{ color: "#e2e8f0" }}>{activeWell.trajectory_type}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                      Mud Weight: <strong style={{ color: "#e2e8f0" }}>{activeWell.mud_weight} ppg</strong>
                    </div>
                    <div style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: "rgba(0,210,255,0.08)",
                      border: "1px solid rgba(0,210,255,0.2)",
                      fontSize: 11,
                      color: "#00d2ff",
                      textAlign: "center",
                    }}>
                      ⚡ Currently Drilling — Live Simulation Active
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Offset well markers */}
            {filteredWells.map((well) => {
              const simPct = similarityMap[well.well_id] ?? 0;
              const maxSev = well.max_severity || "LOW";
              return (
                <Marker
                  key={well.id}
                  position={[well.latitude, well.longitude]}
                  icon={createOffsetWellIcon(maxSev, simPct)}
                >
                  <Popup>
                    <div style={{ padding: 6, minWidth: 240 }}>
                      {/* Header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <strong style={{ fontSize: 14, color: "#38bdf8" }}>{well.name}</strong>
                        <SeverityBadge severity={maxSev} />
                      </div>

                      {/* ID + distance */}
                      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>
                        <strong style={{ color: "#e2e8f0" }}>{well.well_id}</strong>
                        {" "}&nbsp;•&nbsp;{" "}
                        <span style={{ color: "#34d399" }}>
                          {well.distance_km != null
                            ? `${Number(well.distance_km).toFixed(2)} km away`
                            : "—"}
                        </span>
                      </div>

                      {/* Key stats grid */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "3px 12px",
                        fontSize: 11,
                        color: "#94a3b8",
                        marginTop: 6,
                        marginBottom: 4,
                      }}>
                        <span>Formation</span>
                        <strong style={{ color: "#e2e8f0" }}>{well.formation}</strong>
                        <span>Total Depth</span>
                        <strong style={{ color: "#e2e8f0" }}>{well.total_depth}m</strong>
                        <span>Events</span>
                        <strong style={{ color: "#fbbf24" }}>{well.event_count ?? 0}</strong>
                        <span>Total NPT</span>
                        <strong style={{ color: "#f87171" }}>{(well.total_npt ?? 0).toFixed(1)}h</strong>
                        <span>Mud Weight</span>
                        <strong style={{ color: "#e2e8f0" }}>{well.mud_weight} ppg</strong>
                        <span>Trajectory</span>
                        <strong style={{ color: "#e2e8f0" }}>{well.trajectory_type}</strong>
                      </div>

                      {/* Event types */}
                      {well.event_types && well.event_types.length > 0 && (
                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {well.event_types.slice(0, 5).map((et) => (
                            <span
                              key={et}
                              style={{
                                fontSize: 9,
                                padding: "1px 5px",
                                borderRadius: 3,
                                background: "rgba(245,158,11,0.12)",
                                color: "#f59e0b",
                                border: "1px solid rgba(245,158,11,0.3)",
                                fontWeight: 600,
                              }}
                            >
                              {et}
                            </span>
                          ))}
                          {well.event_types.length > 5 && (
                            <span style={{ fontSize: 9, color: "#64748b" }}>
                              +{well.event_types.length - 5} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Similarity bar */}
                      {simPct > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <SimilarityBar score={simPct} label="Geological Similarity to OIL-X123" />
                        </div>
                      )}

                      {/* CTA */}
                      <button
                        onClick={() => onSelectWell(well)}
                        style={{
                          marginTop: 10,
                          width: "100%",
                          padding: "6px 10px",
                          borderRadius: 6,
                          background: "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(168,85,247,0.15))",
                          border: "1px solid rgba(56,189,248,0.3)",
                          color: "#38bdf8",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <Eye size={12} />
                        Open Full Well Intelligence Dossier
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Stats Footer */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
        }}>
          {[
            { icon: <Target size={13} />, label: "Offset Wells", value: filteredWells.length, color: "var(--accent-cyan)" },
            { icon: <ShieldAlert size={13} />, label: "Critical", value: criticalCount, color: "#f43f5e" },
            { icon: <AlertTriangle size={13} />, label: "High Risk", value: highCount, color: "#f97316" },
            { icon: <BarChart2 size={13} />, label: "Total NPT", value: `${totalNPT.toFixed(0)}h`, color: "#f59e0b" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                padding: "8px 14px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ color: stat.color }}>{stat.icon}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: stat.color }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Filters + Wells List ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Filter Card */}
        <div className="glass-card" style={{ padding: 16 }}>
          <div className="card-title" style={{ marginBottom: 14 }}>
            <Filter size={15} color="var(--accent-cyan)" />
            Spatial &amp; Geological Filters
          </div>

          {/* Search */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 4, letterSpacing: "0.06em" }}>
              SEARCH WELL
            </label>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                className="input-control"
                style={{ width: "100%", paddingLeft: 28 }}
                placeholder="OIL-X104…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Radius slider */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: "var(--text-muted)" }}>Offset Radius</span>
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

          {/* Formation */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 4, letterSpacing: "0.06em" }}>
              FORMATION
            </label>
            <select
              className="input-control"
              style={{ width: "100%" }}
              value={selectedFormation}
              onChange={(e) => setSelectedFormation(e.target.value)}
            >
              {FORMATIONS.map((f) => (
                <option key={f} value={f}>
                  {f === "ALL" ? "All Formations" : f}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 4, letterSpacing: "0.06em" }}>
              EVENT TYPE
            </label>
            <select
              className="input-control"
              style={{ width: "100%" }}
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "ALL" ? "All Event Types" : t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 4, letterSpacing: "0.06em" }}>
              MIN SEVERITY
            </label>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {SEVERITY_LEVELS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSeverity(s)}
                  style={{
                    flex: 1,
                    padding: "4px 6px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor:
                      selectedSeverity === s
                        ? (SEVERITY_COLOR[s] || "var(--accent-cyan)")
                        : "var(--border-subtle)",
                    background:
                      selectedSeverity === s
                        ? ((SEVERITY_COLOR[s] || "#00d2ff") + "22")
                        : "transparent",
                    color:
                      selectedSeverity === s
                        ? (SEVERITY_COLOR[s] || "var(--accent-cyan)")
                        : "var(--text-muted)",
                    transition: "all 0.12s ease",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Depth range */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 4, letterSpacing: "0.06em" }}>
              DEPTH RANGE (m)
            </label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="number"
                className="input-control"
                style={{ flex: 1 }}
                placeholder="Min"
                value={depthMin}
                onChange={(e) => setDepthMin(e.target.value === "" ? "" : Number(e.target.value))}
              />
              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>–</span>
              <input
                type="number"
                className="input-control"
                style={{ flex: 1 }}
                placeholder="Max"
                value={depthMax}
                onChange={(e) => setDepthMax(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={resetFilters}
            style={{
              width: "100%",
              padding: "7px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-elevated)",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.12s ease",
            }}
          >
            <RefreshCw size={11} /> Reset All Filters
          </button>
        </div>

        {/* Wells List Card */}
        <div className="glass-card" style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div className="card-title" style={{ margin: 0 }}>
              <Layers size={15} color="var(--accent-emerald)" />
              Wells in Radius
            </div>
            <span className="badge badge-cyan">{filteredWells.length}</span>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxHeight: 520,
              paddingRight: 4,
            }}
          >
            {/* Active well entry */}
            {activeWell && (
              <div
                style={{
                  background: "rgba(0,210,255,0.08)",
                  border: "1px solid rgba(0,210,255,0.3)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                  marginBottom: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <strong style={{ fontSize: 13, color: "var(--accent-cyan)" }}>
                        {activeWell.well_id}
                      </strong>
                      <span className="badge badge-emerald">ACTIVE</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {activeWell.formation} • TD: {activeWell.total_depth}m
                    </div>
                    <div style={{ fontSize: 10, color: "#00d2ff", marginTop: 1 }}>
                      ⚡ Currently Drilling
                    </div>
                  </div>
                  <Zap size={14} color="var(--accent-cyan)" />
                </div>
              </div>
            )}

            {filteredWells.length === 0 && !isLoading && (
              <div style={{ textAlign: "center", padding: "20px 10px", color: "var(--text-muted)", fontSize: 12 }}>
                <Info size={18} style={{ display: "block", margin: "0 auto 8px" }} />
                No wells found with current filters.
                <br />
                <span style={{ fontSize: 11 }}>Try increasing radius or relaxing filters.</span>
              </div>
            )}

            {filteredWells.map((w) => {
              const simPct = similarityMap[w.well_id];
              const maxSev = w.max_severity || "LOW";
              const isHighlighted = highlightedWell?.id === w.id;
              return (
                <div
                  key={w.id}
                  onClick={() => {
                    setHighlightedWell(w);
                    onSelectWell(w);
                  }}
                  style={{
                    background: isHighlighted ? "rgba(56,189,248,0.08)" : "var(--bg-elevated)",
                    border: `1px solid ${isHighlighted ? "rgba(56,189,248,0.35)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 12px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <strong style={{ fontSize: 13 }}>{w.well_id}</strong>
                        <SeverityBadge severity={maxSev} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {w.formation} • TD: {w.total_depth}m
                      </div>
                      {w.distance_km != null && (
                        <div style={{ fontSize: 11, color: "var(--accent-emerald)", marginTop: 1 }}>
                          {Number(w.distance_km).toFixed(2)} km •{" "}
                          <span style={{ color: "#fbbf24" }}>
                            {w.event_count ?? 0} events
                          </span>
                          {(w.total_npt ?? 0) > 0 && (
                            <span style={{ color: "#f87171" }}>
                              {" "}• {(w.total_npt ?? 0).toFixed(0)}h NPT
                            </span>
                          )}
                        </div>
                      )}
                      {simPct != null && (
                        <SimilarityBar score={simPct} />
                      )}
                    </div>
                    <ChevronRight size={14} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CSS for pulsing active well */}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(0.7); opacity: 0.8; }
          80%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .leaflet-popup-content-wrapper {
          background: #0d1424 !important;
          border: 1px solid rgba(56,189,248,0.25) !important;
          color: #f8fafc !important;
          border-radius: 10px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        }
        .leaflet-popup-tip {
          background: #0d1424 !important;
        }
        .leaflet-popup-content {
          margin: 10px 12px !important;
        }
      `}</style>
    </div>
  );
};
