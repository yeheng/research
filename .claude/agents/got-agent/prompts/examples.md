# Graph of Thoughts Agent - Example Prompts

## Example 1: Technology Research

### Input

```yaml
research_question: "What are the latest advances in quantum computing?"
config:
  branching_factor: 4
  max_depth: 3
  token_budget: 50000
  quality_threshold: 8.5
  min_score: 7.0
```

### Expected Execution Flow

**Iteration 1: Generate(4)**

```
Root: "Quantum computing advances"
├─ Hardware improvements (qubits, error correction)
├─ Algorithm breakthroughs (Shor's, Grover's variants)
├─ Commercial applications (finance, drug discovery)
└─ Comparative analysis (quantum vs classical)

Scores: [7.2, 6.8, 8.1, 7.5]
```

**Iteration 2: Prune lowest**

```
Remove: Algorithm breakthroughs (6.8)
Keep: [7.2, 8.1, 7.5]
```

**Iteration 3: Refine(best)**

```
Refine: Commercial applications (8.1 → 8.6)
```

**Result**: Node "Commercial applications" (8.6) meets threshold

---

## Example 2: Market Analysis

### Input

```yaml
research_question: "What is the market impact of generative AI on software development?"
config:
  branching_factor: 3
  max_depth: 4
  token_budget: 60000
  quality_threshold: 8.0
```

### Execution Flow

**Iteration 1: Generate(3)**

```
├─ Code generation tools market (6.9)
├─ Developer productivity impact (7.8)
└─ Job market effects (7.2)
```

**Iteration 2: Generate(2) from best node**

```
Developer productivity (7.8)
├─ Quantitative metrics (7.5)
└─ Case studies (8.2)
```

**Iteration 3: Aggregate(2)**

```
Merge: Productivity metrics (7.5) + Case studies (8.2)
→ Comprehensive productivity analysis (8.4)
```

**Result**: Aggregated node (8.4) meets threshold

---

## Example 3: Complex Multi-Perspective Research

### Input

```yaml
research_question: "How will AI regulation affect tech innovation in the EU?"
config:
  branching_factor: 5
  max_depth: 3
  token_budget: 80000
  quality_threshold: 8.5
```

### Execution Flow

**Iteration 1: Generate(5) - Diverse perspectives**

```
├─ Legal framework analysis (7.0)
├─ Industry stakeholder views (7.3)
├─ Historical regulatory precedents (6.5)
├─ Economic impact projections (7.8)
└─ Technical compliance challenges (7.5)
```

**Iteration 2: Prune worst 2**

```
Remove: Historical precedents (6.5), Legal framework (7.0)
Keep: [7.3, 7.8, 7.5]
```

**Iteration 3: Refine(Economic impact)**

```
Economic impact: 7.8 → 8.3
(Added more citations, deeper analysis)
```

**Iteration 4: Refine again**

```
Economic impact: 8.3 → 8.6
(Resolved conflicts, improved sources)
```

**Result**: Economic impact node (8.6) meets threshold

---

## Example 4: Recovery from Low Quality

### Input

```yaml
research_question: "What are emerging trends in edge computing?"
config:
  branching_factor: 3
  max_depth: 3
  quality_threshold: 8.0
```

### Execution Flow

**Iteration 1: Generate(3)**

```
├─ Hardware trends (5.8) ⚠️ Low
├─ Use cases (6.2)
└─ Market forecast (6.5)
```

⚠️ **All nodes < 7.0 (min threshold)**

**Iteration 2: Strategy switch - Increase exploration**

```
Generate(5) from root with different angles:
├─ 5G + Edge integration (7.2)
├─ IoT edge architectures (7.5)
├─ Edge AI processing (7.8)
├─ Security at edge (6.9)
└─ Latency optimization (7.3)
```

**Iteration 3: Refine(Edge AI)**

```
Edge AI: 7.8 → 8.4
(Added technical depth, better sources)
```

**Result**: Edge AI node (8.4) meets threshold

---

## Example 5: Budget-Constrained Research

### Input

```yaml
research_question: "What is the state of blockchain scalability solutions?"
config:
  branching_factor: 3
  max_depth: 2
  token_budget: 30000  # Limited budget
  quality_threshold: 8.0
```

### Execution Flow

**Iteration 1: Generate(3)**

```
├─ Layer 2 solutions (7.5)
├─ Sharding approaches (7.2)
└─ Alternative consensus (6.8)

Tokens used: 12000
```

**Iteration 2: Refine(Layer 2)**

```
Layer 2: 7.5 → 7.9
Tokens used: 22000
```

**Iteration 3: Refine again**

```
Layer 2: 7.9 → 8.1
Tokens used: 29500
```

⚠️ **Budget almost exhausted (29500/30000)**

**Result**: Layer 2 node (8.1) returned before budget exceeded

---

