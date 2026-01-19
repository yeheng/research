package got

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math/rand"
	"sort"
	"strings"
	"time"

	"deep-research-mcp/internal/db"
)

type GraphController struct {
	SessionID   string
	Paths       map[string]*ResearchPath
	PathCounter int
	History     []HistoryEntry
	DB          *sql.DB
}

type HistoryEntry struct {
	Iteration int         `json:"iteration"`
	Action    string      `json:"action"`
	Result    interface{} `json:"result"`
	Timestamp string      `json:"timestamp"`
}

func NewGraphController(sessionID string) *GraphController {
	gc := &GraphController{
		SessionID: sessionID,
		Paths:     make(map[string]*ResearchPath),
		DB:        db.DB,
	}
	if sessionID == "" {
		gc.SessionID = fmt.Sprintf("session_%d_%d", time.Now().UnixMilli(), rand.Intn(10000))
	} else {
		gc.LoadState(sessionID)
	}
	return gc
}

// GeneratePaths generates k diverse research paths
func (gc *GraphController) GeneratePaths(query string, options PathGenerationOptions) ([]*ResearchPath, error) {
	k := options.K
	if k <= 0 {
		k = 3
	}
	strategy := options.Strategy
	if strategy == "" {
		strategy = "diverse"
	}

	generatedPaths := []*ResearchPath{}

	// Select templates (simplified logic)
	// In a real port, we'd have the full template logic.
	templates := []struct{ focus, pattern string }{
		{"Academic Research", "{topic} academic papers research {year}"},
		{"Industry Practices", "{topic} industry report case study"},
		{"Policy & Governance", "{topic} policy regulation governance"},
	}

	for i := 0; i < k; i++ {
		template := templates[i%len(templates)]
		gc.PathCounter++
		pathID := fmt.Sprintf("path_%d_%d", gc.PathCounter, time.Now().UnixMilli())

		searchQuery := strings.ReplaceAll(template.pattern, "{topic}", query)
		searchQuery = strings.ReplaceAll(searchQuery, "{year}", fmt.Sprintf("%d", time.Now().Year()))

		path := &ResearchPath{
			ID:    pathID,
			Query: searchQuery,
			Focus: template.focus,
			Steps: []ResearchStep{{
				StepNumber: 1,
				Type:       "search",
				Action:     "search",
				Query:      searchQuery,
				Timestamp:  time.Now().Format(time.RFC3339),
			}},
			Score:  5.0, // Default score
			Status: "active",
			Metadata: map[string]interface{}{
				"depth":    0,
				"maxDepth": options.MaxDepth,
				"strategy": strategy,
			},
		}

		gc.Paths[pathID] = path
		generatedPaths = append(generatedPaths, path)
		gc.saveNodeToDb(path, "generated")
	}

	gc.saveOperationToDb("Generate", []string{}, getPathIDs(generatedPaths))
	gc.logHistory("generate_paths", map[string]interface{}{"query": query, "count": len(generatedPaths)})

	return generatedPaths, nil
}

// RefinePath refines an existing path
func (gc *GraphController) RefinePath(pathID string, feedback string, depth int) (*ResearchPath, error) {
	path, exists := gc.Paths[pathID]
	if !exists {
		return nil, fmt.Errorf("path %s not found", pathID)
	}

	currentDepth := 0
	if d, ok := path.Metadata["depth"].(float64); ok {
		currentDepth = int(d)
	}

	refinedQuery := path.Query
	if feedback != "" {
		refinedQuery = fmt.Sprintf("%s focusing on %s", path.Query, feedback)
	} else {
		refinedQuery = fmt.Sprintf("detailed analysis of %s", path.Query)
	}

	newStep := ResearchStep{
		StepNumber: len(path.Steps) + 1,
		Type:       "analyze",
		Action:     "refine",
		Query:      refinedQuery,
		Input:      path.Query,
		Timestamp:  time.Now().Format(time.RFC3339),
		Metadata: map[string]interface{}{
			"refinement_depth": currentDepth + 1,
			"feedback":         feedback,
		},
	}

	path.Steps = append(path.Steps, newStep)
	path.Metadata["depth"] = currentDepth + 1
	path.Query = refinedQuery
	path.Status = "active"

	gc.Paths[pathID] = path
	gc.saveNodeToDb(path, "refined")
	gc.saveOperationToDb("Refine", []string{pathID}, []string{pathID})

	return path, nil
}

// ScoreAndPrune scores paths and keeps top N
func (gc *GraphController) ScoreAndPrune(paths []*ResearchPath, keepN int) ([]PathScore, error) {
	var scoredPaths []PathScore

	for _, p := range paths {
		// Simplified scoring logic
		score := 5.0 + float64(len(p.Steps))
		if score > 10.0 {
			score = 10.0
		}
		p.Score = score

		scoredPaths = append(scoredPaths, PathScore{
			PathID: p.ID,
			Score:  score,
			Kept:   true,
		})
	}

	sort.Slice(scoredPaths, func(i, j int) bool {
		return scoredPaths[i].Score > scoredPaths[j].Score
	})

	for i := range scoredPaths {
		if i >= keepN {
			scoredPaths[i].Kept = false
			if p, ok := gc.Paths[scoredPaths[i].PathID]; ok {
				p.Status = "pruned"
				gc.saveNodeToDb(p, "pruned")
			}
		}
	}

	gc.saveOperationToDb("Score", getPathIDs(paths), getPathIDsFromScore(scoredPaths[:min(len(scoredPaths), keepN)]))
	return scoredPaths, nil
}

