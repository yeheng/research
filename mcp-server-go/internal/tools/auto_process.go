package tools

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"deep-research-mcp/internal/logic"
	"deep-research-mcp/internal/mcp"
)

// AutoProcessDataSchema defines the input schema for auto_process_data
var AutoProcessDataSchema = map[string]interface{}{
	"type": "object",
	"properties": map[string]interface{}{
		"session_id": map[string]interface{}{
			"type":        "string",
			"description": "Session ID for the research",
		},
		"input_dir": map[string]interface{}{
			"type":        "string",
			"description": "Directory containing raw files (e.g., RESEARCH/topic/data/raw/)",
		},
		"output_dir": map[string]interface{}{
			"type":        "string",
			"description": "Directory for processed output (e.g., RESEARCH/topic/data/processed/)",
		},
		"operations": map[string]interface{}{
			"type":  "array",
			"items": map[string]interface{}{"type": "string"},
			"description": "Operations to perform: fact_extraction, entity_extraction, citation_validation, conflict_detection",
		},
	},
	"required": []string{"session_id", "input_dir", "output_dir"},
}

// AutoProcessDataHandler handles the auto_process_data tool
// This tool automates Phase 4 data processing by:
// 1. Reading all files from input_dir
// 2. Extracting facts and entities
// 3. Validating citations
// 4. Detecting conflicts
// 5. Writing results to output_dir
func AutoProcessDataHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	sessionID, _ := args["session_id"].(string)
	inputDir, _ := args["input_dir"].(string)
	outputDir, _ := args["output_dir"].(string)
	operationsRaw, _ := args["operations"].([]interface{})

	// Default operations if not specified
	operations := []string{"fact_extraction", "entity_extraction", "citation_validation", "conflict_detection"}
	if len(operationsRaw) > 0 {
		operations = make([]string, len(operationsRaw))
		for i, op := range operationsRaw {
			operations[i], _ = op.(string)
		}
	}

	// Read all markdown files from input directory
	files, err := readInputFiles(inputDir)
	if err != nil {
		return errorResult("Failed to read input files: " + err.Error()), nil
	}

	if len(files) == 0 {
		return errorResult("No files found in input directory: " + inputDir), nil
	}

	// Process files in parallel
	result := processFiles(files, operations)
	result["session_id"] = sessionID
	result["input_dir"] = inputDir
	result["output_dir"] = outputDir
	result["file_count"] = len(files)

	// Ensure output directory exists
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return errorResult("Failed to create output directory: " + err.Error()), nil
	}

	// Write output files
	if err := writeOutputFiles(outputDir, result); err != nil {
		result["write_error"] = err.Error()
	} else {
		result["output_files"] = []string{
			filepath.Join(outputDir, "fact_ledger.json"),
			filepath.Join(outputDir, "entity_graph.json"),
			filepath.Join(outputDir, "conflict_report.json"),
			filepath.Join(outputDir, "processing_summary.json"),
		}
	}

	raw, _ := json.Marshal(result)
	return &mcp.CallToolResult{
		Content: []mcp.Content{{Type: "text", Text: string(raw)}},
	}, nil
}

// FileContent represents a file and its content
type FileContent struct {
	Path    string
	Content string
}

// readInputFiles reads all .md files from the input directory
func readInputFiles(inputDir string) ([]FileContent, error) {
	var files []FileContent

	err := filepath.Walk(inputDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		// Only process markdown files
		if strings.HasSuffix(strings.ToLower(path), ".md") {
			content, err := os.ReadFile(path)
			if err != nil {
				return err
			}
			files = append(files, FileContent{
				Path:    path,
				Content: string(content),
			})
		}
		return nil
	})

	return files, err
}

// processFiles processes all files with the specified operations
func processFiles(files []FileContent, operations []string) map[string]interface{} {
	result := map[string]interface{}{
		"status": "completed",
	}

	var allFacts []logic.Fact
	var allEntities []logic.Entity
	var allRelations []logic.Relation
	var citationIssues []map[string]interface{}

	var mu sync.Mutex
	var wg sync.WaitGroup

	// Check which operations to perform
	doFactExtraction := contains(operations, "fact_extraction")
	doEntityExtraction := contains(operations, "entity_extraction")
	doCitationValidation := contains(operations, "citation_validation")
	doConflictDetection := contains(operations, "conflict_detection")

	for _, file := range files {
		wg.Add(1)
		go func(f FileContent) {
			defer wg.Done()

			// Fact extraction
			if doFactExtraction {
				facts := logic.ExtractFacts(f.Content, logic.Source{
					URL:   f.Path,
					Title: filepath.Base(f.Path),
				})
				mu.Lock()
				allFacts = append(allFacts, facts...)
				mu.Unlock()
			}

			// Entity extraction
			if doEntityExtraction {
				entities := logic.ExtractEntities(f.Content)
				entityList := []logic.Entity{}
				for _, e := range entities {
					entityList = append(entityList, e)
				}
				relations := logic.ExtractRelations(f.Content, entities)

				mu.Lock()
				allEntities = append(allEntities, entityList...)
				allRelations = append(allRelations, relations...)
				mu.Unlock()
			}

			// Citation validation (extract citations from content)
			if doCitationValidation {
				citations := extractCitationsFromContent(f.Content)
				for i, citation := range citations {
					issues := logic.ValidateCitation(citation, i)
					if len(issues) > 0 {
						mu.Lock()
						citationIssues = append(citationIssues, map[string]interface{}{
							"file":     f.Path,
							"citation": citation,
							"issues":   issues,
						})
						mu.Unlock()
					}
				}
			}
		}(file)
	}
	wg.Wait()

	result["facts"] = allFacts
	result["fact_count"] = len(allFacts)
	result["entities"] = allEntities
	result["entity_count"] = len(allEntities)
	result["relations"] = allRelations
	result["relation_count"] = len(allRelations)
	result["citation_issues"] = citationIssues
	result["citation_issue_count"] = len(citationIssues)

	// Conflict detection
	if doConflictDetection && len(allFacts) > 0 {
		conflicts := detectConflicts(allFacts)
		result["conflicts"] = conflicts
		result["conflict_count"] = len(conflicts)
	} else {
		result["conflicts"] = []interface{}{}
		result["conflict_count"] = 0
	}

	return result
}

