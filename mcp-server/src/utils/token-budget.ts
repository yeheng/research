/**
 * Token Budget Manager
 *
 * Provides token budget tracking and enforcement:
 * - Per-session budget allocation
 * - Phase-level budget distribution
 * - Automatic warnings and actions on threshold breach
 * - Persistence to database for recovery
 */

import { getDB } from '../state/db.js';
import { EventEmitter } from 'events';

// Types
export interface TokenBudgetConfig {
  totalBudget: number;           // Total token budget (e.g., 500000)
  phaseBudgets?: Map<number, number>;  // Per-phase budgets
  warningThreshold: number;      // Warning at this percentage (e.g., 0.8)
  hardLimit: boolean;            // Stop on exceed if true
}

export interface TokenUsage {
  consumed: number;
  remaining: number;
  percentage: number;
  byPhase: Map<number, number>;
  bySource: Map<string, number>;
}

export type BudgetAction = 'warn' | 'compress' | 'pause' | 'terminate';

export interface BudgetEvent {
  session_id: string;
  action: BudgetAction;
  consumed: number;
  limit: number;
  percentage: number;
}

/**
 * Token Budget Manager
 *
 * Tracks and enforces token budgets per research session.
 */
export class TokenBudgetManager extends EventEmitter {
  private budgets: Map<string, TokenBudgetConfig> = new Map();
  private usage: Map<string, TokenUsage> = new Map();
  private db: ReturnType<typeof getDB>;
  private static instance: TokenBudgetManager;

