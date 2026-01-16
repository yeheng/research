---
description: Execute comprehensive deep research workflow using the refactored agent-based architecture
argument-hint: [research topic or question]
allowed-tools: Task, WebSearch, WebFetch, mcp__web_reader__webReader, Read, Write, TodoWrite, Skill
---

# Deep Research Command (v2.1 - Phase Agent Architecture)

Execute the complete 7-phase deep research workflow using the **Phase Agent Architecture** with specialized agents for each research phase.

## Research Topic

$ARGUMENTS

---

## Architecture Overview (v2.1)

```
User → deep-research command
       ↓
   question-refiner skill → structured prompt
       ↓
   research-planner skill → execution plan (OPTIONAL)
       ↓
   research-executor skill → validates & invokes general-purpose agent (with coordinator workflow)
       ↓
   general-purpose agent → executes 7-phase research workflow
       ↓
   RESEARCH/[topic]/ → final output
```

**v2.1 Architecture**:
- Skills are thin wrappers that delegate to built-in agents
- General-purpose agent executes the 7-phase workflow (coordinator pattern embedded in prompt)
- Each phase handles specific research tasks
- UnifiedStateManager (SQLite) tracks all state
- MCP tools for standardized data processing

**IMPORTANT**: The framework uses Claude Code's built-in `general-purpose` agent type, NOT custom agent types like `coordinator` or `phase-N-name`. The phase workflow is implemented through prompt instructions, not custom agent types.

---

## Pre-Execution Check

### 1. Incremental Research Detection

**Check for existing research**:

```bash
ls -la RESEARCH/ 2>/dev/null || echo "No existing research"
```

**If research exists for this topic**:

| Mode | Action | Use When |
|------|--------|----------|
| **Update** | Refresh with latest info | Data needs updating |
| **Expand** | Add new subtopics | Scope needs expansion |
| **Restart** | Archive old, start fresh | Complete redo needed |

Ask user which mode before proceeding.

---

## Refactored Workflow

### Phase 0: Question Refinement (skill-based)

**Use `question-refiner` skill**:

```markdown
Invoke question-refiner to transform raw question into structured prompt:

1. **Research Type Detection** (automatic)
   - Exploratory, Comparative, Problem-Solving, etc.

2. **Progressive Questioning** (3-5 core questions)
   - Specific focus areas
   - Output format requirements
   - Target audience
   - Scope limitations

3. **Structured Prompt Generation** (validated)
   - TASK: Clear research objective
   - CONTEXT: Background and significance
   - SPECIFIC_QUESTIONS: 3-7 concrete sub-questions
   - KEYWORDS: Search terms + synonyms
   - CONSTRAINTS: Time, geography, sources
   - OUTPUT_FORMAT: Deliverable specs
   - QUALITY_METRICS: Completeness, specificity scores

4. **Output Validation** (automatic)
   - JSON schema validation
   - Quality score >= 8.0 required
   - Automatic refinement if needed
```

**Output**: Validated structured research prompt

---

### Phase 0.5: Research Planning (OPTIONAL)

**Use `research-planner` skill**:

```markdown
Optionally generate detailed execution plan before committing:

Ask user: "Would you like to review the research plan before execution?"

If yes:
1. Invoke research-planner with structured prompt
2. Generate plan with:
   - Subtopic decomposition (3-7 subtopics)
   - Search strategies (3-5 queries per subtopic)
   - Agent deployment configuration
   - Resource estimation (time, cost, tokens)
   - Quality gates
3. Present plan to user for approval
4. Allow modifications if requested
```

**Output**: Approved execution plan (optional)

**Benefits**:
- User understands what will be researched
- Transparent resource estimates
- Can modify before committing
- Strategic review opportunity

---

### Phase 1-7: Research Execution (Phase Agent Architecture)

**Use `research-executor` skill -> `general-purpose` agent (with embedded coordinator workflow)**:

