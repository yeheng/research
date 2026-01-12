# Deep Research Framework - Refactoring Analysis Report

**Date**: 2026-01-12
**Scope**: Complete review of skills, agents, and potential MCP refactoring
**Author**: Claude Code Architecture Review

---

## Executive Summary

This report provides a comprehensive analysis of the Deep Research Framework's current architecture and proposes a strategic refactoring plan to optimize the separation of concerns between **Skills**, **Agents**, and **MCP (Model Context Protocol)** components.

### Key Findings

| Category | Current Count | Recommended |
|----------|--------------|-------------|
| Skills (User-Invocable) | 9 | 4 |
| Skills (Internal) | - | 2 |
| Agents | 0 (embedded in skills) | 5 |
| MCP Tools | 0 | 3 |

### Classification Criteria

| Component Type | Characteristics | Use When |
|----------------|-----------------|----------|
| **Skill** | User-invocable, reusable, stateless, single-purpose | User needs direct access, workflow building blocks |
| **Agent** | Autonomous, stateful, multi-step reasoning, tool access | Complex reasoning, iterative tasks, decision-making |
| **MCP** | Standardized API, external tool integration, data processing | External services, structured I/O, reusable tools |

---

## Part 1: Current State Analysis

### 1.1 Existing Skills Inventory

| Skill | Purpose | Complexity | Dependencies | Issues |
|-------|---------|------------|--------------|--------|
| `question-refiner` | Transform questions to structured prompts | Low | None | ✓ Well-scoped |
| `research-executor` | Orchestrate 7-phase research | **Very High** | All skills | ⚠️ Too monolithic |
| `got-controller` | Graph of Thoughts management | High | State files | ⚠️ Needs state management |
| `synthesizer` | Combine agent findings | Medium | fact-extractor | ⚠️ Mixed responsibilities |
| `citation-validator` | Verify citations | Medium | WebSearch/WebFetch | ⚠️ Could be MCP |
| `red-team-critic` | Adversarial validation | High | WebSearch | ⚠️ Should be Agent |
| `fact-extractor` | Extract atomic facts | Medium | None | ⚠️ Could be MCP |
| `entity-extractor` | Extract entities/relations | Medium | None | ⚠️ Could be MCP |
| `ontology-scout` | Domain reconnaissance | Medium | WebSearch | ⚠️ Should be Agent |

### 1.2 Architectural Issues Identified

#### Issue 1: Skill Overloading

`research-executor` contains:

- Orchestration logic (should be Command)
- Agent deployment logic (should be separate)
- Quality control logic (should be Agent)
- State management (should be centralized)

#### Issue 2: Missing Agent Layer

Skills like `red-team-critic`, `ontology-scout`, and `got-controller` require:

- Autonomous decision-making
- Multi-step reasoning
- Tool chaining
- State persistence

These are Agent characteristics, not Skill characteristics.

#### Issue 3: No MCP Integration

Data processing functions (`fact-extractor`, `entity-extractor`, `citation-validator`) would benefit from:

- Standardized API interface
- Type-safe inputs/outputs
- Reusability across projects
- External tool ecosystem integration

#### Issue 4: Inconsistent State Management

- GoT state in JSON files
- Agent status in separate files
- No centralized state manager
- Race conditions possible with parallel agents

---

## Part 2: Recommended Architecture

