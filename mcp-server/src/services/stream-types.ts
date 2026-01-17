/**
 * Streaming Response Handler Types
 */

export interface StreamChunk {
  chunkIndex: number;
  totalChunks: number;
  content: string;
  isComplete: boolean;
  metadata?: Record<string, any>;
}

export interface StreamingOptions {
  chunkSize?: number;
  delimiter?: string;
}
