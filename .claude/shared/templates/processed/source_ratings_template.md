# Source Quality Ratings - Phase 4 MCP Processing

**Generated**: {TIMESTAMP}
**Rating Tool**: mcp__deep-research__batch-source-rate
**Total Sources Rated**: {TOTAL_SOURCES}
**Average Rating**: {AVERAGE_RATING}
**Rating Method**: {AUTOMATIC/MANUAL/HYBRID}

---

## Executive Summary

### Rating Distribution

| Rating | Count | Percentage | Description |
|--------|-------|------------|-------------|
| A (Excellent) | {A_COUNT} | {A_PERCENTAGE}% | Peer-reviewed, primary sources |
| B (Good) | {B_COUNT} | {B_PERCENTAGE}% | Industry reports, reputable analysts |
| C (Fair) | {C_COUNT} | {C_PERCENTAGE}% | Expert opinion, secondary sources |
| D (Poor) | {D_COUNT} {D_PERCENTAGE}% | Preprints, blogs |
| E (Unreliable) | {E_COUNT} | {E_PERCENTAGE}% | Anecdotal, speculative |

### Source Type Distribution

| Source Type | Count | Avg Rating |
|-------------|-------|------------|
| Academic | {ACADEMIC_COUNT} | {ACADEMIC_AVG} |
| Industry | {INDUSTRY_COUNT} | {INDUSTRY_AVG} |
| News | {NEWS_COUNT} | {NEWS_AVG} |
| Blog | {BLOG_COUNT} | {BLOG_AVG} |
| Official | {OFFICIAL_COUNT} | {OFFICIAL_AVG} |

---

## Detailed Source Ratings

### A-Rated Sources ({A_COUNT} total)

{FOR EACH A_RATED_SOURCE}
#### [{SOURCE_NAME}]({SOURCE_URL})

**Rating**: A (Excellent)
**Source Type**: {ACADEMIC/INDUSTRY/OFFICIAL}
**Facts Sourced**: {FACT_COUNT}
**First Cited**: {TIMESTAMP}

**Rating Criteria Met**:
- Peer-reviewed publication
- Primary source or official documentation
- High credibility in the field
- Recent publication (within {TIMEFRAME} if applicable)
- Citations from other reputable sources

**Context**:
{SOURCE_DESCRIPTION}

**Key Topics**:
- {TOPIC_1}
- {TOPIC_2}

**Related Facts**:
- {FACT_ID_1}: {FACT_SUMMARY_1}
- {FACT_ID_2}: {FACT_SUMMARY_2}

---

{END FOR EACH}

### B-Rated Sources ({B_COUNT} total)

{FOR EACH B_RATED_SOURCE}
#### [{SOURCE_NAME}]({SOURCE_URL})

**Rating**: B (Good)
**Source Type**: {INDUSTRY/NEWS/OFFICIAL}
**Facts Sourced**: {FACT_COUNT}
**First Cited**: {TIMESTAMP}

**Rating Criteria Met**:
- Reputable industry analyst or organization
- Primary source data or interviews
- Good credibility but not peer-reviewed
- Professional publication standards
- Minimal bias detected

**Limitations**:
{LIMITATIONS}

**Context**:
{SOURCE_DESCRIPTION}

**Key Topics**:
- {TOPIC_1}
- {TOPIC_2}

---

{END FOR EACH}

### C-Rated Sources ({C_COUNT} total)

{FOR EACH C_RATED_SOURCE}
#### [{SOURCE_NAME}]({SOURCE_URL})

**Rating**: C (Fair)
**Source Type**: {NEWS/BLOG/OTHER}
**Facts Sourced**: {FACT_COUNT}
**First Cited**: {TIMESTAMP}

**Rating Criteria**:
- Expert opinion or analysis
- Secondary source reporting
- Moderate credibility
- Some bias or limitations detected
- Use with verification

**Cautions**:
{CAUTIONS}

**Recommended For**:
- Context and background
- Expert perspectives
- Corroboration with other sources

**Not Recommended For**:
- Primary factual claims without verification
- Definitive conclusions

---

{END FOR EACH}

### D-Rated Sources ({D_COUNT} total)

{FOR EACH D_RATED_SOURCE}
#### [{SOURCE_NAME}]({SOURCE_URL})

**Rating**: D (Poor)
**Source Type**: {BLOG/PREPRINT/OTHER}
**Facts Sourced**: {FACT_COUNT}
**First Cited**: {TIMESTAMP}

**Rating Criteria**:
- Preliminary or unpublished research
- Blog or opinion piece
- Low credibility publication
- Significant bias detected
- Use only for context

**Warnings**:
- Not verified by peer review
- May contain inaccuracies
- Bias detected: {BIAS_TYPE}
- Verify all claims before using

**Recommended For**:
- Exploring diverse perspectives
- Understanding public discourse
- Identifying trends or opinions

**Not Recommended For**:
- Factual claims without verification
- Definitive statements
- Citations in formal reports

---

{END FOR EACH}

### E-Rated Sources ({E_COUNT} total)

{FOR EACH E_RATED_SOURCE}
#### [{SOURCE_NAME}]({SOURCE_URL})

**Rating**: E (Unreliable)
**Source Type**: {BLOG/SOCIAL/OTHER}
**Facts Sourced**: {FACT_COUNT}
**First Cited**: {TIMESTAMP}

**Rating Criteria**:
- Anecdotal evidence
- Theoretical or speculative content
- Unknown or unreliable author
- Significant factual issues detected
- High bias or agenda

