/**
 * Graph of Thoughts Controller (v3.1)
 *
 * Manages research paths using GoT operations.
 * The controller focuses on graph state management, while LLM-based
 * content generation is handled by the Agent side.
 */

import { ResearchPath, PathGenerationOptions, AggregationResult, PathScore } from './types.js';

/**
 * Predefined path templates for different research strategies
 * These are starting points that Agents can customize based on context
 */
const PATH_TEMPLATES = {
  academic: {
    focus: 'Academic Research',
    query_pattern: '{topic} academic papers research {year}',
    sources: ['scholar.google.com', 'arxiv.org', 'researchgate.net'],
    weight: 0.3
  },
  industry: {
    focus: 'Industry Practices',
    query_pattern: '{topic} industry report case study',
    sources: ['mckinsey.com', 'gartner.com', 'hbr.org', 'techcrunch.com'],
    weight: 0.25
  },
  policy: {
    focus: 'Policy & Governance',
    query_pattern: '{topic} policy regulation governance',
    sources: ['gov.uk', 'europa.eu', 'congress.gov', 'oecd.org'],
    weight: 0.2
  },
  technical: {
    focus: 'Technical Implementation',
    query_pattern: '{topic} technical implementation tutorial',
    sources: ['github.com', 'stackoverflow.com', 'dev.to', 'medium.com'],
    weight: 0.15
  },
  news: {
    focus: 'Current Events',
    query_pattern: '{topic} news {year}',
    sources: ['reuters.com', 'bbc.com', 'nytimes.com', 'washingtonpost.com'],
    weight: 0.1
  }
};

/**
 * Diversification strategies for path generation
 */
const DIVERSITY_STRATEGIES = {
  orthogonal: 'orthogonal',  // Minimize overlap between paths
  complementary: 'complementary',  // Paths that enhance each other
  exploratory: 'exploratory',  // Broad exploration across domains
  focused: 'focused'  // Deep dive into specific aspects
};

export class GraphController {
  private paths: Map<string, ResearchPath>;
  private pathCounter: number;
  private history: Array<{ iteration: number; action: string; result: any }>;

  constructor() {
    this.paths = new Map();
    this.pathCounter = 0;
    this.history = [];
  }

  private generatePathId(): string {
    return `path_${++this.pathCounter}_${Date.now()}`;
  }

  private logHistory(action: string, result: any) {
    this.history.push({
      iteration: this.history.length + 1,
      action,
      result
    });
  }

  /**
   * Generate k diverse research paths
   *
   * Strategy options:
   * - 'diverse': Create paths across different domains (academic, industry, policy, etc.)
   * - 'focused': Create paths that explore different aspects of the same domain
   * - 'exploratory': Create broad exploration paths
   */
  public async generatePaths(
    query: string,
    options: PathGenerationOptions
  ): Promise<ResearchPath[]> {
    const { k = 3, strategy = 'diverse', context } = options;
    const generatedPaths: ResearchPath[] = [];

    this.logHistory('generate_paths', { query, k, strategy });

    // Select template combination based on strategy
    const templates = this.selectTemplates(k, strategy, context);

    // Generate paths from templates
    for (let i = 0; i < k; i++) {
      const template = templates[i % templates.length];
      const pathId = this.generatePathId();

      // Generate diverse queries based on template
      const subtopic = this.generateSubtopic(query, i, k);
      const searchQuery = this.customizeQuery(template.query_pattern, query, subtopic);

      const path: ResearchPath = {
        id: pathId,
        query: searchQuery,
        focus: template.focus,
        steps: [{
          step_number: 1,
          action: 'search',
          query: searchQuery,
          sources: template.sources,
          timestamp: new Date().toISOString()
        }],
        score: template.weight * 10,  // Initial score based on template weight
        status: 'active',
        metadata: {
          depth: 0,
          maxDepth: options.maxDepth || 5,
          strategy,
          template: template.focus,
          diversity_score: this.calculateDiversity(pathId, generatedPaths)
        }
      };

      this.paths.set(pathId, path);
      generatedPaths.push(path);
    }

    this.logHistory('paths_generated', { count: generatedPaths.length, paths: generatedPaths.map(p => ({ id: p.id, focus: p.focus, query: p.query })) });

    return generatedPaths;
  }

  /**
   * Select path templates based on strategy and context
   */
  private selectTemplates(k: number, strategy: string, context?: any): Array<{ focus: string; query_pattern: string; sources: string[]; weight: number }> {
    const templates = Object.values(PATH_TEMPLATES);

    switch (strategy) {
      case 'diverse':
        // Return most diverse templates
        return templates
          .sort((a, b) => b.weight - a.weight)
          .slice(0, Math.min(k, templates.length));

      case 'focused':
        // Return top-k templates by weight
        return templates
          .sort((a, b) => b.weight - a.weight)
          .slice(0, k);

      case 'exploratory':
        // Return random diverse templates
        return templates
          .sort(() => Math.random() - 0.5)
          .slice(0, k);

      case 'orthogonal':
        // Minimize overlap by selecting complementary domains
        return [
          PATH_TEMPLATES.academic,
          PATH_TEMPLATES.industry,
          PATH_TEMPLATES.policy,
          PATH_TEMPLATES.technical,
          PATH_TEMPLATES.news
        ].slice(0, k);

      default:
        return templates.slice(0, k);
    }
  }

