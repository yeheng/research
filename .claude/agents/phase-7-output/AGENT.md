---
name: phase-7-output
description: Generate all final deliverables and verify completeness
tools: Read, Write, Glob
---

# Phase 7: Final Output Agent

## Overview

The **phase-7-output** agent generates all final deliverables from validated research and verifies completeness before marking the research as done.

## When Invoked

Called by Coordinator with:
- `session_id`: Research session identifier
- `output_dir`: Base output directory
- `input_file`: `drafts/validated_report.md`

## Core Responsibilities

### 1. Generate All Documents

Create required deliverables:

```typescript
const documents = [
  { name: 'README.md', generator: generateReadme },
  { name: 'executive_summary.md', generator: generateExecutiveSummary },
  { name: 'full_report.md', generator: generateFullReport },
  { name: 'sources/bibliography.md', generator: generateBibliography },
  { name: 'sources/source_quality_table.md', generator: generateQualityTable },
  { name: 'data/statistics.md', generator: generateStatistics },
  { name: 'appendices/methodology.md', generator: generateMethodology },
  { name: 'appendices/limitations.md', generator: generateLimitations }
];
```

### 2. Create Directory Structure

Ensure all directories exist:

```typescript
const directories = [
  'raw/',           // From Phase 3
  'processed/',     // From Phase 4
  'drafts/',        // From Phase 5-6
  'research_notes/',
  'sources/',
  'data/',
  'appendices/'
];
```

### 3. Verify Deliverables

Check all required files:

```typescript
const required = [
  { path: 'README.md', minSize: 2000 },
  { path: 'executive_summary.md', minSize: 3000 },
  { path: 'full_report.md', minSize: 10000 },
  { path: 'progress.md', minSize: 1000 },
  { path: 'sources/bibliography.md', minSize: 500 }
];
```

## Workflow

```typescript
async function executePhase7(session_id: string, output_dir: string, input_file: string) {
  // 1. Read validated report
  const validatedReport = await Read({ file_path: input_file });

  // 2. Create all directories
  const directories = ['sources', 'data', 'appendices'];
  for (const dir of directories) {
    await mkdir(`${output_dir}/${dir}`);
  }

  // 3. Generate README.md
  await Write({
    file_path: `${output_dir}/README.md`,
    content: generateReadme(validatedReport, output_dir)
  });

  // 4. Generate executive summary
  await Write({
    file_path: `${output_dir}/executive_summary.md`,
    content: extractExecutiveSummary(validatedReport)
  });

  // 5. Generate full report
  await Write({
    file_path: `${output_dir}/full_report.md`,
    content: formatFullReport(validatedReport)
  });

  // 6. Generate bibliography
  const citations = extractCitations(validatedReport);
  await Write({
    file_path: `${output_dir}/sources/bibliography.md`,
    content: formatBibliography(citations)
  });

  // 7. Generate source quality table
  await Write({
    file_path: `${output_dir}/sources/source_quality_table.md`,
    content: formatSourceQualityTable(citations)
  });

  // 8. Generate statistics
  await Write({
    file_path: `${output_dir}/data/statistics.md`,
    content: extractStatistics(validatedReport)
  });

  // 9. Generate methodology
  await Write({
    file_path: `${output_dir}/appendices/methodology.md`,
    content: generateMethodology(session_id)
  });

  // 10. Generate limitations
  await Write({
    file_path: `${output_dir}/appendices/limitations.md`,
    content: extractLimitations(validatedReport)
  });

  // 11. Verify all deliverables
  const verification = await verifyDeliverables(output_dir);

  if (!verification.passed) {
    return {
      status: 'incomplete',
      missing: verification.missing,
      undersized: verification.undersized
    };
  }

  return {
    status: 'completed',
    output_dir,
    deliverables: verification.files,
    metrics: {
      total_files: verification.files.length,
      total_size: verification.totalSize,
      report_word_count: countWords(validatedReport)
    }
  };
}
```

## Output Structure

Final directory:

```
RESEARCH/[topic]/
├── README.md                    # Navigation and overview
├── executive_summary.md         # 1-2 page key findings
├── full_report.md              # Complete analysis
├── progress.md                 # Execution log (from Coordinator)
├── raw/                        # Phase 3 outputs
│   ├── agent_01.md
│   ├── agent_02.md
│   └── ...
├── processed/                  # Phase 4 outputs
│   ├── fact_ledger.md
│   ├── entity_graph.md
│   ├── conflict_report.md
│   └── source_ratings.md
├── drafts/                     # Phase 5-6 outputs
│   ├── synthesis.md
│   └── validated_report.md
├── research_notes/
│   ├── refined_question.md     # Phase 1 output
│   └── research_plan.md        # Phase 2 output
├── sources/
│   ├── bibliography.md
│   └── source_quality_table.md
├── data/
│   └── statistics.md
└── appendices/
    ├── methodology.md
    └── limitations.md
```

## README.md Template

```markdown
# Research Report: [Topic]

**Generated**: [timestamp]
**Session ID**: [session_id]
**Quality Score**: [X.XX]

## Quick Navigation

| Document | Description | Size |
|----------|-------------|------|
| [Executive Summary](executive_summary.md) | Key findings (1-2 pages) | [X KB] |
| [Full Report](full_report.md) | Complete analysis | [X KB] |
| [Bibliography](sources/bibliography.md) | All citations | [X citations] |

## Research Overview

[Brief description of what was researched]

### Key Findings
1. [Finding 1]
2. [Finding 2]
3. [Finding 3]

### Methodology
This research was conducted using a 7-phase deep research workflow.
See [appendices/methodology.md](appendices/methodology.md) for details.

### Limitations
See [appendices/limitations.md](appendices/limitations.md) for known gaps.

## Directory Structure

- `raw/` - Raw search results from research agents
- `processed/` - Extracted facts, entities, and conflicts
- `drafts/` - Intermediate synthesis documents
- `sources/` - Citation and source quality information
- `data/` - Statistical data and metrics
- `appendices/` - Methodology and limitations

---
Generated by Claude Code Deep Research Framework
```

## Quality Gate

Phase 7 passes when all required files exist and meet size thresholds:

| File | Required | Minimum Size |
|------|----------|--------------|
| README.md | Yes | 2 KB |
| executive_summary.md | Yes | 3 KB |
| full_report.md | Yes | 10 KB |
| progress.md | Yes | 1 KB |
| sources/bibliography.md | Yes | 500 B |

## Best Practices

1. **Verify Before Complete**: Check all files exist
2. **Consistent Formatting**: Use same style throughout
3. **Clear Navigation**: README helps users find content
4. **Preserve Artifacts**: Keep raw and processed files
5. **Document Methodology**: Reproducibility matters

---

**Agent Type**: Output, Finalization
**Complexity**: Medium
**Lines**: ~150
**Typical Runtime**: 2-5 minutes
