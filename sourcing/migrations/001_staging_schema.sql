-- Windwalker Sourcing: Staging Database Schema
-- Migration 001: Initial staging tables for scraped treaty data
--
-- This schema supports the data sourcing pipeline with:
-- - Full provenance tracking for every data point
-- - Evidentiality markers (verified, reported, uncertain, paradox)
-- - Conflict detection and resolution workflow
-- - Human review queue integration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- ENUMS (matching Sigil types)
-- ============================================================================

CREATE TYPE source_type AS ENUM (
    'kappler',
    'nara',
    'bia',
    'loc',
    'federal_register',
    'statutes_at_large',
    'tribal_official',
    'state_archive',
    'academic'
);

CREATE TYPE confidence_level AS ENUM (
    'verified',        -- Multiple corroborating sources
    'authoritative',   -- Single authoritative source
    'probable',        -- Reasonable confidence
    'uncertain',       -- Limited evidence
    'disputed',        -- Sources disagree
    'reconstructed'    -- Inferred from indirect evidence
);

CREATE TYPE evidentiality AS ENUM (
    'verified',    -- ! computed/cross-referenced
    'reported',    -- ~ from authoritative source
    'uncertain',   -- ? may not exist
    'paradox'      -- ‽ conflicting sources
);

CREATE TYPE validation_error_type AS ENUM (
    'missing_required',
    'invalid_format',
    'out_of_range',
    'invalid_reference',
    'failed_cross_reference'
);

CREATE TYPE validation_warning_type AS ENUM (
    'missing_recommended',
    'possible_typo',
    'unusual_value',
    'unknown_reference',
    'low_confidence'
);

CREATE TYPE resolution_type AS ENUM (
    'preferred_source',
    'synthesis',
    'unresolved',
    'tribal_determination',
    'pending_review'
);

CREATE TYPE review_trigger AS ENUM (
    'new_entity',
    'source_conflict',
    'low_confidence_match',
    'unknown_name',
    'geographic_ambiguity',
    'missing_required',
    'validation_failed'
);

CREATE TYPE review_priority AS ENUM (
    'critical',
    'high',
    'medium',
    'low'
);

CREATE TYPE review_status AS ENUM (
    'pending',
    'in_progress',
    'needs_more_research',
    'resolved',
    'deferred'
);

-- ============================================================================
-- DATA SOURCES
-- ============================================================================

CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id TEXT NOT NULL UNIQUE,
    source_type source_type NOT NULL,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    last_scraped TIMESTAMPTZ,
    reliability DECIMAL(3,2) NOT NULL CHECK (reliability >= 0 AND reliability <= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_data_sources_type ON data_sources(source_type);

-- Seed the known sources
INSERT INTO data_sources (source_id, source_type, name, base_url, reliability) VALUES
    ('kappler', 'kappler', 'Kappler''s Indian Affairs: Laws and Treaties', 'https://oklegal.onenet.net/kappler/', 0.98),
    ('nara', 'nara', 'National Archives and Records Administration', 'https://catalog.archives.gov/api/v1/', 0.99),
    ('bia', 'bia', 'Bureau of Indian Affairs', 'https://www.bia.gov/', 0.95);

-- ============================================================================
-- RAW TREATIES (from Kappler primarily)
-- ============================================================================

CREATE TABLE raw_treaties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Source tracking
    source_id UUID NOT NULL REFERENCES data_sources(id),
    source_url TEXT NOT NULL,
    scraped_at TIMESTAMPTZ NOT NULL,

    -- Kappler identifiers
    kappler_volume INTEGER,
    kappler_page INTEGER,

    -- Basic info with evidentiality
    title TEXT NOT NULL,
    title_evidentiality evidentiality NOT NULL DEFAULT 'reported',

    date_signed_text TEXT,
    date_ratified_text TEXT,
    date_proclaimed_text TEXT,

    -- Parsed dates (after normalization)
    date_signed DATE,
    date_ratified DATE,
    date_proclaimed DATE,

    -- Parties (stored as JSONB arrays)
    tribal_parties_text JSONB NOT NULL DEFAULT '[]',
    us_commissioners_text JSONB NOT NULL DEFAULT '[]',

    -- Content
    preamble TEXT,
    articles_text JSONB NOT NULL DEFAULT '[]',
    signatures_text JSONB NOT NULL DEFAULT '[]',

    -- Legal citations
    statutes_at_large_citation TEXT,

    -- Raw HTML for reprocessing
    raw_html TEXT NOT NULL,

    -- Processing status
    is_validated BOOLEAN NOT NULL DEFAULT FALSE,
    is_normalized BOOLEAN NOT NULL DEFAULT FALSE,
    validation_errors JSONB,
    validation_warnings JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raw_treaties_source ON raw_treaties(source_id);
CREATE INDEX idx_raw_treaties_kappler ON raw_treaties(kappler_volume, kappler_page);
CREATE INDEX idx_raw_treaties_date_signed ON raw_treaties(date_signed);
CREATE INDEX idx_raw_treaties_validated ON raw_treaties(is_validated);

-- ============================================================================
-- RAW TRIBES (from BIA primarily)
-- ============================================================================

CREATE TABLE raw_tribes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Source tracking
    source_id UUID NOT NULL REFERENCES data_sources(id),
    source_url TEXT NOT NULL,
    scraped_at TIMESTAMPTZ NOT NULL,

    -- BIA identifiers
    bia_id TEXT,

    -- Basic info
    name TEXT NOT NULL,
    name_evidentiality evidentiality NOT NULL DEFAULT 'reported',
    alternate_names JSONB NOT NULL DEFAULT '[]',

    -- Location
    region TEXT,
    state TEXT,
    headquarters_address TEXT,
    headquarters_location GEOMETRY(Point, 4326),

    -- Contact
    leader_name TEXT,
    leader_title TEXT,
    phone TEXT,
    website TEXT,

    -- Recognition
    federally_recognized BOOLEAN,
    recognition_date TEXT,
    recognition_date_parsed DATE,

    -- Processing status
    is_validated BOOLEAN NOT NULL DEFAULT FALSE,
    validation_errors JSONB,
    validation_warnings JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raw_tribes_source ON raw_tribes(source_id);
CREATE INDEX idx_raw_tribes_bia_id ON raw_tribes(bia_id);
CREATE INDEX idx_raw_tribes_name ON raw_tribes(name);
CREATE INDEX idx_raw_tribes_state ON raw_tribes(state);
CREATE INDEX idx_raw_tribes_location ON raw_tribes USING GIST(headquarters_location);

-- ============================================================================
-- RAW ARCHIVE RECORDS (from NARA)
-- ============================================================================

CREATE TABLE raw_archive_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Source tracking
    source_id UUID NOT NULL REFERENCES data_sources(id),
    source_url TEXT NOT NULL,
    scraped_at TIMESTAMPTZ NOT NULL,

    -- NARA identifiers
    nara_id TEXT NOT NULL,
    record_group TEXT,
    series TEXT,

    -- Basic info
    title TEXT NOT NULL,
    title_evidentiality evidentiality NOT NULL DEFAULT 'reported',
    description TEXT,

    -- Dates
    date_range_text TEXT,
    date_start DATE,
    date_end DATE,

    -- Digital objects
    digital_object_urls JSONB NOT NULL DEFAULT '[]',

    -- Processing status
    is_validated BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raw_archive_records_nara_id ON raw_archive_records(nara_id);
CREATE INDEX idx_raw_archive_records_record_group ON raw_archive_records(record_group);

-- ============================================================================
-- PROVENANCE TRACKING
-- ============================================================================

CREATE TABLE provenance_chains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- What entity does this provenance belong to?
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    field_name TEXT NOT NULL,

    -- Current resolved value
    current_value TEXT,
    current_evidentiality evidentiality NOT NULL DEFAULT 'reported',
    confidence confidence_level NOT NULL DEFAULT 'authoritative',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(entity_type, entity_id, field_name)
);

CREATE TABLE provenance_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chain_id UUID NOT NULL REFERENCES provenance_chains(id) ON DELETE CASCADE,

    -- Source info
    source_id UUID NOT NULL REFERENCES data_sources(id),
    source_url TEXT NOT NULL,

    -- The raw value as extracted
    raw_value TEXT,

    -- Extraction metadata
    extracted_at TIMESTAMPTZ NOT NULL,
    extractor_version TEXT NOT NULL,

    -- Order in chain
    step_order INTEGER NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provenance_chains_entity ON provenance_chains(entity_type, entity_id);
CREATE INDEX idx_provenance_steps_chain ON provenance_steps(chain_id);

-- ============================================================================
-- CONFLICT DETECTION & RESOLUTION
-- ============================================================================

CREATE TABLE conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- What entity has conflicting data
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    field_name TEXT NOT NULL,

    -- Different versions (stored as JSONB array of {value, source_id, confidence})
    versions JSONB NOT NULL,

    -- Resolution
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolution_type resolution_type,
    resolved_value TEXT,
    resolution_rationale TEXT,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conflicts_entity ON conflicts(entity_type, entity_id);
CREATE INDEX idx_conflicts_unresolved ON conflicts(is_resolved) WHERE is_resolved = FALSE;

