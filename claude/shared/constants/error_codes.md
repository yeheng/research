# Error Codes and Handling

Unified error codes across all research skills.

## Error Categories

### E0xx - Input/Validation Errors

**E001: Insufficient Context in Prompt**

- Cause: Research prompt missing critical elements (TASK, CONTEXT, or QUESTIONS)
- Resolution: Invoke `question-refiner` skill to complete prompt
- Retry: Yes, after refinement

**E002: Invalid Research Scope**

- Cause: Topic too broad or too narrow for available resources
- Resolution: Ask user to narrow/broaden scope
- Retry: Yes, after scope adjustment

**E003: Missing Required Parameters**

- Cause: Command invoked without required arguments
- Resolution: Display usage help and request parameters
- Retry: Yes, after parameters provided

### E1xx - Data Retrieval Errors

**E101: Web Fetch Timeout**

- Cause: URL took >30 seconds to respond
- Resolution: Retry once, then skip source and note in report
- Retry: Yes (1 attempt), then skip

**E102: URL Not Accessible (404/403)**

- Cause: Broken link or access denied
- Resolution: Search for archived version, mark as inaccessible
- Retry: No

**E103: Rate Limit Exceeded**

- Cause: Too many requests to same domain
- Resolution: Wait 60 seconds, then retry
- Retry: Yes (after delay)

**E104: Content Extraction Failed**

- Cause: Unable to parse HTML/PDF content
- Resolution: Try alternative extraction method, or skip source
- Retry: Yes (1 attempt with different method)

### E2xx - Processing Errors

**E201: Token Limit Exceeded**

- Cause: Document too large for context window
- Resolution: Use preprocess pipeline, read in chunks
- Retry: Yes (with preprocessing)

**E202: Quality Score Below Threshold**

- Cause: Research output scored <8.0
- Resolution: Refine findings or gather additional sources
- Retry: Yes (up to 2 refinement attempts)

**E203: Citation Validation Failed**

- Cause: Claims lack proper citations or citations don't support claims
- Resolution: Add missing citations or revise claims
- Retry: Yes (mandatory fix)

**E204: Synthesis Conflict Unresolved**

- Cause: Contradictory findings with no clear resolution
- Resolution: Present both perspectives with quality ratings
- Retry: No (document conflict in report)

### E3xx - Agent/System Errors

**E301: Agent Spawn Failed**

- Cause: Unable to create parallel research agent
- Resolution: Reduce agent count and retry
- Retry: Yes (with fewer agents)

**E302: Agent Timeout**

- Cause: Agent exceeded max execution time (30 min)
- Resolution: Checkpoint progress, continue with available findings
- Retry: No (use partial results)

**E303: Max Iterations Exceeded**

- Cause: GoT controller hit iteration limit (10)
- Resolution: Force aggregation and terminate gracefully
- Retry: No (finalize with current state)

**E304: File System Error**

- Cause: Unable to write to RESEARCH/ directory
- Resolution: Check permissions, create directory if missing
- Retry: Yes (after fixing permissions)

### E4xx - Validation Errors

**E401: Hallucination Detected**

- Cause: Claim made without supporting source
- Resolution: Remove claim or find supporting citation
- Retry: Yes (mandatory fix)

**E402: Source Quality Too Low**

- Cause: All sources rated D or E
- Resolution: Search for higher-quality sources (A/B/C)
- Retry: Yes (find better sources)

**E403: Duplicate Content Detected**

- Cause: Same information from multiple agents
- Resolution: Deduplicate and merge citations
- Retry: No (automatic deduplication)

## Error Handling Strategy

### Retry Logic

```python
max_retries = {
    "E001-E003": 1,  # Input errors - fix once
    "E101": 1,       # Timeout - retry once
    "E103": 2,       # Rate limit - retry with backoff
    "E201": 1,       # Token limit - preprocess once
    "E202": 2,       # Quality - refine twice
    "E203": 3,       # Citations - must fix
    "E301": 1,       # Agent spawn - reduce count
}
```

### Backoff Strategy

```
Attempt 1: Immediate
Attempt 2: Wait 10 seconds
Attempt 3: Wait 30 seconds
Attempt 4+: Wait 60 seconds
```

### Graceful Degradation

When errors cannot be resolved:

1. Log error with code and context
2. Continue with partial results
3. Note limitations in report appendix
4. Provide user with error summary

## Error Logging Format

```markdown
## Error Log

**[2024-01-08 23:52:30] E101: Web Fetch Timeout**
- URL: https://example.com/article
- Agent: research-agent-2
- Retry: 1/1 (failed)
- Resolution: Skipped source, noted in limitations

**[2024-01-08 23:55:12] E203: Citation Validation Failed**
- Claim: "Market grew 25% in 2023"
- Missing: Source URL
- Retry: 1/3 (fixed)
- Resolution: Added citation (Smith, 2023)
```

## User-Facing Error Messages

Keep error messages actionable and non-technical:

❌ Bad: "E201: Token limit exceeded in context window"
✅ Good: "This document is too large. I'll process it in smaller sections."

❌ Bad: "E301: Agent spawn failed due to resource constraints"
✅ Good: "I'll use fewer parallel agents to complete this research."

❌ Bad: "E401: Hallucination detected in synthesis output"
✅ Good: "I found a claim without a source. Let me verify and add the citation."
