/**
 * Research State Machine (v4.0)
 *
 * Core state machine that drives the GoT research workflow.
 * This is the "brain" that decides what action to take next based on current graph state.
 */

import { GraphState, ResearchPath, NextAction } from './types.js';

export class ResearchStateMachine {
  private maxIterations: number;
  private confidenceThreshold: number;

  constructor(config?: { maxIterations?: number; confidenceThreshold?: number }) {
    this.maxIterations = config?.maxIterations || 10;
    this.confidenceThreshold = config?.confidenceThreshold || 0.9;
  }

  /**
   * Main decision engine - determines next action based on current state
   */
  getNextAction(state: GraphState): NextAction {
    // Rule 1: Check termination conditions first
    if (this.shouldTerminate(state)) {
      return {
        action: 'synthesize',
        params: {},
        reasoning: this.getTerminationReason(state)
      };
    }

    // Rule 2: If no paths exist, generate initial paths
    if (state.paths.length === 0) {
      return {
        action: 'generate',
        params: { k: 3, strategy: 'diverse' },
        reasoning: 'No paths exist, generating initial exploration paths'
      };
    }

    // Rule 3: If there are pending paths, execute them
    const pendingPaths = state.paths.filter(p => p.status === 'pending');
    if (pendingPaths.length > 0) {
      return {
        action: 'execute',
        params: { path_ids: pendingPaths.map(p => p.id) },
        reasoning: `${pendingPaths.length} pending paths detected, deploying workers`
      };
    }

    // Rule 4: If there are completed but unscored paths, score them
    const unscoredPaths = state.paths.filter(p => p.status === 'completed' && !p.score);
    if (unscoredPaths.length > 0) {
      return {
        action: 'score',
        params: { threshold: 6.0, keep_top_n: 2 },
        reasoning: `${unscoredPaths.length} completed paths need scoring and pruning`
      };
    }

    // Rule 5: If there are multiple high-quality paths and not yet aggregated, aggregate
    const highQualityPaths = state.paths.filter(p => p.score && p.score >= 7.0);
    if (highQualityPaths.length > 1 && !state.aggregated) {
      return {
        action: 'aggregate',
        params: { path_ids: highQualityPaths.map(p => p.id), strategy: 'synthesis' },
        reasoning: `${highQualityPaths.length} high-quality paths ready for aggregation`
      };
    }

    // Rule 6: If confidence is still low, generate new paths with refined focus
    if (state.confidence < this.confidenceThreshold) {
      return {
        action: 'generate',
        params: { k: 2, strategy: 'focused', context: state.current_findings },
        reasoning: `Confidence ${state.confidence.toFixed(2)} below threshold, continuing exploration`
      };
    }

    // Fallback: synthesize what we have
    return {
      action: 'synthesize',
      params: {},
      reasoning: 'All paths explored, ready to synthesize final report'
    };
  }

  /**
   * Check if research should terminate
   */
  private shouldTerminate(state: GraphState): boolean {
    // Termination condition 1: Confidence threshold reached
    if (state.confidence >= this.confidenceThreshold) {
      return true;
    }

    // Termination condition 2: Max iterations reached
    if (state.iteration >= this.maxIterations) {
      return true;
    }

    // Termination condition 3: Budget exhausted (checked externally)
    if (state.budget_exhausted) {
      return true;
    }

    return false;
  }

  /**
   * Get reason for termination
   */
  private getTerminationReason(state: GraphState): string {
    if (state.confidence >= this.confidenceThreshold) {
      return `Confidence threshold reached (${state.confidence.toFixed(2)} >= ${this.confidenceThreshold})`;
    }

    if (state.iteration >= this.maxIterations) {
      return `Max iterations reached (${state.iteration}/${this.maxIterations})`;
    }

    if (state.budget_exhausted) {
      return 'Budget exhausted, terminating early';
    }

    return 'Termination condition met';
  }

  /**
   * Calculate confidence score based on current findings
   */
  calculateConfidence(state: GraphState): number {
    let confidence = 0.0;

    // Factor 1: Citation coverage (40%)
    if (state.total_facts > 0) {
      const citationCoverage = state.cited_facts / state.total_facts;
      confidence += citationCoverage * 0.4;
    }

    // Factor 2: Source quality (30%)
    if (state.sources.length > 0) {
      const avgQuality = state.sources.reduce((sum, s) => sum + s.quality_score, 0) / state.sources.length;
      confidence += (avgQuality / 10) * 0.3;
    }

    // Factor 3: Completeness (30%)
    if (state.total_topics > 0) {
      const completeness = state.covered_topics / state.total_topics;
      confidence += completeness * 0.3;
    }

    return Math.min(confidence, 1.0);
  }
}