  /**
   * Generate subtopic for path diversification
   */
  private generateSubtopic(query: string, index: number, total: number): string {
    const subtopics = [
      'overview and introduction',
      'technical details',
      'practical applications',
      'challenges and limitations',
      'future directions',
      'case studies',
      'best practices',
      'comparative analysis'
    ];

    // Distribute subtopics across paths
    const subtopicIndex = index % subtopics.length;
    return subtopics[subtopicIndex];
  }

  /**
   * Customize query with topic and subtopic
   */
  private customizeQuery(pattern: string, topic: string, subtopic: string): string {
    const year = new Date().getFullYear();
    return pattern
      .replace('{topic}', topic)
      .replace('{subtopic}', subtopic)
      .replace('{year}', String(year));
  }

  /**
   * Calculate diversity score for a path relative to existing paths
   */
  private calculateDiversity(pathId: string, existingPaths: ResearchPath[]): number {
    if (existingPaths.length === 0) return 1.0;

    // Simple diversity calculation: lower overlap = higher score
    let overlapSum = 0;
    for (const existing of existingPaths) {
      const querySimilarity = this.calculateQuerySimilarity(pathId, existing.id);
      overlapSum += querySimilarity;
    }

    const avgOverlap = overlapSum / existingPaths.length;
    return 1.0 - avgOverlap;
  }

  /**
   * Calculate query similarity (simplified)
   */
  private calculateQuerySimilarity(pathId1: string, pathId2: string): number {
    // In a real implementation, this would use embedding similarity
    // For now, return a random value for demonstration
    return Math.random() * 0.5;
  }

  /**
   * Score paths and keep top N
   *
   * Scoring factors:
   * - Number of steps completed
   * - Quality of outputs
   * - Source diversity
   * - Citation coverage
   */
  public async scoreAndPrune(paths: ResearchPath[], keepN: number, criteria?: any): Promise<PathScore[]> {
    this.logHistory('score_and_prune', { input_count: paths.length, keepN, criteria });

    const scoredPaths = paths.map(path => {
      const score = this.calculatePathScore(path, criteria);
      path.score = score.total;
      return {
        path_id: path.id,
        score: score.total,
        kept: true,
        breakdown: score.breakdown
      };
    });

    // Sort by score (descending)
    scoredPaths.sort((a, b) => b.score - a.score);

    // Mark pruned paths
    const kept = scoredPaths.slice(0, keepN);
    const pruned = scoredPaths.slice(keepN);

    pruned.forEach(scored => {
      scored.kept = false;
      const path = this.paths.get(scored.path_id);
      if (path) {
        path.status = 'pruned';
        this.paths.set(path.id, path);
      }
    });

    this.logHistory('pruned', {
      kept: kept.length,
      pruned: pruned.length,
      top_scores: kept.slice(0, 3).map(s => ({ id: s.path_id, score: s.score }))
    });

    return scoredPaths;
  }

  /**
   * Calculate path score with configurable criteria
   */
  private calculatePathScore(path: ResearchPath, criteria?: any): { total: number; breakdown: any } {
    const weights = criteria?.scoring_criteria || {
      citation_quality: 0.3,
      completeness: 0.4,
      relevance: 0.3
    };

    let score = 0;
    const breakdown: any = {};

    // Factor 1: Steps completed (represents completeness)
    const stepsScore = Math.min(path.steps.length * 10, 40);
    breakdown.steps = stepsScore;
    score += stepsScore * weights.completeness;

    // Factor 2: Outputs generated (represents citation quality)
    const outputCount = path.steps.filter(s => s.output).length;
    const outputScore = outputCount * 20;
    breakdown.outputs = outputScore;
    score += outputScore * weights.citation_quality;

    // Factor 3: Path metadata (represents relevance)
    const diversityScore = path.metadata.diversity_score || 0.5;
    const relevanceScore = diversityScore * 30;
    breakdown.relevance = relevanceScore;
    score += relevanceScore * weights.relevance;

    // Normalize to 0-10 scale
    const normalizedScore = Math.min(score / 10, 10);

    return {
      total: Math.round(normalizedScore * 100) / 100,
      breakdown
    };
  }

