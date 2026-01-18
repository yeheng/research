/**
 * Database Schema Constants
 *
 * Version: 4.0 (v3.1 + streaming data ingestion)
 * SQLite with WAL mode
 *
 * This file embeds the database schema directly in TypeScript,
 * eliminating the need for external .sql files and ensuring
 * reliable initialization across all deployment environments.
 */

import Database from 'better-sqlite3';

/**
 * Current schema version - stored in SQLite's user_version pragma
 * Version 2: Removed foreign key constraints for better concurrency and application-layer management
 */
export const SCHEMA_VERSION = 2;

/**
 * Complete database schema definition
 */
export const DATABASE_SCHEMA = `
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
`;

/**
 * Initialize database schema with version tracking
 *
 * This function checks the current schema version using SQLite's user_version pragma
 * and only applies the schema if it's outdated. This ensures:
 * - Idempotent initialization (safe to call multiple times)
 * - Schema version tracking (can detect schema changes)
 * - No external file dependencies (works in all build environments)
 *
 * @param db - Database instance to initialize
 */
export function initializeSchema(db: Database.Database): void {
  // Check current schema version
  const currentVersion = db.pragma('user_version', { simple: true }) as number;

  if (currentVersion < SCHEMA_VERSION) {
    // Apply schema
    db.exec(DATABASE_SCHEMA);

    // Update version
    db.pragma(`user_version = ${SCHEMA_VERSION}`);

    console.log(`✅ Database schema initialized (version ${SCHEMA_VERSION})`);
  } else {
    console.log(`ℹ️  Database schema up to date (version ${currentVersion})`);
  }
}

/**
 * Get the current schema version from a database
 *
 * @param db - Database instance to check
 * @returns Current schema version number
 */
export function getSchemaVersion(db: Database.Database): number {
  return db.pragma('user_version', { simple: true }) as number;
}

// ==================== Application-Layer Data Management ====================

/**
 * Delete a research session and all related records (application-layer cascade)
 *
 * This function replaces foreign key cascade deletion with explicit application-layer
 * cleanup. It removes all related records in the correct order to maintain data
 * integrity even without FK constraints.
 *
 * Order of deletion (child to parent):
 * 1. Dependency tables (fact_conflicts, entity_relationships)
 * 2. Entity/Fact tables (facts, entities)
 * 3. GoT tables (got_operations, got_nodes)
 * 4. Agent and activity tables (research_agents, activity_log)
 * 5. Data and checkpoints (ingested_data, phase_checkpoints)
 * 6. Metrics (token_metrics, citations)
 * 7. Finally, the session itself
 *
 * @param db - Database instance
 * @param session_id - Session ID to delete
 * @returns Number of records deleted
 */
export function deleteSessionCascade(db: Database.Database, session_id: string): number {
  const deleteStatements = [
    // Dependency tables (depend on facts, entities)
    'DELETE FROM fact_conflicts WHERE session_id = ?',
    'DELETE FROM entity_relationships WHERE session_id = ?',

    // Core data tables
    'DELETE FROM facts WHERE session_id = ?',
    'DELETE FROM entities WHERE session_id = ?',

    // GoT tables (operations before nodes for consistency)
    'DELETE FROM got_operations WHERE session_id = ?',
    'DELETE FROM got_nodes WHERE session_id = ?',

    // Agent and activity tracking
    'DELETE FROM research_agents WHERE session_id = ?',
    'DELETE FROM activity_log WHERE session_id = ?',

    // Data and checkpoints
    'DELETE FROM ingested_data WHERE session_id = ?',
    'DELETE FROM phase_checkpoints WHERE session_id = ?',

    // Metrics and citations
    'DELETE FROM token_metrics WHERE session_id = ?',
    'DELETE FROM citations WHERE session_id = ?',

    // Finally, the session itself
    'DELETE FROM research_sessions WHERE session_id = ?',
  ];

  let totalDeleted = 0;

  // Use transaction for atomicity
  const transaction = db.transaction(() => {
    for (const stmt of deleteStatements) {
      const result = db.prepare(stmt).run(session_id);
      totalDeleted += result.changes;
    }
  });

  try {
    transaction();
    console.log(`🗑️  Deleted session ${session_id}: ${totalDeleted} records`);
    return totalDeleted;
  } catch (error) {
    console.error(`❌ Error deleting session ${session_id}:`, error);
    throw error;
  }
}

/**
 * Clean up orphan records (defensive maintenance)
 *
 * This function removes records that reference non-existent sessions.
 * It should be called periodically or after session cleanup operations.
 *
 * @param db - Database instance
 * @returns Object with count of cleaned records per table
 */
