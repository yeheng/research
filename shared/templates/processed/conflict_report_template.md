# Conflict Report - Phase 4 MCP Processing

**Generated**: {TIMESTAMP}
**Detection Tool**: mcp__deep-research__conflict-detect
**Total Facts Analyzed**: {TOTAL_FACTS}
**Conflicts Detected**: {CONFLICT_COUNT}
**Resolved**: {RESOLVED_COUNT}
**Unresolved**: {UNRESOLVED_COUNT}

---

## Executive Summary

- **Conflict Rate**: {CONFLICT_PERCENTAGE}% of analyzed facts
- **Most Common Conflict Type**: {MOST_COMMON_TYPE}
- **Resolution Rate**: {RESOLUTION_PERCENTAGE}%
- **Manual Review Required**: {MANUAL_REVIEW_COUNT} conflicts

---

## Conflicts by Type

| Conflict Type | Count | Resolved | Unresolved | Severity |
|---------------|-------|----------|------------|----------|
| Numerical | {NUMERICAL_COUNT} | {NUMERICAL_RESOLVED} | {NUMERICAL_UNRESOLVED} | {SEVERITY} |
| Temporal | {TEMPORAL_COUNT} | {TEMPORAL_RESOLVED} | {TEMPORAL_UNRESOLVED} | {SEVERITY} |
| Factual | {FACTUAL_COUNT} | {FACTUAL_RESOLVED} | {FACTUAL_UNRESOLVED} | {SEVERITY} |
| Contradictory | {CONTRADICTORY_COUNT} | {CONTRADICTORY_RESOLVED} | {CONTRADICTORY_UNRESOLVED} | {SEVERITY} |

---

## Detailed Conflicts

### Numerical Conflicts ({NUMERICAL_COUNT} total)

{FOR EACH NUMERICAL_CONFLICT}
#### Conflict {INDEX}: {METRIC_NAME} Discrepancy

**Severity**: {HIGH/MEDIUM/LOW}
**Status**: {RESOLVED/UNRESOLVED/MANUAL_REVIEW}

**Fact A**:
- Statement: {FACT_A_STATEMENT}
- Value: {VALUE_A}
- Source: [{SOURCE_NAME}]({SOURCE_URL_A})
- Quality Rating: {RATING_A}
- Confidence: {CONFIDENCE_A}
- Timestamp: {TIMESTAMP_A}

**Fact B**:
- Statement: {FACT_B_STATEMENT}
- Value: {VALUE_B}
- Source: [{SOURCE_NAME}]({SOURCE_URL_B})
- Quality Rating: {RATING_B}
- Confidence: {CONFIDENCE_B}
- Timestamp: {TIMESTAMP_B}

**Difference**: {CALCULATED_DIFFERENCE} ({PERCENTAGE_DIFFERENCE}%)

**Resolution**:
- Method: {HIGHEST_QUALITY/MOST_RECENT/CONSENSUS/MANUAL}
- Accepted: {FACT_A_OR_B}
- Accepted Value: {ACCEPTED_VALUE}
- Reasoning: {RESOLUTION_REASONING}
- Additional Context: {ADDITIONAL_INFO}

**If Unresolved**:
- Action Required: Manual verification needed
- Recommended Source: {RECOMMENDED_SOURCE}
- Notes: {NOTES}

---

{END FOR EACH}

### Temporal Conflicts ({TEMPORAL_COUNT} total)

{FOR EACH TEMPORAL_CONFLICT}
#### Conflict {INDEX}: {EVENT_NAME} Timing Discrepancy

**Severity**: {HIGH/MEDIUM/LOW}
**Status**: {RESOLVED/UNRESOLVED/MANUAL_REVIEW}

**Fact A**:
- Statement: {FACT_A_STATEMENT}
- Date: {DATE_A}
- Source: [{SOURCE_NAME}]({SOURCE_URL_A})
- Quality Rating: {RATING_A}
- Confidence: {CONFIDENCE_A}

**Fact B**:
- Statement: {FACT_B_STATEMENT}
- Date: {DATE_B}
- Source: [{SOURCE_NAME}]({SOURCE_URL_B})
- Quality Rating: {RATING_B}
- Confidence: {CONFIDENCE_B}

