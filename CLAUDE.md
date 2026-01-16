# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this research framework.

## Project Overview

This is a **Claude Code Deep Research Agent** framework that implements sophisticated multi-agent research through:

- **Graph of Thoughts (GoT)** - Intelligent research path management with graph-based reasoning
- **7-Phase Research Process** - Structured methodology from question scoping to final output
- **Multi-Agent Architecture** - Parallel research agents (3-8 agents) with specialized roles
- **Citation Validation** - A-E source quality ratings with chain-of-verification

## Quick Commands Reference

### Primary Command

```bash
/deep-research [research topic]
```

Executes the complete 7-phase workflow:

1. Question refinement (asks clarifying questions)
2. Research planning with subtopic breakdown
3. Multi-agent parallel deployment
4. Source triangulation and cross-validation
5. Knowledge synthesis with citations
6. Quality assurance and validation
7. Output to `RESEARCH/[topic]/` directory

### Step-by-Step Commands

```bash
/refine-question [raw question]      # Transform into structured research prompt
/plan-research [structured prompt]   # Create detailed execution plan
/synthesize-findings [directory]     # Combine agent outputs
/validate-citations [file]           # Verify citation quality and accuracy
```

## Core Concepts

### Graph of Thoughts Operations

| Operation | Purpose | Example |
|-----------|---------|---------|
| **Generate(k)** | Spawn k parallel research paths | Generate(4) → 4 diverse research angles |
| **Aggregate(k)** | Merge k findings into synthesis | Aggregate(3) → 1 comprehensive report |
| **Refine(1)** | Improve existing finding | Refine(node_5) → Enhanced quality |
| **Score** | Rate quality (0-10) | Based on citations, accuracy, completeness |
| **KeepBestN(n)** | Prune to top n nodes | KeepBestN(3) → Retain best 3 paths |

### Multi-Agent Deployment

When executing research, deploy agents in a single response with multiple Task calls:

```
Phase 3: Iterative Querying (Parallel Execution)
├── Web Research Agents (3-5): Current information, trends, news
├── Academic/Technical Agents (1-2): Papers, specifications, methodologies
└── Cross-Reference Agent (1): Fact-checking, verification
```

Each agent receives:

- Clear research focus description
- Specific search queries
- Expected output format
- Citation requirements

## Research Output Structure

All outputs go to `RESEARCH/[topic_name]/`:

```
RESEARCH/[topic_name]/
├── README.md                    # Overview and navigation
├── executive_summary.md         # 1-2 page key findings
├── full_report.md               # Complete analysis (20-50 pages)
├── data/
│   └── statistics.md            # Key numbers, facts
├── visuals/
│   └── descriptions.md          # Chart/graph descriptions
├── sources/
│   ├── bibliography.md          # Complete citations
│   └── source_quality_table.md  # A-E quality ratings
├── research_notes/
│   └── agent_findings_summary.md # Raw agent outputs
└── appendices/
    ├── methodology.md           # Research methods used
    └── limitations.md           # Unknowns, gaps
```

## Citation Requirements

**Every factual claim must include:**

1. Author/Organization name
2. Publication date
3. Source title
4. Direct URL/DOI
5. Page numbers (if applicable)

**Source Quality Ratings:**

- **A**: Peer-reviewed RCTs, systematic reviews, meta-analyses
- **B**: Cohort studies, clinical guidelines, reputable analysts
- **C**: Expert opinion, case reports, mechanistic studies
- **D**: Preprints, preliminary research, blogs
- **E**: Anecdotal, theoretical, speculative

**Never make claims without sources** - state "Source needed" if uncertain.

## Key Constraints

### Output Management

- All research outputs go in `RESEARCH/[topic]/` directories
- Break large documents into smaller files to avoid context limits
- Use TodoWrite to track task completion throughout execution

### Agent Deployment

- Use parallel agent deployment (single response, multiple Task calls)
- Deploy 3-8 agents depending on research scope
- Each agent should have distinct, non-overlapping focus

