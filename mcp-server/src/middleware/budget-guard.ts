/**
 * Budget Guard Middleware (v4.0)
 *
 * Provides runtime budget enforcement at the MCP tool level.
 * Prevents runaway token consumption by blocking expensive tools when budget is exhausted.
 */

import { getDB } from '../state/db.js';

export interface BudgetConfig {
  softLimit: number;  // Warn at this percentage (default: 0.8 = 80%)
  hardLimit: number;  // Block expensive tools at this limit
}

export class BudgetGuard {
  private config: BudgetConfig;
  private expensiveTools: Set<string>;

  constructor(config?: Partial<BudgetConfig>) {
    this.config = {
      softLimit: config?.softLimit || 0.8,
      hardLimit: config?.hardLimit || 1.0,
    };

    // Tools that consume significant tokens
    this.expensiveTools = new Set([
      'mcp__web_reader__webReader',
      'generate_paths',
      'auto_process_data',
      'batch-extract',
      'batch-validate',
    ]);
  }

  /**
   * Get token usage for a session
   */
  private getSessionUsage(sessionId: string): number {
    const db = getDB();

    try {
      const result = db.prepare(`
        SELECT metadata FROM research_sessions WHERE session_id = ?
      `).get(sessionId) as any;

      if (!result) return 0;

      const metadata = JSON.parse(result.metadata || '{}');
      return metadata.total_tokens || 0;
    } catch (error) {
      console.error('Error getting session usage:', error);
      return 0;
    }
  }

  /**
   * Get budget limit for a session
   */
  private getSessionLimit(sessionId: string): number {
    // Check environment variable first
    const envLimit = process.env.RESEARCH_BUDGET_LIMIT;
    if (envLimit) {
      return parseInt(envLimit);
    }

    // Default limit
    return 500000;
  }

  /**
   * Check if tool call should be allowed
   */
  async checkBudget(sessionId: string, toolName: string): Promise<{ allowed: boolean; reason?: string }> {
    const usage = this.getSessionUsage(sessionId);
    const limit = this.getSessionLimit(sessionId);
    const percentage = usage / limit;

    // Soft limit (warn but allow)
    if (percentage >= this.config.softLimit && percentage < this.config.hardLimit) {
      console.warn(`⚠️  Session ${sessionId} at ${(percentage * 100).toFixed(1)}% budget`);
      console.warn(`   Used: ${usage.toLocaleString()} / ${limit.toLocaleString()} tokens`);
      return { allowed: true };
    }

    // Hard limit (block expensive tools)
    if (percentage >= this.config.hardLimit) {
      if (this.expensiveTools.has(toolName)) {
        return {
          allowed: false,
          reason: `Budget exhausted (${usage.toLocaleString()}/${limit.toLocaleString()} tokens). Tool '${toolName}' blocked. Use lightweight tools or increase budget.`
        };
      }

      // Allow lightweight tools even at hard limit
      console.warn(`⚠️  Budget exhausted but allowing lightweight tool: ${toolName}`);
      return { allowed: true };
    }

    // Under budget
    return { allowed: true };
  }

  /**
   * Update token usage for a session
   */
  updateUsage(sessionId: string, tokensUsed: number): void {
    const db = getDB();

    try {
      const result = db.prepare(`
        SELECT metadata FROM research_sessions WHERE session_id = ?
      `).get(sessionId) as any;

      if (!result) return;

      const metadata = JSON.parse(result.metadata || '{}');
      metadata.total_tokens = (metadata.total_tokens || 0) + tokensUsed;

      db.prepare(`
        UPDATE research_sessions
        SET metadata = ?
        WHERE session_id = ?
      `).run(JSON.stringify(metadata), sessionId);
    } catch (error) {
      console.error('Error updating usage:', error);
    }
  }
}

// Singleton instance
let budgetGuardInstance: BudgetGuard | null = null;

export function getBudgetGuard(): BudgetGuard {
  if (!budgetGuardInstance) {
    budgetGuardInstance = new BudgetGuard();
  }
  return budgetGuardInstance;
}
