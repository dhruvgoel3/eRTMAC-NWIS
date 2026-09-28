"""
NLP Engine for eRTMAC-NWIS
===========================
Rule-based Named Entity Recognition (NER) and hazard event classification
for unstructured Daily Drilling Reports (DDRs), Well Completion Reports (WCRs),
and engineering logs. Grounded directly in eRTMAC Module 1 canonical specification.

Canonical Event Types (18 types across 7 hazards):
- mud_loss:     EVT_MUD_LOSS_PARTIAL, EVT_MUD_LOSS_TOTAL, EVT_LCM_APPLIED, EVT_CIRC_RESTORED
- stuck_pipe:   EVT_STUCK_PIPE, EVT_DIFF_STICKING, EVT_TIGHT_HOLE, EVT_JARRING, EVT_FISHING
- kick:         EVT_KICK, EVT_GAS_INFLUX, EVT_BOP_SHUTIN
- overpressure: EVT_OVERPRESSURE_DETECTED
- torque_spike: EVT_TORQUE_UP, EVT_TORQUE_SPIKE
- cementing:    EVT_CEMENTING_FAILURE, EVT_WOC
- none:         EVT_ROUTINE_DRILLING
"""
import re
from typing import Dict, List, Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session

EVENT_VOCAB = {
    "version": "1.0",
    "event_types": {
        "EVT_MUD_LOSS_PARTIAL": {
            "hazard": "mud_loss",
            "severity": "medium",
            "description": "Partial loss of drilling fluid to formation",
        },
        "EVT_MUD_LOSS_TOTAL": {
            "hazard": "mud_loss",
            "severity": "critical",
            "description": "Total loss of circulation - zero returns to surface",
        },
        "EVT_LCM_APPLIED": {
            "hazard": "mud_loss",
            "severity": "low",
            "description": "Lost Circulation Material pill pumped to cure losses",
        },
        "EVT_CIRC_RESTORED": {
            "hazard": "mud_loss",
            "severity": "none",
            "description": "Full circulation successfully restored",
        },
        "EVT_STUCK_PIPE": {
            "hazard": "stuck_pipe",
            "severity": "critical",
            "description": "Drill string mechanically or differentially stuck",
        },
        "EVT_DIFF_STICKING": {
            "hazard": "stuck_pipe",
            "severity": "high",
            "description": "Differential pressure sticking across permeable zone",
        },
        "EVT_TIGHT_HOLE": {
            "hazard": "stuck_pipe",
            "severity": "medium",
            "description": "Overpull observed while tripping or reaming",
        },
        "EVT_JARRING": {
            "hazard": "stuck_pipe",
            "severity": "high",
            "description": "Jarring operations activated to free stuck string",
        },
        "EVT_FISHING": {
            "hazard": "stuck_pipe",
            "severity": "high",
            "description": "Fishing operations for lost BHA or parted string",
        },
        "EVT_KICK": {
            "hazard": "kick",
            "severity": "critical",
            "description": "Formation fluid influx into wellbore",
        },
        "EVT_GAS_INFLUX": {
            "hazard": "kick",
            "severity": "high",
            "description": "Gas detected in drilling mud returns",
        },
        "EVT_BOP_SHUTIN": {
            "hazard": "kick",
            "severity": "critical",
            "description": "BOP shut in for well control procedure",
        },
        "EVT_OVERPRESSURE_DETECTED": {
            "hazard": "overpressure",
            "severity": "high",
            "description": "Abnormal pore pressure gradient encountered",
        },
        "EVT_TORQUE_UP": {
            "hazard": "torque_spike",
            "severity": "medium",
            "description": "Elevated or fluctuating rotary torque",
        },
        "EVT_TORQUE_SPIKE": {
            "hazard": "torque_spike",
            "severity": "high",
            "description": "Sudden extreme torque spike exceeding operating envelope",
        },
        "EVT_CEMENTING_FAILURE": {
            "hazard": "cementing",
            "severity": "high",
            "description": "Cement channeling, flash set, or barrier failure",
        },
        "EVT_WOC": {
            "hazard": "cementing",
            "severity": "none",
            "description": "Waiting on cement curing",
        },
        "EVT_ROUTINE_DRILLING": {
            "hazard": "none",
            "severity": "none",
            "description": "Routine drilling operations - nominal telemetry",
        },
    },
}

