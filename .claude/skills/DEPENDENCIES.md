# Skills Dependencies and Workflow

This document maps the relationships and execution flow between research skills.

## Dependency Graph

```
┌─────────────────┐
│ question-refiner│ (Entry point)
└────────┬────────┘
         │ Produces structured prompt
         ├──────────────────┬─────────────────┐
         ▼                  ▼                 ▼
┌─────────────────┐  ┌──────────────┐  ┌──────────────┐
│research-executor│  │got-controller│  │ (Direct use) │
│  (Linear flow)  │  │ (Graph-based)│  │              │
└────────┬────────┘  └──────┬───────┘  └──────────────┘
         │                  │
         │ Deploys agents   │ Manages graph operations
         ├──────────────────┤
         ▼                  ▼
┌─────────────────────────────────────┐
│   Parallel Research Agents          │
│   (3-8 agents working simultaneously)│
└────────┬────────────────────────────┘
         │ All agents complete
         ▼
┌─────────────────┐
│  synthesizer    │ (Combines findings)
└────────┬────────┘
         │ Produces draft report
         ▼
┌─────────────────┐
│citation-validator│ (Final QA)
└────────┬────────┘
         │
         ▼
   Final Report
```

## Skill Relationships

### Primary Workflows

#### Workflow 1: Standard Research (Linear)

```
User Question
  → question-refiner (refine prompt)
  → research-executor (deploy agents)
  → synthesizer (combine findings)
  → citation-validator (verify quality)
  → Final Report
```

**Use when**: Standard research with clear scope

**Duration**: 20-30 minutes

#### Workflow 2: Complex Research (Graph-based)

```
User Question
  → question-refiner (refine prompt)
  → got-controller (manage graph exploration)
    ├─ Generate(k) → Multiple research paths
    ├─ Score → Evaluate quality
    ├─ Refine → Improve findings
    └─ Aggregate → Combine best paths
  → synthesizer (final synthesis)
  → citation-validator (verify quality)
  → Final Report
```

**Use when**: Complex, multi-faceted topics requiring strategic exploration

**Duration**: 30-60 minutes

#### Workflow 3: Quick Research (Simplified)

```
User Question
  → research-executor (skip refinement if clear)
  → synthesizer (lightweight synthesis)
  → Final Report (skip validation if low-stakes)
```

**Use when**: Quick lookups, narrow topics, low-stakes research

**Duration**: 10-15 minutes

### Skill Dependencies

| Skill | Depends On | Produces | Consumed By |
|-------|-----------|----------|-------------|
| question-refiner | None (entry point) | Structured prompt | research-executor, got-controller |
| research-executor | Structured prompt | Agent findings | synthesizer |
| got-controller | Structured prompt | Graph state, findings | synthesizer |
| synthesizer | Agent findings | Draft report | citation-validator |
| citation-validator | Draft report | Validated report | User (final output) |

### Shared Resources

All skills depend on:

- `.claude/shared/constants/source_quality_ratings.md`
- `.claude/shared/constants/token_optimization.md`
- `.claude/shared/constants/error_codes.md`
- `.claude/shared/templates/citation_format.md`

Skills that deploy agents also use:

- `.claude/shared/constants/agent_communication.md`
- `.claude/shared/templates/report_structure.md`

## Execution Patterns

### Pattern A: Sequential Execution

```python
# Each skill completes before next starts
result1 = question_refiner.run(user_question)
result2 = research_executor.run(result1)
result3 = synthesizer.run(result2)
result4 = citation_validator.run(result3)
return result4
```

**Pros**: Simple, predictable, easy to debug
**Cons**: Slower, no parallelism

### Pattern B: Parallel Agent Deployment

```python
# research-executor spawns multiple agents simultaneously
prompt = question_refiner.run(user_question)
agents = research_executor.spawn_agents(prompt, count=5)

# All agents run in parallel
results = await asyncio.gather(*[agent.run() for agent in agents])

# Then sequential synthesis and validation
synthesis = synthesizer.run(results)
final = citation_validator.run(synthesis)
return final
```

**Pros**: Faster, efficient use of resources
**Cons**: More complex coordination

### Pattern C: Graph Exploration (GoT)

