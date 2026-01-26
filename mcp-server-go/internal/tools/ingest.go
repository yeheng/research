package tools

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"deep-research-mcp/internal/logic"
	"deep-research-mcp/internal/mcp"
)

// IngestContentSchema defines the input schema for ingest_content
var IngestContentSchema = map[string]interface{}{
	"type": "object",
	"properties": map[string]interface{}{
		"session_id": map[string]interface{}{
			"type":        "string",
			"description": "Session ID for the research",
		},
		"url": map[string]interface{}{
			"type":        "string",
			"description": "Source URL of the content",
		},
		"content": map[string]interface{}{
			"type":        "string",
			"description": "Raw content (HTML or text) to ingest",
		},
		"content_type": map[string]interface{}{
			"type":        "string",
			"enum":        []string{"html", "markdown", "text"},
			"description": "Type of content (default: auto-detect)",
		},
		"title": map[string]interface{}{
			"type":        "string",
			"description": "Title of the content (optional, will extract from HTML if not provided)",
		},
		"output_dir": map[string]interface{}{
			"type":        "string",
			"description": "Output directory for raw files (e.g., RESEARCH/topic/data/raw/)",
		},
		"metadata": map[string]interface{}{
			"type":        "object",
			"description": "Additional metadata (author, date, etc.)",
		},
		"deduplicate": map[string]interface{}{
			"type":        "boolean",
			"description": "Check for duplicate content before saving (default: true)",
		},
	},
	"required": []string{"content", "output_dir"},
}

