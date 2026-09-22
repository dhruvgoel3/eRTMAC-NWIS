-- =============================================================================
-- eRTMAC-NWIS — Migration 004: Performance Indexes
-- =============================================================================
-- Run AFTER 001_schema.sql (and optionally after 003_pgvector.sql)
--
-- Additional composite and expression indexes for:
--   1. Geo-spatial proximity queries (lat/lon bounding box)
--   2. Depth-range overlap queries (risk zone / event correlation)
--   3. JSONB evidence arrays (GIN for containment queries)
--   4. Full-text search on documents and events
-- =============================================================================

-- ---------------------------------------------------------------------------
-- GEOSPATIAL — fast bounding-box queries for nearby wells
-- ---------------------------------------------------------------------------
-- Composite (lat, lon) index for efficient bbox filtering
CREATE INDEX IF NOT EXISTS ix_wells_geo_bbox
    ON wells(latitude, longitude)
    WHERE is_active = FALSE;

-- ---------------------------------------------------------------------------
-- DEPTH-RANGE OVERLAP — for risk zone and event queries
-- ---------------------------------------------------------------------------
-- Events: composite (formation, depth_start) for formation+depth filters
CREATE INDEX IF NOT EXISTS ix_events_formation_depth
    ON well_events(formation, depth_start);

-- Risk zones: (active_well_id, depth_start, depth_end) for range checks
CREATE INDEX IF NOT EXISTS ix_riskzones_depth_range
    ON risk_zones(active_well_id, depth_start, depth_end);

-- Drilling parameters: (well_id, depth) for time-series queries
CREATE INDEX IF NOT EXISTS ix_params_well_ts
    ON drilling_parameters(well_id, timestamp DESC);

-- ---------------------------------------------------------------------------
-- JSONB — GIN indexes for array-containment queries
-- ---------------------------------------------------------------------------
-- Risk zones: source_well_ids is a JSON array — allow @> containment queries
CREATE INDEX IF NOT EXISTS ix_riskzones_source_wells_gin
    ON risk_zones USING GIN (source_well_ids);

-- Wells: formations_encountered JSON array
CREATE INDEX IF NOT EXISTS ix_wells_formations_gin
    ON wells USING GIN (formations_encountered);

-- Documents: metadata JSONB
CREATE INDEX IF NOT EXISTS ix_documents_metadata_gin
    ON documents USING GIN (metadata);

-- Alerts: evidence JSONB
CREATE INDEX IF NOT EXISTS ix_alerts_evidence_gin
    ON alerts USING GIN (evidence);

-- Similarity scores: explanation JSONB
CREATE INDEX IF NOT EXISTS ix_sim_explanation_gin
    ON similarity_scores USING GIN (explanation);

-- ---------------------------------------------------------------------------
-- FULL-TEXT SEARCH — document and event text
-- ---------------------------------------------------------------------------
-- Documents: full-text on title + text_content
CREATE INDEX IF NOT EXISTS ix_documents_fts
    ON documents
    USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(text_content, '')));

-- Well events: full-text on description + root_cause
CREATE INDEX IF NOT EXISTS ix_events_fts
    ON well_events
    USING GIN (to_tsvector('english', COALESCE(description, '') || ' ' || COALESCE(root_cause, '')));

-- ---------------------------------------------------------------------------
-- SIMILARITY — ranking queries
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_sim_ref_score
    ON similarity_scores(reference_well_id, overall_score DESC);

-- ---------------------------------------------------------------------------
-- ALERTS — active (unacknowledged) alerts per well
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_alerts_active
    ON alerts(well_id, acknowledged)
    WHERE acknowledged = FALSE;

-- ---------------------------------------------------------------------------
-- WELL EVENTS — by event_type + severity for risk aggregation
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_events_type_severity
    ON well_events(event_type, severity);

-- ---------------------------------------------------------------------------
-- WELL LOGS — depth range queries per well
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_logs_depth_range
    ON well_logs(well_id, depth_md, depth_tvd);
