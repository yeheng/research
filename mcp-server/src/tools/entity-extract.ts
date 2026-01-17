/**
 * Entity Extraction Tool
 *
 * Extracts named entities and relationships from text.
 * Ported from .claude/skills/entity-extractor
 */

import { logger } from '../utils/logger.js';
import { ValidationError, ProcessingError } from '../utils/errors.js';

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

interface EntityExtractInput {
  text: string;
  entity_types?: string[];
  extract_relations?: boolean;
}

/**
 * Extract entities and relationships from text
 */
export async function entityExtract(input: EntityExtractInput): Promise<any> {
  const startTime = Date.now();

  logger.info('Starting entity extraction', {
    textLength: input.text?.length,
    extractRelations: input.extract_relations,
  });

  try {
    // Validate input
    if (!input.text || typeof input.text !== 'string') {
      throw new ValidationError('Text input is required and must be a string');
    }

    const entities = extractEntities(input.text, input.entity_types);
    const edges = input.extract_relations ? extractRelationships(input.text, entities) : [];

    logger.info('Entity extraction completed', {
      entitiesFound: entities.length,
      relationshipsFound: edges.length,
      processingTimeMs: Date.now() - startTime,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            entities,
            edges,
            metadata: {
              total_entities: entities.length,
              total_relationships: edges.length,
            },
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error('Entity extraction failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof ValidationError || error instanceof ProcessingError) {
      throw error;
    }

    throw new ProcessingError(`Entity extraction failed: ${error}`);
  }
}

/**
 * Extract entities from text using pattern matching
 */
function extractEntities(text: string, types?: string[]): EntityObject[] {
  const entities: EntityObject[] = [];
  const entityPatterns = {
    company: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|Corp|LLC|Ltd))?)\b/g,
    person: /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g,
    technology: /\b(AI|ML|blockchain|cloud|API|SaaS)\b/gi,
  };

  const targetTypes = types || Object.keys(entityPatterns);

  for (const type of targetTypes) {
    const pattern = entityPatterns[type as keyof typeof entityPatterns];
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

/**
 * Remove duplicate entities
 */
function deduplicateEntities(entities: EntityObject[]): EntityObject[] {
  const seen = new Set<string>();
  return entities.filter(e => {
    const key = `${e.name}:${e.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extract relationships between entities
 */
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
