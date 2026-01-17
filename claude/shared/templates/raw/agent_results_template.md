# Raw Search Results - Agent {AGENT_ID}

**Agent ID**: agent_{AGENT_ID}
**Focus Area**: {FOCUS_AREA}
**Timestamp**: {TIMESTAMP}
**Status**: {STATUS}

## Queries Executed

{FOR EACH QUERY}

1. `{QUERY_STRING}`
   - Results: {COUNT}
   - Status: {SUCCESS/FAILED/RATE_LIMITED}

## Search Results

{FOR EACH RESULT}

### Result {INDEX}

**Query**: `{QUERY_STRING}`

**URL**: {SOURCE_URL}
**Title**: {PAGE_TITLE}

**Search Metadata**:

- Source: {SOURCE_NAME}
- Published: {PUBLICATION_DATE}
- Author: {AUTHOR_NAME}

**Content**:
{FULL_CONTENT_FROM_WEBREADER_OR_WEBFETCH}

**Extracted URLs**:

- {RELATED_URL_1}
- {RELATED_URL_2}

---

{END FOR EACH RESULT}

## Summary Statistics

- **Total Queries**: {TOTAL_QUERIES}
- **Successful Queries**: {SUCCESS_COUNT}
- **Failed Queries**: {FAILURE_COUNT}
- **Rate Limited**: {RATE_LIMIT_COUNT}
- **Total Results**: {TOTAL_RESULTS}
- **Total Content Length**: {TOTAL_CHARACTERS} characters
- **Estimated Tokens**: {ESTIMATED_TOKENS}

## Agent Metadata

- **Agent Type**: {WEB_SEARCH/ACADEMIC/TECHNICAL/CROSS_REFERENCE}
- **Search Tools Used**: {WebSearch, WebReader, WebFetch}
- **Token Usage (Agent)**: {TOKENS_USED}
- **Execution Time**: {EXECUTION_SECONDS} seconds

## Notes

{ANY_AGENT_NOTES_OR_ISSUES}

---

**File Purpose**: This file contains raw search results from Phase 3.
**Next Phase**: Phase 4 will load this file and apply MCP tools for fact extraction, entity extraction, and source rating.
**Location**: RESEARCH/[topic]/raw/agent_{AGENT_ID}.md