### 2.1 Target Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Interface Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │/deep-research│  │/quick-research│  │ Programmatic API    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      Skills Layer (User-Invocable)               │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ question-refiner │  │ research-planner │                     │
│  │ (transform Qs)   │  │ (create plans)   │                     │
│  └──────────────────┘  └──────────────────┘                     │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ report-generator │  │ quality-checker  │                     │
│  │ (format output)  │  │ (final QA)       │                     │
│  └──────────────────┘  └──────────────────┘                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                        Agents Layer                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ research-orchestrator-agent                              │    │
│  │ (coordinates all research activities)                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ got-agent    │  │ red-team-    │  │ ontology-scout-      │   │
│  │ (graph mgmt) │  │ agent        │  │ agent                │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ synthesizer- │  │ web-research-│                             │
│  │ agent        │  │ agents (N)   │                             │
│  └──────────────┘  └──────────────┘                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                         MCP Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ fact-extract │  │ entity-      │  │ citation-validate    │   │
│  │ (facts→JSON) │  │ extract      │  │ (verify sources)     │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ source-rate  │  │ conflict-    │                             │
│  │ (quality A-E)│  │ detect       │                             │
│  └──────────────┘  └──────────────┘                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     State Management Layer                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ StateManager (SQLite/JSON)                               │    │
│  │ - Research sessions                                      │    │
│  │ - GoT graph state                                        │    │
│  │ - Agent coordination                                     │    │
│  │ - Fact ledger                                            │    │
│  │ - Entity graph                                           │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Classification Decision Matrix

| Component | Current | Recommended | Rationale |
|-----------|---------|-------------|-----------|
| `question-refiner` | Skill | **Skill** | User-facing, stateless, single transformation |
| `research-executor` | Skill | **Split** → Command + Agent | Too monolithic; orchestration should be Agent |
| `got-controller` | Skill | **Agent** | Requires state, decisions, iterations |
| `synthesizer` | Skill | **Agent** | Complex reasoning, multi-source aggregation |
| `citation-validator` | Skill | **MCP** | Standardized API, reusable tool |
| `red-team-critic` | Skill | **Agent** | Autonomous adversarial reasoning |
| `fact-extractor` | Skill | **MCP** | Structured I/O, data processing |
| `entity-extractor` | Skill | **MCP** | Structured I/O, NER pipeline |
| `ontology-scout` | Skill | **Agent** | Autonomous exploration, domain mapping |

---

## Part 3: Detailed Component Analysis

### 3.1 Skills to Retain

#### 3.1.1 `question-refiner` (Keep as Skill)

**Current State**: Well-designed, focused, user-invocable
**Recommendation**: Keep with minor enhancements

**Why Skill?**

- Single responsibility: Q → Structured Prompt
- User directly invokes it
- Stateless transformation
- No autonomous decision-making needed

**Enhancements**:

- Add output format validation
- Support multiple prompt templates
- Add research type auto-detection

#### 3.1.2 `research-planner` (New Skill, extracted from research-executor)

**Current State**: Embedded in research-executor Phase 2
**Recommendation**: Extract as separate skill

**Why Skill?**

- User may want to only plan without executing
- Can be reused for different research types
- Stateless: Input → Plan

**Responsibilities**:

- Subtopic decomposition
- Search strategy generation
- Agent deployment planning
- Resource estimation

### 3.2 Skills to Convert to Agents

#### 3.2.1 `got-agent` (from got-controller)

**Current Issues**:

- Requires persistent graph state
- Makes decisions on Generate/Aggregate/Refine/Prune
- Needs to score and prioritize paths
- Iterative process until convergence

**Why Agent?**

- **Stateful**: Maintains graph across operations
- **Autonomous**: Decides next operation based on scores
- **Multi-step**: Iterates until quality threshold
- **Tool access**: Needs StateManager, scoring functions

**Agent Specification**:

```yaml
name: got-agent
description: Manage Graph of Thoughts for research path optimization
capabilities:
  - Generate parallel research paths
  - Score and prioritize nodes
  - Aggregate findings
  - Prune low-quality branches
  - Decide termination conditions
tools:
  - StateManager (graph operations)
  - Scoring functions
  - Node operations (create, update, delete)
state:
  - Current graph structure
  - Budget tracking (tokens, depth)
  - Quality thresholds
```

#### 3.2.2 `red-team-agent` (from red-team-critic)

**Current Issues**:

- Described as "adversarial validation agent" but implemented as skill
- Requires autonomous web searches for counter-evidence
- Makes judgment calls on Accept/Refine/Reject
- Needs to chain multiple verification steps

**Why Agent?**

- **Autonomous reasoning**: Independently seeks counter-evidence
- **Multi-step**: Search → Analyze → Judge → Recommend
- **Tool access**: WebSearch, WebFetch for verification
- **Complex decisions**: Confidence adjustment, bias detection