```markdown
Invoke research-executor with structured prompt:

The skill will:
1. Validate prompt completeness
2. Prepare agent context with coordinator workflow instructions
3. Invoke general-purpose agent with embedded workflow
4. Monitor progress
5. Return results

The general-purpose agent will autonomously execute the 7-phase workflow:
├── Phase 1: Question Refinement
│   └─ Output: research_notes/refined_question.md
├── Phase 2: Research Planning
│   └─ Output: research_notes/research_plan.md
├── Phase 3: Multi-Agent Deployment
│   └─ Output: raw/agent_*.md (multiple files)
├── Phase 4: Source Processing
│   └─ Output: processed/fact_ledger.md, entity_graph.md, conflict_report.md
├── Phase 5: Knowledge Synthesis
│   └─ Output: drafts/synthesis.md
├── Phase 6: Validation
│   └─ Output: drafts/validated_report.md
└── Phase 7: Output Generation
    └─ Output: Final deliverables
```

**Key Implementation Detail**: The 7-phase workflow is implemented via prompt instructions to the `general-purpose` agent, NOT through custom agent types. The agent definitions in `.claude/agents/` serve as documentation and reference for the workflow structure.

---

## Phase Agent Details

### Phase 1: Refinement (phase-1-refinement)
- Validates structured question
- Ensures completeness
- Quality scoring

### Phase 2: Planning (phase-2-planning)
- Subtopic decomposition
- Search strategy generation
- Agent deployment planning

### Phase 3: Execution (phase-3-execution)
- Deploys 3-8 parallel research agents
- Collects raw findings
- Handles agent failures

### Phase 4: Processing (phase-4-processing)
- Fact extraction via MCP tools
- Entity extraction
- Conflict detection
- Source quality rating

### Phase 5: Synthesis (phase-5-synthesis)
- Aggregates findings
- Resolves contradictions
- Generates coherent narrative

### Phase 6: Validation (phase-6-validation)
- Citation verification
- Red-team adversarial review
- Confidence scoring

### Phase 7: Output (phase-7-output)
- Generates final deliverables
- Formats reports
- Creates bibliography

---

## Supporting Agents

### synthesizer-agent
- Aggregates findings from multiple sources
- Builds consensus narratives
- Resolves contradictions

### red-team-agent
- Adversarial validation
- Counter-evidence search
- Bias detection

### got-agent
- Graph of Thoughts optimization
- Path scoring and pruning
- Quality-driven exploration

### ontology-scout-agent
- Domain reconnaissance
- Terminology mapping
- Taxonomy building

---

## MCP Tools Used

### Core Tools (5)
- `mcp__deep-research__fact-extract`: Extract atomic facts
- `mcp__deep-research__entity-extract`: Named entity recognition
- `mcp__deep-research__citation-validate`: Verify citations
- `mcp__deep-research__source-rate`: A-E quality ratings
- `mcp__deep-research__conflict-detect`: Find contradictions

### Batch Tools (5)
- `mcp__deep-research__batch-fact-extract`
- `mcp__deep-research__batch-entity-extract`
- `mcp__deep-research__batch-citation-validate`
- `mcp__deep-research__batch-source-rate`
- `mcp__deep-research__batch-conflict-detect`

### State Management Tools (11)
- `mcp__deep-research__create_research_session`
- `mcp__deep-research__update_session_status`
- `mcp__deep-research__get_session_info`
- `mcp__deep-research__log_activity`
- `mcp__deep-research__render_progress`
- `mcp__deep-research__register_agent`
- `mcp__deep-research__update_agent_status`
- `mcp__deep-research__get_active_agents`
- `mcp__deep-research__update_current_phase`
- `mcp__deep-research__get_current_phase`
- `mcp__deep-research__checkpoint_phase`

---

## Output Structure