**Time Difference**: {TIME_DIFFERENCE}

**Resolution**:
- Method: {MOST_RECENT/PRIMARY_SOURCE/CONSENSUS/MANUAL}
- Accepted: {FACT_A_OR_B}
- Accepted Date: {ACCEPTED_DATE}
- Reasoning: {RESOLUTION_REASONING}

**If Unresolved**:
- Action Required: Verify with official sources
- Notes: {NOTES}

---

{END FOR EACH}

### Factual Conflicts ({FACTUAL_COUNT} total)

{FOR EACH FACTUAL_CONFLICT}
#### Conflict {INDEX}: {TOPIC} Contradiction

**Severity**: {HIGH/MEDIUM/LOW}
**Status**: {RESOLVED/UNRESOLVED/MANUAL_REVIEW}

**Fact A**:
- Statement: "{FACT_A_STATEMENT}"
- Source: [{SOURCE_NAME}]({SOURCE_URL_A})
- Quality Rating: {RATING_A}
- Confidence: {CONFIDENCE_A}
- Context: {CONTEXT_A}

**Fact B**:
- Statement: "{FACT_B_STATEMENT}"
- Source: [{SOURCE_NAME}]({SOURCE_URL_B})
- Quality Rating: {RATING_B}
- Confidence: {CONFIDENCE_B}
- Context: {CONTEXT_B}

**Analysis**:
- Contradiction Type: {DIRECT/IMPLIED/CONTEXTUAL}
- Scope: {GLOBAL/SPECIFIC_CONDITION/DIFFERENT_CONTEXT}
- Potential Reconciliation: {RECONCILIATION_POSSIBILITY}

**Resolution**:
- Method: {HIGHEST_QUALITY/MOST_SPECIFIC/CONSENSUS/MANUAL}
- Accepted: {FACT_A_OR_B_OR_BOTH}
- Accepted Statement: "{ACCEPTED_STATEMENT}"
- Reasoning: {RESOLUTION_REASONING}
- Qualifications: {QUALIFICATIONS_IF_ANY}

**If Unresolved**:
- Action Required: Expert review needed
- Recommended Approach: {RECOMMENDED_APPROACH}
- Notes: {NOTES}

---

{END FOR EACH}

### Contradictory Claims ({CONTRADICTORY_COUNT} total)

{FOR EACH CONTRADICTORY_CONFLICT}
#### Conflict {INDEX}: Mutually Exclusive Claims

**Severity**: {CRITICAL/HIGH/MEDIUM/LOW}
**Status**: {RESOLVED/UNRESOLVED/MANUAL_REVIEW}

**Claim A**:
- Statement: "{CLAIM_A}"
- Proponents: {ORGANIZATIONS_OR_PEOPLE_A}
- Sources: {SOURCE_COUNT_A} sources
- Primary Source: [{SOURCE_NAME}]({SOURCE_URL_A})
- Quality Rating: {RATING_A}

**Claim B**:
- Statement: "{CLAIM_B}"
- Proponents: {ORGANIZATIONS_OR_PEOPLE_B}
- Sources: {SOURCE_COUNT_B} sources
- Primary Source: [{SOURCE_NAME}]({SOURCE_URL_B})
- Quality Rating: {RATING_B}

**Conflict Analysis**:
- Nature: {MUTUALLY_EXCLUSIVE/PARTIALLY_OVERLAPPING/DIFFERENT_DEFINITIONS}
- Scope: {BROAD_SPECIFIC/CONDITIONAL}
- Evidence Balance: {EVIDENCE_A_VS_B}
- Expert Consensus: {CONSENSUS_IF_ANY}

**Resolution**:
- Method: {WEIGHTED_EVIDENCE/EXPERT_CONSENSUS/MANUAL_REVIEW}
- Accepted: {CLAIM_A_OR_B_OR_NEUTRAL}
- Accepted Statement: "{ACCEPTED_STATEMENT}"
- Reasoning: {RESOLUTION_REASONING}
- Confidence in Resolution: {CONFIDENCE_LEVEL}
- Caveats: {CAVEATS_IF_ANY}

