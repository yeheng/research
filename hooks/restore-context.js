#!/usr/bin/env node
/**
 * Context Restore Hook
 * Checks for incomplete research sessions and injects context summary
 */

const fs = require('fs');
const path = require('path');

const RESEARCH_DIR = 'RESEARCH';

// Find incomplete sessions
function findIncompleteSessions() {
  if (!fs.existsSync(RESEARCH_DIR)) {
    return [];
  }

  const sessions = [];
  const dirs = fs.readdirSync(RESEARCH_DIR);

  for (const dir of dirs) {
    const sessionPath = path.join(RESEARCH_DIR, dir);
    const progressFile = path.join(sessionPath, 'progress.md');
    const finalReport = path.join(sessionPath, 'full_report.md');

    // Session is incomplete if progress exists but no final report
    if (fs.existsSync(progressFile) && !fs.existsSync(finalReport)) {
      sessions.push({
        name: dir,
        path: sessionPath,
        progressFile
      });
    }
  }

  return sessions;
}

// Generate context summary
function generateContextSummary(sessions) {
  if (sessions.length === 0) {
    return null;
  }

  let summary = '\n## 🔄 Incomplete Research Sessions Detected\n\n';

  for (const session of sessions) {
    const progress = fs.readFileSync(session.progressFile, 'utf-8');
    const lines = progress.split('\n').slice(0, 10).join('\n');

    summary += `### ${session.name}\n`;
    summary += `Path: ${session.path}\n`;
    summary += `Preview:\n\`\`\`\n${lines}\n...\n\`\`\`\n\n`;
  }

  summary += 'Would you like to resume any of these sessions?\n';
  return summary;
}

// Main execution
const incompleteSessions = findIncompleteSessions();

if (incompleteSessions.length > 0) {
  const summary = generateContextSummary(incompleteSessions);
  console.log(summary);
} else {
  console.log('✅ No incomplete sessions found.');
}
