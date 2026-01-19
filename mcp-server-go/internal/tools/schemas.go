package tools

var BatchInputSchema = map[string]interface{}{
	"type": "object",
	"properties": map[string]interface{}{
		"items": map[string]interface{}{
			"type":        "array",
			"description": "Array of items to process",
		},
		"mode": map[string]interface{}{
			"type":        "string",
			"description": "Processing mode (depends on tool)",
		},
		"options": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"maxConcurrency": map[string]interface{}{
					"type":        "number",
					"description": "Maximum parallel operations (default: 5)",
				},
				"useCache": map[string]interface{}{
					"type":        "boolean",
					"description": "Use caching to skip duplicates (default: true)",
				},
				"stopOnError": map[string]interface{}{
					"type":        "boolean",
					"description": "Stop on first error (default: false)",
				},
			},
		},
	},
	"required": []string{"items"},
}

var ExtractInputSchema = map[string]interface{}{
	"type": "object",
	"properties": map[string]interface{}{
		"text": map[string]interface{}{"type": "string", "description": "Text to analyze"},
		"mode": map[string]interface{}{
			"type":        "string",
			"enum":        []string{"fact", "entity", "all"},
			"description": "Extraction mode (default: all)",
		},
		"source_url":      map[string]interface{}{"type": "string", "description": "Source URL for facts"},
		"source_metadata": map[string]interface{}{"type": "object", "description": "Source metadata"},
		"entity_types": map[string]interface{}{
			"type":        "array",
			"items":       map[string]interface{}{"type": "string"},
			"description": "Entity types to extract",
		},
		"extract_relations": map[string]interface{}{"type": "boolean", "description": "Extract relationships (default: true)"},
	},
	"required": []string{"text"},
}

var ValidateInputSchema = map[string]interface{}{
	"type": "object",
	"properties": map[string]interface{}{
		"mode": map[string]interface{}{
			"type":        "string",
			"enum":        []string{"citation", "source", "all"},
			"description": "Validation mode (default: all)",
		},
		"citations":  map[string]interface{}{"type": "array", "description": "Array of citations to validate"},
		"source_url": map[string]interface{}{"type": "string", "description": "Source URL to rate"},
		"source_type": map[string]interface{}{
			"type":        "string",
			"enum":        []string{"academic", "industry", "news", "blog", "official"},
			"description": "Type of source",
		},
		"verify_urls":    map[string]interface{}{"type": "boolean", "description": "Check URL accessibility"},
		"check_accuracy": map[string]interface{}{"type": "boolean", "description": "Verify citation accuracy"},
	},
}

var ConflictDetectInputSchema = map[string]interface{}{
	"type": "object",
	"properties": map[string]interface{}{
		"facts":     map[string]interface{}{"type": "array", "description": "Array of facts to compare"},
		"tolerance": map[string]interface{}{"type": "object", "description": "Conflict tolerance settings"},
	},
	"required": []string{"facts"},
}

// State Management Schemas
var CreateSessionSchema = map[string]interface{}{
	"type": "object",
	"properties": map[string]interface{}{
		"topic":         map[string]interface{}{"type": "string", "description": "Research topic/question"},
		"research_type": map[string]interface{}{"type": "string", "enum": []string{"deep", "quick", "custom"}, "description": "Type of research (default: deep)"},
		"output_dir":    map[string]interface{}{"type": "string", "description": "Output directory path"},
	},
	"required": []string{"topic", "output_dir"},
}

var UpdateSessionStatusSchema = map[string]interface{}{
	"type": "object",
	"properties": map[string]interface{}{
		"session_id": map[string]interface{}{"type": "string"},
		"status":     map[string]interface{}{"type": "string", "enum": []string{"initializing", "planning", "executing", "synthesizing", "validating", "completed", "failed"}},
	},
	"required": []string{"session_id", "status"},
}

var GetSessionInfoSchema = map[string]interface{}{
	"type":       "object",
	"properties": map[string]interface{}{"session_id": map[string]interface{}{"type": "string"}},
	"required":   []string{"session_id"},
}

var RegisterAgentSchema = map[string]interface{}{
	"type": "object",
	"properties": map[string]interface{}{
		"session_id": map[string]interface{}{"type": "string"},
		"agent_id":   map[string]interface{}{"type": "string"},
		"agent_type": map[string]interface{}{"type": "string"},
		"options":    map[string]interface{}{"type": "object"},
	},
	"required": []string{"session_id", "agent_id", "agent_type"},
}

var UpdateAgentStatusSchema = map[string]interface{}{
	"type": "object",
	"properties": map[string]interface{}{
		"agent_id": map[string]interface{}{"type": "string"},
		"status":   map[string]interface{}{"type": "string"},
		"options":  map[string]interface{}{"type": "object"},
	},
	"required": []string{"agent_id", "status"},
}

// GoT Schemas
var GeneratePathsSchema = map[string]interface{}{
	"type": "object",
	"properties": map[string]interface{}{
		"session_id": map[string]interface{}{"type": "string", "description": "Session ID"},
		"query":      map[string]interface{}{"type": "string", "description": "Research query"},
		"k":          map[string]interface{}{"type": "number", "description": "Number of paths (default: 3)"},
		"strategy":   map[string]interface{}{"type": "string", "enum": []string{"diverse", "focused", "exploratory", "orthogonal"}},
		"max_depth":  map[string]interface{}{"type": "number", "description": "Max depth"},
	},
	"required": []string{"query"},
}

var RefinePathSchema = map[string]interface{}{
	"type": "object",
	"properties": map[string]interface{}{
		"session_id": map[string]interface{}{"type": "string"},
		"path_id":    map[string]interface{}{"type": "string"},
		"feedback":   map[string]interface{}{"type": "string"},
		"depth":      map[string]interface{}{"type": "number"},
	},
	"required": []string{"path_id"},
}

var ScoreAndPruneSchema = map[string]interface{}{
	"type": "object",
	"properties": map[string]interface{}{
		"session_id": map[string]interface{}{"type": "string"},
		"keepN":      map[string]interface{}{"type": "number"},
	},
	"required": []string{"keepN"},
}

var AggregatePathsSchema = map[string]interface{}{
	"type": "object",
	"properties": map[string]interface{}{
		"session_id": map[string]interface{}{"type": "string"},
		"strategy":   map[string]interface{}{"type": "string", "enum": []string{"synthesis", "voting", "consensus", "thematic", "chronological"}},
	},
	"required": []string{},
}

var GetNextActionSchema = map[string]interface{}{
	"type":       "object",
	"properties": map[string]interface{}{"session_id": map[string]interface{}{"type": "string"}},
	"required":   []string{"session_id"},
}
