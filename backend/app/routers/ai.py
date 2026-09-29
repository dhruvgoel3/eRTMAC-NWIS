"""
AI Copilot API Router
Provides evidence-backed AI queries synthesizing historical well insights and citations.
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Document
from app.services.ai_service import get_ai_provider
from app.auth.dependencies import require_permission, require_role, AuthenticatedUser
from app.services.audit_service import log_audit_event
from app.schemas.ai import AIQueryRequest, AIDocQueryRequest, AIQueryResponse, AIHealthResponse


router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/query", response_model=AIQueryResponse)
def ai_query(
    payload: AIQueryRequest,
    user: AuthenticatedUser = Depends(require_role("DRILLING_ENGINEER")),
    db: Session = Depends(get_db),
):
    """
    Query the OIL AI Copilot for operational decision support and offset well insights.
    Synthesizes answers with documented DDR/WCR citations and non-certainty advisory notices.
    """
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Query question cannot be empty")

    q_lower = question.lower()
    # RBAC Guardrail: Non-admin users cannot access administrative, user, or audit information via AI
    admin_topics = ["user", "users", "all users", "list users", "audit log", "audit logs", "audit trail", "credential", "credentials", "password", "passwords", "role management", "system config"]
    if not user.has_role("KNOWLEDGE_ADMIN") and any(w in q_lower for w in admin_topics):
        restricted_msg = "I can help with drilling and well intelligence, but user administration is outside your access scope."
        return {
            "summary": "Access Restricted: Administrative and user data is outside your access scope.",
            "historical_evidence": [],
            "similar_wells": [],
            "risk_interpretation": "Operational access control prevents retrieval of administrative records.",
            "sources": [],
            "answer": restricted_msg,
            "provider": "Ask NWIS (Role Guardrail)",
            "citations": [],
            "query_context": {
                "active_well": payload.well_id or "OIL-X123",
                "current_depth": payload.current_depth or 3050.0,
                "formation": "Tipam",
            },
        }

    provider = get_ai_provider(db)
    response = provider.query(
        question=question,
        active_well_id=payload.well_id or "OIL-X123",
        current_depth=payload.current_depth or 3050.0,
    )

    log_audit_event(
        db=db,
        action="AI_QUERY",
        user_id=user.id,
        resource_type="AI_AGENT",
        resource_id=user.email,
        metadata={
            "query": question[:200],
            "citations_count": len(response.get("citations", [])),
        },
    )
    return response


@router.post("/ask-doc", response_model=AIQueryResponse)
def ai_ask_doc(
    payload: AIDocQueryRequest,
    user: AuthenticatedUser = Depends(require_role("DRILLING_ENGINEER")),
    db: Session = Depends(get_db),
):
    """
    Query the AI Copilot specifically regarding a document or well's documentation context.
    """
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Query question cannot be empty")

    provider = get_ai_provider(db)

    doc_context = ""
    if payload.doc_id:
        doc = db.query(Document).filter(Document.id == payload.doc_id).first()
        if doc:
            fname = getattr(doc, "file_path", "") or getattr(doc, "document_id", "")
            dtype = getattr(doc, "document_type", "")
            doc_context = f"\n[Document Focus: {doc.title} ({fname}) - Type: {dtype}]\nSummary: {getattr(doc, 'text_content', '')[:400] if getattr(doc, 'text_content', None) else ''}"

    augmented_question = f"{question}{doc_context}" if doc_context else question
    response = provider.query(
        question=augmented_question,
        active_well_id=payload.well_id or "OIL-X123",
        current_depth=3050.0,
    )

    log_audit_event(
        db=db,
        action="AI_DOC_QUERY",
        user_id=user.id,
        resource_type="DOCUMENT",
        resource_id=str(payload.doc_id or payload.well_id or "doc"),
        metadata={
            "query": question[:200],
            "doc_id": payload.doc_id,
        },
    )
    return response



@router.get("/health", response_model=AIHealthResponse)
def ai_health():
    """Returns AI model status and configured engine provider."""
    has_key = bool(os.getenv("OPENAI_API_KEY", "").strip())
    return {
        "status": "online",
        "provider": "OpenAI" if has_key else "Demo (Offline / Knowledge Base)",
        "model": (os.getenv("AI_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4o-mini") if has_key else "NWIS-Demo-Synthesizer",
    }

