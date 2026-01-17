/**
 * Activity Logger Tool
 *
 * Provides append-only logging with file locking for concurrent safety
 */

import fs from 'fs';
import path from 'path';
import lockfile from 'proper-lockfile';

interface ActivityLog {
  timestamp: string;
  session_id: string;
  phase: number;
  agent_id?: string;
  event_type: 'phase_start' | 'phase_complete' | 'agent_deploy' | 'agent_complete' | 'info' | 'error';
  message: string;
  details?: any;
}

export const loggingTools = [
  {
    name: 'log_activity',
    description: 'Log research activity (append-only, concurrent-safe with file lock)',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        phase: { type: 'number', minimum: 0, maximum: 7 },
        agent_id: { type: 'string' },
        event_type: {
          type: 'string',
          enum: ['phase_start', 'phase_complete', 'agent_deploy', 'agent_complete', 'info', 'error']
        },
        message: { type: 'string' },
        details: { type: 'object' },
        output_dir: { type: 'string' }
      },
      required: ['session_id', 'phase', 'event_type', 'message']
    }
  }
];

/**
 * Log activity handler
 */
export async function logActivityHandler(input: any): Promise<any> {
  const logFile = path.join(
    input.output_dir || path.join('RESEARCH', input.session_id),
    'activity.log'
  );

  // Ensure directory exists
  const logDir = path.dirname(logFile);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const log: ActivityLog = {
    timestamp: new Date().toISOString(),
    session_id: input.session_id,
    phase: input.phase,
    agent_id: input.agent_id,
    event_type: input.event_type,
    message: input.message,
    details: input.details
  };

  // Use file lock to ensure concurrent safety
  let release;
  try {
    release = await lockfile.lock(logFile, { retries: 5 });
    fs.appendFileSync(logFile, JSON.stringify(log) + '\n');
  } finally {
    if (release) await release();
  }

  return {
    logged: true,
    timestamp: log.timestamp
  };
}
