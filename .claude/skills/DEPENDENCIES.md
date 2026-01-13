# Skills Dependencies and Workflow (v2.0)

This document maps the relationships and execution flow for the **refactored 3-layer architecture**.

## v2.0 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Skills (User-Invocable, Thin Wrappers)        │
├─────────────────────────────────────────────────────────┤
│ question-refiner → research-planner → research-executor │
│ citation-validator                                      │
└────────────────────────┬────────────────────────────────┘
                         │ delegates to
┌────────────────────────▼────────────────────────────────┐
│ Layer 2: Agents (Autonomous Executors)                  │
├─────────────────────────────────────────────────────────┤
│ research-orchestrator-agent (master coordinator)        │
│ got-agent                (graph optimization)           │
│ red-team-agent           (adversarial validation)       │
│ synthesizer-agent        (findings aggregation)         │
│ ontology-scout-agent     (domain reconnaissance)        │
└────────────────────────┬────────────────────────────────┘
                         │ uses
┌────────────────────────▼────────────────────────────────┐
│ Layer 3: Infrastructure                                 │
├─────────────────────────────────────────────────────────┤
│ MCP Tools: fact-extract, entity-extract, etc. (12)     │
│ StateManager: Centralized SQLite state management      │
└─────────────────────────────────────────────────────────┘
```

## Current Skills (Layer 1)

### Active Skills

| Skill | Role | Delegates To | Status |
|-------|------|--------------|--------|
| `question-refiner` | Transform raw questions → structured prompts | (Standalone, no delegation) | ✅ Active |
| `research-planner` | Generate execution plans with resource estimates | (Standalone, no delegation) | ✅ Active |
| `research-executor` | Validate & invoke orchestrator agent | research-orchestrator-agent | ✅ Active |
| `citation-validator` | Verify citation quality and accuracy | (Uses MCP tools directly) | ✅ Active |

### Removed Skills (Now Agents or MCP Tools)

| Old Skill | New Implementation | Migration |
|-----------|-------------------|-----------|
| ~~fact-extractor~~ | MCP tool: `fact-extract` | ✅ Removed |
| ~~entity-extractor~~ | MCP tool: `entity-extract` | ✅ Removed |
| ~~red-team-critic~~ | Agent: `red-team-agent` | ✅ Removed |
| ~~ontology-scout~~ | Agent: `ontology-scout-agent` | ✅ Removed |
| ~~got-controller~~ | Agent: `got-agent` | ✅ Removed (v2.1) |
| ~~synthesizer~~ | Agent: `synthesizer-agent` | ✅ Removed (v2.1) |

## Dependency Graph (v2.0)

```
User Input
    │
    ▼
┌────────────────────┐
│ question-refiner   │ Validates & structures
└─────────┬──────────┘
          │ structured prompt
          ▼
┌────────────────────┐
│ research-planner   │ (OPTIONAL) Creates execution plan
└─────────┬──────────┘
          │ approved plan
          ▼
┌────────────────────┐
│ research-executor  │ Thin wrapper: validates input
└─────────┬──────────┘
          │ invokes agent
          ▼
┌─────────────────────────────┐
│ research-orchestrator-agent │ Executes ALL 7 phases
└─────────┬───────────────────┘
          │
          ├─ Phase 1: Validation
          ├─ Phase 2: Planning (if not done)
          ├─ Phase 3: Multi-Agent Deployment ───┐
          │    ├─ ontology-scout-agent (if needed)
          │    ├─ got-agent (if complex)
          │    └─ 3-8 parallel research agents
          ├─ Phase 4: Source Triangulation
          ├─ Phase 5: Synthesis ────────────────┐
          │    └─ synthesizer-agent             │
          ├─ Phase 6: Quality Assurance ────────┤
          │    └─ red-team-agent                │
          └─ Phase 7: Output Generation         │
                                                 │
          ┌──────────────────────────────────────┘
          ▼
    RESEARCH/[topic]/
    ├── executive_summary.md
    ├── full_report.md
    ├── data/
    ├── sources/
    └── appendices/
```

## Primary Workflows

### Workflow 1: Standard Deep Research (v2.0)

```
User Question
  ↓
[question-refiner] → Structured prompt (with validation, quality scoring)
  ↓
[research-planner] → Execution plan (OPTIONAL, for user review)
  ↓
[research-executor] → Validates & invokes orchestrator agent
  ↓
[research-orchestrator-agent] → Executes all 7 phases autonomously
  ├─ Validates prompt
  ├─ Creates plan (if not provided)
  ├─ Deploys 3-8 agents in parallel
  ├─ Invokes synthesizer-agent
  ├─ Invokes red-team-agent
  └─ Generates structured output
  ↓
