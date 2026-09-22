-- =============================================================================
-- eRTMAC-NWIS — Migration 002: Row Level Security (RLS)
-- =============================================================================
-- Run AFTER 001_schema.sql
--
-- Policy design:
--   • All tables: public READ access (anon role can read)
--   • All writes: service_role only (backend uses service role key)
--   • No user-specific data — no per-user row filtering needed
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE formations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE wells               ENABLE ROW LEVEL SECURITY;
ALTER TABLE well_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_zones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE drilling_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE similarity_scores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_state    ENABLE ROW LEVEL SECURITY;
ALTER TABLE well_logs           ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- PUBLIC READ POLICIES
-- Anyone with the anon key can read all records.
-- This is appropriate since all data is synthetic demo data.
-- ---------------------------------------------------------------------------

CREATE POLICY "Public read formations"
    ON formations FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "Public read wells"
    ON wells FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "Public read well_events"
    ON well_events FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "Public read documents"
    ON documents FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "Public read document_chunks"
    ON document_chunks FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "Public read risk_zones"
    ON risk_zones FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "Public read alerts"
    ON alerts FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "Public read drilling_parameters"
    ON drilling_parameters FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "Public read similarity_scores"
    ON similarity_scores FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "Public read simulation_state"
    ON simulation_state FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "Public read well_logs"
    ON well_logs FOR SELECT TO anon, authenticated USING (TRUE);

-- ---------------------------------------------------------------------------
-- SERVICE ROLE WRITE POLICIES
-- Only the service_role (backend) can INSERT, UPDATE, DELETE.
-- The backend connects using DATABASE_URL (PostgreSQL connection string)
-- which bypasses RLS entirely. These policies protect the REST API layer.
-- ---------------------------------------------------------------------------

-- formations
CREATE POLICY "Service write formations"
    ON formations FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- wells
CREATE POLICY "Service write wells"
    ON wells FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- well_events
CREATE POLICY "Service write well_events"
    ON well_events FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- documents
CREATE POLICY "Service write documents"
    ON documents FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- document_chunks
CREATE POLICY "Service write document_chunks"
    ON document_chunks FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- risk_zones
CREATE POLICY "Service write risk_zones"
    ON risk_zones FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- alerts
CREATE POLICY "Service write alerts"
    ON alerts FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- drilling_parameters
CREATE POLICY "Service write drilling_parameters"
    ON drilling_parameters FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- similarity_scores
CREATE POLICY "Service write similarity_scores"
    ON similarity_scores FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- simulation_state (PATCH allowed for authenticated frontend too — for simulation control)
CREATE POLICY "Service write simulation_state"
    ON simulation_state FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Authenticated update simulation_state"
    ON simulation_state FOR UPDATE TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- well_logs
CREATE POLICY "Service write well_logs"
    ON well_logs FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
