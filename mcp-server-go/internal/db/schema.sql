-- Deep Research Framework - Database Schema
-- Version: 4.0 (v3.1 + streaming data ingestion)
-- SQLite with WAL mode

-- ==================== Core Tables ====================

-- Research Sessions
CREATE TABLE IF NOT EXISTS research_sessions (
    session_id TEXT PRIMARY KEY,
    research_topic TEXT NOT NULL,
    research_type TEXT DEFAULT 'deep',
    output_directory TEXT NOT NULL,
    status TEXT DEFAULT 'initializing'
        CHECK (status IN ('initializing', 'planning', 'executing', 'synthesizing', 'validating', 'completed', 'failed')),
    current_phase INTEGER DEFAULT 0,
    -- v4.1: Added for state machine persistence
    iteration_count INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.0,
    is_aggregated INTEGER DEFAULT 0,
    budget_exhausted INTEGER DEFAULT 0,
    max_iterations INTEGER DEFAULT 10,
    confidence_threshold REAL DEFAULT 0.9,
    -- v4.1: Session-level locking for concurrency control
    locked_at TEXT,
    locked_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON research_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON research_sessions(created_at);

-- Research Agents
CREATE TABLE IF NOT EXISTS research_agents (
    agent_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    agent_role TEXT,
    focus_description TEXT,
    search_queries TEXT,
    status TEXT DEFAULT 'deploying'
        CHECK (status IN ('deploying', 'running', 'completed', 'failed', 'timeout')),
    output_file TEXT,
    token_usage INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_agents_session ON research_agents(session_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON research_agents(session_id, status);

-- ==================== Activity & Progress ====================

-- Activity Log (unified logging - replaces manual progress.md editing)
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    phase INTEGER NOT NULL,
    event_type TEXT NOT NULL
        CHECK (event_type IN ('phase_start', 'phase_complete', 'agent_deploy', 'agent_complete', 'info', 'error')),
    message TEXT NOT NULL,
    agent_id TEXT,
    details TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_session ON activity_log(session_id, phase);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(session_id, event_type);

-- Phase Checkpoints (for recovery)
CREATE TABLE IF NOT EXISTS phase_checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    phase_number INTEGER NOT NULL,
    checkpoint_type TEXT NOT NULL DEFAULT 'checkpoint'
        CHECK (checkpoint_type IN ('pre_execution', 'mid_execution', 'post_execution', 'checkpoint')),
    state_snapshot TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_session ON phase_checkpoints(session_id, phase_number);

-- ==================== v4.0 Streaming Data Ingestion ====================

-- Ingested Data Queue (v4.0)
CREATE TABLE IF NOT EXISTS ingested_data (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    data_type TEXT NOT NULL
        CHECK (data_type IN ('raw_text', 'web_page', 'document', 'fact', 'entity')),
    data TEXT NOT NULL,
    source_url TEXT,
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    processed_at TEXT,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_ingested_session ON ingested_data(session_id);
CREATE INDEX IF NOT EXISTS idx_ingested_status ON ingested_data(session_id, status);

-- ==================== Graph of Thoughts ====================

-- GoT Nodes
CREATE TABLE IF NOT EXISTS got_nodes (
    node_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    parent_id TEXT,
    node_type TEXT NOT NULL
        CHECK (node_type IN ('root', 'generated', 'aggregated', 'refined')),
    content TEXT NOT NULL,
    summary TEXT,
    quality_score REAL DEFAULT 0.0,
    compression_ratio REAL DEFAULT 1.0,
    status TEXT DEFAULT 'active'
        CHECK (status IN ('active', 'pruned', 'aggregated', 'refined')),
    depth INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_got_session ON got_nodes(session_id);
CREATE INDEX IF NOT EXISTS idx_got_parent ON got_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_got_status ON got_nodes(session_id, status);

-- GoT Operations
CREATE TABLE IF NOT EXISTS got_operations (
    operation_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    operation_type TEXT NOT NULL
        CHECK (operation_type IN ('Generate', 'Aggregate', 'Refine', 'Score', 'Prune')),
    input_nodes TEXT NOT NULL,
    output_nodes TEXT,
    parameters TEXT,
    executed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_got_ops_session ON got_operations(session_id);

-- ==================== Facts & Entities ====================

-- Extracted Facts
CREATE TABLE IF NOT EXISTS facts (
    fact_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    entity TEXT NOT NULL,
    attribute TEXT NOT NULL,
    value TEXT NOT NULL,
    source_url TEXT,
    source_quality TEXT DEFAULT 'C'
        CHECK (source_quality IN ('A', 'B', 'C', 'D', 'E')),
    confidence REAL DEFAULT 0.5,
    extracted_from TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_facts_session ON facts(session_id);
CREATE INDEX IF NOT EXISTS idx_facts_entity ON facts(entity);
CREATE INDEX IF NOT EXISTS idx_facts_quality ON facts(source_quality);

-- Fact Conflicts
CREATE TABLE IF NOT EXISTS fact_conflicts (
    conflict_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    fact_a_id TEXT NOT NULL,
    fact_b_id TEXT NOT NULL,
    conflict_type TEXT NOT NULL,
    severity TEXT DEFAULT 'medium'
        CHECK (severity IN ('low', 'medium', 'high')),
    resolved INTEGER DEFAULT 0,
    resolution_note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conflicts_session ON fact_conflicts(session_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_resolved ON fact_conflicts(resolved);

-- Entities
CREATE TABLE IF NOT EXISTS entities (
    entity_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    description TEXT,
    mention_count INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entities_session ON entities(session_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);

-- Entity Relationships
CREATE TABLE IF NOT EXISTS entity_relationships (
    relationship_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    from_entity_id TEXT NOT NULL,
    to_entity_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL,
    source_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_relationships_session ON entity_relationships(session_id);

-- Citations
CREATE TABLE IF NOT EXISTS citations (
    citation_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    author TEXT,
    title TEXT,
    source_name TEXT,
    url TEXT,
    publication_date TEXT,
    quality_rating TEXT DEFAULT 'C'
        CHECK (quality_rating IN ('A', 'B', 'C', 'D', 'E')),
    is_valid INTEGER DEFAULT 1,
    validation_notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_citations_session ON citations(session_id);
CREATE INDEX IF NOT EXISTS idx_citations_quality ON citations(quality_rating);

-- ==================== Metrics ====================

-- Token Usage Metrics
CREATE TABLE IF NOT EXISTS token_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    phase INTEGER NOT NULL,
    agent_id TEXT,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    source TEXT,
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_metrics_session ON token_metrics(session_id);

-- ==================== Triggers ====================

-- Auto-update timestamp on session changes
CREATE TRIGGER IF NOT EXISTS update_session_timestamp
AFTER UPDATE ON research_sessions
BEGIN
    UPDATE research_sessions
    SET updated_at = CURRENT_TIMESTAMP
    WHERE session_id = NEW.session_id;
END;

-- Auto-update timestamp on agent changes
CREATE TRIGGER IF NOT EXISTS update_agent_timestamp
AFTER UPDATE ON research_agents
BEGIN
    UPDATE research_agents
    SET updated_at = CURRENT_TIMESTAMP
    WHERE agent_id = NEW.agent_id;
END;
