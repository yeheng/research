-- Deep Research Framework - Centralized State Management Schema
-- Version: 1.0.0
-- Database: SQLite

-- Research Sessions
-- Tracks all research sessions with metadata and status
CREATE TABLE IF NOT EXISTS research_sessions (
    session_id TEXT PRIMARY KEY,
    research_topic TEXT NOT NULL,
    research_type TEXT CHECK(research_type IN ('deep', 'quick', 'custom')) DEFAULT 'deep',
    status TEXT CHECK(status IN ('initializing', 'planning', 'executing', 'synthesizing', 'validating', 'completed', 'failed')) DEFAULT 'initializing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    structured_prompt TEXT,
    research_plan TEXT,
    output_directory TEXT,
    metadata JSON,
    error_log TEXT
);

-- Graph of Thoughts Nodes
-- Stores nodes in the GoT graph for research path optimization
-- Token optimization: Added summary and compression_ratio fields for efficient storage
CREATE TABLE IF NOT EXISTS got_nodes (
    node_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    parent_id TEXT,
    node_type TEXT CHECK(node_type IN ('root', 'branch', 'leaf')) DEFAULT 'branch',
    content TEXT NOT NULL,
    summary TEXT,  -- Compressed version (10:1 ratio) for token efficiency
    compression_ratio REAL DEFAULT 0.1 CHECK(compression_ratio > 0 AND compression_ratio <= 1),
    quality_score REAL CHECK(quality_score >= 0 AND quality_score <= 10),
    depth INTEGER DEFAULT 0,
    status TEXT CHECK(status IN ('active', 'pruned', 'aggregated', 'refined')) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    FOREIGN KEY (session_id) REFERENCES research_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES got_nodes(node_id) ON DELETE CASCADE
);

-- Graph of Thoughts Operations Log
-- Tracks all GoT operations for debugging and analysis
CREATE TABLE IF NOT EXISTS got_operations (
    operation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    operation_type TEXT CHECK(operation_type IN ('Generate', 'Aggregate', 'Refine', 'Score', 'Prune')) NOT NULL,
    node_ids TEXT NOT NULL, -- JSON array of affected node IDs
    parameters JSON,
    result JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES research_sessions(session_id) ON DELETE CASCADE
);

-- Research Agents
-- Tracks deployed research agents and their status
CREATE TABLE IF NOT EXISTS research_agents (
    agent_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    agent_role TEXT NOT NULL,
    status TEXT CHECK(status IN ('deploying', 'running', 'completed', 'failed', 'timeout')) DEFAULT 'deploying',
    focus_description TEXT,
    search_queries TEXT, -- JSON array
    deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    output_file TEXT,
    token_usage INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSON,
    FOREIGN KEY (session_id) REFERENCES research_sessions(session_id) ON DELETE CASCADE
);

