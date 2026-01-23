package tools

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"deep-research-mcp/internal/logic"
)

func TestTemplateRendering(t *testing.T) {
	// Create temporary directory for test output
	tmpDir := t.TempDir()
	
	// Initialize template renderer with absolute path from project root
	templateDir := "shared/templates/processed"
	renderer := NewTemplateRenderer(templateDir)
	
	// Prepare test data
	testFacts := []logic.Fact{
		{
			Entity:     "OpenAI",
			Attribute:  "valuation",
			Value:      "$80B",
			ValueType:  "currency",
			Confidence: "High",
			Source: logic.Source{
				URL:   "https://example.com/openai-valuation",
				Title: "OpenAI Valuation Report",
			},
		},
		{
			Entity:     "Microsoft",
			Attribute:  "investment",
			Value:      "$10B",
			ValueType:  "currency",
			Confidence: "High",
			Source: logic.Source{
				URL:   "https://example.com/microsoft-investment",
				Title: "Microsoft Investment in OpenAI",
			},
		},
	}
	
	testEntities := []logic.Entity{
		{
			Name:         "OpenAI",
			Type:         "company",
			MentionCount: 5,
			Aliases:      []string{"Open AI"},
		},
		{
			Name:         "Microsoft",
			Type:         "company",
			MentionCount: 3,
			Aliases:      []string{"MSFT"},
		},
	}
	
	testRelations := []logic.Relation{
		{
			Source:     "Microsoft",
			Target:     "OpenAI",
			Relation:   "invests_in",
			Confidence: 0.9,
			Evidence:   "Microsoft invested $10B in OpenAI",
		},
	}
	
	// Test Fact Ledger rendering
	t.Run("FactLedger", func(t *testing.T) {
		data := FactLedgerData{
			Timestamp:         time.Now().Format("2006-01-02 15:04:05"),
			ProcessingSeconds: 1.5,
			TotalFacts:        len(testFacts),
			TotalEntities:     len(testEntities),
			ConflictCount:     0,
			SourceCount:       2,
			RawFileCount:      1,
			Facts:             testFacts,
			Entities:          testEntities,
			HighConfFacts:     testFacts,
			MediumConfFacts:   []logic.Fact{},
			LowConfFacts:      []logic.Fact{},
			Organizations:     testEntities,
			People:            []logic.Entity{},
			Dates:             []logic.Entity{},
			Locations:         []logic.Entity{},
			Concepts:          []logic.Entity{},
		}
		
		outputPath := filepath.Join(tmpDir, "fact_ledger.md")
		err := renderer.RenderFactLedger(data, outputPath)
		if err != nil {
			t.Fatalf("Failed to render fact ledger: %v", err)
		}
		
		// Verify file was created
		if _, err := os.Stat(outputPath); os.IsNotExist(err) {
			t.Fatalf("Output file was not created: %s", outputPath)
		}
		
		// Read and verify content
		content, err := os.ReadFile(outputPath)
		if err != nil {
			t.Fatalf("Failed to read output file: %v", err)
		}
		
		if len(content) == 0 {
			t.Fatal("Output file is empty")
		}
		
		// Basic content checks
		contentStr := string(content)
		if !strings.Contains(contentStr, "Fact Ledger") {
			t.Error("Output does not contain expected header")
		}
		if !strings.Contains(contentStr, "OpenAI") {
			t.Error("Output does not contain expected entity")
		}
		
		t.Logf("Fact ledger rendered successfully (%d bytes)", len(content))
	})
	
	// Test Entity Graph rendering
	t.Run("EntityGraph", func(t *testing.T) {
		data := EntityGraphData{
			Timestamp:      time.Now().Format("2006-01-02 15:04:05"),
			TotalEntities:  len(testEntities),
			UniqueEntities: len(testEntities),
			Entities:       testEntities,
			Relations:      testRelations,
			Organizations:  testEntities,
			People:         []logic.Entity{},
			Dates:          []logic.Entity{},
			Locations:      []logic.Entity{},
			Concepts:       []logic.Entity{},
			OrgCount:       len(testEntities),
			PersonCount:    0,
			DateCount:      0,
			LocationCount:  0,
			ConceptCount:   0,
		}
		
		outputPath := filepath.Join(tmpDir, "entity_graph.md")
		err := renderer.RenderEntityGraph(data, outputPath)
		if err != nil {
			t.Fatalf("Failed to render entity graph: %v", err)
		}
		
		// Verify file was created
		if _, err := os.Stat(outputPath); os.IsNotExist(err) {
			t.Fatalf("Output file was not created: %s", outputPath)
		}
		
		content, err := os.ReadFile(outputPath)
		if err != nil {
			t.Fatalf("Failed to read output file: %v", err)
		}
		
		t.Logf("Entity graph rendered successfully (%d bytes)", len(content))
	})
	
	// Test Conflict Report rendering
	t.Run("ConflictReport", func(t *testing.T) {
		data := ConflictReportData{
			Timestamp:       time.Now().Format("2006-01-02 15:04:05"),
			TotalFacts:      len(testFacts),
			ConflictCount:   0,
			ResolvedCount:   0,
			UnresolvedCount: 0,
			Conflicts:       []ConflictInfo{},
		}
		
		outputPath := filepath.Join(tmpDir, "conflict_report.md")
		err := renderer.RenderConflictReport(data, outputPath)
		if err != nil {
			t.Fatalf("Failed to render conflict report: %v", err)
		}
		
		// Verify file was created
		if _, err := os.Stat(outputPath); os.IsNotExist(err) {
			t.Fatalf("Output file was not created: %s", outputPath)
		}
		
		content, err := os.ReadFile(outputPath)
		if err != nil {
			t.Fatalf("Failed to read output file: %v", err)
		}
		
		t.Logf("Conflict report rendered successfully (%d bytes)", len(content))
	})
}
