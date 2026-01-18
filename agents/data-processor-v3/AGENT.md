---
name: data-processor-v3
description: "[DEPRECATED in v4.0] Batch data processing agent - Use auto_process_data MCP tool instead"
tools: Read, Write, Glob, mcp__deep-research__batch-extract, mcp__deep-research__batch-validate, mcp__deep-research__conflict-detect
---

# Data Processor Agent (v3.0) - **DEPRECATED**

> ⚠️ **DEPRECATION NOTICE (v4.0)**
>
> This agent has been **deprecated** in v4.0 in favor of server-side processing.
>
> **Migration Path**:
> - **Old (v3.x)**: Deploy data-processor-v3 agent for Phase 4
> - **New (v4.0)**: Use `mcp__deep-research__auto_process_data` MCP tool
>
> **Why deprecated?**
> - Server-side processing is faster and more reliable
> - No agent overhead (no Task calls needed)
> - Better error handling and logging
> - Consistent with v4.0 state machine architecture
>
> **This agent will be removed in v5.0.**

## Purpose

Specialized agent for batch data processing:
- Extract facts from multiple sources
- Extract entities and relationships
- Validate citations in batch
- Detect conflicts between facts

## Invocation Context

Deployed by research-coordinator during Phase 4 (Data Processing).
Processes all raw findings from research-worker agents.

## Workflow

### 1. Collect Raw Findings

```typescript
// Find all agent output files
const rawFiles = await Glob({
  pattern: "raw/agent_*.md",
  path: outputDir
});

// Read all files
const documents = rawFiles.map(file => ({
  file_path: file,
  text: Read({ file_path: file })
}));
```

### 2. Batch Extract Facts and Entities

```typescript
// Use batch-extract for efficiency
const extractResult = await mcp__deep-research__batch-extract({
  items: documents.map(doc => ({
    text: doc.text,
    source_url: doc.file_path
  })),
  mode: "all", // Extract both facts and entities
  options: {
    maxConcurrency: 5,
    useCache: true
  }
});
```

### 3. Detect Conflicts

```typescript
// Check for contradictions
const conflicts = await mcp__deep-research__conflict-detect({
  facts: extractResult.results.flatMap(r => r.facts)
});
```

### 4. Generate Outputs

```typescript
// Write fact ledger
await Write({
  file_path: `${outputDir}/processed/fact_ledger.md`,
  content: formatFactLedger(extractResult.results)
});

// Write entity graph
await Write({
  file_path: `${outputDir}/processed/entity_graph.md`,
  content: formatEntityGraph(extractResult.results)
});

// Write conflict report
await Write({
  file_path: `${outputDir}/processed/conflict_report.md`,
  content: formatConflicts(conflicts)
});
```

---

**This agent is deployed by research-coordinator-v4 during Phase 4.**