**Agent Specification**:

```yaml
name: red-team-agent
description: Adversarial validator that challenges research findings
capabilities:
  - Search for counter-evidence
  - Detect biases and conflicts of interest
  - Identify methodological limitations
  - Recommend Accept/Refine/Reject
tools:
  - WebSearch
  - WebFetch
  - Fact verification
state:
  - Claims being validated
  - Counter-evidence found
  - Confidence scores
```

#### 3.2.3 `ontology-scout-agent` (from ontology-scout)

**Current Issues**:

- Requires exploratory web searches
- Builds taxonomy iteratively
- Needs user interaction for validation
- Makes decisions about search depth

**Why Agent?**

- **Exploratory**: Autonomously maps unknown domains
- **Iterative**: Refines taxonomy based on findings
- **Decision-making**: Chooses search directions
- **Interactive**: Presents options to user

**Agent Specification**:

```yaml
name: ontology-scout-agent
description: Domain reconnaissance agent for taxonomy building
capabilities:
  - Rapid breadth-first search
  - Terminology extraction
  - Taxonomy construction
  - User validation interaction
tools:
  - WebSearch
  - Taxonomy builder
  - User interaction (AskUserQuestion)
state:
  - Domain being explored
  - Current taxonomy
  - Confidence levels
```

#### 3.2.4 `synthesizer-agent` (from synthesizer)

**Current Issues**:

- Requires complex reasoning to resolve contradictions
- Needs to maintain coherent narrative across sources
- Makes judgment calls on consensus levels
- Integrates with fact ledger and entity graph

**Why Agent?**

- **Complex reasoning**: Resolves contradictions, builds consensus
- **Multi-source**: Aggregates from multiple agents
- **Tool access**: Fact ledger, entity graph, MCP tools
- **Quality judgment**: Determines synthesis quality

**Agent Specification**:

```yaml
name: synthesizer-agent
description: Combines findings from multiple research agents into coherent reports
capabilities:
  - Collect agent outputs
  - Resolve contradictions
  - Build consensus narratives
  - Generate structured reports
tools:
  - fact-extract (MCP)
  - entity-extract (MCP)
  - conflict-detect (MCP)
  - Report templates
state:
  - Agent findings collected
  - Contradictions detected
  - Synthesis progress
```

#### 3.2.5 `research-orchestrator-agent` (New, extracted from research-executor)

**Current Issues**:

- research-executor is too monolithic
- Orchestration logic mixed with execution
- No autonomous recovery from failures
- Limited parallel coordination

**Why Agent?**

- **Coordination**: Manages multiple research agents
- **Decision-making**: Handles failures, timeouts, quality issues
- **Stateful**: Tracks research progress across phases
- **Autonomous**: Recovers from errors, adjusts strategy

**Agent Specification**:

```yaml
name: research-orchestrator-agent
description: Coordinates the 7-phase research workflow
capabilities:
  - Deploy research agents in parallel
  - Monitor agent progress
  - Handle failures and timeouts
  - Trigger quality checks
  - Manage research state
tools:
  - Task (agent deployment)
  - StateManager
  - Quality checkers
  - All MCP tools
state:
  - Current phase
  - Agent statuses
  - Quality scores
  - Error log
```

### 3.3 Skills to Convert to MCP

#### 3.3.1 `fact-extract` MCP Tool

**Current Issues**:

- fact-extractor has well-defined I/O
- Could be used by multiple agents
- Standardized JSON schema output
- No complex reasoning required

**Why MCP?**

- **Structured I/O**: Text → JSON facts
- **Reusable**: Used by synthesizer, validators
- **Stateless**: Pure transformation
- **API-friendly**: Clear input/output contract

**MCP Tool Specification**:

