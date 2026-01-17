#!/usr/bin/env node
/**
 * Auto-Heal Hook (v3.1)
 *
 * On-error hook that automatically detects and recovers from common failures.
 *
 * Handles:
 * - SQLite database locks (cleans .db-wal files)
 * - MCP Server crashes (auto-restart)
 * - Network timeouts (retries with backoff)
 * - File permission errors (fixes permissions)
 *
 * This hook provides transparent error recovery for the user.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const MCP_SERVER_NAME = 'mcp-server';
const DB_PATH = process.env.RESEARCH_DB_PATH || 'mcp-server/data/research_state.db';
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

/**
 * Detect error type from error message
 */
function detectErrorType(errorMessage) {
  if (errorMessage.includes('database is locked') ||
      errorMessage.includes('SQLITE_LOCKED') ||
      errorMessage.includes('database is busy')) {
    return 'sqlite_lock';
  }

  if (errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('MCP server') ||
      errorMessage.includes('connection refused')) {
    return 'mcp_down';
  }

  if (errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('ECONNRESET')) {
    return 'network_timeout';
  }

  if (errorMessage.includes('EACCES') ||
      errorMessage.includes('permission denied') ||
      errorMessage.includes('EPERM')) {
    return 'permission_error';
  }

  return 'unknown';
}

/**
 * Heal SQLite lock issue
 */
function healSQLiteLock() {
  console.log('🔧 Attempting to heal SQLite lock...');

  try {
    // 1. Find WAL files
    const dbDir = path.dirname(DB_PATH);
    const dbBasename = path.basename(DB_PATH, '.db');

    const walFile = path.join(dbDir, `${dbBasename}.db-wal`);
    const shmFile = path.join(dbDir, `${dbBasename}.db-shm`);

    // 2. Remove WAL files if they exist
    if (fs.existsSync(walFile)) {
      fs.unlinkSync(walFile);
      console.log('  ✅ Removed WAL file');
    }

    if (fs.existsSync(shmFile)) {
      fs.unlinkSync(shmFile);
      console.log('  ✅ Removed SHM file');
    }

    // 3. Check for stale locks
    const lockFiles = fs.readdirSync(dbDir).filter(f => f.includes('lock'));

    for (const lockFile of lockFiles) {
      const lockPath = path.join(dbDir, lockFile);
      // Only remove if older than 5 minutes
      const stats = fs.statSync(lockPath);
      const age = Date.now() - stats.mtimeMs;

      if (age > 5 * 60 * 1000) {
        fs.unlinkSync(lockPath);
        console.log(`  ✅ Removed stale lock: ${lockFile}`);
      }
    }

    // 4. Run checkpoint to clean up
    try {
      execSync(`sqlite3 "${DB_PATH}" "PRAGMA wal_checkpoint(TRUNCATE);"`, {
        stdio: 'ignore',
        timeout: 5000
      });
      console.log('  ✅ Checkpoint completed');
    } catch (error) {
      // Checkpoint might fail if db is busy, that's okay
      console.log('  ⚠️  Checkpoint skipped (database busy)');
    }

    console.log('✅ SQLite lock healed');
    return true;
  } catch (error) {
    console.error(`❌ Failed to heal SQLite: ${error.message}`);
    return false;
  }
}

/**
 * Heal MCP Server down issue
 */