  /**
   * Aggregate multiple paths into synthesis
   *
   * Strategies:
   * - 'synthesis': Combine into coherent narrative
   * - 'voting': Keep findings supported by multiple paths
   * - 'consensus': Resolve conflicts via source quality
   */
  public async aggregatePaths(paths: ResearchPath[], strategy: string = 'synthesis'): Promise<AggregationResult> {
    this.logHistory('aggregate_paths', { path_count: paths.length, strategy });

    const allOutputs = paths.flatMap(p => p.steps.filter(s => s.output).map(s => s.output!));
    const sources = paths.map(p => p.id);
    const allFacts = this.extractFacts(paths);
    const conflicts = this.detectConflicts(allFacts);

    let synthesizedContent: string;
    let confidence: number;

    switch (strategy) {
      case 'synthesis':
        synthesizedContent = this.synthesizeNarrative(allOutputs);
        confidence = this.calculateSynthesisConfidence(paths);
        break;

      case 'voting':
        synthesizedContent = this.votingAggregation(allOutputs);
        confidence = this.calculateVotingConfidence(paths);
        break;

      case 'consensus':
        synthesizedContent = this.consensusAggregation(paths, conflicts);
        confidence = this.calculateConsensusConfidence(paths, conflicts);
        break;

      default:
        synthesizedContent = allOutputs.join('\n\n');
        confidence = 0.7;
    }

    this.logHistory('aggregated', { strategy, confidence, conflict_count: conflicts.length });

    return {
      synthesizedContent,
      sources,
      confidence,
      conflicts,
      fact_count: allFacts.length
    };
  }

  /**
   * Extract facts from paths
   */
  private extractFacts(paths: ResearchPath[]): any[] {
    const facts: any[] = [];
    for (const path of paths) {
      for (const step of path.steps) {
        if (step.facts) {
          facts.push(...step.facts);
        }
      }
    }
    return facts;
  }

  /**
   * Detect conflicts between facts
   */
  private detectConflicts(facts: any[]): any[] {
    // Simple conflict detection: check for contradictory statements
    const conflicts: any[] = [];

    for (let i = 0; i < facts.length; i++) {
      for (let j = i + 1; j < facts.length; j++) {
        if (this.areContradictory(facts[i], facts[j])) {
          conflicts.push({
            fact1: facts[i],
            fact2: facts[j],
            type: 'contradiction'
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two facts are contradictory
   */
  private areContradictory(fact1: any, fact2: any): boolean {
    // Simplified contradiction detection
    if (!fact1.statement || !fact2.statement) return false;

    const s1 = fact1.statement.toLowerCase();
    const s2 = fact2.statement.toLowerCase();

    // Check for negation patterns
    const contradictions = [
      ['yes', 'no'],
      ['true', 'false'],
      ['effective', 'ineffective'],
      ['increases', 'decreases'],
      ['supports', 'opposes']
    ];

    for (const [pos, neg] of contradictions) {
      if ((s1.includes(pos) && s2.includes(neg)) ||
          (s1.includes(neg) && s2.includes(pos))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Synthesize narrative from outputs
   */
  private synthesizeNarrative(outputs: string[]): string {
    return outputs.join('\n\n---\n\n');
  }

  /**
   * Voting aggregation
   */
  private votingAggregation(outputs: string[]): string {
    // For now, simple majority-based aggregation
    // In a real implementation, this would use more sophisticated voting
    return outputs.filter((o, i) => i % 2 === 0).join('\n\n');
  }

  /**
   * Consensus aggregation with conflict resolution
   */
  private consensusAggregation(paths: ResearchPath[], conflicts: any[]): string {
    let content = paths.map(p => p.steps.map(s => s.output).join('\n')).join('\n\n---\n\n');

    if (conflicts.length > 0) {
      content += '\n\n## Conflicts Detected\n\n';
      content += conflicts.map(c => `- ${c.fact1.statement} vs ${c.fact2.statement}`).join('\n');
    }

    return content;
  }

  /**
   * Calculate synthesis confidence
   */
  private calculateSynthesisConfidence(paths: ResearchPath[]): number {
    const avgScore = paths.reduce((sum, p) => sum + p.score, 0) / paths.length;
    const pathCount = paths.length;

    // More paths + higher scores = higher confidence
    return Math.min((avgScore / 10) * (1 + pathCount * 0.1), 1.0);
  }

  /**
   * Calculate voting confidence
   */
  private calculateVotingConfidence(paths: ResearchPath[]): number {
    const agreementThreshold = paths.length * 0.6;
    return agreementThreshold / paths.length;
  }

  /**
   * Calculate consensus confidence
   */
  private calculateConsensusConfidence(paths: ResearchPath[], conflicts: any[]): number {
    const baseConfidence = this.calculateSynthesisConfidence(paths);
    const conflictPenalty = conflicts.length * 0.05;

    return Math.max(baseConfidence - conflictPenalty, 0.3);
  }

  /**
   * Get graph state for debugging/analysis
   */
  public getGraphState(): any {
    return {
      total_paths: this.paths.size,
      active_paths: Array.from(this.paths.values()).filter(p => p.status === 'active').length,
      pruned_paths: Array.from(this.paths.values()).filter(p => p.status === 'pruned').length,
      history: this.history
    };
  }
}