  private constructor() {
    super();
    this.db = getDB();
    this.ensureTable();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TokenBudgetManager {
    if (!TokenBudgetManager.instance) {
      TokenBudgetManager.instance = new TokenBudgetManager();
    }
    return TokenBudgetManager.instance;
  }

  /**
   * Ensure token_budgets table exists
   */
  private ensureTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS token_budgets (
        session_id TEXT PRIMARY KEY,
        total_budget INTEGER NOT NULL,
        consumed INTEGER DEFAULT 0,
        warning_threshold REAL DEFAULT 0.8,
        hard_limit INTEGER DEFAULT 1,
        phase_budgets TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES research_sessions(session_id)
      )
    `);
  }

  /**
   * Set budget for a session
   */
  setBudget(session_id: string, config: TokenBudgetConfig): void {
    this.budgets.set(session_id, config);

    // Initialize usage tracking
    this.usage.set(session_id, {
      consumed: 0,
      remaining: config.totalBudget,
      percentage: 0,
      byPhase: new Map(),
      bySource: new Map()
    });

    // Persist to database
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO token_budgets
      (session_id, total_budget, warning_threshold, hard_limit, phase_budgets)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      session_id,
      config.totalBudget,
      config.warningThreshold,
      config.hardLimit ? 1 : 0,
      config.phaseBudgets ? JSON.stringify(Array.from(config.phaseBudgets.entries())) : null
    );
  }

  /**
   * Load budget from database (for recovery)
   */
  loadBudget(session_id: string): TokenBudgetConfig | null {
    const result = this.db.prepare(`
      SELECT * FROM token_budgets WHERE session_id = ?
    `).get(session_id) as any;

    if (!result) return null;

    const config: TokenBudgetConfig = {
      totalBudget: result.total_budget,
      warningThreshold: result.warning_threshold,
      hardLimit: result.hard_limit === 1,
      phaseBudgets: result.phase_budgets
        ? new Map(JSON.parse(result.phase_budgets))
        : undefined
    };

    this.budgets.set(session_id, config);

    // Initialize usage with consumed amount
    this.usage.set(session_id, {
      consumed: result.consumed,
      remaining: config.totalBudget - result.consumed,
      percentage: result.consumed / config.totalBudget,
      byPhase: new Map(),
      bySource: new Map()
    });

    return config;
  }

  /**
   * Consume tokens
   */
  consume(
    session_id: string,
    tokens: number,
    source: string,
    phase?: number
  ): { allowed: boolean; action?: BudgetAction } {
    const config = this.budgets.get(session_id);
    if (!config) {
      // No budget set, allow by default
      return { allowed: true };
    }

    const usage = this.usage.get(session_id)!;

    // Update usage
    usage.consumed += tokens;
    usage.remaining = config.totalBudget - usage.consumed;
    usage.percentage = usage.consumed / config.totalBudget;

    // Track by source
    const currentSourceUsage = usage.bySource.get(source) || 0;
    usage.bySource.set(source, currentSourceUsage + tokens);

    // Track by phase
    if (phase !== undefined) {
      const currentPhaseUsage = usage.byPhase.get(phase) || 0;
      usage.byPhase.set(phase, currentPhaseUsage + tokens);
    }

    // Update database
    this.db.prepare(`
      UPDATE token_budgets
      SET consumed = ?, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `).run(usage.consumed, session_id);

    // Record in metrics table
    this.db.prepare(`
      INSERT INTO token_metrics (session_id, phase, tokens_input, source)
      VALUES (?, ?, ?, ?)
    `).run(session_id, phase || 0, tokens, source);

    // Check thresholds
    if (usage.percentage >= 1.0) {
      // Over budget
      const event: BudgetEvent = {
        session_id,
        action: config.hardLimit ? 'terminate' : 'warn',
        consumed: usage.consumed,
        limit: config.totalBudget,
        percentage: usage.percentage
      };

      this.emit('budget:exceeded', event);

      if (config.hardLimit) {
        return { allowed: false, action: 'terminate' };
      }
      return { allowed: true, action: 'warn' };
    }

    if (usage.percentage >= config.warningThreshold) {
      // Warning threshold
      const event: BudgetEvent = {
        session_id,
        action: 'warn',
        consumed: usage.consumed,
        limit: config.totalBudget,
        percentage: usage.percentage
      };

      this.emit('budget:warning', event);
      return { allowed: true, action: 'warn' };
    }

    return { allowed: true };
  }

  /**
   * Get remaining budget
   */
  getRemaining(session_id: string): number {
    const usage = this.usage.get(session_id);
    return usage?.remaining ?? Infinity;
  }

  /**
   * Get usage statistics
   */
  getUsage(session_id: string): TokenUsage | null {
    return this.usage.get(session_id) || null;
  }

  /**
   * Check if session is over budget
   */
  isOverBudget(session_id: string): boolean {
    const config = this.budgets.get(session_id);
    const usage = this.usage.get(session_id);

    if (!config || !usage) return false;

    return usage.consumed >= config.totalBudget;
  }

  /**
   * Get budget status summary
   */
  getBudgetStatus(session_id: string): {
    total: number;
    consumed: number;
    remaining: number;
    percentage: number;
    isWarning: boolean;
    isExceeded: boolean;
    byPhase: Array<{ phase: number; tokens: number }>;
  } | null {
    const config = this.budgets.get(session_id);
    const usage = this.usage.get(session_id);

    if (!config || !usage) return null;

    return {
      total: config.totalBudget,
      consumed: usage.consumed,
      remaining: usage.remaining,
      percentage: Math.round(usage.percentage * 100) / 100,
      isWarning: usage.percentage >= config.warningThreshold,
      isExceeded: usage.percentage >= 1.0,
      byPhase: Array.from(usage.byPhase.entries())
        .map(([phase, tokens]) => ({ phase, tokens }))
    };
  }

  /**
   * Estimate tokens for content
   * Rough estimation: ~4 characters per token
   */
  estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }

  /**
   * Check phase budget
   */
  checkPhaseBudget(session_id: string, phase: number): {
    allowed: boolean;
    remaining: number;
    action?: BudgetAction;
  } {
    const config = this.budgets.get(session_id);
    const usage = this.usage.get(session_id);

    if (!config || !usage) {
      return { allowed: true, remaining: Infinity };
    }

    // Check phase-specific budget if defined
    if (config.phaseBudgets?.has(phase)) {
      const phaseBudget = config.phaseBudgets.get(phase)!;
      const phaseUsed = usage.byPhase.get(phase) || 0;
      const phaseRemaining = phaseBudget - phaseUsed;

      if (phaseRemaining <= 0) {
        this.emit('budget:phase_exceeded', {
          session_id,
          phase,
          consumed: phaseUsed,
          limit: phaseBudget
        });

        return {
          allowed: false,
          remaining: 0,
          action: 'terminate'
        };
      }

      return { allowed: true, remaining: phaseRemaining };
    }

    // Fall back to overall budget check
    return {
      allowed: !this.isOverBudget(session_id),
      remaining: usage.remaining
    };
  }
}

// Export singleton getter
export function getTokenBudgetManager(): TokenBudgetManager {
  return TokenBudgetManager.getInstance();
}

// Default budget configurations
export const DEFAULT_BUDGETS = {
  deep: {
    totalBudget: 500000,  // 500K tokens
    warningThreshold: 0.8,
    hardLimit: false,
    phaseBudgets: new Map([
      [1, 20000],   // Refinement
      [2, 30000],   // Planning
      [3, 200000],  // Execution (largest)
      [4, 80000],   // Processing
      [5, 100000],  // Synthesis
      [6, 50000],   // Validation
      [7, 20000]    // Output
    ])
  },
  quick: {
    totalBudget: 100000,  // 100K tokens
    warningThreshold: 0.8,
    hardLimit: true,
    phaseBudgets: new Map([
      [1, 5000],
      [2, 10000],
      [3, 50000],
      [4, 20000],
      [5, 10000],
      [6, 3000],
      [7, 2000]
    ])
  }
};
