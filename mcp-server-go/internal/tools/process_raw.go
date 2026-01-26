package tools

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"deep-research-mcp/internal/logic"
	"deep-research-mcp/internal/mcp"
)

// ProcessRawSchema defines the input schema for process_raw
var ProcessRawSchema = map[string]interface{}{
	"type": "object",
	"properties": map[string]interface{}{
		"session_id": map[string]interface{}{
			"type":        "string",
			"description": "Session ID for the research",
		},
		"input_path": map[string]interface{}{
			"type":        "string",
			"description": "Path to single raw file or directory containing raw files",
		},
		"output_dir": map[string]interface{}{
			"type":        "string",
			"description": "Output directory for processed files (e.g., RESEARCH/topic/data/processed/)",
		},
		"operations": map[string]interface{}{
			"type":  "array",
			"items": map[string]interface{}{"type": "string"},
			"description": "Operations: summarize, extract_facts, extract_entities, extract_keywords (default: all)",
		},
		"options": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"max_paragraphs": map[string]interface{}{
					"type":        "number",
					"description": "Maximum key paragraphs to extract (default: 10)",
				},
				"max_tokens": map[string]interface{}{
					"type":        "number",
					"description": "Maximum tokens for summary (default: 2000)",
				},
				"preserve_code": map[string]interface{}{
					"type":        "boolean",
					"description": "Preserve code blocks (default: true)",
				},
			},
			"description": "Processing options",
		},
	},
	"required": []string{"input_path", "output_dir"},
}

// ProcessedFile represents a processed file result
type ProcessedFile struct {
	SourcePath       string                 `json:"source_path"`
	OutputPath       string                 `json:"output_path"`
	Title            string                 `json:"title"`
	OriginalTokens   int                    `json:"original_tokens"`
	ProcessedTokens  int                    `json:"processed_tokens"`
	CompressionRatio float64                `json:"compression_ratio"`
	KeyParagraphs    int                    `json:"key_paragraphs"`
	Keywords         []string               `json:"keywords,omitempty"`
	KeyFacts         []string               `json:"key_facts,omitempty"`
	Entities         []logic.Entity         `json:"entities,omitempty"`
	ProcessedAt      string                 `json:"processed_at"`
	Errors           []string               `json:"errors,omitempty"`
}

// ProcessRawResult represents the overall processing result
type ProcessRawResult struct {
	Status          string          `json:"status"`
	TotalFiles      int             `json:"total_files"`
	ProcessedCount  int             `json:"processed_count"`
	ErrorCount      int             `json:"error_count"`
	TotalOrigTokens int             `json:"total_original_tokens"`
	TotalProcTokens int             `json:"total_processed_tokens"`
	OverallRatio    float64         `json:"overall_compression_ratio"`
	Files           []ProcessedFile `json:"files"`
	IndexPath       string          `json:"index_path,omitempty"`
	ProcessingTime  string          `json:"processing_time"`
}

