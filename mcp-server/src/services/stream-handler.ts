/**
 * Stream Handler for Large Content
 * Splits large responses into manageable chunks
 */

import { StreamChunk, StreamingOptions } from './stream-types.js';

export class StreamHandler {
  private defaultChunkSize: number = 4000;

  constructor(chunkSize?: number) {
    if (chunkSize) {
      this.defaultChunkSize = chunkSize;
    }
  }

  public async *streamLargeContent(content: string, options: StreamingOptions = {}): AsyncGenerator<StreamChunk> {
    const { chunkSize = this.defaultChunkSize } = options;
    const chunks = this.splitContent(content, chunkSize);

    for (let i = 0; i < chunks.length; i++) {
      yield {
        chunkIndex: i,
        totalChunks: chunks.length,
        content: chunks[i],
        isComplete: i === chunks.length - 1
      };
    }
  }

  private splitContent(content: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.substring(i, i + chunkSize));
    }
    return chunks;
  }
}