### Quality Standards

- Validate citations before finalizing reports
- Cross-reference claims across multiple sources
- Apply Chain-of-Verification to prevent hallucinations
- Use Graph of Thoughts to optimize research paths

## Refactored Architecture (v2.1)

The framework uses a **3-layer architecture** with clear separation of concerns:

```
┌─────────────────────────────────────┐
│  Layer 1: Skills (User-Invocable)   │
│  - question-refiner                 │  ← Thin wrappers
│  - research-planner                 │  ← Input validation
│  - research-executor                │  ← Agent invocation
└──────────────┬──────────────────────┘
               │ invokes
┌──────────────▼──────────────────────┐
│  Layer 2: Built-in Agent Types      │
│  ┌─ Research Execution ──────────┐  │
│  │  - general-purpose (embedded  │  │  ← Executes 7-phase workflow
│  │    coordinator workflow)      │  │
│  └──────────────────────────────┘  │
│  ┌─ Agent Definitions (DOCS) ────┐  │
│  │  - phase-N-refinement         │  │  ← Workflow definitions
│  │  - synthesizer-agent          │  │     stored as reference
│  │  - red-team-agent             │  │
│  └──────────────────────────────┘  │
└──────────────┬──────────────────────┘
               │ uses
┌──────────────▼──────────────────────┐
│  Layer 3: Infrastructure            │
│  - MCP Tools (5 core + 5 batch)     │  ← Data processing
│  - UnifiedStateManager (SQLite)     │  ← Single source of truth
│  - TokenBudgetManager               │  ← Budget enforcement
│  - RecoveryHandler                  │  ← Checkpoint recovery
│  - ContentCompressor                │  ← Token optimization
└─────────────────────────────────────┘
```

### Skills System

Skills are located in `.claude/skills/`:

| Skill | Purpose | Type |
|-------|---------|------|
| `question-refiner` | Transform questions into structured prompts with validation | Enhanced ✨ |
| `research-planner` | Create detailed execution plans with resource estimates | NEW 🆕 |
| `research-executor` | Validate inputs and invoke general-purpose agent (with embedded coordinator workflow) | Refactored 🔧 |

**Key Changes**:

- Skills are now **thin wrappers** (~90% simpler)
- All orchestration logic moved to agents
- Enhanced input validation and output quality scoring

Each skill has:

- `SKILL.md`: YAML frontmatter + description
- `instructions.md`: Detailed implementation guidance
- `examples.md`: Usage examples

### Agent Workflow Definitions

Agent workflow definitions are located in `.claude/agents/`:

**IMPORTANT**: These are **NOT** actual agent types - they are workflow documentation and reference material. The actual execution uses Claude Code's built-in `general-purpose` agent type with embedded workflow instructions.

**Coordinator Workflow**:

| Definition | Purpose | Lines |
|------------|---------|-------|
| `coordinator/AGENT.md` | Lightweight orchestrator workflow, delegates to phase-specific workflows | ~280 |

**Phase Agent Workflows** (Reference documentation):

| Definition | Purpose | Lines |
|------------|---------|-------|
| `phase-1-refinement` | Question clarification and structuring workflow | ~190 |
| `phase-2-planning` | Subtopic decomposition and agent planning workflow | ~210 |
| `phase-3-execution` | Parallel agent deployment and collection workflow | ~280 |
| `phase-4-processing` | MCP-based fact/entity extraction workflow | ~290 |
| `phase-5-synthesis` | Knowledge synthesis with citations workflow | ~210 |
| `phase-6-validation` | Citation validation and red-team review workflow | ~220 |
| `phase-7-output` | Final deliverable generation workflow | ~260 |

**Support Agent Workflows**:

