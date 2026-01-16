/**
 * Unified State Manager
 *
 * Central interface for all state operations with:
 * - SQLite as single source of truth
 * - Event emission for state changes
 * - Automatic progress.md rendering
 */

import { getDB } from './db.js';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

// Type definitions
export interface Session {
  session_id: string;
  research_topic: string;
  research_type: string;
  output_directory: string;
  status: SessionStatus;
  current_phase: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface Agent {
  agent_id: string;
  session_id: string;
  agent_type: string;
  agent_role?: string;
  focus_description?: string;
  search_queries?: string[];
  status: AgentStatus;
  output_file?: string;
  token_usage?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface PhaseInfo {
  session_id: string;
  phase_number: number;
  phase_name: string;
  status: PhaseStatus;
  started_at?: string;
  completed_at?: string;
  checkpoint_data?: object;
}

export type SessionStatus =
  | 'initializing'
  | 'planning'
  | 'executing'
  | 'synthesizing'
  | 'validating'
  | 'completed'
  | 'failed';

export type AgentStatus =
  | 'deploying'
  | 'running'
  | 'completed'
  | 'failed'
  | 'timeout';

export type PhaseStatus =
  | 'starting'
  | 'in_progress'
  | 'completed'
  | 'failed';

// Event types
export interface StateEvents {
  'session:created': (session: Session) => void;
  'session:status_changed': (session_id: string, oldStatus: SessionStatus, newStatus: SessionStatus) => void;
  'session:completed': (session: Session) => void;
  'phase:started': (session_id: string, phase: number, name: string) => void;
  'phase:completed': (session_id: string, phase: number, name: string) => void;
  'agent:registered': (agent: Agent) => void;
  'agent:completed': (agent: Agent) => void;
  'agent:failed': (agent: Agent, error: string) => void;
}

/**
 * Unified State Manager
 *
 * Single source of truth for all research state.
 * Emits events on state changes for reactive updates.
 */
export class UnifiedStateManager extends EventEmitter {
  private db: ReturnType<typeof getDB>;
  private static instance: UnifiedStateManager;

  private constructor() {
    super();
    this.db = getDB();
    this.ensureTables();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): UnifiedStateManager {
    if (!UnifiedStateManager.instance) {
      UnifiedStateManager.instance = new UnifiedStateManager();
    }
    return UnifiedStateManager.instance;
  }

  /**
   * Ensure all required tables exist
   */
  private ensureTables(): void {
    // Activity log table (new - stores all activities for progress rendering)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        phase INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        message TEXT NOT NULL,
        agent_id TEXT,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES research_sessions(session_id)
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_activity_session
      ON activity_log(session_id, phase)
    `);
  }

  // ==================== Session Operations ====================

  /**
   * Create a new research session
   */
  createSession(topic: string, output_dir: string, research_type: string = 'deep'): Session {
    const session_id = randomUUID();

    const stmt = this.db.prepare(`
      INSERT INTO research_sessions
      (session_id, research_topic, research_type, output_directory, status, current_phase)
      VALUES (?, ?, ?, ?, 'initializing', 0)
    `);

    stmt.run(session_id, topic, research_type, output_dir);

    const session = this.getSession(session_id)!;
    this.emit('session:created', session);

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(session_id: string): Session | null {
    return this.db.prepare(`
      SELECT * FROM research_sessions WHERE session_id = ?
    `).get(session_id) as Session | null;
  }

  /**
   * Update session status with event emission
   */
  updateSessionStatus(session_id: string, newStatus: SessionStatus): void {
    const session = this.getSession(session_id);
    if (!session) {
      throw new Error(`Session ${session_id} not found`);
    }

    const oldStatus = session.status;

    const stmt = this.db.prepare(`
      UPDATE research_sessions
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `);
    stmt.run(newStatus, session_id);

    // Emit status change event
    this.emit('session:status_changed', session_id, oldStatus, newStatus);

    // Emit completion event if applicable
    if (newStatus === 'completed') {
      const updatedSession = this.getSession(session_id)!;
      this.emit('session:completed', updatedSession);
    }

    // Auto-log the status change
    this.logActivity(session_id, session.current_phase, 'info',
      `Session status changed: ${oldStatus} → ${newStatus}`);
  }

  /**
   * Complete session with timestamp
   */
  completeSession(session_id: string): void {
    const stmt = this.db.prepare(`
      UPDATE research_sessions
      SET status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `);
    stmt.run(session_id);

    const session = this.getSession(session_id)!;
    this.emit('session:completed', session);
  }

  // ==================== Phase Operations ====================

  /**
   * Start a phase
   */
  startPhase(session_id: string, phase_number: number, phase_name: string): void {
    // Update current phase in session
    const stmt = this.db.prepare(`
      UPDATE research_sessions
      SET current_phase = ?, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `);
    stmt.run(phase_number, session_id);

    // Log phase start
    this.logActivity(session_id, phase_number, 'phase_start',
      `Phase ${phase_number}: ${phase_name}`);

    this.emit('phase:started', session_id, phase_number, phase_name);
  }

  /**
   * Complete a phase
   */
  completePhase(session_id: string, phase_number: number, phase_name: string): void {
    // Log phase completion
    this.logActivity(session_id, phase_number, 'phase_complete',
      `Phase ${phase_number} completed: ${phase_name}`);

    this.emit('phase:completed', session_id, phase_number, phase_name);
  }

  /**
   * Save phase checkpoint for recovery
   */
  saveCheckpoint(session_id: string, phase_number: number, checkpoint_data: object): void {
    // Store checkpoint in a separate table or as JSON in session
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO phase_checkpoints
      (session_id, phase_number, checkpoint_type, state_snapshot, created_at)
      VALUES (?, ?, 'checkpoint', ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(session_id, phase_number, JSON.stringify(checkpoint_data));

    this.logActivity(session_id, phase_number, 'info',
      `Checkpoint saved for phase ${phase_number}`);
  }

  /**
   * Get latest checkpoint for recovery
   */
  getLatestCheckpoint(session_id: string): { phase_number: number; data: object } | null {
    const result = this.db.prepare(`
      SELECT phase_number, state_snapshot
      FROM phase_checkpoints
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(session_id) as { phase_number: number; state_snapshot: string } | undefined;

    if (!result) return null;

    return {
      phase_number: result.phase_number,
      data: JSON.parse(result.state_snapshot)
    };
  }

  // ==================== Agent Operations ====================

  /**
   * Register a new agent
   */
  registerAgent(
    session_id: string,
    agent_id: string,
    agent_type: string,
    options: {
      agent_role?: string;
      focus_description?: string;
      search_queries?: string[];
    } = {}
  ): Agent {
    const stmt = this.db.prepare(`
      INSERT INTO research_agents
      (agent_id, session_id, agent_type, agent_role, focus_description, search_queries, status)
      VALUES (?, ?, ?, ?, ?, ?, 'deploying')
    `);

    stmt.run(
      agent_id,
      session_id,
      agent_type,
      options.agent_role || null,
      options.focus_description || null,
      options.search_queries ? JSON.stringify(options.search_queries) : null
    );

    const agent = this.getAgent(agent_id)!;
    this.emit('agent:registered', agent);

    // Log agent registration
    const session = this.getSession(session_id);
    this.logActivity(session_id, session?.current_phase || 3, 'agent_deploy',
      `Agent deployed: ${agent_id} (${agent_type})`, agent_id);

    return agent;
  }

  /**
   * Get agent by ID
   */
  getAgent(agent_id: string): Agent | null {
    const result = this.db.prepare(`
      SELECT * FROM research_agents WHERE agent_id = ?
    `).get(agent_id) as any;

    if (!result) return null;

    // Parse JSON fields
    if (result.search_queries) {
      result.search_queries = JSON.parse(result.search_queries);
    }

    return result as Agent;
  }

  /**
   * Update agent status
   */
  updateAgentStatus(
    agent_id: string,
    status: AgentStatus,
    options: {
      output_file?: string;
      token_usage?: number;
      error_message?: string;
    } = {}
  ): void {
    const agent = this.getAgent(agent_id);
    if (!agent) {
      throw new Error(`Agent ${agent_id} not found`);
    }

    const stmt = this.db.prepare(`
      UPDATE research_agents
      SET status = ?,
          output_file = COALESCE(?, output_file),
          token_usage = COALESCE(?, token_usage),
          error_message = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE agent_id = ?
    `);

    stmt.run(
      status,
      options.output_file || null,
      options.token_usage || null,
      options.error_message || null,
      agent_id
    );

    const updatedAgent = this.getAgent(agent_id)!;

    // Emit appropriate event
    if (status === 'completed') {
      this.emit('agent:completed', updatedAgent);
      this.logActivity(agent.session_id, 3, 'agent_complete',
        `Agent completed: ${agent_id}`, agent_id);
    } else if (status === 'failed' || status === 'timeout') {
      this.emit('agent:failed', updatedAgent, options.error_message || 'Unknown error');
      this.logActivity(agent.session_id, 3, 'error',
        `Agent failed: ${agent_id} - ${options.error_message}`, agent_id);
    }
  }

  /**
   * Get agents for session
   */
  getSessionAgents(session_id: string, status?: AgentStatus): Agent[] {
    let query = `SELECT * FROM research_agents WHERE session_id = ?`;
    const params: any[] = [session_id];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    const results = this.db.prepare(query).all(...params) as any[];

    return results.map(r => {
      if (r.search_queries) {
        r.search_queries = JSON.parse(r.search_queries);
      }
      return r as Agent;
    });
  }

  // ==================== Activity Logging ====================

  /**
   * Log an activity (stored in DB, rendered to progress.md on demand)
   */
  logActivity(
    session_id: string,
    phase: number,
    event_type: 'phase_start' | 'phase_complete' | 'agent_deploy' | 'agent_complete' | 'info' | 'error',
    message: string,
    agent_id?: string,
    details?: object
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO activity_log
      (session_id, phase, event_type, message, agent_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      session_id,
      phase,
      event_type,
      message,
      agent_id || null,
      details ? JSON.stringify(details) : null
    );
  }

  /**
   * Get activity log for session
   */
  getActivityLog(session_id: string): Array<{
    phase: number;
    event_type: string;
    message: string;
    agent_id?: string;
    details?: object;
    created_at: string;
  }> {
    const results = this.db.prepare(`
      SELECT phase, event_type, message, agent_id, details, created_at
      FROM activity_log
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(session_id) as any[];

    return results.map(r => ({
      ...r,
      details: r.details ? JSON.parse(r.details) : undefined
    }));
  }

  /**
   * Render progress.md from database (read-only rendering)
   */
  renderProgress(session_id: string, output_dir: string): string {
    const session = this.getSession(session_id);
    if (!session) {
      throw new Error(`Session ${session_id} not found`);
    }

    const activities = this.getActivityLog(session_id);
    const agents = this.getSessionAgents(session_id);

    // Build progress.md content from database
    let content = `# Research Progress Log

## Session Information
- **Session ID**: ${session.session_id}
- **Topic**: ${session.research_topic}
- **Status**: ${session.status}
- **Current Phase**: ${session.current_phase}
- **Started**: ${session.created_at}
- **Last Updated**: ${session.updated_at}

---

## Phase Execution

`;

    // Group activities by phase
    const phaseActivities = new Map<number, typeof activities>();
    for (const activity of activities) {
      if (!phaseActivities.has(activity.phase)) {
        phaseActivities.set(activity.phase, []);
      }
      phaseActivities.get(activity.phase)!.push(activity);
    }

    // Render each phase
    for (const [phase, acts] of phaseActivities) {
      const phaseStart = acts.find(a => a.event_type === 'phase_start');
      const phaseComplete = acts.find(a => a.event_type === 'phase_complete');

      content += `### Phase ${phase}${phaseStart ? `: ${phaseStart.message.replace(`Phase ${phase}: `, '')}` : ''}\n`;
      content += `- **Started**: ${phaseStart?.created_at || 'N/A'}\n`;
      content += `- **Status**: ${phaseComplete ? 'Completed' : 'In Progress'}\n`;

      if (phaseComplete) {
        content += `- **Completed**: ${phaseComplete.created_at}\n`;
      }

      // Phase 3 agent table
      if (phase === 3) {
        const phaseAgents = agents.filter(a => true); // All agents are from phase 3
        if (phaseAgents.length > 0) {
          content += `\n#### Agent Deployments\n\n`;
          content += `| Agent ID | Type | Status | Output |\n`;
          content += `|----------|------|--------|--------|\n`;
          for (const agent of phaseAgents) {
            content += `| ${agent.agent_id} | ${agent.agent_type} | ${agent.status} | ${agent.output_file || '-'} |\n`;
          }
        }
      }

      content += `\n`;
    }

    // Summary statistics
    const completedAgents = agents.filter(a => a.status === 'completed').length;
    const totalAgents = agents.length;

    content += `---

## Summary

- **Agents Deployed**: ${totalAgents}
- **Agents Completed**: ${completedAgents}
- **Success Rate**: ${totalAgents > 0 ? Math.round(completedAgents / totalAgents * 100) : 0}%

---

*Generated from database at ${new Date().toISOString()}*
`;

    return content;
  }

  // ==================== Metrics ====================

  /**
   * Record metrics for a session
   */
  recordMetrics(
    session_id: string,
    metrics: {
      token_usage?: number;
      quality_score?: number;
      latency_ms?: number;
      source?: string;
    }
  ): void {
    // Store metrics in activity log with details
    this.logActivity(session_id, 0, 'info', 'Metrics recorded', undefined, metrics);
  }

  /**
   * Get aggregated metrics for session
   */
  getMetrics(session_id: string): {
    total_tokens: number;
    agents_deployed: number;
    agents_completed: number;
    phases_completed: number;
  } {
    const agents = this.getSessionAgents(session_id);
    const activities = this.getActivityLog(session_id);

    const totalTokens = agents.reduce((sum, a) => sum + (a.token_usage || 0), 0);
    const phasesCompleted = activities.filter(a => a.event_type === 'phase_complete').length;

    return {
      total_tokens: totalTokens,
      agents_deployed: agents.length,
      agents_completed: agents.filter(a => a.status === 'completed').length,
      phases_completed: phasesCompleted
    };
  }
}

// Export singleton getter
export function getStateManager(): UnifiedStateManager {
  return UnifiedStateManager.getInstance();
}
