/**
 * Batch Processing Tools
 *
 * Provides batch processing endpoints for all MCP tools
 */

import { logger } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';
import { processBatch, createBatchItems, BatchResult } from '../utils/batch.js';
import { CacheManager, factCache, entityCache, citationCache, sourceRatingCache, conflictCache } from '../cache/cache-manager.js';

// Import individual tool functions
import { factExtract } from './fact-extract.js';
import { entityExtract } from './entity-extract.js';
import { citationValidate } from './citation-validate.js';
import { sourceRate } from './source-rate.js';
import { conflictDetect } from './conflict-detect.js';

interface BatchInput {
  items: any[];
  options?: {
    maxConcurrency?: number;
    useCache?: boolean;
    stopOnError?: boolean;
  };
}

/**
 * Batch fact extraction
 */
export async function batchFactExtract(input: BatchInput): Promise<any> {
  logger.info('Starting batch fact extraction', { itemCount: input.items?.length });

  if (!input.items || !Array.isArray(input.items)) {
    throw new ValidationError('Items array is required');
  }

  const useCache = input.options?.useCache ?? true;
  const batchItems = createBatchItems(input.items);

  const processor = async (item: any) => {
    if (useCache) {
      const cacheKey = CacheManager.generateKey(item);
      return factCache.getOrCompute(cacheKey, async () => {
        const result = await factExtract(item);
        return JSON.parse(result.content[0].text);
      });
    }
    const result = await factExtract(item);
    return JSON.parse(result.content[0].text);
  };

  const { results, summary } = await processBatch(batchItems, processor, {
    maxConcurrency: input.options?.maxConcurrency ?? 5,
    stopOnError: input.options?.stopOnError ?? false,
  });

  return formatBatchResponse('batch-fact-extract', results, summary, factCache);
}

/**
 * Batch entity extraction
 */
export async function batchEntityExtract(input: BatchInput): Promise<any> {
  logger.info('Starting batch entity extraction', { itemCount: input.items?.length });

  if (!input.items || !Array.isArray(input.items)) {
    throw new ValidationError('Items array is required');
  }

  const useCache = input.options?.useCache ?? true;
  const batchItems = createBatchItems(input.items);

  const processor = async (item: any) => {
    if (useCache) {
      const cacheKey = CacheManager.generateKey(item);
      return entityCache.getOrCompute(cacheKey, async () => {
        const result = await entityExtract(item);
        return JSON.parse(result.content[0].text);
      });
    }
    const result = await entityExtract(item);
    return JSON.parse(result.content[0].text);
  };

  const { results, summary } = await processBatch(batchItems, processor, {
    maxConcurrency: input.options?.maxConcurrency ?? 5,
    stopOnError: input.options?.stopOnError ?? false,
  });

  return formatBatchResponse('batch-entity-extract', results, summary, entityCache);
}

/**
 * Batch citation validation
 */
export async function batchCitationValidate(input: BatchInput): Promise<any> {
  logger.info('Starting batch citation validation', { itemCount: input.items?.length });

  if (!input.items || !Array.isArray(input.items)) {
    throw new ValidationError('Items array is required');
  }

  const useCache = input.options?.useCache ?? true;
  const batchItems = createBatchItems(input.items.map(item => ({ citations: [item] })));

  const processor = async (item: any) => {
    if (useCache) {
      const cacheKey = CacheManager.generateKey(item);
      return citationCache.getOrCompute(cacheKey, async () => {
        const result = await citationValidate(item);
        return JSON.parse(result.content[0].text);
      });
    }
    const result = await citationValidate(item);
    return JSON.parse(result.content[0].text);
  };

  const { results, summary } = await processBatch(batchItems, processor, {
    maxConcurrency: input.options?.maxConcurrency ?? 5,
    stopOnError: input.options?.stopOnError ?? false,
  });

  return formatBatchResponse('batch-citation-validate', results, summary, citationCache);
}

/**
 * Batch source rating
 */
export async function batchSourceRate(input: BatchInput): Promise<any> {
  logger.info('Starting batch source rating', { itemCount: input.items?.length });

  if (!input.items || !Array.isArray(input.items)) {
    throw new ValidationError('Items array is required');
  }

  const useCache = input.options?.useCache ?? true;
  const batchItems = createBatchItems(input.items);

  const processor = async (item: any) => {
    if (useCache) {
      const cacheKey = CacheManager.generateKey(item.source_url || item);
      return sourceRatingCache.getOrCompute(cacheKey, async () => {
        const result = await sourceRate(item);
        return JSON.parse(result.content[0].text);
      });
    }
    const result = await sourceRate(item);
    return JSON.parse(result.content[0].text);
  };

  const { results, summary } = await processBatch(batchItems, processor, {
    maxConcurrency: input.options?.maxConcurrency ?? 5,
    stopOnError: input.options?.stopOnError ?? false,
  });

  return formatBatchResponse('batch-source-rate', results, summary, sourceRatingCache);
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
