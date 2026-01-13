# Entity Graph - Phase 4 MCP Processing

**Generated**: {TIMESTAMP}
**Extraction Tool**: mcp__deep-research__entity-extract
**Total Entities**: {TOTAL_ENTITIES}
**Unique Entities**: {UNIQUE_ENTITIES}

---

## Summary by Entity Type

| Entity Type | Count | Unique |
|-------------|-------|--------|
| Organizations | {ORG_COUNT} | {ORG_UNIQUE} |
| People | {PERSON_COUNT} | {PERSON_UNIQUE} |
| Dates | {DATE_COUNT} | {DATE_UNIQUE} |
| Locations | {LOCATION_COUNT} | {LOCATION_UNIQUE} |
| Concepts | {CONCEPT_COUNT} | {CONCEPT_UNIQUE} |
| Numerical Values | {NUMERICAL_COUNT} | {NUMERICAL_UNIQUE} |

---

## Organizations ({ORG_COUNT} mentions, {ORG_UNIQUE} unique)

{FOR EACH ORGANIZATION}

### {ORGANIZATION_NAME}

**Mention Count**: {MENTION_COUNT}
**First Seen**: {TIMESTAMP}
**Primary Source**: {SOURCE_URL}

**Aliases/Variations**:

- {ALIAS_1}
- {ALIAS_2}

**Related People**:

- {PERSON_1} ({ROLE})
- {PERSON_2} ({ROLE})

**Related Concepts**:

- {CONCEPT_1}
- {CONCEPT_2}

**Context Snippets**:
> "{CONTEXT_QUOTE_1}" - {SOURCE}
> "{CONTEXT_QUOTE_2}" - {SOURCE}

**Facts Mentioning This Entity**:

- {FACT_ID_1}: {FACT_SUMMARY_1}
- {FACT_ID_2}: {FACT_SUMMARY_2}

---

{END FOR EACH}

## People ({PERSON_COUNT} mentions, {PERSON_UNIQUE} unique)

{FOR EACH PERSON}

### {PERSON_NAME}

**Mention Count**: {MENTION_COUNT}
**Primary Role**: {ROLE_TITLE}
**Affiliation**: {ORGANIZATION}

**First Seen**: {TIMESTAMP}
**Primary Source**: {SOURCE_URL}

**Aliases/Variations**:

- {ALIAS_1}

**Expertise Areas**:

- {EXPERTISE_1}
- {EXPERTISE_2}

**Related Organizations**:

- {ORG_1} ({RELATIONSHIP})
- {ORG_2} ({RELATIONSHIP})

**Context Snippets**:
> "{CONTEXT_QUOTE}" - {SOURCE}

**Facts Mentioning This Person**:

- {FACT_ID_1}: {FACT_SUMMARY}
- {FACT_ID_2}: {FACT_SUMMARY}

---

{END FOR EACH}

## Dates ({DATE_COUNT} mentions, {DATE_UNIQUE} unique)

{FOR EACH DATE}

### {DATE_VALUE}

**Mention Count**: {MENTION_COUNT}
**Date Type**: {PUBLICATION_DATE/EVENT_DATE/RELEASE_DATE/TIMESTAMP}

**Associated Events**:

- {EVENT_1} ({SOURCE})
- {EVENT_2} ({SOURCE})

**Context**:
> "{CONTEXT_QUOTE}" - {SOURCE}

**Related Facts**:

- {FACT_ID_1}: {FACT_SUMMARY}

---

{END FOR EACH}

## Locations ({LOCATION_COUNT} mentions, {LOCATION_UNIQUE} unique)

{FOR EACH LOCATION}

### {LOCATION_NAME}

**Mention Count**: {MENTION_COUNT}
**Location Type**: {COUNTRY/CITY/REGION/INSTITUTION}

**Related Organizations**:

- {ORG_1}
- {ORG_2}

**Context**:
> "{CONTEXT_QUOTE}" - {SOURCE}

**Related Facts**:

- {FACT_ID_1}: {FACT_SUMMARY}

---

{END FOR EACH}

## Concepts ({CONCEPT_COUNT} mentions, {CONCEPT_UNIQUE} unique)

{FOR EACH CONCEPT}

### {CONCEPT_NAME}

**Mention Count**: {MENTION_COUNT}
**Category**: {TECHNICAL/BUSINESS/SCIENTIC/OTHER}

**Definition**:
{DEFITION_FROM_SOURCES}

**Related Concepts**:

- {RELATED_CONCEPT_1} ({RELATIONSHIP_TYPE})
- {RELATED_CONCEPT_2} ({RELATIONSHIP_TYPE})

**Related Organizations**:

- {ORG_1}
- {ORG_2}

**Context Snippets**:
> "{CONTEXT_QUOTE_1}" - {SOURCE}
> "{CONTEXT_QUOTE_2}" - {SOURCE}

**Related Facts**:

- {FACT_ID_1}: {FACT_SUMMARY}
- {FACT_ID_2}: {FACT_SUMMARY}

---

{END FOR EACH}

## Numerical Values ({NUMERICAL_COUNT} mentions, {NUMERICAL_UNIQUE} unique)

{FOR EACH NUMERICAL}

### {VALUE} {UNIT}

**Mention Count**: {MENTION_COUNT}
**Metric Type**: {REVENUE/PERCENTAGE/QUANTITY/SCORE/OTHER}

**Context**:

- "{CONTEXT_1}" - {SOURCE}
- "{CONTEXT_2}" - {SOURCE}

**Entity Association**: {ASSOCIATED_ENTITY}
**Time Period**: {TIME_PERIOD}

**Related Facts**:

- {FACT_ID_1}: {FACT_SUMMARY}

---

{END FOR EACH}

## Relationship Graph

### Key Relationships

{FOR EACH IMPORTANT_RELATIONSHIP}

- **{ENTITY_1}** ←{RELATIONSHIP_TYPE}→ **{ENTITY_2}**
  - Strength: {STRONG/MODERATE/WEAK}
  - Source Count: {SOURCE_COUNT}
  - First seen: {TIMESTAMP}

{END FOR EACH}

### Relationship Clusters

**Cluster 1: {CLUSTER_THEME}**

- Center entity: {CENTRAL_ENTITY}
- Related entities: {ENTITY_LIST}
- Relationship types: {RELATIONSHIP_TYPES}

**Cluster 2: {CLUSTER_THEME}**

- Center entity: {CENTRAL_ENTITY}
- Related entities: {ENTITY_LIST}
- Relationship types: {RELATIONSHIP_TYPES}

---

## Entity Co-occurrence Matrix

| Entity A | Entity B | Co-occurrence Count | Sources |
|----------|----------|---------------------|---------|
{FOR EACH COOCCURRENCE}
| {ENTITY_A_NAME} | {ENTITY_B_NAME} | {COUNT} | {SOURCE_URLS} |
{END FOR EACH}

---

## Extraction Statistics

- **Total text processed**: {CHARACTER_COUNT} characters
- **Average entities per source**: {AVG_PER_SOURCE}
- **Most mentioned entity**: {TOP_ENTITY} ({TOP_COUNT} mentions)
- **Least mentioned entities**: {BOTTOM_ENTITIES} (1 mention each)
- **Extraction confidence**: {AVG_CONFIDENCE}

**File Purpose**: This file contains all entities and relationships extracted by MCP tools.
**Related Files**: fact_ledger.md (contains facts mentioning these entities)
**Location**: RESEARCH/[topic]/processed/entity_graph.md
**MCP Tool**: mcp__deep-research__entity-extract
