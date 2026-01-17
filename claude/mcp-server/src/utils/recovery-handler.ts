/**
 * Recovery Handler
 *
 * Handles research session recovery after interruptions:
 * - Detects interruption points
 * - Generates recovery plans
 * - Executes recovery with minimal rework
 */

import { getDB } from '../state/db.js';
import { getStateManager, Session, Agent } from '../state/unified-state-manager.js';
import { getTokenBudgetManager } from './token-budget.js';
import * as fs from 'fs';
import * as path from 'path';

// Types
export interface InterruptionPoint {
  session_id: string;
  phase: number;
  phase_name: string;
  timestamp: string;
  completed_agents: string[];
  pending_agents: string[];
  completed_files: string[];
  missing_files: string[];
}

export interface RecoveryPlan {
  session_id: string;
  startFromPhase: number;
  skipAgents: string[];
  redeployAgents: string[];
  reprocessFiles: string[];
  estimatedTokens: number;
  actions: RecoveryAction[];
}

export interface RecoveryAction {
  type: 'skip' | 'retry' | 'regenerate' | 'continue';
  target: string;  // Phase number, agent ID, or file path
  reason: string;
}

/**
 * Recovery Handler
 *
 * Detects and recovers from research session interruptions.
 */
export class RecoveryHandler {
  private db: ReturnType<typeof getDB>;
  private stateManager: ReturnType<typeof getStateManager>;
  private static instance: RecoveryHandler;

  private constructor() {
    this.db = getDB();
    this.stateManager = getStateManager();
  }

  static getInstance(): RecoveryHandler {
    if (!RecoveryHandler.instance) {
      RecoveryHandler.instance = new RecoveryHandler();
    }
    return RecoveryHandler.instance;
  }

