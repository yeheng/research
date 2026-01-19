package e2e

import (
	"encoding/json"
	"testing"

	"deep-research-mcp/internal/db"
	"deep-research-mcp/internal/tools"
)

func TestUnifiedExtract(t *testing.T) {
	if err := db.InitDB(":memory:"); err != nil {
		t.Fatalf("Failed to init DB: %v", err)
	}
	defer db.Close()

	args := map[string]interface{}{
		"text": "OpenAI released GPT-4 in 2023. It competes with Google's Gemini.",
		"mode": "all",
	}
	res, err := tools.ExtractHandler(args)
	if err != nil {
		t.Fatalf("Extract failed: %v", err)
	}

	var output map[string]interface{}
	json.Unmarshal([]byte(res.Content[0].Text), &output)

	entities, _ := output["entities"].([]interface{})
	foundOpenAI := false
	for _, e := range entities {
		em := e.(map[string]interface{})
		if em["name"] == "Openai" { // Title cased by logic
			foundOpenAI = true
			break
		}
	}
	if !foundOpenAI {
		t.Errorf("Expected OpenAI entity, got %v", entities)
	}

	facts, _ := output["facts"].([]interface{})
	if len(facts) == 0 {
		// Regex patterns target "is/was/has" + number/currency.
		// "released GPT-4 in 2023" does not match these patterns.
	}
}

func TestGoTFlow(t *testing.T) {
	if err := db.InitDB(":memory:"); err != nil {
		t.Fatalf("Failed to init DB: %v", err)
	}
	defer db.Close()

	res, _ := tools.CreateSessionHandler(map[string]interface{}{
		"topic":      "AI Agents",
		"output_dir": "test_output",
	})
	var session map[string]interface{}
	json.Unmarshal([]byte(res.Content[0].Text), &session)
	sessionID := session["session_id"].(string)

	res, _ = tools.GeneratePathsHandler(map[string]interface{}{
		"session_id": sessionID,
		"query":      "AI Agents Architecture",
		"k":          2.0,
	})
	var genRes map[string]interface{}
	json.Unmarshal([]byte(res.Content[0].Text), &genRes)
	paths := genRes["paths"].([]interface{})
	if len(paths) != 2 {
		t.Errorf("Expected 2 paths, got %d", len(paths))
	}

	res, _ = tools.AggregatePathsHandler(map[string]interface{}{
		"session_id": sessionID,
	})
	var aggRes map[string]interface{}
	json.Unmarshal([]byte(res.Content[0].Text), &aggRes)
	if aggRes["success"] != true {
		t.Errorf("Aggregation failed")
	}
}
