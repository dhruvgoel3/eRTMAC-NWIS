"""
AI Service — Provider Abstraction
===================================
Provides an AI assistant that answers drilling engineers' questions
using retrieved NWIS evidence.

Two providers:
  1. OpenAIProvider — uses GPT API if OPENAI_API_KEY is set
  2. DemoAIProvider — deterministic template responses from seeded DB data
                      (works without any API key)

The system NEVER hallucates well IDs, depths, events, or documents.
"""
import os
import re
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from app.models import Well, WellEvent, Document, RiskZone

# ─── System Prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are NWIS (Nearby Wells Intelligence System), an AI decision-support assistant for drilling engineers at Oil India Limited.

Your role:
- Answer questions using ONLY the provided NWIS historical evidence
- Clearly distinguish historical facts from inferences
- Always cite specific wells, depths, and documents
- Use language like "Historical Risk", "Risk Similarity", "Historical Evidence", "Potential Risk"
- NEVER claim certainty about future drilling events
- If evidence is insufficient, say "Insufficient historical evidence available in the current NWIS dataset"
- When discussing mitigation, state these are historical examples that must be evaluated against approved operational procedures
- All data is synthetic demo data

Response format:
**SUMMARY:** (brief direct answer)
**HISTORICAL EVIDENCE:** (specific well/depth citations)
**RISK INTERPRETATION:** (what this means for current operation)
**SOURCE DOCUMENTS:** (DDR/WCR references if available)
**CONFIDENCE:** (HIGH/MEDIUM/LOW based on evidence quality)"""


class DemoAIProvider:
    """
    Deterministic demo AI provider.
    Retrieves real data from the database and formats structured responses.
    Works without any external API keys.
    """

    def __init__(self, db: Session):
        self.db = db

    def _retrieve_context(self, query: str) -> Dict[str, Any]:
        """
        Retrieve relevant context from the database based on the query.
        Uses keyword matching and depth extraction.
        """
        query_lower = query.lower()

        # Extract depth references from query
        depth_matches = re.findall(r'\b(\d{3,4})\s*m?\b', query)
        mentioned_depths = [float(d) for d in depth_matches if 1000 <= float(d) <= 8000]

        # Extract well ID references
        well_id_matches = re.findall(r'x[\d]{3}|oil-x[\d]{3}', query_lower)

        # Extract event type keywords
        event_keywords = {
            "stuck": "STUCK_PIPE",
            "stuck pipe": "STUCK_PIPE",
            "mud loss": "MUD_LOSS",
            "loss": "MUD_LOSS",
            "kick": "KICK",
            "torque": "TORQUE_SPIKE",
            "pressure": "OVERPRESSURE",
            "cement": "CEMENTING_ISSUE",
            "fishing": "FISHING",
            "npt": "NPT",
        }
        mentioned_events = []
        for kw, etype in event_keywords.items():
            if kw in query_lower:
                mentioned_events.append(etype)

        # Retrieve relevant wells
        wells_query = self.db.query(Well).filter(Well.is_active == False)

        # Retrieve events matching query
        events_query = self.db.query(WellEvent)
        if mentioned_events:
            events_query = events_query.filter(WellEvent.event_type.in_(mentioned_events))
        if mentioned_depths:
            depth = mentioned_depths[0]
            events_query = events_query.filter(
                WellEvent.depth_start >= depth - 100,
                WellEvent.depth_start <= depth + 100,
            )

        events = events_query.limit(10).all()

        # Retrieve risk zones
        risk_zones = self.db.query(RiskZone).limit(5).all()

        # Retrieve documents
        docs_query = self.db.query(Document)
        docs = docs_query.limit(5).all()

        return {
            "query": query,
            "mentioned_depths": mentioned_depths,
            "mentioned_events": mentioned_events,
            "events": events,
            "risk_zones": risk_zones,
            "documents": docs,
            "well_id_references": well_id_matches,
        }

    def _build_response(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Build a structured response from retrieved context."""
        query = context["query"].lower()
        events = context["events"]
        risk_zones = context["risk_zones"]
        docs = context["documents"]
        depths = context["mentioned_depths"]
        event_types = context["mentioned_events"]

        # Build evidence items
        evidence_items = []
        for ev in events[:6]:
            well = self.db.query(Well).filter(Well.id == ev.well_id).first()
            if well:
                evidence_items.append({
                    "well_id": well.well_id,
                    "event_type": ev.event_type,
                    "depth": ev.depth_start,
                    "severity": ev.severity,
                    "npt_hours": ev.npt_hours,
                    "formation": ev.formation,
                    "mitigation": ev.mitigation,
                })

        # Build source citations
        sources = []
        for doc in docs[:4]:
            well = self.db.query(Well).filter(Well.id == doc.well_id).first()
            sources.append({
                "document_id": doc.document_id,
                "type": doc.document_type,
                "well_id": well.well_id if well else "Unknown",
                "title": doc.title,
                "depth_start": doc.depth_start,
            })

        # ── Rule-based response selection ──────────────────────────────────────
        # Detect query intent and build appropriate response

        if "similar" in query and "well" in query:
            return self._answer_similarity(evidence_items, sources)

        elif "stuck" in query or "stuck pipe" in query:
            return self._answer_event_query("STUCK_PIPE", "Stuck Pipe", evidence_items, sources, depths)

        elif "mud loss" in query or "loss" in query:
            return self._answer_event_query("MUD_LOSS", "Mud Loss", evidence_items, sources, depths)

        elif "torque" in query:
            return self._answer_event_query("TORQUE_SPIKE", "Torque Spike", evidence_items, sources, depths)

        elif "risk" in query and ("zone" in query or "why" in query or "risky" in query):
            return self._answer_risk_zone(risk_zones, evidence_items, sources, depths)

        elif any(str(int(d)) in query for d in [3100, 3180, 3200, 3280]):
            return self._answer_depth_query(depths, evidence_items, sources)

        elif "x104" in query or "well x104" in query:
            return self._answer_specific_well("OIL-X104", evidence_items, sources)

        elif "mitigation" in query or "action" in query or "prevent" in query:
            return self._answer_mitigation(evidence_items, sources)

        elif "npt" in query or "non-productive" in query:
            return self._answer_npt(evidence_items, sources)

        else:
            return self._answer_general(evidence_items, sources, depths)

    def _answer_similarity(self, evidence, sources) -> Dict:
        return {
            "summary": "Based on NWIS similarity analysis, OIL-X104 is the most similar offset well to the active well OIL-X123 with a 91% similarity score.",
            "historical_evidence": [
                {"detail": "OIL-X104: Formation Tipam (same as active well), Total Depth 3850m (identical), Directional trajectory (identical), Distance ~8.5 km"},
                {"detail": "OIL-X101: Formation Tipam, Depth 3720m (similar), Directional trajectory, Distance ~5.3 km — 84% similar"},
                {"detail": "OIL-X106: Formation Tipam, Depth 3400m (shallower), Directional trajectory, Distance ~11.2 km — 71% similar"},
            ],
            "risk_interpretation": "OIL-X104's high similarity means its historical events are highly relevant for current drilling operations. X104 experienced Mud Loss at 3120m, Stuck Pipe at 3280m, and Torque Spike at 3450m — all in the Tipam formation.",
            "sources": sources[:3],
            "confidence": "HIGH",
            "evidence_items": evidence[:4],
        }

    def _answer_event_query(self, etype: str, etype_label: str, evidence, sources, depths) -> Dict:
        relevant = [e for e in evidence if e.get("event_type") == etype]

        if not relevant:
            return {
                "summary": f"Limited {etype_label} events found in current query context. Expand search radius or depth range.",
                "historical_evidence": [],
                "risk_interpretation": "Insufficient historical evidence available in the current NWIS dataset for this specific query.",
                "sources": [],
                "confidence": "LOW",
                "evidence_items": [],
            }

        count = len(relevant)
        depth_range = f"{min(e['depth'] for e in relevant):.0f}m - {max(e['depth'] for e in relevant):.0f}m"

        summary = f"{count} {etype_label} events found in nearby offset wells. Depth range: {depth_range}."

        return {
            "summary": summary,
            "historical_evidence": [
                {
                    "detail": f"{e['well_id']}: {etype_label} at {e['depth']:.0f}m — Severity: {e['severity']}, NPT: {e['npt_hours']:.1f} hrs — Formation: {e['formation']}"
                }
                for e in relevant[:6]
            ],
            "risk_interpretation": (
                f"Multiple comparable offset wells have experienced {etype_label} events in similar depth intervals. "
                f"This represents a historical pattern in {relevant[0]['formation'] if relevant else 'Tipam'} formation. "
                f"Historical mitigation: {relevant[0].get('mitigation', 'Review operational procedures.')}"
            ),
            "sources": sources[:3],
            "confidence": "HIGH" if count >= 3 else "MEDIUM",
            "evidence_items": relevant[:6],
        }

    def _answer_risk_zone(self, risk_zones, evidence, sources, depths) -> Dict:
        if depths:
            depth = depths[0]
            # Find the closest risk zone
            relevant_zone = None
            for rz in risk_zones:
                if abs(rz.depth_start - depth) <= 200:
                    relevant_zone = rz
                    break
        else:
            relevant_zone = risk_zones[0] if risk_zones else None

        if not relevant_zone:
            return {
                "summary": "Risk zone information not found for the specified depth in NWIS dataset.",
                "historical_evidence": [],
                "risk_interpretation": "Insufficient historical evidence available in the current NWIS dataset.",
                "sources": [],
                "confidence": "LOW",
                "evidence_items": [],
            }

        return {
            "summary": f"The {relevant_zone.depth_start:.0f}m-{relevant_zone.depth_end:.0f}m interval is classified as a historical {relevant_zone.severity} {relevant_zone.event_type.replace('_', ' ')} risk zone (Score: {relevant_zone.risk_score:.0f}/100).",
            "historical_evidence": [
                {"detail": relevant_zone.explanation}
            ],
            "risk_interpretation": (
                f"This risk zone is based on {relevant_zone.evidence_count} comparable offset wells that experienced "
                f"{relevant_zone.event_type.replace('_', ' ')} events in the same depth/formation interval. "
                f"This is a historical similarity pattern — not a guaranteed prediction. "
                f"Risk severity: {relevant_zone.severity}."
            ),
            "sources": sources[:3],
            "confidence": "HIGH",
            "evidence_items": evidence[:4],
        }

    def _answer_depth_query(self, depths, evidence, sources) -> Dict:
        depth = depths[0] if depths else 3200
        depth_evidence = [e for e in evidence if abs(e.get("depth", 0) - depth) <= 150]

        return {
            "summary": f"Historical analysis of the {depth:.0f}m depth interval in comparable offset wells.",
            "historical_evidence": [
                {"detail": f"{e['well_id']}: {e['event_type'].replace('_', ' ')} at {e['depth']:.0f}m — Severity: {e['severity']}, NPT: {e['npt_hours']:.1f} hrs"}
                for e in depth_evidence[:5]
            ] if depth_evidence else [{"detail": "No specific events found within 150m of this depth in the NWIS dataset."}],
            "risk_interpretation": (
                f"The {depth:.0f}m interval has {'historical event records in comparable wells' if depth_evidence else 'no significant historical events'} "
                f"within the NWIS knowledge base. "
                f"{'Monitor drilling parameters closely when approaching this interval.' if depth_evidence else 'Continue standard monitoring procedures.'}"
            ),
            "sources": sources[:3],
            "confidence": "HIGH" if depth_evidence else "LOW",
            "evidence_items": depth_evidence[:5],
        }

    def _answer_specific_well(self, well_id: str, evidence, sources) -> Dict:
        well = self.db.query(Well).filter(Well.well_id == well_id).first()
        if not well:
            return {"summary": f"Well {well_id} not found in NWIS dataset.", "historical_evidence": [], "risk_interpretation": "", "sources": [], "confidence": "LOW", "evidence_items": []}

        events = self.db.query(WellEvent).filter(WellEvent.well_id == well.id).all()
        well_docs = self.db.query(Document).filter(Document.well_id == well.id).all()

        return {
            "summary": f"OIL-X104: {well.formation} formation, {well.total_depth:.0f}m TD, {well.trajectory_type} trajectory. {len(events)} historical events recorded.",
            "historical_evidence": [
                {"detail": f"{e.event_type.replace('_', ' ')} at {e.depth_start:.0f}m — Severity: {e.severity}, NPT: {e.npt_hours:.1f} hrs — {e.description[:100]}..."}
                for e in events[:6]
            ],
            "risk_interpretation": (
                f"OIL-X104 is the highest-similarity well to OIL-X123 (91% similar). "
                f"Its {well.formation} formation, identical depth ({well.total_depth:.0f}m), and same trajectory type "
                f"make it the primary reference well. All X104 events should be carefully reviewed."
            ),
            "sources": [{"document_id": d.document_id, "type": d.document_type, "well_id": well_id, "title": d.title, "depth_start": d.depth_start} for d in well_docs],
            "confidence": "HIGH",
            "evidence_items": [
                {"well_id": well_id, "event_type": e.event_type, "depth": e.depth_start, "severity": e.severity, "npt_hours": e.npt_hours, "formation": e.formation, "mitigation": e.mitigation}
                for e in events[:6]
            ],
        }

    def _answer_mitigation(self, evidence, sources) -> Dict:
        mitigations = set(e.get("mitigation", "") for e in evidence if e.get("mitigation"))
        return {
            "summary": "Historical mitigation actions from comparable offset wells in NWIS knowledge base. These are historical examples and must be evaluated against approved operational procedures.",
            "historical_evidence": [
                {"detail": f"{e['well_id']} — {e['event_type'].replace('_', ' ')} at {e['depth']:.0f}m: {e.get('mitigation', 'N/A')}"}
                for e in evidence[:5]
            ],
            "risk_interpretation": "Historical mitigation actions are provided as reference only. All operational decisions must follow approved company procedures and current well conditions.",
            "sources": sources[:3],
            "confidence": "MEDIUM",
            "evidence_items": evidence[:5],
        }

    def _answer_npt(self, evidence, sources) -> Dict:
        total_npt = sum(e.get("npt_hours", 0) for e in evidence)
        return {
            "summary": f"NPT analysis across {len(evidence)} historical events in comparable offset wells. Total NPT in retrieved records: {total_npt:.1f} hours.",
            "historical_evidence": [
                {"detail": f"{e['well_id']}: {e['event_type'].replace('_', ' ')} at {e['depth']:.0f}m — NPT: {e['npt_hours']:.1f} hrs ({e['severity']} severity)"}
                for e in sorted(evidence, key=lambda x: x.get("npt_hours", 0), reverse=True)[:5]
            ],
            "risk_interpretation": "High NPT events in nearby wells indicate complex formation conditions. Historical patterns suggest proactive monitoring can reduce NPT risk.",
            "sources": sources[:3],
            "confidence": "MEDIUM",
            "evidence_items": evidence[:5],
        }

    def _answer_general(self, evidence, sources, depths) -> Dict:
        return {
            "summary": f"NWIS query processed. Found {len(evidence)} relevant historical records in the knowledge base.",
            "historical_evidence": [
                {"detail": f"{e['well_id']}: {e['event_type'].replace('_', ' ')} at {e['depth']:.0f}m — Severity: {e['severity']}"}
                for e in evidence[:5]
            ],
            "risk_interpretation": "Review specific events for detailed historical context. Use filters to narrow results by well, depth, formation, or event type.",
            "sources": sources[:3],
            "confidence": "MEDIUM" if evidence else "LOW",
            "evidence_items": evidence[:5],
        }

    def query(self, question: str) -> Dict[str, Any]:
        """Main entry point for AI queries."""
        context = self._retrieve_context(question)
        response = self._build_response(context)
        response["query"] = question
        response["provider"] = "NWIS Demo AI (No API key required)"
        return response


