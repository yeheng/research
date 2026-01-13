---
name: question-refiner
description: Transform raw research questions into structured, validated research prompts with automatic research type detection and output format validation. Ensures prompts are ready for research-executor with comprehensive quality checks.
---

# Question Refiner

## Overview

Transform vague research questions into structured, actionable research prompts through strategic clarifying questions. **Enhanced with automatic research type detection, output validation, and template support** to ensure high-quality structured prompts.

## When to Use

- User provides a raw, unstructured research question
- Research scope is unclear or too broad
- Need to generate validated structured prompt for research-executor
- User asks "research X" without specifics
- Want to ensure prompt meets quality standards before execution

## Core Approach

**Progressive Questioning Strategy**:

1. **Round 1** (3 core questions): Topic focus, output format, audience
2. **Round 2** (conditional): Scope, sources, special requirements based on Round 1 answers
3. **Research Type Detection**: Automatically classify research intent
4. **Template Selection**: Choose appropriate template based on type
5. **Generate & Validate**: Create structured prompt with quality validation

## Key Features (Enhanced)

- **Adaptive Questioning**: Asks 3-6 questions, not overwhelming
- **Context-Aware**: Questions adapt based on research type (academic, business, technical)
- **Research Type Detection** (NEW): Auto-classifies as exploratory, comparative, etc.
- **Output Validation** (NEW): JSON schema validation before delivery
- **Template Support** (NEW): Multiple templates for different research types
- **Quality Scoring** (NEW): Rates prompt quality (0-10 scale)
- **Structured Output**: Generates complete research prompt ready for execution

## Research Type Detection (NEW)

The skill automatically detects research type from user's question:

| Type | Indicators | Example Questions |
|------|-----------|-------------------|
| **Exploratory** | "what is", "overview", "landscape", "current state" | "What is the AI market like?" |
| **Comparative** | "vs", "compare", "difference", "better than" | "Compare GPT-4 vs Claude" |
| **Problem-Solving** | "how to", "solve", "fix", "improve" | "How to improve API performance" |
| **Forecasting** | "future", "trend", "prediction", "will" | "Future of quantum computing" |
| **Deep Dive** | "technical", "detailed", "architecture", "implementation" | "How does BERT work internally" |
| **Market Analysis** | "market", "industry", "competition", "size" | "AI chip market analysis" |

**Detection Algorithm**:
```python
def detect_research_type(question: str) -> str:
    keywords = extract_keywords(question.lower())

    if any(k in keywords for k in ["compare", "vs", "difference"]):
        return "comparative"
    elif any(k in keywords for k in ["how to", "solve", "fix"]):
        return "problem-solving"
    elif any(k in keywords for k in ["future", "trend", "forecast"]):
        return "forecasting"
    elif any(k in keywords for k in ["technical", "architecture"]):
        return "deep-dive"
    elif any(k in keywords for k in ["market", "industry"]):
        return "market-analysis"
    else:
        return "exploratory"
```

## Output Validation (NEW)

**JSON Schema for Structured Prompt**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["task", "context", "questions", "keywords", "constraints", "output_format"],
  "properties": {
    "task": {
      "type": "string",
      "minLength": 20,
      "description": "Clear, specific research objective"
    },
    "context": {
      "type": "string",
      "minLength": 50,
      "description": "Background and significance"
    },
    "questions": {
      "type": "array",
      "minItems": 3,
      "maxItems": 7,
      "items": { "type": "string", "minLength": 10 }
    },
    "keywords": {
      "type": "array",
      "minItems": 5,
      "items": { "type": "string" }
    },
    "constraints": {
      "type": "object",
      "required": ["timeframe", "geography"],
      "properties": {
        "timeframe": { "type": "string" },
        "geography": { "type": "string" },
        "source_types": { "type": "array" },
        "max_length": { "type": "string" }
      }
    },
    "output_format": {
      "type": "object",
      "required": ["type", "citation_style"],
      "properties": {
        "type": { "enum": ["comprehensive_report", "executive_summary", "comparison_table", "technical_spec"] },
        "citation_style": { "enum": ["inline-with-url", "footnotes", "endnotes", "academic"] }
      }
    }
  }
}
```

**Validation Process**:
1. Generate structured prompt
2. Validate against JSON schema
3. Calculate quality score (0-10)
4. If score < 8.0: Refine and retry (max 2 attempts)
5. If score ≥ 8.0: Deliver to user

**Quality Scoring Formula**:
```
Quality = (
  completeness * 0.3 +      # All required fields present
  specificity * 0.3 +        # Questions are specific, not vague
  keyword_richness * 0.2 +   # Adequate keywords and synonyms
  constraint_clarity * 0.2   # Clear, realistic constraints
) * 10
```

## Template Support (NEW)

**Available Templates**:

### 1. Exploratory Template
```markdown
TASK: Provide a comprehensive overview of [topic]
CONTEXT: Understanding [topic] is important for [reason]
QUESTIONS:
  1. What is the current state of [topic]?
  2. Who are the key players/technologies?
  3. What are the main trends?
  4. What are the challenges and opportunities?
  5. What is the future outlook?
