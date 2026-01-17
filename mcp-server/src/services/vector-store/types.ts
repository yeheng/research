/**
 * Type definitions for Vector Store
 * Enhanced for SQLite + Vector Search implementation
 */

export interface DocumentChunk {
  id: string;
  content: string;
  sourceFile: string;
  chunkIndex: number;
  metadata: Record<string, any>;
  embedding?: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface VectorStoreIndex {
  chunks: DocumentChunk[];
  vocab: Record<string, number>;
  updated: string;
}

export interface QueryResult {
  chunk: DocumentChunk;
  score: number;
  rank: number;
  distance?: number; // Euclidean or cosine distance
}

export interface AddDocumentOptions {
  chunkSize?: number;
  overlap?: number;
  generateEmbeddings?: boolean; // Whether to generate vector embeddings
}

export interface QueryOptions {
  topK?: number;
  minScore?: number;
  useVectorSearch?: boolean; // Use vector similarity search vs keyword search
  filter?: {
    sourceFile?: string;
    metadata?: Record<string, any>;
  };
}

export interface EmbeddingConfig {
  provider: 'openai' | 'local' | 'mock';
  model?: string;
  dimension?: number;
  apiKey?: string;
  baseUrl?: string;
}

export interface StoreConfig {
  storePath: string;
  embedding?: EmbeddingConfig;
  maxChunkSize?: number;
  defaultOverlap?: number;
  enableCache?: boolean;
  cacheSize?: number;
}

export interface DatabaseStats {
  totalChunks: number;
  totalDocuments: number;
  totalTokens: number;
  indexSize: number;
  lastUpdated: string;
}

export interface QueryMetrics {
  queryTime: number;
  resultsCount: number;
  avgScore: number;
  searchMethod: 'vector' | 'keyword' | 'hybrid';
}