function healMCPDown() {
  console.log('🔧 Attempting to heal MCP Server...');

  try {
    // 1. Check if MCP process is running
    try {
      const result = execSync('ps aux | grep -i "mcp-server" | grep -v grep', {
        encoding: 'utf-8'
      });

      if (result.trim()) {
        console.log('  ⚠️  MCP process exists but may be unresponsive');
        // Kill existing process
        execSync('pkill -f "mcp-server" || true');
        console.log('  ✅ Killed stale MCP process');
      }
    } catch (error) {
      console.log('  ℹ️  No MCP process found');
    }

    // 2. Clear any socket files
    const socketPaths = [
      path.join(PROJECT_ROOT, '.mcp.sock'),
      path.join(PROJECT_ROOT, 'mcp-server.sock'),
      '/tmp/mcp-server.sock'
    ];

    for (const socketPath of socketPaths) {
      if (fs.existsSync(socketPath)) {
        fs.unlinkSync(socketPath);
        console.log(`  ✅ Removed socket: ${socketPath}`);
      }
    }

    // 3. Clean MCP cache
    const cacheDir = path.join(PROJECT_ROOT, 'mcp-server', '.cache');
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      console.log('  ✅ Cleared MCP cache');
    }

    console.log('✅ MCP Server environment cleaned');
    console.log('ℹ️  MCP Server will auto-restart on next command');
    return true;
  } catch (error) {
    console.error(`❌ Failed to heal MCP: ${error.message}`);
    return false;
  }
}

/**
 * Heal permission error
 */
function healPermissionError(filePath) {
  console.log('🔧 Attempting to heal permission error...');

  try {
    // Fix common permission issues
    const dirsToFix = [
      'RESEARCH',
      'mcp-server/data',
      'mcp-server/logs'
    ];

    for (const dir of dirsToFix) {
      const dirPath = path.join(PROJECT_ROOT, dir);
      if (fs.existsSync(dirPath)) {
        // Ensure read/write access
        fs.chmodSync(dirPath, 0o755);

        // Fix files in directory
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          try {
            fs.chmodSync(filePath, 0o644);
          } catch (error) {
            // Skip files we can't modify
          }
        }
        console.log(`  ✅ Fixed permissions for ${dir}`);
      }
    }

    console.log('✅ Permissions healed');
    return true;
  } catch (error) {
    console.error(`❌ Failed to heal permissions: ${error.message}`);
    return false;
  }
}

/**
 * Retry command with backoff
 */
function retryWithBackoff(command, maxRetries = 3) {
  console.log(`🔧 Retrying command (max ${maxRetries} retries)...`);

  for (let i = 0; i < maxRetries; i++) {
    const backoffMs = Math.pow(2, i) * 1000; // 1s, 2s, 4s

    console.log(`  Attempt ${i + 1}/${maxRetries} after ${backoffMs}ms delay...`);

    // Wait before retry
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, backoffMs);

    try {
      // Execute command
      execSync(command, { stdio: 'inherit' });
      console.log(`✅ Retry ${i + 1} succeeded`);
      return true;
    } catch (error) {
      console.log(`  ⚠️  Retry ${i + 1} failed: ${error.message}`);
    }
  }

  console.error('❌ All retries exhausted');
  return false;
}

/**
 * Main heal logic
 */
function main() {
  // Get error from environment
  const errorMessage = process.env.HOOK_ERROR || '';
  const command = process.env.HOOK_COMMAND || '';

  console.log(`\n🚑 Auto-Heal Hook activated`);
  console.log(`Error: ${errorMessage.substring(0, 100)}...`);

  const errorType = detectErrorType(errorMessage);
  console.log(`Detected error type: ${errorType}`);

  let healed = false;

  switch (errorType) {
    case 'sqlite_lock':
      healed = healSQLiteLock();
      break;

    case 'mcp_down':
      healed = healMCPDown();
      break;

    case 'permission_error':
      healed = healPermissionError();
      break;

    case 'network_timeout':
      // Retry with exponential backoff
      healed = retryWithBackoff(command, 3);
      break;

    default:
      console.log(`ℹ️  Unknown error type - no auto-heal available`);
      console.log(`Error details: ${errorMessage}`);
      process.exit(1);
  }

  if (healed) {
    console.log('\n✅ Auto-heal successful - you may retry the command');
    process.exit(0);
  } else {
    console.error('\n❌ Auto-heal failed - manual intervention required');
    process.exit(1);
  }
}

// Only run if error is present
if (process.env.HOOK_ERROR) {
  main();
} else {
  // No error - skip healing
  process.exit(0);
}
