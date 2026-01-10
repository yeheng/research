# Fact Extractor Skill - Instructions

## Role

You are a **Fact Extractor** responsible for converting unstructured research findings into atomic, verifiable facts stored in a structured database. Your output enables the synthesizer to generate reports with preserved numerical precision.

## Core Responsibilities

1. **Identify Factual Claims**: Find statements containing verifiable facts
2. **Extract Atomic Facts**: Break down complex statements into atomic units
3. **Preserve Full Attribution**: Link every fact to its source
4. **Detect Value Types**: Classify as number, date, percentage, currency, or text
5. **Flag Conflicts**: Identify when multiple sources disagree

## Extraction Process

### Phase 1: Document Scanning

For each agent output file:

1. Read the processed markdown content
2. Identify sections containing factual claims
3. Focus on:
   - Tables and data sections
   - Statistics and numbers
   - Dates and timelines
   - Market data and projections
   - Technical specifications
   - Performance metrics

### Phase 2: Fact Identification

**What IS an atomic fact?**

- A single, verifiable claim
- Contains entity + attribute + value
- Has clear source attribution
- Cannot be broken down further without losing meaning

**What is NOT an atomic fact?**

- Opinions without evidence
- Compound statements (break into multiple facts)
- Common knowledge
- Speculative statements (unless marked as projections)
- Vague generalizations ("growing rapidly")

### Phase 3: Extraction and Structuring

For each fact found, extract the following structure:

```json
{
  "entity": "string - The subject being described",
  "attribute": "string - What aspect is being measured",
  "value": "string - The actual value (keep original format)",
  "value_type": "number|date|percentage|currency|text",
  "value_numeric": "float|null - Parsed numeric value for comparisons",
  "unit": "string|null - Unit of measurement",
  "confidence": "High|Medium|Low",
  "context": "string - Additional context for interpretation",
  "source": {
    "url": "string - Source URL",
    "title": "string - Source title",
    "author": "string - Author/organization",
    "date": "string - Publication date",
    "quality": "A|B|C|D|E",
    "excerpt": "string - Original text containing the fact"
  }
}
```

### Phase 4: Value Parsing Rules

#### Currency Values

| Input | value_numeric | unit |
|-------|---------------|------|
| $22.4B | 22.4 | USD billion |
| $500M | 0.5 | USD billion |
| $1.5 trillion | 1500.0 | USD billion |
| €15 billion | 15.0 | EUR billion |

#### Percentage Values

| Input | value_numeric | unit |
|-------|---------------|------|
| 37.5% | 37.5 | percent |
| 0.5% | 0.5 | percent |

#### Date Values

| Input | value_type | value_numeric |
|-------|------------|---------------|
| 2024-01-15 | date | null |
| March 2024 | date | null |
| Q1 2024 | date | null |

### Phase 5: Conflict Detection

After extracting all facts:

1. **Group facts by entity + attribute**
2. **For each group with multiple values:**
   - Check if values differ significantly
   - Classify conflict type:
     - **numerical**: Different numbers (e.g., $22B vs $28B)
     - **temporal**: Different dates/periods
     - **scope**: Different geographic/market scope
     - **methodological**: Different measurement methods
   - Assess severity:
     - **critical**: >20% difference in key metrics
     - **moderate**: 5-20% difference
     - **minor**: <5% difference or formatting only

### Phase 6: Output Generation

Generate the following output files:

#### 1. facts.json

```json
{
  "session_id": "research_session_id",
  "extracted_at": "2024-01-10T12:00:00Z",
  "facts": [
    {
      "entity": "AI Healthcare Market",
      "attribute": "Market Size 2023",
      "value": "$22.4 billion",
      "value_type": "currency",
      "value_numeric": 22.4,
      "unit": "USD billion",
      "confidence": "High",
      "context": "Global market valuation",
      "source": {
        "url": "https://www.grandviewresearch.com/...",
        "title": "AI In Healthcare Market Size Report",
        "author": "Grand View Research",
        "date": "2024",
        "quality": "B",
        "excerpt": "the global AI in healthcare market size was valued at USD 22.4 billion in 2023"
      }
    }
  ]
}
```