  /**
   * Detect interruption point for a session
   */
  async detectInterruption(session_id: string): Promise<InterruptionPoint | null> {
    const session = this.stateManager.getSession(session_id);

    if (!session) {
      return null;
    }

    // Completed sessions don't need recovery
    if (session.status === 'completed') {
      return null;
    }

    // Get phase information
    const phaseNames: Record<number, string> = {
      0: 'Initialization',
      1: 'Question Refinement',
      2: 'Research Planning',
      3: 'Iterative Querying',
      4: 'Source Triangulation',
      5: 'Knowledge Synthesis',
      6: 'Quality Assurance',
      7: 'Final Output'
    };

    // Get agent status
    const agents = this.stateManager.getSessionAgents(session_id);
    const completedAgents = agents.filter(a => a.status === 'completed').map(a => a.agent_id);
    const pendingAgents = agents.filter(a => a.status !== 'completed').map(a => a.agent_id);

    // Check file system for completed outputs
    const outputDir = session.output_directory;
    const { completed: completedFiles, missing: missingFiles } = await this.checkOutputFiles(
      outputDir,
      session.current_phase
    );

    // Get last activity timestamp
    const lastActivity = this.db.prepare(`
      SELECT created_at FROM activity_log
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(session_id) as { created_at: string } | undefined;

    return {
      session_id,
      phase: session.current_phase,
      phase_name: phaseNames[session.current_phase] || `Phase ${session.current_phase}`,
      timestamp: lastActivity?.created_at || session.updated_at,
      completed_agents: completedAgents,
      pending_agents: pendingAgents,
      completed_files: completedFiles,
      missing_files: missingFiles
    };
  }

  /**
   * Check which output files exist
   */
  private async checkOutputFiles(
    outputDir: string,
    currentPhase: number
  ): Promise<{ completed: string[]; missing: string[] }> {
    const completed: string[] = [];
    const missing: string[] = [];

    const expectedFiles: Record<number, string[]> = {
      1: ['research_notes/refined_question.md'],
      2: ['research_notes/research_plan.md'],
      3: ['raw/'],  // Directory with agent outputs
      4: [
        'processed/fact_ledger.md',
        'processed/entity_graph.md',
        'processed/conflict_report.md'
      ],
      5: ['drafts/synthesis.md'],
      6: ['drafts/validated_report.md'],
      7: [
        'README.md',
        'executive_summary.md',
        'full_report.md',
        'sources/bibliography.md'
      ]
    };

    // Check files up to current phase
    for (let phase = 1; phase <= currentPhase; phase++) {
      const files = expectedFiles[phase] || [];

      for (const file of files) {
        const fullPath = path.join(outputDir, file);

        try {
          const stats = fs.statSync(fullPath);
          if (stats.isDirectory()) {
            // For directories, check if they have content
            const contents = fs.readdirSync(fullPath);
            if (contents.length > 0) {
              completed.push(file);
            } else {
              missing.push(file);
            }
          } else if (stats.size > 0) {
            completed.push(file);
          } else {
            missing.push(file);
          }
        } catch {
          missing.push(file);
        }
      }
    }

    return { completed, missing };
  }

  /**
   * Generate recovery plan from interruption point
   */
  generateRecoveryPlan(interruption: InterruptionPoint): RecoveryPlan {
    const actions: RecoveryAction[] = [];
    let startFromPhase = interruption.phase;
    const estimatedTokens = this.estimateRecoveryTokens(interruption);

    // Phase 3: Check agent completion
    if (interruption.phase === 3) {
      if (interruption.completed_agents.length > 0 && interruption.pending_agents.length > 0) {
        // Partial completion - resume with pending agents only
        actions.push({
          type: 'skip',
          target: interruption.completed_agents.join(', '),
          reason: 'Agents already completed'
        });
        actions.push({
          type: 'retry',
          target: interruption.pending_agents.join(', '),
          reason: 'Resume pending agents'
        });
      } else if (interruption.completed_agents.length === 0) {
        // No agents completed - restart phase 3
        actions.push({
          type: 'regenerate',
          target: 'Phase 3',
          reason: 'No agents completed, restart phase'
        });
      }
    }

    // Phase 4: Check MCP processing
    if (interruption.phase === 4) {
      const hasRawFiles = interruption.completed_files.some(f => f.startsWith('raw/'));
      const hasProcessedFiles = interruption.completed_files.some(f => f.startsWith('processed/'));

      if (hasRawFiles && !hasProcessedFiles) {
        // Raw files exist but processing incomplete
        actions.push({
          type: 'continue',
          target: 'Phase 4',
          reason: 'Raw files available, resume MCP processing'
        });
      }
    }

    // Phase 5-7: Check for required inputs
    if (interruption.phase >= 5) {
      // Check if previous phase outputs exist
      const prevPhaseComplete = this.checkPreviousPhaseComplete(
        interruption.phase - 1,
        interruption.completed_files
      );

      if (!prevPhaseComplete) {
        // Need to go back to earlier phase
        startFromPhase = this.findLastCompletePhase(interruption.completed_files);
        actions.push({
          type: 'regenerate',
          target: `Phase ${startFromPhase + 1}`,
          reason: `Previous phase incomplete, restart from phase ${startFromPhase + 1}`
        });
      }
    }

    // Default: continue from current phase
    if (actions.length === 0) {
      actions.push({
        type: 'continue',
        target: `Phase ${interruption.phase}`,
        reason: 'Resume from interruption point'
      });
    }

    return {
      session_id: interruption.session_id,
      startFromPhase,
      skipAgents: interruption.completed_agents,
      redeployAgents: interruption.pending_agents,
      reprocessFiles: interruption.missing_files,
      estimatedTokens,
      actions
    };
  }

  /**
   * Check if previous phase is complete
   */
  private checkPreviousPhaseComplete(phase: number, completedFiles: string[]): boolean {
    const requiredFiles: Record<number, string[]> = {
      1: ['research_notes/refined_question.md'],
      2: ['research_notes/research_plan.md'],
      3: ['raw/'],
      4: ['processed/fact_ledger.md'],
      5: ['drafts/synthesis.md'],
      6: ['drafts/validated_report.md']
    };

    const required = requiredFiles[phase] || [];
    return required.every(f =>
      completedFiles.some(cf => cf === f || cf.startsWith(f))
    );
  }

  /**
   * Find last complete phase
   */
  private findLastCompletePhase(completedFiles: string[]): number {
    for (let phase = 6; phase >= 0; phase--) {
      if (this.checkPreviousPhaseComplete(phase, completedFiles)) {
        return phase;
      }
    }
    return 0;
  }

  /**
   * Estimate tokens needed for recovery
   */
  private estimateRecoveryTokens(interruption: InterruptionPoint): number {
    // Base estimates per phase
    const phaseTokens: Record<number, number> = {
      1: 5000,
      2: 10000,
      3: 50000,  // Per agent
      4: 30000,
      5: 40000,
      6: 20000,
      7: 10000
    };

    let total = 0;

    // Add tokens for remaining phases
    for (let phase = interruption.phase; phase <= 7; phase++) {
      if (phase === 3) {
        // Phase 3: multiply by pending agents
        total += phaseTokens[3] * Math.max(1, interruption.pending_agents.length);
      } else {
        total += phaseTokens[phase] || 10000;
      }
    }

    return total;
  }

  /**
   * Get recovery checkpoint from database
   */
  getCheckpoint(session_id: string, phase: number): object | null {
    const checkpoint = this.db.prepare(`
      SELECT state_snapshot FROM phase_checkpoints
      WHERE session_id = ? AND phase_number = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(session_id, phase) as { state_snapshot: string } | undefined;

    if (!checkpoint) return null;

    return JSON.parse(checkpoint.state_snapshot);
  }

  /**
   * Create checkpoint for current state
   */
  saveCheckpoint(session_id: string, phase: number, state: object): void {
    this.db.prepare(`
      INSERT INTO phase_checkpoints (session_id, phase_number, state_snapshot)
      VALUES (?, ?, ?)
    `).run(session_id, phase, JSON.stringify(state));
  }

  /**
   * Get list of recoverable sessions
   */
  getRecoverableSessions(): Array<{
    session_id: string;
    topic: string;
    phase: number;
    status: string;
    last_activity: string;
  }> {
    const sessions = this.db.prepare(`
      SELECT
        s.session_id,
        s.research_topic as topic,
        s.current_phase as phase,
        s.status,
        s.updated_at as last_activity
      FROM research_sessions s
      WHERE s.status NOT IN ('completed', 'failed')
      ORDER BY s.updated_at DESC
    `).all() as any[];

    return sessions;
  }
}

// Export singleton getter
export function getRecoveryHandler(): RecoveryHandler {
  return RecoveryHandler.getInstance();
}
