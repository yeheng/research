/**
 * Progress Renderer Tool
 *
 * Generates human-readable progress.md from activity log
 */

import fs from 'fs';
import path from 'path';

interface ActivityLog {
  timestamp: string;
  session_id: string;
  phase: number;
  agent_id?: string;
  event_type: string;
  message: string;
  details?: any;
}

export const renderingTools = [
  {
    name: 'render_progress',
    description: 'Generate human-readable progress.md from activity log (call at phase milestones)',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        output_dir: { type: 'string' },
        include_all_logs: {
          type: 'boolean',
          description: 'If true, include all logs; if false, only summaries (default: false)'
        }
      },
      required: ['session_id', 'output_dir']
    }
  }
];

/**
 * Render progress handler
 */
export function renderProgressHandler(input: any): any {
  const logFile = path.join(input.output_dir, 'activity.log');

  if (!fs.existsSync(logFile)) {
    return {
      rendered: false,
      reason: 'No activity log found'
    };
  }

  // Read all logs
  const logs: ActivityLog[] = fs.readFileSync(logFile, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));

  // Generate Markdown
  const markdown = generateProgressMarkdown(
    input.session_id,
    logs,
    input.include_all_logs || false
  );

  // Write progress.md
  const progressFile = path.join(input.output_dir, 'progress.md');
  fs.writeFileSync(progressFile, markdown);

  return {
    rendered: true,
    log_count: logs.length,
    file: progressFile
  };
}

/**
 * Generate progress markdown from logs
 */
function generateProgressMarkdown(
  sessionId: string,
  logs: ActivityLog[],
  includeAllLogs: boolean
): string {
  // Group by phase
  const byPhase = new Map<number, ActivityLog[]>();
  logs.forEach(log => {
    if (!byPhase.has(log.phase)) byPhase.set(log.phase, []);
    byPhase.get(log.phase)!.push(log);
  });

  // Find current phase
  const currentPhase = Math.max(...byPhase.keys());

  let md = `# Research Progress Log\n\n`;
  md += `## Session Information\n\n`;
  md += `- **Session ID**: ${sessionId}\n`;
  md += `- **Current Phase**: ${currentPhase}\n`;
  md += `- **Last Updated**: ${new Date().toISOString()}\n`;
  md += `- **Total Activities**: ${logs.length}\n\n`;
  md += `---\n\n`;

  return md + generatePhasesSummary(byPhase, includeAllLogs);
}

/**
 * Generate phases summary
 */
function generatePhasesSummary(
  byPhase: Map<number, ActivityLog[]>,
  includeAllLogs: boolean
): string {
  let md = '';

  for (const [phase, phaseLogs] of Array.from(byPhase.entries()).sort((a, b) => a[0] - b[0])) {
    const startLog = phaseLogs.find(l => l.event_type === 'phase_start');
    const completeLog = phaseLogs.find(l => l.event_type === 'phase_complete');
    const agentLogs = phaseLogs.filter(l => l.event_type.includes('agent'));
    const errorLogs = phaseLogs.filter(l => l.event_type === 'error');

    md += `## Phase ${phase}: ${startLog?.message || 'Unknown'}\n\n`;
    md += `- **Status**: ${completeLog ? '✅ Completed' : '🔄 In Progress'}\n`;
    md += `- **Activities**: ${phaseLogs.length}\n`;

    if (errorLogs.length > 0) {
      md += `- **Errors**: ${errorLogs.length}\n`;
    }

    md += '\n';
  }

  return md;
}