// AggregatePaths aggregates paths
func (gc *GraphController) AggregatePaths(paths []*ResearchPath, strategy string) (*AggregationResult, error) {
	var contentBuilder strings.Builder
	contentBuilder.WriteString("# Research Synthesis\n\n")

	for i, p := range paths {
		contentBuilder.WriteString(fmt.Sprintf("## Path %d: %s\n", i+1, p.Focus))
		for _, s := range p.Steps {
			if s.Output != "" {
				contentBuilder.WriteString(s.Output + "\n\n")
			}
		}
	}

	result := &AggregationResult{
		SynthesizedContent: contentBuilder.String(),
		Sources:            getPathIDs(paths),
		Confidence:         0.8, // Dummy confidence
		Conflicts:          []Conflict{},
	}

	// Save aggregated node
	aggPathID := fmt.Sprintf("aggregated_%d", time.Now().UnixMilli())
	aggPath := &ResearchPath{
		ID:    aggPathID,
		Query: fmt.Sprintf("Aggregated from %d paths", len(paths)),
		Focus: "Aggregated Research",
		Steps: []ResearchStep{{
			StepNumber: 1,
			Type:       "synthesize",
			Action:     "aggregate",
			Output:     result.SynthesizedContent,
			Timestamp:  time.Now().Format(time.RFC3339),
		}},
		Score:  8.0,
		Status: "active", // Was "completed", but schema check constrains to active/pruned/aggregated/refined
		Metadata: map[string]interface{}{
			"strategy": strategy,
		},
	}

	gc.Paths[aggPathID] = aggPath
	gc.saveNodeToDb(aggPath, "aggregated")
	gc.saveOperationToDb("Aggregate", getPathIDs(paths), []string{aggPathID})

	return result, nil
}

// LoadState loads state from DB
func (gc *GraphController) LoadState(sessionID string) {
	gc.SessionID = sessionID
	gc.Paths = make(map[string]*ResearchPath)
	gc.History = []HistoryEntry{}

	rows, err := gc.DB.Query(`
		SELECT content FROM got_nodes
		WHERE session_id = ? AND status IN ('active', 'completed', 'refined')
		ORDER BY created_at ASC
	`, sessionID)
	if err != nil {
		fmt.Printf("Error loading nodes: %v\n", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var content string
		if err := rows.Scan(&content); err != nil {
			continue
		}
		var path ResearchPath
		if err := json.Unmarshal([]byte(content), &path); err == nil {
			gc.Paths[path.ID] = &path
			gc.PathCounter++
		}
	}
}

func (gc *GraphController) saveNodeToDb(path *ResearchPath, nodeType string) {
	content, _ := json.Marshal(path)
	summary := fmt.Sprintf("%s: %s", path.Focus, path.Query)
	depth := 0
	if d, ok := path.Metadata["depth"].(float64); ok {
		depth = int(d)
	}

	_, err := gc.DB.Exec(`
		INSERT OR REPLACE INTO got_nodes (
			node_id, session_id, parent_id, node_type,
			content, summary, quality_score, status, depth
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, path.ID, gc.SessionID, nil, nodeType, string(content), summary, path.Score, path.Status, depth)

	if err != nil {
		fmt.Printf("Error saving node: %v\n", err)
	}
}

func (gc *GraphController) saveOperationToDb(opType string, inputNodes, outputNodes []string) {
	inputJson, _ := json.Marshal(inputNodes)
	outputJson, _ := json.Marshal(outputNodes)
	opID := fmt.Sprintf("op_%d_%d", time.Now().UnixMilli(), rand.Intn(1000))

	_, err := gc.DB.Exec(`
		INSERT INTO got_operations (
			operation_id, session_id, operation_type,
			input_nodes, output_nodes
		) VALUES (?, ?, ?, ?, ?)
	`, opID, gc.SessionID, opType, string(inputJson), string(outputJson))

	if err != nil {
		fmt.Printf("Error saving op: %v\n", err)
	}
}

func (gc *GraphController) logHistory(action string, result interface{}) {
	entry := HistoryEntry{
		Iteration: len(gc.History) + 1,
		Action:    action,
		Result:    result,
		Timestamp: time.Now().Format(time.RFC3339),
	}
	gc.History = append(gc.History, entry)

	// Save to DB log
	details, _ := json.Marshal(result)
	gc.DB.Exec(`
		INSERT INTO activity_log (
			session_id, phase, event_type, message, details
		) VALUES (?, ?, ?, ?, ?)
	`, gc.SessionID, 0, "info", "GoT: "+action, string(details))
}

func getPathIDs(paths []*ResearchPath) []string {
	ids := make([]string, len(paths))
	for i, p := range paths {
		ids[i] = p.ID
	}
	return ids
}

func getPathIDsFromScore(scores []PathScore) []string {
	ids := make([]string, len(scores))
	for i, s := range scores {
		ids[i] = s.PathID
	}
	return ids
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
