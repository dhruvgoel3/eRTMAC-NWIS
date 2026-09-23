"""
AI Copilot API Router
Provides evidence-backed AI queries synthesizing historical well insights and citations.
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.ai_service import get_ai_provider
from app.auth.dependencies import require_permission, AuthenticatedUser
from app.services.audit_service import log_audit_event
from app.schemas.ai import AIQueryRequest, AIQueryResponse, AIHealthResponse

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/query", response_model=AIQueryResponse)
def ai_query(
    payload: AIQueryRequest,
    user: AuthenticatedUser = Depends(require_permission("ai.query")),
    db: Session = Depends(get_db),
):
    """
    Query the OIL AI Copilot for operational decision support and offset well insights.
    Synthesizes answers with documented DDR/WCR citations and non-certainty advisory notices.
    """
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Query question cannot be empty")

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


@router.get("/health", response_model=AIHealthResponse)
def ai_health():
    """Returns AI model status and configured engine provider."""
    has_key = bool(os.getenv("OPENAI_API_KEY", "").strip())
    return {
        "status": "online",
        "provider": "OpenAI" if has_key else "Demo (Offline / Knowledge Base)",
        "model": os.getenv("AI_MODEL", "gpt-4o-mini") if has_key else "NWIS-Demo-Synthesizer",
    }
