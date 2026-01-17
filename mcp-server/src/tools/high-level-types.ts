/**
 * High-Level Intent Tools Type Definitions
 * Replaces fine-grained tools with coarse-grained intent-based tools
 */

export interface ProcessSourcesInput {
  sources: SourceDocument[];
  operations: ('extract_facts' | 'extract_entities' | 'validate_citations' | 'rate_quality')[];
  options?: {
    batchSize?: number;
    parallel?: boolean;
  };
}

export interface SourceDocument {
  url: string;
  content: string;
  type: 'academic' | 'industry' | 'news' | 'blog' | 'official';
  metadata?: Record<string, any>;
}

export interface ProcessSourcesOutput {
  facts: ExtractedFact[];
  entities: ExtractedEntity[];
  citations: CitationValidation[];
  sourceRatings: SourceRating[];
  summary: string;
}

export interface ExtractedFact {
  content: string;
  source: string;
  confidence: number;
}

export interface ExtractedEntity {
  name: string;
  type: string;
  mentions: number;
}

export interface CitationValidation {
  citation: string;
  isValid: boolean;
  issues: string[];
}

export interface SourceRating {
  url: string;
  rating: 'A' | 'B' | 'C' | 'D' | 'E';
  reasons: string[];
}