// extractCitationsFromContent extracts citation-like patterns from content
func extractCitationsFromContent(content string) []logic.Citation {
	var citations []logic.Citation

	// Simple pattern matching for common citation formats
	// This is a simplified version - in production, use regex or proper parsing
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		// Look for lines that might be citations (contains URL or reference markers)
		if strings.Contains(line, "http://") || strings.Contains(line, "https://") {
			// Extract URL
			parts := strings.Fields(line)
			for _, part := range parts {
				if strings.HasPrefix(part, "http://") || strings.HasPrefix(part, "https://") {
					url := strings.Trim(part, "()[]<>,")
					citations = append(citations, logic.Citation{
						URL: url,
					})
				}
			}
		}
	}

	return citations
}

// detectConflicts detects conflicting facts
func detectConflicts(facts []logic.Fact) []map[string]interface{} {
	var conflicts []map[string]interface{}

	// Simple conflict detection based on overlapping content with different values
	// This is a simplified implementation
	for i := 0; i < len(facts); i++ {
		for j := i + 1; j < len(facts); j++ {
			// Check if facts discuss similar topics but have different claims
			if factsConflict(facts[i], facts[j]) {
				conflicts = append(conflicts, map[string]interface{}{
					"fact1":       facts[i],
					"fact2":       facts[j],
					"type":        "potential_contradiction",
					"confidence":  0.5,
					"description": "These facts may contain contradictory information",
				})
			}
		}
	}

	return conflicts
}

// factsConflict checks if two facts potentially conflict
func factsConflict(f1, f2 logic.Fact) bool {
	// Simple heuristic: if facts have the same entity but different values
	// This is a simplified check
	if f1.Entity == "" || f2.Entity == "" {
		return false
	}

	// If same entity and attribute but different values, it's a conflict
	if f1.Entity == f2.Entity && f1.Attribute == f2.Attribute && f1.Value != f2.Value {
		return true
	}

	// Check for similar entities with different values
	content1 := strings.ToLower(f1.Entity + " " + f1.Value)
	content2 := strings.ToLower(f2.Entity + " " + f2.Value)

	words1 := strings.Fields(content1)
	words2 := strings.Fields(content2)

	commonWords := 0
	for _, w1 := range words1 {
		for _, w2 := range words2 {
			if w1 == w2 && len(w1) > 3 {
				commonWords++
			}
		}
	}

	// If many common words but different sources, it might be a conflict
	minWords := min(len(words1), len(words2))
	if minWords > 0 && float64(commonWords)/float64(minWords) > 0.5 && f1.Source.URL != f2.Source.URL {
		return true
	}

	return false
}

// writeOutputFiles writes processing results to output files
func writeOutputFiles(outputDir string, result map[string]interface{}) error {
	// Write fact ledger
	if facts, ok := result["facts"]; ok {
		data, _ := json.MarshalIndent(map[string]interface{}{
			"facts":      facts,
			"fact_count": result["fact_count"],
		}, "", "  ")
		if err := os.WriteFile(filepath.Join(outputDir, "fact_ledger.json"), data, 0644); err != nil {
			return err
		}
	}

	// Write entity graph
	if entities, ok := result["entities"]; ok {
		data, _ := json.MarshalIndent(map[string]interface{}{
			"entities":       entities,
			"relations":      result["relations"],
			"entity_count":   result["entity_count"],
			"relation_count": result["relation_count"],
		}, "", "  ")
		if err := os.WriteFile(filepath.Join(outputDir, "entity_graph.json"), data, 0644); err != nil {
			return err
		}
	}

	// Write conflict report
	if conflicts, ok := result["conflicts"]; ok {
		data, _ := json.MarshalIndent(map[string]interface{}{
			"conflicts":      conflicts,
			"conflict_count": result["conflict_count"],
		}, "", "  ")
		if err := os.WriteFile(filepath.Join(outputDir, "conflict_report.json"), data, 0644); err != nil {
			return err
		}
	}

	// Write processing summary
	summary := map[string]interface{}{
		"session_id":           result["session_id"],
		"input_dir":            result["input_dir"],
		"output_dir":           result["output_dir"],
		"file_count":           result["file_count"],
		"fact_count":           result["fact_count"],
		"entity_count":         result["entity_count"],
		"relation_count":       result["relation_count"],
		"conflict_count":       result["conflict_count"],
		"citation_issue_count": result["citation_issue_count"],
		"status":               result["status"],
	}
	data, _ := json.MarshalIndent(summary, "", "  ")
	return os.WriteFile(filepath.Join(outputDir, "processing_summary.json"), data, 0644)
}

// contains checks if a string is in a slice
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// errorResult creates an error result
func errorResult(msg string) *mcp.CallToolResult {
	result := map[string]interface{}{
		"status": "error",
		"error":  msg,
	}
	raw, _ := json.Marshal(result)
	return &mcp.CallToolResult{
		Content: []mcp.Content{{Type: "text", Text: string(raw)}},
	}
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