```python
# got-controller manages iterative exploration
prompt = question_refiner.run(user_question)
controller = got_controller.initialize(prompt)

# Iterative graph operations
while not controller.is_complete():
    operation = controller.decide_next_operation()
    
    if operation == "Generate":
        nodes = controller.generate(k=3)  # Spawn 3 agents
    elif operation == "Aggregate":
        node = controller.aggregate(selected_nodes)
    elif operation == "Refine":
        node = controller.refine(target_node)
    
    controller.update_graph(nodes)

# Final synthesis
synthesis = synthesizer.run(controller.get_best_nodes())
final = citation_validator.run(synthesis)
return final
```

**Pros**: Adaptive, optimizes quality, handles complexity
**Cons**: Most complex, longer execution time

## Decision Matrix: Which Workflow?

| Scenario | Recommended Workflow | Skills Used |
|----------|---------------------|-------------|
| User asks vague question | Workflow 1 (Standard) | All 5 skills |
| User provides clear, narrow question | Workflow 3 (Quick) | executor → synthesizer |
| Complex, multi-faceted topic | Workflow 2 (Graph-based) | refiner → got-controller → synthesizer → validator |
| High-stakes research (publication) | Workflow 1 (Standard) | All 5 skills with extra validation |
| Quick fact-checking | Workflow 3 (Quick) | executor only |
| Exploratory research | Workflow 2 (Graph-based) | refiner → got-controller → synthesizer |

## Skill Invocation Examples

### Example 1: Market Research

```bash
# User: "Research AI in healthcare market"

# Step 1: Refine question
/refine-question "AI in healthcare market"
# Output: Structured prompt with TASK, CONTEXT, QUESTIONS, etc.

# Step 2: Execute research
/plan-research [structured_prompt]
# Output: Research plan with 5 agents

# Step 3: Deploy agents (automatic)
# Agents run in parallel, write to research_notes/

# Step 4: Synthesize findings
/synthesize-findings RESEARCH/ai_healthcare/
# Output: Draft report in full_report.md

# Step 5: Validate citations
/validate-citations RESEARCH/ai_healthcare/full_report.md
# Output: Validated report with quality score
```

### Example 2: Technical Comparison

```bash
# User: "Compare WebAssembly vs JavaScript performance"

# Step 1: Refine (optional if clear)
# Skip to execution

# Step 2: Execute research
/deep-research "WebAssembly vs JavaScript performance benchmarks"
# Automatically runs: executor → synthesizer → validator

# Output: Complete report in RESEARCH/wasm_vs_js/
```

### Example 3: Complex Academic Review

```bash
# User: "Review transformer architectures in AI"

# Step 1: Refine question
/refine-question "transformer architectures AI"
# Output: Structured prompt for literature review

# Step 2: Use GoT controller for complex exploration
# (Invoked automatically if topic complexity detected)
# got-controller manages iterative exploration

# Step 3: Synthesize findings
# synthesizer combines graph nodes

# Step 4: Validate citations
# citation-validator ensures academic rigor

# Output: Comprehensive literature review
```

## Performance Metrics

| Workflow | Avg Duration | Skills Used | Token Usage | Success Rate |
|----------|-------------|-------------|-------------|--------------|
| Quick | 10-15 min | 2 skills | ~20k tokens | 85% |
| Standard | 20-30 min | 4-5 skills | ~50k tokens | 92% |
| Graph-based | 30-60 min | 4-5 skills | ~80k tokens | 95% |

## Troubleshooting

### Skill Fails to Start

**Symptom**: Skill doesn't execute or returns error immediately

**Check**:

1. Dependencies satisfied? (e.g., synthesizer needs agent findings)
2. Input format correct? (e.g., structured prompt for executor)
3. File permissions? (can write to RESEARCH/ directory)

**Solution**: Review error code in `.claude/shared/constants/error_codes.md`

### Skill Timeout

**Symptom**: Skill exceeds max execution time

**Common causes**:

- research-executor: Too many agents or large documents
- got-controller: Too many iterations
- synthesizer: Too many findings to combine

**Solution**:

- Reduce agent count
- Use token optimization pipeline
- Apply hierarchical synthesis

### Quality Score Too Low

**Symptom**: Output scores <8.0, fails validation

**Common causes**:

- Low-quality sources (D/E rated)
- Missing citations
- Contradictions unresolved

**Solution**:

- Refine with better sources
- Add missing citations
- Document contradictions explicitly

## Best Practices

1. **Always start with question-refiner** for vague questions
2. **Use got-controller** for complex, exploratory research
3. **Always end with citation-validator** for high-stakes research
4. **Monitor token usage** throughout workflow
5. **Checkpoint state** for long-running research
6. **Review error logs** if any skill fails
