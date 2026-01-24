package state

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"deep-research-mcp/internal/db"
	"github.com/google/uuid"
)

// Session represents a research session with state machine fields
type Session struct {
	SessionID           string         `json:"session_id"`
	ResearchTopic       string         `json:"research_topic"`
	ResearchType        string         `json:"research_type"`
	OutputDirectory     string         `json:"output_directory"`
	Status              string         `json:"status"`
	CurrentPhase        int            `json:"current_phase"`
	// v4.1: State machine persistence fields
	IterationCount      int            `json:"iteration_count"`
	Confidence          float64        `json:"confidence"`
	IsAggregated        bool           `json:"is_aggregated"`
	BudgetExhausted     bool           `json:"budget_exhausted"`
	MaxIterations       int            `json:"max_iterations"`
	ConfidenceThreshold float64        `json:"confidence_threshold"`
	// v4.1: Concurrency control
	LockedAt            sql.NullString `json:"locked_at,omitempty"`
	LockedBy            sql.NullString `json:"locked_by,omitempty"`
	CreatedAt           string         `json:"created_at"`
	UpdatedAt           string         `json:"updated_at"`
	CompletedAt         sql.NullString `json:"completed_at,omitempty"`
	Metadata            sql.NullString `json:"metadata,omitempty"`
}

type Agent struct {
	AgentID          string         `json:"agent_id"`
	SessionID        string         `json:"session_id"`
	AgentType        string         `json:"agent_type"`
	AgentRole        sql.NullString `json:"agent_role,omitempty"`
	FocusDescription sql.NullString `json:"focus_description,omitempty"`
	SearchQueries    sql.NullString `json:"search_queries,omitempty"`
	Status           string         `json:"status"`
	OutputFile       sql.NullString `json:"output_file,omitempty"`
	TokenUsage       int            `json:"token_usage"`
	ErrorMessage     sql.NullString `json:"error_message,omitempty"`
	CreatedAt        string         `json:"created_at"`
	UpdatedAt        string         `json:"updated_at"`
	CompletedAt      sql.NullString `json:"completed_at,omitempty"`
}

// LockError represents a session lock error
type LockError struct {
	SessionID string
	LockedBy  string
	LockedAt  string
}

func (e *LockError) Error() string {
	return fmt.Sprintf("session %s is locked by %s since %s", e.SessionID, e.LockedBy, e.LockedAt)
}

type StateManager struct {
	DB *sql.DB
}

func NewStateManager() *StateManager {
	return &StateManager{DB: db.DB}
}

// CreateSession creates a new session with default state machine settings
func (sm *StateManager) CreateSession(topic, outputDir, researchType string) (*Session, error) {
	sessionID := uuid.New().String()
	if researchType == "" {
		researchType = "deep"
	}

	// Set defaults based on research type
	maxIterations := 10
	confidenceThreshold := 0.9
	if researchType == "quick" {
		maxIterations = 3
		confidenceThreshold = 0.7
	}

	_, err := sm.DB.Exec(`
		INSERT INTO research_sessions
		(session_id, research_topic, research_type, output_directory, status, current_phase,
		 iteration_count, confidence, is_aggregated, budget_exhausted, max_iterations, confidence_threshold)
		VALUES (?, ?, ?, ?, 'initializing', 0, 0, 0.0, 0, 0, ?, ?)
	`, sessionID, topic, researchType, outputDir, maxIterations, confidenceThreshold)

	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	return sm.GetSession(sessionID)
}