```yaml
name: fact-extract
description: Extract atomic facts from text with source attribution
input:
  - text: string (raw research content)
  - source_url: string
  - source_metadata: object
output:
  - facts: array of FactObject
  - conflicts: array of ConflictObject
  - extraction_quality: number (0-10)
schema:
  FactObject:
    entity: string
    attribute: string
    value: string
    value_type: enum [number, date, percentage, currency, text]
    confidence: enum [High, Medium, Low]
    source: SourceObject
```

#### 3.3.2 `entity-extract` MCP Tool

**Current Issues**:

- entity-extractor has well-defined NER pipeline
- Outputs structured graph data
- Used by multiple components
- Standard NLP task

**Why MCP?**

- **Standard NLP**: Named entity recognition is a solved problem
- **Structured output**: Entities + Relationships
- **Reusable**: Knowledge graph building block
- **API-friendly**: Clear schema

**MCP Tool Specification**:

```yaml
name: entity-extract
description: Extract named entities and relationships from text
input:
  - text: string
  - entity_types: array [company, person, technology, product, market]
  - extract_relations: boolean
output:
  - entities: array of EntityObject
  - edges: array of EdgeObject
  - cooccurrences: array of CooccurrenceObject
schema:
  EntityObject:
    name: string
    type: string
    aliases: array
    description: string
  EdgeObject:
    source: string
    target: string
    relation: string
    confidence: number
    evidence: string
```

#### 3.3.3 `citation-validate` MCP Tool

**Current Issues**:

- citation-validator does URL checking, format validation
- Could be a reusable tool
- Well-defined quality ratings
- Batch processing capability

**Why MCP?**

- **Validation logic**: Standard checks (URL, format, quality)
- **Batch processing**: Process multiple citations
- **Reusable**: Any document can use it
- **API-friendly**: Citations in → Validation report out

**MCP Tool Specification**:

```yaml
name: citation-validate
description: Validate citations for completeness, accuracy, and quality
input:
  - citations: array of CitationObject
  - verify_urls: boolean
  - check_accuracy: boolean
output:
  - validation_report: ValidationReport
  - quality_score: number (0-10)
  - issues: array of IssueObject
schema:
  CitationObject:
    claim: string
    author: string
    date: string
    title: string
    url: string
  ValidationReport:
    total_citations: number
    complete_citations: number
    accessible_urls: number
    quality_distribution: object (A-E counts)
```

#### 3.3.4 `source-rate` MCP Tool (New)

**Current State**: Embedded in citation-validator
**Recommendation**: Extract as separate MCP tool

**Why MCP?**

- **Single responsibility**: Source → Quality rating
- **Reusable**: Used by validators, synthesizer, reports
- **Standard criteria**: A-E rating with clear rules

**MCP Tool Specification**:

```yaml
name: source-rate
description: Rate source quality on A-E scale
input:
  - source_url: string
  - source_type: enum [academic, industry, news, blog, official]
  - metadata: SourceMetadata
output:
  - quality_rating: enum [A, B, C, D, E]
  - justification: string
  - credibility_indicators: array
```

#### 3.3.5 `conflict-detect` MCP Tool (New)

**Current State**: Embedded in fact-extractor
**Recommendation**: Extract as separate MCP tool

**Why MCP?**

- **Data processing**: Compare facts for conflicts
- **Reusable**: Used by extractors, synthesizer
- **Standard algorithm**: Numerical/temporal/scope comparison

**MCP Tool Specification**:

```yaml
name: conflict-detect
description: Detect conflicts between facts
input:
  - facts: array of FactObject
  - tolerance: ConflictTolerance
output:
  - conflicts: array of ConflictObject
  - severity_summary: object
schema:
  ConflictObject:
    entity: string
    attribute: string
    conflict_type: enum [numerical, temporal, scope, methodological]
    severity: enum [critical, moderate, minor]
    facts: array (conflicting facts)
    possible_explanation: string
```

---

## Part 4: Implementation Task List

### Task 1: Create MCP Server Infrastructure

