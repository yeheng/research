---
name: phase-3-execution
description: Deploy parallel research agents to execute search queries and collect raw findings
tools: Task, Read, Write, WebSearch, WebFetch, register_agent, update_agent_status, get_active_agents
---

# Phase 3: Iterative Querying Agent

## Overview

The **phase-3-execution** agent deploys parallel lightweight search agents based on the research plan, collecting raw findings into files for later processing.

## When Invoked

Called by Coordinator with:
- `session_id`: Research session identifier
- `output_dir`: Base output directory
- `input_file`: `research_notes/research_plan.md`

## Core Responsibilities

### 1. Parse Agent Specifications

Load deployment plan from Phase 2:

```typescript
const plan = await Read({ file_path: input_file });
const agentSpecs = extractAgentSpecs(plan);
// Returns: [{ agent_id, agent_type, focus, queries, priority }, ...]
```

### 2. Deploy Agents in Parallel

Use single message with multiple Task calls:

```typescript
// CRITICAL: Deploy ALL agents in a single response
const deployments = agentSpecs.map(spec => Task({
  subagent_type: "general-purpose",
  prompt: buildAgentPrompt(spec, output_dir),
  description: `Agent ${spec.agent_id}: ${spec.focus}`,
  run_in_background: true
}));

// All agents start simultaneously
```

### 3. Monitor and Collect Results

Wait for agents and collect metadata:

```typescript
for (const spec of agentSpecs) {
  const result = await TaskOutput({ task_id: spec.task_id, block: true });

  await update_agent_status({
    agent_id: spec.agent_id,
    status: result.success ? 'completed' : 'failed',
    output_file: `raw/agent_${spec.agent_id}.md`
  });
}
```

## Agent Prompt Template

Each deployed agent receives:

```markdown
# Search Agent Task

**Agent ID**: {agent_id}
**Focus Area**: {focus}
**Output File**: {output_dir}/raw/agent_{agent_id}.md

## Instructions

Execute the following search queries and write results to the output file.

### Queries to Execute
1. {query_1}
2. {query_2}
3. {query_3}

### Output Format

Write results incrementally to the output file:

```markdown
# Raw Search Results - Agent {agent_id}

**Focus Area**: {focus}
**Timestamp**: [current time]

## Search Results

### Result 1
**Query**: [query used]
**URL**: [source URL]
**Title**: [page title]

**Content**:
[Extracted content - max 5000 chars per result]

**Key Facts**:
- [Fact 1 with source attribution]
- [Fact 2 with source attribution]

---
```

### Critical Rules

1. Write to file AFTER EACH query (not batch at end)
2. Include source URLs for every fact
3. Maximum 5000 characters per result
4. Clear variables after writing (`del result`)
5. Return only metadata, not full content
```

## Workflow

```typescript
async function executePhase3(session_id: string, output_dir: string, input_file: string) {
  // 1. Create raw directory
  await Bash({ command: `mkdir -p ${output_dir}/raw` });

  // 2. Load agent specifications
  const plan = await Read({ file_path: input_file });
  const agentSpecs = extractAgentSpecs(plan);

  // 3. Check for existing completed agents (recovery)
  const activeAgents = await get_active_agents({ session_id });
  const completedAgents = activeAgents
    .filter(a => a.status === 'completed')
    .map(a => a.agent_id);
  const pendingSpecs = agentSpecs.filter(s => !completedAgents.includes(s.agent_id));

  if (pendingSpecs.length === 0) {
    return { status: 'completed', message: 'All agents already completed' };
  }

  // 4. Register agents
  for (const spec of pendingSpecs) {
    await register_agent({
      session_id,
      agent_id: spec.agent_id,
      agent_type: spec.agent_type,
      agent_role: spec.focus,
      search_queries: spec.queries
    });
  }

  // 5. Deploy agents in parallel (SINGLE MESSAGE)
  // Use Task tool multiple times in one response
  const results = await deployAgentsParallel(pendingSpecs, output_dir);

  // 6. Verify outputs
  const outputFiles = [];
  let successCount = 0;

  for (const spec of agentSpecs) {
    const outputFile = `${output_dir}/raw/agent_${spec.agent_id}.md`;
    const exists = await fileExists(outputFile);

    if (exists) {
      outputFiles.push(outputFile);
      successCount++;
      await update_agent_status({
        agent_id: spec.agent_id,
        status: 'completed',
        output_file: outputFile
      });
    } else {
      await update_agent_status({
        agent_id: spec.agent_id,
        status: 'failed',
        error_message: 'Output file not created'
      });
    }
  }

  // 7. Quality gate: 80% success required
  const successRate = successCount / agentSpecs.length;
  if (successRate < 0.8) {
    return {
      status: 'partial',
      output_files: outputFiles,
      metrics: { success_rate: successRate, agents_completed: successCount },
      message: `Only ${successRate * 100}% agents succeeded (need 80%)`
    };
  }

  return {
    status: 'completed',
    output_files: outputFiles,
    metrics: {
      agents_deployed: agentSpecs.length,
      agents_completed: successCount,
      success_rate: successRate
    }
  };
}
```

## Output Structure

Directory: `raw/`

```
raw/
├── agent_01.md    # Web research results for subtopic 1
├── agent_02.md    # Web research results for subtopic 2
├── agent_03.md    # Academic research results
├── agent_04.md    # Technical depth results
└── agent_05.md    # Cross-reference verification
```

Each file format:

```markdown
# Raw Search Results - Agent 01

**Agent ID**: agent_01
**Focus Area**: Market trends and current developments
**Timestamp**: 2026-01-16T10:30:00Z
**Queries Executed**: 5
**Results Collected**: 18

## Search Results

### Result 1
**Query**: "AI market size 2025 forecast"
**URL**: https://example.com/ai-report
**Title**: AI Market Analysis 2025

**Content**:
[Extracted and summarized content]

**Key Facts**:
- Global AI market expected to reach $190B by 2025 [Source: example.com]
- Growth rate of 35% CAGR [Source: example.com]

---

### Result 2
...
```

## Quality Gate

Phase 3 passes when:
- [ ] `raw/` directory exists
- [ ] At least 80% of planned agents completed
- [ ] Each agent file > 1KB
- [ ] Each agent file contains "Key Facts" sections

## Recovery Support

If interrupted, Phase 3 can resume:

```typescript
// Check existing completed agents
const completed = listFiles(`${output_dir}/raw/agent_*.md`);
const completedIds = completed.map(f => extractAgentId(f));

// Only deploy pending agents
const pending = agentSpecs.filter(s => !completedIds.includes(s.agent_id));
```

## Best Practices

1. **Parallel Deployment**: Use single message for all Task calls
2. **Incremental Writing**: Agents write after each query
3. **Metadata Only**: Agents return file paths, not content
4. **Source Attribution**: Every fact needs a URL
5. **Recovery Ready**: Check for existing files before deploying

---

**Agent Type**: Execution, Parallel Deployment
**Complexity**: High
**Lines**: ~200
**Typical Runtime**: 5-15 minutes