// IngestedContent represents the result of ingesting content
type IngestedContent struct {
	FilePath    string                 `json:"file_path"`
	URL         string                 `json:"url,omitempty"`
	Title       string                 `json:"title"`
	ContentType string                 `json:"content_type"`
	Tokens      int                    `json:"tokens"`
	IsDuplicate bool                   `json:"is_duplicate"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt   string                 `json:"created_at"`
}

// IngestContentHandler handles the ingest_content tool
// This tool:
// 1. Receives raw content (HTML, markdown, or text) from web search/fetch
// 2. Cleans and processes the content
// 3. Extracts metadata
// 4. Saves to raw/ directory with proper structure
// 5. Returns file path and metadata for later processing
func IngestContentHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	// Extract arguments
	sessionID, _ := args["session_id"].(string)
	url, _ := args["url"].(string)
	content, _ := args["content"].(string)
	contentType, _ := args["content_type"].(string)
	title, _ := args["title"].(string)
	outputDir, _ := args["output_dir"].(string)
	metadataRaw, _ := args["metadata"].(map[string]interface{})
	deduplicate := true
	if d, ok := args["deduplicate"].(bool); ok {
		deduplicate = d
	}

	// Validate required fields
	if content == "" {
		return errorResult("content is required"), nil
	}
	if outputDir == "" {
		return errorResult("output_dir is required"), nil
	}

	// Auto-detect content type if not specified
	if contentType == "" {
		contentType = detectContentType(content)
	}

	// Process content based on type
	var processedContent string
	var metadata logic.DocumentMetadata

	switch contentType {
	case "html":
		// Extract metadata from HTML
		metadata = logic.ExtractMetadata(content)
		if title != "" {
			metadata.Title = title
		}

		// Clean HTML and convert to Markdown
		cleaned, err := logic.CleanHtml(content, logic.CleanHtmlOptions{
			PreserveTables: true,
			RemoveAds:      true,
			UseReadability: true,
		})
		if err != nil {
			// Fallback to raw content if cleaning fails
			processedContent = content
		} else {
			processedContent = cleaned
		}

	case "markdown":
		processedContent = content
		metadata.Title = title
		// Try to extract title from markdown if not provided
		if metadata.Title == "" {
			metadata.Title = extractTitleFromMarkdown(content)
		}

	case "text":
		processedContent = content
		metadata.Title = title
	}

	// Clean text
	processedContent = logic.CleanText(processedContent)

	// Check for duplicates if enabled
	if deduplicate {
		existingFiles, _ := filepath.Glob(filepath.Join(outputDir, "*.md"))
		var existingContents []string
		for _, f := range existingFiles {
			if c, err := os.ReadFile(f); err == nil {
				existingContents = append(existingContents, string(c))
			}
		}

		if logic.IsDuplicateContent(processedContent, existingContents, 0.8) {
			result := IngestedContent{
				URL:         url,
				Title:       metadata.Title,
				ContentType: contentType,
				Tokens:      logic.CountTokens(processedContent),
				IsDuplicate: true,
				CreatedAt:   time.Now().Format(time.RFC3339),
			}
			raw, _ := json.Marshal(map[string]interface{}{
				"status":  "skipped",
				"reason":  "duplicate_content",
				"result":  result,
			})
			return &mcp.CallToolResult{
				Content: []mcp.Content{{Type: "text", Text: string(raw)}},
			}, nil
		}
	}

	// Ensure output directory exists
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return errorResult("Failed to create output directory: " + err.Error()), nil
	}

	// Generate filename
	filename := generateFilename(url, metadata.Title, sessionID)
	filePath := filepath.Join(outputDir, filename)

	// Build markdown file with frontmatter
	var fileContent strings.Builder
	fileContent.WriteString("---\n")
	fileContent.WriteString(fmt.Sprintf("title: %q\n", metadata.Title))
	if url != "" {
		fileContent.WriteString(fmt.Sprintf("url: %s\n", url))
	}
	if metadata.Author != "" {
		fileContent.WriteString(fmt.Sprintf("author: %s\n", metadata.Author))
	}
	if metadata.Date != "" {
		fileContent.WriteString(fmt.Sprintf("date: %s\n", metadata.Date))
	}
	fileContent.WriteString(fmt.Sprintf("content_type: %s\n", contentType))
	fileContent.WriteString(fmt.Sprintf("ingested_at: %s\n", time.Now().Format(time.RFC3339)))
	if sessionID != "" {
		fileContent.WriteString(fmt.Sprintf("session_id: %s\n", sessionID))
	}
	// Add custom metadata
	for k, v := range metadataRaw {
		fileContent.WriteString(fmt.Sprintf("%s: %v\n", k, v))
	}
	fileContent.WriteString("---\n\n")

	// Add title as H1 if available
	if metadata.Title != "" {
		fileContent.WriteString(fmt.Sprintf("# %s\n\n", metadata.Title))
	}

	// Add source URL
	if url != "" {
		fileContent.WriteString(fmt.Sprintf("**Source:** [%s](%s)\n\n", url, url))
	}

	// Add content
	fileContent.WriteString(processedContent)

	// Write file
	if err := os.WriteFile(filePath, []byte(fileContent.String()), 0644); err != nil {
		return errorResult("Failed to write file: " + err.Error()), nil
	}

	// Build result
	tokens := logic.CountTokens(processedContent)
	result := IngestedContent{
		FilePath:    filePath,
		URL:         url,
		Title:       metadata.Title,
		ContentType: contentType,
		Tokens:      tokens,
		IsDuplicate: false,
		Metadata: map[string]interface{}{
			"author":      metadata.Author,
			"date":        metadata.Date,
			"description": metadata.Description,
		},
		CreatedAt: time.Now().Format(time.RFC3339),
	}

	raw, _ := json.Marshal(map[string]interface{}{
		"status": "success",
		"result": result,
	})
	return &mcp.CallToolResult{
		Content: []mcp.Content{{Type: "text", Text: string(raw)}},
	}, nil
}

// detectContentType auto-detects the content type
func detectContentType(content string) string {
	trimmed := strings.TrimSpace(content)

	// Check for HTML
	if strings.HasPrefix(strings.ToLower(trimmed), "<!doctype") ||
		strings.HasPrefix(strings.ToLower(trimmed), "<html") ||
		strings.Contains(trimmed[:min(500, len(trimmed))], "<head") ||
		strings.Contains(trimmed[:min(500, len(trimmed))], "<body") {
		return "html"
	}

	// Check for markdown indicators
	if strings.HasPrefix(trimmed, "#") ||
		strings.Contains(trimmed, "```") ||
		strings.Contains(trimmed, "**") ||
		strings.Contains(trimmed, "- [") ||
		strings.Contains(trimmed, "](") {
		return "markdown"
	}

	return "text"
}

// extractTitleFromMarkdown extracts the first H1 from markdown
func extractTitleFromMarkdown(content string) string {
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "# ") {
			return strings.TrimPrefix(line, "# ")
		}
	}
	return ""
}

// generateFilename generates a unique filename for the ingested content
func generateFilename(url, title, _ string) string {
	// Base name from title or URL
	baseName := ""
	if title != "" {
		baseName = sanitizeFilename(title)
	} else if url != "" {
		baseName = sanitizeFilename(url)
	} else {
		baseName = "content"
	}

	// Truncate if too long
	if len(baseName) > 50 {
		baseName = baseName[:50]
	}

	// Add hash for uniqueness
	hashInput := url + title + time.Now().String()
	hash := fmt.Sprintf("%x", md5.Sum([]byte(hashInput)))[:8]

	return fmt.Sprintf("%s_%s.md", baseName, hash)
}