| Field | Value |
|-------|-------|
| **What** | Set up MCP server structure for data processing tools |
| **Why** | Enable standardized tool interfaces, reusability, and external integration |
| **How** | Create `mcp-server/` directory with TypeScript/Python MCP server implementation |
| **Where** | `.claude/mcp-server/` |
| **Test Cases** | 1. Server starts without errors<br>2. Tools are discoverable via MCP protocol<br>3. Each tool responds to valid inputs<br>4. Error handling for invalid inputs |
| **Acceptance Criteria** | - MCP server running and exposing 5 tools<br>- All tools have JSON schema validation<br>- Integration tests pass<br>- Documentation complete |

---

### Task 2: Implement `fact-extract` MCP Tool

| Field | Value |
|-------|-------|
| **What** | Implement fact extraction as MCP tool with JSON output |
| **Why** | Enable structured fact extraction reusable by multiple agents |
| **How** | 1. Define JSON schema for FactObject<br>2. Port extraction logic from fact-extractor skill<br>3. Add input validation<br>4. Implement batch processing |
| **Where** | `.claude/mcp-server/tools/fact-extract.ts` |
| **Test Cases** | 1. Extract facts from market data text<br>2. Extract facts from technical specs<br>3. Handle empty input<br>4. Validate JSON output schema<br>5. Batch process multiple paragraphs |
| **Acceptance Criteria** | - JSON output matches schema<br>- Extraction accuracy ≥ 90%<br>- Batch processing works<br>- Error messages are clear |

---

### Task 3: Implement `entity-extract` MCP Tool

| Field | Value |
|-------|-------|
| **What** | Implement entity/relationship extraction as MCP tool |
| **Why** | Enable knowledge graph building across multiple agents |
| **How** | 1. Define entity/edge schemas<br>2. Port NER logic from entity-extractor<br>3. Add relationship detection<br>4. Implement co-occurrence tracking |
| **Where** | `.claude/mcp-server/tools/entity-extract.ts` |
| **Test Cases** | 1. Extract companies from investment text<br>2. Extract tech stack from product description<br>3. Detect relationships (invests_in, competes_with)<br>4. Track co-occurrences<br>5. Handle ambiguous entities |
| **Acceptance Criteria** | - Entities correctly typed<br>- Relationships have confidence scores<br>- No duplicate entities<br>- Evidence text preserved |

---

### Task 4: Implement `citation-validate` MCP Tool

| Field | Value |
|-------|-------|
| **What** | Implement citation validation as MCP tool |
| **Why** | Standardize citation checking across all research outputs |
| **How** | 1. Define citation/validation schemas<br>2. Port validation logic<br>3. Add URL accessibility check<br>4. Implement quality scoring |
| **Where** | `.claude/mcp-server/tools/citation-validate.ts` |
| **Test Cases** | 1. Validate complete citation<br>2. Detect missing fields<br>3. Check URL accessibility<br>4. Rate source quality<br>5. Batch validate citations |
| **Acceptance Criteria** | - Completeness check works<br>- URL check has timeout handling<br>- Quality ratings match criteria<br>- Batch processing efficient |

---

### Task 5: Implement `source-rate` MCP Tool

| Field | Value |
|-------|-------|
| **What** | Implement source quality rating as standalone MCP tool |
| **Why** | Single-responsibility tool for consistent quality ratings |
| **How** | 1. Define A-E rating criteria in code<br>2. Create rating algorithm<br>3. Add justification generation |
| **Where** | `.claude/mcp-server/tools/source-rate.ts` |
| **Test Cases** | 1. Rate peer-reviewed journal (→ A)<br>2. Rate industry report (→ B)<br>3. Rate news article (→ C)<br>4. Rate blog post (→ D)<br>5. Rate anonymous source (→ E) |
| **Acceptance Criteria** | - Ratings consistent with criteria<br>- Justifications are clear<br>- Edge cases handled |

---

### Task 6: Implement `conflict-detect` MCP Tool

