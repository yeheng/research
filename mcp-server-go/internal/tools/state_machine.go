package tools

import (
	"encoding/json"

	"deep-research-mcp/internal/got"
	"deep-research-mcp/internal/mcp"
	"deep-research-mcp/internal/statemachine"
)

// GetNextActionHandler determines next action
func GetNextActionHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	sessionID, _ := args["session_id"].(string)

	gc := got.NewGraphController(sessionID)

	state := got.GraphState{
		SessionID: sessionID,
		Paths:     []got.ResearchPath{},
	}
	for _, p := range gc.Paths {
		state.Paths = append(state.Paths, *p)
	}

	sm := statemachine.NewResearchStateMachine(10, 0.9)
	action := sm.GetNextAction(state)

	raw, _ := json.Marshal(action)
	return &mcp.CallToolResult{Content: []mcp.Content{{Type: "text", Text: string(raw)}}}, nil
}
