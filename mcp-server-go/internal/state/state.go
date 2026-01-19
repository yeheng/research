package state

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"deep-research-mcp/internal/db"
	"github.com/google/uuid"
)

type Session struct {
	SessionID       string         `json:"session_id"`
	ResearchTopic   string         `json:"research_topic"`
	ResearchType    string         `json:"research_type"`
	OutputDirectory string         `json:"output_directory"`
	Status          string         `json:"status"`
	CurrentPhase    int            `json:"current_phase"`
	CreatedAt       string         `json:"created_at"`
	UpdatedAt       string         `json:"updated_at"`
	CompletedAt     sql.NullString `json:"completed_at,omitempty"`
	Metadata        sql.NullString `json:"metadata,omitempty"`
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

type StateManager struct {
	DB *sql.DB
}

func NewStateManager() *StateManager {
	return &StateManager{DB: db.DB}
}

// CreateSession creates a new session
func (sm *StateManager) CreateSession(topic, outputDir, researchType string) (*Session, error) {
	sessionID := uuid.New().String()
	if researchType == "" {
		researchType = "deep"
	}

	_, err := sm.DB.Exec(`
		INSERT INTO research_sessions
		(session_id, research_topic, research_type, output_directory, status, current_phase)
		VALUES (?, ?, ?, ?, 'initializing', 0)
	`, sessionID, topic, researchType, outputDir)

	if err != nil {
		return nil, err
	}

	return sm.GetSession(sessionID)
}

// GetSession retrieves a session
func (sm *StateManager) GetSession(sessionID string) (*Session, error) {
	row := sm.DB.QueryRow(`
		SELECT session_id, research_topic, research_type, output_directory, status, current_phase, created_at, updated_at, completed_at, metadata
		FROM research_sessions WHERE session_id = ?
	`, sessionID)
	var s Session
	err := row.Scan(
		&s.SessionID, &s.ResearchTopic, &s.ResearchType, &s.OutputDirectory,
		&s.Status, &s.CurrentPhase, &s.CreatedAt, &s.UpdatedAt, &s.CompletedAt, &s.Metadata,
	)
	if err != nil {
		return nil, err
	}
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
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("session not found")
	}
	return nil
}

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
		return nil, err
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
		return nil, err
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
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("agent not found")
	}
	return nil
}

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
	return err
}
