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
  // Try multiple paths for schema.sql
  const possiblePaths = [
    path.join('/Users/yeheng/workspaces/research/template/.claude/mcp-server/state/', 'schema.sql')
  ];

  let schemaPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      schemaPath = p;
      break;
    }
  }

  if (!schemaPath) {
    console.warn('⚠️  schema.sql not found in any location, skipping initialization');
    return;
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  console.log('✅ Database schema initialized from:', schemaPath);
}

// Auto-initialize on module load
initializeSchema();
