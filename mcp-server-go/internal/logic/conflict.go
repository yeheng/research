package logic

import (
	"math"
	"regexp"
	"strconv"
	"strings"
)

// ConflictType represents the type of conflict
type ConflictType string

const (
	ConflictTypeContradiction   ConflictType = "contradiction"
	ConflictTypeInconsistency   ConflictType = "inconsistency"
	ConflictTypeTemporalMismatch ConflictType = "temporal_mismatch"
	ConflictTypeSourceDisagreement ConflictType = "source_disagreement"
)

// ConflictSeverity represents the severity of a conflict
type ConflictSeverity string

const (
	SeverityLow    ConflictSeverity = "low"
	SeverityMedium ConflictSeverity = "medium"
	SeverityHigh   ConflictSeverity = "high"
)

// Conflict represents a detected conflict between two facts
type Conflict struct {
	ID          string           `json:"id"`
	FactA       Fact             `json:"fact_a"`
	FactB       Fact             `json:"fact_b"`
	Type        ConflictType     `json:"conflict_type"`
	Severity    ConflictSeverity `json:"severity"`
	Confidence  float64          `json:"confidence"`
	Description string           `json:"description"`
	Resolution  *Resolution      `json:"resolution,omitempty"`
}

// Resolution represents a suggested resolution for a conflict
type Resolution struct {
	Strategy      string `json:"strategy"`
	PreferredFact string `json:"preferred_fact"` // "a", "b", or "neither"
	Reasoning     string `json:"reasoning"`
}

// ConflictTolerance defines tolerance settings for conflict detection
type ConflictTolerance struct {
	NumericTolerance   float64 `json:"numeric_tolerance"`    // Percentage difference allowed (e.g., 0.1 = 10%)
	DateToleranceDays  int     `json:"date_tolerance_days"`  // Days difference allowed
	IgnoreLowConfidence bool   `json:"ignore_low_confidence"`
}

// DefaultTolerance returns default tolerance settings
func DefaultTolerance() ConflictTolerance {
	return ConflictTolerance{
		NumericTolerance:   0.1,
		DateToleranceDays:  30,
		IgnoreLowConfidence: true,
	}
}

// DetectConflicts finds conflicts between a set of facts
func DetectConflicts(facts []Fact, tolerance ConflictTolerance) []Conflict {
	var conflicts []Conflict
	conflictID := 0

	// Group facts by entity for efficient comparison
	factsByEntity := make(map[string][]Fact)
	for _, fact := range facts {
		normalizedEntity := strings.ToLower(strings.TrimSpace(fact.Entity))
		factsByEntity[normalizedEntity] = append(factsByEntity[normalizedEntity], fact)
	}

	// Compare facts within each entity group
	for _, entityFacts := range factsByEntity {
		for i := 0; i < len(entityFacts); i++ {
			for j := i + 1; j < len(entityFacts); j++ {
				factA := entityFacts[i]
				factB := entityFacts[j]

				// Skip if both are low confidence and tolerance says to ignore
				if tolerance.IgnoreLowConfidence {
					if factA.Confidence == "Low" && factB.Confidence == "Low" {
						continue
					}
				}

				// Check for conflicts
				if conflict := detectPairConflict(factA, factB, tolerance, conflictID); conflict != nil {
					conflicts = append(conflicts, *conflict)
					conflictID++
				}
			}
		}
	}

	// Also check for cross-entity conflicts (same attribute, different values)
	conflicts = append(conflicts, detectCrossEntityConflicts(facts, tolerance, &conflictID)...)

	return conflicts
}

