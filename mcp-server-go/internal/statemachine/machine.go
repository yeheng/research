package statemachine

import (
	"deep-research-mcp/internal/got"
	"fmt"
)

type ResearchStateMachine struct {
	MaxIterations       int
	ConfidenceThreshold float64
}

func NewResearchStateMachine(maxIterations int, confidenceThreshold float64) *ResearchStateMachine {
	if maxIterations == 0 {
		maxIterations = 10
	}
	if confidenceThreshold == 0 {
		confidenceThreshold = 0.9
	}

	return &ResearchStateMachine{
		MaxIterations:       maxIterations,
		ConfidenceThreshold: confidenceThreshold,
	}
}

// GetNextAction determines the next action based on current state
func (sm *ResearchStateMachine) GetNextAction(state got.GraphState) got.NextAction {
	// Rule 1: Check termination conditions first
	if sm.shouldTerminate(state) {
		return got.NextAction{
			Action:    "synthesize",
			Params:    map[string]interface{}{},
			Reasoning: sm.getTerminationReason(state),
		}
	}

	// Rule 2: If no paths exist, generate initial paths
	if len(state.Paths) == 0 {
		return got.NextAction{
			Action:    "generate",
			Params:    map[string]interface{}{"k": 3, "strategy": "diverse"},
			Reasoning: "No paths exist, generating initial exploration paths",
		}
	}

	// Rule 3: If there are running paths, wait for them to complete
	var runningPaths []string
	for _, p := range state.Paths {
		if p.Status == "running" {
			runningPaths = append(runningPaths, p.ID)
		}
	}
	if len(runningPaths) > 0 {
		return got.NextAction{
			Action:    "wait",
			Params:    map[string]interface{}{"path_ids": runningPaths},
			Reasoning: fmt.Sprintf("%d paths still running, waiting for completion", len(runningPaths)),
		}
	}

	// Rule 4: If there are pending paths, execute them
	var pendingPaths []string
	for _, p := range state.Paths {
		if p.Status == "pending" {
			pendingPaths = append(pendingPaths, p.ID)
		}
	}
	if len(pendingPaths) > 0 {
		return got.NextAction{
			Action:    "execute",
			Params:    map[string]interface{}{"path_ids": pendingPaths},
			Reasoning: fmt.Sprintf("%d pending paths detected, deploying workers", len(pendingPaths)),
		}
	}

	// Rule 5: If there are completed but unscored paths, score them
	var unscoredPaths []string
	for _, p := range state.Paths {
		if p.Status == "completed" && p.Score == 0 {
			unscoredPaths = append(unscoredPaths, p.ID)
		}
	}
	if len(unscoredPaths) > 0 {
		return got.NextAction{
			Action:    "score",
			Params:    map[string]interface{}{"threshold": 6.0, "keep_top_n": 2},
			Reasoning: fmt.Sprintf("%d completed paths need scoring and pruning", len(unscoredPaths)),
		}
	}

	// Rule 6: If there are multiple high-quality paths and not yet aggregated, aggregate
	var highQualityPaths []string
	for _, p := range state.Paths {
		if p.Score >= 7.0 {
			highQualityPaths = append(highQualityPaths, p.ID)
		}
	}
	if len(highQualityPaths) > 1 && !state.Aggregated {
		return got.NextAction{
			Action:    "aggregate",
			Params:    map[string]interface{}{"path_ids": highQualityPaths, "strategy": "synthesis"},
			Reasoning: fmt.Sprintf("%d high-quality paths ready for aggregation", len(highQualityPaths)),
		}
	}

	// Rule 7: If confidence is still low, generate new paths with refined focus
	if state.Confidence < sm.ConfidenceThreshold {
		return got.NextAction{
			Action:    "generate",
			Params:    map[string]interface{}{"k": 2, "strategy": "focused", "context": state.CurrentFindings},
			Reasoning: fmt.Sprintf("Confidence %.2f below threshold, continuing exploration", state.Confidence),
		}
	}

	// Fallback: synthesize what we have
	return got.NextAction{
		Action:    "synthesize",
		Params:    map[string]interface{}{},
		Reasoning: "All paths explored, ready to synthesize final report",
	}
}

func (sm *ResearchStateMachine) shouldTerminate(state got.GraphState) bool {
	if state.Confidence >= sm.ConfidenceThreshold {
		return true
	}
	if state.Iteration >= sm.MaxIterations {
		return true
	}
	if state.BudgetExhausted {
		return true
	}
	return false
}

func (sm *ResearchStateMachine) getTerminationReason(state got.GraphState) string {
	if state.Confidence >= sm.ConfidenceThreshold {
		return fmt.Sprintf("Confidence threshold reached (%.2f >= %.2f)", state.Confidence, sm.ConfidenceThreshold)
	}
	if state.Iteration >= sm.MaxIterations {
		return fmt.Sprintf("Max iterations reached (%d/%d)", state.Iteration, sm.MaxIterations)
	}
	if state.BudgetExhausted {
		return "Budget exhausted, terminating early"
	}
	return "Termination condition met"
}