-- ============================================================================
-- REVIEW QUEUE
-- ============================================================================

CREATE TABLE review_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- What needs review
    entity_type TEXT NOT NULL,
    entity_id UUID,
    raw_data JSONB NOT NULL,

    -- Why does this need review?
    trigger review_trigger NOT NULL,
    priority review_priority NOT NULL DEFAULT 'medium',

    -- Sources already consulted
    sources_consulted JSONB NOT NULL DEFAULT '[]',

    -- Related conflicts
    conflict_ids UUID[] DEFAULT '{}',

    -- Status
    status review_status NOT NULL DEFAULT 'pending',
    assigned_to TEXT,

    -- Resolution
    resolution TEXT,
    resolution_notes TEXT,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_queue_status ON review_queue(status);
CREATE INDEX idx_review_queue_priority ON review_queue(priority);
CREATE INDEX idx_review_queue_assigned ON review_queue(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_review_queue_pending ON review_queue(priority, created_at) WHERE status = 'pending';

-- ============================================================================
-- CROSS-REFERENCE MAPPING
-- ============================================================================

-- Links entities across different sources (e.g., Kappler treaty to NARA record)
CREATE TABLE cross_references (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- First entity
    entity_type_a TEXT NOT NULL,
    entity_id_a UUID NOT NULL,
    source_id_a UUID NOT NULL REFERENCES data_sources(id),

    -- Second entity
    entity_type_b TEXT NOT NULL,
    entity_id_b UUID NOT NULL,
    source_id_b UUID NOT NULL REFERENCES data_sources(id),

    -- Match confidence
    confidence confidence_level NOT NULL,
    match_score DECIMAL(5,4) CHECK (match_score >= 0 AND match_score <= 1),

    -- How was this match determined?
    match_method TEXT NOT NULL, -- 'exact_title', 'fuzzy_title', 'date_match', 'manual', etc.

    -- Verification
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by TEXT,
    verified_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(entity_type_a, entity_id_a, entity_type_b, entity_id_b)
);

CREATE INDEX idx_cross_references_a ON cross_references(entity_type_a, entity_id_a);
CREATE INDEX idx_cross_references_b ON cross_references(entity_type_b, entity_id_b);
CREATE INDEX idx_cross_references_unverified ON cross_references(is_verified) WHERE is_verified = FALSE;

-- ============================================================================
-- SCRAPING STATE
-- ============================================================================

-- Track scraping progress for resumable operations
CREATE TABLE scrape_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    source_id UUID NOT NULL REFERENCES data_sources(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,

    -- Progress
    total_items INTEGER,
    processed_items INTEGER NOT NULL DEFAULT 0,
    failed_items INTEGER NOT NULL DEFAULT 0,

    -- Status
    status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed, cancelled
    error_message TEXT,

    -- Configuration used
    config JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_scrape_runs_source ON scrape_runs(source_id);
CREATE INDEX idx_scrape_runs_status ON scrape_runs(status);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- What changed
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'resolve_conflict', etc.

    -- Who made the change
    actor TEXT NOT NULL, -- 'pipeline', user email, etc.

    -- What changed (JSONB diff)
    changes JSONB,

    -- When
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_time ON audit_log(created_at);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_data_sources_timestamp
    BEFORE UPDATE ON data_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_raw_treaties_timestamp
    BEFORE UPDATE ON raw_treaties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_raw_tribes_timestamp
    BEFORE UPDATE ON raw_tribes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_raw_archive_records_timestamp
    BEFORE UPDATE ON raw_archive_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_provenance_chains_timestamp
    BEFORE UPDATE ON provenance_chains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_conflicts_timestamp
    BEFORE UPDATE ON conflicts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_review_queue_timestamp
    BEFORE UPDATE ON review_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE data_sources IS 'Authoritative sources for treaty data (Kappler, NARA, BIA, etc.)';
COMMENT ON TABLE raw_treaties IS 'Raw treaty data as scraped, before normalization';
COMMENT ON TABLE raw_tribes IS 'Raw tribal nation data as scraped from BIA';
COMMENT ON TABLE raw_archive_records IS 'NARA archive records linked to treaties';
COMMENT ON TABLE provenance_chains IS 'Full provenance tracking for every data point';
COMMENT ON TABLE conflicts IS 'When sources disagree about a data point';
COMMENT ON TABLE review_queue IS 'Items requiring human expert review';
COMMENT ON TABLE cross_references IS 'Links entities across different sources';
COMMENT ON TABLE scrape_runs IS 'Track scraping operations for resumability';
COMMENT ON TABLE audit_log IS 'All changes to staging data';
