/**
 * Graph of Thoughts (GoT) Type Definitions
 *
 * Implements the Graph of Thoughts framework for research path management
 */

export interface ResearchPath {
  id: string;
  query: string;
  steps: ResearchStep[];
  score: number;
  status: 'active' | 'completed' | 'pruned';
  metadata: Record<string, any>;
}

export interface ResearchStep {
  id: string;
  type: 'search' | 'analyze' | 'synthesize' | 'validate';
  input: string;
  output?: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface PathGenerationOptions {
  k: number;
  strategy?: 'diverse' | 'focused' | 'exploratory';
  maxDepth?: number;
  diversityWeight?: number;
}

export interface AggregationResult {
  synthesizedContent: string;
  sources: string[];
  confidence: number;
  conflicts: Conflict[];
}

export interface Conflict {
  claim1: string;
  claim2: string;
  source1: string;
  source2: string;
  severity: 'low' | 'medium' | 'high';
}
