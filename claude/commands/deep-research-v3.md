---
description: Execute comprehensive deep research workflow (v3.0 - Simplified Architecture)
argument-hint: [research topic or question]
allowed-tools: Task, WebSearch, WebFetch, mcp__web_reader__webReader, Read, Write, TodoWrite, mcp__deep-research__*
---

# Deep Research Command (v3.0)

Execute the complete 7-phase deep research workflow using the **simplified 2-layer architecture**.

## Research Topic

$ARGUMENTS

---

## Architecture Overview (v3.0)

```
User → deep-research-v3 command
       ↓
   Input validation (embedded in command)
       ↓
   research-coordinator-v3 agent
       ↓
   ├─ research-worker-v3 agents (parallel)
   └─ data-processor-v3 agent
       ↓
   MCP Tools (fact extraction, validation)
       ↓
   RESEARCH/[topic]/ (final output)
```

**v3.0 Key Changes**:
- ❌ **Removed**: Skill layer (question-refiner, research-planner, research-executor)
- ❌ **Removed**: 10+ fine-grained Phase Agents
- ✅ **Simplified**: 3 core agents (coordinator, worker, processor)
- ✅ **Direct**: Command validates input and invokes coordinator
- ✅ **Hooks**: Automatic logging and context restoration

---

## Execution Workflow

### Step 1: Pre-Execution Checks

**Check for existing research**:

```bash
ls -la RESEARCH/ 2>/dev/null || echo "No existing research"
```

If research exists for this topic, ask user:
- **Update**: Refresh with latest information
- **Expand**: Add new subtopics or perspectives
- **Restart**: Archive old research and start fresh

---

### Step 2: Progressive Questioning

Ask the user 3-5 clarifying questions using the AskUserQuestion tool:

**Question 1 - Research Type**:
```
Question: "What type of research do you need?"
Options:
- Exploratory: Broad overview of the topic
- Comparative: Compare different options or approaches
- Problem-Solving: Find solutions to specific challenges
- Forecasting: Predict future trends and developments
- Deep-Dive: Comprehensive analysis with all details
```

**Question 2 - Specific Focus**:
```
Question: "What aspects should be prioritized?"
Options:
- Technical details and specifications
- Market trends and business implications
- Competitive landscape and positioning
- Historical context and evolution
```

**Question 3 - Output Format**:
```
Question: "What deliverable format do you prefer?"
Options:
- Comprehensive report (20-50 pages)
- Executive summary (2-5 pages)
- Comparison table with key findings
```

---

### Step 3: Invoke Research Coordinator

After gathering user requirements, invoke the research-coordinator-v3 agent:

```typescript
Task({
  subagent_type: "research-coordinator-v3",
  description: "Execute 7-phase research workflow",
  prompt: `
Execute comprehensive research on: ${topic}

Research Parameters:
- Type: ${researchType}
- Focus: ${specificFocus}
- Output Format: ${outputFormat}
- Constraints: ${constraints}
- Target Audience: ${targetAudience}

Follow the 7-phase workflow:
1. Question Refinement: Validate and structure the research question
2. Research Planning: Decompose into 3-7 subtopics, plan agent deployment
3. Parallel Execution: Deploy 3-8 research-worker-v3 agents
4. Data Processing: Use data-processor-v3 for fact/entity extraction
5. Knowledge Synthesis: Aggregate findings into coherent narrative
6. Validation: Verify citations, run quality checks
7. Output Generation: Generate final deliverables

Output Directory: RESEARCH/${sanitizedTopic}/
  `
})
```

---

## Core Agents (v3.0)

### 1. research-coordinator-v3
**Role**: Orchestrates the 7-phase research workflow

**Responsibilities**:
- Session lifecycle management
- Phase sequencing and transitions
- Worker deployment and monitoring
- Quality gate enforcement
- Error recovery

**Tools**: Task, Read, Write, TodoWrite, MCP state management tools

---

### 2. research-worker-v3
**Role**: Executes specific research tasks autonomously

**Responsibilities**:
- Web search and content fetching
- Source evaluation and filtering
- Fact extraction with citations
- Output structured findings

**Tools**: WebSearch, WebFetch, mcp__web_reader__webReader, Read, Write, MCP extraction tools

---

### 3. data-processor-v3
**Role**: Batch data processing and validation

**Responsibilities**:
- Extract facts from multiple sources
- Extract entities and relationships
- Validate citations in batch
- Detect conflicts between facts

**Tools**: Read, Write, Glob, MCP batch processing tools

---

## MCP Tools Used

### Core Tools (5)
- `mcp__deep-research__extract`: Unified extraction (fact + entity)
- `mcp__deep-research__validate`: Unified validation (citation + source)
- `mcp__deep-research__conflict-detect`: Find contradictions
- `mcp__deep-research__batch-extract`: Batch extraction
- `mcp__deep-research__batch-validate`: Batch validation

---

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
│   ├── processed/               # Extracted facts and entities
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

| Metric | Target |
|--------|--------|
| Citation coverage | 100% |
| Citation completeness | 100% |
| Citation accuracy | ≥ 95% |
| Source quality average | B or higher |
| Hallucination count | 0 |
| Overall quality score | ≥ 8/10 |

---

## Architecture Evolution

### v2.1 (Previous)
- ❌ 4-layer architecture: Command → Skill → Agent → Tool
- ❌ 6 Skills (thin wrappers)
- ❌ 10+ Agents (fine-grained phases)
- ❌ Python dependencies
- ❌ No streaming support
- ❌ No lifecycle hooks

### v3.0 (Current)
- ✅ 2-layer architecture: Command → Agent → Tool
- ✅ 0 Skills (logic embedded in Command)
- ✅ 3 Agents (coordinator, worker, processor)
- ✅ Pure TypeScript
- ✅ Streaming responses (4000 tokens/chunk)
- ✅ Lifecycle hooks (auto-logging, context restore)
- ✅ GoT controller for path optimization
- ✅ Incremental persistence

---

## Error Handling

**Command-Level Errors**:
- E001: Topic too short → Request longer description (min 10 chars)
- E002: Invalid parameters → Request clarification
- E003: Existing research conflict → Ask user for mode (Update/Expand/Restart)

**Agent-Level Errors** (handled by coordinator):
- Phase failure detection
- Automatic recovery strategies
- Quality gate enforcement
- Checkpoint-based recovery

**Resilience Features**:
- Exponential backoff retry (max 3 attempts)
- Wayback Machine fallback for inaccessible URLs
- Timeout control (configurable per operation)

---

## Important Notes

**TodoWrite Usage**:
- ✅ Always use TodoWrite to track the 7 phases
- ✅ Mark phases as in_progress before starting
- ✅ Mark phases as completed immediately after finishing
- ✅ Keep user informed of progress

**Parallel Agent Deployment**:
- ✅ Deploy multiple research-worker-v3 agents in parallel (single response, multiple Task calls)
- ✅ Each worker focuses on one unique subtopic
- ✅ Typical deployment: 3-8 workers depending on complexity

**Quality Assurance**:
- ✅ Validate all citations before finalizing report
- ✅ Cross-verify claims across multiple sources
- ✅ Apply chain-of-verification to prevent hallucinations
- ✅ Use GoT controller to optimize research paths

---

**Begin v3.0 simplified deep research workflow.**

