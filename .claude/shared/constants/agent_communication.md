# Agent Communication Protocol

Guidelines for parallel research agents to coordinate and share data efficiently.

## Core Principles

1. **No Direct Communication**: Agents cannot message each other
2. **Shared State**: Use file-based coordination
3. **Deduplication**: Check before fetching resources
4. **Progress Tracking**: Update status for monitoring

---

## Shared Resources

### 1. URL Manifest (`data/url_manifest.json`)

**Purpose**: Prevent duplicate web fetches across agents

**Before fetching any URL**:

```bash
python3 scripts/url_manifest.py check \
  "https://example.com/article" --topic my_topic
```

**Response**:

```json
{
  "cached": true,
  "local_path": "data/processed/article_cleaned.md",
  "fetched_by": "agent-2",
  "timestamp": "2024-01-08T23:30:00Z",
  "tokens": 4500
}
```

**If not cached, register after fetching**:

```bash
python3 scripts/url_manifest.py register \
  "https://example.com/article" \
  --topic my_topic \
  --local data/processed/article_cleaned.md \
  --agent agent-1
```

### 2. Agent Status (`research_notes/agent_status.json`)

**Purpose**: Track progress and detect stalled agents

**Format**:

```json
{
  "agents": [
    {
      "id": "agent-1",
      "role": "web-research",
      "status": "active",
      "progress": "fetching sources (2/5)",
      "last_update": "2024-01-08T23:45:00Z",
      "findings_count": 12,
      "quality_score": 7.8
    },
    {
      "id": "agent-2",
      "role": "academic-research",
      "status": "completed",
      "progress": "synthesis done",
      "last_update": "2024-01-08T23:50:00Z",
      "findings_count": 8,
      "quality_score": 8.5
    },
    {
      "id": "agent-3",
      "role": "verification",
      "status": "error",
      "progress": "E101: timeout on source",
      "last_update": "2024-01-08T23:48:00Z",
      "findings_count": 5,
      "quality_score": 7.2
    }
  ]
}
```

**Update frequency**: Every 5 minutes or after major milestones

### 3. Findings Registry (`research_notes/findings_registry.json`)

**Purpose**: Track all findings to avoid duplication

**Format**:

```json
{
  "findings": [
    {
      "id": "finding-001",
      "agent": "agent-1",
      "topic": "market size",
      "summary": "Global AI market reached $22.4B in 2023",
      "sources": ["source-001", "source-002"],
      "quality_score": 8.5,
      "timestamp": "2024-01-08T23:40:00Z"
    },
    {
      "id": "finding-002",
      "agent": "agent-2",
      "topic": "market size",
      "summary": "AI healthcare market at $22.1B in 2023",
      "sources": ["source-003"],
      "quality_score": 8.2,
      "timestamp": "2024-01-08T23:42:00Z",
      "related_to": ["finding-001"]
    }
  ]
}
```

**Before adding finding**: Check if similar finding exists (by topic + summary similarity)

---

## Agent Roles and Responsibilities

### Primary Research Agents

**web-research-agent**:

- Focus: General web sources, industry reports, news
- Sources: Company websites, news outlets, industry analysts
- Quality target: B-C rated sources

**academic-research-agent**:

- Focus: Peer-reviewed papers, systematic reviews
- Sources: PubMed, arXiv, Google Scholar
- Quality target: A-B rated sources

**verification-agent**:

- Focus: Fact-checking and cross-validation
- Sources: Official statistics, government data, primary sources
- Quality target: A rated sources

### Support Agents

**data-extraction-agent**:

- Focus: Extract structured data from sources
- Output: CSV/JSON files in `data/structured/`

**citation-agent**:

- Focus: Validate and format citations
- Output: `sources/bibliography.md`

---

## Coordination Patterns

### Pattern 1: Sequential Handoff

```
Agent 1 (web-research) → Completes
  ↓ Updates agent_status.json
Agent 2 (verification) → Starts
  ↓ Reads Agent 1's findings
Agent 2 → Cross-validates findings
```

### Pattern 2: Parallel with Merge

```
Agent 1 (web) ──┐
Agent 2 (academic) ──┼→ All complete → Synthesizer merges
Agent 3 (verification) ──┘
```

### Pattern 3: Leader-Worker

