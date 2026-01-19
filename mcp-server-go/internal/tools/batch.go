package tools

import (
	"encoding/json"
	"sync"

	"deep-research-mcp/internal/logic"
	"deep-research-mcp/internal/mcp"
)

// BatchExtractHandler handles parallel extraction
func BatchExtractHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	items, _ := args["items"].([]interface{})
	mode, _ := args["mode"].(string)
	if mode == "" {
		mode = "all"
	}

	results := make([]interface{}, len(items))
	var wg sync.WaitGroup

	for i, item := range items {
		wg.Add(1)
		go func(i int, item interface{}) {
			defer wg.Done()

			var text string
			var sourceUrl string

			if s, ok := item.(string); ok {
				text = s
			} else if m, ok := item.(map[string]interface{}); ok {
				text, _ = m["text"].(string)
				sourceUrl, _ = m["source_url"].(string)
			}

			res := map[string]interface{}{}

			if mode == "fact" || mode == "all" {
				facts := logic.ExtractFacts(text, logic.Source{URL: sourceUrl})
				res["facts"] = facts
			}
			if mode == "entity" || mode == "all" {
				entities := logic.ExtractEntities(text)
				entityList := []logic.Entity{}
				for _, e := range entities {
					entityList = append(entityList, e)
				}
				res["entities"] = entityList
			}
			results[i] = res
		}(i, item)
	}
	wg.Wait()

	raw, _ := json.Marshal(results)
	return &mcp.CallToolResult{
		Content: []mcp.Content{{Type: "text", Text: string(raw)}},
	}, nil
}

// BatchValidateHandler handles parallel validation
func BatchValidateHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	items, _ := args["items"].([]interface{})
	mode, _ := args["mode"].(string)
	if mode == "" {
		mode = "all"
	}

	results := make([]interface{}, len(items))
	var wg sync.WaitGroup

	for i, item := range items {
		wg.Add(1)
		go func(i int, item interface{}) {
			defer wg.Done()

			m, _ := item.(map[string]interface{})
			res := map[string]interface{}{}

			if mode == "citation" || mode == "all" {
				citation := logic.Citation{
					Claim:  getString(m, "claim"),
					Author: getString(m, "author"),
					Date:   getString(m, "date"),
					Title:  getString(m, "title"),
					URL:    getString(m, "url"),
				}
				res["citation_issues"] = logic.ValidateCitation(citation, i)
			}

			if mode == "source" || mode == "all" {
				url := getString(m, "source_url")
				if url == "" {
					url = getString(m, "url")
				}
				typ := getString(m, "source_type")
				if url != "" {
					res["source_rating"] = logic.RateSource(url, typ)
				}
			}
			results[i] = res
		}(i, item)
	}
	wg.Wait()

	raw, _ := json.Marshal(results)
	return &mcp.CallToolResult{
		Content: []mcp.Content{{Type: "text", Text: string(raw)}},
	}, nil
}
