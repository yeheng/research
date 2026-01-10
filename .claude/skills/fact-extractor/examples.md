# Fact Extractor - Examples

## Example 1: Market Research Extraction

### Input (Agent Finding)

```markdown
## AI Healthcare Market Analysis

According to Grand View Research (2024), the global AI in healthcare market size was valued at USD 22.4 billion in 2023 and is expected to grow at a compound annual growth rate (CAGR) of 37.5% from 2024 to 2030. The market is projected to reach USD 187.95 billion by 2030.

Key growth drivers include:
- Increasing healthcare data volumes
- Rising adoption of precision medicine
- Growing investments in AI healthcare startups ($4.2B in 2023)

Source: https://www.grandviewresearch.com/industry-analysis/ai-healthcare-market
```

### Extracted Facts

```json
{
  "facts": [
    {
      "entity": "AI Healthcare Market",
      "attribute": "Market Size 2023",
      "value": "USD 22.4 billion",
      "value_type": "currency",
      "value_numeric": 22.4,
      "unit": "USD billion",
      "confidence": "High",
      "context": "Global market valuation",
      "source": {
        "url": "https://www.grandviewresearch.com/industry-analysis/ai-healthcare-market",
        "title": "AI In Healthcare Market Size Report, 2024-2030",
        "author": "Grand View Research",
        "date": "2024",
        "quality": "B",
        "excerpt": "the global AI in healthcare market size was valued at USD 22.4 billion in 2023"
      }
    },
    {
      "entity": "AI Healthcare Market",
      "attribute": "CAGR 2024-2030",
      "value": "37.5%",
      "value_type": "percentage",
      "value_numeric": 37.5,
      "unit": "percent per year",
      "confidence": "Medium",
      "context": "Growth projection 2024-2030",
      "source": {
        "url": "https://www.grandviewresearch.com/industry-analysis/ai-healthcare-market",
        "title": "AI In Healthcare Market Size Report, 2024-2030",
        "author": "Grand View Research",
        "date": "2024",
        "quality": "B",
        "excerpt": "expected to grow at a compound annual growth rate (CAGR) of 37.5%"
      }
    },
    {
      "entity": "AI Healthcare Market",
      "attribute": "Projected Market Size 2030",
      "value": "USD 187.95 billion",
      "value_type": "currency",
      "value_numeric": 187.95,
      "unit": "USD billion",
      "confidence": "Medium",
      "context": "Projection",
      "source": {
        "url": "https://www.grandviewresearch.com/industry-analysis/ai-healthcare-market",
        "title": "AI In Healthcare Market Size Report, 2024-2030",
        "author": "Grand View Research",
        "date": "2024",
        "quality": "B",
        "excerpt": "projected to reach USD 187.95 billion by 2030"
      }
    },
    {
      "entity": "AI Healthcare Startups",
      "attribute": "Investment 2023",
      "value": "$4.2B",
      "value_type": "currency",
      "value_numeric": 4.2,
      "unit": "USD billion",
      "confidence": "Medium",
      "context": "Annual investment in AI healthcare startups",
      "source": {
        "url": "https://www.grandviewresearch.com/industry-analysis/ai-healthcare-market",
        "title": "AI In Healthcare Market Size Report, 2024-2030",
        "author": "Grand View Research",
        "date": "2024",
        "quality": "B",
        "excerpt": "Growing investments in AI healthcare startups ($4.2B in 2023)"
      }
    }
  ]
}
```

---

## Example 2: Conflict Detection

### Agent 1 Finding

```markdown
According to MarketsandMarkets (2024), the AI in healthcare market is estimated at $28.4 billion in 2024.
Source: https://www.marketsandmarkets.com/Market-Reports/ai-healthcare-market-123.html
```

### Agent 2 Finding

```markdown
Fortune Business Insights values the AI healthcare market at $19.2 billion in 2024.
Source: https://www.fortunebusinessinsights.com/ai-in-healthcare-market-101234
```

### Detected Conflict

