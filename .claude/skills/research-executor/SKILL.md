---
name: research-executor
description: 执行完整的 7 阶段深度研究流程。接收结构化研究任务，自动部署多个并行研究智能体，生成带完整引用的综合研究报告。当用户有结构化的研究提示词时使用此技能。
---

# Research Executor

## Overview

The Research Executor conducts comprehensive, multi-phase research using the 7-stage deep research methodology and Graph of Thoughts (GoT) framework.

## When to Use

- User provides a structured research prompt (from question-refiner)
- Need to execute systematic research with multiple agents
- Require comprehensive report with verified citations
- Research involves 3+ subtopics requiring parallel investigation

## Core Capabilities

1. **7-Phase Research Process**: Question scoping → Planning → Querying → Triangulation → Synthesis → QA → Output
2. **Multi-Agent Deployment**: 3-8 parallel research agents based on complexity
3. **Citation Management**: A-E source quality ratings, 100% citation coverage
4. **GoT Integration**: Optional Graph of Thoughts for complex topics

## Quick Start

```markdown
Execute research on: [structured research prompt]

The executor will:
1. Verify prompt completeness
2. Create research plan with subtopics
3. Deploy parallel agents (web, academic, verification)
4. Triangulate sources and validate claims
5. Synthesize findings with inline citations
6. Generate structured output in RESEARCH/[topic]/
```

## Output Structure

```
RESEARCH/[topic]/
├── README.md
├── executive_summary.md
├── full_report.md
├── data/
├── sources/
└── appendices/
```

## Key Features

- **Task Complexity Assessment**: Automatic agent count and model selection
- **Parallel Execution**: All agents launch simultaneously
- **Source Quality Control**: A-E rating system
- **Hallucination Prevention**: Chain-of-Verification process

## ⚠️ Critical: Token Optimization

> 📋 **Reference**: `.claude/shared/constants/token_optimization.md`

**ALWAYS use the Download → Clean → Read pipeline:**

1. WebFetch → Save to `data/raw/[source].html`
2. Preprocess → Clean to `data/processed/[source].md`
3. Read from processed file (60-90% token savings)

**FORBIDDEN**: Direct WebFetch content in context for pages >5KB

**Per-Agent Budget**: 15k tokens max
- 5k for instructions
- 10k for source content (processed only)

## Agent Communication

> 📋 **Reference**: `.claude/shared/constants/agent_communication.md`

**Before fetching URLs**: Check `data/url_manifest.json` for cached sources

**Progress tracking**: Update `research_notes/agent_status.json` every 5 minutes

**Deduplication**: Register findings in `research_notes/findings_registry.json`

## Error Handling

> 📋 **Reference**: `.claude/shared/constants/error_codes.md`

**Common Errors**:
- **E101**: Web fetch timeout → Retry once, then skip
- **E201**: Token limit exceeded → Use preprocessing pipeline
- **E203**: Citation validation failed → Add missing citations (mandatory)
- **E301**: Agent spawn failed → Reduce agent count and retry

**Quality Threshold**: Output must score ≥8.0 or trigger refinement (max 2 attempts)

## Shared Resources

> 📋 **Source Ratings**: `.claude/shared/constants/source_quality_ratings.md`
> 📋 **Report Templates**: `.claude/shared/templates/report_structure.md`
> 📋 **Citation Format**: `.claude/shared/templates/citation_format.md`

## Safety Limits

| Limit | Value |
|-------|-------|
| Max parallel agents | 8 |
| Max research time | 90 minutes |
| Min quality score | 8.0 to pass |
| Max token per source | 10,000 |

## Examples

See [examples.md](./examples.md) for detailed usage scenarios.

## Detailed Instructions

See [instructions.md](./instructions.md) for complete implementation guide.