-- Fact Ledger
-- Stores atomic facts extracted from research with source attribution
CREATE TABLE IF NOT EXISTS facts (
    fact_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    agent_id TEXT,
    entity TEXT NOT NULL,
    attribute TEXT NOT NULL,
    value TEXT NOT NULL,
    value_type TEXT CHECK(value_type IN ('number', 'date', 'percentage', 'currency', 'text')) DEFAULT 'text',
    confidence TEXT CHECK(confidence IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
    source_url TEXT,
    source_title TEXT,
    source_author TEXT,
    source_date TEXT,
    source_quality TEXT CHECK(source_quality IN ('A', 'B', 'C', 'D', 'E')),
    extraction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    FOREIGN KEY (session_id) REFERENCES research_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES research_agents(agent_id) ON DELETE SET NULL
);

-- Fact Conflicts
-- Tracks detected conflicts between facts
CREATE TABLE IF NOT EXISTS fact_conflicts (
    conflict_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    entity TEXT NOT NULL,
    attribute TEXT NOT NULL,
    conflict_type TEXT CHECK(conflict_type IN ('numerical', 'temporal', 'scope', 'methodological')) NOT NULL,
    severity TEXT CHECK(severity IN ('critical', 'moderate', 'minor')) DEFAULT 'moderate',
    fact_ids TEXT NOT NULL, -- JSON array of conflicting fact IDs
    explanation TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolution_note TEXT,
    FOREIGN KEY (session_id) REFERENCES research_sessions(session_id) ON DELETE CASCADE
);

-- Entity Graph - Entities
-- Stores named entities extracted from research
CREATE TABLE IF NOT EXISTS entities (
    entity_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- company, person, technology, product, market, etc.
    aliases TEXT, -- JSON array
    description TEXT,
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mention_count INTEGER DEFAULT 1,
    metadata JSON,
    FOREIGN KEY (session_id) REFERENCES research_sessions(session_id) ON DELETE CASCADE,
    UNIQUE(session_id, entity_name, entity_type)
);

-- Entity Graph - Relationships
-- Stores relationships between entities
CREATE TABLE IF NOT EXISTS entity_relationships (
    relationship_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    source_entity_id INTEGER NOT NULL,
    target_entity_id INTEGER NOT NULL,
    relation_type TEXT NOT NULL, -- invests_in, competes_with, acquires, partners_with, etc.
    confidence REAL CHECK(confidence >= 0 AND confidence <= 1),
    evidence TEXT,
    source_url TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    FOREIGN KEY (session_id) REFERENCES research_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (source_entity_id) REFERENCES entities(entity_id) ON DELETE CASCADE,
    FOREIGN KEY (target_entity_id) REFERENCES entities(entity_id) ON DELETE CASCADE
);

-- Citations
-- Stores all citations with quality ratings
CREATE TABLE IF NOT EXISTS citations (
    citation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    agent_id TEXT,
    claim TEXT NOT NULL,
    author TEXT,
    publication_date TEXT,
    title TEXT,
    url TEXT,
    page_numbers TEXT,
    quality_rating TEXT CHECK(quality_rating IN ('A', 'B', 'C', 'D', 'E')),
    url_accessible BOOLEAN,
    complete BOOLEAN DEFAULT FALSE,
    validation_timestamp TIMESTAMP,
    metadata JSON,
    FOREIGN KEY (session_id) REFERENCES research_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES research_agents(agent_id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_status ON research_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_topic ON research_sessions(research_topic);
CREATE INDEX IF NOT EXISTS idx_got_nodes_session ON got_nodes(session_id);
CREATE INDEX IF NOT EXISTS idx_got_nodes_parent ON got_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_got_nodes_status ON got_nodes(status);
CREATE INDEX IF NOT EXISTS idx_agents_session ON research_agents(session_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON research_agents(status);
CREATE INDEX IF NOT EXISTS idx_facts_session ON facts(session_id);
CREATE INDEX IF NOT EXISTS idx_facts_entity ON facts(entity, attribute);
CREATE INDEX IF NOT EXISTS idx_conflicts_session ON fact_conflicts(session_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_resolved ON fact_conflicts(resolved);
CREATE INDEX IF NOT EXISTS idx_entities_session ON entities(session_id);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(entity_name);
CREATE INDEX IF NOT EXISTS idx_relationships_session ON entity_relationships(session_id);
CREATE INDEX IF NOT EXISTS idx_citations_session ON citations(session_id);

-- Triggers for automatic timestamp updates
CREATE TRIGGER IF NOT EXISTS update_session_timestamp
AFTER UPDATE ON research_sessions
BEGIN
    UPDATE research_sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_id = NEW.session_id;
END;

CREATE TRIGGER IF NOT EXISTS update_got_node_timestamp
AFTER UPDATE ON got_nodes
BEGIN
    UPDATE got_nodes SET updated_at = CURRENT_TIMESTAMP WHERE node_id = NEW.node_id;
END;
