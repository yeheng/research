/**
 * Graph of Thoughts (GoT) Type Definitions (v3.1)
 *
 * Implements the Graph of Thoughts framework for research path management
 */

export interface ResearchPath {
  id: string;
  query: string;
  focus?: string;  // Path focus area (e.g., "Academic Research", "Industry Practices")
  steps: ResearchStep[];
  score: number;
  status: 'active' | 'completed' | 'pruned';
  metadata: PathMetadata;
}

export interface PathMetadata {
  depth: number;
  maxDepth: number;
  strategy?: string;
  template?: string;
  diversity_score?: number;
  [key: string]: any;
}

export interface ResearchStep {
  id?: string;
  step_number?: number;
  type?: 'search' | 'analyze' | 'synthesize' | 'validate';
  action?: string;
  input?: string;
  query?: string;
  output?: string;
  sources?: string[];
  facts?: any[];
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PathGenerationOptions {
  k: number;
  strategy?: 'diverse' | 'focused' | 'exploratory' | 'orthogonal';
  maxDepth?: number;
  diversityWeight?: number;
  context?: any;  // Current research context for path generation
}

export interface PathScore {
  path_id: string;
  score: number;
  kept: boolean;
  breakdown?: {
    steps?: number;
    outputs?: number;
    relevance?: number;
  };
}

export interface AggregationResult {
  synthesizedContent: string;
  sources: string[];
  confidence: number;
  conflicts: Conflict[];
  fact_count?: number;
}

export interface Conflict {
  fact1?: any;
  fact2?: any;
  claim1?: string;
  claim2?: string;
  source1?: string;
  source2?: string;
  type?: string;
  severity?: 'low' | 'medium' | 'high';
}
