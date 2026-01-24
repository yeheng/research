# Progress Log Template

This template is used to track the execution progress of research workflows.

## Usage

When executing research (via `/deep-research` or `research-executor` skill), create a new progress file:

```bash
RESEARCH/[topic]/progress.md
```

## Template Structure

```markdown
# Research Progress Log

## Session Information
- **Session ID**: [auto-generated]
- **Topic**: [research_topic]
- **Started**: [YYYY-MM-DD HH:MM:SS]
- **Status**: initializing | planning | executing | synthesizing | validating | completed | failed

---

## Phase Execution

### [timestamp] Phase 0: Question Refinement
- **Skill**: question-refiner
- **Status**: ✅ Completed | 🔄 Running | ❌ Failed
- **Input**: [raw question summary]
- **Output**: Structured prompt generated
- **Quality Score**: X.X/10

### [timestamp] Phase 0.5: Research Planning (Optional)
- **Skill**: research-planner
- **Status**: ✅ Completed
- **Subtopics**: N
- **Agents Planned**: N
- **Estimated Time**: XX minutes

### [timestamp] Phase 1-7: Research Execution
- **Agent**: general-purpose (with embedded coordinator workflow)
- **Status**: 🔄 Running

#### Agent Deployments
| Agent ID | Type | Focus | Status | Findings |
|----------|------|-------|--------|----------|
| web-agent-1 | haiku | Market trends | ✅ Done | 12 facts |
| web-agent-2 | haiku | Technical specs | 🔄 Running | - |
| academic-agent | sonnet | Research papers | ❌ Failed | Retry |

#### MCP Tool Calls
| Timestamp | Tool | Input Size | Output | Cached |
|-----------|------|------------|--------|--------|
| HH:MM:SS | fact-extract | 3.5k tokens | 24 facts | No |
| HH:MM:SS | batch-source-rate | 8 sources | A:2 B:4 C:2 | Yes |
| HH:MM:SS | conflict-detect | 24 facts | 2 conflicts | No |

---

## Resource Usage

| Resource | Used | Budget | Percentage |
|----------|------|--------|------------|
| Tokens | 45,000 | 100,000 | 45% |
| Time | 25 min | 60 min | 42% |
| Agents | 5 | 8 | 63% |

---

## Quality Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Citations | 32 | 30 (min) | ✅ Met |
| Citation Completeness | 100% | 100% | ✅ Met |
| Source Quality Avg | B | B+ | ⚠️ Close |
| Hallucinations | 0 | 0 | ✅ Met |
| Overall Score | 8.2/10 | 8.0/10 | ✅ Met |

---

## Errors and Recovery

### Error Log
| Timestamp | Code | Message | Recovery |
|-----------|------|---------|----------|
| HH:MM:SS | E101 | Timeout on academic-agent | Retried with extended timeout |
| HH:MM:SS | E203 | Citation missing for claim X | Added citation from source Y |

### Warnings
- ⚠️ [timestamp] Low source quality for subtopic 3, searching for alternatives
- ⚠️ [timestamp] Token usage at 80%, enabling aggressive pruning

---

## Final Summary

**Completion Time**: [YYYY-MM-DD HH:MM:SS]
**Total Duration**: XX minutes
**Output Location**: RESEARCH/[topic]/

### Generated Files
- [ ] README.md
- [ ] executive_summary.md
- [ ] full_report.md
- [ ] data/statistics.md
- [ ] sources/bibliography.md
- [ ] sources/source_quality_table.md
- [ ] appendices/methodology.md
- [ ] appendices/limitations.md
```

## Integration Points

### 1. Skill Invocation Logging

```go
func LogSkillCall(progressFile, skillName, status, inputSummary, outputSummary string) {
    timestamp := time.Now().Format("15:04:05")
    entry := fmt.Sprintf(`
### [%s] Skill: %s
- **Status**: %s
- **Input**: %s
- **Output**: %s
`, timestamp, skillName, status, inputSummary, outputSummary)
    appendToFile(progressFile, entry)
}
```

### 2. Agent Deployment Logging

```go
func LogAgentDeployment(progressFile, agentID, agentType, focus, status string) {
    timestamp := time.Now().Format("15:04:05")
    entry := fmt.Sprintf("| %s | %s | %s | %s | - |\n", agentID, agentType, focus, status)
    appendToTable(progressFile, "Agent Deployments", entry)
}
```

### 3. MCP Tool Call Logging

```go
func LogMCPCall(progressFile, toolName, inputSize, outputSummary string, cached bool) {
    timestamp := time.Now().Format("15:04:05")
    cachedStr := "No"
    if cached {
        cachedStr = "Yes"
    }
    entry := fmt.Sprintf("| %s | %s | %s | %s | %s |\n", timestamp, toolName, inputSize, outputSummary, cachedStr)
    appendToTable(progressFile, "MCP Tool Calls", entry)
}
```

### 4. Error Logging

```go
func LogError(progressFile, errorCode, message, recoveryAction string) {
    timestamp := time.Now().Format("15:04:05")
    entry := fmt.Sprintf("| %s | %s | %s | %s |\n", timestamp, errorCode, message, recoveryAction)
    appendToTable(progressFile, "Error Log", entry)
}
```

## Status Icons

| Icon | Meaning |
|------|---------|
| ✅ | Completed successfully |
| 🔄 | In progress / Running |
| ❌ | Failed |
| ⚠️ | Warning / Attention needed |
| 🔁 | Retrying |

## Best Practices

1. **Update frequently**: Log after each significant operation
2. **Be concise**: Use summary info, not full details
3. **Track metrics**: Update resource usage regularly
4. **Log errors immediately**: Don't batch error logging
5. **Include recovery**: Always note what was done to recover from errors
