#!/usr/bin/env node
/**
 * Budget Enforcement Hook (v3.1)
 *
 * Pre-command hook that enforces hard token budget limits.
 * Prevents LLM execution if budget is exhausted.
 *
 * LLM ignores soft limits in prompts - this hook provides physical blocking.
 *
 * Configuration:
 * - BUDGET_LIMIT: Maximum tokens per project (default: 500000)
 * - WARN_THRESHOLD: Percentage to warn at (default: 0.8 = 80%)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BUDGET_LIMIT = parseInt(process.env.RESEARCH_BUDGET_LIMIT) || 500000;
const WARN_THRESHOLD = parseFloat(process.env.RESEARCH_WARN_THRESHOLD) || 0.8;
const DB_PATH = process.env.RESEARCH_DB_PATH || 'mcp-server/data/research_state.db';

// Check if command is deep-research (skip enforcement for other commands)
const command = process.env.HOOK_COMMAND || '';
const isDeepResearch = command.includes('deep-research') || command.includes('/deep-research');

if (!isDeepResearch) {
  console.log('⏭️  Skipping budget check (not a deep-research command)');
  process.exit(0);
}

/**
 * Get current token usage from SQLite database
 */
function getTokenUsage() {
  if (!fs.existsSync(DB_PATH)) {
    return { total_tokens: 0, sessions: [] };
  }

  try {
    // For simplicity, use grep to extract token metrics
    // In production, use better-sqlite3 directly
    const { execSync } = require('child_process');

    // Check if sqlite3 is available
    try {
      const result = execSync(
        `sqlite3 "${DB_PATH}" "SELECT SUM(tokens) as total FROM metrics;" 2>/dev/null || echo "0"`,
        { encoding: 'utf-8' }
      );

      const total = parseInt(result.trim()) || 0;
      return { total_tokens: total };
    } catch (error) {
      // Database not accessible
      return { total_tokens: 0 };
    }
  } catch (error) {
    return { total_tokens: 0 };
  }
}

/**
 * Main budget check logic
 */
function main() {
  console.log(`\n💰 Budget Enforcement Hook`);
  console.log(`Limit: ${BUDGET_LIMIT.toLocaleString()} tokens`);

  const { total_tokens } = getTokenUsage();
  const usage = total_tokens;
  const percentage = usage / BUDGET_LIMIT;

  console.log(`Used: ${usage.toLocaleString()} tokens (${(percentage * 100).toFixed(1)}%)`);
  console.log(`Remaining: ${(BUDGET_LIMIT - usage).toLocaleString()} tokens`);

  // Budget exhausted - HARD BLOCK
  if (usage >= BUDGET_LIMIT) {
    console.error(`\n❌ BUDGET EXHAUSTED`);
    console.error(`\nYour research budget of ${BUDGET_LIMIT.toLocaleString()} tokens has been exhausted.`);
    console.error(`\nTo continue research:`);
    console.error(`1. Archive current research: mv RESEARCH/current RESEARCH/completed`);
    console.error(`2. Increase limit: RESEARCH_BUDGET_LIMIT=1000000 /deep-research "topic"`);
    console.error(`3. Start fresh session\n`);

    // Exit with error to prevent command execution
    process.exit(1);
  }

  // Warn at threshold
  if (percentage >= WARN_THRESHOLD) {
    console.warn(`\n⚠️  BUDGET WARNING: ${(percentage * 100).toFixed(1)}% used`);
    console.warn(`Consider wrapping up soon or increasing budget limit.\n`);
  } else {
    console.log(`✅ Budget OK - proceeding with research\n`);
  }

  // Exit successfully to allow command execution
  process.exit(0);
}

main();