export function cleanupOrphanRecords(db: Database.Database): {
  [table: string]: number;
} {
  const cleanupStatements = [
    { table: 'research_agents', sql: 'DELETE FROM research_agents WHERE session_id NOT IN (SELECT session_id FROM research_sessions)' },
    { table: 'activity_log', sql: 'DELETE FROM activity_log WHERE session_id NOT IN (SELECT session_id FROM research_sessions)' },
    { table: 'phase_checkpoints', sql: 'DELETE FROM phase_checkpoints WHERE session_id NOT IN (SELECT session_id FROM research_sessions)' },
    { table: 'ingested_data', sql: 'DELETE FROM ingested_data WHERE session_id NOT IN (SELECT session_id FROM research_sessions)' },
    { table: 'got_nodes', sql: 'DELETE FROM got_nodes WHERE session_id NOT IN (SELECT session_id FROM research_sessions)' },
    { table: 'got_operations', sql: 'DELETE FROM got_operations WHERE session_id NOT IN (SELECT session_id FROM research_sessions)' },
    { table: 'facts', sql: 'DELETE FROM facts WHERE session_id NOT IN (SELECT session_id FROM research_sessions)' },
    { table: 'fact_conflicts', sql: 'DELETE FROM fact_conflicts WHERE session_id NOT IN (SELECT session_id FROM research_sessions)' },
    { table: 'entities', sql: 'DELETE FROM entities WHERE session_id NOT IN (SELECT session_id FROM research_sessions)' },
    { table: 'entity_relationships', sql: 'DELETE FROM entity_relationships WHERE session_id NOT IN (SELECT session_id FROM research_sessions)' },
    { table: 'citations', sql: 'DELETE FROM citations WHERE session_id NOT IN (SELECT session_id FROM research_sessions)' },
    { table: 'token_metrics', sql: 'DELETE FROM token_metrics WHERE session_id NOT IN (SELECT session_id FROM research_sessions)' },
  ];

  const results: { [table: string]: number } = {};
  let totalCleaned = 0;

  for (const { table, sql } of cleanupStatements) {
    try {
      const result = db.prepare(sql).run();
      results[table] = result.changes;
      totalCleaned += result.changes;

      if (result.changes > 0) {
        console.log(`🧹 Cleaned ${result.changes} orphan records from ${table}`);
      }
    } catch (error) {
      console.error(`❌ Error cleaning ${table}:`, error);
      results[table] = -1; // Error indicator
    }
  }

  if (totalCleaned > 0) {
    console.log(`✅ Cleanup complete: ${totalCleaned} total orphan records removed`);
  } else {
    console.log(`✅ No orphan records found`);
  }

  return results;
}

/**
 * Get session statistics
 *
 * Returns counts of related records for a specific session.
 * Useful for debugging and monitoring session state.
 *
 * @param db - Database instance
 * @param session_id - Session ID to query
 * @returns Object with count of records per table
 */
export function getSessionStats(db: Database.Database, session_id: string): {
  [table: string]: number;
} {
  const statsQueries = [
    { table: 'research_agents', sql: 'SELECT COUNT(*) as count FROM research_agents WHERE session_id = ?' },
    { table: 'activity_log', sql: 'SELECT COUNT(*) as count FROM activity_log WHERE session_id = ?' },
    { table: 'phase_checkpoints', sql: 'SELECT COUNT(*) as count FROM phase_checkpoints WHERE session_id = ?' },
    { table: 'ingested_data', sql: 'SELECT COUNT(*) as count FROM ingested_data WHERE session_id = ?' },
    { table: 'got_nodes', sql: 'SELECT COUNT(*) as count FROM got_nodes WHERE session_id = ?' },
    { table: 'got_operations', sql: 'SELECT COUNT(*) as count FROM got_operations WHERE session_id = ?' },
    { table: 'facts', sql: 'SELECT COUNT(*) as count FROM facts WHERE session_id = ?' },
    { table: 'fact_conflicts', sql: 'SELECT COUNT(*) as count FROM fact_conflicts WHERE session_id = ?' },
    { table: 'entities', sql: 'SELECT COUNT(*) as count FROM entities WHERE session_id = ?' },
    { table: 'entity_relationships', sql: 'SELECT COUNT(*) as count FROM entity_relationships WHERE session_id = ?' },
    { table: 'citations', sql: 'SELECT COUNT(*) as count FROM citations WHERE session_id = ?' },
    { table: 'token_metrics', sql: 'SELECT COUNT(*) as count FROM token_metrics WHERE session_id = ?' },
  ];

  const results: { [table: string]: number } = {};

  for (const { table, sql } of statsQueries) {
    try {
      const row = db.prepare(sql).get(session_id) as { count: number };
      results[table] = row.count;
    } catch (error) {
      console.error(`❌ Error getting stats for ${table}:`, error);
      results[table] = -1;
    }
  }

  return results;
}
