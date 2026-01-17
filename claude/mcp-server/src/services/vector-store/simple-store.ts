/**
 * Simple Vector Store Implementation
 * Lightweight in-memory vector store using TF-IDF scoring
 */

import * as fs from 'fs';
import * as path from 'path';
import { DocumentChunk, VectorStoreIndex, QueryResult, AddDocumentOptions, QueryOptions } from './types.js';

export class SimpleVectorStore {
  private storePath: string;
  private indexFile: string;
  private chunks: DocumentChunk[] = [];
  private vocab: Record<string, number> = {};

  constructor(storePath: string) {
    this.storePath = storePath;
    this.indexFile = path.join(storePath, 'index.json');
    this.ensureDirectory();
    this.load();
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(this.storePath)) {
      fs.mkdirSync(this.storePath, { recursive: true });
    }
  }

  private load(): void {
    if (fs.existsSync(this.indexFile)) {
      try {
        const data = fs.readFileSync(this.indexFile, 'utf-8');
        const index: VectorStoreIndex = JSON.parse(data);
        this.chunks = index.chunks || [];
        this.vocab = index.vocab || {};
      } catch (error) {
        console.error('Failed to load index:', error);
        this.chunks = [];
        this.vocab = {};
      }
    }
  }

  private save(): void {
    const index: VectorStoreIndex = {
      chunks: this.chunks,
      vocab: this.vocab,
      updated: new Date().toISOString(),
    };
    fs.writeFileSync(this.indexFile, JSON.stringify(index, null, 2));
  }

  private tokenize(text: string): string[] {
    const stopwords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'shall',
      'of', 'to', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'as', 'or', 'and', 'but', 'if', 'then', 'that', 'this'
    ]);

    const normalized = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    const tokens = normalized.split(/\s+/).filter(t => t.length > 2 && !stopwords.has(t));
    return tokens;
  }

  private computeTF(tokens: string[]): Record<string, number> {
    const tf: Record<string, number> = {};
    tokens.forEach(token => {
      tf[token] = (tf[token] || 0) + 1;
    });
    const maxFreq = Math.max(...Object.values(tf), 1);
    Object.keys(tf).forEach(key => {
      tf[key] = tf[key] / maxFreq;
    });
    return tf;
  }

  private scoreRelevance(queryTokens: string[], chunkTokens: string[]): number {
    const querySet = new Set(queryTokens);
    const chunkTF = this.computeTF(chunkTokens);
    let score = 0;
    querySet.forEach(token => {
      if (chunkTF[token]) {
        score += chunkTF[token];
      }
    });
    return querySet.size > 0 ? score / querySet.size : 0;
  }

  public query(queryText: string, options: QueryOptions = {}): QueryResult[] {
    const { topK = 5, minScore = 0.1 } = options;
    const queryTokens = this.tokenize(queryText);

    const results: QueryResult[] = this.chunks.map((chunk, index) => {
      const chunkTokens = this.tokenize(chunk.content);
      const score = this.scoreRelevance(queryTokens, chunkTokens);
      return { chunk, score, rank: index };
    }).filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return results;
  }

  public addDocument(filePath: string, options: AddDocumentOptions = {}): number {
    const { chunkSize = 500, overlap = 50 } = options;

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const words = content.split(/\s+/);
    let chunkIndex = 0;
    let addedCount = 0;

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunkWords = words.slice(i, i + chunkSize);
      const chunkContent = chunkWords.join(' ');

      const chunk: DocumentChunk = {
        id: `${path.basename(filePath)}_${chunkIndex}`,
        content: chunkContent,
        sourceFile: filePath,
        chunkIndex,
        metadata: { wordCount: chunkWords.length }
      };

      this.chunks.push(chunk);
      chunkIndex++;
      addedCount++;
    }

    this.save();
    return addedCount;
  }

  public listDocuments(): string[] {
    const files = new Set(this.chunks.map(c => c.sourceFile));
    return Array.from(files);
  }

  public deleteDocument(filePath: string): number {
    const before = this.chunks.length;
    this.chunks = this.chunks.filter(c => c.sourceFile !== filePath);
    const deleted = before - this.chunks.length;
    if (deleted > 0) {
      this.save();
    }
    return deleted;
  }
}
