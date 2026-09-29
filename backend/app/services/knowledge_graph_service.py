"""
Knowledge Graph Service for eRTMAC-NWIS
========================================
Manages the 4,037-node, 12,392-edge NetworkX drilling property graph from eRTMAC Module 4.
Extracts rich multi-hop subgraphs:
  Well -> Formations -> Events -> ReportSnippets -> Hazards -> Interventions -> Outcomes

Formats nodes and links for react-force-graph-2d with rich colors, badges, and tooltips.
"""
import pickle
from pathlib import Path
from typing import Dict, List, Optional, Any, Set
import networkx as nx

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "real"
GRAPH_PATH = DATA_DIR / "knowledge_graph.gpickle"
if not GRAPH_PATH.is_file():
    GRAPH_PATH = Path("e:/sih/eRTMAC/NLP/nlp_task_ddr/module4/outputs/knowledge_graph.gpickle")

NODE_COLORS = {
    "ACTIVE_WELL": "#00FFCC",     # Bright cyan
    "Well": "#00B4D8",            # Electric blue
    "OFFSET_WELL": "#0077B6",     # Muted blue
    "OFFSET_WELL_TOP": "#FFD166", # Gold / yellow
    "Formation": "#90E0EF",       # Pale aqua
    "FORMATION": "#90E0EF",
    "Event": "#FF4D4D",           # Red
    "EVENT": "#FF4D4D",
    "Hazard": "#FF007F",          # Magenta
    "Intervention": "#06D6A0",    # Mint green
    "Outcome": "#118AB2",         # Slate blue
    "ReportSnippet": "#B5E48C",   # Light lime
    "DOCUMENT": "#E0AAFF",        # Lavender
    "DEPTH_INTERVAL": "#F8961E",   # Orange
}


class KnowledgeGraphService:
    def __init__(self):
        self.graph: Optional[nx.DiGraph] = None
        self._load_graph()

    def _load_graph(self):
        if GRAPH_PATH.is_file():
            try:
                print(f"[KnowledgeGraph] Loading graph from {GRAPH_PATH}...")
                with open(GRAPH_PATH, "rb") as f:
                    self.graph = pickle.load(f)
                print(f"[KnowledgeGraph] Successfully loaded graph with {self.graph.number_of_nodes()} nodes and {self.graph.number_of_edges()} edges.")
            except Exception as e:
                print(f"[KnowledgeGraph Warning] Failed to load graph: {e}")
                self.graph = nx.DiGraph()
        else:
            self.graph = nx.DiGraph()

    def get_stats(self) -> Dict[str, Any]:
        if not self.graph or self.graph.number_of_nodes() == 0:
            return {"total_nodes": 0, "total_edges": 0, "type_counts": {}}
        
        type_counts = {}
        for _, d in self.graph.nodes(data=True):
            t = d.get("node_type", "UNKNOWN")
            type_counts[t] = type_counts.get(t, 0) + 1

        return {
            "total_nodes": self.graph.number_of_nodes(),
            "total_edges": self.graph.number_of_edges(),
            "type_counts": type_counts,
        }

    def get_subgraph_for_well(
        self,
        well_id: str = "OIL-X123",
        max_nodes: int = 120,
    ) -> Dict[str, Any]:
        """
        Extracts a balanced 2-to-3 hop subgraph around well_id.
        Maps canonical IDs (e.g. OIL-X123 -> 15/9-F-9A if needed).
        """
        if not self.graph or self.graph.number_of_nodes() == 0:
            return {"anchor_well": well_id, "nodes": [], "edges": [], "stats": {}}

        # Resolve target well node ID
        target_nid = None
        candidates = [
            well_id,
            f"WELL_{well_id}",
            f"NO_{well_id}",
            f"WELL_15/9-F-9A" if (well_id == "OIL-X123" or "X123" in well_id or "F-9A" in well_id) else None,
            "WELL_15/9-F-9A",
        ]
        for cand in candidates:
            if cand and self.graph.has_node(cand):
                target_nid = cand
                break

        if not target_nid:
            for n in self.graph.nodes:
                if well_id in n:
                    target_nid = n
                    break

        if not target_nid or not self.graph.has_node(target_nid):
            for n in self.graph.nodes:
                if n.startswith("WELL_"):
                    target_nid = n
                    break

        if not target_nid or not self.graph.has_node(target_nid):
            return {"anchor_well": well_id, "nodes": [], "edges": [], "stats": {}}

        # Collect nodes via BFS traversal up to max_nodes
        selected_nodes: Set[str] = {target_nid}
        neighbors_1 = list(self.graph.successors(target_nid)) + list(self.graph.predecessors(target_nid))

        for nb in neighbors_1[:60]:
            selected_nodes.add(nb)

        # 2nd hop from events / formations
        for nb in list(selected_nodes):
            if len(selected_nodes) >= max_nodes:
                break
            ntype = self.graph.nodes[nb].get("node_type")
            if ntype in ("Event", "Formation", "Intervention"):
                sub_nbs = list(self.graph.successors(nb)) + list(self.graph.predecessors(nb))
                for s_nb in sub_nbs[:4]:
                    selected_nodes.add(s_nb)
                    if len(selected_nodes) >= max_nodes:
                        break

        # Build subgraph
        sub = self.graph.subgraph(selected_nodes)

        nodes_list = []
        for nid, data in sub.nodes(data=True):
            ntype = data.get("node_type", "Entity")
            is_anchor = (nid == target_nid)
            effective_type = "ACTIVE_WELL" if is_anchor else ntype

            # Label resolution
            label = data.get("label") or data.get("name") or nid
            if is_anchor:
                label = f"{well_id} (Active)"

            color = NODE_COLORS.get(effective_type, "#999999")
            sublabel = data.get("sublabel") or ntype
            desc = data.get("description") or data.get("raw_text") or f"{ntype}: {label}"

            nodes_list.append({
                "id": str(nid),
                "type": effective_type,
                "label": str(label)[:35],
                "sublabel": str(sublabel)[:30],
                "color": color,
                "description": str(desc)[:250],
                "depth": data.get("depth_m"),
                "formation": data.get("formation_id") or data.get("formation"),
                "severity": data.get("severity"),
                "hazard": data.get("hazard"),
                "val": 15 if is_anchor else (10 if ntype in ("Formation", "Hazard") else 6),
            })

        edges_list = []
        for u, v, edata in sub.edges(data=True):
            rel = edata.get("relation") or edata.get("type") or "CONNECTED_TO"
            edges_list.append({
                "source": str(u),
                "target": str(v),
                "type": str(rel),
                "label": str(rel).replace("_", " ").lower(),
                "weight": float(edata.get("weighted_score", 0.8)),
            })

        type_counts = {}
        for n in nodes_list:
            t = n["type"]
            type_counts[t] = type_counts.get(t, 0) + 1

        return {
            "anchor_well": well_id,
            "nodes": nodes_list,
            "edges": edges_list,
            "stats": {
                "total_nodes": len(nodes_list),
                "total_edges": len(edges_list),
                "type_counts": type_counts,
                "subgraph_coverage": f"{len(nodes_list)}/{self.graph.number_of_nodes()} total graph entities",
            },
        }


knowledge_graph_service = KnowledgeGraphService()