// ProcessRawHandler handles the process_raw tool
// This tool processes raw files from ingest_content and:
// 1. Extracts key paragraphs using TF-based scoring
// 2. Extracts keywords, facts, and entities
// 3. Creates summarized versions optimized for LLM consumption
// 4. Generates an index of all processed files
func ProcessRawHandler(args map[string]interface{}) (*mcp.CallToolResult, error) {
	startTime := time.Now()

	// Extract arguments
	sessionID, _ := args["session_id"].(string)
	inputPath, _ := args["input_path"].(string)
	outputDir, _ := args["output_dir"].(string)
	operationsRaw, _ := args["operations"].([]interface{})
	optionsRaw, _ := args["options"].(map[string]interface{})

	// Validate required fields
	if inputPath == "" {
		return errorResult("input_path is required"), nil
	}
	if outputDir == "" {
		return errorResult("output_dir is required"), nil
	}

	// Parse operations (default: all)
	operations := []string{"summarize", "extract_facts", "extract_entities", "extract_keywords"}
	if len(operationsRaw) > 0 {
		operations = make([]string, len(operationsRaw))
		for i, op := range operationsRaw {
			operations[i], _ = op.(string)
		}
	}

	// Parse options
	options := logic.DefaultSummarizationOptions()
	if optionsRaw != nil {
		if mp, ok := optionsRaw["max_paragraphs"].(float64); ok {
			options.MaxParagraphs = int(mp)
		}
		if mt, ok := optionsRaw["max_tokens"].(float64); ok {
			options.MaxTokens = int(mt)
		}
		if pc, ok := optionsRaw["preserve_code"].(bool); ok {
			options.PreserveCodeBlocks = pc
		}
	}

	// Determine if input is file or directory
	fileInfo, err := os.Stat(inputPath)
	if err != nil {
		return errorResult("Failed to access input path: " + err.Error()), nil
	}

	var files []string
	if fileInfo.IsDir() {
		// Read all markdown files from directory
		entries, err := filepath.Glob(filepath.Join(inputPath, "*.md"))
		if err != nil {
			return errorResult("Failed to read directory: " + err.Error()), nil
		}
		files = entries
	} else {
		// Single file
		files = []string{inputPath}
	}

	if len(files) == 0 {
		return errorResult("No markdown files found in input path"), nil
	}

	// Ensure output directory exists
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return errorResult("Failed to create output directory: " + err.Error()), nil
	}

	// Process files in parallel
	var processedFiles []ProcessedFile
	var mu sync.Mutex
	var wg sync.WaitGroup

	totalOrigTokens := 0
	totalProcTokens := 0
	errorCount := 0

	for _, filePath := range files {
		wg.Add(1)
		go func(fp string) {
			defer wg.Done()

			result := processRawFile(fp, outputDir, operations, options, sessionID)

			mu.Lock()
			processedFiles = append(processedFiles, result)
			totalOrigTokens += result.OriginalTokens
			totalProcTokens += result.ProcessedTokens
			if len(result.Errors) > 0 {
				errorCount++
			}
			mu.Unlock()
		}(filePath)
	}
	wg.Wait()

	// Calculate overall compression ratio
	overallRatio := 0.0
	if totalOrigTokens > 0 {
		overallRatio = float64(totalProcTokens) / float64(totalOrigTokens)
	}

	// Generate index file
	indexPath := filepath.Join(outputDir, "sources_index.json")
	indexData := buildSourcesIndex(processedFiles)
	indexJSON, _ := json.MarshalIndent(indexData, "", "  ")
	os.WriteFile(indexPath, indexJSON, 0644)

	// Also generate markdown index
	indexMdPath := filepath.Join(outputDir, "sources_index.md")
	indexMd := generateMarkdownIndex(processedFiles, sessionID)
	os.WriteFile(indexMdPath, []byte(indexMd), 0644)

	// Build result
	result := ProcessRawResult{
		Status:          "completed",
		TotalFiles:      len(files),
		ProcessedCount:  len(files) - errorCount,
		ErrorCount:      errorCount,
		TotalOrigTokens: totalOrigTokens,
		TotalProcTokens: totalProcTokens,
		OverallRatio:    overallRatio,
		Files:           processedFiles,
		IndexPath:       indexPath,
		ProcessingTime:  time.Since(startTime).String(),
	}

	raw, _ := json.Marshal(result)
	return &mcp.CallToolResult{
		Content: []mcp.Content{{Type: "text", Text: string(raw)}},
	}, nil
}

