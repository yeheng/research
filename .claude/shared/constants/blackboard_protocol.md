# Blackboard Protocol for Multi-Agent Research

## Overview

The **Blackboard** is a shared knowledge space where parallel research agents can:
- Post key findings for other agents to see
- Avoid duplicate work by checking what others have found
- Build on each other's discoveries
- Coordinate research directions

## File Location

`RESEARCH/[topic]/research_notes/shared_insights.md`

## Structure

```markdown
# Shared Research Insights - [Topic Name]

**Last Updated**: 2024-01-09 12:30:00
**Active Agents**: 5

---

## High-Confidence Findings (Score ≥ 8.0)

### Finding 1: [Title]
- **Posted by**: Agent 2
- **Timestamp**: 2024-01-09 10:15:00
- **Score**: 8.5/10
- **Summary**: [1-2 sentence summary]
- **Key Sources**: [URL 1], [URL 2]
- **Related to**: Subtopic B
- **Status**: ✅ Verified by Agent 4

### Finding 2: [Title]
- **Posted by**: Agent 1
- **Timestamp**: 2024-01-09 10:20:00
- **Score**: 9.0/10
- **Summary**: [1-2 sentence summary]
- **Key Sources**: [URL 1], [URL 2], [URL 3]
- **Related to**: Subtopic A
- **Status**: ✅ Verified by Agent 3

---

## Medium-Confidence Findings (Score 6.0-7.9)

### Finding 3: [Title]
- **Posted by**: Agent 3
- **Timestamp**: 2024-01-09 10:25:00
- **Score**: 7.2/10
- **Summary**: [1-2 sentence summary]
- **Key Sources**: [URL 1]
- **Related to**: Subtopic C
- **Status**: ⚠️ Needs verification

---

## Contradictions & Conflicts

### Conflict 1: Market Size Estimates
- **Agent 1 found**: $22B (Source: Gartner)
- **Agent 2 found**: $28B (Source: McKinsey)
- **Possible reason**: Different market definitions
- **Resolution needed**: ✅ Resolved - Both correct for different scopes

---

## Dead Ends & Blockers

### Blocker 1: Paywall
- **Agent**: Agent 4
- **Issue**: Key paper behind paywall (Nature, 2024)
- **Workaround**: Found preprint version on arXiv

### Blocker 2: No Data Available
- **Agent**: Agent 5
- **Issue**: No public data on [specific metric]
- **Status**: Documented as research gap

---

## URLs Already Fetched (Avoid Duplicates)

| URL | Fetched By | Quality | Notes |
|-----|------------|---------|-------|
| https://example.com/article1 | Agent 1 | A | Excellent source |
| https://example.com/article2 | Agent 2 | B | Good data |
| https://example.com/article3 | Agent 3 | D | Low quality, skip |

---

## Research Gaps Identified

1. **Gap 1**: No recent data on [topic] after 2022
2. **Gap 2**: Limited information on [geographic region]
3. **Gap 3**: Conflicting methodologies across studies

---

## Coordination Notes

- **Agent 1**: Focusing on technical specifications
- **Agent 2**: Focusing on market analysis
- **Agent 3**: Focusing on regulatory landscape
- **Agent 4**: Cross-verification role
- **Agent 5**: Academic literature review
```

## Usage Protocol

### When Starting Research (Each Agent)

1. **Read the blackboard first**:
   ```bash
   # Check if blackboard exists
   if [ -f "RESEARCH/[topic]/research_notes/shared_insights.md" ]; then
       # Read it to see what others have found
       cat RESEARCH/[topic]/research_notes/shared_insights.md
   fi
   ```

2. **Check URL manifest**:
   ```bash
   python3 scripts/url_manifest.py list --topic [topic]
   ```

3. **Identify your unique contribution**:
   - What has NOT been covered yet?
   - What needs verification?
   - What gaps can you fill?

### During Research (Each Agent)

1. **Post high-confidence findings immediately**:
   - When you find something with score ≥ 8.0
   - Update the "High-Confidence Findings" section
   - Include timestamp and your agent ID

2. **Flag contradictions**:
   - If your finding conflicts with another agent's
   - Post in "Contradictions & Conflicts" section
   - Suggest possible explanations

3. **Report blockers**:
   - Paywalls, broken links, missing data
   - Help other agents avoid wasting time

