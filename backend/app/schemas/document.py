"""
Pydantic schemas for Documents, Daily Drilling Reports (DDR), and WCRs.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class DocumentSummaryResponse(BaseModel):
    id: int
    document_id: str
    document_type: str
    well_id: Optional[str] = None
    title: str
    date: Optional[str] = None
    depth_start: Optional[float] = None
    depth_end: Optional[float] = None
    formation: Optional[str] = None


class DocumentDetailResponse(DocumentSummaryResponse):
    well_name: Optional[str] = None
    text_content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
