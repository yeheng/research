/**
 * Entity Extraction Tool
 *
 * Extracts named entities and relationships from text.
 * Ported from .claude/skills/entity-extractor
 */

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
  try {
    const entities = extractEntities(input.text, input.entity_types);
    const edges = input.extract_relations ? extractRelationships(input.text, entities) : [];

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
    throw new Error(`Entity extraction failed: ${error}`);
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
