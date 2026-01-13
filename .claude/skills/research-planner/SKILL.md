---
name: research-planner
description: Create detailed research plans by decomposing structured prompts into subtopics, search strategies, and agent deployment configurations. Extracted from Phase 2 of research-executor for standalone planning capabilities.
---

# Research Planner

## Overview

The Research Planner takes a **structured research prompt** (from question-refiner) and creates a comprehensive **execution plan** with subtopic decomposition, search strategies, data source identification, and multi-agent deployment strategy. This skill was extracted from Phase 2 of research-executor to enable standalone planning without full execution.

## When to Use

- User has a structured research prompt and wants to review the plan before execution
- Need to estimate resources (agents, time, cost) for a research project
- Want to modify or approve the research plan before committing to execution
- Planning a complex research project that requires strategic review
- Need to generate alternative research strategies for comparison

## Core Responsibilities

1. **Subtopic Decomposition**: Break main topic into 3-7 manageable subtopics
2. **Search Strategy Generation**: Create 3-5 search queries per subtopic
3. **Data Source Identification**: Select appropriate sources based on constraints
4. **Multi-Agent Deployment Planning**: Determine agent count, types, and assignments
5. **Resource Estimation**: Calculate expected time, tokens, and cost

## Architecture Position

```
question-refiner (structured prompt)
         ↓
   research-planner (this skill - creates plan) ← NEW
         ↓
   research-executor (validates & executes)
         ↓
   research-orchestrator-agent (orchestrates)
```

**Key Benefit**: Users can review and approve plans before committing to full research execution.

## Input Requirements

**Required**: Structured research prompt with:
- TASK: Clear research objective
- CONTEXT: Background
- SPECIFIC_QUESTIONS: 3-7 sub-questions
- KEYWORDS: Search terms
- CONSTRAINTS: Timeframe, geography, sources
- OUTPUT_FORMAT: Deliverable specs

**Optional**:
- Research complexity (simple/standard/complex)
- Budget constraints (token limit, time limit)
- Preferred agent types (web/academic/technical)

## Output Structure

```markdown
# Research Plan: [Topic]

## 1. Executive Summary
- **Topic**: [Main research topic]
- **Research Type**: [Exploratory, Comparative, etc.]
- **Complexity**: [Simple/Standard/Complex]
- **Estimated Duration**: [15-90 minutes]
- **Estimated Cost**: [$X tokens]

## 2. Subtopic Decomposition
[3-7 subtopics with descriptions]

1. **[Subtopic 1]**: [Description]
   - Focus: [What to investigate]
   - Priority: [High/Medium/Low]
   - Estimated coverage: [X sources]

2. **[Subtopic 2]**: ...

## 3. Search Strategies
[For each subtopic, 3-5 search queries]

### Subtopic 1: [Name]
- Query 1: "[Specific search terms]"
- Query 2: "[Alternative angle]"
- Query 3: "[Verification query]"

## 4. Data Sources
[Recommended sources based on constraints]

| Source Type | Examples | Priority | Rationale |
|-------------|----------|----------|-----------|
| Academic | scholar.google, pubmed | High | Peer-reviewed required |
| Industry | Gartner, Forrester | Medium | Current market data |
| News | Reuters, Bloomberg | Low | Recent developments |

## 5. Multi-Agent Deployment Strategy

### Agent Configuration
- **Total Agents**: [3-8]
- **Model Selection**: [2 sonnet + 3 haiku]
- **Parallel Execution**: Yes

### Agent Assignments
1. **Web Research Agent 1** (haiku)
   - Focus: [Subtopic 1]
   - Queries: [List]
   - Expected output: [Description]

2. **Web Research Agent 2** (haiku)
   - Focus: [Subtopic 2]
   - ...

3. **Academic Agent** (sonnet)
   - Focus: [Technical depth]
   - Sources: [Academic databases]

4. **Cross-Reference Agent** (haiku)
   - Focus: [Fact verification]
   - Method: [Triangulation]

## 6. Resource Estimation

| Resource | Estimate |
|----------|----------|
| **Research Time** | 30-45 minutes |
| **Agent Count** | 5 agents |
| **Token Budget** | 75,000 tokens (15k per agent) |
| **Estimated Cost** | $X (based on model mix) |
| **Expected Output** | 8,000-12,000 words |

## 7. Quality Gates

- Phase 3: All agents must complete with ≥80% success rate
- Phase 5: Synthesis must have ≥30 citations
- Phase 6: Red team validation confidence ≥70%
- Final: Overall quality score ≥8.0

## 8. Contingency Plans

- If agent fails: Redeploy with adjusted queries
- If sources insufficient: Expand search to alternative databases
- If quality low: Trigger refinement (max 2 attempts)

## 9. Approval & Next Steps

**Options**:
1. ✅ Approve and execute plan
2. 🔧 Modify plan (adjust subtopics, agent count, etc.)
3. 🔄 Generate alternative plan
4. ❌ Cancel research
```

