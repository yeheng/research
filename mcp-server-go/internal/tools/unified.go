package tools

import (
	"encoding/json"

	"deep-research-mcp/internal/logic"
	"deep-research-mcp/internal/mcp"
)

// ExtractHandler handles unified extraction
func ExtractHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	text, _ := args["text"].(string)
	mode, _ := args["mode"].(string)
	if mode == "" {
		mode = "all"
	}

	sourceUrl, _ := args["source_url"].(string)
	sourceMeta, _ := args["source_metadata"].(map[string]interface{})

	result := map[string]interface{}{
		"metadata": map[string]interface{}{"mode": mode},
	}

	if mode == "fact" || mode == "all" {
		facts := logic.ExtractFacts(text, logic.Source{
			URL:     sourceUrl,
			Title:   getString(sourceMeta, "title"),
			Author:  getString(sourceMeta, "author"),
			Date:    getString(sourceMeta, "date"),
			Quality: getString(sourceMeta, "quality"),
		})
		result["facts"] = facts
	}

	if mode == "entity" || mode == "all" {
		entities := logic.ExtractEntities(text)
		entityList := []logic.Entity{}
		for _, e := range entities {
			entityList = append(entityList, e)
		}
		result["entities"] = entityList

		relations := logic.ExtractRelations(text, entities)
		result["edges"] = relations
	}

	raw, _ := json.Marshal(result)
	return &mcp.CallToolResult{
		Content: []mcp.Content{{Type: "text", Text: string(raw)}},
	}, nil
}

// ValidateHandler handles unified validation
func ValidateHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	mode, _ := args["mode"].(string)
	if mode == "" {
		mode = "all"
	}

	result := map[string]interface{}{
		"metadata": map[string]interface{}{"mode": mode},
	}

	// Citation validation
	if mode == "citation" || mode == "all" {
		if citationsRaw, ok := args["citations"].([]interface{}); ok {
			var validationResults []map[string]interface{}
			for i, cRaw := range citationsRaw {
				cMap, _ := cRaw.(map[string]interface{})
				citation := logic.Citation{
					Claim:  getString(cMap, "claim"),
					Author: getString(cMap, "author"),
					Date:   getString(cMap, "date"),
					Title:  getString(cMap, "title"),
					URL:    getString(cMap, "url"),
				}
				issues := logic.ValidateCitation(citation, i)

				validationResults = append(validationResults, map[string]interface{}{
					"citation": citation,
					"issues":   issues,
				})
			}
			result["citation_validation"] = validationResults
		}
	}

	// Source rating
	if mode == "source" || mode == "all" {
		sourceUrl, _ := args["source_url"].(string)
		sourceType, _ := args["source_type"].(string)
		if sourceUrl != "" {
			result["source_rating"] = logic.RateSource(sourceUrl, sourceType)
		}
	}

	raw, _ := json.Marshal(result)
	return &mcp.CallToolResult{
		Content: []mcp.Content{{Type: "text", Text: string(raw)}},
	}, nil
}

// ConflictDetectHandler detects conflicts between facts
func ConflictDetectHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	factsRaw, ok := args["facts"].([]interface{})
	if !ok || len(factsRaw) == 0 {
		return &mcp.CallToolResult{
			Content: []mcp.Content{{Type: "text", Text: `{"conflicts": [], "fact_count": 0}`}},
		}, nil
	}

	// Parse tolerance settings
	tolerance := logic.DefaultTolerance()
	if toleranceRaw, ok := args["tolerance"].(map[string]interface{}); ok {
		if numTol, ok := toleranceRaw["numeric_tolerance"].(float64); ok {
			tolerance.NumericTolerance = numTol
		}
		if dateTol, ok := toleranceRaw["date_tolerance_days"].(float64); ok {
			tolerance.DateToleranceDays = int(dateTol)
		}
		if ignoreLow, ok := toleranceRaw["ignore_low_confidence"].(bool); ok {
			tolerance.IgnoreLowConfidence = ignoreLow
		}
	}

	// Convert facts from interface{} to logic.Fact
	var facts []logic.Fact
	for _, fRaw := range factsRaw {
		fMap, ok := fRaw.(map[string]interface{})
		if !ok {
			continue
		}

		fact := logic.Fact{
			Entity:     getString(fMap, "entity"),
			Attribute:  getString(fMap, "attribute"),
			Value:      getString(fMap, "value"),
			ValueType:  getString(fMap, "value_type"),
			Confidence: getString(fMap, "confidence"),
		}

		// Parse source if present
		if sourceRaw, ok := fMap["source"].(map[string]interface{}); ok {
			fact.Source = logic.Source{
				URL:     getString(sourceRaw, "url"),
				Title:   getString(sourceRaw, "title"),
				Author:  getString(sourceRaw, "author"),
				Date:    getString(sourceRaw, "date"),
				Quality: getString(sourceRaw, "quality"),
			}
		}

		facts = append(facts, fact)
	}

	// Detect conflicts
	conflicts := logic.DetectConflicts(facts, tolerance)

	// Build result
	result := map[string]interface{}{
		"conflicts":      conflicts,
		"conflict_count": len(conflicts),
		"fact_count":     len(facts),
		"severity_breakdown": map[string]int{
			"high":   countBySeverity(conflicts, "high"),
			"medium": countBySeverity(conflicts, "medium"),
			"low":    countBySeverity(conflicts, "low"),
		},
	}

	raw, _ := json.Marshal(result)
	return &mcp.CallToolResult{
		Content: []mcp.Content{{Type: "text", Text: string(raw)}},
	}, nil
}

// countBySeverity counts conflicts by severity
func countBySeverity(conflicts []logic.Conflict, severity string) int {
	count := 0
	for _, c := range conflicts {
		if string(c.Severity) == severity {
			count++
		}
	}
	return count
}

func getString(m map[string]interface{}, k string) string {
	if m == nil {
		return ""
	}
	if v, ok := m[k].(string); ok {
		return v
	}
	return ""
}
