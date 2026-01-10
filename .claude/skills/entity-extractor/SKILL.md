---
name: entity-extractor
description: 从研究文档中提取命名实体和实体关系，构建知识图谱。识别公司、人物、技术、产品等实体及其关联（投资、竞争、合作等），支持隐性关联发现。
---

# Entity Extractor

## Overview

Extract named entities and relationships from research documents to build a lightweight knowledge graph. This skill addresses the limitation of simple vector retrieval by capturing entity-level relationships that enable discovery of hidden associations (e.g., Company A invests in Company B which competes with Company C).

## When to Use

- **After document preprocessing** (in preprocess_document.py pipeline)
- **During agent research** (to build entity graph incrementally)
- **Before synthesis** (to enable graph-based queries)
- **For competitive analysis** (to map market relationships)

## Core Responsibilities

1. **Named Entity Recognition (NER)**: Identify companies, people, technologies, products, markets
2. **Relation Extraction**: Detect relationships between entities (invests_in, competes_with, uses, created_by)
3. **Co-occurrence Tracking**: Record when entities appear together in the same context
4. **Entity Normalization**: Map aliases to canonical names
5. **Confidence Scoring**: Rate relationship confidence based on evidence strength

## Entity Types

| Type | Examples | Common Relations |
| ---- | -------- | ---------------- |
| **company** | OpenAI, Microsoft, Google | invests_in, competes_with, partners_with |
| **person** | Sam Altman, Satya Nadella | founded, leads, advises |
| **technology** | GPT-4, BERT, Transformer | uses, improves_upon, replaces |
| **product** | ChatGPT, Copilot, Gemini | based_on, competes_with |
| **market** | AI Healthcare, FinTech | operates_in, targets |

## Relation Types

| Relation | Description | Example |
| -------- | ----------- | ------- |
| **invests_in** | Financial investment | Microsoft invests_in OpenAI |
| **competes_with** | Market competition | ChatGPT competes_with Gemini |
| **partners_with** | Strategic partnership | OpenAI partners_with Microsoft |
| **uses** | Technology usage | ChatGPT uses GPT-4 |
| **created_by** | Creation/development | GPT-4 created_by OpenAI |
| **founded** | Company founding | OpenAI founded Sam Altman |
| **acquired** | Acquisition | Microsoft acquired Nuance |
| **operates_in** | Market operation | OpenAI operates_in AI Healthcare |

## Quality Metrics

**Extraction Score (0-10)**:
- Entity Coverage (0-2): All relevant entities extracted?
- Relation Accuracy (0-2): Relationships correctly identified?
- Normalization (0-2): Aliases properly mapped?
- Evidence Quality (0-2): Supporting text captured?
- Confidence Calibration (0-2): Confidence scores accurate?

**Target**: >= 7/10

## Output Location

```
RESEARCH/[topic]/data/entity_graph/
├── entities.json        # All extracted entities
├── edges.json           # Relationship edges
├── cooccurrences.json   # Co-occurrence data
└── extraction_log.md    # Processing log
```

## Integration

This skill integrates with:
- **StateManager**: SQLite database for entity storage
- **entity_graph.py**: CLI tool for graph operations
- **preprocess_document.py**: Called during document processing
- **synthesizer**: Provides graph traversal for synthesis