## Subtopic Decomposition Algorithm

**Strategy**: Decompose based on research type and complexity

```python
def decompose_to_subtopics(
    task: str,
    questions: List[str],
    research_type: str,
    complexity: str
) -> List[Subtopic]:

    # Determine target count
    if complexity == "simple":
        target_count = 3
    elif complexity == "standard":
        target_count = 5
    elif complexity == "complex":
        target_count = 7

    # Extract subtopics from questions
    subtopics = []

    if research_type == "exploratory":
        subtopics = [
            "Current State & Overview",
            "Key Players & Technologies",
            "Trends & Developments",
            "Challenges & Opportunities",
            "Future Outlook"
        ][:target_count]

    elif research_type == "comparative":
        subtopics = [
            "Option A: Features & Capabilities",
            "Option B: Features & Capabilities",
            "Performance Comparison",
            "Cost Analysis",
            "Use Case Fit",
            "User Experiences",
            "Recommendations"
        ][:target_count]

    elif research_type == "problem-solving":
        subtopics = [
            "Problem Definition & Root Causes",
            "Existing Solutions & Approaches",
            "Trade-offs & Considerations",
            "Implementation Requirements",
            "Best Practices",
            "Success Metrics"
        ][:target_count]

    # Customize based on specific questions
    # ...

    return subtopics
```

## Search Strategy Generation

**For each subtopic, generate 3-5 queries**:

```python
def generate_search_queries(subtopic: Subtopic, keywords: List[str]) -> List[str]:
    queries = []

    # Primary query: Direct topic search
    queries.append(f'"{subtopic.name}" {" ".join(keywords[:3])}')

    # Alternative angle: Different perspective
    queries.append(f'{subtopic.focus} {keywords[0]} trends 2024')

    # Verification query: Cross-check sources
    queries.append(f'{subtopic.name} research study report')

    # Depth query: Technical details
    queries.append(f'{subtopic.name} technical specification')

    # Recent query: Latest developments
    queries.append(f'{subtopic.name} news {current_year}')

    return queries[:5]  # Return top 5
```

## Agent Deployment Decision Matrix

| Research Type | Subtopics | Agents | Model Mix | Rationale |
|---------------|-----------|--------|-----------|-----------|
| Quick Query | 1-2 | 2-3 | All haiku | Fast, low cost |
| Standard Research | 3-5 | 4-5 | 2 sonnet + 3 haiku | Balanced depth & breadth |
| Deep Research | 5-7 | 6-8 | 3-4 sonnet + rest haiku | Comprehensive, high quality |
| Comparative | 2-4 | 4-6 | 2 sonnet + rest haiku | Parallel comparison |
| Technical Deep Dive | 3-5 | 3-5 | All sonnet | Maximum technical depth |

## Resource Estimation Formulas

**Time Estimation**:
```
Time (minutes) = base_time + (subtopics * 5) + (agents * 3)

Where:
- base_time = 15 (setup & planning)
- subtopic_factor = 5 minutes per subtopic
- agent_factor = 3 minutes per agent
```

**Token Estimation**:
```
Tokens = (agents * tokens_per_agent) + overhead

Where:
- tokens_per_agent = 15,000 (default)
- overhead = 10,000 (orchestration, synthesis, validation)
```

**Cost Estimation**:
```
Cost ($) = (sonnet_agents * sonnet_cost) + (haiku_agents * haiku_cost)

Where:
- sonnet_cost = tokens * $0.015 / 1M
- haiku_cost = tokens * $0.0025 / 1M
```

## Plan Modification Support

Users can request modifications:

**Supported Modifications**:
- Add/remove subtopics
- Increase/decrease agent count
- Change model mix (more sonnet for quality, more haiku for cost)
- Adjust time budget
- Modify search strategies
- Change source priorities

**Example**:
```
User: "Make it faster and cheaper"
→ Reduce to 3 agents (all haiku)
→ Focus on top-priority subtopics only
→ Use broader search queries
→ Estimated time: 20 minutes (from 45)
→ Estimated cost: $0.30 (from $1.20)
```

## Integration with Other Skills

**Upstream** (receives from):
- `question-refiner`: Structured research prompt

**Downstream** (outputs to):
- `research-executor`: Validated execution plan
- User: Plan for review and approval

**Parallel** (can work with):
- `ontology-scout`: For domain reconnaissance before planning

## Key Features

- **Standalone Planning**: Can be used without executing research
- **Resource Estimation**: Transparent cost and time projections
- **Customizable**: Supports plan modifications before execution
- **Strategic Review**: Enables informed decision-making
- **Reusable**: Generated plans can be saved and reused

## Examples

See [examples.md](./examples.md) for detailed planning scenarios.

## Detailed Instructions

See [instructions.md](./instructions.md) for implementation guide.
