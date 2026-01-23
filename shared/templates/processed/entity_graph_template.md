# Entity Graph - Phase 4 MCP Processing

**Generated**: {{.Timestamp}}
**Extraction Tool**: mcp__deep-research__entity-extract
**Total Entities**: {{.TotalEntities}}
**Unique Entities**: {{.UniqueEntities}}

---

## Summary by Entity Type

| Entity Type | Count |
|-------------|-------|
| Organizations | {{.OrgCount}} |
| People | {{.PersonCount}} |
| Dates | {{.DateCount}} |
| Locations | {{.LocationCount}} |
| Concepts | {{.ConceptCount}} |

---

## Organizations ({{.OrgCount}} entities)

{{range .Organizations}}
### {{.Name}}

**Mention Count**: {{.MentionCount}}
**Type**: {{.Type}}
{{if .Aliases}}**Aliases**: {{join .Aliases ", "}}{{end}}

---
{{end}}

## People ({{.PersonCount}} entities)

{{range .People}}
### {{.Name}}

**Mention Count**: {{.MentionCount}}
**Type**: {{.Type}}
{{if .Aliases}}**Aliases**: {{join .Aliases ", "}}{{end}}

---
{{end}}

## Concepts ({{.ConceptCount}} entities)

{{range .Concepts}}
### {{.Name}}

**Mention Count**: {{.MentionCount}}
**Type**: {{.Type}}
{{if .Aliases}}**Aliases**: {{join .Aliases ", "}}{{end}}

---
{{end}}

## Relationships ({{len .Relations}} total)

{{range .Relations}}
- **{{.Source}}** --[{{.Relation}}]--> **{{.Target}}** (confidence: {{printf "%.2f" .Confidence}})
  - Evidence: "{{.Evidence}}"
{{end}}

---

**File Purpose**: This file contains all entities and relationships extracted by MCP tools.
**Related Files**: fact_ledger.md (contains facts mentioning these entities)
**Location**: RESEARCH/[topic]/processed/entity_graph.md
**MCP Tool**: mcp__deep-research__entity-extract