| Field | Value |
|-------|-------|
| **What** | Implement fact conflict detection as MCP tool |
| **Why** | Enable automated conflict detection for data quality |
| **How** | 1. Define conflict types and severities<br>2. Implement comparison algorithms<br>3. Add explanation generation |
| **Where** | `.claude/mcp-server/tools/conflict-detect.ts` |
| **Test Cases** | 1. Detect numerical conflict (25% vs 18%)<br>2. Detect temporal conflict (2023 vs 2024)<br>3. Detect scope conflict (global vs US only)<br>4. Calculate severity correctly<br>5. Provide possible explanations |
| **Acceptance Criteria** | - All conflict types detected<br>- Severity calculation correct<br>- Explanations helpful |

---

### Task 7: Create `got-agent` Agent

| Field | Value |
|-------|-------|
| **What** | Create Graph of Thoughts agent with state management |
| **Why** | Enable autonomous graph-based research optimization |
| **How** | 1. Define agent in agent registry<br>2. Create graph state schema<br>3. Implement operations (Generate, Aggregate, Refine, Score, Prune)<br>4. Add decision logic for next operation |
| **Where** | `.claude/agents/got-agent/` |
| **Test Cases** | 1. Initialize graph from root node<br>2. Generate k parallel paths<br>3. Score nodes correctly<br>4. Aggregate multiple nodes<br>5. Prune low-scoring branches<br>6. Terminate when threshold reached |
| **Acceptance Criteria** | - Graph state persists across operations<br>- Decisions follow score thresholds<br>- Token budget respected<br>- Quality improves over iterations |

---

### Task 8: Create `red-team-agent` Agent

| Field | Value |
|-------|-------|
| **What** | Create adversarial validation agent |
| **Why** | Enable autonomous counter-evidence search and bias detection |
| **How** | 1. Define agent with WebSearch access<br>2. Implement adversarial search queries<br>3. Add bias detection logic<br>4. Create Accept/Refine/Reject decision framework |
| **Where** | `.claude/agents/red-team-agent/` |
| **Test Cases** | 1. Find counter-evidence for claim<br>2. Detect vendor bias<br>3. Identify methodological flaws<br>4. Adjust confidence scores<br>5. Recommend appropriate action |
| **Acceptance Criteria** | - Counter-evidence searches effective<br>- Bias detection accurate<br>- Recommendations justified<br>- Confidence adjustments appropriate |

---

### Task 9: Create `ontology-scout-agent` Agent

| Field | Value |
|-------|-------|
| **What** | Create domain reconnaissance agent |
| **Why** | Enable autonomous domain mapping before research |
| **How** | 1. Define agent with exploratory capabilities<br>2. Implement rapid search strategy<br>3. Create taxonomy builder<br>4. Add user interaction for validation |
| **Where** | `.claude/agents/ontology-scout-agent/` |
| **Test Cases** | 1. Scout unfamiliar domain<br>2. Extract key terminology<br>3. Build 3-level taxonomy<br>4. Present to user for validation<br>5. Refine based on feedback |
| **Acceptance Criteria** | - Reconnaissance completes in <10 min<br>- Taxonomy structure valid<br>- User interaction works<br>- Refinement incorporated |

---

### Task 10: Create `synthesizer-agent` Agent

| Field | Value |
|-------|-------|
| **What** | Create synthesis agent for combining research findings |
| **Why** | Enable autonomous aggregation with conflict resolution |
| **How** | 1. Define agent with MCP tool access<br>2. Implement collection logic<br>3. Create conflict resolution workflow<br>4. Add narrative generation |
| **Where** | `.claude/agents/synthesizer-agent/` |
| **Test Cases** | 1. Collect findings from 3 agents<br>2. Detect conflicts using MCP<br>3. Resolve contradiction<br>4. Generate coherent narrative<br>5. Maintain all citations |
| **Acceptance Criteria** | - All agent outputs collected<br>- Conflicts detected and resolved<br>- Narrative coherent<br>- Citations complete |

---

### Task 11: Create `research-orchestrator-agent` Agent

