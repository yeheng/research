/**
 * Unified Validate Tool
 *
 * Combines citation validation and source rating into a single tool.
 * Mode parameter determines validation type:
 * - 'citation': Validate citations for completeness and accuracy
 * - 'source': Rate source quality on A-E scale
 * - 'all': Validate citations and rate sources together
 */

import { logger } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

// === Types ===

interface CitationObject {
  claim: string;
  author?: string;
  date?: string;
  title?: string;
  url?: string;
  page_numbers?: string;
}

interface ValidationIssue {
  citation_index: number;
  issue_type: string;
  description: string;
}

interface SourceRating {
  quality_rating: 'A' | 'B' | 'C' | 'D' | 'E';
  justification: string;
  credibility_indicators: string[];
}

export interface ValidateInput {
  mode?: 'citation' | 'source' | 'all';  // Default: 'all'
  // Citation validation fields
  citations?: CitationObject[];
  verify_urls?: boolean;
  check_accuracy?: boolean;
  // Source rating fields
  source_url?: string;
  source_type?: 'academic' | 'industry' | 'news' | 'blog' | 'official';
  metadata?: Record<string, any>;
}

export interface ValidateOutput {
  // Citation validation results
  citation_validation?: {
    total_citations: number;
    complete_citations: number;
    issues: ValidationIssue[];
  };
  // Source rating results
  source_rating?: SourceRating;
  // Combined results for 'all' mode
  combined?: {
    citations_with_ratings: Array<{
      citation: CitationObject;
      issues: ValidationIssue[];
      source_rating?: SourceRating;
    }>;
  };
  metadata: {
    mode: string;
    processing_time_ms: number;
  };
}

/**
 * Unified validate tool
 */
export async function validate(input: ValidateInput): Promise<any> {
  const startTime = Date.now();
  const mode = input.mode || 'all';

  logger.info('Starting validation', {
    mode,
    hasCitations: !!input.citations,
    hasSourceUrl: !!input.source_url,
  });

  try {
    const result: ValidateOutput = {
      metadata: {
        mode,
        processing_time_ms: 0,
      },
    };

    // Citation validation
    if (mode === 'citation' || mode === 'all') {
      if (input.citations && input.citations.length > 0) {
        const issues: ValidationIssue[] = [];
        let completeCount = 0;

        for (let i = 0; i < input.citations.length; i++) {
          const citation = input.citations[i];
          const citationIssues = validateCitation(citation, i);
          issues.push(...citationIssues);

          if (citationIssues.length === 0) {
            completeCount++;
          }
        }

        result.citation_validation = {
          total_citations: input.citations.length,
          complete_citations: completeCount,
          issues,
        };
      }
    }

    // Source rating
    if (mode === 'source' || mode === 'all') {
      if (input.source_url) {
        result.source_rating = rateSource(input.source_url, input.source_type);
      }
    }

    // Combined mode: validate citations and rate their sources
    if (mode === 'all' && input.citations && input.citations.length > 0) {
      result.combined = {
        citations_with_ratings: input.citations.map((citation, i) => ({
          citation,
          issues: validateCitation(citation, i),
          source_rating: citation.url ? rateSource(citation.url, undefined) : undefined,
        })),
      };
    }

    result.metadata.processing_time_ms = Date.now() - startTime;

    logger.info('Validation completed', {
      mode,
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
    logger.error('Validation failed', {
      error: error instanceof Error ? error.message : String(error),
      mode,
    });

    throw new Error(`Validation failed: ${error}`);
  }
}

// === Citation Validation Logic ===

function validateCitation(citation: CitationObject, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!citation.author) {
    issues.push({
      citation_index: index,
      issue_type: 'missing_author',
      description: 'Citation is missing author information',
    });
  }

  if (!citation.date) {
    issues.push({
      citation_index: index,
      issue_type: 'missing_date',
      description: 'Citation is missing publication date',
    });
  }

  if (!citation.url) {
    issues.push({
      citation_index: index,
      issue_type: 'missing_url',
      description: 'Citation is missing URL',
    });
  }

  if (!citation.title) {
    issues.push({
      citation_index: index,
      issue_type: 'missing_title',
      description: 'Citation is missing title',
    });
  }

  return issues;
}

// === Source Rating Logic ===

function rateSource(
  url: string,
  type?: string
): SourceRating {
  const indicators: string[] = [];
  let rating: 'A' | 'B' | 'C' | 'D' | 'E' = 'C';
  let justification = '';

  // Academic sources (A rating)
  if (url.includes('.edu') || url.includes('scholar.google') || url.includes('pubmed')) {
    rating = 'A';
    justification = 'Peer-reviewed academic source';
    indicators.push('Academic domain', 'Peer-reviewed');
  }
  // Industry reports (B rating)
  else if (type === 'industry' || url.includes('gartner') || url.includes('forrester')) {
    rating = 'B';
    justification = 'Reputable industry analyst report';
    indicators.push('Industry analyst', 'Professional research');
  }
  // Official/government sources (B rating)
  else if (type === 'official' || url.includes('.gov')) {
    rating = 'B';
    justification = 'Official or government source';
    indicators.push('Official source', 'Institutional');
  }
  // News sources (C rating)
  else if (type === 'news' || url.includes('reuters') || url.includes('bloomberg')) {
    rating = 'C';
    justification = 'Established news organization';
    indicators.push('News source', 'Editorial standards');
  }
  // Blogs (D rating)
  else if (type === 'blog' || url.includes('medium') || url.includes('blog')) {
    rating = 'D';
    justification = 'Blog or opinion piece';
    indicators.push('Blog content', 'Individual perspective');
  }
  // Unknown/unverified (E rating)
  else {
    rating = 'E';
    justification = 'Unverified or unknown source';
    indicators.push('Unknown source');
  }

  return { quality_rating: rating, justification, credibility_indicators: indicators };
}

// === Legacy Aliases ===

/**
 * Legacy alias for citation validation
 * @deprecated Use validate({ mode: 'citation', ... }) instead
 */
export async function citationValidate(input: any): Promise<any> {
  return validate({ ...input, mode: 'citation' });
}

/**
 * Legacy alias for source rating
 * @deprecated Use validate({ mode: 'source', ... }) instead
 */
export async function sourceRate(input: any): Promise<any> {
  return validate({
    mode: 'source',
    source_url: input.source_url,
    source_type: input.source_type,
    metadata: input.metadata,
  });
}
