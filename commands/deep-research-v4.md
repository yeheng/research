---
description: Execute comprehensive deep research workflow (v4.0 - Server-Side State Machine Architecture)
argument-hint: [research topic or question] [--fast]
allowed-tools: Task, WebSearch, WebFetch, mcp__web_reader__webReader, Read, Write, TodoWrite, AskUserQuestion, mcp__deep-research__*
---

# Deep Research Command (v4.0)

Execute research workflow using **Graph of Thoughts (GoT)** architecture with intelligent path optimization. Provides a flexible, scalable, and efficient solution for complex research tasks. Please use english to think and execute, communicate with Chinese.

---

## Research Topic

$ARGUMENTS

**Detect Mode**: Check if `--fast` flag is present in $ARGUMENTS

- If `--fast` detected → Run **Quick Research** mode (5-10 min, 3-5 sources)
- If no `--fast` → Run **Deep Research** mode (30-60 min, 20+ sources)

---

## Architecture Overview (v4.0)

```
User → deep-research-v4 command
       ↓
   Mode detection (--fast?)
       ↓
   research-coordinator-v4 agent (State Machine Executor)
       ↓
   get_next_action() → Execute Instruction → Update State → Loop
       ↓
   MCP Server State Machine (Decision Engine)
       ↓
   ├─ research-worker-v3 agents (parallel execution)
   └─ auto_process_data tool (server-side batch processing)
       ↓
   SQLite State Storage (GoT graph persistence)
       ↓
   RESEARCH/[topic]/ (final output)
```

**v4.0 Key Changes**:

- ✅ **Server-Side State Machine**: Decision logic moved to MCP server
- ✅ **Agent as Executor**: Agent only executes instructions, no GoT logic
- ✅ **get_next_action()**: Server tells agent what to do next
- ✅ **SQLite Persistence**: Complete state recovery support
- ✅ **2 Modes**: Quick (`--fast`) and Deep (default)
- ✅ **Auto-Processing**: Phase 4 server-side via auto_process_data tool

---

## Mode Selection

### Quick Research Mode (--fast)

**Trigger**: `--fast` flag detected in $ARGUMENTS

**Characteristics**:

- Single research path (no GoT optimization needed)
- 3-5 sources, 5-10 minutes
- Simple questions with clear answers
- No subtopic decomposition

**Workflow**:

```typescript
// Quick mode - skip GoT, direct execution
QuickResearchWorkflow:
  1. Validate question
  2. Generate 2-3 search queries
  3. Fetch 3-5 sources
  4. Extract key facts
  5. Output structured answer
```

**When to use Quick Mode**:

- ✅ Single, clear question
- ✅ Only 1-2 data sources needed
- ✅ Time-sensitive (need fast results)
- ✅ No deep comparison required

### Deep Research Mode (default)

**Trigger**: No `--fast` flag

**Characteristics**:

- GoT path optimization enabled
- 20+ sources, 30-60 minutes
- Complex, multi-faceted topics
- Intelligent path pruning and aggregation

---

## Deep Research Workflow (GoT)

### GoT Controller Loop

The coordinator follows an **intelligent loop** instead of linear phases:

```typescript
GoTResearchLoop:
  while (confidence < 0.9 && budget_remaining) {
    // 1. GENERATE: Create exploration paths
    paths = await generate_paths(current_context, k=3);

    // 2. EXECUTE: Deploy workers to explore paths
    workers = deploy_workers_parallel(paths);

    // 3. SCORE: Evaluate quality of findings
    scores = await score_paths(worker_results);

    // 4. PRUNE: Cut low-quality branches
    best_paths = keep_best_n(scores, n=2);

    // 5. AGGREGATE: Merge complementary findings
    if (has_complementary_paths(best_paths)) {
      merged = await aggregate_paths(best_paths);
    }

    // 6. DECIDE: Continue or terminate?
    confidence = calculate_confidence(merged);
  }

  // Final synthesis
  output = synthesize_final_report(best_paths);
```

### GoT Operations

| Operation | Purpose | Tool |
|-----------|---------|------|
| `generate_paths(k)` | Create k exploration paths | `mcp__deep-research__generate_paths` |
| `score_and_prune` | Rate quality (0-10), prune low | `mcp__deep-research__score_and_prune` |
| `aggregate_paths(k)` | Merge k findings into one | `mcp__deep-research__aggregate_paths` |
| `register_agent` | Track worker in graph state | `mcp__deep-research__register_agent` |

