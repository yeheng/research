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
	researcherrors "deep-research-mcp/internal/errors"
)

type GraphController struct {
	SessionID   string
	Paths       map[string]*ResearchPath
	PathCounter int
	History     []HistoryEntry
	DB          *sql.DB
	logger      *researcherrors.ErrorLogger
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
	gc.logger = researcherrors.NewErrorLogger(gc.SessionID)
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

	// Select templates (5 diverse research angles)
	templates := []struct{ focus, pattern string }{
		{"Academic Research", "{topic} academic papers research {year}"},
		{"Industry Practices", "{topic} industry report case study"},
		{"Policy & Governance", "{topic} policy regulation governance"},
		{"Technical Documentation", "{topic} technical documentation specification API"},
		{"News & Media", "{topic} news analysis trends {year}"},
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

// ScoreAndPrune scores paths using enhanced algorithm and keeps top N
func (gc *GraphController) ScoreAndPrune(paths []*ResearchPath, keepN int) ([]PathScore, error) {
	var scoredPaths []PathScore

	for _, p := range paths {
		// Enhanced scoring algorithm
		score := gc.calculateEnhancedScore(p)
		p.Score = score

		scoredPaths = append(scoredPaths, PathScore{
			PathID:     p.ID,
			Score:      score,
			Kept:       true,
			Breakdown:  gc.getScoreBreakdown(p),
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

// calculateEnhancedScore computes a comprehensive score for a research path
// Score is 0-10 based on multiple factors:
// - Citation density (25%)
// - Source quality (25%)
// - Content coverage/depth (25%)
// - Step completeness (25%)
func (gc *GraphController) calculateEnhancedScore(p *ResearchPath) float64 {
	// Base score starts at 5.0
	baseScore := 5.0

	// Factor 1: Citation density (0-2.5 points)
	citationScore := gc.scoreCitationDensity(p)

	// Factor 2: Source quality (0-2.5 points)
	sourceScore := gc.scoreSourceQuality(p)

	// Factor 3: Content coverage/depth (0-2.5 points)
	coverageScore := gc.scoreCoverage(p)

	// Factor 4: Step completeness (0-2.5 points)
	completenessScore := gc.scoreCompleteness(p)

	totalScore := baseScore + citationScore + sourceScore + coverageScore + completenessScore

	// Cap at 10.0
	if totalScore > 10.0 {
		totalScore = 10.0
	}
	if totalScore < 0 {
		totalScore = 0
	}

	return totalScore
}

// scoreCitationDensity evaluates citation/reference density in the path
func (gc *GraphController) scoreCitationDensity(p *ResearchPath) float64 {
	citationCount := 0
	totalLength := 0

	for _, step := range p.Steps {
		output := step.Output
		totalLength += len(output)

		// Count citations (URLs, [N] references, DOIs)
		citationCount += strings.Count(output, "http://")
		citationCount += strings.Count(output, "https://")
		citationCount += strings.Count(output, "doi:")
		citationCount += strings.Count(output, "DOI:")
		// Count reference markers like [1], [2], etc.
		for i := 1; i <= 20; i++ {
			citationCount += strings.Count(output, fmt.Sprintf("[%d]", i))
		}
	}

	// Calculate density per 1000 characters
	if totalLength == 0 {
		return 0.5 // Default if no content
	}

	density := float64(citationCount) / (float64(totalLength) / 1000.0)

	// Score: 0 citations = 0, 1+ per 1k chars = 2.5
	score := density * 1.25
	if score > 2.5 {
		score = 2.5
	}

	return score
}

// scoreSourceQuality evaluates the quality of sources mentioned
func (gc *GraphController) scoreSourceQuality(p *ResearchPath) float64 {
	totalContent := ""
	for _, step := range p.Steps {
		totalContent += step.Output + " "
	}

	if len(totalContent) == 0 {
		return 0.5
	}

	lowerContent := strings.ToLower(totalContent)

	// High quality indicators (academic, official)
	highQualityScore := 0.0
	highQualityIndicators := []string{
		".edu", ".gov", "pubmed", "arxiv", "scholar.google",
		"ieee", "acm.org", "nature.com", "science.org",
		"peer-reviewed", "systematic review", "meta-analysis",
	}
	for _, indicator := range highQualityIndicators {
		if strings.Contains(lowerContent, indicator) {
			highQualityScore += 0.3
		}
	}

	// Medium quality indicators (industry reports, reputable news)
	mediumQualityIndicators := []string{
		"gartner", "forrester", "mckinsey", "reuters", "bloomberg",
		"techcrunch", "wired", "official documentation",
	}
	for _, indicator := range mediumQualityIndicators {
		if strings.Contains(lowerContent, indicator) {
			highQualityScore += 0.15
		}
	}

	// Low quality penalties
	lowQualityIndicators := []string{
		"reddit.com", "quora.com", "blog", "medium.com",
		"opinion", "allegedly", "rumor",
	}
	for _, indicator := range lowQualityIndicators {
		if strings.Contains(lowerContent, indicator) {
			highQualityScore -= 0.1
		}
	}

	// Normalize to 0-2.5
	score := highQualityScore
	if score > 2.5 {
		score = 2.5
	}
	if score < 0 {
		score = 0
	}

	return score
}

// scoreCoverage evaluates content depth and breadth
func (gc *GraphController) scoreCoverage(p *ResearchPath) float64 {
	totalContent := ""
	topicsCovered := make(map[string]bool)

	for _, step := range p.Steps {
		totalContent += step.Output + " "

		// Track topics covered
		if step.Query != "" {
			topicsCovered[step.Query] = true
		}
	}

	contentLength := len(totalContent)
	topicCount := len(topicsCovered)
	stepCount := len(p.Steps)

	// Score based on content length (up to 1.0)
	lengthScore := float64(contentLength) / 5000.0
	if lengthScore > 1.0 {
		lengthScore = 1.0
	}

	// Score based on topics covered (up to 0.75)
	topicScore := float64(topicCount) * 0.25
	if topicScore > 0.75 {
		topicScore = 0.75
	}

	// Score based on depth (steps) (up to 0.75)
	depthScore := float64(stepCount) * 0.15
	if depthScore > 0.75 {
		depthScore = 0.75
	}

	return lengthScore + topicScore + depthScore
}

// scoreCompleteness evaluates how well each step was completed
func (gc *GraphController) scoreCompleteness(p *ResearchPath) float64 {
	if len(p.Steps) == 0 {
		return 0
	}

	completedSteps := 0
	stepsWithOutput := 0

	for _, step := range p.Steps {
		// Check if step has output
		if step.Output != "" && len(step.Output) > 50 {
			stepsWithOutput++
		}
		// Check if step is marked completed
		if step.Status == "completed" || step.Output != "" {
			completedSteps++
		}
	}

	// Calculate completion ratio
	completionRatio := float64(completedSteps) / float64(len(p.Steps))
	outputRatio := float64(stepsWithOutput) / float64(len(p.Steps))

	// Combined score (0-2.5)
	score := (completionRatio + outputRatio) * 1.25

	if score > 2.5 {
		score = 2.5
	}

	return score
}

// getScoreBreakdown returns a breakdown of score components
func (gc *GraphController) getScoreBreakdown(p *ResearchPath) map[string]float64 {
	return map[string]float64{
		"citation_density": gc.scoreCitationDensity(p),
		"source_quality":   gc.scoreSourceQuality(p),
		"coverage":         gc.scoreCoverage(p),
		"completeness":     gc.scoreCompleteness(p),
	}
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
		if gc.logger != nil {
			gc.logger.LogError(researcherrors.WrapError(err, researcherrors.ErrDatabaseOperation, "Failed to load GoT nodes"))
		}
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

func (gc *GraphController) saveNodeToDb(path *ResearchPath, nodeType string) error {
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
		resErr := researcherrors.WrapError(err, researcherrors.ErrDatabaseOperation, "Failed to save GoT node")
		if gc.logger != nil {
			gc.logger.LogError(resErr)
		}
		return resErr
	}
	return nil
}

func (gc *GraphController) saveOperationToDb(opType string, inputNodes, outputNodes []string) error {
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
		resErr := researcherrors.WrapError(err, researcherrors.ErrDatabaseOperation, "Failed to save GoT operation")
		if gc.logger != nil {
			gc.logger.LogError(resErr)
		}
		return resErr
	}
	return nil
}

func (gc *GraphController) logHistory(action string, result interface{}) {
	entry := HistoryEntry{
		Iteration: len(gc.History) + 1,
		Action:    action,
		Result:    result,
		Timestamp: time.Now().Format(time.RFC3339),
	}
	gc.History = append(gc.History, entry)

	// Log info using structured logger
	if gc.logger != nil {
		gc.logger.LogInfo("GoT: "+action, map[string]interface{}{
			"iteration": entry.Iteration,
			"result":    result,
		})
	}

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