4. **Update URL list**:
   - Mark URLs you've fetched
   - Rate their quality (A-E)
   - Save others from re-fetching

### After Research (Each Agent)

1. **Final update**:
   - Post summary of your findings
   - Mark your status as "Complete"
   - Highlight any unresolved questions

## Benefits

### 1. Avoid Duplicate Work
- Agent 1 fetches Wikipedia article
- Agent 2 sees it in URL list, skips it
- **Saved**: 2-3 minutes + tokens

### 2. Build on Discoveries
- Agent 1 finds excellent source
- Agent 2 sees it, explores related sources
- **Result**: Deeper coverage

### 3. Early Conflict Detection
- Agent 1 finds "Market is $20B"
- Agent 2 finds "Market is $30B"
- **Action**: Investigate discrepancy early

### 4. Coordinate Coverage
- Agent 1 covers technical aspects
- Agent 2 sees this, focuses on business aspects
- **Result**: Better overall coverage

## Implementation Example

### Agent 1 Posts Finding

```markdown
## High-Confidence Findings (Score ≥ 8.0)

### Finding 1: CRISPR Off-Target Rate
- **Posted by**: Agent 1
- **Timestamp**: 2024-01-09 10:15:00
- **Score**: 9.0/10
- **Summary**: Off-target effects occur in 0.1-1% of edits based on 3 peer-reviewed studies
- **Key Sources**:
  - https://nature.com/article1 (Nature, 2024) [A]
  - https://science.org/article2 (Science, 2023) [A]
  - https://cell.com/article3 (Cell, 2024) [A]
- **Related to**: Safety & Efficacy
- **Status**: ✅ High confidence
```

### Agent 2 Reads and Builds On It

```markdown
## High-Confidence Findings (Score ≥ 8.0)

### Finding 2: Off-Target Detection Methods
- **Posted by**: Agent 2
- **Timestamp**: 2024-01-09 10:30:00
- **Score**: 8.5/10
- **Summary**: Building on Agent 1's finding - new detection methods can identify off-targets with 99% accuracy
- **Key Sources**:
  - https://nature.com/article4 (Nature Methods, 2024) [A]
  - https://biorxiv.org/preprint1 (bioRxiv, 2024) [D]
- **Related to**: Safety & Efficacy
- **Builds on**: Finding 1 by Agent 1
- **Status**: ✅ Verified
```

## Best Practices

1. **Update frequently**: Post findings as you discover them, don't wait until the end
2. **Be concise**: 1-2 sentence summaries, full details go in your agent report
3. **Use timestamps**: Helps track research progression
4. **Rate confidence**: Use the 0-10 scoring system consistently
5. **Cross-reference**: Link related findings together
6. **Flag uncertainties**: Better to note "needs verification" than post false confidence

## Anti-Patterns (Avoid These)

❌ **Don't**: Post every minor finding (clutters the blackboard)
✅ **Do**: Post only high-confidence (≥8.0) or important findings

❌ **Don't**: Copy entire articles into the blackboard
✅ **Do**: Post summaries with source links

❌ **Don't**: Ignore contradictions
✅ **Do**: Flag conflicts immediately for resolution

❌ **Don't**: Work in isolation without checking the blackboard
✅ **Do**: Read blackboard before starting and update during research

## Integration with Other Tools

### With URL Manifest
```bash
# Before fetching
python3 scripts/url_manifest.py check "https://example.com" --topic my_topic

# After fetching
python3 scripts/url_manifest.py register "https://example.com" --topic my_topic --local data/raw/file.html

# Update blackboard
echo "- https://example.com | Agent 1 | A | Excellent source" >> shared_insights.md
```

### With Agent Health Check
```bash
# Check which agents are active
python3 scripts/check_agent_health.py --topic my_topic

# Update blackboard with agent status
```

### With Vector Store
```bash
# After posting to blackboard, index the finding
python3 scripts/vector_store.py add "Finding summary" --topic my_topic --metadata '{"agent": "Agent 1", "score": 9.0}'
```

## Maintenance

- **Cleanup**: After research completes, archive the blackboard to `research_notes/archive/`
- **Versioning**: Keep timestamped snapshots for recovery
- **Size limit**: If blackboard exceeds 500 lines, split into multiple files by subtopic