KEYWORD_EVT = [
    ("total loss", "EVT_MUD_LOSS_TOTAL"),
    ("mud loss", "EVT_MUD_LOSS_PARTIAL"),
    ("loss of returns", "EVT_MUD_LOSS_PARTIAL"),
    ("lost circulation", "EVT_MUD_LOSS_PARTIAL"),
    ("lcm", "EVT_LCM_APPLIED"),
    ("nut plug", "EVT_LCM_APPLIED"),
    ("circ restored", "EVT_CIRC_RESTORED"),
    ("returns restored", "EVT_CIRC_RESTORED"),
    ("differential sticking", "EVT_DIFF_STICKING"),
    ("stuck pipe", "EVT_STUCK_PIPE"),
    ("got stuck", "EVT_STUCK_PIPE"),
    ("pipe stuck", "EVT_STUCK_PIPE"),
    ("stuck", "EVT_STUCK_PIPE"),
    ("jarred", "EVT_JARRING"),
    ("jarring", "EVT_JARRING"),
    ("fishing", "EVT_FISHING"),
    ("tight hole", "EVT_TIGHT_HOLE"),
    ("tight spot", "EVT_TIGHT_HOLE"),
    ("overpull", "EVT_TIGHT_HOLE"),
    ("gas influx", "EVT_GAS_INFLUX"),
    ("gas kick", "EVT_GAS_INFLUX"),
    ("shut in", "EVT_BOP_SHUTIN"),
    ("bop shut", "EVT_BOP_SHUTIN"),
    ("well control", "EVT_BOP_SHUTIN"),
    ("kick", "EVT_KICK"),
    ("overpressure", "EVT_OVERPRESSURE_DETECTED"),
    ("abnormal pressure", "EVT_OVERPRESSURE_DETECTED"),
    ("torque spike", "EVT_TORQUE_SPIKE"),
    ("severe torque", "EVT_TORQUE_SPIKE"),
    ("high torque", "EVT_TORQUE_UP"),
    ("fluctuating torque", "EVT_TORQUE_UP"),
    ("torque", "EVT_TORQUE_UP"),
    ("cement failure", "EVT_CEMENTING_FAILURE"),
    ("cement leak", "EVT_CEMENTING_FAILURE"),
    ("channeling", "EVT_CEMENTING_FAILURE"),
    ("waiting on cement", "EVT_WOC"),
    ("woc", "EVT_WOC"),
]

FORMATION_PATTERNS = [
    "Hordaland", "Shetland", "Draupne", "Utsira", "Statfjord",
    "Smith Bank", "Lista", "Lyr", "Skagerrak", "Balder",
    "Heimdal", "Rogaland", "Heather", "Grid", "Sleipner",
    "Agat", "Roedby", "Aasgard", "Blodoeks", "Jorsalfare",
    "Kyrre", "Tryggvason", "Amundsen", "Cook", "Drake",
    "Tipam", "Barail", "Kopili", "Sylhet", "Langpur",
    "Namsang", "Bhuban", "Bokabil", "Girujan",
]


