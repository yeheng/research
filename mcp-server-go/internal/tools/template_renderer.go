package tools

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"text/template"
	"time"

	"deep-research-mcp/internal/logic"
)

// TemplateRenderer handles rendering of markdown templates
type TemplateRenderer struct {
	templateDir string
	templates   map[string]*template.Template
	funcMap     template.FuncMap
}

// NewTemplateRenderer creates a new template renderer
func NewTemplateRenderer(templateDir string) *TemplateRenderer {
	funcMap := template.FuncMap{
		"formatTime": func(t time.Time) string {
			return t.Format("2006-01-02 15:04:05")
		},
		"formatDuration": func(d time.Duration) string {
			return fmt.Sprintf("%.2f", d.Seconds())
		},
		"join":  strings.Join,
		"upper": strings.ToUpper,
		"lower": strings.ToLower,
		"title": strings.Title,
		// Math functions for templates
		"mulf": func(a, b float64) float64 { return a * b },
		"divf": func(a, b float64) float64 {
			if b == 0 {
				return 0
			}
			return a / b
		},
		"itof": func(i int) float64 { return float64(i) },
	}

	return &TemplateRenderer{
		templateDir: templateDir,
		templates:   make(map[string]*template.Template),
		funcMap:     funcMap,
	}
}

// FactLedgerData contains data for fact ledger template
type FactLedgerData struct {
	Timestamp         string
	ProcessingSeconds float64
	TotalFacts        int
	TotalEntities     int
	ConflictCount     int
	SourceCount       int
	RawFileCount      int
	Facts             []logic.Fact
	Entities          []logic.Entity
	HighConfFacts     []logic.Fact
	MediumConfFacts   []logic.Fact
	LowConfFacts      []logic.Fact
	Organizations     []logic.Entity
	People            []logic.Entity
	Dates             []logic.Entity
	Locations         []logic.Entity
	Concepts          []logic.Entity
}

// EntityGraphData contains data for entity graph template
type EntityGraphData struct {
	Timestamp      string
	TotalEntities  int
	UniqueEntities int
	Entities       []logic.Entity
	Relations      []logic.Relation
	Organizations  []logic.Entity
	People         []logic.Entity
	Dates          []logic.Entity
	Locations      []logic.Entity
	Concepts       []logic.Entity
	OrgCount       int
	PersonCount    int
	DateCount      int
	LocationCount  int
	ConceptCount   int
}

// ConflictReportData contains data for conflict report template
type ConflictReportData struct {
	Timestamp      string
	TotalFacts     int
	ConflictCount  int
	ResolvedCount  int
	UnresolvedCount int
	Conflicts      []ConflictInfo
}

// ConflictInfo represents a single conflict
type ConflictInfo struct {
	Index       int
	Type        string
	Severity    string
	Status      string
	Fact1       logic.Fact
	Fact2       logic.Fact
	Resolution  string
	Description string
}

// SourceRatingsData contains data for source ratings template
type SourceRatingsData struct {
	Timestamp    string
	TotalSources int
	AverageRating string
	Sources      []SourceRating
	ARated       []SourceRating
	BRated       []SourceRating
	CRated       []SourceRating
	DRated       []SourceRating
	ERated       []SourceRating
}

// SourceRating represents a single source rating
type SourceRating struct {
	Name       string
	URL        string
	Type       string
	Rating     string
	FactCount  int
	FirstCited string
	Criteria   []string
}

// loadTemplate loads and caches a template
func (r *TemplateRenderer) loadTemplate(name string) (*template.Template, error) {
	if tmpl, exists := r.templates[name]; exists {
		return tmpl, nil
	}

	tmplPath := filepath.Join(r.templateDir, name)
	tmpl, err := template.New(filepath.Base(name)).Funcs(r.funcMap).ParseFiles(tmplPath)
	if err != nil {
		return nil, fmt.Errorf("failed to parse template %s: %w", name, err)
	}

	r.templates[name] = tmpl
	return tmpl, nil
}

// RenderFactLedger renders the fact ledger markdown
func (r *TemplateRenderer) RenderFactLedger(data FactLedgerData, outputPath string) error {
	tmpl, err := r.loadTemplate("fact_ledger_template.md")
	if err != nil {
		return err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return fmt.Errorf("failed to execute fact ledger template: %w", err)
	}

	return os.WriteFile(outputPath, buf.Bytes(), 0644)
}

// RenderEntityGraph renders the entity graph markdown
func (r *TemplateRenderer) RenderEntityGraph(data EntityGraphData, outputPath string) error {
	tmpl, err := r.loadTemplate("entity_graph_template.md")
	if err != nil {
		return err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return fmt.Errorf("failed to execute entity graph template: %w", err)
	}

	return os.WriteFile(outputPath, buf.Bytes(), 0644)
}

