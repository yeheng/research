package tools

import (
	"encoding/json"
	"fmt"

	"deep-research-mcp/internal/got"
	"deep-research-mcp/internal/mcp"
	"deep-research-mcp/internal/state"
	"deep-research-mcp/internal/statemachine"
	"github.com/google/uuid"
)

// GetNextActionHandler determines next action with proper state persistence and locking
func GetNextActionHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	sessionID, _ := args["session_id"].(string)
	if sessionID == "" {
		return errorResult("session_id is required"), nil
	}

	sm := state.NewStateManager()
	lockerID := uuid.New().String()

	// Try to acquire lock
	if err := sm.AcquireLock(sessionID, lockerID); err != nil {
		if lockErr, ok := err.(*state.LockError); ok {
			return &mcp.CallToolResult{
				Content: []mcp.Content{{
					Type: "text",
					Text: fmt.Sprintf(`{"error": "session_locked", "locked_by": "%s", "locked_at": "%s", "retry_after_seconds": 30}`,
						lockErr.LockedBy, lockErr.LockedAt),
				}},
			}, nil
		}
		return nil, fmt.Errorf("failed to acquire lock: %w", err)
	}

	// Ensure lock is released when done
	defer sm.ReleaseLock(sessionID, lockerID)

	// Load session from database
	session, err := sm.GetSession(sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	// Increment iteration counter FIRST (persisted to DB)
	newIteration, err := sm.IncrementIteration(sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to increment iteration: %w", err)
	}

	// Load graph controller
	gc := got.NewGraphController(sessionID)

	// Build graph state from database and controller
	graphState := got.GraphState{
		SessionID:       sessionID,
		Paths:           []got.ResearchPath{},
		Iteration:       newIteration,
		Confidence:      session.Confidence,
		Aggregated:      session.IsAggregated,
		BudgetExhausted: session.BudgetExhausted,
		CurrentFindings: "", // Could be loaded from latest aggregation
	}

	// Convert paths from controller
	for _, p := range gc.Paths {
		graphState.Paths = append(graphState.Paths, *p)
	}

	// Create state machine with session-specific settings
	machine := statemachine.NewResearchStateMachine(
		session.MaxIterations,
		session.ConfidenceThreshold,
	)

	// Get next action
	action := machine.GetNextAction(graphState)

	// If action changes confidence, persist it
	if action.Action == "aggregate" || action.Action == "score" {
		// Confidence will be updated by subsequent tool calls
	}

	// Log the action
	sm.LogActivity(sessionID, session.CurrentPhase, "info",
		fmt.Sprintf("GetNextAction: %s (iteration %d/%d)", action.Action, newIteration, session.MaxIterations),
		"", map[string]interface{}{
			"action":    action.Action,
			"params":    action.Params,
			"reasoning": action.Reasoning,
		})

	// Build response
	response := map[string]interface{}{
		"action":     action.Action,
		"params":     action.Params,
		"reasoning":  action.Reasoning,
		"iteration":  newIteration,
		"confidence": session.Confidence,
		"state": map[string]interface{}{
			"is_aggregated":     session.IsAggregated,
			"budget_exhausted":  session.BudgetExhausted,
			"max_iterations":    session.MaxIterations,
			"path_count":        len(graphState.Paths),
		},
	}

	raw, _ := json.Marshal(response)
	return &mcp.CallToolResult{Content: []mcp.Content{{Type: "text", Text: string(raw)}}}, nil
}
