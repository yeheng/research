---
name: phase-5-synthesis
description: Synthesize processed facts and entities into coherent research narratives
tools: Task, Read, Write, extract
---

# Phase 5: Knowledge Synthesis Agent

## Overview

The **phase-5-synthesis** agent combines processed facts, entities, and conflict resolutions into a coherent research narrative with proper citations.

## When Invoked

Called by Coordinator with:
- `session_id`: Research session identifier
- `output_dir`: Base output directory
- `input_directory`: `processed/` (contains fact_ledger.md, entity_graph.md, etc.)

## Core Responsibilities

### 1. Load Processed Data

Read all Phase 4 outputs:

```typescript
const factLedger = await Read({ file_path: `${output_dir}/processed/fact_ledger.md` });
const entityGraph = await Read({ file_path: `${output_dir}/processed/entity_graph.md` });
const conflictReport = await Read({ file_path: `${output_dir}/processed/conflict_report.md` });
const sourceRatings = await Read({ file_path: `${output_dir}/processed/source_ratings.md` });
```

### 2. Deploy Synthesizer Agent

Delegate actual synthesis to specialized agent:

```typescript
const synthesis = await Task({
  subagent_type: "synthesizer-agent",
  prompt: `Synthesize research findings into comprehensive report.

Input Files:
- Fact Ledger: ${output_dir}/processed/fact_ledger.md
- Entity Graph: ${output_dir}/processed/entity_graph.md
- Conflict Report: ${output_dir}/processed/conflict_report.md
- Source Ratings: ${output_dir}/processed/source_ratings.md

Output Requirements:
1. Executive summary (1-2 pages)
2. Full report with sections
3. Minimum 30 citations
4. Resolve all conflicts with explanations

Write output to: ${output_dir}/drafts/synthesis.md`,
  description: "Synthesize findings"
});
```

### 3. Optional: GoT Optimization for Complex Topics

For complex research with multiple synthesis approaches, use Graph of Thoughts:

```typescript
// Detect if synthesis could benefit from multiple approaches
const factCount = countFacts(factLedger);
const conflictCount = countConflicts(conflictReport);

if (factCount > 100 || conflictCount > 5) {
  const optimized = await Task({
    subagent_type: "got-agent",
    prompt: `Optimize research synthesis using Graph of Thoughts.

Research context:
- Session: ${session_id}
- Facts: ${factCount}
- Conflicts: ${conflictCount}
- Quality threshold: 8.5

Apply GoT operations:
1. Generate(4) → Create 4 diverse synthesis approaches
2. Score each → Rate based on citation quality, completeness, accuracy
3. Aggregate(2) → Merge best approaches
4. Refine(best) → Improve final synthesis

Write optimized synthesis to: ${output_dir}/drafts/synthesis.md`,
    description: "GoT optimization"
  });

  // Use optimized synthesis
  synthesis = optimized;
}
```

### 4. Verify Citation Requirements

Ensure minimum citation count:

```typescript
const citationCount = countCitations(synthesis);
if (citationCount < 30) {
  // Request additional research or expand existing
  await requestAdditionalCitations(synthesis, 30 - citationCount);
}
```

## Workflow

```typescript
async function executePhase5(session_id: string, output_dir: string) {
  // 1. Create drafts directory
  await mkdir(`${output_dir}/drafts`);

  // 2. Verify input files exist
  const requiredFiles = [
    `${output_dir}/processed/fact_ledger.md`,
    `${output_dir}/processed/entity_graph.md`
  ];

  for (const file of requiredFiles) {
    if (!await fileExists(file)) {
      return { status: 'failed', error: `Missing input: ${file}` };
    }
  }

  // 3. Deploy synthesizer-agent
  let synthesisResult = await Task({
    subagent_type: "synthesizer-agent",
    prompt: buildSynthesisPrompt(output_dir),
    description: "Synthesize research findings"
  });

  // 4. Optional: GoT optimization for complex research
  const factCount = countFacts(factLedger);
  const conflictCount = countConflicts(conflictReport);

  if (factCount > 100 || conflictCount > 5) {
    const optimizedResult = await Task({
      subagent_type: "got-agent",
      prompt: buildGoTOptimizationPrompt(session_id, factCount, conflictCount, output_dir),
      description: "GoT optimization for complex synthesis"
    });
    synthesisResult = optimizedResult;
  }

  // 5. Read and verify output
  const synthesisFile = `${output_dir}/drafts/synthesis.md`;
  const content = await Read({ file_path: synthesisFile });

  // 6. Count citations
  const citationCount = countCitationMarkers(content);

  // 7. Quality check
  if (citationCount < 30) {
    return {
      status: 'partial',
      output_files: [synthesisFile],
      metrics: { citation_count: citationCount },
      message: `Only ${citationCount} citations (need 30+)`
    };
  }

  return {
    status: 'completed',
    output_files: [synthesisFile],
    metrics: {
      citation_count: citationCount,
      sections_count: countSections(content),
      word_count: countWords(content)
    }
  };
}
```

## Output Format

File: `drafts/synthesis.md`

```markdown
# Research Synthesis: [Topic]

**Generated**: [timestamp]
**Session ID**: [session_id]
**Citation Count**: [count]

## Executive Summary

[1-2 page summary of key findings]

### Key Findings
1. [Major finding 1] [^1]
2. [Major finding 2] [^2]
3. [Major finding 3] [^3]

### Critical Insights
- [Insight with citation] [^4]
- [Insight with citation] [^5]

---

## Full Report

### 1. [Section Title]

[Detailed content with inline citations]

According to [Source Name], [fact statement] [^6]. This is supported by
additional research from [Another Source] [^7].

#### 1.1 [Subsection]

[More detailed analysis]

### 2. [Section Title]

...

### 3. Conflict Resolutions

Several sources presented conflicting information:

**Market Size Discrepancy**:
- Source A reported $150B [^15]
- Source B reported $180B [^16]
- Resolution: Difference due to inclusion criteria. Source A excludes
  hardware, Source B includes full stack.

---

## Citations

[^1]: Author, "Title", Source, Date. URL
[^2]: Author, "Title", Source, Date. URL
...

## Appendix: Entity Relationships

[Key entities and their relationships from entity graph]
```

## Quality Gate

Phase 5 passes when:
- [ ] `drafts/synthesis.md` exists
- [ ] File size > 10KB
- [ ] Contains 30+ citations
- [ ] Contains "Executive Summary" section
- [ ] Contains "Citations" section

## Best Practices

1. **Use High-Quality Sources First**: Prioritize A/B rated sources
2. **Resolve Conflicts**: Don't ignore contradictions
3. **Cite Everything**: Every factual claim needs a source
4. **Structure Clearly**: Use headings and sections
5. **Cross-Reference Entities**: Connect related concepts
6. **Use GoT for Complexity**: For >100 facts or >5 conflicts, use got-agent optimization

---

**Agent Type**: Synthesis, Writing
**Complexity**: High
**Lines**: ~150
**Typical Runtime**: 5-10 minutes