| Definition | Purpose | Autonomy Level |
|------------|---------|----------------|
| `synthesizer-agent` | Findings aggregation & conflict resolution workflow | High |
| `red-team-agent` | Adversarial validation workflow | High |
| `got-agent` | Graph of Thoughts optimization workflow | High |
| `ontology-scout-agent` | Domain reconnaissance & taxonomy building workflow | Medium |

**How It Works**:

1. Skills (like `research-executor`) invoke the `general-purpose` agent
2. The skill embeds workflow instructions from these AGENT.md files
3. The agent executes the 7-phase workflow using those instructions
4. Each phase's logic is defined in the corresponding AGENT.md reference file

### MCP Tools

MCP server located in `.claude/mcp-server/`:

**Core Tools** (5):

- `fact-extract`: Extract atomic facts with source attribution
- `entity-extract`: Named entity recognition + relationships
- `citation-validate`: Validate citation completeness and quality
- `source-rate`: A-E quality rating for sources
- `conflict-detect`: Detect contradictions between facts

**Batch Tools** (5):

- `batch-fact-extract`, `batch-entity-extract`, etc.
- Parallel processing with caching
- Intelligent deduplication

**State Tools** (11):

- Session: `create_research_session`, `update_session_status`, `get_session_info`
- Agent: `register_agent`, `update_agent_status`, `get_active_agents`
- Phase: `update_current_phase`, `get_current_phase`, `checkpoint_phase`
- Logging: `log_activity`, `render_progress`

**Cache Management** (2):

- `cache-stats`: Get cache statistics
- `cache-clear`: Clear all caches

### State Management (v2.1)

**UnifiedStateManager** (`.claude/mcp-server/src/state/unified-state-manager.ts`):

- SQLite as **single source of truth**
- Event emission for reactive updates
- Automatic progress.md rendering from database
- Session, Agent, and Phase lifecycle management

**DEPRECATED**:

- ❌ `scripts/state_manager.py` - Use MCP state tools instead
- ❌ `scripts/resume_research.py` - Use RecoveryHandler instead
- ❌ Manual progress.md editing - Use `log_activity` + `render_progress`

### Token Management (NEW)

**TokenBudgetManager** (`.claude/mcp-server/src/utils/token-budget.ts`):

- Per-session budget allocation (default: 500K tokens)
- Phase-level budget distribution
- Automatic warnings at 80% threshold
- Hard limit enforcement option

### Recovery System (NEW)

**RecoveryHandler** (`.claude/mcp-server/src/utils/recovery-handler.ts`):

- Checkpoint-based recovery
- Automatic interruption detection
- Recovery plan generation
- Minimal rework on resume

## Tool Permissions

Configured in `.claude/settings.local.json`:

- **WebSearch**: General web searches
- **WebFetch**: Extract content from specific URLs
- **Task**: Deploy autonomous research agents
- **TodoWrite**: Track research progress
- **Read/Write**: Manage research documents

## User Interaction Protocol

When user requests deep research:

1. **Ask clarifying questions** about:
   - Specific focus areas
   - Output format requirements
   - Geographic and time scope
   - Target audience
   - Special requirements

2. **Create research plan** showing:
   - Subtopic breakdown
   - Agent deployment strategy
   - Expected output structure

3. **Get user approval** before executing

4. **Execute research** with parallel agents

5. **Deliver structured output** to RESEARCH/ directory

## Documentation

For detailed information, refer to:

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design, skills structure, technical details
- **[RESEARCH_METHODOLOGY.md](RESEARCH_METHODOLOGY.md)** - Complete 7-phase process, GoT implementation, agent templates
- **[README.md](README.md)** - Quick start guide for users

## Important Notes

- Always use TodoWrite to track tasks and show progress
- Deploy agents in parallel when possible (single response, multiple Task calls)
- Validate all citations before finalizing reports
- Break large reports into multiple smaller files
- Maintain graph state when using GoT Controller
- Cross-validate findings across multiple sources

---

**This is a quick reference. For complete implementation details, see [RESEARCH_METHODOLOGY.md](RESEARCH_METHODOLOGY.md).**
