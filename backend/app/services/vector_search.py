"""
Vector Similarity Search Service
================================
Provides vector retrieval over DocumentChunk embeddings stored in the database.
Computes cosine similarity between query embeddings and chunk vectors.
"""
import hashlib
import math
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.document import Document, DocumentChunk
from app.models.well import Well


def compute_text_embedding(text: str, dim: int = 64) -> List[float]:
    """
    Computes a deterministic 64-dimensional pseudo-embedding vector for a given text.
    Aligned with the embedding generation used in seed_data.py.
    """
    cleaned = text.strip().lower()
    h = hashlib.md5(cleaned.encode("utf-8")).hexdigest()
    raw = [int(h[j % len(h)], 16) / 15.0 for j in range(dim)]
    # Normalize vector to unit length for fast cosine dot-product
    norm = math.sqrt(sum(x * x for x in raw))
    if norm > 0:
        return [x / norm for x in raw]
    return raw


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Compute cosine similarity between two float vectors."""
    if not vec_a or not vec_b:
        return 0.0
    dim = min(len(vec_a), len(vec_b))
    dot = sum(vec_a[i] * vec_b[i] for i in range(dim))
    norm_a = math.sqrt(sum(vec_a[i] * vec_a[i] for i in range(dim)))
    norm_b = math.sqrt(sum(vec_b[i] * vec_b[i] for i in range(dim)))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class VectorSearchService:
    """
    Executes vector similarity search against document chunks stored in SQLite / PostgreSQL.
    """

    def __init__(self, db: Session):
        self.db = db

    def search_chunks(
        self,
        query: str,
        top_k: int = 5,
        min_similarity: float = 0.40,
        formation: Optional[str] = None,
        depth: Optional[float] = None,
        depth_tolerance: float = 300.0,
    ) -> List[Dict[str, Any]]:
        """
        Searches DocumentChunks using vector cosine similarity.
        Optionally boosts chunks matching depth or formation filters.
        """
        query_vec = compute_text_embedding(query)
        chunks = self.db.query(DocumentChunk).all()
        if not chunks:
            return []

        scored_chunks = []
        for chunk in chunks:
            if not chunk.embedding:
                continue

            score = cosine_similarity(query_vec, chunk.embedding)

            # Contextual boosting for formation and depth if relevant
            if formation and chunk.formation_context and formation.lower() in chunk.formation_context.lower():
                score += 0.15
            if depth and chunk.depth_context and abs(chunk.depth_context - depth) <= depth_tolerance:
                score += 0.10

            scored_chunks.append((score, chunk))

        # Sort descending by score
        scored_chunks.sort(key=lambda x: x[0], reverse=True)

        results = []
        for score, chunk in scored_chunks[:top_k]:
            doc = self.db.query(Document).filter(Document.id == chunk.document_id).first()
            well = self.db.query(Well).filter(Well.id == doc.well_id).first() if doc and doc.well_id else None

            results.append({
                "chunk_id": chunk.id,
                "document_id": doc.document_id if doc else "DOC-UNKNOWN",
                "document_title": doc.title if doc else "Operational Report",
                "document_type": doc.document_type if doc else "DDR",
                "well_id": well.well_id if well else "OIL-X104",
                "depth_context": chunk.depth_context,
                "formation_context": chunk.formation_context,
                "chunk_text": chunk.chunk_text,
                "similarity_score": round(min(score, 1.0), 3),
            })

        return results