// processRawFile processes a single raw file
func processRawFile(filePath, outputDir string, operations []string, options logic.SummarizationOptions, sessionID string) ProcessedFile {
	result := ProcessedFile{
		SourcePath:  filePath,
		ProcessedAt: time.Now().Format(time.RFC3339),
	}

	// Read file
	content, err := os.ReadFile(filePath)
	if err != nil {
		result.Errors = append(result.Errors, "Failed to read file: "+err.Error())
		return result
	}

	contentStr := string(content)
	result.OriginalTokens = logic.CountTokens(contentStr)

	// Extract frontmatter and content
	title, body := extractFrontmatterAndBody(contentStr)
	result.Title = title

	// Check operations
	doSummarize := containsOp(operations, "summarize")
	doFacts := containsOp(operations, "extract_facts")
	doEntities := containsOp(operations, "extract_entities")
	doKeywords := containsOp(operations, "extract_keywords")

	// Extract metadata
	metadata := logic.DocumentMetadata{Title: title}

	// Summarize content
	var summary logic.ContentSummary
	if doSummarize {
		summary = logic.SummarizeContent(body, metadata, options)
		result.KeyParagraphs = len(summary.KeyParagraphs)
	}

	// Extract keywords
	if doKeywords {
		if doSummarize {
			result.Keywords = summary.Keywords
		} else {
			result.Keywords = logic.ExtractTopKeywords(body, 20)
		}
	}

	// Extract facts
	if doFacts {
		if doSummarize {
			result.KeyFacts = summary.KeyFacts
		} else {
			result.KeyFacts = logic.ExtractKeyFacts(body)
		}
	}

	// Extract entities
	if doEntities {
		entityMap := logic.ExtractEntities(body)
		for _, e := range entityMap {
			result.Entities = append(result.Entities, e)
		}
	}

	// Generate output filename
	baseName := filepath.Base(filePath)
	outputName := strings.TrimSuffix(baseName, ".md") + "_summary.md"
	outputPath := filepath.Join(outputDir, outputName)
	result.OutputPath = outputPath

	// Build output content
	var output strings.Builder
	output.WriteString("---\n")
	output.WriteString(fmt.Sprintf("title: %q\n", title))
	output.WriteString(fmt.Sprintf("source_file: %s\n", filePath))
	output.WriteString(fmt.Sprintf("original_tokens: %d\n", result.OriginalTokens))
	output.WriteString(fmt.Sprintf("processed_at: %s\n", result.ProcessedAt))
	if sessionID != "" {
		output.WriteString(fmt.Sprintf("session_id: %s\n", sessionID))
	}
	output.WriteString("---\n\n")

	// Title
	if title != "" {
		output.WriteString(fmt.Sprintf("# %s\n\n", title))
	}

	// Keywords section
	if len(result.Keywords) > 0 {
		output.WriteString("## Keywords\n\n")
		output.WriteString(strings.Join(result.Keywords, ", "))
		output.WriteString("\n\n")
	}

	// Key facts section
	if len(result.KeyFacts) > 0 {
		output.WriteString("## Key Facts\n\n")
		for _, fact := range result.KeyFacts {
			output.WriteString(fmt.Sprintf("- %s\n", fact))
		}
		output.WriteString("\n")
	}

	// Entities section
	if len(result.Entities) > 0 {
		output.WriteString("## Entities Mentioned\n\n")
		// Group by type
		entityByType := make(map[string][]string)
		for _, e := range result.Entities {
			entityByType[e.Type] = append(entityByType[e.Type], e.Name)
		}
		for typ, names := range entityByType {
			output.WriteString(fmt.Sprintf("**%s:** %s\n", typ, strings.Join(names, ", ")))
		}
		output.WriteString("\n")
	}

	// Key paragraphs section
	if doSummarize && len(summary.KeyParagraphs) > 0 {
		output.WriteString("## Key Content\n\n")
		for _, para := range summary.KeyParagraphs {
			output.WriteString(para)
			output.WriteString("\n\n")
		}
	}

	// Write output file
	if err := os.WriteFile(outputPath, []byte(output.String()), 0644); err != nil {
		result.Errors = append(result.Errors, "Failed to write output: "+err.Error())
		return result
	}

	result.ProcessedTokens = logic.CountTokens(output.String())
	if result.OriginalTokens > 0 {
		result.CompressionRatio = float64(result.ProcessedTokens) / float64(result.OriginalTokens)
	}

	return result
}

// extractFrontmatterAndBody separates frontmatter from content
func extractFrontmatterAndBody(content string) (string, string) {
	lines := strings.Split(content, "\n")
	title := ""
	bodyStart := 0

	// Check for YAML frontmatter
	if len(lines) > 0 && strings.TrimSpace(lines[0]) == "---" {
		for i := 1; i < len(lines); i++ {
			line := strings.TrimSpace(lines[i])
			if line == "---" {
				bodyStart = i + 1
				break
			}
			// Extract title from frontmatter
			if strings.HasPrefix(line, "title:") {
				title = strings.TrimSpace(strings.TrimPrefix(line, "title:"))
				title = strings.Trim(title, `"'`)
			}
		}
	}

	// If no title from frontmatter, try to find H1
	if title == "" {
		for _, line := range lines[bodyStart:] {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "# ") {
				title = strings.TrimPrefix(line, "# ")
				break
			}
		}
	}

	body := strings.Join(lines[bodyStart:], "\n")
	return title, body
}

