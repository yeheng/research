# Fact Ledger - Phase 4 MCP Processing

**Generated**: {{.Timestamp}}
**Processing Duration**: {{printf "%.2f" .ProcessingSeconds}} seconds
**MCP Tools Used**: fact-extract, entity-extract, conflict-detect, batch-source-rate

## Summary

- **Total Facts Extracted**: {{.TotalFacts}}
- **Total Entities Extracted**: {{.TotalEntities}}
- **Conflicts Detected**: {{.ConflictCount}}
- **Sources Rated**: {{.SourceCount}}
- **Raw Files Processed**: {{.RawFileCount}}

---

## Extracted Facts ({{.TotalFacts}} total)

### High-Confidence Facts ({{len .HighConfFacts}} facts)

{{range .HighConfFacts}}
#### Fact: {{.Entity}} - {{.Attribute}}

**Statement**: {{.Entity}} {{.Attribute}} is {{.Value}}
**Source**: {{.Source.URL}}
**Source Type**: {{.Source.Type}}
**Confidence**: {{.Confidence}}
**Value Type**: {{.ValueType}}

---
{{end}}

### Medium-Confidence Facts ({{len .MediumConfFacts}} facts)

{{range .MediumConfFacts}}
#### Fact: {{.Entity}} - {{.Attribute}}

**Statement**: {{.Entity}} {{.Attribute}} is {{.Value}}
**Source**: {{.Source.URL}}
**Confidence**: {{.Confidence}}

---
{{end}}

### Low-Confidence Facts ({{len .LowConfFacts}} facts)

{{range .LowConfFacts}}
#### Fact: {{.Entity}} - {{.Attribute}}

**Statement**: {{.Entity}} {{.Attribute}} is {{.Value}}
**Source**: {{.Source.URL}}
**Confidence**: {{.Confidence}}
**Note**: Requires manual verification

---
{{end}}

---

## Entities Extracted ({{.TotalEntities}} total)

### Organizations ({{len .Organizations}})

{{range .Organizations}}
- **{{.Name}}** ({{.MentionCount}} mentions)
  - Type: {{.Type}}
  {{if .Aliases}}- Aliases: {{join .Aliases ", "}}{{end}}
{{end}}

### People ({{len .People}})

{{range .People}}
- **{{.Name}}** ({{.MentionCount}} mentions)
  - Type: {{.Type}}
  {{if .Aliases}}- Aliases: {{join .Aliases ", "}}{{end}}
{{end}}

### Concepts ({{len .Concepts}})

{{range .Concepts}}
- **{{.Name}}** ({{.MentionCount}} mentions)
  - Type: {{.Type}}
  {{if .Aliases}}- Aliases: {{join .Aliases ", "}}{{end}}
{{end}}

---

**File Purpose**: This file contains all facts extracted by MCP tools from raw search results.
**Next Phase**: Phase 5 (Knowledge Synthesis) will load this file for report generation.
**Location**: RESEARCH/[topic]/processed/fact_ledger.md
**Inputs**: raw/agent_*.md files
**MCP Tools Used**: mcp__deep-research__fact-extract, mcp__deep-research__entity-extract, mcp__deep-research__conflict-detect, mcp__deep-research__batch-source-rate