---

## Execution Workflow

### Step 1: Mode Detection & Pre-Checks

```typescript
// Detect mode from arguments
const isFastMode = $ARGUMENTS.includes("--fast");

// Check for existing research
const existingResearch = ls("RESEARCH/");

if (existingResearch.includes(topic)) {
  const mode = await AskUserQuestion({
    question: "Research exists. What to do?",
    options: [
      { label: "Update", description: "Refresh with latest info" },
      { label: "Expand", description: "Add new subtopics" },
      { label: "Restart", description: "Archive and start fresh" }
    ]
  });
}
```

---

### Step 2: Progressive Questioning (Deep mode only)

For deep research, ask clarifying questions:

**Question 1 - Research Type**:

```
"What type of research do you need?"
- Exploratory: Broad overview
- Comparative: Compare options/approaches
- Problem-Solving: Find solutions
- Forecasting: Predict trends
- Deep-Dive: Comprehensive analysis
```

**Question 2 - Specific Focus**:

```
"What aspects should be prioritized?"
- Technical details
- Market/business implications
- Competitive landscape
- Historical context
```

**Question 3 - Output Format**:

```
"What deliverable format?"
- Comprehensive report (20-50 pages)
- Executive summary (2-5 pages)
- Comparison table
```

---

### Step 3: Invoke Coordinator

```typescript
Task({
  subagent_type: "research-coordinator-v4",
  description: isFastMode ? "Quick research" : "GoT deep research",
  prompt: `
Research Topic: ${topic}
Mode: ${isFastMode ? "FAST" : "DEEP"}

Parameters:
- Type: ${researchType}
- Focus: ${specificFocus}
- Output: ${outputFormat}

${isFastMode ? `
QUICK MODE WORKFLOW:
1. Generate 2-3 search queries
2. Fetch 3-5 high-quality sources
3. Extract key facts with citations
4. Output structured answer
` : `
DEEP MODE - GoT WORKFLOW:
Execute GoT loop:
1. Generate exploration paths (k=3)
2. Deploy workers to explore paths
3. Score and prune low-quality branches
4. Aggregate complementary findings
5. Loop until confidence ≥ 0.9 or budget exhausted
6. Synthesize final report
`}

Output: RESEARCH/${sanitizedTopic}/
  `
})
```

---

## Core Agents (v4.0)

### 1. research-coordinator-v4 (State Machine Executor)

**Role**: Graph of Thoughts controller

**Responsibilities**:

- GoT loop orchestration
- Path generation and pruning
- Confidence assessment
- Budget monitoring

**Tools**: Task, Read, Write, TodoWrite, GoT MCP tools, State management

**Key Change**: Now uses GoT operations instead of linear phases

---

### 2. research-worker-v3

**Role**: Executes specific research paths

**Responsibilities**:

- Path-specific research
- Source evaluation
- Fact extraction
- Structured output

**Tools**: WebSearch, WebFetch, mcp__web_reader__webReader, Read, Write

---

### 3. auto_process_data Tool (Server-Side Batch Processing)

**Role**: Server-side batch processing (v4.0)

**Responsibilities**:

- Auto-process raw data in Phase 4
- Batch fact extraction
- Batch entity extraction
- Conflict detection

**Tools**: mcp__deep-research__auto_process_data, mcp__deep-research__batch-extract, mcp__deep-research__batch-validate

**Key Change**: Processing moved from agent to server-side MCP tool

---

## MCP Tools (v4.0)

### GoT Operations (NEW)

- `mcp__deep-research__generate_paths`: Generate k exploration paths
- `mcp__deep-research__score_and_prune`: Rate and prune paths
- `mcp__deep-research__aggregate_paths`: Merge k findings

### Auto-Processing (NEW)

- `mcp__deep-research__auto_process_data`: Server-side Phase 4 processing

### Core Tools (5)

- `mcp__deep-research__extract`: Unified extraction (fact + entity)
- `mcp__deep-research__validate`: Unified validation (citation + source)
- `mcp__deep-research__conflict-detect`: Find contradictions
- `mcp__deep-research__batch-extract`: Batch extraction
- `mcp__deep-research__batch-validate`: Batch validation

### State Management Tools (11)