## Prompt Template for Generate Operation

```
You are exploring: {parent_node_content}

Generate {k} diverse research paths that:
1. Cover different aspects/perspectives
2. Are complementary (not redundant)
3. Each focus on a specific angle

For this path, research:
- Angle: {angle_description}
- Focus areas: {specific_topics}
- Required depth: {depth_level}

Search queries to use:
{generated_queries}

Requirements:
- Find 5-10 high-quality sources (prefer A/B rated)
- Extract key facts with citations
- Ensure completeness (introduction, details, implications)
- Word count: 500-1000 words

Output format:
## {angle_title}

[Introduction paragraph]

### Key Findings
1. [Finding with citation]
2. [Finding with citation]
...

### Implications
[Analysis]

### Sources
[Full citations]
```

---

## Prompt Template for Aggregate Operation

```
You are aggregating {k} research nodes into a comprehensive synthesis.

Nodes to merge:
1. {node_1_summary} (Score: {score_1})
2. {node_2_summary} (Score: {score_2})
...

Tasks:
1. Extract all facts from each node using MCP fact-extract
2. Detect conflicts using MCP conflict-detect
3. Resolve any contradictions with additional research
4. Create unified narrative that:
   - Combines best elements from each node
   - Maintains all high-quality citations
   - Provides comprehensive coverage
   - Flows coherently

Structure:
## Comprehensive Analysis of {topic}

### Overview
[Synthesized introduction]

### Detailed Findings
[Merged content from all nodes, organized logically]

### Cross-Node Insights
[New insights from combining perspectives]

### Conclusion
[Unified implications and recommendations]

### Complete Bibliography
[All citations from all nodes, deduplicated]

Target word count: {sum of node word counts}
Expected score improvement: +0.5 to +1.0 over best input node
```

---

## Prompt Template for Refine Operation

```
You are refining node: {node_id}
Current score: {current_score}
Target score: {target_score} (minimum +0.3 improvement)

Current content analysis:
- Strengths: {identified_strengths}
- Weaknesses: {identified_weaknesses}

Refinement strategy:
{chosen_strategy}

Tasks:
1. {specific_improvement_1}
2. {specific_improvement_2}
...

Requirements:
- Address ALL identified weaknesses
- Maintain existing strengths
- Add missing citations (use MCP citation-validate)
- Resolve conflicts (use MCP conflict-detect)
- Improve source quality (replace D/E with A/B using MCP source-rate)
- Expand incomplete sections

Output: Enhanced version of original content with measurable improvements
```

---

## Decision Logic Examples

### When to Generate

```
IF active_leaf_nodes < 3:
  REASON: "Insufficient exploration, need more paths"
  ACTION: Generate(k=4)

IF all_scores < 7.0:
  REASON: "Quality too low, try different angles"
  ACTION: Generate(k=5) with different strategy
```

### When to Aggregate

```
IF active_leaf_nodes >= 3 AND score_variance > 1.5:
  REASON: "Multiple good paths, combine for synthesis"
  ACTION: Aggregate(best_k=2)

IF depth_limit_approaching AND multiple_good_nodes:
  REASON: "Depth limit near, consolidate now"
  ACTION: Aggregate(all_nodes_above_7.0)
```

### When to Refine

```
IF max_score in range [7.5, 8.3]:
  REASON: "Promising node, likely to reach threshold with improvement"
  ACTION: Refine(best_node_id)

IF node_has_specific_fixable_issues:
  REASON: "Clear improvement path identified"
  ACTION: Refine(target_node_id)
```

### When to Prune

```
IF active_leaf_nodes > 6:
  REASON: "Too many paths, wasting resources"
  ACTION: KeepBestN(n=4)

IF budget_below_30_percent_remaining:
  REASON: "Limited budget, focus on best paths"
  ACTION: KeepBestN(n=2)
```

---

## Error Recovery Examples

### Scenario: No Improvement After Refine

```
IF refined_score <= original_score:
  LOG: "Refinement failed to improve score"
  ANALYZE: What went wrong?
    - Strategy ineffective?
    - Wrong weaknesses identified?
  NEW_STRATEGY:
    - Try different refinement approach
    - OR: Aggregate with another node
    - OR: Generate new path instead
```

### Scenario: All Nodes Below Minimum

```
IF all_nodes < min_acceptable_score:
  LOG: "Quality crisis - all paths below minimum"
  ACTIONS:
    1. Increase branching factor (explore more)
    2. Change search strategy (different queries)
    3. Consider: Is question too broad/narrow?
    4. Generate(k=5) with revised approach
```

### Scenario: Budget Exhausted Early

```
IF tokens_used > 80% AND max_score < threshold:
  DECISION: "Focus remaining budget on best node"
  ACTION:
    - Prune all except top node
    - Refine best node with remaining tokens
    - Accept best available result if threshold unreachable
```