// GetSession retrieves a session with all state machine fields
func (sm *StateManager) GetSession(sessionID string) (*Session, error) {
	row := sm.DB.QueryRow(`
		SELECT session_id, research_topic, research_type, output_directory, status, current_phase,
		       COALESCE(iteration_count, 0), COALESCE(confidence, 0.0),
		       COALESCE(is_aggregated, 0), COALESCE(budget_exhausted, 0),
		       COALESCE(max_iterations, 10), COALESCE(confidence_threshold, 0.9),
		       locked_at, locked_by, created_at, updated_at, completed_at, metadata
		FROM research_sessions WHERE session_id = ?
	`, sessionID)

	var s Session
	var isAggregated, budgetExhausted int
	err := row.Scan(
		&s.SessionID, &s.ResearchTopic, &s.ResearchType, &s.OutputDirectory,
		&s.Status, &s.CurrentPhase, &s.IterationCount, &s.Confidence,
		&isAggregated, &budgetExhausted, &s.MaxIterations, &s.ConfidenceThreshold,
		&s.LockedAt, &s.LockedBy, &s.CreatedAt, &s.UpdatedAt, &s.CompletedAt, &s.Metadata,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	s.IsAggregated = isAggregated == 1
	s.BudgetExhausted = budgetExhausted == 1

	return &s, nil
}

// UpdateSessionStatus updates status
func (sm *StateManager) UpdateSessionStatus(sessionID, status string) error {
	res, err := sm.DB.Exec(`
		UPDATE research_sessions
		SET status = ?, updated_at = CURRENT_TIMESTAMP
		WHERE session_id = ?
	`, status, sessionID)
	if err != nil {
		return fmt.Errorf("failed to update session status: %w", err)
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("session not found: %s", sessionID)
	}
	return nil
}

// ============== v4.1: State Machine Persistence ==============

// IncrementIteration atomically increments the iteration counter
func (sm *StateManager) IncrementIteration(sessionID string) (int, error) {
	res, err := sm.DB.Exec(`
		UPDATE research_sessions
		SET iteration_count = iteration_count + 1, updated_at = CURRENT_TIMESTAMP
		WHERE session_id = ?
	`, sessionID)
	if err != nil {
		return 0, fmt.Errorf("failed to increment iteration: %w", err)
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return 0, fmt.Errorf("session not found: %s", sessionID)
	}

	// Return the new count
	var count int
	err = sm.DB.QueryRow(`SELECT iteration_count FROM research_sessions WHERE session_id = ?`, sessionID).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// UpdateConfidence updates the session confidence score
func (sm *StateManager) UpdateConfidence(sessionID string, confidence float64) error {
	_, err := sm.DB.Exec(`
		UPDATE research_sessions
		SET confidence = ?, updated_at = CURRENT_TIMESTAMP
		WHERE session_id = ?
	`, confidence, sessionID)
	if err != nil {
		return fmt.Errorf("failed to update confidence: %w", err)
	}
	return nil
}

// SetAggregated marks the session as having completed aggregation
func (sm *StateManager) SetAggregated(sessionID string, aggregated bool) error {
	val := 0
	if aggregated {
		val = 1
	}
	_, err := sm.DB.Exec(`
		UPDATE research_sessions
		SET is_aggregated = ?, updated_at = CURRENT_TIMESTAMP
		WHERE session_id = ?
	`, val, sessionID)
	if err != nil {
		return fmt.Errorf("failed to set aggregated: %w", err)
	}
	return nil
}

// SetBudgetExhausted marks the session as budget exhausted
func (sm *StateManager) SetBudgetExhausted(sessionID string, exhausted bool) error {
	val := 0
	if exhausted {
		val = 1
	}
	_, err := sm.DB.Exec(`
		UPDATE research_sessions
		SET budget_exhausted = ?, updated_at = CURRENT_TIMESTAMP
		WHERE session_id = ?
	`, val, sessionID)
	if err != nil {
		return fmt.Errorf("failed to set budget exhausted: %w", err)
	}
	return nil
}

// ============== v4.1: Concurrency Control ==============

// AcquireLock tries to acquire a lock on the session
// Returns error if session is already locked by another process
func (sm *StateManager) AcquireLock(sessionID, lockerID string) error {
	// Check if already locked
	session, err := sm.GetSession(sessionID)
	if err != nil {
		return err
	}

	if session.LockedBy.Valid && session.LockedBy.String != "" && session.LockedBy.String != lockerID {
		// Check if lock is stale (older than 5 minutes)
		if session.LockedAt.Valid {
			lockedAt, err := time.Parse(time.RFC3339, session.LockedAt.String)
			if err == nil && time.Since(lockedAt) < 5*time.Minute {
				return &LockError{
					SessionID: sessionID,
					LockedBy:  session.LockedBy.String,
					LockedAt:  session.LockedAt.String,
				}
			}
			// Lock is stale, we can take it
		}
	}

	// Acquire the lock
	_, err = sm.DB.Exec(`
		UPDATE research_sessions
		SET locked_at = ?, locked_by = ?, updated_at = CURRENT_TIMESTAMP
		WHERE session_id = ?
	`, time.Now().Format(time.RFC3339), lockerID, sessionID)

	if err != nil {
		return fmt.Errorf("failed to acquire lock: %w", err)
	}

	return nil
}

// ReleaseLock releases the lock on a session
func (sm *StateManager) ReleaseLock(sessionID, lockerID string) error {
	_, err := sm.DB.Exec(`
		UPDATE research_sessions
		SET locked_at = NULL, locked_by = NULL, updated_at = CURRENT_TIMESTAMP
		WHERE session_id = ? AND (locked_by = ? OR locked_by IS NULL)
	`, sessionID, lockerID)

	if err != nil {
		return fmt.Errorf("failed to release lock: %w", err)
	}

	return nil
}

// IsLocked checks if a session is locked
func (sm *StateManager) IsLocked(sessionID string) (bool, string, error) {
	session, err := sm.GetSession(sessionID)
	if err != nil {
		return false, "", err
	}

	if session.LockedBy.Valid && session.LockedBy.String != "" {
		// Check if lock is stale
		if session.LockedAt.Valid {
			lockedAt, err := time.Parse(time.RFC3339, session.LockedAt.String)
			if err == nil && time.Since(lockedAt) < 5*time.Minute {
				return true, session.LockedBy.String, nil
			}
		}
	}

	return false, "", nil
}

// ============== Agent Management ==============

// RegisterAgent registers a new agent
func (sm *StateManager) RegisterAgent(sessionID, agentID, agentType string, role, focus string, queries []string) (*Agent, error) {
	var queriesJSON []byte
	if len(queries) > 0 {
		queriesJSON, _ = json.Marshal(queries)
	}

	_, err := sm.DB.Exec(`
		INSERT INTO research_agents
		(agent_id, session_id, agent_type, agent_role, focus_description, search_queries, status)
		VALUES (?, ?, ?, ?, ?, ?, 'deploying')
	`, agentID, sessionID, agentType, role, focus, string(queriesJSON))

	if err != nil {
		return nil, fmt.Errorf("failed to register agent: %w", err)
	}

	return sm.GetAgent(agentID)
}

// GetAgent retrieves an agent
func (sm *StateManager) GetAgent(agentID string) (*Agent, error) {
	row := sm.DB.QueryRow(`
		SELECT agent_id, session_id, agent_type, agent_role, focus_description, search_queries, status, output_file, token_usage, error_message, created_at, updated_at, completed_at
		FROM research_agents WHERE agent_id = ?
	`, agentID)
	var a Agent
	err := row.Scan(
		&a.AgentID, &a.SessionID, &a.AgentType, &a.AgentRole, &a.FocusDescription,
		&a.SearchQueries, &a.Status, &a.OutputFile, &a.TokenUsage, &a.ErrorMessage,
		&a.CreatedAt, &a.UpdatedAt, &a.CompletedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get agent: %w", err)
	}
	return &a, nil
}

// UpdateAgentStatus updates agent status
func (sm *StateManager) UpdateAgentStatus(agentID, status string, outputFile, errorMessage string) error {
	query := `
		UPDATE research_agents
		SET status = ?, updated_at = CURRENT_TIMESTAMP
	`
	args := []interface{}{status}

	if outputFile != "" {
		query += `, output_file = ?`
		args = append(args, outputFile)
	}
	if errorMessage != "" {
		query += `, error_message = ?`
		args = append(args, errorMessage)
	}
	if status == "completed" || status == "failed" {
		query += `, completed_at = CURRENT_TIMESTAMP`
	}

	query += ` WHERE agent_id = ?`
	args = append(args, agentID)

	res, err := sm.DB.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("failed to update agent status: %w", err)
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("agent not found: %s", agentID)
	}
	return nil
}

// ============== Activity Logging ==============

// LogActivity logs an event
func (sm *StateManager) LogActivity(sessionID string, phase int, eventType, message string, agentID string, details interface{}) error {
	var detailsJSON []byte
	if details != nil {
		detailsJSON, _ = json.Marshal(details)
	}
	_, err := sm.DB.Exec(`
		INSERT INTO activity_log
		(session_id, phase, event_type, message, agent_id, details)
		VALUES (?, ?, ?, ?, ?, ?)
	`, sessionID, phase, eventType, message, agentID, string(detailsJSON))
	if err != nil {
		return fmt.Errorf("failed to log activity: %w", err)
	}
	return nil
}
