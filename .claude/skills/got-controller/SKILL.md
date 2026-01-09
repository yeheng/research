---
name: got-controller
description: Graph of Thoughts (GoT) Controller - 管理研究图状态，执行图操作（Generate, Aggregate, Refine, Score），优化研究路径质量。当研究主题复杂或多方面、需要策略性探索（深度 vs 广度）、高质量研究时使用此技能。
---

# GoT Controller

## Overview

Orchestrate complex multi-agent research using Graph of Thoughts framework, optimizing information quality through strategic operations.

## When to Use

- Research topic is complex and multifaceted
- Need strategic exploration (depth vs breadth decisions)
- High-stakes research requiring quality optimization
- Exploratory research where optimal path is unclear

## Core Concepts

**Graph Elements**:

- **Nodes**: Research findings with quality scores (0-10)
- **Edges**: Dependencies between findings
- **Frontier**: Active nodes available for exploration
- **Operations**: Generate, Aggregate, Refine, Score, KeepBestN

## GoT Operations

1. **Generate(k)**: Create k parallel research paths
2. **Aggregate(k)**: Combine k findings into synthesis
3. **Refine(1)**: Improve existing finding
4. **Score**: Evaluate quality (0-10 scale)
5. **KeepBestN(n)**: Prune to top n nodes

## Execution Patterns

- **Breadth-First**: Wide exploration → prune → aggregate
- **Depth-First**: Find best path → drill deep → refine
- **Balanced**: Mix of breadth and depth based on scores

## Decision Logic

- **Generate**: Score ≥ 7.0, explore multiple angles
- **Aggregate**: After 2-3 generation rounds
- **Refine**: Score ≥ 6.0, needs polish
- **Prune**: Score < 6.0 or redundant

## State Management

Track graph state in `research_notes/got_graph_state.md`:

- Node IDs, scores, parents, children, status
- Operations log with timestamps
- Frontier nodes for next iteration

## Safety Limits

| Limit | Value | Action if Exceeded |
|-------|-------|-------------------|
| Max iterations | 10 | Force aggregation and terminate |
| Max nodes | 50 | Prune lowest-scoring nodes |
| Max time | 30 min | Checkpoint and notify user |
| Min score threshold | 3.0 | Auto-prune nodes below |

## Token Optimization

> 📋 **Reference**: `.claude/shared/constants/token_optimization.md`

**Node Size Limit**: 5k tokens per node

**Pruning Strategy**:
- Score <6.0: Immediate removal
- Score 6.0-7.0: Summarize to 1k tokens
- Score >7.0: Keep full content

**State Checkpointing**: Every 3 operations to `research_notes/got_state_checkpoint_N.json`

**Context Budget**: 50k tokens max

## Error Handling

> 📋 **Reference**: `.claude/shared/constants/error_codes.md`

**Common Errors**:
- **E202**: Quality score below threshold → Refine or gather more sources
- **E303**: Max iterations exceeded → Force aggregation
- **E304**: File system error → Check permissions

**Retry Strategy**: Up to 2 refinement attempts for low-quality nodes

**Graceful Degradation**: If max iterations reached, aggregate best available nodes

## Termination Conditions

Research completes when **any** of these are met:
- Final aggregate score ≥ 9.0
- 3 consecutive refinements yield < 0.2 improvement
- Max iterations (10) reached
- All frontier nodes have score < 6.0

## Examples

See [examples.md](./examples.md) for execution patterns.

## Detailed Instructions

See [instructions.md](./instructions.md) for complete GoT methodology.
