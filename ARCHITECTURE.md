# Architecture

This document describes the technical architecture of the Claude Code Deep Research Agent framework.

## System Overview

The framework is built on Claude Code's Skills and Commands system, providing a modular architecture for conducting sophisticated multi-agent research.

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│                    (Commands: /deep-research)                │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      Skills Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Question   │  │   Research   │  │     GoT      │     │
│  │   Refiner    │  │   Executor   │  │  Controller  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  Citation    │  │ Synthesizer  │                        │
│  │  Validator   │  │              │                        │
│  └──────────────┘  └──────────────┘                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Multi-Agent Layer                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Web Search │  │ Academic   │  │   Cross-   │           │
│  │  Agents    │  │  Agents    │  │ Reference  │           │
│  │   (3-5)    │  │   (1-2)    │  │  Agent (1) │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      Tools Layer                             │
│  WebSearch │ WebFetch │ Task │ Read/Write │ TodoWrite      │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
.
├── .claude/
│   ├── commands/              # User-facing command shortcuts
│   │   ├── deep-research.md
│   │   ├── refine-question.md
│   │   ├── plan-research.md
│   │   ├── synthesize-findings.md
│   │   └── validate-citations.md
│   │
│   ├── skills/                # Modular capabilities
│   │   ├── question-refiner/
│   │   │   ├── SKILL.md
│   │   │   ├── instructions.md
│   │   │   └── examples.md
│   │   ├── research-executor/
│   │   ├── got-controller/
│   │   ├── citation-validator/
│   │   └── synthesizer/
│   │
│   └── settings.local.json    # Tool permissions
│
├── RESEARCH/                  # Research outputs
│   └── [topic_name]/
│       ├── README.md
│       ├── executive_summary.md
│       ├── full_report.md
│       ├── data/
│       ├── visuals/
│       ├── sources/
│       ├── research_notes/
│       └── appendices/
│
├── docs/
│   └── reference/
│       └── skills-guide.md    # General skills reference
│
├── CLAUDE.md                  # Claude Code quick reference
├── ARCHITECTURE.md            # This file
├── RESEARCH_METHODOLOGY.md    # Research implementation guide
└── README.md                  # User-facing documentation
```

## Skills System

### What are Skills?

Skills are modular, reusable capabilities that Claude Code can execute. Each skill is a self-contained unit with:

1. **SKILL.md** - Metadata and description (YAML frontmatter)
2. **instructions.md** - Detailed implementation guidance
3. **examples.md** - Usage examples and patterns

### Skill Structure

```yaml
# SKILL.md frontmatter
name: skill-name
description: Brief description
version: 1.0.0
author: Your Name
tags: [research, analysis]
```

### Available Skills

#### 1. question-refiner

**Purpose**: Transform vague research questions into structured prompts

**Input**: Raw user question
**Output**: Structured research prompt with:

- Clear research objectives
- Scope boundaries
- Expected deliverables
- Success criteria

**Location**: `.claude/skills/question-refiner/`

#### 2. research-executor

**Purpose**: Execute complete 7-phase research workflow

**Phases**:

1. Question Scoping
2. Retrieval Planning
3. Iterative Querying
4. Source Triangulation
5. Knowledge Synthesis
6. Quality Assurance
7. Output & Packaging

**Location**: `.claude/skills/research-executor/`

#### 3. got-controller

**Purpose**: Manage Graph of Thoughts for complex research

**Operations**:

- Generate(k): Create k parallel research paths
- Aggregate(k): Merge k findings
- Refine(1): Improve existing finding
- Score: Rate quality (0-10)
- KeepBestN(n): Prune to top n nodes

**Location**: `.claude/skills/got-controller/`

#### 4. citation-validator

**Purpose**: Verify citation accuracy and source quality

**Checks**:

- Citation completeness
- Source accessibility
- Quality ratings (A-E scale)
- Cross-reference validation

**Location**: `.claude/skills/citation-validator/`

#### 5. synthesizer

**Purpose**: Combine findings from multiple agents

**Process**:

- Collect agent outputs
- Identify overlaps and contradictions
- Resolve conflicts
- Create unified narrative
- Maintain source attribution

**Location**: `.claude/skills/synthesizer/`

## Commands System

### What are Commands?

Commands are user-facing shortcuts that invoke skills with predefined parameters. They provide a simple interface for complex operations.

### Command Structure

```markdown
# Command: /command-name

