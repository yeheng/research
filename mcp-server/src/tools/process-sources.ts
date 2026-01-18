/**
 * High-Level Intent Tool: process_sources
 * Combines fact extraction, entity extraction, citation validation, and source rating
 */

import { ProcessSourcesInput, ProcessSourcesOutput } from './high-level-types.js';
import { extract } from './extract.js';
import { validate } from './validate.js';

export async function processSources(input: ProcessSourcesInput): Promise<ProcessSourcesOutput> {
  const { sources, operations, options = {} } = input;
  const { parallel = true } = options;

  const result: ProcessSourcesOutput = {
    facts: [],
    entities: [],
    citations: [],
    sourceRatings: [],
    summary: ''
  };

  // Process each source
  for (const source of sources) {
    // Extract facts
    if (operations.includes('extract_facts')) {
      const factResult = await extract({
        text: source.content,
        mode: 'fact',
        source_url: source.url
      });

      if (factResult.content && Array.isArray(factResult.content)) {
        const parsed = JSON.parse(factResult.content[0].text);
        if (parsed.facts) {
          result.facts.push(...parsed.facts.map((f: any) => ({
            content: `${f.entity}: ${f.attribute} = ${f.value}`,
            source: source.url,
            confidence: f.confidence === 'High' ? 0.9 : f.confidence === 'Medium' ? 0.7 : 0.5
          })));
        }
      }
    }

    // Extract entities
    if (operations.includes('extract_entities')) {
      const entityResult = await extract({
        text: source.content,
        mode: 'entity',
        extract_relations: true
      });

      if (entityResult.content && Array.isArray(entityResult.content)) {
        const parsed = JSON.parse(entityResult.content[0].text);
        if (parsed.entities) {
          result.entities.push(...parsed.entities.map((e: any) => ({
            name: e.name,
            type: e.type,
            mentions: 1
          })));
        }
      }
    }

    // Validate citations (if source has citations)
    if (operations.includes('validate_citations') && source.metadata?.citations) {
      const citationResult = await validate({
        mode: 'citation',
        citations: source.metadata.citations
      });

      if (citationResult.content && Array.isArray(citationResult.content)) {
        const parsed = JSON.parse(citationResult.content[0].text);
        if (parsed.citation_validation) {
          result.citations.push({
            citation: source.url,
            isValid: parsed.citation_validation.complete_citations > 0,
            issues: parsed.citation_validation.issues.map((i: any) => i.description)
          });
        }
      }
    }

    // Rate source quality
    if (operations.includes('rate_quality')) {
      const ratingResult = await validate({
        mode: 'source',
        source_url: source.url,
        source_type: source.type
      });

      if (ratingResult.content && Array.isArray(ratingResult.content)) {
        const parsed = JSON.parse(ratingResult.content[0].text);
        if (parsed.source_rating) {
          result.sourceRatings.push({
            url: source.url,
            rating: parsed.source_rating.quality_rating,
            reasons: parsed.source_rating.credibility_indicators
          });
        }
      }
    }
  }

  result.summary = `Processed ${sources.length} sources: ${result.facts.length} facts, ${result.entities.length} entities, ${result.citations.length} citations validated, ${result.sourceRatings.length} sources rated.`;
  return result;
}
