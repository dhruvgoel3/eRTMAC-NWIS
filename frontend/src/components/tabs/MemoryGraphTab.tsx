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
        <span style={{ fontSize: 11, color: "#104336aa", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, color: "#104336", fontWeight: 500 }}>{value}</span>
      </React.Fragment>
    ))}
  </div>
);

const InfoBlock: React.FC<{ label: string; text: string; color: string }> = ({
  label, text, color,
}) => (
  <div style={{ marginTop: 10 }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: "#104336aa", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>
      {label}
    </div>
    <div style={{ fontSize: 12, color: "#104336cc", lineHeight: 1.55, background: color, borderRadius: 8, padding: "8px 10px" }}>
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
        <span style={{ fontSize: 10, color: "#104336aa", textTransform: "capitalize" }}>{label}</span>
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
    <span style={{ fontSize: 11, color: "#104336aa" }}>{label}</span>
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
        background: "#faf9f6",
        border: `1.5px solid ${style.stroke}33`,
        borderRadius: 16,
        boxShadow: `0 8px 40px ${style.glow}22, 0 2px 8px #10433620`,
        zIndex: 20,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${style.fill}22, ${style.fill}08)`,
          borderBottom: `1px solid ${style.stroke}22`,
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
              color: "#104336",
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
                color: "#104336",
                lineHeight: 1.2,
                wordBreak: "break-all",
              }}
            >
              {nodeLabel(node)}
            </div>
            <div style={{ fontSize: 11, color: "#104336aa", fontWeight: 500, marginTop: 2 }}>
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
            color: "#104336aa",
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
          <p style={{ fontSize: 12, color: "#104336cc", lineHeight: 1.5, marginBottom: 12 }}>
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
                color: "#104336aa",
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

  // Load graph data
  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMemoryGraph("OIL-X123", 50, 8);
      setGraphData(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message || "Failed to load Drilling Memory Graph.");
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
        ctx.fillStyle = "#104336";
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
      ctx.fillStyle = "rgba(250,249,246,0.9)";
      ctx.fillRect(bx, by, textWidth + 6, fontSize + 4);
      ctx.fillStyle = style.stroke;
      ctx.fillText(label, x, by + 2);

      ctx.restore();
    },
    [highlightNodes]
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
        ctx.fillStyle = "rgba(250,249,246,0.88)";
        ctx.fillRect(mx - tw / 2 - 2, my - 7, tw + 4, 14);
        ctx.fillStyle = colour;
        ctx.fillText(link.label, mx, my);
      }

      ctx.restore();
    },
    [highlightEdges]
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#faf9f6",
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
          borderBottom: "1px solid #10433320",
          background: "#fff",
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
              boxShadow: "0 2px 12px #10433340",
            }}
          >
            <Shield size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#104336", letterSpacing: "-0.01em" }}>
              NWIS Drilling Memory Graph
            </div>
            <div style={{ fontSize: 11, color: "#104336aa" }}>
              Connected knowledge network · Historical drilling intelligence
            </div>
          </div>
        </div>

        {graphData && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <StatPill label="nodes" value={filteredGraph.nodes.length} color="#6366f1" icon={<Circle size={12} />} />
            <StatPill label="edges" value={filteredGraph.links.length} color="#f59e0b" icon={<ChevronRight size={12} />} />
            <StatPill label="offset wells" value={graphData.stats.similar_wells_count} color="#8b5cf6" icon={<MapPin size={12} />} />
            <StatPill label="events" value={graphData.stats.type_counts["EVENT"] ?? 0} color="#ef4444" icon={<Activity size={12} />} />
            <StatPill label="documents" value={graphData.stats.type_counts["DOCUMENT"] ?? 0} color="#22c55e" icon={<FileText size={12} />} />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#f3f1ec",
              border: "1px solid #10433620",
              borderRadius: 10,
              padding: "5px 10px",
            }}
          >
            <Search size={13} color="#104336aa" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nodes…"
              style={{
                border: "none",
                background: "none",
                outline: "none",
                fontSize: 12,
                color: "#104336",
                width: 120,
              }}
            />
          </div>
          <button
            onClick={loadGraph}
            title="Reload graph"
            style={{
              width: 34, height: 34,
              border: "1px solid #10433620",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#104336",
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }} />
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 20px",
          borderBottom: "1px solid #10433315",
          background: "#fdfcf9",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: "#104336aa", letterSpacing: "0.07em", textTransform: "uppercase", marginRight: 4 }}>
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
                border: `1px solid ${active ? s.stroke : "#ccc"}`,
                background: active ? `${s.fill}22` : "#f3f1ec",
                color: active ? s.stroke : "#999",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? s.fill : "#ccc", flexShrink: 0 }} />
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
            border: "1px solid #10433620",
            background: "#fff",
            color: "#104336",
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
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "#faf9f6", zIndex: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid #10433620", borderTopColor: "#0fff87", animation: "spin 0.8s linear infinite" }} />
            <div style={{ fontSize: 13, color: "#104336aa", fontWeight: 600 }}>Building Drilling Memory Graph…</div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{ fontSize: 13, color: "#ef4444", fontWeight: 600 }}>{error}</div>
            <button onClick={loadGraph} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: "#104336", color: "#0fff87", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
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
            backgroundColor="#faf9f6"
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
              `<div style="font-family:system-ui;font-size:12px;padding:4px 8px;background:#104336;color:#fff;border-radius:6px;max-width:220px">${n.sublabel ?? n.label}</div>`
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
                style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #10433620", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#104336", boxShadow: "0 2px 8px #10433320" }}
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
              background: "rgba(250,249,246,0.95)",
              border: "1px solid #10433320",
              borderRadius: 12,
              padding: "10px 14px",
              zIndex: 10,
              boxShadow: "0 4px 16px #10433315",
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, color: "#104336aa", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 7 }}>
              Legend
            </div>
            {NODE_FILTER_OPTIONS.filter((o) => activeFilters.has(o.type)).map((opt) => {
              const s = NODE_STYLES[opt.type];
              return (
                <div key={opt.type} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                  <div style={{ width: 11, height: 11, borderRadius: "50%", background: s.fill, border: `1.5px solid ${s.stroke}`, flexShrink: 0, boxShadow: `0 0 5px ${s.glow}55` }} />
                  <span style={{ fontSize: 10, color: "#104336cc", fontWeight: 500 }}>{opt.label}</span>
                </div>
              );
            })}
            <div style={{ borderTop: "1px solid #10433315", marginTop: 8, paddingTop: 8, fontSize: 9, color: "#104336aa", lineHeight: 1.5 }}>
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
            <BookOpen size={40} color="#10433330" />
            <div style={{ fontSize: 13, color: "#104336aa" }}>No nodes match the current filters.</div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          padding: "6px 20px",
          background: "#fdfcf9",
          borderTop: "1px solid #10433310",
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 10,
          color: "#104336aa",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, color: "#104336" }}>Drilling Memory Graph</span>
        <span>·</span>
        <span>Transforms isolated records into a connected knowledge network</span>
        <span>·</span>
        <span>Active well: OIL-X123</span>
        <span>·</span>
        <span style={{ fontStyle: "italic" }}>Synthetic Demo Data — Not Real OIL Well Data</span>
      </div>
    </div>
  );
};

export default MemoryGraphTab;
