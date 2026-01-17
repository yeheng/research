# Fact Ledger - Phase 4 MCP Processing

**Generated**: {TIMESTAMP}
**Processing Duration**: {PROCESSING_SECONDS} seconds
**MCP Tools Used**: fact-extract, entity-extract, conflict-detect, batch-source-rate

## Summary

- **Total Facts Extracted**: {TOTAL_FACTS}
- **Total Entities Extracted**: {TOTAL_ENTITIES}
- **Conflicts Detected**: {CONFLICT_COUNT}
- **Sources Rated**: {SOURCE_COUNT}
- **Raw Files Processed**: {RAW_FILE_COUNT}

---

## Extracted Facts ({TOTAL_FACTS} total)

### High-Confidence Facts (Confidence > 0.9)

{FOR EACH HIGH_CONFIDENCE_FACT}

#### Fact {INDEX}

**Statement**: {FACT_STATEMENT}
**Source**: {SOURCE_URL}
**Source Type**: {ACADEMIC/INDUSTRY/NEWS/BLOG/OFFICIAL}
**Confidence**: {CONFIDENCE_SCORE}
**Quality Rating**: {A/B/C/D/E}
**Extraction Method**: {MCP_FACT_EXTRACT}
**Extraction Time**: {TIMESTAMP}

**Context**: {SURROUNDING_CONTEXT}

**Related Entities**: {ENTITY_1, ENTITY_2, ...}
**Related Facts**: {FACT_ID_1, FACT_ID_2, ...}

---

{END FOR EACH}

### Medium-Confidence Facts (Confidence 0.7-0.9)

{FOR EACH MEDIUM_CONFIDENCE_FACT}

#### Fact {INDEX}

**Statement**: {FACT_STATEMENT}
**Source**: {SOURCE_URL}
**Confidence**: {CONFIDENCE_SCORE}
**Quality Rating**: {RATING}

---

{END FOR EACH}

### Low-Confidence Facts (Confidence < 0.7)

{FOR EACH LOW_CONFIDENCE_FACT}

#### Fact {INDEX}

**Statement**: {FACT_STATEMENT}
**Source**: {SOURCE_URL}
**Confidence**: {CONFIDENCE_SCORE}
**Quality Rating**: {RATING}
**Note**: Requires manual verification

---

{END FOR EACH}

---

## Entities Extracted ({TOTAL_ENTITIES} total)

### Organizations ({ORG_COUNT})

{FOR EACH ORG}

- **{ORG_NAME}** ({MENTION_COUNT} mentions)
  - First seen: {SOURCE_URL}
  - Context: {CONTEXT}

{END FOR EACH}

### People ({PERSON_COUNT})

{FOR EACH PERSON}

- **{PERSON_NAME}** ({MENTION_COUNT} mentions)
  - Role/Title: {ROLE}
  - Affiliation: {ORGANIZATION}
  - First seen: {SOURCE_URL}

{END FOR EACH}

### Dates ({DATE_COUNT})

{FOR EACH DATE}

- **{DATE_VALUE}** ({MENTION_COUNT} mentions)
  - Event: {EVENT_DESCRIPTION}
  - Sources: {SOURCE_URLS}

{END FOR EACH}

### Locations ({LOCATION_COUNT})

{FOR EACH LOCATION}

- **{LOCATION_NAME}** ({MENTION_COUNT} mentions)
  - Context: {CONTEXT}

{END FOR EACH}

### Concepts ({CONCEPT_COUNT})

{FOR EACH CONCEPT}

- **{CONCEPT_NAME}** ({MENTION_COUNT} mentions)
  - Definition: {DEFITION}
  - Related concepts: {RELATED_CONCEPTS}

{END FOR EACH}

---

## Conflicts Detected ({CONFLICT_COUNT} total)

{FOR EACH CONFLICT}

### Conflict {INDEX}

**Type**: {NUMERICAL/TEMPORAL/FACTUAL/CONTRADICTORY}

**Fact A**:

- Statement: {FACT_A_STATEMENT}
- Source: {FACT_A_SOURCE}
- Confidence: {FACT_A_CONFIDENCE}

**Fact B**:

- Statement: {FACT_B_STATEMENT}
- Source: {FACT_B_SOURCE}
- Confidence: {FACT_B_CONFIDENCE}

**Resolution**: {RESOLUTION_METHOD}

- {RESOLUTION_DESCRIPTION}
- Accepted fact: {FACT_A_OR_B_OR_NEITHER}
- Reasoning: {RESOLUTION_REASONING}

---

{END FOR EACH}

---

## Source Quality Ratings

| Source | Type | Rating | Reason | Fact Count |
|--------|------|--------|--------|------------|
{FOR EACH SOURCE}
| [{SOURCE_NAME}]({SOURCE_URL}) | {SOURCE_TYPE} | {A/B/C/D/E} | {RATING_REASON} | {FACT_COUNT} |
{END FOR EACH}

**Rating Legend**:

- **A**: Peer-reviewed, primary source, high credibility
- **B**: Industry report, reputable analyst, primary source
- **C**: Expert opinion, secondary source
- **D**: Preprint, preliminary research, blog
- **E**: Anecdotal, theoretical, speculative

---

## MCP Tool Statistics

### fact-extract

- **Total calls**: {CALL_COUNT}
- **Facts extracted**: {TOTAL_FACTS}
- **Average confidence**: {AVG_CONFIDENCE}
- **Processing time**: {PROCESSING_TIME}

### entity-extract

- **Total calls**: {CALL_COUNT}
- **Entities extracted**: {TOTAL_ENTITIES}
- **Unique entities**: {UNIQUE_COUNT}
- **Processing time**: {PROCESSING_TIME}

### conflict-detect

- **Total calls**: {CALL_COUNT}
- **Conflicts found**: {CONFLICT_COUNT}
- **Resolved**: {RESOLVED_COUNT}
- **Unresolved**: {UNRESOLVED_COUNT}
- **Processing time**: {PROCESSING_TIME}

### batch-source-rate

- **Total calls**: {CALL_COUNT}
- **Sources rated**: {SOURCE_COUNT}
- **Average rating**: {AVG_RATING}
- **Processing time**: {PROCESSING_TIME}

---

## Processing Log

{TIMESTAMP} - Started Phase 4 MCP processing
{TIMESTAMP} - Loaded {RAW_FILE_COUNT} raw files from raw/ directory
{TIMESTAMP} - Applied mcp__fact-extract to all raw files
{TIMESTAMP} - Applied mcp__entity-extract to all raw files
{TIMESTAMP} - Applied mcp__conflict-detect to {TOTAL_FACTS} facts
{TIMESTAMP} - Applied mcp__batch-source-rate to {SOURCE_COUNT} sources
{TIMESTAMP} - Wrote fact_ledger.md, entity_graph.md, conflict_report.md, source_ratings.md
{TIMESTAMP} - Completed Phase 4 processing

---

**File Purpose**: This file contains all facts extracted by MCP tools from raw search results.
**Next Phase**: Phase 5 (Knowledge Synthesis) will load this file for report generation.
**Location**: RESEARCH/[topic]/processed/fact_ledger.md
**Inputs**: raw/agent_*.md files
**MCP Tools Used**: mcp__deep-research__fact-extract, mcp__deep-research__entity-extract, mcp__deep-research__conflict-detect, mcp__deep-research__batch-source-rate
