"""
Documents API Router
Provides access to institutional DDRs, Well Completion Reports, and Mud Logs.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Well, Document
from app.auth.dependencies import require_permission, AuthenticatedUser
from app.schemas.document import DocumentSummaryResponse, DocumentDetailResponse

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=List[DocumentSummaryResponse])
def get_documents(
    well_id_str: Optional[str] = Query(None, description="Filter by well ID (e.g. OIL-X104)"),
    doc_type: Optional[str] = Query(None, description="DDR | WCR | MUD_LOG | INCIDENT"),
    user: AuthenticatedUser = Depends(require_permission("documents.view")),
    db: Session = Depends(get_db),
):
    """List operational documents with optional filtering by well and document type."""
    q = db.query(Document).options(joinedload(Document.well))
    if well_id_str:
        well = db.query(Well).filter(Well.well_id == well_id_str).first()
        if well:
            q = q.filter(Document.well_id == well.id)
    if doc_type:
        q = q.filter(Document.document_type == doc_type)

    docs = q.order_by(Document.date.desc()).all()

    result = []
    for d in docs:
        well = d.well
        result.append({
            "id": d.id,
            "document_id": d.document_id,
            "document_type": d.document_type,
            "well_id": well.well_id if well else None,
            "title": d.title,
            "date": d.date.isoformat() if d.date else None,
            "depth_start": d.depth_start,
            "depth_end": d.depth_end,
            "formation": d.formation,
        })
    return result


@router.get("/{doc_id}", response_model=DocumentDetailResponse)
def get_document(
    doc_id: str,
    user: AuthenticatedUser = Depends(require_permission("documents.view")),
    db: Session = Depends(get_db),
):
    """Retrieve full document text, lessons learned, and operational metadata."""
    doc = db.query(Document).filter(Document.document_id == doc_id).first()
    if not doc:
        try:
            doc = db.query(Document).filter(Document.id == int(doc_id)).first()
        except (ValueError, TypeError):
            pass

    if not doc:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")

    well = db.query(Well).filter(Well.id == doc.well_id).first()
    return {
        "id": doc.id,
        "document_id": doc.document_id,
        "document_type": doc.document_type,
        "well_id": well.well_id if well else None,
        "well_name": well.name if well else None,
        "title": doc.title,
        "date": doc.date.isoformat() if doc.date else None,
        "text_content": doc.text_content,
        "depth_start": doc.depth_start,
        "depth_end": doc.depth_end,
        "formation": doc.formation,
        "metadata": doc.metadata_,
    }
