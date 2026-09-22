-- =============================================================================
-- eRTMAC-NWIS — Migration 001: Complete Schema
-- =============================================================================
-- Run this in Supabase Studio: Database → SQL Editor
-- Or via the Supabase CLI: supabase db push
--
-- ALL DATA IN THIS SYSTEM IS:
-- "Synthetic Demo Data — Not Real OIL Data"
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
-- Enable pgvector if available (for semantic search on document chunks)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- TABLE: formations
-- 10 canonical Assam-Arakan Basin geological formations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS formations (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL UNIQUE,
    depth_min       FLOAT         NOT NULL,   -- metres
    depth_max       FLOAT         NOT NULL,   -- metres
    lithology       VARCHAR(200),
    age             VARCHAR(100),
    "group"         VARCHAR(100),
    typical_events  JSONB         DEFAULT '[]'::JSONB,
    mud_weight_min  FLOAT,                    -- ppg
    mud_weight_max  FLOAT,                    -- ppg
    avg_porosity    FLOAT,                    -- %
    avg_permeability FLOAT,                   -- mD
    color_hex       VARCHAR(10)   DEFAULT '#888888',
    description     TEXT,
    source_label    VARCHAR(200)  DEFAULT 'Synthetic Demo Data — Not Real OIL Data'
);

CREATE INDEX IF NOT EXISTS ix_formations_name ON formations(name);

