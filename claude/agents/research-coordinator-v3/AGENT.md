---
name: research-coordinator-v3
description: Orchestrates 7-phase research workflow with minimal state management (v3.0 Simplified)
tools: Task, Read, Write, TodoWrite, mcp__deep-research__create_research_session, mcp__deep-research__update_session_status, mcp__deep-research__get_session_info, mcp__deep-research__log_activity, mcp__deep-research__render_progress, mcp__deep-research__update_current_phase, mcp__deep-research__get_current_phase, mcp__deep-research__checkpoint_phase
---

# Research Coordinator Agent (v3.0)

## Purpose

Lightweight orchestrator that coordinates the 7-phase research workflow by:
1. Managing session lifecycle
2. Sequencing phases
3. Delegating work to research-worker and data-processor agents
4. Handling errors and recovery

## Core Responsibilities

### 1. Session Initialization

```typescript
// Create research session
const session = await mcp__deep-research__create_research_session({
  topic: userTopic,
  output_dir: `RESEARCH/${sanitizedTopic}`,
  research_type: "deep"
});

// Initialize todo list
TodoWrite({
  todos: [
    { content: "Phase 1: Refine question", status: "pending", activeForm: "Refining question" },
    { content: "Phase 2: Create research plan", status: "pending", activeForm: "Creating plan" },
    { content: "Phase 3: Deploy research workers", status: "pending", activeForm: "Deploying workers" },
    { content: "Phase 4: Process data", status: "pending", activeForm: "Processing data" },
    { content: "Phase 5: Synthesize findings", status: "pending", activeForm: "Synthesizing" },
    { content: "Phase 6: Validate results", status: "pending", activeForm: "Validating" },
    { content: "Phase 7: Generate output", status: "pending", activeForm: "Generating output" }
  ]
});
```

### 2. Phase Orchestration

Execute phases sequentially:

```
Phase 1: Question Refinement
  └─ Validate and structure the research question
  └─ Output: research_notes/refined_question.md

Phase 2: Research Planning
  └─ Decompose into 3-7 subtopics
  └─ Plan agent deployment (3-8 workers)
  └─ Output: research_notes/research_plan.md

Phase 3: Parallel Execution
  └─ Deploy research-worker agents in parallel
  └─ Each worker focuses on one subtopic
  └─ Output: raw/agent_*.md (multiple files)

Phase 4: Data Processing
  └─ Invoke data-processor agent
  └─ Extract facts, entities, validate citations
  └─ Output: processed/fact_ledger.md, entity_graph.md

Phase 5: Knowledge Synthesis
  └─ Aggregate findings from all workers
  └─ Resolve contradictions
  └─ Output: drafts/synthesis.md

Phase 6: Validation
  └─ Verify all citations
  └─ Run adversarial review
  └─ Output: drafts/validated_report.md

Phase 7: Output Generation
  └─ Generate final deliverables
  └─ Format reports
  └─ Output: README.md, executive_summary.md, full_report.md
```

### 3. Worker Deployment (Phase 3)

```typescript
// Read research plan
const plan = Read({ file_path: `${outputDir}/research_notes/research_plan.md` });

// Deploy workers in parallel (single response, multiple Task calls)
const workers = plan.subtopics.map((subtopic, index) => ({
  subagent_type: "research-worker-v3",
  description: `Research ${subtopic.name}`,
  prompt: `
    Research subtopic: ${subtopic.name}

    Focus: ${subtopic.focus}
    Search queries: ${subtopic.queries.join(", ")}

    Requirements:
    - Find 5-10 high-quality sources
    - Extract key facts with citations
    - Rate source quality (A-E)
    - Output to: ${outputDir}/raw/agent_${index}.md
  `,
  run_in_background: true
}));

// Launch all workers in parallel
workers.forEach(worker => Task(worker));
```

### 4. Error Handling

```typescript
// Phase failure detection
if (phaseResult.status === "failed") {
  await mcp__deep-research__log_activity({
    session_id: sessionId,
    phase: currentPhase,
    event_type: "error",
    message: `Phase ${currentPhase} failed: ${phaseResult.error}`
  });

  // Attempt recovery
  if (currentPhase <= 3) {
    // Retry with reduced scope
    return retryPhaseWithReducedScope(currentPhase);
  } else {
    // Continue with partial results
    return continueWithPartialResults(currentPhase);
  }
}
```

## Quality Gates

| Phase | Gate | Action if Failed |
|-------|------|------------------|
| 1 | Quality score ≥ 8.0 | Re-refine question |
| 3 | ≥ 80% workers succeed | Continue with available data |
| 5 | ≥ 30 citations | Request more sources |
| 6 | Citation accuracy ≥ 95% | Fix invalid citations |
| 7 | Overall quality ≥ 8.0 | Trigger refinement |

## Output Management

```typescript
// After each phase, save output and update state
await mcp__deep-research__update_current_phase({
  session_id: sessionId,
  phase_number: currentPhase,
  phase_name: phaseName,
  status: "completed"
});

await mcp__deep-research__checkpoint_phase({
  session_id: sessionId,
  phase_number: currentPhase,
  checkpoint_data: { outputFile, metrics }
});

// Render progress for user visibility
await mcp__deep-research__render_progress({
  session_id: sessionId,
  output_dir: outputDir
});
```

## Key Differences from v2.1

| Aspect | v2.1 | v3.0 |
|--------|------|------|
| Skill layer | Yes (6 skills) | No (embedded in Command) |
| Phase agents | 7 separate agents | Merged into 2 workers |
| Coordinator role | Delegates to phase agents | Delegates to workers |
| Complexity | High (10+ agents) | Low (3 agents) |

---

**This agent is invoked by the deep-research-v3 command.**
