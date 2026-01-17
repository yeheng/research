/**
 * Vector Store Module
 * Exports all vector store implementations
 */

// Core classes
export { SQLiteVectorStore } from './sqlite-vector-store.js';
export { SimpleVectorStore } from './simple-store.js';

// Services
export {
  EmbeddingService,
  OpenAIEmbeddingProvider,
  MockEmbeddingProvider,
  type IEmbeddingProvider,
  type EmbeddingResult,
  type EmbeddingBatchResult,
} from './embedding-service.js';

// Schema utilities
export {
  EmbeddingCodec,
  createVssTable,
  getCurrentVersion,
  SCHEMA_VERSION,
} from './schema.js';

// Types
export type {
  DocumentChunk,
  QueryResult,
  AddDocumentOptions,
  QueryOptions,
  StoreConfig,
  DatabaseStats,
  QueryMetrics,
  EmbeddingConfig,
} from './types.js';
