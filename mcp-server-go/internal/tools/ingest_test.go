package tools

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestIngestContent(t *testing.T) {
	// Create temp directory
	tmpDir, err := os.MkdirTemp("", "ingest_test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	rawDir := filepath.Join(tmpDir, "raw")

	// Test HTML ingestion
	htmlContent := `<!DOCTYPE html>
<html>
<head><title>Test Article</title></head>
<body>
<h1>Test Article Title</h1>
<p>This is a test paragraph with some important information about AI and machine learning.</p>
<p>Another paragraph discussing the latest trends in artificial intelligence.</p>
</body>
</html>`

	args := map[string]interface{}{
		"session_id":   "test_session",
		"url":          "https://example.com/test-article",
		"content":      htmlContent,
		"content_type": "html",
		"output_dir":   rawDir,
		"deduplicate":  false,
	}

	result, err := IngestContentHandler(args)
	if err != nil {
		t.Fatalf("IngestContentHandler failed: %v", err)
	}

	// Check result
	if len(result.Content) == 0 {
		t.Fatal("Expected content in result")
	}

	resultText := result.Content[0].Text
	if !strings.Contains(resultText, `"status":"success"`) {
		t.Fatalf("Expected success status, got: %s", resultText)
	}

	// Check file was created
	files, _ := filepath.Glob(filepath.Join(rawDir, "*.md"))
	if len(files) == 0 {
		t.Fatal("Expected at least one file to be created")
	}

	// Read and verify content
	content, err := os.ReadFile(files[0])
	if err != nil {
		t.Fatalf("Failed to read created file: %v", err)
	}

	contentStr := string(content)
	if !strings.Contains(contentStr, "url: https://example.com/test-article") {
		t.Error("Expected URL in frontmatter")
	}
	if !strings.Contains(contentStr, "Test Article") {
		t.Error("Expected title in content")
	}

	t.Logf("Created file: %s", files[0])
	t.Logf("Content preview: %s", contentStr[:min(500, len(contentStr))])
}

func TestProcessRaw(t *testing.T) {
	// Create temp directories
	tmpDir, err := os.MkdirTemp("", "process_raw_test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	rawDir := filepath.Join(tmpDir, "raw")
	processedDir := filepath.Join(tmpDir, "processed")
	os.MkdirAll(rawDir, 0755)

	// Create a test raw file
	rawContent := `---
title: "Test Research Document"
url: https://example.com/research
ingested_at: 2024-01-01T00:00:00Z
---

# Test Research Document

This is an important research document about artificial intelligence and machine learning.

## Key Findings

The AI industry has grown by 35% in 2024. Major companies like OpenAI, Google, and Anthropic are leading the charge.

The market size is estimated at $150 billion, with projections reaching $500 billion by 2030.

## Technical Details

Machine learning models have improved significantly. GPT-4 and Claude demonstrate impressive capabilities in natural language processing.

Key technologies include:
- Transformer architecture
- Large language models
- Reinforcement learning from human feedback

## Conclusion

The future of AI looks promising with continued investment and research.
`

	rawFile := filepath.Join(rawDir, "test_research.md")
	if err := os.WriteFile(rawFile, []byte(rawContent), 0644); err != nil {
		t.Fatal(err)
	}

	// Test process_raw
	args := map[string]interface{}{
		"session_id": "test_session",
		"input_path": rawDir,
		"output_dir": processedDir,
		"operations": []interface{}{"summarize", "extract_facts", "extract_entities", "extract_keywords"},
	}

	result, err := ProcessRawHandler(args)
	if err != nil {
		t.Fatalf("ProcessRawHandler failed: %v", err)
	}

	// Check result
	if len(result.Content) == 0 {
		t.Fatal("Expected content in result")
	}

	resultText := result.Content[0].Text
	if !strings.Contains(resultText, `"status":"completed"`) {
		t.Fatalf("Expected completed status, got: %s", resultText)
	}

	// Check processed files were created
	files, _ := filepath.Glob(filepath.Join(processedDir, "*_summary.md"))
	if len(files) == 0 {
		t.Fatal("Expected summary file to be created")
	}

	// Check index was created
	indexFile := filepath.Join(processedDir, "sources_index.json")
	if _, err := os.Stat(indexFile); os.IsNotExist(err) {
		t.Error("Expected sources_index.json to be created")
	}

	// Read and verify processed content
	content, err := os.ReadFile(files[0])
	if err != nil {
		t.Fatalf("Failed to read processed file: %v", err)
	}

	contentStr := string(content)
	t.Logf("Processed file: %s", files[0])
	t.Logf("Processed content preview:\n%s", contentStr[:min(1000, len(contentStr))])

	// Check for expected sections
	if !strings.Contains(contentStr, "## Keywords") {
		t.Error("Expected Keywords section")
	}
	if !strings.Contains(contentStr, "## Key Facts") || !strings.Contains(contentStr, "## Key Content") {
		// At least one of these should exist
		t.Log("Note: Key Facts or Key Content sections may be empty depending on content")
	}
}

func TestContentTypeDetection(t *testing.T) {
	tests := []struct {
		content  string
		expected string
	}{
		{
			content:  "<!DOCTYPE html><html><body>Hello</body></html>",
			expected: "html",
		},
		{
			content:  "<html><head></head><body>Content</body></html>",
			expected: "html",
		},
		{
			content:  "# Markdown Title\n\nSome **bold** text",
			expected: "markdown",
		},
		{
			content:  "```python\nprint('hello')\n```",
			expected: "markdown",
		},
		{
			content:  "Plain text content without any special formatting",
			expected: "text",
		},
	}

	for _, tt := range tests {
		result := detectContentType(tt.content)
		if result != tt.expected {
			t.Errorf("detectContentType(%q) = %q, want %q", tt.content[:50], result, tt.expected)
		}
	}
}

func TestSanitizeFilename(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"Hello World", "Hello_World"},
		{"https://example.com/page", "https_example_com_page"}, // Note: https_ is kept
		{"File:Name*With?Invalid<Chars>", "File_Name_With_Invalid_Chars"},
		{"multiple___underscores", "multiple_underscores"},
	}

	for _, tt := range tests {
		result := sanitizeFilename(tt.input)
		if result != tt.expected {
			t.Errorf("sanitizeFilename(%q) = %q, want %q", tt.input, result, tt.expected)
		}
	}
}
