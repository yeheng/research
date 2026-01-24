package got

type ResearchPath struct {
	ID       string                 `json:"id"`
	Query    string                 `json:"query"`
	Focus    string                 `json:"focus,omitempty"`
	Steps    []ResearchStep         `json:"steps"`
	Score    float64                `json:"score,omitempty"`
	Status   string                 `json:"status"` // pending, active, completed, pruned
	Metadata map[string]interface{} `json:"metadata"`
}

type ResearchStep struct {
	ID         string                 `json:"id,omitempty"`
	StepNumber int                    `json:"step_number,omitempty"`
	Type       string                 `json:"type,omitempty"`
	Action     string                 `json:"action,omitempty"`
	Input      string                 `json:"input,omitempty"`
	Query      string                 `json:"query,omitempty"`
	Output     string                 `json:"output,omitempty"`
	Status     string                 `json:"status,omitempty"` // pending, running, completed, failed
	Sources    []string               `json:"sources,omitempty"`
	Facts      []interface{}          `json:"facts,omitempty"`
	Timestamp  string                 `json:"timestamp"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
}

type PathGenerationOptions struct {
	K               int         `json:"k"`
	Strategy        string      `json:"strategy,omitempty"` // diverse, focused, exploratory, orthogonal
	MaxDepth        int         `json:"maxDepth,omitempty"`
	DiversityWeight float64     `json:"diversityWeight,omitempty"`
	Context         interface{} `json:"context,omitempty"`
}

type PathScore struct {
	PathID    string             `json:"path_id"`
	Score     float64            `json:"score"`
	Kept      bool               `json:"kept"`
	Breakdown map[string]float64 `json:"breakdown,omitempty"`
}

type AggregationResult struct {
	SynthesizedContent string     `json:"synthesizedContent"`
	Sources            []string   `json:"sources"`
	Confidence         float64    `json:"confidence"`
	Conflicts          []Conflict `json:"conflicts"`
	FactCount          int        `json:"fact_count,omitempty"`
}

type Conflict struct {
	Fact1    interface{} `json:"fact1,omitempty"`
	Fact2    interface{} `json:"fact2,omitempty"`
	Claim1   string      `json:"claim1,omitempty"`
	Claim2   string      `json:"claim2,omitempty"`
	Source1  string      `json:"source1,omitempty"`
	Source2  string      `json:"source2,omitempty"`
	Type     string      `json:"type,omitempty"`
	Severity string      `json:"severity,omitempty"`
}

type GraphState struct {
	SessionID           string         `json:"session_id"`
	Iteration           int            `json:"iteration"`
	MaxIterations       int            `json:"max_iterations"`
	ConfidenceThreshold float64        `json:"confidence_threshold,omitempty"`
	Paths               []ResearchPath `json:"paths"`
	Confidence          float64        `json:"confidence"`
	Aggregated          bool           `json:"aggregated"`
	BudgetExhausted     bool           `json:"budget_exhausted"`
	CurrentFindings     interface{}    `json:"current_findings,omitempty"`
	TotalFacts          int            `json:"total_facts"`
	CitedFacts          int            `json:"cited_facts"`
	Sources             []struct {
		QualityScore float64 `json:"quality_score"`
	} `json:"sources"`
	TotalTopics   int `json:"total_topics"`
	CoveredTopics int `json:"covered_topics"`
}

type NextAction struct {
	Action    string                 `json:"action"` // generate, execute, score, prune, aggregate, synthesize
	Params    map[string]interface{} `json:"params"`
	Reasoning string                 `json:"reasoning"`
}
