"""
Unit tests for Pydantic schemas and modular router contracts.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas import (
    WellResponse,
    RiskZoneResponse,
    OverallRiskResponse,
    SimilarWellResponse,
    AIQueryResponse,
    AlertResponse,
    MemoryGraphResponse,
)

client = TestClient(app)


def test_public_root_endpoint():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["system"] == "eRTMAC-NWIS"
    assert data["status"] == "online"
    assert "database" in data


def test_public_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"


def test_ai_health_endpoint():
    res = client.get("/api/ai/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "provider" in data


def test_dataset_provenance_registry():
    res = client.get("/api/datasets")
    assert res.status_code == 200
    data = res.json()
    assert "datasets" in data
    assert len(data["datasets"]) >= 3
    dataset_codes = [d["code"] for d in data["datasets"]]
    assert "OIL_SYNTHETIC" in dataset_codes
    assert "FORCE_2020" in dataset_codes
    assert "EQUINOR_VOLVE" in dataset_codes


def test_dataset_detail_endpoint():
    res = client.get("/api/datasets/OIL_SYNTHETIC")
    assert res.status_code == 200
    data = res.json()
    assert data["code"] == "OIL_SYNTHETIC"
    assert "wells" in data


def test_dataset_detail_not_found():
    res = client.get("/api/datasets/NONEXISTENT_DATASET_XYZ")
    assert res.status_code == 404


def test_schema_validations():
    """Verify that Pydantic models instantiate with correct constraints."""
    risk_zone = RiskZoneResponse(
        zone_name="Tipam Mud Loss Zone",
        risk_type="MUD_LOSS",
        depth_start=3100.0,
        depth_end=3150.0,
        severity="CRITICAL",
        historical_event_count=3,
        confidence_score=0.95,
    )
    assert risk_zone.severity == "CRITICAL"
    assert risk_zone.depth_start == 3100.0

    overall = OverallRiskResponse(
        level="CRITICAL",
        highest_severity="CRITICAL",
        active_zone_count=1,
        approaching_count=2,
        active_zones=[risk_zone],
    )
    assert overall.level == "CRITICAL"
    assert len(overall.active_zones) == 1