RESEARCH/[topic]/ → Complete research package
```

**Use when**: Standard research with clear objectives
**Duration**: 30-60 minutes
**Cost**: $0.50-$2.00 depending on complexity

### Workflow 2: Complex Research with GoT (v2.0)

```
User Question
  ↓
[question-refiner] → Structured prompt
  ↓
[research-planner] → Plan showing GoT will be used
  ↓
[research-executor] → Invokes orchestrator agent
  ↓
[research-orchestrator-agent]
  ├─ Detects complexity → Invokes got-agent
  │  └─ [got-agent] manages graph operations:
  │      ├─ Generate(k): Create parallel paths
  │      ├─ Score: Evaluate quality
  │      ├─ Aggregate: Merge findings
  │      └─ Prune: Remove low-quality paths
  ├─ Continues with remaining phases
  └─ Generates output
  ↓
RESEARCH/[topic]/ + appendices/got_graph.json
```

**Use when**: Multi-faceted topics, strategic exploration needed
**Duration**: 45-90 minutes
**Cost**: $1.00-$3.00

### Workflow 3: Quick Research (Simplified)

```
User Question
  ↓
[research-executor] → Direct invocation (skip refinement if clear)
  ↓
[research-orchestrator-agent]
  ├─ Uses simplified 5-phase workflow
  ├─ Deploys 2-3 agents only
  └─ Lightweight synthesis
  ↓
RESEARCH/[topic]/ → Basic report
```

**Use when**: Quick lookups, narrow topics, low-stakes
**Duration**: 15-25 minutes
**Cost**: $0.20-$0.50

## Skill Responsibilities (v2.0)

### question-refiner (Standalone)

**Input**: Raw user question (string)
**Output**: Structured research prompt (JSON)

**Responsibilities**:
1. Research type detection (6 types: exploratory, comparative, etc.)
2. Progressive questioning (3-5 clarifying questions)
3. Structured prompt generation (TASK, CONTEXT, QUESTIONS, etc.)
4. JSON schema validation
5. Quality scoring (0-10 scale, ≥8.0 required)
6. Automatic refinement if quality < threshold

**Dependencies**: None
**Delegation**: None (standalone logic)

### research-planner (Standalone)

**Input**: Structured prompt (from question-refiner)
**Output**: Execution plan with resource estimates

**Responsibilities**:
1. Subtopic decomposition (3-7 subtopics)
2. Search strategy generation (3-5 queries per subtopic)
3. Agent deployment planning (count, types, assignments)
4. Resource estimation (time, tokens, cost)
5. Quality gates definition
6. Plan modification support

**Dependencies**: Structured prompt
**Delegation**: None (standalone logic)

### research-executor (Thin Wrapper)

**Input**: Structured prompt (validated)
**Output**: Complete research package

**Responsibilities**:
1. ✅ Input validation (prompt completeness)
2. ✅ Agent invocation (research-orchestrator-agent)
3. ✅ Progress monitoring
4. ✅ Result delivery

**Dependencies**: Structured prompt
**Delegation**: ✅ **ALL orchestration to research-orchestrator-agent**

**Code Pattern**:
```python
def execute_research(structured_prompt):
    # Step 1: Validate
    validate_prompt(structured_prompt)

    # Step 2: Invoke agent (ALL logic happens here)
    result = Task({
        'subagent_type': 'research-orchestrator',
        'prompt': f'Execute 7-phase research: {structured_prompt}',
        'description': 'Execute deep research workflow'
    })

    # Step 3: Return results
    return result
```

### citation-validator (Standalone)

**Input**: Draft report with citations
**Output**: Validation report with quality scores

**Responsibilities**:
1. Citation completeness check
2. Citation accuracy verification
3. Source quality rating (A-E scale)
4. Broken link detection
5. Format validation

**Dependencies**: MCP tools (`citation-validate`, `source-rate`)
**Delegation**: Uses MCP tools directly (no agent)

## Execution Patterns

### Pattern A: Thin Wrapper (v2.0 Standard)

```python
# Skills are thin wrappers that delegate to agents
def skill_execute(input_data):
    # Step 1: Validate input
    if not validate(input_data):
        raise ValidationError("Invalid input")

    # Step 2: Invoke agent (ALL logic here)
    result = invoke_agent(
        agent_type='specialized-agent',
        prompt=f'Execute task: {input_data}'
    )

    # Step 3: Return result
    return result
