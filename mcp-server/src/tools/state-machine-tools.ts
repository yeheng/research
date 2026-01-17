/**
 * State Machine Tools (v4.0)
 *
 * MCP tools for interacting with the research state machine.
 * The state machine decides what action to take next based on current graph state.
 */

import { ResearchStateMachine } from '../logic/state-machine.js';
import { GraphState } from '../logic/types.js';
import { getDB } from '../state/db.js';

// Tool definitions
export const stateMachineTools = [
  {
    name: 'get_next_action',
    description: 'Get next action from state machine based on current graph state',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Research session ID'
        }
      },
      required: ['session_id']
    }
  }
];

/**
 * Get current graph state from database
 */
function getGraphState(sessionId: string): GraphState {
  const db = getDB();

  // Get session metadata
  const session = db.prepare(`
    SELECT metadata FROM research_sessions WHERE session_id = ?
  `).get(sessionId) as any;

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const metadata = JSON.parse(session.metadata || '{}');

  // Get paths from graph state
  const paths = metadata.graph_state?.paths || [];

  // Build graph state
  const state: GraphState = {
    session_id: sessionId,
    iteration: metadata.iteration || 0,
    max_iterations: metadata.max_iterations || 10,
    paths: paths,
    confidence: metadata.confidence || 0,
    aggregated: metadata.aggregated || false,
    budget_exhausted: metadata.budget_exhausted || false,
    current_findings: metadata.current_findings,
    total_facts: metadata.total_facts || 0,
    cited_facts: metadata.cited_facts || 0,
    sources: metadata.sources || [],
    total_topics: metadata.total_topics || 1,
    covered_topics: metadata.covered_topics || 0
  };

  return state;
}

/**
 * Handler for get_next_action tool
 */
export function getNextActionHandler(args: any) {
  const { session_id } = args;

  // Get current graph state
  const state = getGraphState(session_id);

  // Create state machine instance
  const stateMachine = new ResearchStateMachine({
    maxIterations: state.max_iterations,
    confidenceThreshold: 0.9
  });

  // Get next action
  const nextAction = stateMachine.getNextAction(state);

  return {
    success: true,
    session_id: session_id,
    current_state: {
      iteration: state.iteration,
      confidence: state.confidence,
      paths_count: state.paths.length,
      aggregated: state.aggregated
    },
    next_action: nextAction
  };
}
