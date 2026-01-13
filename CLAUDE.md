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

## Refactored Architecture (v2.0)

The framework uses a **3-layer architecture** with clear separation of concerns:

```
┌─────────────────────────────────────┐
│  Layer 1: Skills (User-Invocable)   │
│  - question-refiner                 │  ← Thin wrappers
│  - research-planner (NEW)           │  ← Input validation
│  - research-executor                │  ← Agent invocation
└──────────────┬──────────────────────┘
               │ invokes
┌──────────────▼──────────────────────┐
│  Layer 2: Agents (Autonomous)       │
│  - research-orchestrator-agent      │  ← Master coordinator
│  - got-agent                        │  ← Path optimization
│  - red-team-agent                   │  ← Quality validation
│  - synthesizer-agent                │  ← Findings aggregation
│  - ontology-scout-agent             │  ← Domain recon
└──────────────┬──────────────────────┘
               │ uses
┌──────────────▼──────────────────────┐
│  Layer 3: Infrastructure            │
│  - MCP Tools (5 core + 5 batch)     │  ← Data processing
│  - StateManager (SQLite)            │  ← State tracking
└─────────────────────────────────────┘
```

### Skills System

Skills are located in `.claude/skills/`:

| Skill | Purpose | Type |
|-------|---------|------|
| `question-refiner` | Transform questions into structured prompts with validation | Enhanced ✨ |
| `research-planner` | Create detailed execution plans with resource estimates | NEW 🆕 |
| `research-executor` | Validate inputs and invoke research-orchestrator-agent | Refactored 🔧 |

**Key Changes**:

- Skills are now **thin wrappers** (~90% simpler)
- All orchestration logic moved to agents
- Enhanced input validation and output quality scoring

Each skill has:

- `SKILL.md`: YAML frontmatter + description
- `instructions.md`: Detailed implementation guidance
- `examples.md`: Usage examples

### Agents System

Agents are located in `.claude/agents/`:

| Agent | Purpose | Autonomy Level |
|-------|---------|----------------|
| `research-orchestrator-agent` | Master coordinator for 7-phase workflow | Very High |
| `got-agent` | Graph of Thoughts optimization | High |
| `red-team-agent` | Adversarial validation | High |
| `synthesizer-agent` | Findings aggregation & conflict resolution | High |
| `ontology-scout-agent` | Domain reconnaissance & taxonomy building | Medium |

**Agent Characteristics**:

- Autonomous decision-making
- Multi-step reasoning
- Tool access (MCP + StateManager)
- Error recovery capabilities

Each agent has:

- `AGENT.md`: YAML frontmatter + comprehensive workflow
- Detailed phase-by-phase execution guide
- Excellence checklist and best practices

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

**Cache Management** (2):

- `cache-stats`: Get cache statistics
- `cache-clear`: Clear all caches

### State Management

StateManager (`scripts/state_manager.py`):

- Research sessions with lifecycle tracking
- GoT graph state persistence
- Agent coordination and monitoring
- Fact ledger with conflict detection
- Entity graph with relationships
- Citation quality tracking
- Thread-safe, ACID-compliant SQLite backend

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