```
Leader Agent:
  - Assigns subtopics to workers
  - Monitors progress via agent_status.json
  - Triggers synthesis when all workers complete

Worker Agents:
  - Research assigned subtopic
  - Update status regularly
  - Write findings to research_notes/
```

---

## File Naming Conventions

### Research Notes

```
research_notes/
├── agent-1_web_research.md
├── agent-2_academic_research.md
├── agent-3_verification.md
└── synthesis_combined.md
```

### Data Files

```
data/
├── raw/
│   ├── source-001_example_com.html
│   └── source-002_research_org.pdf
├── processed/
│   ├── source-001_cleaned.md
│   └── source-002_cleaned.md
└── structured/
    ├── market_data.csv
    └── statistics.json
```

### Sources

```
sources/
├── source-001_metadata.json
├── source-002_metadata.json
└── bibliography.md
```

---

## Conflict Resolution

### Duplicate URL Fetch

**Scenario**: Agent 2 tries to fetch URL already fetched by Agent 1

**Resolution**:

1. Check `url_manifest.json`
2. If cached, read from `local_path`
3. Update `agent_status.json` to note reuse

### Contradictory Findings

**Scenario**: Agent 1 finds "25% growth", Agent 2 finds "18% growth"

**Resolution**:

1. Both agents register findings in `findings_registry.json`
2. Mark as `related_to` each other
3. Synthesizer resolves contradiction later

### Agent Timeout

**Scenario**: Agent 3 hasn't updated status in 30 minutes

**Resolution**:

1. Main controller checks `agent_status.json`
2. If `last_update` >30 min, mark as `timeout`
3. Continue with findings from other agents
4. Note limitation in final report

---

## Progress Monitoring

### Health Check Script

```bash
# Check agent health
python3 scripts/check_agent_health.py --topic my_topic

# Output:
# Agent 1: ✓ Active (last update: 2 min ago)
# Agent 2: ✓ Completed
# Agent 3: ⚠ Stalled (last update: 35 min ago)
```

### Status Dashboard

```markdown
## Research Progress

**Overall**: 65% complete (2/3 agents done)

| Agent | Role | Status | Progress | Quality |
|-------|------|--------|----------|---------|
| agent-1 | Web Research | ✓ Done | 5/5 sources | 8.2/10 |
| agent-2 | Academic | ✓ Done | 3/3 papers | 8.8/10 |
| agent-3 | Verification | ⏳ Active | 2/4 checks | 7.5/10 |

**Next**: Wait for agent-3 or timeout in 15 min
```

---

## Best Practices

### DO

- ✅ Check URL manifest before every fetch
- ✅ Update agent status every 5 minutes
- ✅ Register findings immediately after discovery
- ✅ Use descriptive agent IDs (agent-1-web, not agent-1)
- ✅ Write findings to separate files per agent
- ✅ Include timestamps in all status updates

### DON'T

- ❌ Assume other agents' state without checking files
- ❌ Fetch URLs without checking manifest
- ❌ Overwrite other agents' files
- ❌ Leave status unchanged for >10 minutes
- ❌ Mix findings from different agents in same file
- ❌ Skip error logging in agent_status.json

---

## Example: Complete Agent Workflow

```markdown
## Agent 2 (Academic Research) - Workflow

**1. Initialize**
- Read research plan from `research_notes/research_plan.md`
- Check assigned subtopic: "AI in clinical diagnosis - accuracy studies"
- Update status: "initialized"

**2. Search Phase**
- Query: "AI clinical diagnosis accuracy peer-reviewed"
- Find 5 relevant papers
- Check URL manifest for each paper
  - Paper 1: Not cached → Fetch and register
  - Paper 2: Cached by agent-1 → Reuse
  - Paper 3-5: Not cached → Fetch and register

**3. Processing Phase**
- Preprocess all papers (Download → Clean → Read)
- Extract key findings
- Register findings in findings_registry.json
- Update status: "processing (3/5 papers)"

**4. Synthesis Phase**
- Combine findings into coherent narrative
- Write to `research_notes/agent-2_academic_research.md`
- Update status: "completed"
- Final quality score: 8.8/10

**5. Handoff**
- Mark status as "completed" in agent_status.json
- Notify main controller (via status file)
- Ready for synthesizer to merge with other agents
```
