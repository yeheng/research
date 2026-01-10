---
name: ontology-scout
description: 在研究分解之前快速勘探领域术语和概念结构。通过广度优先搜索识别领域关键术语、生成知识地图、帮助用户选择感兴趣的分支。适用于不熟悉的专业领域研究前期规划。
---

# Ontology Scout

## Overview

The Ontology Scout performs rapid domain reconnaissance before research decomposition. For unfamiliar or highly specialized domains, the LLM may not know how to correctly decompose subtopics. This skill maps the conceptual landscape first, ensuring research plans are grounded in actual domain terminology rather than generic assumptions.

## When to Use

- **New/unfamiliar domains**: Topics the LLM may not have deep knowledge of
- **Highly specialized fields**: Academic disciplines, emerging technologies, niche industries
- **Rapidly evolving areas**: Fields where terminology changes quickly
- **Cross-domain research**: Topics spanning multiple disciplines
- **User uncertainty**: When the user isn't sure how to scope their research

## Core Responsibilities

1. **Rapid Breadth-First Search**: Quick reconnaissance of 5-10 key sources
2. **Terminology Extraction**: Identify domain-specific terms and concepts
3. **Taxonomy Generation**: Build hierarchical knowledge map (JSON structure)
4. **User Validation**: Present taxonomy for user selection/modification
5. **Plan Refinement**: Adjust research subtopics based on domain reality

## Process Flow

```
User Question
     ↓
[Ontology Scout]
     ↓
Quick Search (Title + H1 only)
     ↓
Extract Domain Terms
     ↓
Generate Taxonomy (JSON)
     ↓
Present to User
     ↓
User Selects Branches
     ↓
Refined Research Plan
```

## Output Format

### Taxonomy Structure

```json
{
  "domain": "CRISPR Gene Editing",
  "confidence": "medium",
  "sources_consulted": 8,
  "taxonomy": {
    "Technical Aspects": {
      "Mechanisms": ["Cas9", "Cas12", "Cas13", "Base Editing"],
      "Delivery Methods": ["Viral Vectors", "Lipid Nanoparticles"]
    },
    "Applications": {
      "Therapeutic": ["Cancer", "Genetic Diseases"],
      "Agricultural": ["Crop Improvement", "Disease Resistance"]
    },
    "Regulatory & Ethical": {
      "Oversight Bodies": ["FDA", "EMA", "WHO"],
      "Controversies": ["Germline Editing", "Designer Babies"]
    }
  },
  "suggested_subtopics": [
    "CRISPR mechanisms and variants",
    "Clinical applications and trials",
    "Regulatory landscape"
  ],
  "knowledge_gaps": [
    "Limited recent data on approval rates",
    "Emerging competitors to CRISPR"
  ]
}
```

## Quality Metrics

**Scout Quality Score (0-10)**:

- Coverage (0-2): Key domain areas identified?
- Accuracy (0-2): Terminology correct and current?
- Structure (0-2): Logical hierarchy?
- Actionability (0-2): Can generate research plan from this?
- Efficiency (0-2): Completed in reasonable time (<10 min)?

**Target**: >= 7/10

## Integration

This skill integrates with:

- **research-executor**: Called in Phase 1.5 (Ontology Construction)
- **question-refiner**: Informs subtopic decomposition
- **got-controller**: Provides domain context for graph operations