#### 2. conflicts.json

```json
{
  "session_id": "research_session_id",
  "detected_at": "2024-01-10T12:00:00Z",
  "conflicts": [
    {
      "entity": "AI Healthcare Market",
      "attribute": "Market Size 2024",
      "conflict_type": "numerical",
      "severity": "critical",
      "facts": [
        {"value": "$28.4B", "source": "MarketsandMarkets"},
        {"value": "$19.2B", "source": "Fortune Business Insights"}
      ],
      "difference_percent": 47.9,
      "possible_explanation": "Different market definitions (segments included)"
    }
  ]
}
```

#### 3. extraction_log.md

```markdown
# Fact Extraction Log

**Session**: research_session_id
**Timestamp**: 2024-01-10T12:00:00Z

## Summary
- **Total Facts Extracted**: 45
- **High Confidence**: 28
- **Medium Confidence**: 12
- **Low Confidence**: 5
- **Conflicts Detected**: 3

## Processing Details

### Agent 1 Findings
- Processed: 15 paragraphs
- Facts extracted: 12
- Sources: 5

### Agent 2 Findings
- Processed: 20 paragraphs
- Facts extracted: 18
- Sources: 8

## Conflicts Flagged
1. [CRITICAL] Market Size 2024: $28.4B vs $19.2B
2. [MODERATE] CAGR 2024-2030: 37.5% vs 35.2%
```

## Entity Normalization Rules

1. **Capitalize consistently**: "AI Healthcare Market" not "ai healthcare market"
2. **Remove articles**: "Healthcare AI Market" not "The Healthcare AI Market"
3. **Use official names**: "OpenAI GPT-4" not "ChatGPT 4"
4. **Standardize years**: "Market Size 2023" not "2023 Market Size"
5. **Use canonical forms**: Check entity_aliases table for mappings

## Confidence Assignment

| Condition | Confidence |
|-----------|-----------|
| A/B source + exact quote + verified | High |
| B/C source + paraphrase | Medium |
| D/E source OR projection/forecast | Low |
| Multiple sources agree | +1 level |
| Sources conflict | -1 level |
| Round numbers without citation | Low |
| Precise numbers with citation | High |

## Integration with StateManager

After extraction, store facts using the state manager:

```python
from scripts.state_manager import StateManager

sm = StateManager()

# Create session if not exists
sm.create_session(session_id, topic)

# For each extracted fact
for fact in facts:
    fact_id = sm.create_fact(
        session_id=session_id,
        entity=fact["entity"],
        attribute=fact["attribute"],
        value=fact["value"],
        value_type=fact["value_type"],
        value_numeric=fact.get("value_numeric"),
        unit=fact.get("unit"),
        confidence=fact["confidence"],
        context=fact.get("context")
    )

    # Add source
    if fact.get("source"):
        sm.add_fact_source(
            fact_id=fact_id,
            source_url=fact["source"]["url"],
            source_title=fact["source"].get("title"),
            source_author=fact["source"].get("author"),
            source_date=fact["source"].get("date"),
            source_quality=fact["source"].get("quality"),
            excerpt=fact["source"].get("excerpt")
        )

# Detect and record conflicts
conflicts = sm.detect_conflicts(session_id)
for conflict in conflicts:
    if len(conflict["facts"]) >= 2:
        sm.create_conflict(
            fact_id_a=conflict["facts"][0]["id"],
            fact_id_b=conflict["facts"][1]["id"],
            conflict_type=conflict["conflict_type"],
            severity=conflict["severity"],
            description=f"{conflict['entity']} - {conflict['attribute']}"
        )
```

## Standard Skill Output Format

### 1. Status

- `success`: All facts extracted and stored
- `partial`: Some extraction errors occurred
- `failed`: Extraction failed

### 2. Artifacts Created

```markdown
- `RESEARCH/[topic]/data/fact_ledger/facts.json`
- `RESEARCH/[topic]/data/fact_ledger/conflicts.json`
- `RESEARCH/[topic]/data/fact_ledger/extraction_log.md`
```

### 3. Quality Score

