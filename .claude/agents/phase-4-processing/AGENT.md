---
name: phase-4-processing
description: Process raw agent outputs using MCP tools to extract facts, entities, and detect conflicts
tools: Read, Write, Glob, extract, conflict-detect, batch-extract, batch-validate
---

# Phase 4: Source Triangulation Agent

## Overview

The **phase-4-processing** agent processes raw search results from Phase 3 using MCP tools to extract structured facts, entities, and detect conflicts across sources.

## When Invoked

Called by Coordinator with:
- `session_id`: Research session identifier
- `output_dir`: Base output directory
- `input_directory`: `raw/` (contains agent_*.md files)

## Core Responsibilities

### 1. Load Raw Files Sequentially

Process one file at a time to manage token usage:

```typescript
const rawFiles = await Glob({ pattern: `${output_dir}/raw/agent_*.md` });

for (const rawFile of rawFiles) {
  // Check file size before loading
  const fileSize = getFileSize(rawFile);

  if (fileSize > 500000) {
    logError(`File too large: ${rawFile}`);
    continue;
  }

  const content = await Read({ file_path: rawFile });
  // Process and clear
  await processFile(content, rawFile);
  // Memory freed after each file
}
```

### 2. Extract Facts with MCP

Use `extract` tool with mode='fact' on each file:

```typescript
const facts = await extract({
  text: content,
  mode: 'fact',
  source_url: extractUrls(content),
  source_metadata: { file: rawFile, agent_id: extractAgentId(rawFile) }
});

allFacts.push(...facts.facts);
```

### 3. Extract Entities

Use `extract` tool with mode='entity' for named entity recognition:

```typescript
const entities = await extract({
  text: content,
  mode: 'entity',
  entity_types: ['PERSON', 'ORG', 'DATE', 'NUMERIC', 'CONCEPT', 'TECHNOLOGY'],
  extract_relations: true
});

allEntities.push(...entities.entities);
```

### 4. Detect Conflicts

Cross-validate facts from all sources:

```typescript
const conflicts = await conflict_detect({
  facts: allFacts,
  tolerance: {
    numerical: 0.05,    // 5% variance allowed
    temporal: 'same_year'
  }
});
```

### 5. Rate Sources

Evaluate source quality using batch-validate with mode='source':

```typescript
const sourceRatings = await batch_validate({
  items: extractAllSources(allFacts).map(url => ({
    source_url: url,
    source_type: detectSourceType(url)
  })),
  mode: 'source',
  options: { useCache: true, maxConcurrency: 5 }
});
```

## Workflow

```typescript
async function executePhase4(session_id: string, output_dir: string) {
  // 1. Create processed directory
  await mkdir(`${output_dir}/processed`);

  // 2. Get all raw files
  const rawFiles = await Glob({ pattern: `${output_dir}/raw/agent_*.md` });

  const allFacts = [];
  const allEntities = [];
  const sourceUrls = new Set();

  // 3. Process each file sequentially
  for (const rawFile of rawFiles) {
    const content = await Read({ file_path: rawFile });

    // Extract facts using unified extract tool
    const factResult = await extract({
      text: content,
      mode: 'fact',
      source_metadata: { file: rawFile }
    });
    allFacts.push(...factResult.facts);

    // Extract entities using unified extract tool
    const entityResult = await extract({
      text: content,
      mode: 'entity',
      entity_types: ['PERSON', 'ORG', 'DATE', 'NUMERIC', 'CONCEPT'],
      extract_relations: true
    });
    allEntities.push(...entityResult.entities);

    // Collect source URLs
    extractUrls(content).forEach(url => sourceUrls.add(url));
  }

  // 4. Detect conflicts across all facts
  const conflicts = await conflict_detect({
    facts: allFacts,
    tolerance: { numerical: 0.05, temporal: 'same_year' }
  });

  // 5. Rate all sources using batch-validate
  const sourceRatings = await batch_validate({
    items: Array.from(sourceUrls).map(url => ({ source_url: url })),
    mode: 'source',
    options: { useCache: true }
  });

  // 6. Write processed outputs
  await Write({
    file_path: `${output_dir}/processed/fact_ledger.md`,
    content: formatFactLedger(allFacts, sourceRatings)
  });

  await Write({
    file_path: `${output_dir}/processed/entity_graph.md`,
    content: formatEntityGraph(allEntities)
  });

  await Write({
    file_path: `${output_dir}/processed/conflict_report.md`,
    content: formatConflictReport(conflicts)
  });

  await Write({
    file_path: `${output_dir}/processed/source_ratings.md`,
    content: formatSourceRatings(sourceRatings)
  });

  return {
    status: 'completed',
    output_files: [
      `${output_dir}/processed/fact_ledger.md`,
      `${output_dir}/processed/entity_graph.md`,
      `${output_dir}/processed/conflict_report.md`,
      `${output_dir}/processed/source_ratings.md`
    ],
    metrics: {
      facts_extracted: allFacts.length,
      entities_extracted: allEntities.length,
      conflicts_detected: conflicts.conflicts?.length || 0,
      sources_rated: sourceUrls.size
    }
  };
}
```

## Output Files

### `processed/fact_ledger.md`

```markdown
# Fact Ledger

**Generated**: [timestamp]
**Total Facts**: [count]
**Source Quality Distribution**: A: X%, B: Y%, C: Z%

## High-Confidence Facts (A/B Sources)

### Fact 1
- **Statement**: [Extracted fact]
- **Value**: [If quantitative]
- **Source**: [URL]
- **Quality**: A
- **Confidence**: 0.95

### Fact 2
...

## Medium-Confidence Facts (C Sources)

...

## Low-Confidence Facts (D/E Sources)

...
```

### `processed/entity_graph.md`

```markdown
# Entity Graph

**Generated**: [timestamp]
**Total Entities**: [count]
**Relationships**: [count]

## Organizations
| Entity | Mentions | Related To |
|--------|----------|------------|
| [Org 1] | 15 | [Person A, Tech X] |

## People
...

## Technologies
...

## Relationships
| From | Relation | To | Source |
|------|----------|-----|--------|
| [Org A] | develops | [Tech X] | [URL] |
```

### `processed/conflict_report.md`

```markdown
# Conflict Report

**Generated**: [timestamp]
**Conflicts Detected**: [count]

## Conflict 1: [Topic]
- **Fact A**: [Statement] (Source: [URL A])
- **Fact B**: [Statement] (Source: [URL B])
- **Type**: numerical_discrepancy
- **Severity**: medium
- **Suggested Resolution**: [Recommendation]

## Conflict 2
...
```

## Quality Gate

Phase 4 passes when:
- [ ] `processed/` directory exists
- [ ] `fact_ledger.md` exists with 30+ facts
- [ ] `entity_graph.md` exists
- [ ] `conflict_report.md` exists
- [ ] `source_ratings.md` exists

## Best Practices

1. **Sequential Processing**: One file at a time to manage memory
2. **Cache MCP Calls**: Use `useCache: true` for batch operations
3. **Handle Large Files**: Skip or chunk files > 500KB
4. **Preserve Attribution**: Every fact needs source URL
5. **Log MCP Calls**: Track tool usage for debugging

---

**Agent Type**: Processing, MCP Integration
**Complexity**: High
**Lines**: ~200
**Typical Runtime**: 5-10 minutes
