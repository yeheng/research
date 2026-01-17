/**
 * Embedding Service for Vector Store
 * Supports multiple providers: OpenAI, local models, and mock for testing
 */

import { EmbeddingConfig } from './types.js';

export interface EmbeddingResult {
  embedding: number[];
  dimension: number;
  model: string;
  tokens?: number;
}

export interface EmbeddingBatchResult {
  embeddings: number[][];
  dimension: number;
  totalTokens: number;
  model: string;
}

/**
 * Base Embedding Provider Interface
 */
export interface IEmbeddingProvider {
  generateEmbedding(text: string): Promise<EmbeddingResult>;
  generateBatch(texts: string[]): Promise<EmbeddingBatchResult>;
  getDimension(): number;
}

/**
 * OpenAI Embedding Provider
 */
export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private dimension: number;

  constructor(config: EmbeddingConfig) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = config.model || 'text-embedding-3-small';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.dimension = config.dimension || this.getDefaultDimension(this.model);
  }

  private getDefaultDimension(model: string): number {
    const dimensions: Record<string, number> = {
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
      'text-embedding-ada-002': 1536,
    };
    return dimensions[model] || 1536;
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      embedding: data.data[0].embedding,
      dimension: this.dimension,
      model: this.model,
      tokens: data.usage?.total_tokens,
    };
  }

  async generateBatch(texts: string[]): Promise<EmbeddingBatchResult> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      embeddings: data.data.map((d: any) => d.embedding),
      dimension: this.dimension,
      totalTokens: data.usage?.total_tokens || 0,
      model: this.model,
    };
  }

  getDimension(): number {
    return this.dimension;
  }
}

/**
 * Mock Embedding Provider for testing
 * Uses deterministic hash-based embeddings
 */
export class MockEmbeddingProvider implements IEmbeddingProvider {
  private dimension: number;

  constructor(config: EmbeddingConfig) {
    this.dimension = config.dimension || 128;
  }

  /**
   * Generate deterministic embedding from text using hash
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const embedding = this.hashToEmbedding(text);
    return {
      embedding,
      dimension: this.dimension,
      model: 'mock-v1',
    };
  }

  async generateBatch(texts: string[]): Promise<EmbeddingBatchResult> {
    const embeddings = texts.map(t => this.hashToEmbedding(t));
    return {
      embeddings,
      dimension: this.dimension,
      totalTokens: texts.reduce((sum, t) => sum + t.split(/\s+/).length, 0),
      model: 'mock-v1',
    };
  }

  private hashToEmbedding(text: string): number[] {
    const embedding: number[] = [];
    let hash = this.simpleHash(text);

    for (let i = 0; i < this.dimension; i++) {
      // Generate pseudo-random but deterministic values
      hash = (hash * 1103515245 + 12345) & 0x7fffffff;
      embedding.push((hash % 1000) / 1000); // Normalize to [0, 1]
    }

    // L2 normalize
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return embedding.map(v => v / norm);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  getDimension(): number {
    return this.dimension;
  }
}

/**
 * Main Embedding Service
 */
export class EmbeddingService {
  private provider: IEmbeddingProvider;
  private cache: Map<string, number[]> = new Map();
  private cacheEnabled: boolean;
  private maxCacheSize: number;

  constructor(config: EmbeddingConfig, cacheEnabled = true, maxCacheSize = 10000) {
    this.cacheEnabled = cacheEnabled;
    this.maxCacheSize = maxCacheSize;

    // Initialize provider based on config
    switch (config.provider) {
      case 'openai':
        this.provider = new OpenAIEmbeddingProvider(config);
        break;
      case 'mock':
        this.provider = new MockEmbeddingProvider(config);
        break;
      case 'local':
        // For future: implement local model provider (e.g., sentence-transformers)
        throw new Error('Local provider not yet implemented');
      default:
        this.provider = new MockEmbeddingProvider(config);
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string, useCache = true): Promise<EmbeddingResult> {
    const cacheKey = this.getCacheKey(text);

    if (useCache && this.cacheEnabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return {
        embedding: cached,
        dimension: this.provider.getDimension(),
        model: 'cached',
      };
    }

    const result = await this.provider.generateEmbedding(text);

    if (useCache && this.cacheEnabled) {
      this.setCache(cacheKey, result.embedding);
    }

    return result;
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateBatch(texts: string[]): Promise<EmbeddingBatchResult> {
    const uncached: string[] = [];
    const embeddings: number[][] = [];
    const cachedIndices: number[] = [];

    // Check cache
    for (let i = 0; i < texts.length; i++) {
      const cacheKey = this.getCacheKey(texts[i]);
      if (this.cacheEnabled && this.cache.has(cacheKey)) {
        embeddings[i] = this.cache.get(cacheKey)!;
        cachedIndices.push(i);
      } else {
        uncached.push(texts[i]);
      }
    }

    // Generate for uncached
    if (uncached.length > 0) {
      const batchResult = await this.provider.generateBatch(uncached);

      // Merge results
      let uncachedIdx = 0;
      for (let i = 0; i < texts.length; i++) {
        if (!cachedIndices.includes(i)) {
          embeddings[i] = batchResult.embeddings[uncachedIdx];

          // Cache the new embeddings
          if (this.cacheEnabled) {
            this.setCache(this.getCacheKey(texts[i]), embeddings[i]);
          }
          uncachedIdx++;
        }
      }
    }

    return {
      embeddings,
      dimension: this.provider.getDimension(),
      totalTokens: texts.reduce((sum, t) => sum + t.split(/\s+/).length, 0),
      model: 'batch',
    };
  }

  /**
   * Get the embedding dimension
   */
  getDimension(): number {
    return this.provider.getDimension();
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  private getCacheKey(text: string): string {
    // Simple hash-based cache key
    return text.substring(0, 100);
  }

  private setCache(key: string, embedding: number[]): void {
    if (this.cache.size >= this.maxCacheSize) {
      // Simple FIFO: delete first entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, embedding);
  }
}