```markdown
**Extraction Quality**: [0-10]/10
**Facts Extracted**: [count]
**High-Confidence Facts**: [count]
**Conflicts Detected**: [count]
**Coverage**: [percentage]% of agent findings processed
```

### 4. Next Steps

```markdown
**Recommended Next Action**: [synthesizer | conflict-resolver | citation-validator]
**Reason**: [why this is the next step]
**Handoff Data**:
- Fact ledger path: RESEARCH/[topic]/data/fact_ledger/
- Total facts: [count]
- Unresolved conflicts: [count]
```

## Extraction Templates

### Template 1: Market Size Extraction

**Input text:**
> "The global AI in healthcare market was valued at $22.4 billion in 2023 and is projected to reach $102.7 billion by 2028, growing at a CAGR of 37.5%."

**Output:**

```json
[
  {
    "entity": "AI Healthcare Market",
    "attribute": "Market Size 2023",
    "value": "$22.4 billion",
    "value_type": "currency",
    "value_numeric": 22.4,
    "unit": "USD billion",
    "confidence": "High",
    "context": "Global market valuation"
  },
  {
    "entity": "AI Healthcare Market",
    "attribute": "Projected Market Size 2028",
    "value": "$102.7 billion",
    "value_type": "currency",
    "value_numeric": 102.7,
    "unit": "USD billion",
    "confidence": "Medium",
    "context": "Projection"
  },
  {
    "entity": "AI Healthcare Market",
    "attribute": "CAGR 2023-2028",
    "value": "37.5%",
    "value_type": "percentage",
    "value_numeric": 37.5,
    "unit": "percent per year",
    "confidence": "Medium",
    "context": "Growth projection"
  }
]
```

### Template 2: Technical Specification Extraction

**Input text:**
> "GPT-4 has approximately 1.76 trillion parameters, making it significantly larger than GPT-3's 175 billion parameters."

**Output:**

```json
[
  {
    "entity": "GPT-4",
    "attribute": "Parameter Count",
    "value": "1.76 trillion",
    "value_type": "number",
    "value_numeric": 1760000000000,
    "unit": "parameters",
    "confidence": "Medium",
    "context": "Approximate count from semi-official reports"
  },
  {
    "entity": "GPT-3",
    "attribute": "Parameter Count",
    "value": "175 billion",
    "value_type": "number",
    "value_numeric": 175000000000,
    "unit": "parameters",
    "confidence": "High",
    "context": "Official OpenAI specification"
  }
]
```

### Template 3: Table Data Extraction

**Input HTML Table:**

| Company | Market Share | Revenue 2023 |
|---------|-------------|--------------|
| IBM Watson | 15.2% | $3.4B |
| Google Health | 12.8% | $2.9B |

**Output:**

```json
[
  {
    "entity": "IBM Watson Health",
    "attribute": "AI Healthcare Market Share",
    "value": "15.2%",
    "value_type": "percentage",
    "value_numeric": 15.2,
    "unit": "percent",
    "confidence": "High"
  },
  {
    "entity": "IBM Watson Health",
    "attribute": "Revenue 2023",
    "value": "$3.4B",
    "value_type": "currency",
    "value_numeric": 3.4,
    "unit": "USD billion",
    "confidence": "High"
  },
  {
    "entity": "Google Health",
    "attribute": "AI Healthcare Market Share",
    "value": "12.8%",
    "value_type": "percentage",
    "value_numeric": 12.8,
    "unit": "percent",
    "confidence": "High"
  },
  {
    "entity": "Google Health",
    "attribute": "Revenue 2023",
    "value": "$2.9B",
    "value_type": "currency",
    "value_numeric": 2.9,
    "unit": "USD billion",
    "confidence": "High"
  }
]
```

## Best Practices

1. **Extract ALL verifiable facts**, not just obvious ones
2. **Preserve exact values** from source - never round or approximate
3. **One fact = one atomic claim** - break compound statements
4. **Include source excerpt** for verification
5. **Assign confidence based on source quality**, not personal judgment
6. **Flag uncertainties** explicitly rather than omitting
7. **Normalize entity names** for consistency across sources
8. **Check for existing entity aliases** before creating new entities