```

**Used by**: research-executor

**Benefits**:
- Simple, maintainable skills
- Agent autonomy and error recovery
- Clear separation of concerns

### Pattern B: Standalone Logic (v2.0)

```python
# Skills with embedded logic (no agent delegation)
def skill_execute(input_data):
    # All logic in skill
    result = perform_validation(input_data)
    result = apply_transformations(result)
    result = calculate_quality_score(result)
    return result
```

**Used by**: question-refiner, research-planner, citation-validator

**Rationale**:
- Validation/planning logic doesn't need agent autonomy
- Faster execution (no agent overhead)
- Deterministic operations

## Decision Matrix: Which Workflow?

| Scenario | Workflow | Skills Invoked | Agents Deployed | Duration |
|----------|----------|----------------|-----------------|----------|
| Vague question | Standard | refiner → planner → executor | orchestrator + 4-5 agents | 30-60 min |
| Clear, narrow question | Quick | executor only | orchestrator + 2-3 agents | 15-25 min |
| Complex, multi-faceted | GoT-enhanced | refiner → planner → executor | orchestrator + got + 6-8 agents | 45-90 min |
| High-stakes research | Standard + validation | All skills | orchestrator + red-team + 5-7 agents | 40-75 min |
| Quick fact-check | Quick | executor only | orchestrator + 1-2 agents | 10-20 min |

## State Management (v2.0)

All research state is managed centrally by **StateManager** (Layer 3):

```python
from scripts.state_manager import StateManager

sm = StateManager()

# Create research session
session = sm.create_session(ResearchSession(
    session_id='research-001',
    research_topic='AI Chips Market'
))

# Track agent deployments
agent = sm.register_agent(ResearchAgent(
    agent_id='agent-001',
    session_id='research-001',
    agent_type='web-research'
))

# Store facts extracted by agents
fact = sm.add_fact(Fact(
    entity='AI Market',
    attribute='size',
    value='$184B',
    session_id='research-001'
))

# Query state at any time
status = sm.get_session_status('research-001')
```

**Benefits**:
- Centralized state tracking
- Thread-safe operations
- ACID compliance
- Historical session retrieval

## Performance Metrics (v2.0)

| Workflow | Avg Duration | Agents Deployed | Token Usage | Cost | Success Rate |
|----------|-------------|-----------------|-------------|------|--------------|
| Quick | 15-25 min | 2-3 | ~30k | $0.20-$0.50 | 85% |
| Standard | 30-60 min | 4-5 | ~75k | $0.50-$1.50 | 92% |
| GoT-enhanced | 45-90 min | 6-8 | ~130k | $1.00-$3.00 | 96% |

## Best Practices (v2.0)

1. **Always use question-refiner** for vague or unclear questions
   - Ensures quality score ≥8.0 before execution
   - Detects research type automatically

2. **Use research-planner for complex projects**
   - Review resource estimates before committing
   - Adjust plan based on budget constraints

3. **Trust agent autonomy**
   - research-orchestrator-agent handles all orchestration
   - Agents recover from errors automatically

4. **Monitor StateManager**
   - Check session status for real-time progress
   - Query fact ledger for extracted findings

5. **Leverage GoT for complex topics**
   - Automatically enabled when complexity detected
   - Optimizes quality through iterative refinement

6. **Always validate citations**
   - Use citation-validator for high-stakes research
   - Target A-B average source quality

## Troubleshooting (v2.0)

### Skill Invocation Fails

**Symptom**: Skill returns error immediately

**Common Causes**:
- Invalid input format (e.g., missing required fields in structured prompt)
- Agent deployment failed (check `.claude/agents/` directory)
- StateManager database locked (check `state/research_state.db`)

**Solution**:
1. Validate input against JSON schema
2. Check agent availability: `ls .claude/agents/`
3. Restart StateManager if database locked

### Agent Timeout

**Symptom**: research-orchestrator-agent exceeds time limit

**Common Causes**:
- Too many agents deployed (>8)
- Complex topic requiring GoT but not enabled
- Network issues with web searches

**Solution**:
1. Reduce agent count in plan
2. Enable GoT optimization explicitly
3. Check network connectivity

### Quality Score Below Threshold

**Symptom**: Output quality < 8.0, fails validation

**Common Causes**:
- Low-quality sources (D/E rated)
- Missing citations
- Contradictions not resolved

**Solution**:
1. Refine with better source constraints
2. Enable red-team-agent validation
3. Use GoT refinement operations

---

**Version**: 2.1
**Last Updated**: 2026-01-13
**Architecture**: 3-Layer (Skills → Agents → Infrastructure)
**Changes v2.1**: Removed got-controller and synthesizer skills (moved entirely to agents)
