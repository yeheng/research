#!/usr/bin/env node
/**
 * Startup Hook - Proactive Environment Check (v4.0)
 *
 * Runs before ANY command to ensure environment is healthy.
 * This prevents errors before they happen instead of reacting to them.
 *
 * Checks:
 * - MCP Server process status
 * - SQLite lock files
 * - Environment variables
 * - Directory structure
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const MCP_SERVER_DIR = 'mcp-server';
const DB_PATH = 'mcp-server/data/research_state.db';
const REQUIRED_DIRS = ['RESEARCH', 'mcp-server/data'];

/**
 * Check if MCP server process is running
 */
function checkMCPServer() {
  try {
    // Check if process exists (cross-platform)
    const result = execSync('pgrep -f "mcp-server" || echo ""', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();

    if (!result) {
      console.log('🔧 MCP server not running, will start on first use');
      // Note: We don't auto-start here to avoid conflicts
      // The MCP client will start it when needed
    } else {
      console.log('✅ MCP server is running');
    }
  } catch (error) {
    // pgrep not available or other error - skip check
    console.log('⏭️  Skipping MCP server check (pgrep not available)');
  }
}

/**
 * Check and clean stale SQLite lock files
 */
function checkSQLiteLocks() {
  const walPath = `${DB_PATH}-wal`;
  const shmPath = `${DB_PATH}-shm`;

  try {
    // Check WAL file
    if (fs.existsSync(walPath)) {
      const stats = fs.statSync(walPath);
      const ageMinutes = (Date.now() - stats.mtimeMs) / 60000;

      // If lock file is older than 30 minutes, it's likely stale
      if (ageMinutes > 30) {
        console.log('🧹 Cleaning stale SQLite WAL file...');
        fs.unlinkSync(walPath);

        if (fs.existsSync(shmPath)) {
          fs.unlinkSync(shmPath);
        }
        console.log('✅ Stale locks cleaned');
      }
    }
  } catch (error) {
    // If we can't clean locks, just warn
    console.warn('⚠️  Could not clean SQLite locks:', error.message);
  }
}

/**
 * Check and set environment variables
 */
function checkEnvironment() {
  // Check budget limit
  if (!process.env.RESEARCH_BUDGET_LIMIT) {
    console.warn('⚠️  RESEARCH_BUDGET_LIMIT not set, using default: 500000');
    // Note: We can't set env vars that persist, just inform user
  } else {
    console.log(`✅ Budget limit: ${parseInt(process.env.RESEARCH_BUDGET_LIMIT).toLocaleString()} tokens`);
  }

  // Check other important env vars
  if (!process.env.RESEARCH_WARN_THRESHOLD) {
    console.log('ℹ️  Using default warning threshold: 80%');
  }
}

/**
 * Check required directory structure
 */
function checkDirectories() {
  for (const dir of REQUIRED_DIRS) {
    if (!fs.existsSync(dir)) {
      console.log(`📁 Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  console.log('✅ Directory structure OK');
}

/**
 * Main startup check
 */
function main() {
  console.log('\n🚀 Environment Check (v4.0)\n');

  try {
    checkDirectories();
    checkSQLiteLocks();
    checkEnvironment();
    checkMCPServer();

    console.log('\n✅ All checks passed - ready to proceed\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Startup check failed:', error.message);
    console.error('\nPlease fix the issues above before continuing.\n');
    process.exit(1);
  }
}

// Run checks
main();