## Description
Brief description of what this command does

## Usage
/command-name [arguments]

## Examples
/command-name example argument
```

### Available Commands

| Command | Invokes Skill | Description |
|---------|---------------|-------------|
| `/deep-research` | research-executor | Full 7-phase workflow |
| `/refine-question` | question-refiner | Question transformation |
| `/plan-research` | research-executor (phase 2) | Create execution plan |
| `/synthesize-findings` | synthesizer | Combine agent outputs |
| `/validate-citations` | citation-validator | Verify citations |

## Multi-Agent Architecture

### Agent Types

#### Web Research Agents (3-5 agents)

**Focus**: Current information, trends, news
**Tools**: WebSearch, WebFetch
**Output**: Structured summaries with URLs

#### Academic/Technical Agents (1-2 agents)

**Focus**: Research papers, specifications
**Tools**: WebSearch (academic sources), WebFetch
**Output**: Technical analysis with citations

#### Cross-Reference Agent (1 agent)

**Focus**: Fact-checking, verification
**Tools**: WebSearch, WebFetch
**Output**: Confidence ratings for claims

### Agent Deployment

Agents are deployed in parallel using multiple Task tool calls in a single response:

```
Task 1: Web Research Agent - Current trends
Task 2: Web Research Agent - Market analysis
Task 3: Academic Agent - Technical foundations
Task 4: Cross-Reference Agent - Fact verification
```

### Agent Communication

Agents work independently but share findings through:

1. Structured output format
2. Common citation standards
3. Centralized result aggregation
4. Conflict resolution protocol

## Graph of Thoughts Implementation

### Graph Structure

```json
{
  "nodes": {
    "n1": {
      "text": "Research finding",
      "score": 8.5,
      "type": "root|generate|aggregate|refine",
      "depth": 0,
      "sources": ["url1", "url2"]
    }
  },
  "edges": [
    {"from": "n1", "to": "n2", "operation": "Generate"}
  ],
  "frontier": ["n2", "n3"],
  "budget": {
    "tokens_used": 15000,
    "max_tokens": 50000
  }
}
```

### Transformation Operations

**Generate(k)**

- Creates k new research paths from parent
- Each path explores different angle
- Returns k nodes with scores

**Aggregate(k)**

- Merges k nodes into single synthesis
- Resolves contradictions
- Preserves all citations
- Returns 1 node with higher score

**Refine(1)**

- Improves existing node quality
- Fact-checks claims
- Enhances clarity
- Returns refined node

**Score**

- Evaluates node quality (0-10)
- Based on: citations, accuracy, completeness, coherence
- Guides exploration strategy

**KeepBestN(n)**

- Prunes graph to top n nodes per depth
- Manages token budget
- Focuses on high-quality paths

### Graph Traversal Strategy

```
Depth 0-2: Aggressive Generate(3) - Explore search space
Depth 2-3: Mixed Generate + Refine - Balance exploration/exploitation
Depth 3-4: Aggregate + Refine - Synthesize best paths
Termination: max_score > 9 OR depth > 4
```

## Tool Permissions

Configured in `.claude/settings.local.json`:

```json
{
  "tools": {
    "WebSearch": {
      "enabled": true,
      "description": "General web searches"
    },
    "WebFetch": {
      "enabled": true,
      "description": "Extract content from URLs"
    },
    "Task": {
      "enabled": true,
      "description": "Deploy autonomous agents"
    },
    "TodoWrite": {
      "enabled": true,
      "description": "Track research progress"
    },
    "Read": {
      "enabled": true,
      "description": "Read files"
    },
    "Write": {
      "enabled": true,
      "description": "Write files"
    }
  }
}
```

## Output Management

### File Organization

All research outputs go to `RESEARCH/[topic_name]/`:

```
RESEARCH/[topic_name]/
├── README.md                    # Navigation and overview
├── executive_summary.md         # 1-2 page key findings
├── full_report.md               # Complete analysis (20-50 pages)
├── data/
│   └── statistics.md            # Key numbers and facts
├── visuals/
│   └── descriptions.md          # Chart/graph descriptions
├── sources/
│   ├── bibliography.md          # Complete citations
│   └── source_quality_table.md  # A-E quality ratings
├── research_notes/
│   └── agent_findings_summary.md # Raw agent outputs
└── appendices/
    ├── methodology.md           # Research methods used
    └── limitations.md           # Unknowns and gaps
