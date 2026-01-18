/**
 * Batch Processing Tools v2
 *
 * Provides batch processing endpoints for unified MCP tools.
 * Supports both new unified API and legacy aliases.
 */

import { CacheManager, citationCache, conflictCache, entityCache, factCache, sourceRatingCache } from '../cache/cache-manager.js';
import { BatchResult, createBatchItems, processBatch } from '../utils/batch.js';
import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// Import unified tools
import { conflictDetect } from './conflict-detect.js';
import { extract } from './extract.js';
import { validate } from './validate.js';

interface BatchInput {
  items: any[];
  mode?: 'fact' | 'entity' | 'all' | 'citation' | 'source';  // For unified batch tools
  options?: {
    maxConcurrency?: number;
    useCache?: boolean;
    stopOnError?: boolean;
  };
}

// === Unified Batch Tools ===

/**
 * Unified batch extract tool
 * Supports mode: 'fact' | 'entity' | 'all'
 */
export async function batchExtract(input: BatchInput): Promise<any> {
  const mode = input.mode || 'all';
  logger.info('Starting batch extraction', { itemCount: input.items?.length, mode });

  if (!input.items || !Array.isArray(input.items)) {
    throw new ValidationError('Items array is required');
  }

  const useCache = input.options?.useCache ?? true;
  const batchItems = createBatchItems(input.items);

  // Select cache based on mode
  const cache = mode === 'fact' ? factCache :
                mode === 'entity' ? entityCache :
                factCache;  // Use factCache for 'all' mode

  const processor = async (item: any) => {
    const inputWithMode = { ...item, mode };
    if (useCache) {
      const cacheKey = CacheManager.generateKey({ ...item, mode });
      return cache.getOrCompute(cacheKey, async () => {
        const result = await extract(inputWithMode);
        return JSON.parse(result.content[0].text);
      });
    }
    const result = await extract(inputWithMode);
    return JSON.parse(result.content[0].text);
  };

  const { results, summary } = await processBatch(batchItems, processor, {
    maxConcurrency: input.options?.maxConcurrency ?? 5,
    stopOnError: input.options?.stopOnError ?? false,
  });

  return formatBatchResponse(`batch-extract(mode=${mode})`, results, summary, cache);
}

/**
 * Unified batch validate tool
 * Supports mode: 'citation' | 'source' | 'all'
 */
export async function batchValidate(input: BatchInput): Promise<any> {
  const mode = input.mode || 'all';
  logger.info('Starting batch validation', { itemCount: input.items?.length, mode });

  if (!input.items || !Array.isArray(input.items)) {
    throw new ValidationError('Items array is required');
  }

  const useCache = input.options?.useCache ?? true;
  const batchItems = createBatchItems(input.items);

  // Select cache based on mode
  const cache = mode === 'citation' ? citationCache :
                mode === 'source' ? sourceRatingCache :
                citationCache;  // Use citationCache for 'all' mode

  const processor = async (item: any) => {
    // Transform item based on mode
    let inputWithMode: any;
    if (mode === 'source') {
      inputWithMode = {
        mode,
        source_url: item.source_url || item.url || item,
        source_type: item.source_type,
      };
    } else if (mode === 'citation') {
      inputWithMode = {
        mode,
        citations: Array.isArray(item.citations) ? item.citations : [item],
      };
    } else {
      inputWithMode = { ...item, mode };
    }

    if (useCache) {
      const cacheKey = CacheManager.generateKey({ ...item, mode });
      return cache.getOrCompute(cacheKey, async () => {
        const result = await validate(inputWithMode);
        return JSON.parse(result.content[0].text);
      });
    }
    const result = await validate(inputWithMode);
    return JSON.parse(result.content[0].text);
  };

  const { results, summary } = await processBatch(batchItems, processor, {
    maxConcurrency: input.options?.maxConcurrency ?? 5,
    stopOnError: input.options?.stopOnError ?? false,
  });

  return formatBatchResponse(`batch-validate(mode=${mode})`, results, summary, cache);
}

/**
 * Batch conflict detection
 */
export async function batchConflictDetect(input: BatchInput): Promise<any> {
  logger.info('Starting batch conflict detection', { itemCount: input.items?.length });

  if (!input.items || !Array.isArray(input.items)) {
    throw new ValidationError('Items array is required');
  }

  const useCache = input.options?.useCache ?? true;
  const batchItems = createBatchItems(input.items);

  const processor = async (item: any) => {
    if (useCache) {
      const cacheKey = CacheManager.generateKey(item);
      return conflictCache.getOrCompute(cacheKey, async () => {
        const result = await conflictDetect(item);
        return JSON.parse(result.content[0].text);
      });
    }
    const result = await conflictDetect(item);
    return JSON.parse(result.content[0].text);
  };

  const { results, summary } = await processBatch(batchItems, processor, {
    maxConcurrency: input.options?.maxConcurrency ?? 5,
    stopOnError: input.options?.stopOnError ?? false,
  });

  return formatBatchResponse('batch-conflict-detect', results, summary, conflictCache);
}

// === Cache Management ===

/**
 * Get cache statistics for all caches
 */
export async function getCacheStats(): Promise<any> {
  const stats = {
    factCache: factCache.getStats(),
    entityCache: entityCache.getStats(),
    citationCache: citationCache.getStats(),
    sourceRatingCache: sourceRatingCache.getStats(),
    conflictCache: conflictCache.getStats(),
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(stats, null, 2),
      },
    ],
  };
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<any> {
  factCache.clear();
  entityCache.clear();
  citationCache.clear();
  sourceRatingCache.clear();
  conflictCache.clear();

  logger.info('All caches cleared');

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ success: true, message: 'All caches cleared' }),
      },
    ],
  };
}

// === Utilities ===

/**
 * Format batch response
 */
function formatBatchResponse(
  toolName: string,
  results: BatchResult<any>[],
  summary: any,
  cache: CacheManager
): any {
  const cacheStats = cache.getStats();

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          tool: toolName,
          results: results.map(r => ({
            id: r.id,
            success: r.success,
            data: r.result,
            error: r.error,
            processingTimeMs: r.processingTimeMs,
          })),
          summary: {
            ...summary,
            cacheHitRate: cacheStats.hitRate,
          },
        }, null, 2),
      },
    ],
  };
}
