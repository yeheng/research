/**
 * Database Connection Module
 *
 * Provides singleton SQLite connection with optimizations:
 * - WAL mode for better concurrency
 * - Foreign key constraints enabled
 * - Synchronous mode optimized for performance
 * - Embedded schema (no external file dependencies)
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initializeSchema } from './schema.js';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';

const DB_PATH = join(tmpdir(), 'claude-mcp-server', `research_state_${randomUUID()}.db`);

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

// Initialize database schema (embedded - no external file needed)
initializeSchema(db);

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
