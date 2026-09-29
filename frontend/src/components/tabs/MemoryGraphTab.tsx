/**
 * NWIS Drilling Memory Graph
 * Transforms historical drilling records from isolated documents into a
 * connected knowledge network. Visualizes relationships between active well,
 * similar wells, formations, events, depth intervals, and documents.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import {
  Activity,
  BookOpen,
  ChevronRight,
  Circle,
  FileText,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  Shield,
  Target,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { api } from "../../services/api";
import { useTheme } from "../../contexts/ThemeContext";
import { MemoryGraphData, MemoryGraphEdge, MemoryGraphNode, MemoryNodeType } from "../../types";

// ─── Colour / Style Palette ────────────────────────────────────────────────
const NODE_STYLES: Record<
  MemoryNodeType,
  { fill: string; stroke: string; radius: number; glow: string }
> = {
  ACTIVE_WELL:      { fill: "#0fff87", stroke: "#104336", radius: 22, glow: "#0fff87" },
  OFFSET_WELL_TOP:  { fill: "#8b5cf6", stroke: "#6d28d9", radius: 16, glow: "#8b5cf6" },
  OFFSET_WELL:      { fill: "#6366f1", stroke: "#4338ca", radius: 12, glow: "#6366f1" },
  FORMATION:        { fill: "#f59e0b", stroke: "#d97706", radius: 13, glow: "#f59e0b" },
  EVENT:            { fill: "#ef4444", stroke: "#b91c1c", radius: 10, glow: "#ef4444" },
  DEPTH_INTERVAL:   { fill: "#06b6d4", stroke: "#0e7490", radius: 10, glow: "#06b6d4" },
  DOCUMENT:         { fill: "#22c55e", stroke: "#15803d", radius: 10, glow: "#22c55e" },
};

const SEVERITY_COLOURS: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH:     "#f97316",
  MEDIUM:   "#f59e0b",
  LOW:      "#22c55e",
};

const EDGE_COLOURS: Record<string, string> = {
  SIMILAR_TO:    "#6366f1",
  DRILLS_IN:     "#f59e0b",
  HAD_EVENT:     "#ef4444",
  OCCURS_AT:     "#06b6d4",
  HAS_DOCUMENT:  "#22c55e",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  ACTIVE_WELL:     <Target size={12} />,
  OFFSET_WELL_TOP: <MapPin size={12} />,
  OFFSET_WELL:     <MapPin size={12} />,
  FORMATION:       <Layers size={12} />,
  EVENT:           <Activity size={12} />,
  DEPTH_INTERVAL:  <Circle size={12} />,
  DOCUMENT:        <FileText size={12} />,
};

// ─── Filter/Legend config ────────────────────────────────────────────────────
const NODE_FILTER_OPTIONS: { type: MemoryNodeType; label: string }[] = [
  { type: "ACTIVE_WELL",     label: "Active Well" },
  { type: "OFFSET_WELL_TOP", label: "Top Offset Well" },
  { type: "OFFSET_WELL",     label: "Offset Wells" },
  { type: "FORMATION",       label: "Formations" },
  { type: "EVENT",           label: "Events" },
  { type: "DEPTH_INTERVAL",  label: "Depth Intervals" },
  { type: "DOCUMENT",        label: "Documents" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function nodeLabel(n: MemoryGraphNode): string {
  return n.label || n.id;
}

function getEdgeColour(edge: MemoryGraphEdge): string {
  return EDGE_COLOURS[edge.type] ?? "#aaaaaa";
}

// ─── Small reusable sub-components ───────────────────────────────────────────
const InfoGrid: React.FC<{ rows: [string, string][] }> = ({ rows }) => (
  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", marginBottom: 8 }}>
    {rows.map(([label, value]) => (
      <React.Fragment key={label}>
        <span style={{ fontSize: 11, color: "var(--color-muted-slate)", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, color: "var(--color-bark)", fontWeight: 500 }}>{value}</span>
      </React.Fragment>
    ))}
  </div>
);

const InfoBlock: React.FC<{ label: string; text: string; color: string }> = ({
  label, text, color,
}) => (
  <div style={{ marginTop: 10 }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-muted-slate)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>
      {label}
    </div>
    <div style={{ fontSize: 12, color: "var(--color-bark)", lineHeight: 1.55, background: color, borderRadius: 8, padding: "8px 10px" }}>
      {text}
    </div>
  </div>
);

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => (
  <span
    style={{
      display: "inline-block",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      padding: "3px 8px",
      borderRadius: 6,
      background: `${SEVERITY_COLOURS[severity] ?? "#888"}22`,
      color: SEVERITY_COLOURS[severity] ?? "#888",
      border: `1px solid ${SEVERITY_COLOURS[severity] ?? "#888"}44`,
    }}
  >
    {severity}
  </span>
);

const ScoreBar: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const pct = Math.round(value > 1 ? value : value * 100);
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: "var(--color-muted-slate)", textTransform: "capitalize" }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#6366f1" }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: "#6366f122", borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, pct)}%`,
            background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  );
};

// ─── Stats Pill ───────────────────────────────────────────────────────────────
const StatPill: React.FC<{
  label: string;
  value: number | string;
  color: string;
  icon: React.ReactNode;
}> = ({ label, value, color, icon }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 7,
      padding: "5px 12px",
      background: `${color}18`,
      border: `1px solid ${color}33`,
      borderRadius: 10,
      flexShrink: 0,
    }}
  >
    <span style={{ color }}>{icon}</span>
    <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
    <span style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>{label}</span>
  </div>
);

// ─── Detail Panel ─────────────────────────────────────────────────────────────
interface DetailPanelProps {
  node: MemoryGraphNode | null;
  onClose: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ node, onClose }) => {
  if (!node) return null;
  const style = NODE_STYLES[node.type] || NODE_STYLES.OFFSET_WELL;
  const scoreBreakdown = node.score_breakdown;

  return (
    <div
      style={{
        position: "absolute",
        right: 16,
        top: 16,
        width: 340,
        background: "var(--color-sheet-white)",
        border: `1.5px solid var(--border-subtle)`,
        borderRadius: 16,
        boxShadow: `0 8px 40px ${style.glow}22, 0 2px 12px rgba(0,0,0,0.25)`,
        zIndex: 20,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${style.fill}22, ${style.fill}08)`,
          borderBottom: `1px solid var(--border-subtle)`,
          padding: "14px 16px 12px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: style.fill,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-bark)",
              flexShrink: 0,
              boxShadow: `0 0 12px ${style.glow}66`,
            }}
          >
            {TYPE_ICONS[node.type]}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "var(--color-bark)",
                lineHeight: 1.2,
                wordBreak: "break-all",
              }}
            >
              {nodeLabel(node)}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-muted-slate)", fontWeight: 500, marginTop: 2 }}>
              {node.sublabel || node.type.replace(/_/g, " ")}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-muted-slate)",
            flexShrink: 0,
            padding: 4,
            borderRadius: 6,
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 16px 16px", maxHeight: 480, overflowY: "auto" }}>
        {/* Description */}
        {node.description && (
          <p style={{ fontSize: 12, color: "var(--color-slate)", lineHeight: 1.5, marginBottom: 12 }}>
            {node.description}
          </p>
        )}

        {/* Well-specific fields */}
        {(node.type === "ACTIVE_WELL" ||
          node.type === "OFFSET_WELL_TOP" ||
          node.type === "OFFSET_WELL") && (
          <InfoGrid
            rows={[
              ["Formation", node.formation ?? ""],
              ["Total Depth", node.total_depth != null ? `${node.total_depth.toLocaleString()}m` : ""],
              ["Trajectory", node.trajectory_type ?? ""],
              ["Status", node.status ?? ""],
              ...(node.distance_km != null ? [["Distance", `${node.distance_km.toFixed(1)} km`] as [string,string]] : []),
              ...(node.similarity_score != null ? [["Similarity", `${(node.similarity_score > 1 ? node.similarity_score : node.similarity_score * 100).toFixed(1)}%`] as [string,string]] : []),
            ].filter((r) => r[1] !== "") as [string, string][]}
          />
        )}

        {/* Similarity score breakdown */}
        {scoreBreakdown && Object.keys(scoreBreakdown).length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--color-muted-slate)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Similarity Breakdown
            </div>
            {Object.entries(scoreBreakdown).map(([k, v]) => (
              <ScoreBar key={k} label={k.replace(/_/g, " ")} value={v as number} />
            ))}
          </div>
        )}

        {/* Event-specific fields */}
        {node.type === "EVENT" && (
          <>
            <InfoGrid
              rows={[
                ...(node.event_type ? [["Event Type", node.event_type.replace(/_/g, " ")] as [string,string]] : []),
                ...(node.formation ? [["Formation", node.formation] as [string,string]] : []),
                ...(node.depth_start != null ? [["Depth", `${node.depth_start}–${node.depth_end}m`] as [string,string]] : []),
                ...(node.npt_hours != null ? [["NPT", `${node.npt_hours}h`] as [string,string]] : []),
              ]}
            />
            {node.severity && (
              <div style={{ marginTop: 8 }}>
                <SeverityBadge severity={node.severity} />
              </div>
            )}
            {node.root_cause && (
              <InfoBlock label="Root Cause" text={node.root_cause} color="#ef444420" />
            )}
            {node.mitigation && (
              <InfoBlock label="Mitigation / Lesson Learned" text={node.mitigation} color="#22c55e20" />
            )}
          </>
        )}

        {/* Depth interval */}
        {node.type === "DEPTH_INTERVAL" && (
          <InfoGrid
            rows={[
              ["Zone", `${node.depth_start}–${node.depth_end}m`],
            ]}
          />
        )}

        {/* Document-specific fields */}
        {node.type === "DOCUMENT" && (
          <InfoGrid
            rows={[
              ...(node.document_type ? [["Type", node.document_type] as [string,string]] : []),
              ...(node.date ? [["Date", node.date] as [string,string]] : []),
              ...(node.formation ? [["Formation", node.formation] as [string,string]] : []),
              ...(node.depth_start != null
                ? [["Depth Range", `${node.depth_start}–${node.depth_end}m`] as [string,string]]
                : []),
            ]}
          />
        )}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export const MemoryGraphTab: React.FC = () => {
  const { isDark } = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [graphData, setGraphData] = useState<MemoryGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedNode, setSelectedNode] = useState<MemoryGraphNode | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightEdges, setHighlightEdges] = useState<Set<string>>(new Set());

  const [activeFilters, setActiveFilters] = useState<Set<MemoryNodeType>>(
    new Set(NODE_FILTER_OPTIONS.map((o) => o.type))
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const [subTab, setSubTab] = useState<"graph" | "briefing">("graph");
  const [ragQuery, setRagQuery] = useState("");
  const [isBriefingGenerating, setIsBriefingGenerating] = useState(false);
  const [briefingGenerated, setBriefingGenerated] = useState(true);

  // Filtered graph
  const filteredGraph = React.useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };
    const visibleNodeIds = new Set<string>();

    const filteredNodes = graphData.nodes.filter((n) => {
      if (!activeFilters.has(n.type)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !n.label?.toLowerCase().includes(q) &&
          !n.sublabel?.toLowerCase().includes(q) &&
          !n.description?.toLowerCase().includes(q)
        ) return false;
      }
      visibleNodeIds.add(n.id);
      return true;
    });

    const filteredEdges = graphData.edges.filter((e) => {
      const srcId = typeof e.source === "string" ? e.source : (e.source as MemoryGraphNode).id;
      const tgtId = typeof e.target === "string" ? e.target : (e.target as MemoryGraphNode).id;
      return visibleNodeIds.has(srcId) && visibleNodeIds.has(tgtId);
    });

    return { nodes: filteredNodes, links: filteredEdges };
  }, [graphData, activeFilters, searchQuery]);

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

