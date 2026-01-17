/**
 * Unified Extract Tool
 *
 * Combines fact extraction and entity extraction into a single tool.
 * Mode parameter determines extraction type:
 * - 'fact': Extract atomic facts with source attribution
 * - 'entity': Extract named entities and relationships
 * - 'all': Extract both facts and entities
 */

import { logger } from '../utils/logger.js';
import { ValidationError, ProcessingError } from '../utils/errors.js';

// === Types ===

interface SourceObject {
  url?: string;
  title?: string;
  author?: string;
  date?: string;
  quality?: 'A' | 'B' | 'C' | 'D' | 'E';
}

interface FactObject {
  entity: string;
  attribute: string;
  value: string;
  value_type: 'number' | 'date' | 'percentage' | 'currency' | 'text';
  confidence: 'High' | 'Medium' | 'Low';
  source: SourceObject;
}

interface EntityObject {
  name: string;
  type: string;
  aliases?: string[];
  description?: string;
}

interface EdgeObject {
  source: string;
  target: string;
  relation: string;
  confidence: number;
  evidence?: string;
}

export interface ExtractInput {
  text: string;
  mode?: 'fact' | 'entity' | 'all';  // Default: 'all'
  source_url?: string;
  source_metadata?: Record<string, any>;
  entity_types?: string[];
  extract_relations?: boolean;
}

export interface ExtractOutput {
  facts?: FactObject[];
  entities?: EntityObject[];
  edges?: EdgeObject[];
  metadata: {
    mode: string;
    total_facts?: number;
    total_entities?: number;
    total_relationships?: number;
    processing_time_ms: number;
    extraction_quality?: number;
  };
}

/**
 * Unified extract tool
 */
