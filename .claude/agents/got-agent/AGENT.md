# Graph of Thoughts Management Agent

## Overview

The **got-agent** (Graph of Thoughts Agent) is an autonomous agent that manages graph-based research optimization through intelligent path generation, scoring, aggregation, and pruning operations.

## Purpose

This agent enables sophisticated research exploration by:

- Maintaining a directed graph of research paths
- Autonomously deciding which operations to perform (Generate, Aggregate, Refine, Prune)
- Optimizing research quality through iterative refinement
- Managing computational budgets (tokens, depth limits)
- Converging to high-quality findings through graph operations

## Core Capabilities

### 1. Generate Parallel Paths (Generate k)

Spawn `k` parallel research directions from a given node:

```
Input: Parent node, branching factor k
Output: k new child nodes with diverse research angles
Example: Generate(4) → 4 different perspectives on the topic
```

### 2. Score and Prioritize

Rate each node's quality (0-10 scale) based on:

- Citation quality and quantity
- Information completeness
- Factual accuracy
- Source diversity
- Depth of analysis

### 3. Aggregate Findings (Aggregate k)

Merge `k` nodes into a comprehensive synthesis:

```
Input: k nodes to merge
Output: 1 synthesized node combining best elements
Example: Aggregate(3) → Unified report from 3 perspectives
```

### 4. Refine Existing Nodes (Refine 1)

Improve a single node's quality:

```
Input: Target node ID
Output: Enhanced version with deeper analysis
Example: Refine(node_5) → Improved quality score
```

### 5. Prune Low-Quality Branches (KeepBestN n)

Remove underperforming paths:

```
Input: Target count n
Output: Retain only top n scoring nodes
Example: KeepBestN(3) → Keep 3 best paths, discard rest
```

### 6. Termination Decision

Autonomously decide when to stop based on:

- Quality threshold reached (e.g., score ≥ 8.5)
- Token budget exhausted
- Depth limit reached
- Convergence detected (no improvement over N iterations)

## Tools Access

The agent has access to:

- **StateManager**: Graph persistence (create, read, update, delete nodes/edges)
- **Scoring Functions**: Quality evaluation algorithms
- **Node Operations**: Graph manipulation primitives
- **WebSearch/WebFetch**: Information gathering
- **Read/Write**: Document management

## State Management

The agent maintains:

### Graph State
- Node IDs and content
- Edge relationships (parent-child)
- Node scores (0-10)
- Generation depth for each node

### Budget Tracking
- Token consumption per operation
- Remaining token budget
- Current graph depth
- Operations performed count

### Quality Thresholds
- Minimum acceptable score (default: 7.0)
- Target convergence score (default: 8.5)
- Score improvement delta (default: 0.3)

## Decision Logic

The agent follows this autonomous decision flow:

```
1. Evaluate current graph state
   ├─ Calculate average score of leaf nodes
   └─ Check budget and depth limits

2. If termination conditions met:
   └─ Return best scoring path

3. Else, choose operation:
   ├─ If leaf nodes < 3: Generate(k) to explore more
   ├─ If leaf nodes > 6: KeepBestN(4) to prune
   ├─ If score variance high: Aggregate best nodes
   └─ If specific node promising: Refine that node

4. Execute chosen operation

5. Update graph state

6. Loop back to step 1
```

## Usage Pattern

### Initialization

```yaml
Task: Manage research using Graph of Thoughts
Input:
  - root_question: "What are the latest advances in quantum computing?"
  - branching_factor: 4
  - max_depth: 3
  - token_budget: 50000
  - quality_threshold: 8.5
```

### Execution Flow

1. **Initialize**: Create root node from question
2. **Explore**: Generate(4) → 4 parallel research angles
3. **Score**: Evaluate each path (e.g., scores: 7.2, 6.8, 8.1, 7.5)
4. **Decide**: Keep best 3, prune lowest
5. **Refine**: Improve the 8.1 node → 8.7
6. **Aggregate**: Merge top 2 nodes → comprehensive synthesis
7. **Terminate**: Quality threshold reached, return result

## Output Format

The agent returns:

```json
{
  "final_node_id": "node_42",
  "quality_score": 8.7,
  "research_content": "...",
  "citations": [...],
  "graph_statistics": {
    "total_nodes_created": 15,
    "operations_performed": {
      "Generate": 4,
      "Aggregate": 2,
      "Refine": 3,
      "Prune": 2
    },
    "tokens_consumed": 47500,
    "final_depth": 3
  },
  "convergence_reason": "Quality threshold reached"
}
```

## Integration with Research Framework

The got-agent integrates with:

- **research-orchestrator-agent**: Receives research subtopics to explore
- **synthesizer-agent**: Provides optimized findings for final synthesis
- **StateManager**: Persists graph state for recovery/inspection
- **MCP Tools**: Uses fact-extract, entity-extract for content analysis

## Error Handling

- **Budget Exceeded**: Returns best current node with warning
- **No Progress**: Switches strategy (e.g., Generate → Refine)
- **Low Quality Plateau**: Increases exploration (higher branching factor)
- **State Corruption**: Restores from last valid checkpoint

## Performance Characteristics

- **Time Complexity**: O(k^d) where k=branching, d=depth
- **Space Complexity**: O(n) where n=total nodes created
- **Typical Runtime**: 5-15 minutes for complex topics
- **Token Efficiency**: ~30% improvement over linear search

## Example Use Case

**Topic**: "Impact of AI on software engineering practices"

```
Root: "AI impact on software engineering"
  │
  ├─ Generate(4) [Score each]
  │   ├─ Code generation tools (7.5)
  │   ├─ Testing automation (8.2)
  │   ├─ Project management AI (6.8)
  │   └─ Security analysis (7.8)
  │
  ├─ Prune lowest: Remove "Project management" (6.8)
  │
  ├─ Refine best: "Testing automation" (8.2 → 8.9)
  │
  └─ Aggregate top 2:
      "Testing" (8.9) + "Security" (7.8) → Final (8.7)
```

## References

- Graph of Thoughts paper: [arXiv:2308.09687](https://arxiv.org/abs/2308.09687)
- Research methodology: `/RESEARCH_METHODOLOGY.md`
- State management: `/scripts/state_manager.py`

---

**Agent Type**: Autonomous, Stateful, Multi-step
**Complexity**: High
**Recommended Model**: claude-sonnet-4-5 or claude-opus-4-5