// RenderConflictReport renders the conflict report markdown
func (r *TemplateRenderer) RenderConflictReport(data ConflictReportData, outputPath string) error {
	tmpl, err := r.loadTemplate("conflict_report_template.md")
	if err != nil {
		return err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return fmt.Errorf("failed to execute conflict report template: %w", err)
	}

	return os.WriteFile(outputPath, buf.Bytes(), 0644)
}

// RenderSourceRatings renders the source ratings markdown
func (r *TemplateRenderer) RenderSourceRatings(data SourceRatingsData, outputPath string) error {
	tmpl, err := r.loadTemplate("source_ratings_template.md")
	if err != nil {
		return err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return fmt.Errorf("failed to execute source ratings template: %w", err)
	}

	return os.WriteFile(outputPath, buf.Bytes(), 0644)
}

// PrepareFactLedgerData prepares data from processing results
func PrepareFactLedgerData(result map[string]interface{}, startTime time.Time) FactLedgerData {
	facts, _ := result["facts"].([]logic.Fact)
	entities, _ := result["entities"].([]logic.Entity)
	
	// Categorize facts by confidence
	var highConf, mediumConf, lowConf []logic.Fact
	for _, fact := range facts {
		conf := strings.ToLower(fact.Confidence)
		if conf == "high" {
			highConf = append(highConf, fact)
		} else if conf == "medium" {
			mediumConf = append(mediumConf, fact)
		} else {
			lowConf = append(lowConf, fact)
		}
	}

	// Categorize entities by type
	var orgs, people, dates, locations, concepts []logic.Entity
	for _, entity := range entities {
		switch entity.Type {
		case "company":
			orgs = append(orgs, entity)
		case "person":
			people = append(people, entity)
		case "date":
			dates = append(dates, entity)
		case "location":
			locations = append(locations, entity)
		case "technology", "product", "market":
			concepts = append(concepts, entity)
		}
	}

	conflictCount, _ := result["conflict_count"].(int)
	fileCount, _ := result["file_count"].(int)

	return FactLedgerData{
		Timestamp:         time.Now().Format("2006-01-02 15:04:05"),
		ProcessingSeconds: time.Since(startTime).Seconds(),
		TotalFacts:        len(facts),
		TotalEntities:     len(entities),
		ConflictCount:     conflictCount,
		SourceCount:       0, // TODO: extract from facts
		RawFileCount:      fileCount,
		Facts:             facts,
		Entities:          entities,
		HighConfFacts:     highConf,
		MediumConfFacts:   mediumConf,
		LowConfFacts:      lowConf,
		Organizations:     orgs,
		People:            people,
		Dates:             dates,
		Locations:         locations,
		Concepts:          concepts,
	}
}

// PrepareEntityGraphData prepares entity graph data
func PrepareEntityGraphData(result map[string]interface{}) EntityGraphData {
	entities, _ := result["entities"].([]logic.Entity)
	relations, _ := result["relations"].([]logic.Relation)

	// Categorize entities
	var orgs, people, dates, locations, concepts []logic.Entity
	for _, entity := range entities {
		switch entity.Type {
		case "company":
			orgs = append(orgs, entity)
		case "person":
			people = append(people, entity)
		case "date":
			dates = append(dates, entity)
		case "location":
			locations = append(locations, entity)
		case "technology", "product", "market":
			concepts = append(concepts, entity)
		}
	}

	return EntityGraphData{
		Timestamp:      time.Now().Format("2006-01-02 15:04:05"),
		TotalEntities:  len(entities),
		UniqueEntities: len(entities), // TODO: calculate unique
		Entities:       entities,
		Relations:      relations,
		Organizations:  orgs,
		People:         people,
		Dates:          dates,
		Locations:      locations,
		Concepts:       concepts,
		OrgCount:       len(orgs),
		PersonCount:    len(people),
		DateCount:      len(dates),
		LocationCount:  len(locations),
		ConceptCount:   len(concepts),
	}
}

// PrepareConflictReportData prepares conflict report data
func PrepareConflictReportData(result map[string]interface{}) ConflictReportData {
	conflicts, _ := result["conflicts"].([]map[string]interface{})
	facts, _ := result["facts"].([]logic.Fact)

	var conflictInfos []ConflictInfo
	for i, conflict := range conflicts {
		fact1, _ := conflict["fact1"].(logic.Fact)
		fact2, _ := conflict["fact2"].(logic.Fact)
		conflictType, _ := conflict["type"].(string)
		description, _ := conflict["description"].(string)

		conflictInfos = append(conflictInfos, ConflictInfo{
			Index:       i + 1,
			Type:        conflictType,
			Severity:    "Medium", // TODO: calculate severity
			Status:      "Unresolved",
			Fact1:       fact1,
			Fact2:       fact2,
			Resolution:  "",
			Description: description,
		})
	}

	return ConflictReportData{
		Timestamp:       time.Now().Format("2006-01-02 15:04:05"),
		TotalFacts:      len(facts),
		ConflictCount:   len(conflicts),
		ResolvedCount:   0,
		UnresolvedCount: len(conflicts),
		Conflicts:       conflictInfos,
	}
}
