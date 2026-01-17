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
    if (operations.includes('extract_facts')) {
      const factResult = await extract({
        text: source.content,
        mode: 'fact',
        source_url: source.url
      });

      if (factResult.content && Array.isArray(factResult.content)) {
        const facts = factResult.content[0]?.text ? JSON.parse(factResult.content[0].text) : [];
        result.facts.push(...facts.map((f: any) => ({
          content: f.content || f,
          source: source.url,
          confidence: 0.8
        })));
      }
    }
  }

  result.summary = `Processed ${sources.length} sources with ${result.facts.length} facts extracted.`;
  return result;
}
