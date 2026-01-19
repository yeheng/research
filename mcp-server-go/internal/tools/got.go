package tools

import (
	"encoding/json"

	"deep-research-mcp/internal/got"
	"deep-research-mcp/internal/mcp"
)

// GeneratePathsHandler handles path generation
func GeneratePathsHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	sessionID, _ := args["session_id"].(string)
	query, _ := args["query"].(string)
	k := 3
	if kv, ok := args["k"].(float64); ok {
		k = int(kv)
	}
	strategy, _ := args["strategy"].(string)
	maxDepth := 5
	if md, ok := args["max_depth"].(float64); ok {
		maxDepth = int(md)
	}

	gc := got.NewGraphController(sessionID)
	paths, err := gc.GeneratePaths(query, got.PathGenerationOptions{
		K: k, Strategy: strategy, MaxDepth: maxDepth,
	})
	if err != nil {
		return nil, err
	}

	res := map[string]interface{}{
		"success":    true,
		"session_id": gc.SessionID,
		"count":      len(paths),
		"paths":      paths,
	}
	raw, _ := json.Marshal(res)
	return &mcp.CallToolResult{Content: []mcp.Content{{Type: "text", Text: string(raw)}}}, nil
}

// RefinePathHandler handles path refinement
func RefinePathHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	sessionID, _ := args["session_id"].(string)
	pathID, _ := args["path_id"].(string)
	feedback, _ := args["feedback"].(string)
	depth := 1
	if d, ok := args["depth"].(float64); ok {
		depth = int(d)
	}

	gc := got.NewGraphController(sessionID)
	path, err := gc.RefinePath(pathID, feedback, depth)
	if err != nil {
		return nil, err
	}

	res := map[string]interface{}{
		"success":    true,
		"session_id": gc.SessionID,
		"path":       path,
	}
	raw, _ := json.Marshal(res)
	return &mcp.CallToolResult{Content: []mcp.Content{{Type: "text", Text: string(raw)}}}, nil
}

// ScoreAndPruneHandler scores and prunes paths
func ScoreAndPruneHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	sessionID, _ := args["session_id"].(string)
	keepN := 3
	if k, ok := args["keepN"].(float64); ok {
		keepN = int(k)
	}

	gc := got.NewGraphController(sessionID)
	// Need to load paths if not provided in args (usually they are in DB)
	// Controller loads state in constructor if sessionID is present.
	// So gc.Paths is populated.
	// We convert map to slice
	var paths []*got.ResearchPath
	for _, p := range gc.Paths {
		paths = append(paths, p)
	}

	scores, err := gc.ScoreAndPrune(paths, keepN)
	if err != nil {
		return nil, err
	}

	res := map[string]interface{}{
		"success": true,
		"results": scores,
	}
	raw, _ := json.Marshal(res)
	return &mcp.CallToolResult{Content: []mcp.Content{{Type: "text", Text: string(raw)}}}, nil
}

// AggregatePathsHandler aggregates paths
func AggregatePathsHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	sessionID, _ := args["session_id"].(string)
	strategy, _ := args["strategy"].(string)

	gc := got.NewGraphController(sessionID)
	var paths []*got.ResearchPath
	for _, p := range gc.Paths {
		paths = append(paths, p)
	}

	result, err := gc.AggregatePaths(paths, strategy)
	if err != nil {
		return nil, err
	}

	res := map[string]interface{}{
		"success":    true,
		"synthesis":  result.SynthesizedContent,
		"confidence": result.Confidence,
	}
	raw, _ := json.Marshal(res)
	return &mcp.CallToolResult{Content: []mcp.Content{{Type: "text", Text: string(raw)}}}, nil
}