class DrillingNLPEngine:
    """
    Production-grade NLP extraction engine for drilling records.
    Extracts events, depths, mud weights, NPT hours, volumes, and formations.
    """

    @staticmethod
    def classify_event(text: str) -> str:
        t = (text or "").lower()
        for kw, evt in KEYWORD_EVT:
            if kw in t:
                return evt
        return "EVT_ROUTINE_DRILLING"

    @classmethod
    def extract_entities(
        cls,
        text: str,
        well_id: str = "VOLVE",
        date: str = "2026-01-01",
        source: str = "manual",
    ) -> Dict[str, Any]:
        t = str(text or "")

        # 1. Depth extraction
        depths = re.findall(r"(\d[\d,]*\.?\d*)\s*(?:m\b|mTVD|mMD|meters?|ft)", t, re.I)
        depth_m = float(depths[0].replace(",", "")) if depths else 0.0

        # 2. Mud weight extraction
        mw_h = re.search(r"(\d+\.?\d*)\s*(?:ppg|sg\b|SG\b|pcf|g/cm3)", t, re.I)
        mud_ppg = float(mw_h.group(1)) if mw_h else None

        # 3. NPT hours extraction
        npt_h = re.search(r"(?:npt|lost\s+time)[\s:]*(\d+\.?\d*)\s*h", t, re.I)
        npt_hrs = float(npt_h.group(1)) if npt_h else 0.0

        # 4. Volume lost extraction
        vol_h = re.search(r"(\d+\.?\d*)\s*(?:bbl|barrels|m3)", t, re.I)
        vol_bbl = float(vol_h.group(1)) if vol_h else 0.0

        # 5. Formation detection
        fm = "Unknown"
        for candidate in FORMATION_PATTERNS:
            if re.search(rf"\b{re.escape(candidate)}\b", t, re.I):
                fm = candidate
                break

        # 6. Event classification
        evt_id = cls.classify_event(t)
        evt_info = EVENT_VOCAB["event_types"].get(evt_id, {})
        hazard = evt_info.get("hazard", "none")
        severity = evt_info.get("severity", "none").upper()
        if severity == "NONE":
            severity = "LOW"

        # Calculate confidence
        confidence = 0.95 if evt_id != "EVT_ROUTINE_DRILLING" else 0.70
        if depth_m > 0:
            confidence = min(1.0, confidence + 0.05)
        if mud_ppg:
            confidence = min(1.0, confidence + 0.05)

        event_code = evt_id.replace("EVT_", "")
        event_id = f"{well_id}_{date}_{evt_id}"

        return {
            "well_id": well_id,
            "event_id": event_id,
            "report_date": date,
            "depth_m": depth_m,
            "formation_id": fm,
            "mud_weight_ppg": mud_ppg,
            "npt_hours": npt_hrs,
            "volume_lost_bbl": vol_bbl,
            "event_type_id": evt_id,
            "event_type": event_code,
            "hazard": hazard,
            "severity": severity,
            "source": source,
            "is_synthetic": source == "synthetic",
            "confidence": round(confidence, 2),
            "raw_text": t,
        }

    @classmethod
    def process_document_text(
        cls,
        text: str,
        doc_id: int,
        well_id_str: str,
        db: Session,
    ) -> List[Dict[str, Any]]:
        """
        Parses full document text, segments by paragraphs or report dates,
        extracts entities, and generates database WellEvent records.
        """
        from app.models.event import WellEvent
        from app.models.well import Well
        from app.models.document import DocumentChunk

        # Find target well
        well = db.query(Well).filter(Well.well_id == well_id_str).first()
        if not well:
            well = db.query(Well).filter(Well.is_active == True).first()

        paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 30]
        if not paragraphs:
            paragraphs = [text]

        extracted_events = []
        created_records = []

        for idx, para in enumerate(paragraphs):
            # Attempt date extraction
            dm = re.search(r"(\d{4}-\d{2}-\d{2})", para)
            date_str = dm.group(1) if dm else datetime.utcnow().strftime("%Y-%m-%d")

            entities = cls.extract_entities(
                text=para,
                well_id=well_id_str if well_id_str else (well.well_id if well else "VOLVE"),
                date=date_str,
                source="ingested_doc",
            )

            # Store document chunk
            chunk = DocumentChunk(
                document_id=doc_id,
                chunk_index=idx,
                chunk_text=para[:2000],
                depth_context=entities["depth_m"] if entities["depth_m"] > 0 else None,
                formation_context=entities["formation_id"] if entities["formation_id"] != "Unknown" else None,
                event_type_context=entities["event_type"] if entities["hazard"] != "none" else None,
            )
            db.add(chunk)


            # If an actual hazard event was detected, persist as WellEvent
            if entities["hazard"] != "none" and well:
                event_rec = WellEvent(
                    well_id=well.id,
                    event_type=entities["event_type"],
                    severity=entities["severity"],
                    depth_start=entities["depth_m"],
                    depth_end=entities["depth_m"] + 15.0 if entities["depth_m"] > 0 else 15.0,
                    formation=entities["formation_id"],
                    description=para[:1000],
                    root_cause=f"Identified from {entities['event_type_id']} entity trigger.",
                    mitigation="Standard remedial protocol per OIL/eRTMAC engineering standard.",
                    npt_hours=entities["npt_hours"],
                    confidence=entities["confidence"],
                    event_date=datetime.utcnow(),
                    source_dataset="INGESTED_NLP",
                    document_id=doc_id,
                )
                db.add(event_rec)
                created_records.append(entities)

            extracted_events.append(entities)

        db.commit()
        return extracted_events


nlp_engine = DrillingNLPEngine()