```
RESEARCH/[topic]/
├── README.md                    # Overview and navigation
├── executive_summary.md         # 1-2 page summary
├── full_report.md               # Complete report
├── data/
│   ├── raw/                     # Original fetched content
│   ├── processed/               # Cleaned content
│   ├── statistics.md            # Key numbers
│   └── ontology/                # Domain taxonomy (if generated)
│       └── taxonomy.json
├── sources/
│   ├── bibliography.md          # Complete citations
│   ├── source_quality_table.md  # A-E ratings
│   └── citation_validation.md   # Validation report
├── research_notes/
│   ├── agent_findings_summary.md
│   ├── refined_question.md
│   ├── research_plan.md
│   └── agent_status.json        # Execution metadata
└── appendices/
    ├── methodology.md
    ├── limitations.md
    └── got_graph.json           # GoT graph state (if used)
```

---

## Graph of Thoughts (Optional Enhancement)

**When to use**:
- Topic has multiple valid exploration paths
- Quality optimization important
- Budget allows iterative refinement

**How it works**:
1. Coordinator detects complexity
2. Invokes got-agent for path optimization
3. GoT operations: Generate, Score, Aggregate, Refine, Prune
4. Continues until quality threshold reached or budget exhausted

**Operations**:
| Operation | Purpose | Example |
|-----------|---------|---------|
| Generate(k) | Create k parallel paths | Explore 4 different angles |
| Score | Rate quality (0-10) | Citation quality, completeness |
| Aggregate(k) | Merge k paths | Combine 3 best findings |
| Refine(1) | Improve path | Enhance quality of promising path |
| KeepBestN(n) | Prune to top n | Keep top 3, discard rest |

---

## Citation Requirements

**Every factual claim must include**:
1. ✅ Author/Organization name
2. ✅ Publication date
3. ✅ Source title
4. ✅ Direct URL/DOI
5. ✅ Page numbers (if applicable)

**Source Quality Ratings (A-E)**:
- **A**: Peer-reviewed, systematic reviews, RCTs
- **B**: Industry reports, reputable analysts
- **C**: News, expert opinion
- **D**: Blogs, preliminary research
- **E**: Anecdotal, theoretical

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Citation coverage | 100% |
| Citation completeness | 100% |
| Citation accuracy | >= 95% |
| Source quality average | B or higher |
| Hallucination count | 0 |
| Overall quality score | >= 8/10 |

---

## Architecture Evolution

### v1.0 (Original)
- ❌ Monolithic skills with embedded logic
- ❌ Direct agent deployment from skills
- ❌ Manual state management

### v2.0 (Refactored)
- ✅ Thin skill wrappers + orchestrator agent
- ✅ Orchestrator agent manages all phases
- ✅ Centralized StateManager

### v2.1 (Current - Phase Agent Architecture)
- ✅ Thin skill wrappers + general-purpose agent with embedded workflow
- ✅ 7-phase workflow implemented via prompt instructions
- ✅ Agent definitions in `.claude/agents/` serve as documentation/reference
- ✅ UnifiedStateManager (SQLite) as single source of truth
- ✅ TokenBudgetManager for budget enforcement
- ✅ RecoveryHandler for checkpoint recovery
- ✅ Enhanced separation of concerns
- ✅ Uses Claude Code built-in agent types (general-purpose, Explore, etc.)

**IMPORTANT NOTE**: The framework uses Claude Code's built-in `general-purpose` agent type to execute the research workflow. Custom agent types like `coordinator`, `phase-1-refinement`, etc. are NOT actual agent types - they are workflow definitions and documentation stored in `.claude/agents/` for reference.

---

## Error Handling

**Skill-Level Errors**:
- E001: Incomplete prompt → Request clarification
- E002: Agent deployment failed → Retry with fallback
- E003: Execution timeout → Return partial results
- E004: Quality below threshold → Trigger refinement

**Workflow-Level Errors** (handled by general-purpose agent):
- Phase failure detection
- Automatic recovery strategies
- Quality gate enforcement
- Checkpoint-based recovery

---

**Begin Phase Agent deep research workflow.**
