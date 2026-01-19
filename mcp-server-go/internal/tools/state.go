package tools

import (
	"encoding/json"

	"deep-research-mcp/internal/mcp"
	"deep-research-mcp/internal/state"
)

// CreateSessionHandler creates a new research session
func CreateSessionHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	topic, _ := args["topic"].(string)
	outputDir, _ := args["output_dir"].(string)
	researchType, _ := args["research_type"].(string)

	sm := state.NewStateManager()
	session, err := sm.CreateSession(topic, outputDir, researchType)
	if err != nil {
		return nil, err
	}

	raw, _ := json.Marshal(session)
	return &mcp.CallToolResult{
		Content: []mcp.Content{
			{Type: "text", Text: string(raw)},
		},
	}, nil
}

// UpdateSessionStatusHandler updates session status
func UpdateSessionStatusHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	sessionID, _ := args["session_id"].(string)
	status, _ := args["status"].(string)

	sm := state.NewStateManager()
	if err := sm.UpdateSessionStatus(sessionID, status); err != nil {
		return nil, err
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			{Type: "text", Text: `{"success": true, "status": "` + status + `"}`},
		},
	}, nil
}

// GetSessionInfoHandler retrieves session info
func GetSessionInfoHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	sessionID, _ := args["session_id"].(string)

	sm := state.NewStateManager()
	session, err := sm.GetSession(sessionID)
	if err != nil {
		return nil, err
	}

	raw, _ := json.Marshal(session)
	return &mcp.CallToolResult{
		Content: []mcp.Content{
			{Type: "text", Text: string(raw)},
		},
	}, nil
}

// RegisterAgentHandler registers a new agent
func RegisterAgentHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	sessionID, _ := args["session_id"].(string)
	agentID, _ := args["agent_id"].(string)
	agentType, _ := args["agent_type"].(string)

	// Optional args
	options, _ := args["options"].(map[string]interface{})
	var role, focus string
	var queries []string

	if options != nil {
		role, _ = options["agent_role"].(string)
		focus, _ = options["focus_description"].(string)
		if q, ok := options["search_queries"].([]interface{}); ok {
			for _, v := range q {
				if s, ok := v.(string); ok {
					queries = append(queries, s)
				}
			}
		}
	}

	sm := state.NewStateManager()
	agent, err := sm.RegisterAgent(sessionID, agentID, agentType, role, focus, queries)
	if err != nil {
		return nil, err
	}

	raw, _ := json.Marshal(agent)
	return &mcp.CallToolResult{
		Content: []mcp.Content{
			{Type: "text", Text: string(raw)},
		},
	}, nil
}

// UpdateAgentStatusHandler updates agent status
func UpdateAgentStatusHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	agentID, _ := args["agent_id"].(string)
	status, _ := args["status"].(string)

	options, _ := args["options"].(map[string]interface{})
	var outputFile, errorMessage string

	if options != nil {
		outputFile, _ = options["output_file"].(string)
		errorMessage, _ = options["error_message"].(string)
	}

	sm := state.NewStateManager()
	if err := sm.UpdateAgentStatus(agentID, status, outputFile, errorMessage); err != nil {
		return nil, err
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			{Type: "text", Text: `{"success": true, "status": "` + status + `"}`},
		},
	}, nil
}