// detectPairConflict checks if two facts conflict
func detectPairConflict(factA, factB Fact, tolerance ConflictTolerance, id int) *Conflict {
	// Same entity and attribute but different values
	if strings.EqualFold(factA.Attribute, factB.Attribute) {
		valueA := strings.TrimSpace(factA.Value)
		valueB := strings.TrimSpace(factB.Value)

		// Skip if values are identical
		if strings.EqualFold(valueA, valueB) {
			return nil
		}

		// Check for numeric conflicts
		if factA.ValueType == "number" || factA.ValueType == "currency" ||
			factB.ValueType == "number" || factB.ValueType == "currency" {
			if conflict := checkNumericConflict(factA, factB, tolerance, id); conflict != nil {
				return conflict
			}
		}

		// Check for temporal conflicts
		if factA.ValueType == "date" || factB.ValueType == "date" {
			if conflict := checkTemporalConflict(factA, factB, tolerance, id); conflict != nil {
				return conflict
			}
		}

		// Check for text contradictions
		if isContradictory(valueA, valueB) {
			return &Conflict{
				ID:          strconv.Itoa(id),
				FactA:       factA,
				FactB:       factB,
				Type:        ConflictTypeContradiction,
				Severity:    calculateSeverity(factA, factB),
				Confidence:  0.7,
				Description: "Facts have contradictory values for the same attribute",
				Resolution:  suggestResolution(factA, factB),
			}
		}

		// If same attribute but different values, it's at least an inconsistency
		if factA.Attribute == factB.Attribute && valueA != valueB {
			return &Conflict{
				ID:          strconv.Itoa(id),
				FactA:       factA,
				FactB:       factB,
				Type:        ConflictTypeInconsistency,
				Severity:    SeverityMedium,
				Confidence:  0.5,
				Description: "Facts have different values for the same entity-attribute pair",
				Resolution:  suggestResolution(factA, factB),
			}
		}
	}

	return nil
}

// checkNumericConflict checks for numeric value conflicts
func checkNumericConflict(factA, factB Fact, tolerance ConflictTolerance, id int) *Conflict {
	numA := extractNumericValue(factA.Value)
	numB := extractNumericValue(factB.Value)

	if numA == 0 || numB == 0 {
		return nil
	}

	// Calculate percentage difference
	diff := math.Abs(numA-numB) / math.Max(numA, numB)

	if diff > tolerance.NumericTolerance {
		severity := SeverityMedium
		if diff > 0.5 {
			severity = SeverityHigh
		} else if diff < 0.2 {
			severity = SeverityLow
		}

		return &Conflict{
			ID:          strconv.Itoa(id),
			FactA:       factA,
			FactB:       factB,
			Type:        ConflictTypeContradiction,
			Severity:    severity,
			Confidence:  0.8,
			Description: "Numeric values differ significantly",
			Resolution:  suggestResolution(factA, factB),
		}
	}

	return nil
}

// checkTemporalConflict checks for date/time conflicts
func checkTemporalConflict(factA, factB Fact, tolerance ConflictTolerance, id int) *Conflict {
	// Simple year extraction for now
	yearA := extractYear(factA.Value)
	yearB := extractYear(factB.Value)

	if yearA == 0 || yearB == 0 {
		return nil
	}

	// If years differ by more than tolerance
	daysDiff := math.Abs(float64(yearA-yearB)) * 365
	if daysDiff > float64(tolerance.DateToleranceDays) {
		return &Conflict{
			ID:          strconv.Itoa(id),
			FactA:       factA,
			FactB:       factB,
			Type:        ConflictTypeTemporalMismatch,
			Severity:    SeverityMedium,
			Confidence:  0.7,
			Description: "Temporal values are inconsistent",
			Resolution:  suggestResolution(factA, factB),
		}
	}

	return nil
}

// detectCrossEntityConflicts finds conflicts across different entities
func detectCrossEntityConflicts(facts []Fact, tolerance ConflictTolerance, idPtr *int) []Conflict {
	var conflicts []Conflict

	// Group facts by source for source disagreement detection
	factsBySource := make(map[string][]Fact)
	for _, fact := range facts {
		sourceKey := fact.Source.URL
		if sourceKey == "" {
			sourceKey = fact.Source.Title
		}
		if sourceKey != "" {
			factsBySource[sourceKey] = append(factsBySource[sourceKey], fact)
		}
	}

	// Check for same claim from different sources with different values
	for _, sourceFacts := range factsBySource {
		for _, otherFacts := range factsBySource {
			if len(sourceFacts) == 0 || len(otherFacts) == 0 {
				continue
			}
			if sourceFacts[0].Source.URL == otherFacts[0].Source.URL {
				continue
			}

			// Check if different sources report conflicting information
			for _, factA := range sourceFacts {
				for _, factB := range otherFacts {
					if strings.EqualFold(factA.Entity, factB.Entity) &&
						strings.EqualFold(factA.Attribute, factB.Attribute) &&
						!strings.EqualFold(factA.Value, factB.Value) {
						*idPtr++
						conflicts = append(conflicts, Conflict{
							ID:          strconv.Itoa(*idPtr),
							FactA:       factA,
							FactB:       factB,
							Type:        ConflictTypeSourceDisagreement,
							Severity:    SeverityMedium,
							Confidence:  0.6,
							Description: "Different sources report conflicting information",
							Resolution:  suggestResolution(factA, factB),
						})
					}
				}
			}
		}
	}

	return conflicts
}

