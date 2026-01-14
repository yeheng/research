/**
 * State Management Tools
 *
 * Core tools for managing research sessions:
 * - create_research_session: Create new research session
 * - update_session_status: Update session lifecycle status
 * - get_session_info: Retrieve session details
 */

import { getDB } from '../state/db.js';
import { randomUUID } from 'crypto';

// Tool definitions
export const stateTools = [
  {
    name: 'create_research_session',
    description: 'Create a new research session with unique ID',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Research topic/question'
        },
        research_type: {
          type: 'string',
          enum: ['deep', 'quick', 'custom'],
          description: 'Type of research (default: deep)'
        },
        output_dir: {
          type: 'string',
          description: 'Output directory path (e.g., RESEARCH/topic-name)'
        }
      },
      required: ['topic', 'output_dir']
    }
  },
  {
    name: 'update_session_status',
    description: 'Update session status through research lifecycle',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        status: {
          type: 'string',
          enum: ['initializing', 'planning', 'executing', 'synthesizing', 'validating', 'completed', 'failed']
        }
      },
      required: ['session_id', 'status']
    }
  },
  {
    name: 'get_session_info',
    description: 'Retrieve session details including current status and metadata',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' }
      },
      required: ['session_id']
    }
  }
];

// Handler implementations

/**
 * Create a new research session
 */
export function createSessionHandler(input: any) {
  const db = getDB();
  const session_id = randomUUID();

  const stmt = db.prepare(`
    INSERT INTO research_sessions
    (session_id, research_topic, research_type, output_directory, status)
    VALUES (?, ?, ?, ?, 'initializing')
  `);

  stmt.run(
    session_id,
    input.topic,
    input.research_type || 'deep',
    input.output_dir
  );

  return {
    session_id,
    status: 'initializing',
    created_at: new Date().toISOString()
  };
}

/**
 * Update session status
 */
export function updateSessionStatusHandler(input: any) {
  const db = getDB();

  const stmt = db.prepare(`
    UPDATE research_sessions
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE session_id = ?
  `);

  const result = stmt.run(input.status, input.session_id);

  if (result.changes === 0) {
    throw new Error(`Session ${input.session_id} not found`);
  }

  return { success: true, status: input.status };
}

/**
 * Get session information
 */
export function getSessionInfoHandler(input: any) {
  const db = getDB();

  const session = db.prepare(`
    SELECT * FROM research_sessions WHERE session_id = ?
  `).get(input.session_id);

  if (!session) {
    throw new Error(`Session ${input.session_id} not found`);
  }

  return session;
}