-- ---------------------------------------------------------------------------
-- TABLE: wells
-- Core well registry — 50 synthetic OIL wells + public dataset wells
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wells (
    id                  SERIAL PRIMARY KEY,
    well_id             VARCHAR(50)   NOT NULL UNIQUE,
    name                VARCHAR(100)  NOT NULL,
    latitude            FLOAT         NOT NULL,
    longitude           FLOAT         NOT NULL,
    field               VARCHAR(100),
    formation           VARCHAR(100),
    total_depth         FLOAT,                        -- metres
    well_type           VARCHAR(50),                  -- Development, Exploratory
    trajectory_type     VARCHAR(50),                  -- VERTICAL, DIRECTIONAL, HORIZONTAL
    spud_date           TIMESTAMPTZ,
    completion_date     TIMESTAMPTZ,
    status              VARCHAR(50)   DEFAULT 'COMPLETED',
    is_active           BOOLEAN       DEFAULT FALSE,
    mud_weight          FLOAT,                        -- ppg
    casing_program      TEXT,
    cementing_notes     TEXT,
    lessons_learned     TEXT,
    operator            VARCHAR(100)  DEFAULT 'Oil India Limited',
    -- Provenance
    source_dataset      VARCHAR(50)   DEFAULT 'OIL_SYNTHETIC',
    license             VARCHAR(100)  DEFAULT 'Proprietary / Synthetic',
    country             VARCHAR(50)   DEFAULT 'India',
    basin               VARCHAR(100)  DEFAULT 'Assam-Arakan',
    -- Extended geo
    x_coord             FLOAT,
    y_coord             FLOAT,
    utm_zone            VARCHAR(10),
    lithology           VARCHAR(100),
    -- Synthetic label (MANDATORY for all OIL_SYNTHETIC records)
    synthetic_label     VARCHAR(200)  DEFAULT 'Synthetic Demo Data — Not Real OIL Data',
    original_name       VARCHAR(100),
    formations_encountered JSONB     DEFAULT '[]'::JSONB,
    notes               TEXT,
    created_at          TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_wells_well_id     ON wells(well_id);
CREATE INDEX IF NOT EXISTS ix_wells_is_active   ON wells(is_active);
CREATE INDEX IF NOT EXISTS ix_wells_formation   ON wells(formation);
CREATE INDEX IF NOT EXISTS ix_wells_source      ON wells(source_dataset);
CREATE INDEX IF NOT EXISTS ix_wells_latlon      ON wells(latitude, longitude);

-- ---------------------------------------------------------------------------
-- TABLE: well_events
-- Historical drilling incidents — 200+ records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS well_events (
    id              SERIAL PRIMARY KEY,
    well_id         INTEGER       NOT NULL REFERENCES wells(id) ON DELETE CASCADE,

    -- Classification
    event_type      VARCHAR(50)   NOT NULL,   -- MUD_LOSS, STUCK_PIPE, KICK, etc.
    severity        VARCHAR(20)   NOT NULL,   -- LOW, MEDIUM, HIGH, CRITICAL

    -- Depth interval
    depth_start     FLOAT         NOT NULL,   -- metres
    depth_end       FLOAT,                    -- metres
    formation       VARCHAR(100),

    -- Details
    description     TEXT,
    root_cause      TEXT,
    mitigation      TEXT,
    npt_hours       FLOAT         DEFAULT 0,
    confidence      FLOAT         DEFAULT 0.9,  -- 0.0–1.0

    -- References
    event_date      TIMESTAMPTZ,
    source_dataset  VARCHAR(50)   DEFAULT 'OIL_SYNTHETIC',
    document_id     INTEGER       REFERENCES documents(id) ON DELETE SET NULL,
    synthetic_label VARCHAR(200)  DEFAULT 'Synthetic Demo Data — Not Real OIL Data',
    created_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_events_well_id    ON well_events(well_id);
CREATE INDEX IF NOT EXISTS ix_events_type       ON well_events(event_type);
CREATE INDEX IF NOT EXISTS ix_events_severity   ON well_events(severity);
CREATE INDEX IF NOT EXISTS ix_events_depth      ON well_events(depth_start);
CREATE INDEX IF NOT EXISTS ix_events_well_depth ON well_events(well_id, depth_start);
CREATE INDEX IF NOT EXISTS ix_events_source     ON well_events(source_dataset);

-- ---------------------------------------------------------------------------
-- TABLE: documents
-- DDR, WCR, Mud Log, Cementing Reports — 30+ records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id              SERIAL PRIMARY KEY,
    document_id     VARCHAR(100)  NOT NULL UNIQUE,   -- e.g. DDR-X104-2024-08
    document_type   VARCHAR(50),                     -- DDR, WCR, MUD_LOG, CEMENTING, OTHER
    well_id         INTEGER       REFERENCES wells(id) ON DELETE SET NULL,
    title           VARCHAR(200),
    date            TIMESTAMPTZ,
    text_content    TEXT,
    file_path       VARCHAR(500),
    depth_start     FLOAT,
    depth_end       FLOAT,
    formation       VARCHAR(100),
    metadata        JSONB         DEFAULT '{}'::JSONB,
    synthetic_label VARCHAR(200)  DEFAULT 'Synthetic Demo Data — Not Real OIL Data',
    created_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_documents_doc_id  ON documents(document_id);
CREATE INDEX IF NOT EXISTS ix_documents_well    ON documents(well_id);
CREATE INDEX IF NOT EXISTS ix_documents_type    ON documents(document_type);

-- ---------------------------------------------------------------------------
-- TABLE: document_chunks
-- Text chunks for RAG retrieval — embedding stored as JSONB (or VECTOR if pgvector)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_chunks (
    id                      SERIAL PRIMARY KEY,
    document_id             INTEGER       NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index             INTEGER,
    chunk_text              TEXT,
    embedding               JSONB,    -- float[] stored as JSON; swap to VECTOR(1536) with pgvector
    depth_context           FLOAT,
    formation_context       VARCHAR(100),
    event_type_context      VARCHAR(50),
    created_at              TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_chunks_doc        ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS ix_chunks_formation  ON document_chunks(formation_context);
CREATE INDEX IF NOT EXISTS ix_chunks_event_type ON document_chunks(event_type_context);

-- ---------------------------------------------------------------------------
-- TABLE: risk_zones
-- Depth intervals with historical risk derived from nearby well patterns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_zones (
    id                  SERIAL PRIMARY KEY,
    active_well_id      INTEGER       NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    event_type          VARCHAR(50),
    depth_start         FLOAT,
    depth_end           FLOAT,
    formation           VARCHAR(100),
    risk_score          FLOAT,           -- 0–100
    severity            VARCHAR(20),     -- LOW, MEDIUM, HIGH, CRITICAL
    evidence_count      INTEGER DEFAULT 0,
    explanation         TEXT,
    source_well_ids     JSONB     DEFAULT '[]'::JSONB,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_riskzones_well    ON risk_zones(active_well_id);
CREATE INDEX IF NOT EXISTS ix_riskzones_type    ON risk_zones(event_type);
CREATE INDEX IF NOT EXISTS ix_riskzones_depth   ON risk_zones(depth_start, depth_end);

-- ---------------------------------------------------------------------------
-- TABLE: alerts
-- Real-time-style alerts for the simulation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id              SERIAL PRIMARY KEY,
    well_id         INTEGER       NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    alert_type      VARCHAR(50),     -- RISK_APPROACHING, RISK_ENTERED, SIMILARITY_HIGH, etc.
    severity        VARCHAR(20),
    depth           FLOAT,
    message         TEXT,
    explanation     TEXT,
    evidence        JSONB     DEFAULT '[]'::JSONB,
    acknowledged    BOOLEAN   DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_alerts_well       ON alerts(well_id);
CREATE INDEX IF NOT EXISTS ix_alerts_type       ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS ix_alerts_acked      ON alerts(acknowledged);

-- ---------------------------------------------------------------------------
-- TABLE: drilling_parameters
-- Drilling parameter history — 1000+ depth-stamped records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drilling_parameters (
    id              SERIAL PRIMARY KEY,
    well_id         INTEGER       NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    timestamp       TIMESTAMPTZ   DEFAULT NOW(),
    depth           FLOAT,
    rop             FLOAT,        -- Rate of penetration (m/hr)
    wob             FLOAT,        -- Weight on bit (tonnes)
    rpm             FLOAT,        -- Rotary speed
    torque          FLOAT,        -- kNm
    pressure        FLOAT,        -- psi
    mud_flow        FLOAT,        -- lpm
    hook_load       FLOAT,        -- tonnes
    inclination     FLOAT,        -- degrees
    azimuth         FLOAT,        -- degrees
    mud_weight      FLOAT         -- ppg
);

CREATE INDEX IF NOT EXISTS ix_params_well       ON drilling_parameters(well_id);
CREATE INDEX IF NOT EXISTS ix_params_depth      ON drilling_parameters(depth);
CREATE INDEX IF NOT EXISTS ix_params_well_depth ON drilling_parameters(well_id, depth);

-- ---------------------------------------------------------------------------
-- TABLE: similarity_scores
-- Precomputed well-to-well similarity scores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS similarity_scores (
    id                  SERIAL PRIMARY KEY,
    reference_well_id   INTEGER       NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    offset_well_id      INTEGER       NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    overall_score       FLOAT         NOT NULL,   -- 0–100
    formation_score     FLOAT         DEFAULT 0,
    depth_score         FLOAT         DEFAULT 0,
    trajectory_score    FLOAT         DEFAULT 0,
    distance_score      FLOAT         DEFAULT 0,
    mud_weight_score    FLOAT         DEFAULT 0,
    event_pattern_score FLOAT         DEFAULT 0,
    rank                INTEGER       DEFAULT 0,
    explanation         JSONB         DEFAULT '[]'::JSONB,
    computed_at         TIMESTAMPTZ   DEFAULT NOW(),
    UNIQUE(reference_well_id, offset_well_id)
);

CREATE INDEX IF NOT EXISTS ix_sim_ref           ON similarity_scores(reference_well_id);
CREATE INDEX IF NOT EXISTS ix_sim_score         ON similarity_scores(overall_score DESC);

-- ---------------------------------------------------------------------------
-- TABLE: simulation_state
-- eRTMAC simulation control — single-row table (id=1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS simulation_state (
    id                  INTEGER PRIMARY KEY DEFAULT 1,
    active_well_id      INTEGER       REFERENCES wells(id),
    current_depth       FLOAT         DEFAULT 3050.0,
    is_running          BOOLEAN       DEFAULT FALSE,
    speed_multiplier    INTEGER       DEFAULT 1,
    start_depth         FLOAT         DEFAULT 3050.0,
    current_rop         FLOAT         DEFAULT 12.4,
    current_wob         FLOAT         DEFAULT 14.2,
    current_rpm         FLOAT         DEFAULT 110.0,
    current_torque      FLOAT         DEFAULT 18.2,
    current_pressure    FLOAT         DEFAULT 2850.0,
    current_mud_flow    FLOAT         DEFAULT 1620.0,
    current_hook_load   FLOAT         DEFAULT 185.0,
    current_inclination FLOAT         DEFAULT 8.5,
    current_azimuth     FLOAT         DEFAULT 142.0,
    updated_at          TIMESTAMPTZ   DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLE: well_logs
-- Depth-series petrophysical logs from FORCE 2020 public dataset
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS well_logs (
    id              SERIAL PRIMARY KEY,
    well_id         INTEGER       NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    depth_md        FLOAT         NOT NULL,   -- Measured Depth (m)
    depth_tvd       FLOAT,                    -- True Vertical Depth (m)
    formation       VARCHAR(100),
    lithology_code  INTEGER,
    lithology_name  VARCHAR(100),
    gr              FLOAT,        -- Gamma Ray (API)
    rhob            FLOAT,        -- Bulk Density (g/cc)
    nphi            FLOAT,        -- Neutron Porosity (fraction)
    rdep            FLOAT,        -- Deep Resistivity (ohm.m)
    pef             FLOAT,        -- Photoelectric Factor (barn/e)
    dtc             FLOAT,        -- Compressional Slowness (us/ft)
    source_dataset  VARCHAR(50)   DEFAULT 'FORCE_2020'
);

CREATE INDEX IF NOT EXISTS ix_logs_well         ON well_logs(well_id);
CREATE INDEX IF NOT EXISTS ix_logs_depth        ON well_logs(depth_md);
CREATE INDEX IF NOT EXISTS ix_logs_well_depth   ON well_logs(well_id, depth_md);
