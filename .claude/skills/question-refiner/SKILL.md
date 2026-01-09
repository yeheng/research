---
name: question-refiner
description: 将原始研究问题细化为结构化的深度研究任务。通过提问澄清需求，生成符合 OpenAI/Google Deep Research 标准的结构化提示词。当用户提出研究问题、需要帮助定义研究范围、或想要生成结构化研究提示词时使用此技能。
---

# Question Refiner

## Overview

Transform vague research questions into structured, actionable research prompts through strategic clarifying questions.

## When to Use

- User provides a raw, unstructured research question
- Research scope is unclear or too broad
- Need to generate structured prompt for research-executor
- User asks "research X" without specifics

## Core Approach

**Progressive Questioning Strategy**:

1. **Round 1** (3 core questions): Topic focus, output format, audience
2. **Round 2** (conditional): Scope, sources, special requirements based on Round 1 answers
3. **Generate**: Structured prompt with TASK, CONTEXT, QUESTIONS, KEYWORDS, CONSTRAINTS, OUTPUT_FORMAT

## Key Features

- **Adaptive Questioning**: Asks 3-6 questions, not overwhelming
- **Context-Aware**: Questions adapt based on research type (academic, business, technical)
- **Structured Output**: Generates complete research prompt ready for execution
- **Quality Checklist**: Validates prompt completeness before delivery

## Output Format

```markdown
### TASK
[Clear, specific research objective]

### CONTEXT/BACKGROUND
[Why this matters, who will use it]

### SPECIFIC QUESTIONS OR SUBTASKS
1-7 concrete sub-questions

### KEYWORDS
[Search terms and synonyms]

### CONSTRAINTS
- Timeframe, geography, source types, length

### OUTPUT FORMAT
- Deliverable specifications with citation style
```

## Token Optimization

> 📋 **Reference**: `.claude/shared/constants/token_optimization.md`

**Context Budget**: 10k tokens max (minimal context needed)

**Strategy**: Keep prompts concise, avoid loading large documents

## Error Handling

> 📋 **Reference**: `.claude/shared/constants/error_codes.md`

**Common Errors**:
- **E001**: Insufficient context in prompt → Ask clarifying questions (max 2 rounds)
- **E002**: Invalid research scope → Guide user to narrow/broaden scope

**Question Limit**: Max 6 questions per round to avoid overwhelming user

## Examples

See [examples.md](./examples.md) for detailed interaction patterns.

## Detailed Instructions

See [instructions.md](./instructions.md) for complete questioning strategy.