```

### Document Splitting Strategy

To avoid context limits:

- Break reports into sections (< 10,000 words each)
- Separate data files from narrative
- Keep agent outputs in research_notes/
- Link documents with cross-references

## Citation System

### Citation Format

**Inline**: `(Author, Year, p. XX)`
**Bibliography**: Full citation with URL/DOI

### Source Quality Ratings

- **A**: Peer-reviewed RCTs, systematic reviews, meta-analyses
- **B**: Cohort studies, clinical guidelines, reputable analysts
- **C**: Expert opinion, case reports, mechanistic studies
- **D**: Preprints, preliminary research, blogs
- **E**: Anecdotal, theoretical, speculative

### Validation Process

1. Check citation completeness
2. Verify source accessibility
3. Cross-reference claims
4. Rate source quality
5. Flag unreliable sources

## Extending the Framework

### Adding New Skills

1. Create skill directory in `.claude/skills/`
2. Add SKILL.md with YAML frontmatter
3. Write instructions.md with implementation details
4. Provide examples.md with usage patterns
5. Test with diverse research topics
6. Update documentation

### Adding New Commands

1. Create command file in `.claude/commands/`
2. Define command syntax and arguments
3. Map to appropriate skill(s)
4. Add usage examples
5. Update README.md

### Adding New Agent Types

1. Define agent role and focus
2. Specify required tools
3. Create agent prompt template
4. Define output format
5. Integrate with synthesizer
6. Test with multi-agent deployment

## Performance Considerations

### Token Budget Management

- Track tokens used per agent
- Set max_tokens limit (default: 50,000)
- Prune low-scoring branches early
- Cache intermediate results

### Parallel Execution

- Deploy agents in single response
- Use multiple Task calls
- Avoid sequential dependencies
- Aggregate results efficiently

### Quality vs Speed Tradeoffs

- Quick research: 3-4 agents, depth 2
- Standard research: 5-6 agents, depth 3
- Comprehensive research: 6-8 agents, depth 4

## Error Handling

### Common Issues

1. **Agent timeout**: Reduce scope or split task
2. **Citation missing**: Flag for manual review
3. **Source inaccessible**: Find alternative source
4. **Contradictory findings**: Document in report
5. **Token limit exceeded**: Split into smaller tasks

### Recovery Strategies

- Save intermediate results
- Resume from last checkpoint
- Retry failed operations
- Escalate to user when blocked

## Security Considerations

### Data Privacy

- No persistent storage of user data
- Research outputs saved locally only
- No external API calls (except web search)

### Source Validation

- Verify URL authenticity
- Check for malicious content
- Validate SSL certificates
- Flag suspicious sources

## Future Enhancements

### Planned Features

- [ ] Visual graph explorer for GoT
- [ ] Interactive research dashboard
- [ ] Real-time collaboration support
- [ ] Custom agent templates
- [ ] Advanced citation management
- [ ] Multi-language support

### Research Areas

- Improved scoring functions
- Better conflict resolution
- Automated fact-checking
- Source credibility prediction
- Dynamic agent allocation

---

**For implementation details, see [RESEARCH_METHODOLOGY.md](RESEARCH_METHODOLOGY.md)**
