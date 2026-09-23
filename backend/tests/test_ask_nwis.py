"""
Unit and Integration Tests for 'Ask NWIS' AI Assistant
======================================================
Tests:
- Vector similarity search
- Strict anti-hallucination guardrails
- 5 mandatory response sections: Summary, Historical evidence, Similar wells, Risk interpretation, Sources
- The 7 required operational questions:
    1. "What happened around 3200m?"
    2. "Which nearby well is most similar?"
    3. "Why is 3180m risky?"
    4. "What happened in OIL-X104?"
    5. "What historical stuck-pipe events occurred?"
    6. "What mitigation was documented?"
    7. "What formations are associated with mud loss?"
- Fallback for non-existent evidence: "I could not find sufficient evidence in the NWIS knowledge base."
"""
import pytest
from app.database import SessionLocal
from app.services.vector_search import VectorSearchService, compute_text_embedding, cosine_similarity
from app.services.ai_service import DemoAIProvider, ContextAssembler, get_ai_provider


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    yield db
    db.close()


def test_vector_search_service(db_session):
    vec_svc = VectorSearchService(db_session)
    chunks = vec_svc.search_chunks(query="mud loss and stuck pipe in Tipam", top_k=3)
    assert len(chunks) > 0
    first_chunk = chunks[0]
    assert "document_id" in first_chunk
    assert "chunk_text" in first_chunk
    assert first_chunk["similarity_score"] > 0.0


def test_question_around_3200m(db_session):
    provider = DemoAIProvider(db_session)
    res = provider.query("What happened around 3200m?")

    assert "summary" in res and res["summary"]
    assert "historical_evidence" in res and len(res["historical_evidence"]) > 0
    assert "similar_wells" in res and len(res["similar_wells"]) > 0
    assert "risk_interpretation" in res and res["risk_interpretation"]
    assert "sources" in res and len(res["sources"]) > 0

    answer = res["answer"]
    assert "SUMMARY" in answer
    assert "HISTORICAL EVIDENCE" in answer
    assert "SIMILAR WELLS" in answer
    assert "RISK INTERPRETATION" in answer
    assert "SOURCES" in answer
    assert "3,280" in answer or "3280" in answer or "3,210" in answer or "3210" in answer


def test_question_most_similar_well(db_session):
    provider = DemoAIProvider(db_session)
    res = provider.query("Which nearby well is most similar?")

    assert "OIL-X104" in res["summary"]
    assert "91%" in res["summary"] or "91%" in res["answer"]
    assert any("OIL-X104" in w for w in res["similar_wells"])
    assert len(res["sources"]) > 0


def test_question_why_3180m_risky(db_session):
    provider = DemoAIProvider(db_session)
    res = provider.query("Why is 3180m risky?")

    assert "3,180" in res["summary"] or "3180" in res["summary"] or "stuck pipe" in res["summary"].lower()
    assert "HISTORICAL EVIDENCE" in res["answer"]
    assert "RISK INTERPRETATION" in res["answer"]
    assert "Non-Certainty" in res["risk_interpretation"] or "susceptibility" in res["risk_interpretation"]


def test_question_what_happened_in_oil_x104(db_session):
    provider = DemoAIProvider(db_session)
    res = provider.query("What happened in OIL-X104?")

    assert "OIL-X104" in res["summary"]
    assert any("3280" in str(e) for e in res["historical_evidence"])
    assert any("3120" in str(e) for e in res["historical_evidence"])
    assert len(res["sources"]) > 0


def test_question_historical_stuck_pipe(db_session):
    provider = DemoAIProvider(db_session)
    res = provider.query("What historical stuck-pipe events occurred?")

    assert "stuck" in res["summary"].lower()
    assert len(res["historical_evidence"]) >= 3
    # Check that OIL-X104, X101, or X106 are present
    wells_mentioned = [e.get("well_id") for e in res["historical_evidence"]]
    assert any(w in ["OIL-X104", "OIL-X101", "OIL-X106"] for w in wells_mentioned)


def test_question_mitigation_documented(db_session):
    provider = DemoAIProvider(db_session)
    res = provider.query("What mitigation was documented?")

    assert "mitigation" in res["summary"].lower() or "pill" in res["summary"].lower()
    assert len(res["historical_evidence"]) > 0
    answer_lower = res["answer"].lower()
    assert "pill" in answer_lower or "lubricant" in answer_lower or "diesel" in answer_lower


def test_question_formations_mud_loss(db_session):
    provider = DemoAIProvider(db_session)
    res = provider.query("What formations are associated with mud loss?")

    assert "Tipam" in res["summary"] or "Tipam" in res["answer"]
    answer = res["answer"]
    assert "Tipam" in answer
    assert "Namsang" in answer or "Bokabil" in answer or "Langpur" in answer


def test_anti_hallucination_unknown_well(db_session):
    provider = DemoAIProvider(db_session)
    res = provider.query("What happened in OIL-Z999 at 9999m?")

    expected_msg = "I could not find sufficient evidence in the NWIS knowledge base."
    assert res["summary"] == expected_msg
    assert res["answer"] == expected_msg
    assert len(res["historical_evidence"]) == 0
    assert len(res["sources"]) == 0


def test_all_five_sections_always_present(db_session):
    questions = [
        "What happened around 3200m?",
        "Which nearby well is most similar?",
        "Why is 3180m risky?",
        "What happened in OIL-X104?",
        "What historical stuck-pipe events occurred?",
        "What mitigation was documented?",
        "What formations are associated with mud loss?",
    ]
    provider = DemoAIProvider(db_session)

    for q in questions:
        res = provider.query(q)
        assert res["summary"], f"Missing summary for: {q}"
        assert res["historical_evidence"] is not None, f"Missing historical_evidence for: {q}"
        assert res["similar_wells"] is not None, f"Missing similar_wells for: {q}"
        assert res["risk_interpretation"], f"Missing risk_interpretation for: {q}"
        assert res["sources"] is not None, f"Missing sources for: {q}"

        answer = res["answer"]
        assert "SUMMARY" in answer, f"Answer missing SUMMARY header for: {q}"
        assert "HISTORICAL EVIDENCE" in answer, f"Answer missing HISTORICAL EVIDENCE header for: {q}"
        assert "SIMILAR WELLS" in answer, f"Answer missing SIMILAR WELLS header for: {q}"
        assert "RISK INTERPRETATION" in answer, f"Answer missing RISK INTERPRETATION header for: {q}"
        assert "SOURCES" in answer, f"Answer missing SOURCES header for: {q}"
