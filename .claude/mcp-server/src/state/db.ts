/**
 * Database Connection Module
 *
 * Provides singleton SQLite connection with optimizations:
 * - WAL mode for better concurrency
 * - Foreign key constraints enabled
 * - Synchronous mode optimized for performance
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), '.claude', 'mcp-server', 'state', 'research_state.db');

// Ensure state directory exists
const STATE_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(STATE_DIR)) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

// Create singleton DB connection
export const db: Database.Database = new Database(DB_PATH);

// Enable WAL mode (better concurrency performance)
db.pragma('journal_mode = WAL');

// Enable foreign key constraints
db.pragma('foreign_keys = ON');

// Performance optimization: batch operations with temporary sync off
db.pragma('synchronous = NORMAL');

/**
 * Close database connection
 * Call this on server shutdown
 */
export function closeDB(): void {
  db.close();
}

/**
 * Get database instance for transactions
 */
export function getDB(): Database.Database {
  return db;
}

/**
 * Initialize database schema
 * Reads schema.sql and executes it (idempotent)
 */
export function initializeSchema(): void {
  const schemaPath = path.join(STATE_DIR, 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    console.warn('⚠️  schema.sql not found, skipping initialization');
    return;
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  console.log('✅ Database schema initialized');
}

// Auto-initialize on module load
initializeSchema();
