/**
 * Entity Extraction Service
 *
 * Migrated from Python's preprocess_document.py
 * Extracts named entities, relations, and co-occurrences from text
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface Entity {
  name: string;
  type: string;
  aliases: string[];
  mentionCount: number;
}

export interface Relation {
  source: string;
  target: string;
  relation: string;
  evidence: string;
  confidence: number;
}

export interface CoOccurrence {
  entityA: string;
  entityB: string;
  count: number;
  contexts: string[];
}

export interface EntityExtractionResult {
  entities: Record<string, Entity>;
  relations: Relation[];
  coOccurrences: CoOccurrence[];
}

// ============================================================================
// Entity Patterns
// ============================================================================

const ENTITY_PATTERNS: Record<string, RegExp[]> = {
  company: [
    // Common tech companies
    /\b(OpenAI|Microsoft|Google|Apple|Amazon|Meta|Anthropic|DeepMind|NVIDIA|Tesla|IBM|Oracle|Salesforce|Adobe|Intel|AMD|Qualcomm|Samsung|Huawei|Alibaba|Tencent|Baidu|ByteDance)\b/gi,
    // Generic company patterns
    /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:Inc\.|Corp\.|LLC|Ltd\.?|Company|Co\.|Corporation|Group|Holdings)\b/g,
  ],
  technology: [
    /\b(GPT-[0-9]+|GPT[0-9]+|BERT|Transformer|LLM|CNN|RNN|LSTM|GAN|VAE|ViT|CLIP|DALL[-·]?E|Stable Diffusion|Midjourney|Claude|Gemini|PaLM|LLaMA|Mistral|ChatGPT|Copilot)\b/gi,
    /\b(Machine Learning|Deep Learning|Neural Network|Natural Language Processing|NLP|Computer Vision|Reinforcement Learning|AI|Artificial Intelligence)\b/gi,
  ],
  product: [
    /\b(ChatGPT|GitHub Copilot|Bing Chat|Google Bard|Claude AI|Gemini Pro|GPT-4 Turbo)\b/gi,
  ],
  person: [
    /\b(Sam Altman|Satya Nadella|Sundar Pichai|Elon Musk|Mark Zuckerberg|Dario Amodei|Demis Hassabis|Jensen Huang|Tim Cook|Jeff Bezos)\b/gi,
  ],
  market: [
    /\b(AI (?:in )?Healthcare|FinTech|EdTech|AdTech|RegTech|InsurTech|HealthTech|BioTech|CleanTech|AgTech|FoodTech|PropTech|LegalTech|MarTech|HRTech|RetailTech)\b/gi,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)* Market)\b/g,
  ],
};

const RELATION_PATTERNS: Record<string, RegExp[]> = {
  invests_in: [
    /(\w+(?:\s+\w+)?)\s+invest(?:ed|s|ing)?\s+(?:\$[\d.]+\s*(?:billion|million|B|M))?\s*in\s+(\w+(?:\s+\w+)?)/gi,
    /(\w+(?:\s+\w+)?)\s+(?:led|participated in)\s+(?:a\s+)?(?:\$[\d.]+\s*(?:billion|million|B|M)\s+)?(?:funding|investment)\s+(?:round\s+)?(?:in|for)\s+(\w+(?:\s+\w+)?)/gi,
  ],
  competes_with: [
    /(\w+(?:\s+\w+)?)\s+compet(?:es|ing|ed)\s+with\s+(\w+(?:\s+\w+)?)/gi,
    /(\w+(?:\s+\w+)?)\s+(?:is|are)\s+(?:a\s+)?(?:rival|competitor)(?:s)?\s+(?:of|to)\s+(\w+(?:\s+\w+)?)/gi,
  ],
  partners_with: [
    /(\w+(?:\s+\w+)?)\s+partner(?:ed|s|ing)?\s+with\s+(\w+(?:\s+\w+)?)/gi,
    /(\w+(?:\s+\w+)?)\s+(?:announced|formed|entered)\s+(?:a\s+)?partnership\s+with\s+(\w+(?:\s+\w+)?)/gi,
  ],
  uses: [
    /(\w+(?:\s+\w+)?)\s+(?:uses|using|powered by|built on|leverages)\s+(\w+(?:\s+\w+)?)/gi,
  ],
  created_by: [
    /(\w+(?:\s+\w+)?)\s+(?:was\s+)?(?:created|developed|built|made)\s+by\s+(\w+(?:\s+\w+)?)/gi,
  ],
  acquired: [
    /(\w+(?:\s+\w+)?)\s+acquir(?:ed|es|ing)\s+(\w+(?:\s+\w+)?)/gi,
    /(\w+(?:\s+\w+)?)\s+(?:bought|purchased)\s+(\w+(?:\s+\w+)?)/gi,
  ],
};

// ============================================================================
// Entity Extraction Functions
// ============================================================================

/**
 * Extract named entities from text using pattern matching
 */
