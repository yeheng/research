---
name: synthesizer
description: 将多个研究智能体的发现综合成连贯、结构化的研究报告。解决矛盾、提取共识、创建统一叙述。当多个研究智能体完成研究、需要将发现组合成统一报告、发现之间存在矛盾时使用此技能。
---

# Synthesizer

## Overview

Transform raw research findings from multiple agents into coherent, insightful, and actionable reports.

## When to Use

- Multiple research agents have completed their work
- Need to combine findings into unified narrative
- Contradictions exist between sources
- Ready to create final comprehensive report

## Core Responsibilities

1. **Integrate Findings**: Combine multiple sources into unified content
2. **Resolve Contradictions**: Identify and explain conflicting information
3. **Extract Consensus**: Find themes supported by multiple sources
4. **Create Narrative**: Build logical flow from introduction to conclusions
5. **Maintain Citations**: Preserve source attribution throughout

## Synthesis Process

1. **Review & Organize**: Group findings by theme, assess quality
2. **Consensus Building**: Strong/Moderate/Weak/No consensus
3. **Contradiction Resolution**: Numerical, causal, temporal, scope differences
4. **Structured Synthesis**: Create report with clear sections
5. **Quality Enhancement**: Verify completeness and coherence

> 📋 **Templates**: See `.claude/shared/templates/report_structure.md` for standard templates.
> 📋 **Citations**: See `.claude/shared/templates/citation_format.md` for citation standards.

## Key Techniques

- **Thematic Grouping**: Organize by themes, not by agent
- **Source Triangulation**: Multiple sources = higher confidence
- **Progressive Disclosure**: Build understanding gradually
- **Comparative Synthesis**: Side-by-side comparisons
- **Narrative Arc**: Trace evolution through phases

## Quality Metrics

**Synthesis Score (0-10)**:

- Coverage (0-2): All findings included?
- Coherence (0-2): Logical flow?
- Accuracy (0-2): Citations preserved?
- Insight (0-2): Actionable, not just summary?
- Clarity (0-2): Well-organized?

Target: ≥ 8/10

## Token Optimization

> 📋 **Reference**: `.claude/shared/constants/token_optimization.md`

**Input Limit**: 15k tokens per agent output

**If exceeded**:
1. Request agent summaries (2k tokens each)
2. Use hierarchical synthesis (group → aggregate → final)
3. Read full outputs only for high-quality findings (score >8.0)

**Hierarchical Synthesis**: When synthesizing 20+ findings, group into themes first

## Error Handling

> 📋 **Reference**: `.claude/shared/constants/error_codes.md`

**Common Errors**:
- **E204**: Synthesis conflict unresolved → Present both perspectives with quality ratings
- **E201**: Token limit exceeded → Use hierarchical synthesis
- **E403**: Duplicate content detected → Automatic deduplication and citation merge

**Conflict Resolution**: Document contradictions in report, don't force consensus

## Examples

See [examples.md](./examples.md) for synthesis patterns.

## Detailed Instructions

See [instructions.md](./instructions.md) for complete synthesis methodology.