| Field | Value |
|-------|-------|
| **What** | Create master orchestrator agent for research workflow |
| **Why** | Enable autonomous coordination of 7-phase research |
| **How** | 1. Define orchestrator agent<br>2. Implement phase management<br>3. Add agent deployment logic<br>4. Create error recovery<br>5. Add quality gates |
| **Where** | `.claude/agents/research-orchestrator-agent/` |
| **Test Cases** | 1. Execute full 7-phase workflow<br>2. Handle agent timeout<br>3. Recover from partial failure<br>4. Enforce quality gates<br>5. Generate progress reports |
| **Acceptance Criteria** | - All phases execute in order<br>- Parallel agents coordinated<br>- Failures recovered<br>- Quality thresholds enforced |

---

### Task 12: Refactor `research-executor` Skill

| Field | Value |
|-------|-------|
| **What** | Simplify research-executor to be a thin wrapper |
| **Why** | Move complexity to orchestrator agent |
| **How** | 1. Remove orchestration logic<br>2. Keep only command interface<br>3. Delegate to orchestrator-agent<br>4. Update documentation |
| **Where** | `.claude/skills/research-executor/` |
| **Test Cases** | 1. Command invokes orchestrator<br>2. Parameters passed correctly<br>3. Results returned to user<br>4. Error messages clear |
| **Acceptance Criteria** | - Skill is thin wrapper<br>- All logic in agent<br>- Backwards compatible |

---

### Task 13: Update `question-refiner` Skill

| Field | Value |
|-------|-------|
| **What** | Enhance question-refiner with output validation |
| **Why** | Ensure consistent structured prompt quality |
| **How** | 1. Add JSON schema for output<br>2. Implement validation<br>3. Add research type detection<br>4. Support multiple templates |
| **Where** | `.claude/skills/question-refiner/` |
| **Test Cases** | 1. Refine exploratory question<br>2. Refine comparative question<br>3. Validate output schema<br>4. Detect research type<br>5. Use appropriate template |
| **Acceptance Criteria** | - Output always valid JSON<br>- Research type detected<br>- Templates work correctly |

---

### Task 14: Create `research-planner` Skill

| Field | Value |
|-------|-------|
| **What** | Extract planning logic from research-executor |
| **Why** | Enable standalone research planning |
| **How** | 1. Extract Phase 2 logic<br>2. Create dedicated skill<br>3. Add plan validation<br>4. Support plan modification |
| **Where** | `.claude/skills/research-planner/` |
| **Test Cases** | 1. Create plan from refined question<br>2. Generate subtopics<br>3. Create search strategies<br>4. Plan agent deployment<br>5. Estimate resources |
| **Acceptance Criteria** | - Plans are complete<br>- Subtopics relevant<br>- Strategies effective |

---

### Task 15: Create Centralized StateManager

| Field | Value |
|-------|-------|
| **What** | Implement centralized state management for all components |
| **Why** | Eliminate state inconsistencies, enable coordination |
| **How** | 1. Design unified state schema<br>2. Implement SQLite/JSON backend<br>3. Add CRUD operations<br>4. Create Python/TS interfaces |
| **Where** | `scripts/state_manager.py` + `.claude/mcp-server/state/` |
| **Test Cases** | 1. Create research session<br>2. Store GoT graph state<br>3. Track agent statuses<br>4. Store facts and entities<br>5. Handle concurrent access |
| **Acceptance Criteria** | - All state centralized<br>- ACID properties maintained<br>- Concurrent access safe<br>- APIs documented |

---

### Task 16: Update Commands

| Field | Value |
|-------|-------|
| **What** | Update command files to use new architecture |
| **Why** | Ensure commands work with refactored components |
| **How** | 1. Update deep-research.md<br>2. Update quick-research.md<br>3. Add new commands if needed<br>4. Update documentation |
| **Where** | `.claude/commands/` |
| **Test Cases** | 1. /deep-research invokes orchestrator<br>2. /quick-research works correctly<br>3. Help text accurate<br>4. Error handling works |
| **Acceptance Criteria** | - All commands functional<br>- Documentation current<br>- User experience smooth |

---

### Task 17: Update CLAUDE.md and Documentation