**If Unresolved**:
- Status: OPEN QUESTION
- Action Required: Further research needed
- Recommended Sources: {RECOMMENDED_SOURCES}
- Notes: {NOTES}

---

{END FOR EACH}

---

## Unresolved Conflicts Requiring Manual Review

{FOR EACH UNRESOLVED_CONFLICT}
### {CONFLICT_SUMMARY}

- **Type**: {CONFLICT_TYPE}
- **Severity**: {SEVERITY}
- **Impact**: {IMPACT_ON_RESEARCH}
- **Sources Involved**: {SOURCE_LIST}
- **Recommended Action**: {RECOMMENDED_ACTION}
- **Priority**: {HIGH/MEDIUM/LOW}

{END FOR EACH}

---

## Conflict Resolution Statistics

### By Resolution Method

| Method | Count | Percentage |
|--------|-------|------------|
| Highest Quality Source | {HIGHEST_QUALITY_COUNT} | {PERCENTAGE}% |
| Most Recent | {MOST_RECENT_COUNT} | {PERCENTAGE}% |
| Consensus | {CONSENSUS_COUNT} | {PERCENTAGE}% |
| Manual Review | {MANUAL_COUNT} | {PERCENTAGE}% |
| Unresolved | {UNRESOLVED_COUNT} | {PERCENTAGE}% |

### By Quality Rating

| Quality Rating | Conflict Count | Resolution Rate |
|----------------|----------------|-----------------|
| A vs A | {A_VS_A} | {RESOLUTION_RATE}% |
| A vs B | {A_VS_B} | {RESOLUTION_RATE}% |
| B vs B | {B_VS_B} | {RESOLUTION_RATE}% |
| B vs C | {B_VS_C} | {RESOLUTION_RATE}% |
| C vs C | {C_VS_C} | {RESOLUTION_RATE}% |

### By Severity

| Severity | Count | Resolved | Resolution Rate |
|----------|-------|----------|-----------------|
| Critical | {CRITICAL_COUNT} | {CRITICAL_RESOLVED} | {RATE}% |
| High | {HIGH_COUNT} | {HIGH_RESOLVED} | {RATE}% |
| Medium | {MEDIUM_COUNT} | {MEDIUM_RESOLVED} | {RATE}% |
| Low | {LOW_COUNT} | {LOW_RESOLVED} | {RATE}% |

---

## Recommendations

### High Priority Actions

1. **{ACTION_1}**
   - Conflict ID: {CONFLICT_ID}
   - Reason: {REASON}
   - Suggested Approach: {APPROACH}

2. **{ACTION_2}**
   - Conflict ID: {CONFLICT_ID}
   - Reason: {REASON}
   - Suggested Approach: {APPROACH}

### Process Improvements

- **Source Diversification**: {IMPROVEMENT_SUGGESTION}
- **Fact Verification**: {IMPROVEMENT_SUGGESTION}
- **Conflict Detection**: {IMPROVEMENT_SUGGESTION}

---

## Detection Log

{TIMESTAMP} - Started conflict detection on {TOTAL_FACTS} facts
{TIMESTAMP} - Applied mcp__conflict-dectect with tolerance {TOLERANCE_SETTINGS}
{TIMESTAMP} - Found {CONFLICT_COUNT} potential conflicts
{TIMESTAMP} - Categorized conflicts by type
{TIMESTAMP} - Resolved {RESOLVED_COUNT} conflicts automatically
{TIMESTAMP} - Flagged {MANUAL_REVIEW_COUNT} conflicts for manual review
{TIMESTAMP} - Completed conflict detection and resolution

---

**File Purpose**: This file documents all conflicts detected between facts and their resolutions.
**Related Files**: fact_ledger.md (contains the resolved facts)
**Location**: RESEARCH/[topic]/processed/conflict_report.md
**MCP Tool**: mcp__deep-research__conflict-dectect
**Tolerance Settings**: Numerical={NUMERICAL_TOLERANCE}, Temporal={TEMPORAL_TOLERANCE}