```json
{
  "conflicts": [
    {
      "entity": "AI Healthcare Market",
      "attribute": "Market Size 2024",
      "conflict_type": "numerical",
      "severity": "critical",
      "facts": [
        {
          "value": "$28.4 billion",
          "value_numeric": 28.4,
          "source": "MarketsandMarkets",
          "source_quality": "B"
        },
        {
          "value": "$19.2 billion",
          "value_numeric": 19.2,
          "source": "Fortune Business Insights",
          "source_quality": "B"
        }
      ],
      "difference_percent": 47.9,
      "possible_explanations": [
        "Different market segment definitions",
        "Different geographic scope",
        "Different calculation methodologies"
      ],
      "recommended_action": "Report both values with context; note discrepancy"
    }
  ]
}
```

---

## Example 3: Technical Specification Extraction

### Input (Agent Finding)

```markdown
## LLM Parameter Comparison

| Model | Parameters | Training Data | Context Window |
|-------|------------|---------------|----------------|
| GPT-4 | ~1.76T | Unknown | 128K tokens |
| Claude 3 Opus | Unknown | Unknown | 200K tokens |
| Gemini Ultra | Unknown | Unknown | 32K tokens |
| Llama 3 70B | 70B | 15T tokens | 8K tokens |

GPT-4 was released on March 14, 2023. Claude 3 was released on March 4, 2024.
```

### Extracted Facts

```json
{
  "facts": [
    {
      "entity": "GPT-4",
      "attribute": "Parameter Count",
      "value": "~1.76 trillion",
      "value_type": "number",
      "value_numeric": 1760000000000,
      "unit": "parameters",
      "confidence": "Low",
      "context": "Approximate, unconfirmed by OpenAI"
    },
    {
      "entity": "GPT-4",
      "attribute": "Context Window",
      "value": "128K tokens",
      "value_type": "number",
      "value_numeric": 128000,
      "unit": "tokens",
      "confidence": "High",
      "context": "Maximum context length"
    },
    {
      "entity": "GPT-4",
      "attribute": "Release Date",
      "value": "March 14, 2023",
      "value_type": "date",
      "value_numeric": null,
      "unit": null,
      "confidence": "High",
      "context": "Official release date"
    },
    {
      "entity": "Claude 3 Opus",
      "attribute": "Context Window",
      "value": "200K tokens",
      "value_type": "number",
      "value_numeric": 200000,
      "unit": "tokens",
      "confidence": "High",
      "context": "Maximum context length"
    },
    {
      "entity": "Claude 3",
      "attribute": "Release Date",
      "value": "March 4, 2024",
      "value_type": "date",
      "value_numeric": null,
      "unit": null,
      "confidence": "High",
      "context": "Official release date"
    },
    {
      "entity": "Llama 3 70B",
      "attribute": "Parameter Count",
      "value": "70 billion",
      "value_type": "number",
      "value_numeric": 70000000000,
      "unit": "parameters",
      "confidence": "High",
      "context": "Official Meta specification"
    },
    {
      "entity": "Llama 3 70B",
      "attribute": "Training Data Size",
      "value": "15T tokens",
      "value_type": "number",
      "value_numeric": 15000000000000,
      "unit": "tokens",
      "confidence": "High",
      "context": "Training corpus size"
    },
    {
      "entity": "Llama 3 70B",
      "attribute": "Context Window",
      "value": "8K tokens",
      "value_type": "number",
      "value_numeric": 8000,
      "unit": "tokens",
      "confidence": "High",
      "context": "Maximum context length"
    }
  ]
}
```

---

## Example 4: Complete Workflow

### Step 1: Read Agent Outputs

```bash
# Agent outputs location
ls RESEARCH/ai_healthcare/research_notes/
# agent_1_findings.md
# agent_2_findings.md
# agent_3_findings.md
```

### Step 2: Extract Facts

For each agent output, run fact extraction and accumulate results.

### Step 3: Store in Database

```bash
python3 scripts/fact_ledger.py create ai_healthcare_session facts.json
# Created 45/45 facts
```

### Step 4: Detect Conflicts