// extractNumericValue extracts a numeric value from a string
func extractNumericValue(s string) float64 {
	// Remove common prefixes/suffixes
	s = strings.ReplaceAll(s, "$", "")
	s = strings.ReplaceAll(s, "%", "")
	s = strings.ReplaceAll(s, ",", "")

	// Handle multipliers
	multiplier := 1.0
	sLower := strings.ToLower(s)
	if strings.Contains(sLower, "billion") || strings.Contains(sLower, "b") {
		multiplier = 1e9
	} else if strings.Contains(sLower, "million") || strings.Contains(sLower, "m") {
		multiplier = 1e6
	} else if strings.Contains(sLower, "thousand") || strings.Contains(sLower, "k") {
		multiplier = 1e3
	}

	// Extract the first number
	re := regexp.MustCompile(`[\d.]+`)
	match := re.FindString(s)
	if match != "" {
		if num, err := strconv.ParseFloat(match, 64); err == nil {
			return num * multiplier
		}
	}

	return 0
}

// extractYear extracts a year from a string
func extractYear(s string) int {
	re := regexp.MustCompile(`\b(19|20)\d{2}\b`)
	match := re.FindString(s)
	if match != "" {
		year, _ := strconv.Atoi(match)
		return year
	}
	return 0
}

// isContradictory checks if two text values are likely contradictory
func isContradictory(a, b string) bool {
	// Common negation patterns
	negations := [][]string{
		{"increase", "decrease"},
		{"grow", "shrink"},
		{"rise", "fall"},
		{"up", "down"},
		{"positive", "negative"},
		{"yes", "no"},
		{"true", "false"},
		{"success", "failure"},
		{"win", "lose"},
		{"gain", "loss"},
	}

	aLower := strings.ToLower(a)
	bLower := strings.ToLower(b)

	for _, pair := range negations {
		if (strings.Contains(aLower, pair[0]) && strings.Contains(bLower, pair[1])) ||
			(strings.Contains(aLower, pair[1]) && strings.Contains(bLower, pair[0])) {
			return true
		}
	}

	return false
}

// calculateSeverity determines conflict severity based on fact confidence
func calculateSeverity(factA, factB Fact) ConflictSeverity {
	// Higher confidence facts = higher severity when they conflict
	confA := confidenceToNum(factA.Confidence)
	confB := confidenceToNum(factB.Confidence)

	avgConf := (confA + confB) / 2

	if avgConf > 0.7 {
		return SeverityHigh
	} else if avgConf > 0.4 {
		return SeverityMedium
	}
	return SeverityLow
}

func confidenceToNum(conf string) float64 {
	switch strings.ToLower(conf) {
	case "high":
		return 1.0
	case "medium":
		return 0.5
	case "low":
		return 0.2
	default:
		return 0.5
	}
}

// suggestResolution provides a resolution suggestion based on source quality
func suggestResolution(factA, factB Fact) *Resolution {
	qualityA := sourceQualityToNum(factA.Source.Quality)
	qualityB := sourceQualityToNum(factB.Source.Quality)

	if qualityA > qualityB {
		return &Resolution{
			Strategy:      "prefer_higher_quality",
			PreferredFact: "a",
			Reasoning:     "Fact A comes from a higher quality source",
		}
	} else if qualityB > qualityA {
		return &Resolution{
			Strategy:      "prefer_higher_quality",
			PreferredFact: "b",
			Reasoning:     "Fact B comes from a higher quality source",
		}
	}

	// If same quality, check confidence
	confA := confidenceToNum(factA.Confidence)
	confB := confidenceToNum(factB.Confidence)

	if confA > confB {
		return &Resolution{
			Strategy:      "prefer_higher_confidence",
			PreferredFact: "a",
			Reasoning:     "Fact A has higher confidence",
		}
	} else if confB > confA {
		return &Resolution{
			Strategy:      "prefer_higher_confidence",
			PreferredFact: "b",
			Reasoning:     "Fact B has higher confidence",
		}
	}

	return &Resolution{
		Strategy:      "manual_review",
		PreferredFact: "neither",
		Reasoning:     "Both facts have similar credibility, manual review recommended",
	}
}

func sourceQualityToNum(quality string) float64 {
	switch strings.ToUpper(quality) {
	case "A":
		return 1.0
	case "B":
		return 0.8
	case "C":
		return 0.6
	case "D":
		return 0.4
	case "E":
		return 0.2
	default:
		return 0.5
	}
}