**Strong Warnings**:
- Not suitable for research
- Contains verified inaccuracies
- High bias detected: {BIAS_TYPE}
- Do not cite in formal reports

**Status**:
{STATUS_ACTION}

---

{END FOR EACH}

---

## Rating Methodology

### Automatic Rating Criteria

**A Rating**:
- Peer-reviewed journal (arXiv, Nature, Science, etc.)
- Official government or regulatory documentation
- Primary source data from reputable organizations
- Academic conference proceedings (ICAIF, NeurIPS, etc.)

**B Rating**:
- Industry reports from established firms (IDC, Gartner, etc.)
- Reputable news outlets with editorial standards
- Company official documentation
- Professional association publications

**C Rating**:
- Expert opinion pieces
- Secondary source reporting
- Analysis from less established sources
- News aggregator sites

**D Rating**:
- Preprints or preliminary research
- Blog posts without peer review
- Opinion pieces with clear bias
- Social media content

**E Rating**:
- Anecdotal content
- Theoretical speculation without evidence
- Unknown or discredited sources
- Content with verified falsehoods

### Quality Signals Evaluated

- Domain authority and reputation
- Author credentials
- Publication date (recency)
- Citation count and quality
- Editorial standards
- Bias detection
- Factuality track record
- Transparency methodology

---

## Source Reliability Index

| Source | Rating | Reliability Score | Bias Score | Recency |
|--------|--------|-------------------|------------|---------|
{FOR EACH SOURCE}
| [{NAME}]({URL}) | {A/B/C/D/E} | {SCORE}/100 | {BIAS_SCORE} | {DAYS_AGO} |
{END FOR EACH}

---

## Recommendations for Research Synthesis

### Preferred Sources (A-rated)

Use these sources for:
- Primary factual claims
- Definitive statements
- Key statistics and metrics
- Technical specifications

### Supplementary Sources (B-rated)

Use these sources for:
- Industry context
- Market trends
- Professional perspectives
- Corroboration of A-rated claims

### Contextual Sources (C-rated)

Use these sources for:
- Background information
- Expert opinions
- Identifying areas of debate
- Understanding different viewpoints

### Use with Caution (D-rated)

Use these sources for:
- Exploring alternative perspectives
- Understanding public discourse
- Identifying emerging trends
- Always verify with higher-rated sources

### Avoid (E-rated)

Do not use these sources for:
- Factual claims
- Citations in formal reports
- Definitive conclusions

---

## Rating Statistics

### By Source Type

| Source Type | Total | A | B | C | D | E | Avg Rating |
|-------------|-------|---|---|---|---|---|------------|
| Academic | {ACADEMIC_TOTAL} | {ACADEMIC_A} | {ACADEMIC_B} | {ACADEMIC_C} | {ACADEMIC_D} | {ACADEMIC_E} | {ACADEMIC_AVG} |
| Industry | {INDUSTRY_TOTAL} | {INDUSTRY_A} | {INDUSTRY_B} | {INDUSTRY_C} | {INDUSTRY_D} | {INDUSTRY_E} | {INDUSTRY_AVG} |
| News | {NEWS_TOTAL} | {NEWS_A} | {NEWS_B} | {NEWS_C} | {NEWS_D} | {NEWS_E} | {NEWS_AVG} |
| Blog | {BLOG_TOTAL} | {BLOG_A} | {BLOG_B} | {BLOG_C} | {BLOG_D} | {BLOG_E} | {BLOG_AVG} |
| Official | {OFFICIAL_TOTAL} | {OFFICIAL_A} | {OFFICIAL_B} | {OFFICIAL_C} | {OFFICIAL_D} | {OFFICIAL_E} | {OFFICIAL_AVG} |

### By Recency

| Time Period | Count | Avg Rating |
|-------------|-------|------------|
| Last 30 days | {RECENT_COUNT} | {RECENT_AVG} |
| Last 90 days | {LAST_90_COUNT} | {LAST_90_AVG} |
| Last 180 days | {LAST_180_COUNT} | {LAST_180_AVG} |
| Older than 180 days | {OLDER_COUNT} | {OLDER_AVG} |

### By Citation Frequency

| Citation Count | Count | Avg Rating |
|----------------|-------|------------|
| 10+ citations | {HIGH_COUNT} | {HIGH_AVG} |
| 5-9 citations | {MED_COUNT} | {MED_AVG} |
| 1-4 citations | {LOW_COUNT} | {LOW_AVG} |
| 0 citations | {NONE_COUNT} | {NONE_AVG} |

---

## Rating Log

{TIMESTAMP} - Started source rating process
{TIMESTAMP} - Extracted {TOTAL_SOURCES} unique sources from {TOTAL_FACTS} facts
{TIMESTAMP} - Applied mcp__batch-source-rate with cache enabled
{TIMESTAMP} - Analyzed domain authority for all sources
{TEMESTAMP} - Evaluated author credentials and editorial standards
{TIMESTAMP} - Detected bias and factual accuracy issues
{TIMESTAMP} - Assigned quality ratings based on criteria
{TIMESTAMP} - Generated source ratings report
{TIMESTAMP} - Completed rating process

---

**File Purpose**: This file contains quality ratings for all sources cited in the research.
**Related Files**: fact_ledger.md (contains facts with source references), bibliography.md (full citations)
**Location**: RESEARCH/[topic]/processed/source_ratings.md
**MCP Tool**: mcp__deep-research__batch-source-rate
**Cache Enabled**: Yes/No