- **Session**: `create_research_session`, `update_session_status`, `get_session_info`
- **Agent**: `register_agent`, `update_agent_status`, `get_active_agents`
- **Phase**: `update_current_phase`, `get_current_phase`, `checkpoint_phase`
- **Logging**: `log_activity`, `render_progress`

---

## Output Structure

```
RESEARCH/[topic]/
├── README.md                    # Overview and navigation
├── executive_summary.md         # 1-2 page summary
├── full_report.md               # Complete report (20-50 pages)
├── data/
│   ├── raw/                     # Original agent outputs
│   ├── processed/               # Auto-extracted facts/entities
│   ├── got_graph.json           # GoT path state (NEW)
│   └── statistics.md            # Key numbers and metrics
├── sources/
│   ├── bibliography.md          # Complete citations
│   ├── source_quality_table.md  # A-E quality ratings
│   └── citation_validation.md   # Validation report
├── research_notes/
│   ├── refined_question.md      # Phase 1 output
│   ├── research_plan.md         # Phase 2 output
│   └── agent_status.json        # Execution metadata
└── appendices/
    ├── methodology.md           # Research methodology
    ├── limitations.md           # Known limitations
    └── progress.md              # Rendered progress log
```

---

## Citation Requirements

**Every factual claim must include**:

1. ✅ Author/Organization name
2. ✅ Publication date
3. ✅ Source title
4. ✅ Direct URL/DOI
5. ✅ Page numbers (if applicable)

**Source Quality Ratings (A-E)**:

- **A**: Peer-reviewed journals, systematic reviews, RCTs
- **B**: Industry reports, reputable analysts, government data
- **C**: News articles, expert opinion, case studies
- **D**: Blogs, preliminary research, preprints
- **E**: Anecdotal evidence, theoretical speculation

**Golden Rule**: No claim without a source. Mark uncertain claims as "needs verification".

---

## Success Metrics

| Metric | Quick Mode | Deep Mode |
|--------|-----------|-----------|
| Sources | 3-5 | 20+ |
| Citation coverage | 100% | 100% |
| Source quality avg | ≥ B | ≥ B |
| Hallucination count | 0 | 0 |
| Overall quality score | ≥ 7/10 | ≥ 8/10 |
| Time estimate | 5-10 min | 30-60 min |

---

## Architecture Evolution

### v2.1 (Previous)

- ❌ 4-layer: Command → Skill → Agent → Tool
- ❌ 6 Skills (thin wrappers)
- ❌ 10+ Agents (fine-grained phases)
- ❌ Linear workflow only
- ❌ No path optimization

### v3.0 (Previous)

- ✅ 2-layer: Command → Agent → Tool
- ✅ 3 Agents (coordinator, worker, processor)
- ✅ Linear 7-phase workflow
- ❌ GoT not activated

### v4.0 (Current)

- ✅ Graph of Thoughts architecture
- ✅ GoT loop: Generate → Execute → Score → Prune → Aggregate
- ✅ 2 Modes: Quick (--fast) and Deep
- ✅ Server-side auto-processing
- ✅ Budget enforcement hooks
- ✅ Auto-healing hooks

---

## Error Handling

**Command-Level Errors**:

- E001: Topic too short → Request longer description (min 10 chars)
- E002: Invalid parameters → Request clarification
- E003: Existing research conflict → Ask user for mode

**GoT-Level Errors** (handled by coordinator):

- Path generation failure → Retry with fallback queries
- Worker timeout → Prune stuck path, continue with others
- Low confidence scores → Generate new paths from existing findings

**Resilience Features**:

- Exponential backoff retry (max 3 attempts)
- Wayback Machine fallback for URLs
- Budget hooks prevent overspending
- Auto-heal hooks recover from failures

---

## Important Notes

**TodoWrite Usage**:

- ✅ Track GoT loop iterations
- ✅ Mark paths as in_progress/completed
- ✅ Keep user informed of progress

**Parallel Deployment**:

- ✅ Deploy multiple workers in parallel (single response, multiple Task calls)
- ✅ Each worker explores one unique path
- ✅ Typical: 3-8 workers depending on complexity

**GoT Best Practices**:

- ✅ Generate diverse paths (avoid redundancy)
- ✅ Prune aggressively (keep only best branches)
- ✅ Aggregate complementary findings
- ✅ Stop when confidence threshold reached

---

**Begin v3.1 Graph of Thoughts research workflow.**
