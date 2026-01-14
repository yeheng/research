/**
 * Phase Tracking Tools
 *
 * Tools for tracking research phases:
 * - update_current_phase: Update current research phase (0-7)
 * - get_current_phase: Get current phase information
 * - checkpoint_phase: Create a checkpoint for recovery
 */

import { getDB } from '../state/db.js';

// Tool definitions
export const phaseTools = [
  {
    name: 'update_current_phase',
    description: 'Update current research phase (0-7)',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        phase_number: { type: 'number', minimum: 0, maximum: 7 },
        phase_name: { type: 'string' },
        status: {
          type: 'string',
          enum: ['starting', 'in_progress', 'completed', 'failed']
        }
      },
      required: ['session_id', 'phase_number', 'phase_name', 'status']
    }
  },
  {
    name: 'get_current_phase',
    description: 'Get current phase information',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' }
      },
      required: ['session_id']
    }
  },
  {
    name: 'checkpoint_phase',
    description: 'Create a checkpoint for recovery (stores phase state to metadata)',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        phase_number: { type: 'number' },
        checkpoint_data: { type: 'object' }
      },
      required: ['session_id', 'phase_number', 'checkpoint_data']
    }
  }
];

// Phase names for reference
const PHASE_NAMES = [
  'Initialization',
  'Question Refinement',
  'Research Planning',
  'Iterative Querying',
  'Source Triangulation',
  'Knowledge Synthesis',
  'Quality Assurance',
  'Final Output'
];

// Handler implementations

/**
 * Update current phase
 */
export function updateCurrentPhaseHandler(input: any) {
  const db = getDB();

  // Get current metadata
  const currentData = db.prepare(`
    SELECT metadata FROM research_sessions WHERE session_id = ?
  `).get(input.session_id) as any;

  const metadata = currentData?.metadata ? JSON.parse(currentData.metadata) : {};
  metadata.current_phase = {
    number: input.phase_number,
    name: input.phase_name,
    status: input.status,
    updated_at: new Date().toISOString()
  };

  const stmt = db.prepare(`
    UPDATE research_sessions
    SET metadata = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE session_id = ?
  `);

  stmt.run(JSON.stringify(metadata), input.session_id);

  return {
    success: true,
    phase: input.phase_number,
    phase_name: input.phase_name,
    status: input.status
  };
}

/**
 * Get current phase
 */
export function getCurrentPhaseHandler(input: any) {
  const db = getDB();

  const session = db.prepare(`
    SELECT metadata FROM research_sessions WHERE session_id = ?
  `).get(input.session_id) as any;

  if (!session) {
    throw new Error(`Session ${input.session_id} not found`);
  }

  const metadata = session.metadata ? JSON.parse(session.metadata) : {};

  return {
    session_id: input.session_id,
    current_phase: metadata.current_phase || null
  };
}

/**
 * Create phase checkpoint
 */
export function checkpointPhaseHandler(input: any) {
  const db = getDB();

  const currentData = db.prepare(`
    SELECT metadata FROM research_sessions WHERE session_id = ?
  `).get(input.session_id) as any;

  const metadata = currentData?.metadata ? JSON.parse(currentData.metadata) : {};

  if (!metadata.checkpoints) {
    metadata.checkpoints = {};
  }

  metadata.checkpoints[`phase_${input.phase_number}`] = {
    created_at: new Date().toISOString(),
    data: input.checkpoint_data
  };

  const stmt = db.prepare(`
    UPDATE research_sessions
    SET metadata = ?
    WHERE session_id = ?
  `);

  stmt.run(JSON.stringify(metadata), input.session_id);

  return {
    success: true,
    checkpoint: `phase_${input.phase_number}`
  };
}
