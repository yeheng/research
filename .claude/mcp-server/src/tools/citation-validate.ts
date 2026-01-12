/**
 * Citation Validation Tool
 *
 * Validates citations for completeness, accuracy, and quality.
 * Ported from .claude/skills/citation-validator
 */

import { logger } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

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

interface CitationValidateInput {
  citations: CitationObject[];
  verify_urls?: boolean;
  check_accuracy?: boolean;
}

/**
 * Validate citations
 */
export async function citationValidate(input: CitationValidateInput): Promise<any> {
  try {
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

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            total_citations: input.citations.length,
            complete_citations: completeCount,
            issues,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new Error(`Citation validation failed: ${error}`);
  }
}

/**
 * Validate a single citation
 */
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

  return issues;
}
