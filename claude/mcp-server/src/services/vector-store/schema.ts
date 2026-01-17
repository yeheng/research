/**
 * Database Schema for SQLite + sqlite-vss Vector Store
 * Supports vector similarity search and full-text search
 */

export const SCHEMA_VERSION = 1;

/**
 * Core schema with sqlite-vss integration
 */
export const CREATE_TABLES_SQL = `
-- Metadata table
CREATE TABLE IF NOT EXISTS store_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Documents table: stores document metadata
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'deleted', 'indexing'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  indexed_chunks INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 0,
  metadata TEXT -- JSON metadata
);

-- Chunks table: stores document chunks with embeddings
CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chunk_id TEXT NOT NULL UNIQUE,
  document_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,
  embedding BLOB, -- Float array stored as binary (4 bytes per float)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_file_path ON documents(file_path);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_id ON chunks(chunk_id);

-- Full-text search with FTS5
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  chunk_id UNINDEXED,
  content,
  tokenize = 'porter unicode61'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS chunks_fts_insert AFTER INSERT ON chunks BEGIN
  INSERT INTO chunks_fts(rowid, chunk_id, content) VALUES (NEW.id, NEW.chunk_id, NEW.content);
END;

CREATE TRIGGER IF NOT EXISTS chunks_fts_delete AFTER DELETE ON chunks BEGIN
  DELETE FROM chunks_fts WHERE rowid = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS chunks_fts_update AFTER UPDATE OF content ON chunks BEGIN
  UPDATE chunks_fts SET content = NEW.content WHERE rowid = NEW.id;
END;

-- Initialize metadata
INSERT OR IGNORE INTO store_metadata (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}');
INSERT OR IGNORE INTO store_metadata (key, value) VALUES ('embedding_dimension', '1536');
INSERT OR IGNORE INTO store_metadata (key, value) VALUES ('embedding_provider', 'openai');
INSERT OR IGNORE INTO store_metadata (key, value) VALUES ('total_chunks', '0');
`;

/**
 * Create sqlite-vss virtual table for vector search
 * This must be called after loading the extension
 */
export function createVssTable(dimension: number): string {
  return `
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_vss USING vss0(
  vss_embedding(${dimension}),
  chunk_id TEXT PRIMARY KEY
);
`;
}

/**
 * Populate vss table from existing chunks
 */
export const POPULATE_VSS_SQL = `
INSERT OR REPLACE INTO chunks_vss(chunk_id, embedding)
SELECT chunk_id, embedding FROM chunks WHERE embedding IS NOT NULL;
`;

/**
 * Useful views for querying
 */
export const CREATE_VIEWS_SQL = `
-- Active chunks with document info
CREATE VIEW IF NOT EXISTS active_chunks AS
SELECT
  c.id,
  c.chunk_id,
  c.document_id,
  c.chunk_index,
  c.content,
  c.word_count,
  c.token_count,
  c.embedding,
  c.created_at,
  c.updated_at,
  d.file_path,
  d.file_name,
  d.status as document_status
FROM chunks c
INNER JOIN documents d ON c.document_id = d.id
WHERE d.status = 'active';
`;

/**
 * Embedding serialization utilities
 */
export class EmbeddingCodec {
  /**
   * Serialize float array to Buffer (little-endian)
   */
  static serialize(embedding: number[]): Buffer {
    const buffer = Buffer.allocUnsafe(embedding.length * 4);
    for (let i = 0; i < embedding.length; i++) {
      buffer.writeFloatLE(embedding[i], i * 4);
    }
    return buffer;
  }

  /**
   * Deserialize Buffer to float array
   */
  static deserialize(buffer: Buffer, dimension: number): number[] {
    const embedding: number[] = [];
    for (let i = 0; i < dimension; i++) {
      embedding.push(buffer.readFloatLE(i * 4));
    }
    return embedding;
  }

  /**
   * Get byte size for embedding dimension
   */
  static getSize(dimension: number): number {
    return dimension * 4;
  }
}

/**
 * Schema version management
 */
export const MIGRATIONS: Record<number, string> = {
  1: CREATE_TABLES_SQL,
};

export function getMigration(version: number): string {
  return MIGRATIONS[version] || '';
}

export function getCurrentVersion(db: any): number {
  const row = db.prepare('SELECT value FROM store_metadata WHERE key = ?').get('schema_version');
  return row ? parseInt(row.value) : 0;
}
