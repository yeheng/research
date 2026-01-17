#!/usr/bin/env node
/**
 * Auto Logger Hook
 * Automatically logs MCP tool usage to progress.md
 */

const fs = require('fs');
const path = require('path');

// Read hook context from environment
const toolName = process.env.HOOK_TOOL_NAME || 'unknown';
const toolInput = process.env.HOOK_TOOL_INPUT || '{}';
const sessionDir = process.env.RESEARCH_SESSION_DIR || 'RESEARCH/current';

// Parse tool input
let parsedInput;
try {
  parsedInput = JSON.parse(toolInput);
} catch (e) {
  parsedInput = { raw: toolInput };
}

// Generate log entry
const timestamp = new Date().toISOString();
const logEntry = `
## [${timestamp}] ${toolName}

**Input**: ${JSON.stringify(parsedInput, null, 2)}

---
`;

// Append to progress.md
const progressFile = path.join(sessionDir, 'progress.md');
try {
  fs.appendFileSync(progressFile, logEntry, 'utf-8');
  console.log(`✅ Logged ${toolName} to ${progressFile}`);
} catch (error) {
  console.error(`❌ Failed to log: ${error.message}`);
}
