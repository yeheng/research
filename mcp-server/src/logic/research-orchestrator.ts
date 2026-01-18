/**
 * Research Orchestrator (v4.0)
 *
 * Integrates State Machine and Graph Controller for automated research execution.
 * This is the "brain" that coordinates the entire research workflow.
 *
 * Architecture:
 * - ResearchStateMachine: Decision engine (what to do next)
 * - GraphController: Execution engine (perform GoT operations)
 * - Orchestrator: Coordination layer between them
 */

import { ResearchStateMachine } from './state-machine.js';
import { GraphController } from './graph-controller.js';
import { GraphState, ResearchPath, NextAction } from './types.js';

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  maxIterations?: number;
  confidenceThreshold?: number;
  initialPaths?: number;
  maxDepth?: number;
  autoSave?: boolean;
  verbose?: boolean;
}

/**
 * Orchestrator result
 */
export interface OrchestratorResult {
  success: boolean;
  sessionId: string;
  iterations: number;
  finalState: GraphState;
  terminationReason: string;
  paths: ResearchPath[];
  synthesis?: string;
}

/**
 * Step result for tracking progress
 */
interface StepResult {
  iteration: number;
  action: NextAction;
  pathsBefore: number;
  pathsAfter: number;
  confidence: number;
  duration: number;
}

export class ResearchOrchestrator {
  private stateMachine: ResearchStateMachine;
  private graphController: GraphController;
  private sessionId: string;
  private state: GraphState;
  private config: Required<OrchestratorConfig>;
  private steps: StepResult[] = [];