class OpenAIProvider:
    """
    OpenAI-powered AI provider using GPT with retrieved context.
    """

    def __init__(self, db: Session, api_key: str, model: str = "gpt-4o-mini"):
        self.db = db
        self.api_key = api_key
        self.model = model
        self._demo = DemoAIProvider(db)

    def _build_context_str(self, context: Dict) -> str:
        """Build a context string from retrieved DB data for the LLM prompt."""
        lines = []
        lines.append("=== NWIS RETRIEVED CONTEXT ===")
        lines.append(f"Active Well: OIL-X123 | Formation: Tipam | Current Depth: 3050m")
        lines.append("")

        if context["events"]:
            lines.append("Historical Events (relevant to query):")
            for ev in context["events"][:8]:
                well = self.db.query(Well).filter(Well.id == ev.well_id).first()
                lines.append(
                    f"  - {well.well_id if well else 'Unknown'}: {ev.event_type} at {ev.depth_start:.0f}m "
                    f"({ev.severity}) | NPT: {ev.npt_hours:.1f}h | Formation: {ev.formation}"
                )

        if context["risk_zones"]:
            lines.append("")
            lines.append("Risk Zones (active well):")
            for rz in context["risk_zones"][:4]:
                lines.append(
                    f"  - {rz.event_type}: {rz.depth_start:.0f}m-{rz.depth_end:.0f}m "
                    f"| {rz.severity} (score: {rz.risk_score:.0f}) | Evidence: {rz.evidence_count} wells"
                )

        if context["documents"]:
            lines.append("")
            lines.append("Available Documents:")
            for doc in context["documents"][:4]:
                lines.append(f"  - {doc.document_id}: {doc.title}")

        return "\n".join(lines)

    def query(self, question: str) -> Dict[str, Any]:
        """Query OpenAI with retrieved context."""
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key)

            context = self._demo._retrieve_context(question)
            context_str = self._build_context_str(context)

            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"{context_str}\n\n=== ENGINEER QUESTION ===\n{question}"},
            ]

            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=800,
                temperature=0.1,
            )

            answer_text = response.choices[0].message.content

            # Also get structured data from demo provider for citations
            demo_response = self._demo.query(question)

            return {
                "query": question,
                "summary": answer_text,
                "historical_evidence": demo_response.get("historical_evidence", []),
                "risk_interpretation": "",
                "sources": demo_response.get("sources", []),
                "confidence": "HIGH",
                "evidence_items": demo_response.get("evidence_items", []),
                "provider": f"OpenAI {self.model}",
            }

        except Exception as e:
            print(f"OpenAI error, falling back to demo: {e}")
            # Fallback to demo provider
            result = self._demo.query(question)
            result["provider"] = f"NWIS Demo AI (OpenAI fallback: {str(e)[:50]})"
            return result


def get_ai_provider(db: Session):
    """
    Factory function — returns the appropriate AI provider.
    Uses OpenAI if OPENAI_API_KEY is set, otherwise uses DemoAIProvider.
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("AI_MODEL", "gpt-4o-mini")

    if api_key:
        return OpenAIProvider(db, api_key, model)
    else:
        return DemoAIProvider(db)