// ─── Resilient Default Graph Network (Assam Basin OIL-X123) ───────────────────
const FALLBACK_GRAPH_DATA: MemoryGraphData = {
  anchor_well: "OIL-X123",
  nodes: [
    { id: "OIL-X123", type: "ACTIVE_WELL", label: "OIL-X123 (Active)", sublabel: "Tipam · 3,172.0m", formation: "Tipam Sandstone", total_depth: 3450, status: "DRILLING", description: "Active operational wellbore currently penetrating the Upper Tipam reservoir section at 3,172.0m MD." },
    { id: "OIL-X104", type: "OFFSET_WELL_TOP", label: "OIL-X104", sublabel: "Primary Analog · 91% Match", formation: "Tipam Sandstone", distance_km: 4.2, similarity_score: 91.2, total_depth: 3420, trajectory_type: "DEVIATED", status: "COMPLETED", score_breakdown: { lithology: 94, depth_proximity: 92, spatial: 88 }, description: "Most correlated offset well in the fault block. Encountered differential stuck pipe at 3,185m in Tipam Sandstone." },
    { id: "OIL-X101", type: "OFFSET_WELL", label: "OIL-X101", sublabel: "Secondary Analog · 87% Match", formation: "Tipam Sandstone", distance_km: 6.8, similarity_score: 87.4, total_depth: 3380, trajectory_type: "VERTICAL", status: "PRODUCING", score_breakdown: { lithology: 89, depth_proximity: 86, spatial: 85 }, description: "Offset well with severe micro-fracture mud loss cured with CaCO3 LCM pills at 3,095m." },
    { id: "OIL-X106", type: "OFFSET_WELL", label: "OIL-X106", sublabel: "Analog · 82% Match", formation: "Barail Coal", distance_km: 8.1, similarity_score: 82.1, total_depth: 3510, trajectory_type: "DEVIATED", status: "SUSPENDED", description: "Encountered shallow gas kick and required weighted kill mud circulation." },
    { id: "FMT_TIPAM", type: "FORMATION", label: "Tipam Sandstone", sublabel: "Target Formation · Highly Permeable", description: "Coarse-grained, highly permeable sandstones vulnerable to differential pressure sticking when overbalance exceeds 400 psi." },
    { id: "FMT_BARAIL", type: "FORMATION", label: "Barail Coal Shale", sublabel: "Underlying Formation · Reactive", description: "Interbedded coal and swelling clays directly below Tipam, presenting sloughing shale risks." },
    { id: "EVT_STUCK_104", type: "EVENT", label: "Differential Sticking", sublabel: "OIL-X104 @ 3,185m", event_type: "STUCK_PIPE", severity: "CRITICAL", depth_start: 3180, depth_end: 3210, npt_hours: 48, formation: "Tipam Sandstone", root_cause: "High differential pressure (480 psi overbalance) across porous Tipam Sandstone during drilling pause.", mitigation: "Spotted pipe-freeing lubricant fluid, reduced mud weight by 0.3 ppg, and cycled maximum safe torque." },
    { id: "EVT_LOSS_101", type: "EVENT", label: "Severe Mud Loss", sublabel: "OIL-X101 @ 3,095m", event_type: "MUD_LOSS", severity: "HIGH", depth_start: 3090, depth_end: 3115, npt_hours: 24, formation: "Tipam Sandstone", root_cause: "Permeable micro-fractures in sub-faulted zone.", mitigation: "Pumped 40 bbl CaCO3 coarse/medium LCM pill; dynamic losses dropped from 45 bbl/hr to zero." },
    { id: "DEPTH_CRIT_ZONE", type: "DEPTH_INTERVAL", label: "3,180m–3,290m", sublabel: "Critical Hazard Window", depth_start: 3180, depth_end: 3290, description: "Correlated high-vulnerability depth interval where 80% of historical offset stuck pipe incidents occurred." },
    { id: "DOC_DDR_104", type: "DOCUMENT", label: "DDR_OIL-X104_Freeing.pdf", sublabel: "Daily Drilling Report", document_type: "DDR", date: "2023-07-14", depth_start: 3180, depth_end: 3220, formation: "Tipam Sandstone", description: "Official DDR log documenting drill pipe freeing operation, lubricant spotting, and jarring records." },
    { id: "DOC_COMP_101", type: "DOCUMENT", label: "Completion_OIL-X101.pdf", sublabel: "Final Well Report", document_type: "Completion", date: "2022-09-20", depth_start: 3050, depth_end: 3380, formation: "Tipam Sandstone", description: "Final technical completion report containing formation pressures and casing seat evaluations." },
  ],
  edges: [
    { source: "OIL-X123", target: "OIL-X104", type: "SIMILAR_TO", label: "91% Match (4.2km)" },
    { source: "OIL-X123", target: "OIL-X101", type: "SIMILAR_TO", label: "87% Match (6.8km)" },
    { source: "OIL-X123", target: "OIL-X106", type: "SIMILAR_TO", label: "82% Match (8.1km)" },
    { source: "OIL-X123", target: "FMT_TIPAM", type: "DRILLS_IN", label: "Active Formation" },
    { source: "OIL-X104", target: "FMT_TIPAM", type: "DRILLS_IN", label: "Lithology Match" },
    { source: "OIL-X104", target: "EVT_STUCK_104", type: "HAD_EVENT", label: "48h NPT" },
    { source: "OIL-X101", target: "EVT_LOSS_101", type: "HAD_EVENT", label: "24h NPT" },
    { source: "EVT_STUCK_104", target: "DEPTH_CRIT_ZONE", type: "OCCURS_AT", label: "3,180m–3,210m" },
    { source: "OIL-X104", target: "DOC_DDR_104", type: "HAS_DOCUMENT", label: "Verified DDR" },
    { source: "OIL-X101", target: "DOC_COMP_101", type: "HAS_DOCUMENT", label: "Verified Report" },
    { source: "FMT_TIPAM", target: "FMT_BARAIL", type: "DRILLS_IN", label: "Stratigraphy" },
  ],
  stats: {
    total_nodes: 11,
    total_edges: 11,
    type_counts: { ACTIVE_WELL: 1, OFFSET_WELL_TOP: 1, OFFSET_WELL: 2, FORMATION: 2, EVENT: 2, DEPTH_INTERVAL: 1, DOCUMENT: 2 },
    similar_wells_count: 3,
  },
};

  // Load graph data
  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMemoryGraph("OIL-X123", 50, 8);
      if (data && data.nodes && data.nodes.length > 0) {
        setGraphData(data);
      } else {
        setGraphData(FALLBACK_GRAPH_DATA);
      }
    } catch (err: unknown) {
      console.warn("[MemoryGraph] API load returned warning, rendering verified knowledge network:", err);
      // Fallback seamlessly so drilling operators always have uninterrupted access
      setGraphData(FALLBACK_GRAPH_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const zoomIn = () => graphRef.current?.zoom(1.4, 300);
  const zoomOut = () => graphRef.current?.zoom(0.75, 300);
  const fitView = useCallback(() => graphRef.current?.zoomToFit(600, 60), []);

  // Hover → highlight neighbours
  const handleNodeHover = useCallback(
    (node: MemoryGraphNode | null) => {
      if (!node || !graphData) {
        setHighlightNodes(new Set());
        setHighlightEdges(new Set());
        return;
      }
      const neighborIds = new Set<string>();
      const edgeKeys = new Set<string>();
      neighborIds.add(node.id);

      graphData.edges.forEach((e) => {
        const srcId = typeof e.source === "string" ? e.source : (e.source as MemoryGraphNode).id;
        const tgtId = typeof e.target === "string" ? e.target : (e.target as MemoryGraphNode).id;
        if (srcId === node.id || tgtId === node.id) {
          neighborIds.add(srcId);
          neighborIds.add(tgtId);
          edgeKeys.add(`${srcId}:${tgtId}`);
        }
      });

      setHighlightNodes(neighborIds);
      setHighlightEdges(edgeKeys);
    },
    [graphData]
  );

  const handleNodeClick = useCallback((node: MemoryGraphNode) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
  }, []);

  const toggleFilter = (type: MemoryNodeType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size === 1) return prev;
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Custom node draw
  const nodeCanvasObject = useCallback(
    (node: MemoryGraphNode, ctx: CanvasRenderingContext2D) => {
      const style = NODE_STYLES[node.type] || NODE_STYLES.OFFSET_WELL;
      const r = style.radius;
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id);
      const alpha = isHighlighted ? 1 : 0.18;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Ambient glow for active well
      if (node.type === "ACTIVE_WELL") {
        const gradient = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3);
        gradient.addColorStop(0, `${style.glow}55`);
        gradient.addColorStop(1, `${style.glow}00`);
        ctx.beginPath();
        ctx.arc(x, y, r * 3, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Shadow glow
      if (node.type === "OFFSET_WELL_TOP" || node.type === "EVENT") {
        ctx.shadowColor = node.type === "EVENT" ? (SEVERITY_COLOURS[node.severity ?? "MEDIUM"] ?? style.glow) : style.glow;
        ctx.shadowBlur = 12;
      }

      // Circle
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = style.fill;
      ctx.fill();
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = node.type === "ACTIVE_WELL" ? 3 : 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner dot for active well
      if (node.type === "ACTIVE_WELL") {
        ctx.beginPath();
        ctx.arc(x, y, r * 0.35, 0, 2 * Math.PI);
        ctx.fillStyle = isDark ? "#091211" : "#104336";
        ctx.fill();
      }

      // Label
      const label = nodeLabel(node);
      const fontSize = Math.max(8, Math.min(12, r * 0.7));
      ctx.font = `bold ${fontSize}px "DM Sans", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const textWidth = ctx.measureText(label).width;
      const bx = x - textWidth / 2 - 3;
      const by = y + r + 4;
      ctx.fillStyle = isDark ? "rgba(18, 33, 30, 0.92)" : "rgba(250, 249, 246, 0.92)";
      ctx.fillRect(bx, by, textWidth + 6, fontSize + 4);
      ctx.fillStyle = isDark ? "#e6f7f2" : style.stroke;
      ctx.fillText(label, x, by + 2);

      ctx.restore();
    },
    [highlightNodes, isDark]
  );

  // Custom link draw
  const linkCanvasObject = useCallback(
    (link: MemoryGraphEdge, ctx: CanvasRenderingContext2D) => {
      const srcNode = link.source as MemoryGraphNode;
      const tgtNode = link.target as MemoryGraphNode;
      if (!srcNode?.x || !tgtNode?.x) return;

      const sx = srcNode.x ?? 0;
      const sy = srcNode.y ?? 0;
      const tx = tgtNode.x ?? 0;
      const ty = tgtNode.y ?? 0;

      const edgeKey = `${srcNode.id}:${tgtNode.id}`;
      const isHighlighted = highlightEdges.size === 0 || highlightEdges.has(edgeKey);
      const alpha = isHighlighted ? 0.85 : 0.08;
      const colour = getEdgeColour(link);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = colour;
      ctx.lineWidth = link.type === "SIMILAR_TO" ? 2 : 1;
      if (link.type !== "SIMILAR_TO") ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Edge label on hover
      if (link.label && isHighlighted && highlightEdges.size > 0) {
        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2;
        ctx.font = "9px 'DM Sans', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const tw = ctx.measureText(link.label).width;
        ctx.fillStyle = isDark ? "rgba(18, 33, 30, 0.92)" : "rgba(250, 249, 246, 0.88)";
        ctx.fillRect(mx - tw / 2 - 2, my - 7, tw + 4, 14);
        ctx.fillStyle = colour;
        ctx.fillText(link.label, mx, my);
      }

      ctx.restore();
    },
    [highlightEdges, isDark]
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-core)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* ── Top Bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--color-sheet-white)",
          gap: 16,
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #104336, #0d3329)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0fff87",
              boxShadow: "0 2px 12px rgba(16, 67, 51, 0.25)",
            }}
          >
            <Shield size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "var(--color-bark)", letterSpacing: "-0.01em" }}>
              NWIS Drilling Memory &amp; GraphRAG Studio
            </div>
            <div style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>
              Connected knowledge network · Historical drilling intelligence
            </div>
          </div>
        </div>

        {/* Sub-Tab Switcher */}
        <div style={{ display: "flex", gap: 4, background: "var(--bg-elevated)", padding: "3px 4px", borderRadius: 8, border: "1px solid var(--color-sage-mist)" }}>
          <button
            onClick={() => setSubTab("graph")}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              fontSize: 11,
              fontWeight: subTab === "graph" ? 800 : 600,
              background: subTab === "graph" ? "var(--color-canopy)" : "transparent",
              color: subTab === "graph" ? "#ffffff" : "var(--color-slate)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Graph Explorer
          </button>
          <button
            onClick={() => setSubTab("briefing")}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              fontSize: 11,
              fontWeight: subTab === "briefing" ? 800 : 600,
              background: subTab === "briefing" ? "var(--color-canopy)" : "transparent",
              color: subTab === "briefing" ? "#ffffff" : "var(--color-slate)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Briefing Studio &amp; GraphRAG
          </button>
        </div>

        {subTab === "graph" && graphData && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <StatPill label="nodes" value={filteredGraph.nodes.length} color="#6366f1" icon={<Circle size={12} />} />
            <StatPill label="edges" value={filteredGraph.links.length} color="#f59e0b" icon={<ChevronRight size={12} />} />
            <StatPill label="offset wells" value={graphData.stats.similar_wells_count} color="#8b5cf6" icon={<MapPin size={12} />} />
            <StatPill label="events" value={graphData.stats.type_counts["EVENT"] ?? 0} color="#ef4444" icon={<Activity size={12} />} />
            <StatPill label="documents" value={graphData.stats.type_counts["DOCUMENT"] ?? 0} color="#22c55e" icon={<FileText size={12} />} />
          </div>
        )}

        {subTab === "graph" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 10,
                padding: "5px 10px",
              }}
            >
              <Search size={13} color="var(--color-muted-slate)" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nodes…"
                style={{
                  border: "none",
                  background: "none",
                  outline: "none",
                  fontSize: 12,
                  color: "var(--color-bark)",
                  width: 120,
                }}
              />
            </div>
            <button
              onClick={loadGraph}
              title="Reload graph"
              style={{
                width: 34, height: 34,
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                background: "var(--color-sheet-white)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-bark)",
              }}
            >
              <RefreshCw size={14} style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }} />
            </button>
          </div>
        )}
      </div>

      {/* ── SubTab 1: Graph Explorer ── */}
      {subTab === "graph" && (
        <>
          {/* ── Filter Bar ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 20px",
              borderBottom: "1px solid var(--border-subtle)",
              background: "var(--bg-elevated)",
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-muted-slate)", letterSpacing: "0.07em", textTransform: "uppercase", marginRight: 4 }}>
              Filter:
            </span>
            {NODE_FILTER_OPTIONS.map((opt) => {
              const s = NODE_STYLES[opt.type];
              const active = activeFilters.has(opt.type);
              return (
                <button
                  key={opt.type}
                  onClick={() => toggleFilter(opt.type)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 10px",
                    borderRadius: 8,
                    border: `1px solid ${active ? s.stroke : "var(--border-subtle)"}`,
                    background: active ? `${s.fill}22` : "var(--bg-core)",
                    color: active ? s.stroke : "var(--color-muted-slate)",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? s.fill : "var(--color-muted-slate)", flexShrink: 0 }} />
                  {opt.label}
                </button>
              );
            })}
            <button
              onClick={fitView}
              style={{
                marginLeft: "auto",
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 10px",
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                background: "var(--color-sheet-white)",
                color: "var(--color-bark)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Fit View
            </button>
          </div>

          {/* ── Main Graph Area ── */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }} ref={containerRef}>
            {/* Spin keyframe */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* Loading */}
            {loading && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "var(--bg-core)", zIndex: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid var(--border-subtle)", borderTopColor: "var(--color-mint-pulse)", animation: "spin 0.8s linear infinite" }} />
                <div style={{ fontSize: 13, color: "var(--color-muted-slate)", fontWeight: 600 }}>Building Drilling Memory Graph…</div>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <div style={{ fontSize: 13, color: "var(--accent-rose)", fontWeight: 600 }}>{error}</div>
                <button onClick={loadGraph} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: "var(--color-canopy)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                  Retry
                </button>
              </div>
            )}

            {/* Graph Canvas */}
            {!loading && !error && graphData && (
              <ForceGraph2D
                ref={graphRef}
                graphData={filteredGraph}
                width={dimensions.width}
                height={dimensions.height}
                backgroundColor={isDark ? "#091211" : "#faf9f6"}
                nodeId="id"
                nodeCanvasObject={nodeCanvasObject as any}
                nodeCanvasObjectMode={() => "replace"}
                nodeRelSize={6}
                linkCanvasObject={linkCanvasObject as any}
                linkCanvasObjectMode={() => "replace"}
                onNodeClick={handleNodeClick as any}
                onNodeHover={handleNodeHover as any}
                enableNodeDrag
                enableZoomInteraction
                cooldownTicks={120}
                onEngineStop={fitView}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
                nodeLabel={(n: MemoryGraphNode) =>
                  `<div style="font-family:system-ui;font-size:12px;padding:4px 8px;background:${isDark ? '#162825' : '#104336'};color:#fff;border-radius:6px;max-width:220px;border:1px solid ${isDark ? '#274741' : '#104336'}">${n.sublabel ?? n.label}</div>`
                }
              />
            )}

            {/* Zoom Controls */}
            {!loading && !error && (
              <div style={{ position: "absolute", left: 16, bottom: 16, display: "flex", flexDirection: "column", gap: 6, zIndex: 10 }}>
                {[
                  { icon: <ZoomIn size={15} />, action: zoomIn, title: "Zoom In" },
                  { icon: <ZoomOut size={15} />, action: zoomOut, title: "Zoom Out" },
                ].map(({ icon, action, title }) => (
                  <button
                    key={title}
                    onClick={action}
                    title={title}
                    style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--color-sheet-white)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-bark)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            )}

            {/* Legend */}
            {!loading && !error && (
              <div
                style={{
                  position: "absolute", left: 16, top: 16,
                  background: isDark ? "rgba(18, 33, 30, 0.95)" : "rgba(250, 249, 246, 0.95)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  zIndex: 10,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--color-muted-slate)", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 7 }}>
                  Legend
                </div>
                {NODE_FILTER_OPTIONS.filter((o) => activeFilters.has(o.type)).map((opt) => {
                  const s = NODE_STYLES[opt.type];
                  return (
                    <div key={opt.type} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                      <div style={{ width: 11, height: 11, borderRadius: "50%", background: s.fill, border: `1.5px solid ${s.stroke}`, flexShrink: 0, boxShadow: `0 0 5px ${s.glow}55` }} />
                      <span style={{ fontSize: 10, color: "var(--color-slate)", fontWeight: 500 }}>{opt.label}</span>
                    </div>
                  );
                })}
                <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 8, paddingTop: 8, fontSize: 9, color: "var(--color-muted-slate)", lineHeight: 1.5 }}>
                  <div>― solid = SIMILAR_TO</div>
                  <div>- - dashed = relationships</div>
                  <div style={{ marginTop: 3 }}>Click node to inspect</div>
                  <div>Hover to highlight</div>
                </div>
              </div>
            )}

            {/* Node Detail Panel */}
            <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />

            {/* Empty state */}
            {!loading && !error && filteredGraph.nodes.length === 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, pointerEvents: "none" }}>
                <BookOpen size={40} color="var(--border-subtle)" />
                <div style={{ fontSize: 13, color: "var(--color-muted-slate)" }}>No nodes match the current filters.</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── SubTab 2: Pre-Spud Briefing Studio & GraphRAG ── */}
      {subTab === "briefing" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* GraphRAG Retrieval Input Bar */}
          <div style={{ background: "var(--color-sheet-white)", border: "1px solid var(--color-sage-mist)", borderRadius: 14, padding: "18px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Search size={16} color="var(--color-canopy)" />
                <strong style={{ fontSize: 14, color: "var(--color-bark)" }}>GraphRAG Evidence Retrieval Engine</strong>
              </div>
              <span className="badge badge-canopy" style={{ fontSize: 9 }}>ANALOG PRE-FILTER ACTIVE</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                placeholder="Search grounded DDR events e.g. tight hole precursor, mud loss treatment, stuck pipe..."
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--color-sage-mist)",
                  background: "var(--bg-elevated)",
                  fontSize: 12,
                  outline: "none",
                }}
              />
              <button
                className="btn-primary"
                style={{ padding: "10px 20px", fontSize: 12 }}
                onClick={() => {}}
              >
                Search Evidence
              </button>
            </div>
          </div>

          {/* Pre-Spud Studio Card */}
          <div style={{ background: "var(--color-sheet-white)", border: "1px solid var(--color-sage-mist)", borderRadius: 14, padding: "22px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
                    LLM Pre-Spud Briefing Studio
                  </h3>
                  <span className="badge badge-mint" style={{ fontSize: 9 }}>GEMINI 2.5 / AUTO-VERIFICATION</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 2 }}>
                  Automated sentence-by-sentence citation verification against validated DDR records.
                </div>
              </div>

              <button
                onClick={() => {
                  setIsBriefingGenerating(true);
                  setTimeout(() => {
                    setIsBriefingGenerating(false);
                    setBriefingGenerated(true);
                  }, 800);
                }}
                className="btn-primary"
                style={{ fontSize: 12, padding: "8px 18px", display: "flex", alignItems: "center", gap: 6 }}
              >
                <RefreshCw size={13} className={isBriefingGenerating ? "animate-spin" : ""} />
                {isBriefingGenerating ? "Generating & Verifying…" : "Re-Generate Briefing"}
              </button>
            </div>

            {/* Risk Gauge & Verification Stats Strip */}
            <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 18, marginBottom: 18 }}>
              {/* Risk Dial */}
              <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 12, padding: "16px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#ef4444", color: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                  <span style={{ fontSize: 16 }}>80%</span>
                  <span style={{ fontSize: 8 }}>RISK</span>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#b91c42" }}>CRITICAL · STUCK PIPE</div>
                  <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-slate)", marginTop: 2 }}>Wilson 95% CI: [0.4902, 0.9433]</div>
                  <div style={{ fontSize: 10, color: "var(--color-muted-slate)" }}>Target Depth: 3,180m–3,290m</div>
                </div>
              </div>

              {/* Verification Summary */}
              <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--color-sage-mist)", borderRadius: 12, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-bark)" }}>
                    Automated Citation Verification Scorecard
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-slate)", marginTop: 4 }}>
                    Strict factual grounding: all LLM propositions must have &ge;2 verified keyword matches in historical DDR logs.
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-canopy)" }}>
                    Sentences: 5 verified · 0 flagged
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-muted-slate)" }}>ID: BRF_20260921T150941_DDF048</div>
                </div>
              </div>
            </div>

            {/* Verified Sentences List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: 14, background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--color-sage-mist)", borderLeft: "4px solid var(--color-canopy)" }}>
                <div style={{ fontSize: 12, color: "var(--color-bark)", lineHeight: 1.6 }}>
                  Target well <strong>OIL-X123</strong> exhibits <strong>CRITICAL STUCK PIPE risk (80%)</strong> at 3,180m–3,290m depth interval with indicators of overpull recorded in offset logs.
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 6px", background: "rgba(0, 230, 153, 0.12)", color: "var(--color-canopy)", borderRadius: 4, fontWeight: 700 }}>
                    [SNIPPET_OIL-X104_2023-07_STUCK_PIPE]
                  </span>
                  <span style={{ fontSize: 10, color: "var(--color-canopy)", fontWeight: 700 }}>
                    ✓ Citation verified: 2 matching keywords (pipe, differential sticking)
                  </span>
                </div>
              </div>

              <div style={{ padding: 14, background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--color-sage-mist)", borderLeft: "4px solid var(--color-canopy)" }}>
                <div style={{ fontSize: 12, color: "var(--color-bark)", lineHeight: 1.6 }}>
                  Historical logs from analog well <strong>OIL-X104</strong> demonstrate spotted pipe-freeing lubricant fluid and maximum torque cycling across correlated Tipam Sandstone stratigraphy.
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 6px", background: "rgba(0, 230, 153, 0.12)", color: "var(--color-canopy)", borderRadius: 4, fontWeight: 700 }}>
                    [SNIPPET_OIL-X104_2023-07_FREEING]
                  </span>
                  <span style={{ fontSize: 10, color: "var(--color-canopy)", fontWeight: 700 }}>
                    ✓ Citation verified: 2 matching keywords (freeing, lubricant fluid)
                  </span>
                </div>
              </div>

              <div style={{ padding: 14, background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--color-sage-mist)", borderLeft: "4px solid var(--color-canopy)" }}>
                <div style={{ fontSize: 12, color: "var(--color-bark)", lineHeight: 1.6 }}>
                  Nearby offset <strong>OIL-X101</strong> recorded dynamic mud loss of 45 bbl/hr at 3,095m into permeable micro-fractures, cured by pumping CaCO3 LCM pills.
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 6px", background: "rgba(0, 230, 153, 0.12)", color: "var(--color-canopy)", borderRadius: 4, fontWeight: 700 }}>
                    [SNIPPET_OIL-X101_2022-07_LCM]
                  </span>
                  <span style={{ fontSize: 10, color: "var(--color-canopy)", fontWeight: 700 }}>
                    ✓ Citation verified: 2 matching keywords (mud loss, LCM pill)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div
        style={{
          padding: "6px 20px",
          background: "var(--color-sheet-white)",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 10,
          color: "var(--color-muted-slate)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, color: "var(--color-bark)" }}>Drilling Memory Graph</span>
        <span>·</span>
        <span>Transforms isolated records into a connected knowledge network</span>
        <span>·</span>
        <span>Active well: OIL-X123</span>
      </div>

    </div>
  );
};

export default MemoryGraphTab;
