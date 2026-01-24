# Agent Base Template

> **Template Type**: Reference Documentation
>
> **Purpose**: This document defines common patterns and best practices shared across all research agents.
>
> **Usage**: These templates are **reference guides** for creating and maintaining agents. They serve as structural guidelines but are NOT programmatically enforced. Agents should follow these patterns for consistency, but deviations are allowed when necessary.
>
> **Version**: v4.0
>
> **Path**: `shared/templates/agent_base_template.md`
>
> ---

> This template defines common patterns shared across all research agents.

## Standard YAML Frontmatter

```yaml
---
name: agent-name
description: One-line description
tools: [Tool1, Tool2, ...]
---
```

## Communication Protocol (Shared)

All agents follow this standard communication protocol:

### Request Context

```json
{
  "requesting_agent": "[agent-name]",
  "request_type": "get_research_context",
  "payload": {
    "query": "[context requirements]"
  }
}
```

### Progress Reporting

```json
{
  "agent": "[agent-name]",
  "status": "[phase]",
  "progress": {
    "phase": "[current_phase]",
    "percentage": 0-100,
    "details": {}
  }
}
```

### Error Reporting

```json
{
  "agent": "[agent-name]",
  "error": {
    "code": "E[XXX]",
    "message": "[description]",
    "recovery": "[action taken]"
  }
}
```

## Standard Excellence Checklist Items

All agents should verify:

- [ ] Quality gates enforced
- [ ] Errors handled with recovery
- [ ] Progress logged to progress.md
- [ ] State persisted for recovery
- [ ] MCP tools used appropriately

## Best Practices (Shared)

1. **Log progress**: Update progress.md at each phase
2. **Handle errors gracefully**: Use error codes from `error_codes.md`
3. **Validate inputs**: Check required parameters
4. **Respect token budgets**: See `token_optimization.md`
5. **Persist state**: Enable crash recovery
6. **Use batch tools**: Prefer batch-* MCP tools for efficiency

## MCP Tool Usage Guidelines

| Operation | Tool | When to Use |
|-----------|------|-------------|
| Extract facts | fact-extract | Single document |
| Extract facts (bulk) | batch-fact-extract | Multiple documents |
| Extract entities | entity-extract | Single text |
| Validate citations | citation-validate | Single citation |
| Validate citations (bulk) | batch-citation-validate | Multiple citations |
| Rate source | source-rate | Single source |
| Rate sources (bulk) | batch-source-rate | Multiple sources |
| Detect conflicts | conflict-detect | Fact comparison |
| Cache stats | cache-stats | Performance monitoring |

## Reference Documents

- Error Codes: `shared/constants/error_codes.md`
- Source Ratings: `shared/constants/source_quality_ratings.md`
- Token Optimization: `shared/constants/token_optimization.md`
- Progress Template: `shared/templates/progress_log_template.md`
- Question Templates: `shared/templates/question_templates/` (literature_review, competitive_analysis, market_research, technical_comparison)