// containsOp checks if operation is in list
func containsOp(ops []string, op string) bool {
	for _, o := range ops {
		if o == op {
			return true
		}
	}
	return false
}

// buildSourcesIndex builds a JSON index of all processed files
func buildSourcesIndex(files []ProcessedFile) map[string]interface{} {
	var sources []map[string]interface{}
	allKeywords := make(map[string]int)
	allEntities := make(map[string]string)

	for _, f := range files {
		source := map[string]interface{}{
			"title":         f.Title,
			"source_path":   f.SourcePath,
			"output_path":   f.OutputPath,
			"tokens":        f.ProcessedTokens,
			"key_facts":     len(f.KeyFacts),
			"entities":      len(f.Entities),
			"keywords":      f.Keywords,
		}
		sources = append(sources, source)

		// Aggregate keywords
		for _, kw := range f.Keywords {
			allKeywords[kw]++
		}

		// Aggregate entities
		for _, e := range f.Entities {
			allEntities[e.Name] = e.Type
		}
	}

	return map[string]interface{}{
		"total_sources":   len(files),
		"sources":         sources,
		"top_keywords":    getTopN(allKeywords, 30),
		"all_entities":    allEntities,
		"generated_at":    time.Now().Format(time.RFC3339),
	}
}

// getTopN returns top N items from frequency map
func getTopN(freq map[string]int, n int) []string {
	type kv struct {
		k string
		v int
	}
	var sorted []kv
	for k, v := range freq {
		sorted = append(sorted, kv{k, v})
	}
	// Simple bubble sort for small maps
	for i := 0; i < len(sorted); i++ {
		for j := i + 1; j < len(sorted); j++ {
			if sorted[j].v > sorted[i].v {
				sorted[i], sorted[j] = sorted[j], sorted[i]
			}
		}
	}
	var result []string
	for i := 0; i < n && i < len(sorted); i++ {
		result = append(result, sorted[i].k)
	}
	return result
}

// generateMarkdownIndex generates a markdown index of processed files
func generateMarkdownIndex(files []ProcessedFile, sessionID string) string {
	var sb strings.Builder

	sb.WriteString("# Processed Sources Index\n\n")
	sb.WriteString(fmt.Sprintf("Generated: %s\n\n", time.Now().Format(time.RFC3339)))
	if sessionID != "" {
		sb.WriteString(fmt.Sprintf("Session: %s\n\n", sessionID))
	}

	sb.WriteString("## Summary\n\n")
	sb.WriteString(fmt.Sprintf("- **Total Sources:** %d\n", len(files)))

	totalOrig := 0
	totalProc := 0
	for _, f := range files {
		totalOrig += f.OriginalTokens
		totalProc += f.ProcessedTokens
	}
	sb.WriteString(fmt.Sprintf("- **Original Tokens:** %d\n", totalOrig))
	sb.WriteString(fmt.Sprintf("- **Processed Tokens:** %d\n", totalProc))
	if totalOrig > 0 {
		sb.WriteString(fmt.Sprintf("- **Compression:** %.1f%%\n", float64(totalProc)/float64(totalOrig)*100))
	}
	sb.WriteString("\n")

	sb.WriteString("## Sources\n\n")
	sb.WriteString("| # | Title | Original | Processed | Ratio | Keywords |\n")
	sb.WriteString("|---|-------|----------|-----------|-------|----------|\n")

	for i, f := range files {
		title := f.Title
		if len(title) > 40 {
			title = title[:40] + "..."
		}
		keywords := ""
		if len(f.Keywords) > 3 {
			keywords = strings.Join(f.Keywords[:3], ", ") + "..."
		} else {
			keywords = strings.Join(f.Keywords, ", ")
		}
		sb.WriteString(fmt.Sprintf("| %d | %s | %d | %d | %.0f%% | %s |\n",
			i+1, title, f.OriginalTokens, f.ProcessedTokens,
			f.CompressionRatio*100, keywords))
	}

	return sb.String()
}