export async function extract(input: ExtractInput): Promise<any> {
  const startTime = Date.now();
  const mode = input.mode || 'all';

  logger.info('Starting extraction', {
    textLength: input.text?.length,
    mode,
    hasSourceUrl: !!input.source_url,
  });

  try {
    // Validate input
    if (!input.text || typeof input.text !== 'string') {
      throw new ValidationError('Text input is required and must be a string', {
        receivedType: typeof input.text,
      });
    }

    if (input.text.length === 0) {
      throw new ValidationError('Text input cannot be empty');
    }

    const result: ExtractOutput = {
      metadata: {
        mode,
        processing_time_ms: 0,
      },
    };

    // Extract facts if mode is 'fact' or 'all'
    if (mode === 'fact' || mode === 'all') {
      const facts = extractFactsFromText(
        input.text,
        input.source_url,
        input.source_metadata
      );
      result.facts = facts;
      result.metadata.total_facts = facts.length;
      result.metadata.extraction_quality = calculateFactQuality(facts);
    }

    // Extract entities if mode is 'entity' or 'all'
    if (mode === 'entity' || mode === 'all') {
      const entities = extractEntities(input.text, input.entity_types);
      result.entities = entities;
      result.metadata.total_entities = entities.length;

      // Extract relationships if requested
      if (input.extract_relations !== false) {
        const edges = extractRelationships(input.text, entities);
        result.edges = edges;
        result.metadata.total_relationships = edges.length;
      }
    }

    result.metadata.processing_time_ms = Date.now() - startTime;

    logger.info('Extraction completed', {
      mode,
      factsExtracted: result.metadata.total_facts || 0,
      entitiesExtracted: result.metadata.total_entities || 0,
      processingTimeMs: result.metadata.processing_time_ms,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error('Extraction failed', {
      error: error instanceof Error ? error.message : String(error),
      mode,
      processingTimeMs: Date.now() - startTime,
    });

    if (error instanceof ValidationError || error instanceof ProcessingError) {
      throw error;
    }

    throw new ProcessingError(`Extraction failed: ${error}`, {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

// === Fact Extraction Logic ===

function extractFactsFromText(
  text: string,
  sourceUrl?: string,
  sourceMetadata?: Record<string, any>
): FactObject[] {
  const facts: FactObject[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    // Extract numerical facts
    const numMatch = line.match(/(.+?)\s+(?:is|was|has|reached|grew to)\s+(\d+(?:\.\d+)?)\s*(%|billion|million|thousand)?/i);
    if (numMatch) {
      facts.push(createFact(numMatch, 'number', sourceUrl, sourceMetadata));
    }

    // Extract currency facts
    const currMatch = line.match(/(.+?)\s+(?:is|was|valued at|worth)\s+\$(\d+(?:\.\d+)?)\s*(B|M|billion|million)?/i);
    if (currMatch) {
      facts.push(createFact(currMatch, 'currency', sourceUrl, sourceMetadata));
    }
  }

  return facts;
}

function createFact(
  match: RegExpMatchArray,
  valueType: 'number' | 'currency',
  sourceUrl?: string,
  sourceMetadata?: Record<string, any>
): FactObject {
  const entity = match[1].trim();
  const value = match[2];
  const unit = match[3] || '';

  return {
    entity,
    attribute: valueType === 'currency' ? 'value' : 'amount',
    value: `${value}${unit}`,
    value_type: valueType,
    confidence: 'Medium',
    source: {
      url: sourceUrl,
      title: sourceMetadata?.title,
      author: sourceMetadata?.author,
      date: sourceMetadata?.date,
      quality: sourceMetadata?.quality,
    },
  };
}

function calculateFactQuality(facts: FactObject[]): number {
  if (facts.length === 0) return 0;

  let score = 0;
  score += Math.min(facts.length * 0.5, 5);

  const withSources = facts.filter(f => f.source.url).length;
  score += (withSources / facts.length) * 3;

  const highConf = facts.filter(f => f.confidence === 'High').length;
  score += (highConf / facts.length) * 2;

  return Math.min(Math.round(score * 10) / 10, 10);
}

// === Entity Extraction Logic ===

function extractEntities(text: string, types?: string[]): EntityObject[] {
  const entities: EntityObject[] = [];
  const entityPatterns: Record<string, RegExp> = {
    company: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|Corp|LLC|Ltd))?)\b/g,
    person: /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g,
    technology: /\b(AI|ML|blockchain|cloud|API|SaaS)\b/gi,
  };

  const targetTypes = types || Object.keys(entityPatterns);

  for (const type of targetTypes) {
    const pattern = entityPatterns[type];
    if (!pattern) continue;

    const matches = text.matchAll(pattern);
    for (const match of matches) {
      entities.push({
        name: match[1],
        type,
      });
    }
  }

  return deduplicateEntities(entities);
}

function deduplicateEntities(entities: EntityObject[]): EntityObject[] {
  const seen = new Set<string>();
  return entities.filter(e => {
    const key = `${e.name}:${e.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractRelationships(text: string, entities: EntityObject[]): EdgeObject[] {
  const edges: EdgeObject[] = [];
  const relationPatterns = [
    { pattern: /(.+?)\s+(?:invests in|invested in)\s+(.+)/i, relation: 'invests_in' },
    { pattern: /(.+?)\s+(?:competes with|competing with)\s+(.+)/i, relation: 'competes_with' },
    { pattern: /(.+?)\s+(?:acquired|acquires)\s+(.+)/i, relation: 'acquires' },
  ];

  for (const { pattern, relation } of relationPatterns) {
    const matches = text.matchAll(new RegExp(pattern, 'gi'));
    for (const match of matches) {
      edges.push({
        source: match[1].trim(),
        target: match[2].trim(),
        relation,
        confidence: 0.7,
        evidence: match[0],
      });
    }
  }

  return edges;
}

// === Legacy Aliases ===

/**
 * Legacy alias for fact extraction
 * @deprecated Use extract({ mode: 'fact', ... }) instead
 */
export async function factExtract(input: any): Promise<any> {
  return extract({ ...input, mode: 'fact' });
}

/**
 * Legacy alias for entity extraction
 * @deprecated Use extract({ mode: 'entity', ... }) instead
 */
export async function entityExtract(input: any): Promise<any> {
  return extract({ ...input, mode: 'entity' });
}
