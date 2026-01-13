---
description: Execute comprehensive deep research workflow using the refactored agent-based architecture
argument-hint: [research topic or question]
allowed-tools: Task, WebSearch, WebFetch, mcp__web_reader__webReader, Read, Write, TodoWrite, Skill
---

# Deep Research Command (v2.0 - Refactored)

Execute the complete 7-phase deep research workflow using the **refactored agent-based architecture** with enhanced skill separation and autonomous agent coordination.

## Research Topic

$ARGUMENTS

---

## Architecture Overview (Post-Refactoring)

```
User → deep-research command
       ↓
   question-refiner skill → structured prompt
       ↓
   research-planner skill → execution plan (OPTIONAL)
       ↓
   research-executor skill → validates & invokes agent
       ↓
   research-orchestrator-agent → executes all 7 phases
       ↓
   RESEARCH/[topic]/ → final output
```

**Key Changes from v1.0**:
- Skills are now thin wrappers that delegate to agents
- Orchestrator agent handles all phase logic
- Better separation: Skills = validation, Agents = execution
- StateManager tracks all research state centrally

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
   - Quality score ≥ 8.0 required
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

### Phase 1-7: Research Execution (agent-based)

**Use `research-executor` skill → `research-orchestrator-agent`**:

```markdown
Invoke research-executor with structured prompt:

The skill will:
1. Validate prompt completeness
2. Prepare agent context
3. Invoke research-orchestrator-agent
4. Monitor progress
5. Return results

The agent will autonomously execute:
├── Phase 1: Question Refinement (validate)
├── Phase 2: Research Planning (if not done in Phase 0.5)
├── Phase 3: Multi-Agent Deployment (parallel)
│   ├── Web research agents (3-5)
│   ├── Academic/technical agents (1-2)
│   └── Cross-reference agent (1)
├── Phase 4: Source Triangulation (conflict detection)
├── Phase 5: Knowledge Synthesis (synthesizer-agent)
├── Phase 6: Quality Assurance (red-team-agent)
└── Phase 7: Output Generation (structured files)
```

**Key Difference**: All orchestration logic is now in the agent, not the skill.

---

## Agent Coordination (Behind the Scenes)

The research-orchestrator-agent will invoke:

### Supporting Agents
1. **ontology-scout-agent** (if unfamiliar domain)
   - Domain reconnaissance
   - Terminology mapping
   - Taxonomy building

2. **got-agent** (if complex topic, optional)
   - Graph of Thoughts optimization
   - Path scoring and pruning
   - Quality-driven exploration

3. **Research Agents** (3-8 parallel)
   - Web research (haiku/sonnet mix)
   - Academic research (sonnet)
   - Cross-reference verification (haiku)

4. **synthesizer-agent** (Phase 5)
   - Aggregate findings
   - Resolve contradictions
   - Build consensus narrative
   - Generate structured reports

5. **red-team-agent** (Phase 6)
   - Adversarial validation
   - Counter-evidence search
   - Bias detection
   - Confidence adjustment

### MCP Tools Used by Agents
- `fact-extract`: Extract atomic facts
- `entity-extract`: Build knowledge graph
- `citation-validate`: Verify citations
- `source-rate`: A-E quality ratings
- `conflict-detect`: Find contradictions

### StateManager Integration
- Tracks research session state
- Manages GoT graph (if used)
- Coordinates agent statuses
- Stores fact ledger
- Maintains entity graph
- Records citations

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
1. research-orchestrator-agent detects complexity
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
| Citation accuracy | ≥ 95% |
| Source quality average | B or higher |
| Hallucination count | 0 |
| Overall quality score | ≥ 8/10 |

---

## What's Different in v2.0?

### v1.0 (Old Architecture)
- ❌ Monolithic skills with embedded logic
- ❌ Direct agent deployment from skills
- ❌ Manual state management
- ❌ Phase-by-phase execution in skills
- ❌ Limited error recovery

### v2.0 (Refactored Architecture)
- ✅ Thin skill wrappers + autonomous agents
- ✅ Orchestrator agent manages all phases
- ✅ Centralized StateManager (SQLite)
- ✅ Agent-level autonomy and error recovery
- ✅ MCP tools for standardized data processing
- ✅ Optional research planning phase
- ✅ Enhanced question refinement with validation
- ✅ Better separation of concerns

---

## Error Handling

**Skill-Level Errors**:
- E001: Incomplete prompt → Request clarification
- E002: Agent deployment failed → Retry with fallback
- E003: Execution timeout → Return partial results
- E004: Quality below threshold → Trigger refinement

**Agent-Level Errors**:
- Handled autonomously by research-orchestrator-agent
- Automatic retries and recovery
- Quality gate enforcement
- Fallback strategies

---

**Begin refactored deep research workflow.**
