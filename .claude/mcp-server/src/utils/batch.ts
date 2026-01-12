/**
 * Batch Processing Utilities
 *
 * Provides parallel processing capabilities for MCP tools
 */

import { logger } from './logger.js';

export interface BatchItem<T> {
  id: string;
  input: T;
}

export interface BatchResult<R> {
  id: string;
  success: boolean;
  result?: R;
  error?: string;
  processingTimeMs: number;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
}

export interface BatchOptions {
  maxConcurrency?: number;
  onProgress?: (progress: BatchProgress) => void;
  stopOnError?: boolean;
}

/**
 * Process items in parallel with configurable concurrency
 */
export async function processBatch<T, R>(
  items: BatchItem<T>[],
  processor: (input: T) => Promise<R>,
  options: BatchOptions = {}
): Promise<{
  results: BatchResult<R>[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalTimeMs: number;
    avgTimeMs: number;
  };
}> {
  const {
    maxConcurrency = 5,
    onProgress,
    stopOnError = false,
  } = options;

  const startTime = Date.now();
  const results: BatchResult<R>[] = [];
  let completed = 0;
  let failed = 0;
  let stopped = false;

  logger.info('Starting batch processing', {
    totalItems: items.length,
    maxConcurrency,
  });

  // Process items in batches
  for (let i = 0; i < items.length; i += maxConcurrency) {
    if (stopped) break;

    const batch = items.slice(i, i + maxConcurrency);
    const batchPromises = batch.map(async (item) => {
      if (stopped) return null;

      const itemStartTime = Date.now();
      try {
        const result = await processor(item.input);
        completed++;
        return {
          id: item.id,
          success: true,
          result,
          processingTimeMs: Date.now() - itemStartTime,
        } as BatchResult<R>;
      } catch (error) {
        failed++;
        if (stopOnError) {
          stopped = true;
        }
        return {
          id: item.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          processingTimeMs: Date.now() - itemStartTime,
        } as BatchResult<R>;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter((r): r is BatchResult<R> => r !== null));

    if (onProgress) {
      onProgress({
        total: items.length,
        completed,
        failed,
        inProgress: Math.min(i + maxConcurrency, items.length) - completed - failed,
      });
    }
  }

  const totalTimeMs = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;

  logger.info('Batch processing completed', {
    total: items.length,
    successful,
    failed,
    totalTimeMs,
  });

  return {
    results,
    summary: {
      total: items.length,
      successful,
      failed,
      totalTimeMs,
      avgTimeMs: results.length > 0
        ? Math.round(results.reduce((sum, r) => sum + r.processingTimeMs, 0) / results.length)
        : 0,
    },
  };
}

/**
 * Create batch items from an array with auto-generated IDs
 */
export function createBatchItems<T>(inputs: T[]): BatchItem<T>[] {
  return inputs.map((input, index) => ({
    id: `item_${index}`,
    input,
  }));
}
