/**
 * Fact Extraction Tool
 *
 * Extracts atomic facts from text with source attribution.
 * Ported from .claude/skills/fact-extractor
 */

import { logger } from '../utils/logger.js';
import { ValidationError, ProcessingError } from '../utils/errors.js';

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

interface FactExtractInput {
  text: string;
  source_url?: string;
  source_metadata?: Record<string, any>;
}

interface FactExtractOutput {
  facts: FactObject[];
  extraction_quality: number;
  metadata: {
    total_facts: number;
    processing_time_ms: number;
  };
}

/**
 * Extract atomic facts from text
 */
export async function factExtract(input: FactExtractInput): Promise<any> {
  const startTime = Date.now();

  logger.info('Starting fact extraction', {
    textLength: input.text?.length,
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

    const facts = await extractFactsFromText(
      input.text,
      input.source_url,
      input.source_metadata
    );

    const processingTime = Date.now() - startTime;

    logger.info('Fact extraction completed', {
      factsExtracted: facts.length,
      processingTimeMs: processingTime,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            facts,
            extraction_quality: calculateQuality(facts),
            metadata: {
              total_facts: facts.length,
              processing_time_ms: processingTime,
            },
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error('Fact extraction failed', {
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: Date.now() - startTime,
    });

    if (error instanceof ValidationError || error instanceof ProcessingError) {
      throw error;
    }

    throw new ProcessingError(`Fact extraction failed: ${error}`, {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Extract facts from text using pattern matching
 */
async function extractFactsFromText(
  text: string,
  sourceUrl?: string,
  sourceMetadata?: Record<string, any>
): Promise<FactObject[]> {
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

/**
 * Create a fact object from regex match
 */
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

/**
 * Calculate extraction quality score (0-10)
 */
function calculateQuality(facts: FactObject[]): number {
  if (facts.length === 0) return 0;

  let score = 0;

  // Base score from number of facts
  score += Math.min(facts.length * 0.5, 5);

  // Bonus for having sources
  const withSources = facts.filter(f => f.source.url).length;
  score += (withSources / facts.length) * 3;

  // Bonus for high confidence
  const highConf = facts.filter(f => f.confidence === 'High').length;
  score += (highConf / facts.length) * 2;

  return Math.min(Math.round(score * 10) / 10, 10);
}