```bash
python3 scripts/fact_ledger.py conflicts ai_healthcare_session
# Found 3 conflict(s):
#
#   [CRITICAL] AI Healthcare Market - Market Size 2024
#     - $28.4 billion (confidence: High)
#     - $19.2 billion (confidence: High)
#
#   [MODERATE] AI Healthcare Market - CAGR 2024-2030
#     - 37.5% (confidence: Medium)
#     - 35.2% (confidence: Medium)
```

### Step 5: Generate Statistics

```bash
python3 scripts/fact_ledger.py statistics ai_healthcare_session --output data/key_statistics.md
# Statistics written to data/key_statistics.md
```

### Output: key_statistics.md

```markdown
# Key Statistics - ai_healthcare_session

*Generated: 2024-01-10T12:00:00*

## Summary

- **Total Facts**: 45
- **High Confidence**: 28
- **Medium Confidence**: 12
- **Low Confidence**: 5
- **Unresolved Conflicts**: 3

## Key Statistics Table

| Entity | Attribute | Value | Source | Quality |
|--------|-----------|-------|--------|---------|
| AI Healthcare Market | Market Size 2023 | $22.4B | Grand View Research, 2024 | B |
| AI Healthcare Market | CAGR 2024-2030 | 37.5% | Grand View Research, 2024 | B |
| AI Healthcare Market | Projected Market Size 2030 | $187.95B | Grand View Research, 2024 | B |
| IBM Watson Health | Market Share | 15.2% | IDC, 2024 | B |
| Google Health | Market Share | 12.8% | IDC, 2024 | B |

## Data Conflicts

| Entity | Attribute | Values | Severity |
|--------|-----------|--------|----------|
| AI Healthcare Market | Market Size 2024 | $28.4B, $19.2B | critical |
| AI Healthcare Market | CAGR 2024-2030 | 37.5%, 35.2% | moderate |

---
*Auto-generated from fact ledger. 28 high-confidence facts, 3 conflicts detected.*
```

---

## Example 5: Handling Edge Cases

### Case 1: Vague Statements

**Input:**
> "The market is growing rapidly, with significant investments from major players."

**Output:**
```json
{
  "facts": [],
  "notes": "No extractable atomic facts - statement is vague without specific values"
}
```

### Case 2: Relative Values

**Input:**
> "Revenue increased by 25% compared to the previous year."

**Output:**
```json
{
  "facts": [
    {
      "entity": "[Entity from context]",
      "attribute": "Revenue Growth YoY",
      "value": "25%",
      "value_type": "percentage",
      "value_numeric": 25,
      "unit": "percent",
      "confidence": "Medium",
      "context": "Year-over-year growth; base year unclear"
    }
  ]
}
```

### Case 3: Ranges

**Input:**
> "The market is expected to grow between 30-40% annually."

**Output:**
```json
{
  "facts": [
    {
      "entity": "[Entity from context]",
      "attribute": "Annual Growth Range (Low)",
      "value": "30%",
      "value_type": "percentage",
      "value_numeric": 30,
      "unit": "percent",
      "confidence": "Medium",
      "context": "Lower bound of growth projection"
    },
    {
      "entity": "[Entity from context]",
      "attribute": "Annual Growth Range (High)",
      "value": "40%",
      "value_type": "percentage",
      "value_numeric": 40,
      "unit": "percent",
      "confidence": "Medium",
      "context": "Upper bound of growth projection"
    }
  ]
}
```

### Case 4: Multiple Sources for Same Fact

**Input:**
> "Multiple sources confirm the market size at approximately $22 billion (Grand View Research, MarketsandMarkets, Frost & Sullivan)."

**Output:**
```json
{
  "facts": [
    {
      "entity": "[Entity from context]",
      "attribute": "Market Size",
      "value": "$22 billion",
      "value_type": "currency",
      "value_numeric": 22,
      "unit": "USD billion",
      "confidence": "High",
      "context": "Consensus from multiple sources",
      "sources": [
        {"author": "Grand View Research", "quality": "B"},
        {"author": "MarketsandMarkets", "quality": "B"},
        {"author": "Frost & Sullivan", "quality": "B"}
      ]
    }
  ],
  "notes": "High confidence due to multi-source corroboration"
}
```