// sanitizeFilename removes invalid characters from filename
func sanitizeFilename(name string) string {
	// Replace invalid characters
	replacer := strings.NewReplacer(
		"/", "_",
		"\\", "_",
		":", "_",
		"*", "_",
		"?", "_",
		"\"", "_",
		"<", "_",
		">", "_",
		"|", "_",
		" ", "_",
		".", "_",
		"https_", "",
		"http_", "",
		"www_", "",
	)
	name = replacer.Replace(name)

	// Remove consecutive underscores
	for strings.Contains(name, "__") {
		name = strings.ReplaceAll(name, "__", "_")
	}

	return strings.Trim(name, "_")
}

// BatchIngestSchema defines the input schema for batch_ingest
var BatchIngestSchema = map[string]interface{}{
	"type": "object",
	"properties": map[string]interface{}{
		"session_id": map[string]interface{}{
			"type":        "string",
			"description": "Session ID for the research",
		},
		"items": map[string]interface{}{
			"type": "array",
			"items": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"url":          map[string]interface{}{"type": "string"},
					"content":      map[string]interface{}{"type": "string"},
					"content_type": map[string]interface{}{"type": "string"},
					"title":        map[string]interface{}{"type": "string"},
					"metadata":     map[string]interface{}{"type": "object"},
				},
				"required": []string{"content"},
			},
			"description": "Array of content items to ingest",
		},
		"output_dir": map[string]interface{}{
			"type":        "string",
			"description": "Output directory for raw files",
		},
		"deduplicate": map[string]interface{}{
			"type":        "boolean",
			"description": "Check for duplicate content (default: true)",
		},
	},
	"required": []string{"items", "output_dir"},
}

// BatchIngestHandler handles batch ingestion of multiple content items
func BatchIngestHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	sessionID, _ := args["session_id"].(string)
	itemsRaw, _ := args["items"].([]interface{})
	outputDir, _ := args["output_dir"].(string)
	deduplicate := true
	if d, ok := args["deduplicate"].(bool); ok {
		deduplicate = d
	}

	if len(itemsRaw) == 0 {
		return errorResult("items array is required and cannot be empty"), nil
	}
	if outputDir == "" {
		return errorResult("output_dir is required"), nil
	}

	var results []IngestedContent
	var errors []string
	successCount := 0
	skipCount := 0

	for i, itemRaw := range itemsRaw {
		item, ok := itemRaw.(map[string]interface{})
		if !ok {
			errors = append(errors, fmt.Sprintf("item %d: invalid format", i))
			continue
		}

		// Build args for single ingest
		ingestArgs := map[string]interface{}{
			"session_id":  sessionID,
			"url":         item["url"],
			"content":     item["content"],
			"content_type": item["content_type"],
			"title":       item["title"],
			"output_dir":  outputDir,
			"metadata":    item["metadata"],
			"deduplicate": deduplicate,
		}

		// Call single ingest handler
		result, err := IngestContentHandler(ingestArgs)
		if err != nil {
			errors = append(errors, fmt.Sprintf("item %d: %v", i, err))
			continue
		}

		// Parse result
		var parsed map[string]interface{}
		if len(result.Content) > 0 {
			json.Unmarshal([]byte(result.Content[0].Text), &parsed)
		}

		status, _ := parsed["status"].(string)
		if status == "success" {
			successCount++
			if resultData, ok := parsed["result"].(map[string]interface{}); ok {
				resultJSON, _ := json.Marshal(resultData)
				var ingested IngestedContent
				json.Unmarshal(resultJSON, &ingested)
				results = append(results, ingested)
			}
		} else if status == "skipped" {
			skipCount++
		} else {
			errors = append(errors, fmt.Sprintf("item %d: %v", i, parsed["error"]))
		}
	}

	raw, _ := json.Marshal(map[string]interface{}{
		"status":        "completed",
		"total":         len(itemsRaw),
		"success_count": successCount,
		"skip_count":    skipCount,
		"error_count":   len(errors),
		"results":       results,
		"errors":        errors,
	})

	return &mcp.CallToolResult{
		Content: []mcp.Content{{Type: "text", Text: string(raw)}},
	}, nil
}
