# Conflict Report - Phase 4 MCP Processing

**Generated**: {{.Timestamp}}
**Detection Tool**: mcp__deep-research__conflict-detect
**Total Facts Analyzed**: {{.TotalFacts}}
**Conflicts Detected**: {{.ConflictCount}}
**Resolved**: {{.ResolvedCount}}
**Unresolved**: {{.UnresolvedCount}}

---

## Executive Summary

- **Conflict Rate**: {{if gt .TotalFacts 0}}{{printf "%.1f" (divf (mulf (itof .ConflictCount) 100.0) (itof .TotalFacts))}}%{{else}}0%{{end}} of analyzed facts
- **Resolution Rate**: {{if gt .ConflictCount 0}}{{printf "%.1f" (divf (mulf (itof .ResolvedCount) 100.0) (itof .ConflictCount))}}%{{else}}0%{{end}}
- **Manual Review Required**: {{.UnresolvedCount}} conflicts

---

## Detailed Conflicts

{{range .Conflicts}}
### Conflict {{.Index}}: {{.Type}}

**Severity**: {{.Severity}}
**Status**: {{.Status}}

**Fact A**:
- Statement: {{.Fact1.Entity}} {{.Fact1.Attribute}} is {{.Fact1.Value}}
- Source: {{.Fact1.Source.URL}}
- Confidence: {{.Fact1.Confidence}}

**Fact B**:
- Statement: {{.Fact2.Entity}} {{.Fact2.Attribute}} is {{.Fact2.Value}}
- Source: {{.Fact2.Source.URL}}
- Confidence: {{.Fact2.Confidence}}

**Description**: {{.Description}}

{{if .Resolution}}
**Resolution**: {{.Resolution}}
{{else}}
**Action Required**: Manual verification needed
{{end}}

---
{{end}}

{{if eq .ConflictCount 0}}
## No Conflicts Detected

All facts extracted are consistent with each other. No contradictions or conflicts were found.
{{end}}

---

**File Purpose**: This file documents all conflicts detected between facts and their resolutions.
**Related Files**: fact_ledger.md (contains the resolved facts)
**Location**: RESEARCH/[topic]/processed/conflict_report.md
**MCP Tool**: mcp__deep-research__conflict-detect
