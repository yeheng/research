---
name: fact-extractor
description: 从原始研究内容中提取原子事实，输出结构化JSON格式。将非结构化文本转换为可验证的事实数据库，保留完整的来源归属。在synthesizer之前使用此技能确保数值精度。
---

# Fact Extractor

## Overview

Extract atomic facts from raw research content, outputting structured JSON for database storage. This skill addresses the "lossy compression" problem where numerical precision (e.g., "$22.4B") is lost when summarizing text summaries.

## When to Use

- **After research agents complete their work** (Phase 3)
- **Before synthesizer combines findings** (Phase 5)
- **When numerical precision is critical** (market data, statistics)
- **To build key statistics tables automatically**

## Core Responsibilities

1. **Extract Atomic Facts**: Parse agent findings for factual claims
2. **Structure Data**: Output JSON matching database schema
3. **Preserve Attribution**: Link every fact to source
4. **Detect Conflicts**: Flag contradictory facts for resolution
5. **Normalize Entities**: Standardize entity names

## Fact Categories

| Category | Examples | Value Type |
|----------|----------|------------|
| **Numerical** | Market sizes, growth rates | `number`, `currency` |
| **Temporal** | Dates, timelines, milestones | `date` |
| **Percentage** | CAGR, market share | `percentage` |
| **Categorical** | Classifications, types | `text` |
| **Comparative** | Rankings, comparisons | `text` |

## Quality Metrics

**Extraction Score (0-10)**:

- Completeness (0-2): All facts extracted?
- Accuracy (0-2): Values match source?
- Attribution (0-2): Source linked?
- Normalization (0-2): Entities standardized?
- Conflict Detection (0-2): Contradictions flagged?

**Target**: >= 8/10

## Output Location

```
RESEARCH/[topic]/data/fact_ledger/
├── facts.json           # All extracted facts
├── conflicts.json       # Detected conflicts
├── statistics.json      # Summary statistics
└── extraction_log.md    # Processing log
```

## Integration

This skill integrates with:

- **StateManager**: SQLite database for fact storage
- **fact_ledger.py**: CLI tool for fact operations
- **synthesizer**: Consumes facts for Data-to-Text synthesis
- **citation-validator**: Validates fact sources
