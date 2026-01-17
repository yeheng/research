/**
 * Graph of Thoughts (GoT) Type Definitions (v4.0)
 *
 * Implements the Graph of Thoughts framework for research path management
 * Enhanced with state machine support
 */

export interface ResearchPath {
  id: string;
  query: string;
  focus?: string;  // Path focus area (e.g., "Academic Research", "Industry Practices")
  steps: ResearchStep[];
  score?: number;
  status: 'pending' | 'active' | 'completed' | 'pruned';
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

// === v4.0 New Types ===

/**
 * Graph state for state machine
 */
export interface GraphState {
  session_id: string;
  iteration: number;
  max_iterations: number;
  paths: ResearchPath[];
  confidence: number;
  aggregated: boolean;
  budget_exhausted: boolean;
  current_findings?: any;
  total_facts: number;
  cited_facts: number;
  sources: Array<{ quality_score: number }>;
  total_topics: number;
  covered_topics: number;
}

/**
 * Next action returned by state machine
 */
export interface NextAction {
  action: 'generate' | 'execute' | 'score' | 'prune' | 'aggregate' | 'synthesize';
  params: Record<string, any>;
  reasoning: string;
}