```

### 2. Comparative Template
```markdown
TASK: Compare [A] vs [B] across key dimensions
CONTEXT: [User] needs to decide between [A] and [B]
QUESTIONS:
  1. What are the key features of each?
  2. How do they differ in performance?
  3. What are the cost implications?
  4. Which is better for [use case]?
  5. What are user experiences?
```

### 3. Problem-Solving Template
```markdown
TASK: Identify solutions for [problem]
CONTEXT: [User] faces [problem] and needs actionable solutions
QUESTIONS:
  1. What are the root causes?
  2. What solutions exist?
  3. What are the trade-offs?
  4. What are implementation requirements?
  5. What are success metrics?
```

### 4. Market Analysis Template
```markdown
TASK: Analyze the [market] market
CONTEXT: Understanding market dynamics for [purpose]
QUESTIONS:
  1. What is the market size and growth?
  2. Who are the major players?
  3. What are the competitive dynamics?
  4. What are the trends and drivers?
  5. What are the opportunities and threats?
```

## Output Format (Enhanced)

```markdown
### RESEARCH TYPE
[auto-detected type]

### TASK
[Clear, specific research objective]

### CONTEXT/BACKGROUND
[Why this matters, who will use it]

### SPECIFIC QUESTIONS OR SUBTASKS
1-7 concrete sub-questions

### KEYWORDS
[Search terms and synonyms, ≥5 terms]

### CONSTRAINTS
- Timeframe: [e.g., 2020-present]
- Geography: [e.g., global, US-only]
- Source types: [academic, industry, news]
- Max length: [e.g., 5000 words]

### OUTPUT FORMAT
- Type: [comprehensive_report, executive_summary, comparison_table, technical_spec]
- Citation style: [inline-with-url, footnotes, endnotes, academic]

### QUALITY METRICS (NEW)
- Completeness: [0-10]
- Specificity: [0-10]
- Keyword Richness: [0-10]
- Constraint Clarity: [0-10]
- **Overall Quality**: [0-10] ← Must be ≥ 8.0
```

## Enhancement Summary

| Feature | Before | After |
|---------|--------|-------|
| **Research Type Detection** | Manual classification | Automatic detection |
| **Output Validation** | Manual review | JSON schema validation |
| **Template Support** | Single generic template | 4+ specialized templates |
| **Quality Scoring** | Subjective assessment | Quantitative scoring (0-10) |
| **Refinement** | N/A | Automatic refinement if score < 8.0 |

## Token Optimization

> 📋 **Reference**: `.claude/shared/constants/token_optimization.md`

**Context Budget**: 10k tokens max (minimal context needed)

**Strategy**: Keep prompts concise, avoid loading large documents

## Error Handling

> 📋 **Reference**: `.claude/shared/constants/error_codes.md`

**Common Errors**:
- **E001**: Insufficient context in prompt → Ask clarifying questions (max 2 rounds)
- **E002**: Invalid research scope → Guide user to narrow/broaden scope
- **E003** (NEW): Validation failed → Refine and retry (max 2 attempts)
- **E004** (NEW): Quality score < 8.0 after 2 attempts → Request manual review

**Question Limit**: Max 6 questions per round to avoid overwhelming user

## Examples

See [examples.md](./examples.md) for detailed interaction patterns.

## Detailed Instructions

See [instructions.md](./instructions.md) for complete questioning strategy and validation workflow.