export function extractEntities(text: string): Record<string, Entity> {
  const entities: Record<string, Entity> = {};

  for (const [entityType, patterns] of Object.entries(ENTITY_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);

      for (const match of matches) {
        let name = match[1] || match[0];
        name = name.trim();

        // Skip very short or generic matches
        if (name.length < 2 || ['the', 'a', 'an', 'is', 'are'].includes(name.toLowerCase())) {
          continue;
        }

        // Normalize name
        const normalized = name.length > 3 ? toTitleCase(name) : name.toUpperCase();

        if (!entities[normalized]) {
          entities[normalized] = {
            name: normalized,
            type: entityType,
            aliases: [],
            mentionCount: 0,
          };
        }

        entities[normalized].mentionCount++;
        if (name !== normalized && !entities[normalized].aliases.includes(name)) {
          entities[normalized].aliases.push(name);
        }
      }
    }
  }

  return entities;
}

/**
 * Extract relationships between entities from text
 */
export function extractRelations(text: string, entities: Record<string, Entity>): Relation[] {
  const relations: Relation[] = [];
  const entityNames = new Set(Object.keys(entities));

  for (const [relationType, patterns] of Object.entries(RELATION_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);

      for (const match of matches) {
        if (match.length >= 3) {
          const source = toTitleCase(match[1].trim());
          const target = toTitleCase(match[2].trim());

          // Only include if at least one is a known entity
          const sourceKnown = entityNames.has(source) ||
            Array.from(entityNames).some(e => e.toLowerCase().includes(source.toLowerCase()));
          const targetKnown = entityNames.has(target) ||
            Array.from(entityNames).some(e => e.toLowerCase().includes(target.toLowerCase()));

          if (sourceKnown || targetKnown) {
            // Get context (surrounding text)
            const start = Math.max(0, match.index! - 50);
            const end = Math.min(text.length, match.index! + match[0].length + 50);
            const evidence = text.substring(start, end).trim();

            relations.push({
              source,
              target,
              relation: relationType,
              evidence,
              confidence: sourceKnown && targetKnown ? 0.7 : 0.5,
            });
          }
        }
      }
    }
  }

  return relations;
}

/**
 * Extract co-occurrences of entities within text windows
 */
export function extractCoOccurrences(
  text: string,
  entities: Record<string, Entity>,
  windowSize: number = 200
): CoOccurrence[] {
  const coOccurrences: Map<string, CoOccurrence> = new Map();
  const entityNames = Object.keys(entities);

  // Find all entity positions
  const entityPositions: Array<{ start: number; end: number; name: string }> = [];

  for (const name of entityNames) {
    const regex = new RegExp(escapeRegex(name), 'gi');
    const matches = text.matchAll(regex);

    for (const match of matches) {
      entityPositions.push({
        start: match.index!,
        end: match.index! + match[0].length,
        name,
      });
    }
  }

  // Sort by position
  entityPositions.sort((a, b) => a.start - b.start);

  // Find co-occurrences within window
  for (let i = 0; i < entityPositions.length; i++) {
    const posA = entityPositions[i];

    for (let j = i + 1; j < entityPositions.length; j++) {
      const posB = entityPositions[j];

      if (posB.start - posA.end > windowSize) {
        break;
      }

      if (posA.name !== posB.name) {
        const pair = [posA.name, posB.name].sort().join('|||');

        if (!coOccurrences.has(pair)) {
          coOccurrences.set(pair, {
            entityA: posA.name < posB.name ? posA.name : posB.name,
            entityB: posA.name < posB.name ? posB.name : posA.name,
            count: 0,
            contexts: [],
          });
        }

        const coOcc = coOccurrences.get(pair)!;
        coOcc.count++;

        if (coOcc.contexts.length < 3) {
          const contextStart = Math.max(0, posA.start - 20);
          const contextEnd = Math.min(text.length, posB.end + 20);
          const context = text.substring(contextStart, contextEnd).trim();

          if (!coOcc.contexts.includes(context)) {
            coOcc.contexts.push(context);
          }
        }
      }
    }
  }

  return Array.from(coOccurrences.values());
}

// ============================================================================
// Utility Functions
// ============================================================================

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
