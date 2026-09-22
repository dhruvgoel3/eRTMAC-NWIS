"""
SQLAlchemy model for Documents (DDR, WCR, Mud Logs, Cementing Reports).
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(String(100), unique=True, index=True)  # e.g. DDR-X104-2024-08
    document_type = Column(String(50))   # DDR, WCR, MUD_LOG, CEMENTING, OTHER
    well_id = Column(Integer, ForeignKey("wells.id"), nullable=True, index=True)

    title = Column(String(200))
    date = Column(DateTime)
    text_content = Column(Text)   # Extracted text content
    file_path = Column(String(500))
    depth_start = Column(Float)
    depth_end = Column(Float)
    formation = Column(String(100))
    metadata_ = Column("metadata", JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    well = relationship("Well", back_populates="documents")
    events = relationship("WellEvent", back_populates="document")
    chunks = relationship("DocumentChunk", back_populates="document")


class DocumentChunk(Base):
    """
    Stores text chunks from documents for RAG retrieval.
    Each chunk has a simple text embedding (numpy array stored as JSON list).
    """
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    chunk_index = Column(Integer)
    chunk_text = Column(Text)
    embedding = Column(JSON)    # numpy vector stored as list
    depth_context = Column(Float)
    formation_context = Column(String(100))
    event_type_context = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    document = relationship("Document", back_populates="chunks")
