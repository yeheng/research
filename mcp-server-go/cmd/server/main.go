package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"deep-research-mcp/internal/db"
	"deep-research-mcp/internal/mcp"
	"deep-research-mcp/internal/tools"
)

func main() {
	dbPath := flag.String("db", "", "Path to SQLite database")
	logPath := flag.String("log", "mcp-server.log", "Path to log file (default: mcp-server.log in current directory)")
	flag.Parse()

	// Setup logging
	logFile, err := os.OpenFile(*logPath, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error opening log file: %v\n", err)
		// Proceed without file logging (defaults to stderr, but we want to avoid polluting stdout/stderr if possible)
	} else {
		defer logFile.Close()
		log.SetOutput(logFile)
	}

	if *dbPath == "" {
		// Default path
		home, _ := os.UserHomeDir()
		*dbPath = filepath.Join(home, ".claude/mcp-server/research_state.db")
	}

	if err := db.InitDB(*dbPath); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize DB: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	registry := mcp.NewRegistry()

	// Unified Tools
	registry.Register("extract", "Unified extraction tool", tools.ExtractInputSchema, tools.ExtractHandler)
	registry.Register("validate", "Unified validation tool", tools.ValidateInputSchema, tools.ValidateHandler)
	registry.Register("conflict-detect", "Detect conflicts", tools.ConflictDetectInputSchema, tools.ConflictDetectHandler)

	// Batch Tools
	registry.Register("batch-extract", "Batch extraction", tools.BatchInputSchema, tools.BatchExtractHandler)
	registry.Register("batch-validate", "Batch validation", tools.BatchInputSchema, tools.BatchValidateHandler)

	// State Tools
	registry.Register("create_research_session", "Create session", tools.CreateSessionSchema, tools.CreateSessionHandler)
	registry.Register("update_session_status", "Update status", tools.UpdateSessionStatusSchema, tools.UpdateSessionStatusHandler)
	registry.Register("get_session_info", "Get session info", tools.GetSessionInfoSchema, tools.GetSessionInfoHandler)
	registry.Register("register_agent", "Register agent", tools.RegisterAgentSchema, tools.RegisterAgentHandler)
	registry.Register("update_agent_status", "Update agent status", tools.UpdateAgentStatusSchema, tools.UpdateAgentStatusHandler)

	// GoT Tools
	registry.Register("generate_paths", "Generate paths", tools.GeneratePathsSchema, tools.GeneratePathsHandler)
	registry.Register("refine_path", "Refine path", tools.RefinePathSchema, tools.RefinePathHandler)
	registry.Register("score_and_prune", "Score and prune", tools.ScoreAndPruneSchema, tools.ScoreAndPruneHandler)
	registry.Register("aggregate_paths", "Aggregate paths", tools.AggregatePathsSchema, tools.AggregatePathsHandler)

	// State Machine
	registry.Register("get_next_action", "Get next action", tools.GetNextActionSchema, tools.GetNextActionHandler)

	// Auto Processing (Server-side Phase 4)
	registry.Register("auto_process_data", "Automatically process raw research data", tools.AutoProcessDataSchema, tools.AutoProcessDataHandler)

	// Content Ingestion (Web Search → Raw)
	registry.Register("ingest_content", "Ingest web content into raw directory", tools.IngestContentSchema, tools.IngestContentHandler)
	registry.Register("batch_ingest", "Batch ingest multiple content items", tools.BatchIngestSchema, tools.BatchIngestHandler)

	// Raw Processing (Raw → Processed)
	registry.Register("process_raw", "Process raw files and extract key information", tools.ProcessRawSchema, tools.ProcessRawHandler)

	server := mcp.NewServer(registry)
	if err := server.Serve(); err != nil {
		fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
		os.Exit(1)
	}
}
