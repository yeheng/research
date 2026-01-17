/**
 * Graph of Thoughts Controller
 * Manages research paths using GoT operations
 */

import { ResearchPath, PathGenerationOptions, AggregationResult } from './types.js';

export class GraphController {
  private paths: Map<string, ResearchPath>;
  private pathCounter: number;

  constructor() {
    this.paths = new Map();
    this.pathCounter = 0;
  }

  private generatePathId(): string {
    return `path_${++this.pathCounter}_${Date.now()}`;
  }

  public async generatePaths(query: string, options: PathGenerationOptions): Promise<ResearchPath[]> {
    const { k, maxDepth = 5 } = options;
    const generatedPaths: ResearchPath[] = [];

    for (let i = 0; i < k; i++) {
      const path: ResearchPath = {
        id: this.generatePathId(),
        query,
        steps: [],
        score: 0,
        status: 'active',
        metadata: { depth: 0, maxDepth }
      };

      this.paths.set(path.id, path);
      generatedPaths.push(path);
    }

    return generatedPaths;
  }

  public async scoreAndPrune(paths: ResearchPath[], keepN: number): Promise<ResearchPath[]> {
    const scoredPaths = paths.map(path => {
      const score = this.calculatePathScore(path);
      path.score = score;
      return path;
    });

    scoredPaths.sort((a, b) => b.score - a.score);
    const kept = scoredPaths.slice(0, keepN);
    const pruned = scoredPaths.slice(keepN);

    pruned.forEach(path => {
      path.status = 'pruned';
      this.paths.set(path.id, path);
    });

    return kept;
  }

  private calculatePathScore(path: ResearchPath): number {
    let score = 0;
    score += path.steps.length * 10;
    score += path.steps.filter(s => s.output).length * 20;
    return score;
  }

  public async aggregatePaths(paths: ResearchPath[]): Promise<AggregationResult> {
    const allOutputs = paths.flatMap(p => p.steps.filter(s => s.output).map(s => s.output!));
    const sources = paths.map(p => p.id);

    return {
      synthesizedContent: allOutputs.join('\n\n'),
      sources,
      confidence: 0.8,
      conflicts: []
    };
  }
}
