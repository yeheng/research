/**
 * Agent Management Tools
 *
 * Tools for managing research agent lifecycle:
 * - register_agent: Register a newly deployed research agent
 * - update_agent_status: Update agent status and output file
 * - get_active_agents: Get all active agents for a session
 */

import { getDB } from '../state/db.js';

// Tool definitions
export const agentTools = [
  {
    name: 'register_agent',
    description: 'Register a newly deployed research agent',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        agent_id: { type: 'string' },
        agent_type: { type: 'string' },
        agent_role: { type: 'string' },
        focus_description: { type: 'string' },
        search_queries: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['session_id', 'agent_id', 'agent_type']
    }
  },
  {
    name: 'update_agent_status',
    description: 'Update agent status and output file',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string' },
        status: {
          type: 'string',
          enum: ['deploying', 'running', 'completed', 'failed', 'timeout']
        },
        output_file: { type: 'string' },
        error_message: { type: 'string' },
        token_usage: { type: 'number' }
      },
      required: ['agent_id', 'status']
    }
  },
  {
    name: 'get_active_agents',
    description: 'Get all active agents for a session',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        status: {
          type: 'string',
          enum: ['deploying', 'running', 'completed', 'failed', 'timeout', 'all']
        }
      },
      required: ['session_id']
    }
  }
];

// Handler implementations

/**
 * Register a new agent
 */
export function registerAgentHandler(input: any) {
  const db = getDB();

  const stmt = db.prepare(`
    INSERT INTO research_agents
    (agent_id, session_id, agent_type, agent_role, focus_description, search_queries, status)
    VALUES (?, ?, ?, ?, ?, ?, 'deploying')
  `);

  stmt.run(
    input.agent_id,
    input.session_id,
    input.agent_type,
    input.agent_role || '',
    input.focus_description || '',
    JSON.stringify(input.search_queries || [])
  );

  return {
    registered: true,
    agent_id: input.agent_id,
    status: 'deploying'
  };
}

/**
 * Update agent status
 */
export function updateAgentStatusHandler(input: any) {
  const db = getDB();

  const stmt = db.prepare(`
    UPDATE research_agents
    SET status = ?,
        output_file = COALESCE(?, output_file),
        error_message = COALESCE(?, error_message),
        token_usage = COALESCE(?, token_usage),
        completed_at = CASE WHEN ? IN ('completed', 'failed', 'timeout')
                           THEN CURRENT_TIMESTAMP
                           ELSE completed_at END
    WHERE agent_id = ?
  `);

  const result = stmt.run(
    input.status,
    input.output_file || null,
    input.error_message || null,
    input.token_usage || null,
    input.status,
    input.agent_id
  );

  if (result.changes === 0) {
    throw new Error(`Agent ${input.agent_id} not found`);
  }

  return { success: true, agent_id: input.agent_id, status: input.status };
}

/**
 * Get active agents for a session
 */
export function getActiveAgentsHandler(input: any) {
  const db = getDB();

  let query = 'SELECT * FROM research_agents WHERE session_id = ?';
  const params: any[] = [input.session_id];

  if (input.status && input.status !== 'all') {
    query += ' AND status = ?';
    params.push(input.status);
  }

  const agents = db.prepare(query).all(...params);

  return {
    session_id: input.session_id,
    count: agents.length,
    agents
  };
}
