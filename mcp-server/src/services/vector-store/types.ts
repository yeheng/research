/**
 * Vector Store Type Definitions
 */

export interface DocumentChunk {
  id: string;
  content: string;
  sourceFile: string;
  chunkIndex: number;
  metadata?: Record<string, any>;
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
}

export interface AddDocumentOptions {
  chunkSize?: number;
  overlap?: number;
}

export interface QueryOptions {
  topK?: number;
  minScore?: number;
}
