---
name: phase-6-validation
description: Validate research quality through citation verification and adversarial review
tools: Task, Read, Write, batch-validate, conflict-detect, cache-stats, extract
---

# Phase 6: Quality Assurance Agent

## Overview

The **phase-6-validation** agent validates research quality by verifying citations, detecting remaining conflicts, and deploying adversarial red-team review.

## When Invoked

Called by Coordinator with:
- `session_id`: Research session identifier
- `output_dir`: Base output directory
- `input_file`: `drafts/synthesis.md`

## Core Responsibilities

### 1. Citation Validation

Verify all citations using MCP tools:

```typescript
const citations = extractCitations(synthesis);

const validationResult = await batch_validate({
  items: citations.map(c => ({
    citations: [c],
    verify_urls: true,
    check_accuracy: true
  })),
  mode: 'citation',
  options: { useCache: true, maxConcurrency: 5 }
});
```

### 2. Final Conflict Detection

Check synthesized report for internal contradictions:

```typescript
const reportFacts = await extract({
  text: synthesis,
  mode: 'fact',
  source_url: 'synthesized_report'
});

const conflicts = await conflict_detect({
  facts: reportFacts.facts,
  tolerance: { numerical: 0.01, temporal: 'same_year' }
});
```

### 3. Red Team Review

Deploy adversarial validation:

```typescript
const redTeamResult = await Task({
  subagent_type: "red-team-critic",
  prompt: `Adversarial review of research synthesis.

Input File: ${output_dir}/drafts/synthesis.md

Tasks:
1. Challenge key claims - find counter-evidence
2. Identify logical fallacies or weak arguments
3. Check for bias in source selection
4. Verify statistical claims
5. Identify gaps or missing perspectives

Output: Validation report with confidence score (0-1)`,
  description: "Red team review"
});
```

## Workflow

```typescript
async function executePhase6(session_id: string, output_dir: string, input_file: string) {
  // 1. Read synthesis
  const synthesis = await Read({ file_path: input_file });

  // 2. Extract and validate citations
  const citations = extractCitations(synthesis);

  const citationValidation = await batch_validate({
    items: citations.map(c => ({ citations: [c], verify_urls: true })),
    mode: 'citation',
    options: { useCache: true }
  });

  // 3. Check for incomplete citations
  const incompleteCitations = citationValidation.results.filter(r => !r.complete);
  if (incompleteCitations.length > 0) {
    await fixIncompleteCitations(synthesis, incompleteCitations);
  }

  // 4. Final conflict detection
  const reportFacts = await extract({
    text: synthesis,
    mode: 'fact'
  });
  const conflicts = await conflict_detect({
    facts: reportFacts.facts,
    tolerance: { numerical: 0.01 }
  });

  // 5. Deploy red-team-critic
  const redTeamResult = await Task({
    subagent_type: "red-team-critic",
    prompt: buildRedTeamPrompt(input_file),
    description: "Adversarial validation"
  });

  // 6. Calculate overall confidence
  const confidence = calculateConfidence(citationValidation, conflicts, redTeamResult);

  // 7. Quality gate check
  if (confidence < 0.7) {
    // Write issues for Phase 5 to address
    await Write({
      file_path: `${output_dir}/drafts/validation_issues.md`,
      content: formatValidationIssues(citationValidation, conflicts, redTeamResult)
    });

    return {
      status: 'needs_revision',
      confidence,
      issues_file: `${output_dir}/drafts/validation_issues.md`
    };
  }

  // 8. Write validated report
  const validatedReport = applyValidationFixes(synthesis, citationValidation);
  await Write({
    file_path: `${output_dir}/drafts/validated_report.md`,
    content: validatedReport
  });

  // 9. Get cache stats for performance report
  const cacheStats = await cache_stats({});

  return {
    status: 'completed',
    output_files: [`${output_dir}/drafts/validated_report.md`],
    metrics: {
      confidence,
      citations_validated: citations.length,
      citations_complete: citations.length - incompleteCitations.length,
      conflicts_found: conflicts.conflicts?.length || 0,
      cache_hit_rate: cacheStats.hitRate
    }
  };
}
```

## Output Format

File: `drafts/validated_report.md`

```markdown
# Validated Research Report: [Topic]

**Validation Date**: [timestamp]
**Overall Confidence**: [0.XX]
**Citation Completeness**: [XX]%

## Validation Summary

### Citation Verification
- Total citations: [count]
- Verified accessible: [count]
- Complete information: [count]

### Conflict Analysis
- Conflicts detected: [count]
- Conflicts resolved: [count]

### Red Team Findings
- Claims challenged: [count]
- Issues identified: [count]
- Recommendations: [count]

---

[Full report content with validation annotations]

## Validation Annotations

### Claim Confidence Levels
- ✅ High confidence (multiple A/B sources)
- ⚠️ Medium confidence (single source or C-rated)
- ❓ Low confidence (needs verification)

[Report sections with inline confidence markers]
```

## Quality Gate

Phase 6 passes when:
- [ ] Overall confidence > 0.7
- [ ] 100% citations have complete information
- [ ] No unresolved high-severity conflicts
- [ ] Red team identified no critical issues
- [ ] `validated_report.md` created

## Best Practices

1. **Verify All URLs**: Dead links reduce credibility
2. **Complete Citations**: Author, date, title, URL all required
3. **Resolve Conflicts**: Don't leave contradictions unexplained
4. **Accept Red Team Feedback**: Improve, don't dismiss
5. **Track Cache Performance**: Monitor MCP efficiency

---

**Agent Type**: Validation, Quality Assurance
**Complexity**: High
**Lines**: ~150
**Typical Runtime**: 5-10 minutes