  constructor(config: OrchestratorConfig = {}) {
    this.config = {
      maxIterations: config.maxIterations || 10,
      confidenceThreshold: config.confidenceThreshold || 0.85,
      initialPaths: config.initialPaths || 3,
      maxDepth: config.maxDepth || 5,
      autoSave: config.autoSave !== false,
      verbose: config.verbose || false
    };

    this.stateMachine = new ResearchStateMachine({
      maxIterations: this.config.maxIterations,
      confidenceThreshold: this.config.confidenceThreshold
    });

    this.sessionId = `orch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.graphController = new GraphController(this.sessionId);

    this.state = this.initializeState();
  }

  /**
   * Initialize graph state
   */
  private initializeState(): GraphState {
    return {
      session_id: this.sessionId,
      iteration: 0,
      max_iterations: this.config.maxIterations,
      paths: [],
      confidence: 0.0,
      aggregated: false,
      budget_exhausted: false,
      total_facts: 0,
      cited_facts: 0,
      sources: [],
      total_topics: 0,
      covered_topics: 0
    };
  }

  /**
   * Get current session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Set research topic
   */
  public setTopic(topic: string): void {
    this.state.current_findings = { topic };
  }

  /**
   * Get current state
   */
  public getState(): GraphState {
    return { ...this.state };
  }

  /**
   * Get execution history
   */
  public getSteps(): StepResult[] {
    return [...this.steps];
  }

  /**
   * Execute one step of the research workflow
   */
  public async executeStep(query?: string): Promise<StepResult> {
    const startTime = Date.now();
    const pathsBefore = this.state.paths.length;

    // Get next action from state machine
    const action = this.stateMachine.getNextAction(this.state);
    this.log(`Step ${this.state.iteration + 1}: ${action.action} - ${action.reasoning}`);

    // Execute action
    await this.executeAction(action, query);

    // Update state
    this.state.iteration++;
    this.state.paths = this.graphController.getPaths();
    this.state.confidence = this.stateMachine.calculateConfidence(this.state);

    const duration = Date.now() - startTime;
    const result: StepResult = {
      iteration: this.state.iteration,
      action,
      pathsBefore,
      pathsAfter: this.state.paths.length,
      confidence: this.state.confidence,
      duration
    };

    this.steps.push(result);

    // Auto-save if enabled
    if (this.config.autoSave) {
      await this.saveCheckpoint();
    }

    return result;
  }

  /**
   * Execute action based on type
   */
  private async executeAction(action: NextAction, query?: string): Promise<void> {
    switch (action.action) {
      case 'generate':
        await this.handleGenerate(query, action.params);
        break;

      case 'execute':
        await this.handleExecute(action.params);
        break;

      case 'score':
        await this.handleScore(action.params);
        break;

      case 'prune':
        await this.handlePrune(action.params);
        break;

      case 'aggregate':
        await this.handleAggregate(action.params);
        break;

      case 'synthesize':
        await this.handleSynthesize(action.params);
        break;

      default:
        throw new Error(`Unknown action: ${action.action}`);
    }
  }

  /**
   * Handle Generate action
   */
  private async handleGenerate(query?: string, params: any = {}): Promise<void> {
    const researchQuery = query || this.state.current_findings?.topic || params.query;
    if (!researchQuery) {
      throw new Error('Query required for generate action');
    }

    const k = params.k || this.config.initialPaths;
    const strategy = params.strategy || 'diverse';

    this.log(`Generating ${k} paths with strategy '${strategy}'`);
    const paths = await this.graphController.generatePaths(researchQuery, {
      k,
      strategy,
      maxDepth: this.config.maxDepth
    });

    this.log(`Generated ${paths.length} paths`);
  }

  /**
   * Handle Execute action
   */
  private async handleExecute(params: any = {}): Promise<void> {
    const pathIds = params.path_ids || this.state.paths
      .filter(p => p.status === 'pending')
      .map(p => p.id);

    this.log(`Executing ${pathIds.length} paths (simulated - agents would do actual work)`);

    // Simulate execution by marking paths as completed
    for (const pathId of pathIds) {
      const path = this.graphController.getPath(pathId);
      if (path) {
        path.status = 'completed';
        path.score = path.score || Math.random() * 5 + 5; // Simulate score
        this.graphController.updatePath(path);
      }
    }

    this.log(`Executed ${pathIds.length} paths`);
  }

  /**
   * Handle Score action
   */
  private async handleScore(params: any = {}): Promise<void> {
    const paths = this.graphController.getPaths();
    if (paths.length === 0) {
      this.log('No paths to score');
      return;
    }

    const threshold = params.threshold || 6.0;
    const keepTopN = params.keep_top_n || Math.ceil(paths.length / 2);

    this.log(`Scoring ${paths.length} paths, keeping top ${keepTopN}`);
    const scored = await this.graphController.scoreAndPrune(paths, keepTopN);

    this.log(`Scored paths, kept ${scored.filter(s => s.kept).length}`);
  }

  /**
   * Handle Prune action
   */
  private async handlePrune(params: any = {}): Promise<void> {
    const paths = this.graphController.getPaths();
    const keepN = params.keepN || 2;

    this.log(`Pruning to top ${keepN} paths`);
    await this.graphController.scoreAndPrune(paths, keepN);

    const active = this.graphController.getPaths().filter(p => p.status !== 'pruned');
    this.log(`Pruned to ${active.length} active paths`);
  }

  /**
   * Handle Aggregate action
   */
  private async handleAggregate(params: any = {}): Promise<void> {
    const paths = this.graphController.getPaths().filter(p => p.status === 'completed');
    if (paths.length < 2) {
      this.log(`Not enough completed paths to aggregate (${paths.length})`);
      return;
    }

    const strategy = params.strategy || 'synthesis';
    this.log(`Aggregating ${paths.length} paths with strategy '${strategy}'`);

    const result = await this.graphController.aggregatePaths(paths, strategy);
    this.state.aggregated = true;

    this.log(`Aggregated with confidence ${result.confidence.toFixed(2)}`);
  }

  /**
   * Handle Synthesize action
   */
  private async handleSynthesize(params: any = {}): Promise<void> {
    const paths = this.graphController.getPaths().filter(p => p.status === 'completed');

    if (paths.length === 0) {
      this.log('No completed paths to synthesize');
      this.state.aggregated = true;
      return;
    }

    this.log(`Synthesizing ${paths.length} paths into final report`);

    const result = await this.graphController.aggregatePaths(paths, 'synthesis');
    this.state.aggregated = true;

    this.log(`Synthesis complete with ${result.fact_count || 0} facts`);
  }

  /**
   * Run complete research workflow
   */
  public async run(query: string): Promise<OrchestratorResult> {
    this.setTopic(query);
    this.log(`Starting research workflow for: "${query}"`);
    this.log(`Config: ${this.config.maxIterations} max iterations, ${this.config.confidenceThreshold} confidence threshold`);

    try {
      // Execute steps until termination
      while (true) {
        const step = await this.executeStep(query);

        // Check termination
        if (this.shouldTerminate()) {
          break;
        }
      }

      // Final synthesis
      if (!this.state.aggregated) {
        await this.handleSynthesize({});
      }

      const terminationReason = this.getTerminationReason();
      this.log(`Research complete: ${terminationReason}`);

      return {
        success: true,
        sessionId: this.sessionId,
        iterations: this.state.iteration,
        finalState: this.getState(),
        terminationReason,
        paths: this.graphController.getPaths()
      };
    } catch (error) {
      this.log(`Research failed: ${error}`);
      throw error;
    }
  }

  /**
   * Check if should terminate
   */
  private shouldTerminate(): boolean {
    return this.stateMachine['shouldTerminate'](this.state);
  }

  /**
   * Get termination reason
   */
  private getTerminationReason(): string {
    return this.stateMachine['getTerminationReason'](this.state);
  }

  /**
   * Save checkpoint
   */
  private async saveCheckpoint(): Promise<void> {
    const checkpointData = {
      state: this.getState(),
      steps: this.steps,
      config: this.config,
      timestamp: new Date().toISOString()
    };

    const fs = require('fs');
    const path = require('path');
    const checkpointDir = path.join(process.cwd(), '.claude', 'mcp-server', 'checkpoints');

    if (!fs.existsSync(checkpointDir)) {
      fs.mkdirSync(checkpointDir, { recursive: true });
    }

    const checkpointFile = path.join(checkpointDir, `${this.sessionId}.json`);
    fs.writeFileSync(checkpointFile, JSON.stringify(checkpointData, null, 2));

    this.log(`Checkpoint saved to ${checkpointFile}`);
  }

  /**
   * Load checkpoint
   */
  public async loadCheckpoint(checkpointFile: string): Promise<void> {
    const fs = require('fs');
    const content = fs.readFileSync(checkpointFile, 'utf-8');
    const data = JSON.parse(content);

    this.sessionId = data.state.session_id;
    this.state = data.state;
    this.steps = data.steps || [];
    this.config = { ...this.config, ...data.config };

    // Reload graph controller state
    this.graphController = new GraphController(this.sessionId);

    this.log(`Checkpoint loaded from ${checkpointFile}`);
  }

  /**
   * Export final report
   */
  public exportReport(): string {
    const steps = this.getSteps();
    const paths = this.graphController.getPaths();

    return `
# Research Report

**Session ID:** ${this.sessionId}
**Iterations:** ${this.state.iteration}
**Confidence:** ${(this.state.confidence * 100).toFixed(1)}%
**Termination:** ${this.getTerminationReason()}

## Research Paths

${paths.map((p, i) => `
### Path ${i + 1}: ${p.focus || 'Research'}

**Query:** ${p.query}
**Status:** ${p.status}
**Score:** ${p.score?.toFixed(2) || 'N/A'}
**Depth:** ${p.metadata.depth || 0}

${p.steps.map(s => `
- **Step ${s.step_number}**: ${s.action || s.type}
  ${s.query ? `Query: ${s.query}` : ''}
  ${s.output ? `Output: ${s.output.substring(0, 100)}...` : ''}
`).join('\n')}
`).join('\n---\n')}

## Execution Log

${steps.map(s => `
### Step ${s.iteration}: ${s.action.action}

**Reasoning:** ${s.action.reasoning}
**Duration:** ${s.duration}ms
**Confidence:** ${(s.confidence * 100).toFixed(1)}%
**Paths:** ${s.pathsBefore} → ${s.pathsAfter}
`).join('\n---\n')}
    `.trim();
  }

  /**
   * Export report to file
   */
  public exportReportToFile(filePath: string): void {
    const fs = require('fs');
    const report = this.exportReport();
    fs.writeFileSync(filePath, report, 'utf-8');
    this.log(`Report exported to ${filePath}`);
  }

  /**
   * Log message if verbose
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[Orchestrator] ${message}`);
    }
  }

  /**
   * Get graph controller for external access
   */
  public getGraphController(): GraphController {
    return this.graphController;
  }

  /**
   * Get state machine for external access
   */
  public getStateMachine(): ResearchStateMachine {
    return this.stateMachine;
  }

  /**
   * Reset orchestrator
   */
  public reset(): void {
    this.sessionId = `orch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.graphController = new GraphController(this.sessionId);
    this.state = this.initializeState();
    this.steps = [];
  }
}
