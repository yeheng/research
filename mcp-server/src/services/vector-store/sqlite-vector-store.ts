/**
 * SQLite Vector Store with sqlite-vss integration
 * Production-ready vector storage with concurrent access support
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import {
  DocumentChunk,
  QueryResult,
  AddDocumentOptions,
  QueryOptions,
  StoreConfig,
  DatabaseStats,
} from './types.js';
import {
  CREATE_TABLES_SQL,
  CREATE_VIEWS_SQL,
  createVssTable,
  POPULATE_VSS_SQL,
  EmbeddingCodec,
  getCurrentVersion,
  SCHEMA_VERSION,
} from './schema.js';
import { EmbeddingService } from './embedding-service.js';

export class SQLiteVectorStore {
  private db: Database.Database;
  private dbPath: string;
  private embeddingService: EmbeddingService;
  private embeddingDimension: number;

  constructor(config: StoreConfig) {
    this.dbPath = path.join(config.storePath, 'vector-store.db');

    // Initialize database
    this.db = this.initDatabase();

    // Initialize embedding service
    const embeddingConfig = config.embedding || {
      provider: 'mock',
      dimension: 128,
    };
    this.embeddingService = new EmbeddingService(
      embeddingConfig,
      config.enableCache !== false,
      config.cacheSize || 10000
    );
    this.embeddingDimension = this.embeddingService.getDimension();

    // Initialize vector table
    this.initVectorTable();
  }

  /**
   * Initialize database connection and schema
   */
  private initDatabase(): Database.Database {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const db = new Database(this.dbPath);

    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -64000');
    db.pragma('temp_store = MEMORY');
    db.pragma('mmap_size = 30000000000');

    // Initialize schema
    const currentVersion = getCurrentVersion(db);
    if (currentVersion < SCHEMA_VERSION) {
      db.exec(CREATE_TABLES_SQL);
      db.exec(CREATE_VIEWS_SQL);
    }

    return db;
  }

  /**
   * Initialize sqlite-vss virtual table
   */
  private initVectorTable(): void {
    try {
      const extensionPath = process.env.SQLITE_VSS_PATH ||
        path.join(process.cwd(), 'node_modules', 'sqlite-vss', 'dist', 'vss0');

      try {
        this.db.loadExtension(extensionPath);
      } catch (e) {
        console.warn('sqlite-vss extension not loaded, using manual distance calculation');
      }

      this.db.exec(createVssTable(this.embeddingDimension));

      const existingCount = this.db.prepare(
        'SELECT COUNT(*) as count FROM chunks WHERE embedding IS NOT NULL'
      ).get() as { count: number };

      if (existingCount.count > 0) {
        this.db.exec(POPULATE_VSS_SQL);
      }
    } catch (error) {
      console.warn('Vector table initialization warning:', error);
    }
  }

  /**
   * Query the vector store (async for vector search)
   */
  public async query(queryText: string, options: QueryOptions = {}): Promise<QueryResult[]> {
    const startTime = Date.now();
    const {
      topK = 5,
      minScore = 0.1,
      useVectorSearch = true,
      filter,
    } = options;

    let results: QueryResult[] = [];

    try {
      if (useVectorSearch && this.embeddingService) {
        results = await this.vectorSearch(queryText, topK, minScore, filter);
      } else {
        results = this.keywordSearch(queryText, topK, minScore, filter);
      }

      results = results
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      this.logQueryMetrics(queryText, Date.now() - startTime, results.length, useVectorSearch ? 'vector' : 'keyword');

    } catch (error) {
      console.error('Query error:', error);
      results = this.keywordSearch(queryText, topK, minScore, filter);
    }

    return results;
  }

  /**
   * Vector similarity search
   */
  private async vectorSearch(
    queryText: string,
    topK: number,
    minScore: number,
    filter?: QueryOptions['filter']
  ): Promise<QueryResult[]> {
    const { embedding: queryEmbedding } = await this.embeddingService.generateEmbedding(queryText, true);
    const chunks = this.getActiveChunks(filter);

    const results: QueryResult[] = chunks.map((chunk, index) => {
      if (!chunk.embedding) {
        return { chunk, score: 0, rank: index };
      }

      const distance = this.cosineDistance(queryEmbedding, chunk.embedding);
      const score = 1 - distance;

      return {
        chunk,
        score,
        rank: index,
        distance,
      };
    }).filter(r => r.score >= minScore);

    return results;
  }

  /**
   * Keyword search using FTS5
   */
  private keywordSearch(
    queryText: string,
    topK: number,
    minScore: number,
    filter?: QueryOptions['filter']
  ): QueryResult[] {
    let sql = `
      SELECT
        c.chunk_id,
        c.content,
        c.document_id,
        c.chunk_index,
        d.file_path,
        d.file_name,
        bm25(chunks_fts) as score
      FROM chunks_fts
      JOIN chunks c ON chunks_fts.chunk_id = c.chunk_id
      JOIN documents d ON c.document_id = d.id
      WHERE chunks_fts MATCH ? AND d.status = 'active'
    `;

    const params: any[] = [queryText];

    if (filter?.sourceFile) {
      sql += ' AND d.file_path = ?';
      params.push(filter.sourceFile);
    }

    sql += ' ORDER BY score LIMIT ?';
    params.push(topK);

    const rows = this.db.prepare(sql).all(...params);
    const maxScore = Math.max(...rows.map((r: any) => r.score || 0), 1);

    return rows.map((row: any, index) => {
      const chunk: DocumentChunk = {
        id: row.chunk_id,
        content: row.content,
        sourceFile: row.file_path,
        chunkIndex: row.chunk_index,
        metadata: {},
      };

      return {
        chunk,
        score: (row.score || 0) / maxScore,
        rank: index,
      };
    }).filter(r => r.score >= minScore);
  }

  /**
   * Add document to the store
   */
  public async addDocument(filePath: string, options: AddDocumentOptions = {}): Promise<number> {
    const {
      chunkSize = 500,
      overlap = 50,
      generateEmbeddings = true,
    } = options;

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileName = path.basename(filePath);
    const fileStats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Split into chunks first
    const words = content.split(/\s+/);
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunkWords = words.slice(i, i + chunkSize);
      chunks.push(chunkWords.join(' '));
    }

    // Generate embeddings outside transaction
    let embeddings: number[][] = [];
    if (generateEmbeddings && this.embeddingService) {
      const batchResult = await this.embeddingService.generateBatch(chunks);
      embeddings = batchResult.embeddings;
    }

    const addDoc = this.db.transaction((emb: number[][]) => {
      const existing = this.db.prepare(
        'SELECT id, status FROM documents WHERE file_path = ?'
      ).get(filePath);

      let docId: number;

      if (existing) {
        this.db.prepare('DELETE FROM chunks WHERE document_id = ?').run((existing as any).id);
        docId = (existing as any).id;
      } else {
        const result = this.db.prepare(`
          INSERT INTO documents (file_path, file_name, file_size, status)
          VALUES (?, ?, ?, 'indexing')
        `).run(filePath, fileName, fileStats.size);
        docId = result.lastInsertRowid as number;
      }

      const insertChunk = this.db.prepare(`
        INSERT INTO chunks (chunk_id, document_id, chunk_index, content, word_count, embedding)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < chunks.length; i++) {
        const chunkId = `${fileName}_${i}`;
        const embedding = emb[i] ? EmbeddingCodec.serialize(emb[i]) : null;
        const wordCount = chunks[i].split(/\s+/).length;

        insertChunk.run(chunkId, docId, i, chunks[i], wordCount, embedding);
      }

      this.db.prepare(`
        UPDATE documents
        SET indexed_chunks = ?, total_chunks = ?, status = 'active', updated_at = datetime('now')
        WHERE id = ?
      `).run(chunks.length, chunks.length, docId);

      if (emb.length > 0) {
        try {
          this.db.prepare(`
            INSERT OR REPLACE INTO chunks_vss(chunk_id, embedding)
            SELECT chunk_id, embedding FROM chunks WHERE document_id = ?
          `).run(docId);
        } catch (e) {
          console.warn('VSS update failed:', e);
        }
      }

      return chunks.length;
    });

    return addDoc(embeddings);
  }

  /**
   * List all documents in the store
   */
  public listDocuments(): string[] {
    const rows = this.db.prepare(
      'SELECT file_path FROM documents WHERE status = "active"'
    ).all() as { file_path: string }[];

    return rows.map(r => r.file_path);
  }

  /**
   * Delete document from store
   */
  public deleteDocument(filePath: string): number {
    const result = this.db.prepare(`
      UPDATE documents SET status = 'deleted', updated_at = datetime('now')
      WHERE file_path = ? AND status = 'active'
    `).run(filePath);

    return result.changes;
  }

  /**
   * Get database statistics
   */
  public getStats(): DatabaseStats {
    const row = this.db.prepare(`
      SELECT
        COUNT(DISTINCT d.id) as total_documents,
        COUNT(c.id) as total_chunks,
        COALESCE(SUM(c.word_count), 0) as total_tokens,
        MAX(d.updated_at) as last_updated
      FROM documents d
      LEFT JOIN chunks c ON c.document_id = d.id
      WHERE d.status = 'active'
    `).get() as any;

    return {
      totalDocuments: row.total_documents || 0,
      totalChunks: row.total_chunks || 0,
      totalTokens: row.total_tokens || 0,
      indexSize: fs.existsSync(this.dbPath) ? fs.statSync(this.dbPath).size : 0,
      lastUpdated: row.last_updated || new Date().toISOString(),
    };
  }

  /**
   * Close database connection
   */
  public close(): void {
    this.db.close();
  }

  /**
   * Get embedding service (for external use)
   */
  public getEmbeddingService(): EmbeddingService {
    return this.embeddingService;
  }

  /**
   * Helper: Get active chunks with optional filter
   */
  private getActiveChunks(filter?: QueryOptions['filter']): Array<DocumentChunk & { embedding?: number[] }> {
    let sql = `
      SELECT
        c.chunk_id as id,
        c.content,
        d.file_path as sourceFile,
        c.chunk_index as chunkIndex,
        c.embedding
      FROM chunks c
      JOIN documents d ON c.document_id = d.id
      WHERE d.status = 'active'
    `;

    const params: any[] = [];

    if (filter?.sourceFile) {
      sql += ' AND d.file_path = ?';
      params.push(filter.sourceFile);
    }

    const rows = this.db.prepare(sql).all(...params);

    return rows.map((row: any) => ({
      ...row,
      embedding: row.embedding ? EmbeddingCodec.deserialize(row.embedding, this.embeddingDimension) : undefined,
    }));
  }

  /**
   * Helper: Calculate cosine distance
   */
  private cosineDistance(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return 1 - dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Helper: Log query metrics
   */
  private logQueryMetrics(
    query: string,
    queryTime: number,
    resultsCount: number,
    method: 'vector' | 'keyword'
  ): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${method.toUpperCase()}] Query: "${query.substring(0, 50)}..."`);
      console.log(`  Time: ${queryTime}ms, Results: ${resultsCount}`);
    }
  }
}