| Field | Value |
|-------|-------|
| **What** | Update all documentation to reflect new architecture |
| **Why** | Ensure documentation matches implementation |
| **How** | 1. Update CLAUDE.md<br>2. Update ARCHITECTURE.md<br>3. Update README.md<br>4. Update skill/agent docs |
| **Where** | Root directory + .claude/ |
| **Test Cases** | 1. CLAUDE.md describes new architecture<br>2. Commands documented correctly<br>3. MCP tools documented<br>4. Agents documented |
| **Acceptance Criteria** | - All docs up-to-date<br>- Examples work<br>- No outdated references |

---

### Task 18: Integration Testing

| Field | Value |
|-------|-------|
| **What** | Create integration test suite for refactored system |
| **Why** | Ensure all components work together |
| **How** | 1. Create test scenarios<br>2. Test skill→agent→MCP flow<br>3. Test error handling<br>4. Test state persistence |
| **Where** | `tests/integration/` |
| **Test Cases** | 1. Full deep-research workflow<br>2. Quick-research workflow<br>3. Agent failure recovery<br>4. MCP tool chain<br>5. State consistency |
| **Acceptance Criteria** | - All integration tests pass<br>- Coverage ≥ 80%<br>- Performance acceptable |

---

## Part 5: Migration Strategy

### Phase 1: Foundation (Week 1-2)

1. Task 15: StateManager
2. Task 1: MCP Infrastructure

### Phase 2: MCP Tools (Week 2-3)

3. Task 2-6: All MCP tools

### Phase 3: Agents (Week 3-5)

4. Task 7-11: All agents

### Phase 4: Skills & Integration (Week 5-6)

5. Task 12-14: Skill refactoring
2. Task 16: Command updates

### Phase 5: Documentation & Testing (Week 6-7)

7. Task 17: Documentation
2. Task 18: Integration testing

### Backwards Compatibility

During migration:

- Keep old skills working
- Deprecation warnings for old paths
- Gradual cutover to new architecture
- Rollback plan if issues found

---

## Part 6: Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| MCP integration complexity | High | Medium | Start with simple tools, iterate |
| Agent coordination failures | High | Medium | Robust error handling, retries |
| State management bugs | High | Low | Comprehensive testing, transactions |
| Performance degradation | Medium | Low | Profile before/after, optimize |
| Backwards compatibility breaks | Medium | Medium | Feature flags, gradual rollout |

---

## Appendix A: File Structure After Refactoring

```
.claude/
├── commands/
│   ├── deep-research.md
│   └── quick-research.md
├── skills/
│   ├── question-refiner/
│   │   ├── SKILL.md
│   │   ├── instructions.md
│   │   └── examples.md
│   └── research-planner/
│       ├── SKILL.md
│       ├── instructions.md
│       └── examples.md
├── agents/
│   ├── got-agent/
│   │   ├── AGENT.md
│   │   ├── instructions.md
│   │   └── prompts/
│   ├── red-team-agent/
│   ├── ontology-scout-agent/
│   ├── synthesizer-agent/
│   └── research-orchestrator-agent/
├── mcp-server/
│   ├── package.json
│   ├── src/
│   │   ├── index.ts
│   │   └── tools/
│   │       ├── fact-extract.ts
│   │       ├── entity-extract.ts
│   │       ├── citation-validate.ts
│   │       ├── source-rate.ts
│   │       └── conflict-detect.ts
│   └── schemas/
│       ├── fact.json
│       ├── entity.json
│       └── citation.json
└── shared/
    ├── constants/
    └── templates/

scripts/
├── state_manager.py
└── tests/
    └── integration/

RESEARCH/
└── [topic]/
```

---

## Appendix B: Decision Log

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| 2026-01-12 | Convert got-controller to Agent | Requires state, decisions, iterations | Keep as skill with file state |
| 2026-01-12 | Convert fact-extractor to MCP | Structured I/O, reusable | Keep as skill |
| 2026-01-12 | Create orchestrator-agent | research-executor too monolithic | Simplify skill logic |
| 2026-01-12 | Use SQLite for StateManager | ACID properties, no external deps | Redis, PostgreSQL |

---

**End of Report**
