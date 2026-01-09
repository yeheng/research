# Token Optimization Guidelines

**Critical**: All research skills MUST follow these token optimization strategies to prevent context window overflow.

## Core Principle

**Never load raw web content directly into context.**

Use the **Download → Clean → Read** pipeline for all web sources.

---

## The 3-Step Pipeline

### Step 1: Fetch & Save Raw Data

```bash
# Use WebFetch but immediately save to disk
WebFetch: https://example.com/article
↓
Save to: RESEARCH/[topic]/data/raw/source_id.html
```

**Do NOT** keep fetched content in context window.

### Step 2: Preprocess Document

```bash
python3 scripts/preprocess_document.py \
  RESEARCH/[topic]/data/raw/source_id.html
```

**Output**:

```json
{
  "output_path": "RESEARCH/[topic]/data/processed/source_id_cleaned.md",
  "original_tokens": 45000,
  "cleaned_tokens": 4500,
  "saved_tokens": 40500,
  "savings_percent": 90.0
}
```

**What it does**:

- Removes HTML boilerplate, ads, navigation
- Extracts main content only
- Converts to clean Markdown
- Reduces tokens by 60-90%

### Step 3: Read Processed Data

```bash
# Read cleaned file instead of raw HTML
Read: RESEARCH/[topic]/data/processed/source_id_cleaned.md
```

**If still large (>10k tokens)**:

- Read first 50 lines for overview
- Read specific sections by line number as needed

---

## Token Budgets by Skill

| Skill | Max Context | Per-Source Limit | Strategy |
|-------|-------------|------------------|----------|
| question-refiner | 10k | N/A | Minimal context |
| research-executor | 50k | 10k per source | Pipeline required |
| got-controller | 50k | 5k per node | Aggressive pruning |
| synthesizer | 80k | 15k per agent output | Hierarchical synthesis |
| citation-validator | 30k | 5k per document | Validate in batches |

---

## Optimization Techniques

### 1. Chunked Reading

For large documents:

```bash
# Read in chunks
Read lines 1-100    # Introduction
Read lines 500-600  # Specific section
Read lines -50--1   # Conclusion
```

### 2. URL Manifest (Deduplication)

Before fetching any URL:

```bash
python3 scripts/url_manifest.py check \
  "https://example.com/article" --topic my_topic
```

If already cached:

```json
{
  "cached": true,
  "local_path": "data/processed/article_cleaned.md",
  "tokens": 4500
}
```

Skip fetch, read from cache.

### 3. Vector Store (RAG)

For large knowledge bases:

```bash
# Index documents
python3 scripts/vector_store.py index \
  RESEARCH/topic/data/processed/*.md

# Query instead of reading entire docs
python3 scripts/vector_store.py query \
  "market growth rate" --topic topic_name
```

Returns only relevant chunks (~500 tokens vs 50k tokens).

### 4. Hierarchical Synthesis

When synthesizing 20+ findings:

```
Step 1: Group into 5 themes (4 findings each)
Step 2: Synthesize each theme separately
Step 3: Aggregate 5 theme summaries into final report
```

Reduces context from 100k tokens to 20k tokens.

### 5. State Checkpointing

For long-running research (GoT):

```bash
# Save state every 3 operations
Save to: research_notes/got_state_checkpoint_3.json

# If context grows too large, restart from checkpoint
Load from: research_notes/got_state_checkpoint_3.json
```

---

## Token Estimation

### Before Processing

```bash
# Estimate tokens in raw HTML
wc -w file.html | awk '{print $1 * 1.3}'
# Multiply word count by 1.3 for token estimate
```

### After Processing

```bash
# Check cleaned file size
wc -w file_cleaned.md | awk '{print $1 * 1.3}'
```

### Target Savings

- **Minimum**: 60% reduction
- **Target**: 80% reduction
- **Excellent**: 90% reduction

---

## Warning Signs

### Context Window Approaching Limit

If you see these signs, apply aggressive optimization:

1. **Slow response times** → Context too large
2. **Truncated outputs** → Context overflow
3. **"Token limit" errors** → Immediate action required

### Emergency Actions

```bash
# 1. Clear all raw HTML from context
rm RESEARCH/[topic]/data/raw/*.html

# 2. Keep only processed files
ls RESEARCH/[topic]/data/processed/

# 3. Read summaries only (first 20 lines)
Read lines 1-20 from each processed file

# 4. Use vector store for queries
python3 scripts/vector_store.py query "key facts"
```

---

## Skill-Specific Guidelines

### research-executor

```markdown
## Token Optimization (CRITICAL)

**FORBIDDEN**: Direct WebFetch content in context for pages >5KB

**REQUIRED**: Download → Clean → Read pipeline for ALL sources

**Per-Agent Budget**: 15k tokens max
- 5k for instructions
- 10k for source content (processed)
```

### got-controller

```markdown
## Token Optimization

**Node Size Limit**: 5k tokens per node

**Pruning Strategy**:
- Score <6.0: Immediate removal
- Score 6.0-7.0: Summarize to 1k tokens
- Score >7.0: Keep full content

**State Checkpointing**: Every 3 operations
```

### synthesizer

```markdown
## Token Optimization

**Input Limit**: 15k tokens per agent output

**If exceeded**:
1. Request agent summaries (2k tokens each)
2. Use hierarchical synthesis
3. Read full outputs only for high-quality findings (score >8.0)
```

### citation-validator

```markdown
## Token Optimization

**Batch Validation**: Process 20 citations at a time

**URL Checking**: Cache results for 7 days

**Skip Re-validation**: If URL checked within 24 hours
```

---

## Monitoring

Track token usage in research notes:

```markdown
## Token Usage Log

**Phase 2 - Retrieval**:
- Agent 1: 12k tokens (3 sources, all preprocessed)
- Agent 2: 8k tokens (2 sources, all preprocessed)
- Agent 3: 15k tokens (4 sources, all preprocessed)
- Total: 35k tokens

**Phase 5 - Synthesis**:
- Input: 35k tokens (agent outputs)
- Processing: 25k tokens (after summarization)
- Output: 8k tokens (final report)

**Total Research**: 68k tokens (within 80k budget ✓)
```

---

## Best Practices Summary

✅ **DO**:

- Always use preprocessing pipeline
- Check URL manifest before fetching
- Read processed files, not raw HTML
- Use chunked reading for large docs
- Checkpoint state regularly
- Monitor token usage

❌ **DON'T**:

- Load raw HTML into context
- Fetch same URL multiple times
- Read entire large documents
- Keep all sources in context simultaneously
- Ignore token warnings
