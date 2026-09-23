"""
Common reusable Pydantic schemas and standard response envelopes.
"""
from typing import Generic, TypeVar, Optional, Any, List, Dict
from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error description")
    details: Optional[Any] = Field(None, description="Detailed validation or trace info")


class APIResponse(BaseModel, Generic[T]):
    """Standardized API response wrapper."""
    success: bool = True
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None


class StatusResponse(BaseModel):
    status: str
    message: Optional[str] = None


class PaginationParams(BaseModel):
    limit: int = Field(50, ge=1, le=500)
    offset: int = Field(0, ge=0)
