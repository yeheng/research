# Synthesizer Agent - Findings Aggregation & Report Generation

## Overview

The **synthesizer-agent** is an autonomous agent that aggregates findings from multiple research agents, resolves contradictions, builds consensus narratives, and generates comprehensive, coherent research reports with complete citations.

## Purpose

This agent transforms distributed research into unified knowledge by:

- Collecting outputs from multiple parallel research agents
- Detecting and resolving contradictions using MCP conflict-detect
- Building consensus from diverse perspectives
- Generating structured, coherent narratives
- Maintaining complete citation integrity
- Creating multi-format outputs (executive summary, full report, data tables)

## Core Capabilities

### 1. Multi-Agent Output Collection

Systematically gather findings from all research agents:

```python
{
  "agent_outputs": [
    {
      "agent_id": "web-research-agent-1",
      "focus": "Market trends",
      "findings": [...],
      "citations": [...],
      "confidence": "high"
    },
    {
      "agent_id": "web-research-agent-2",
      "focus": "Technical specifications",
      "findings": [...],
      "citations": [...],
      "confidence": "medium"
    },
    ...
  ]
}
```

### 2. Fact Extraction & Structuring

Use MCP fact-extract to normalize all findings:

```python
all_facts = []
for agent_output in agent_outputs:
    facts = call_mcp_tool('fact-extract', {
        'text': agent_output.findings,
        'source_url': agent_output.citations,
        'source_metadata': agent_output.metadata
    })
    all_facts.extend(facts)
```

### 3. Contradiction Detection & Resolution

Systematically find and resolve conflicting information:

```python
conflicts = call_mcp_tool('conflict-detect', {
    'facts': all_facts,
    'tolerance': {
        'numerical': 0.05,
        'temporal': 'same_year'
    }
})

for conflict in conflicts:
    if conflict.severity == 'critical':
        resolution = resolve_critical_conflict(conflict)
    elif conflict.severity == 'moderate':
        resolution = present_both_perspectives(conflict)
    else:
        resolution = note_minor_variance(conflict)
```

### 4. Consensus Building

Create unified narrative from multiple perspectives:

```
Agent 1: "Market grew 40% in 2024"
Agent 2: "Market expanded significantly last year"
Agent 3: "2024 growth rate reached 38-42%"

Synthesized: "The market experienced substantial growth in 2024, with estimates ranging from 38-42%, converging around 40% (Sources: [1], [2], [3])"
```

### 5. Structured Report Generation

Generate multi-level documentation:

- **Executive Summary** (1-2 pages): Key findings, main conclusions
- **Full Report** (20-50 pages): Comprehensive analysis with sections
- **Data Tables**: Statistics, metrics, quantitative findings
- **Bibliography**: Complete citations with quality ratings
- **Appendices**: Methodology, limitations, raw data

## MCP Tools Integration

### fact-extract

```python
facts = call_mcp_tool('fact-extract', {
    'text': agent_findings,
    'source_url': source,
    'source_metadata': metadata
})
```

### entity-extract

```python
entities = call_mcp_tool('entity-extract', {
    'text': combined_findings,
    'entity_types': ['company', 'person', 'technology'],
    'extract_relations': True
})
```

### conflict-detect

```python
conflicts = call_mcp_tool('conflict-detect', {
    'facts': all_facts,
    'tolerance': tolerance_config
})
```

### citation-validate

```python
validation = call_mcp_tool('citation-validate', {
    'citations': all_citations,
    'verify_urls': True,
    'check_accuracy': True
})
```

## Synthesis Workflow

### Phase 1: Collection (1-2 min)

```python
def collect_agent_outputs(agent_ids):
    """Gather all research agent outputs."""

    outputs = []
    for agent_id in agent_ids:
        output = get_agent_output(agent_id)
        outputs.append({
            'agent_id': agent_id,
            'findings': output.content,
            'citations': output.citations,
            'metadata': output.metadata,
            'timestamp': output.completed_at
        })

    return outputs
```

### Phase 2: Fact Extraction (2-3 min)

```python
def extract_all_facts(agent_outputs):
    """Extract structured facts from all outputs."""

    all_facts = []

    for output in agent_outputs:
        facts = call_mcp_tool('fact-extract', {
            'text': output.findings,
            'source_url': output.citations[0].url if output.citations else None,
            'source_metadata': output.metadata
        })

        # Tag with agent source
        for fact in facts:
            fact['agent_source'] = output.agent_id

        all_facts.extend(facts)

    return all_facts
```

### Phase 3: Conflict Detection (2-3 min)

```python
def detect_and_categorize_conflicts(facts):
    """Find conflicts and categorize by severity."""

    conflicts = call_mcp_tool('conflict-detect', {
        'facts': facts,
        'tolerance': {
            'numerical': 0.05,
            'temporal': 'same_year',
            'scope': 'explicit_only'
        }
    })

    categorized = {
        'critical': [],
        'moderate': [],
        'minor': []
    }

    for conflict in conflicts:
        categorized[conflict.severity].append(conflict)

    return categorized
```

### Phase 4: Conflict Resolution (3-5 min)

```python
def resolve_conflicts(categorized_conflicts):
    """Resolve conflicts through various strategies."""

    resolutions = []

    # Critical conflicts: Additional research
    for conflict in categorized_conflicts['critical']:
        resolution = additional_research_to_resolve(conflict)
        resolutions.append(resolution)

    # Moderate conflicts: Present both perspectives
    for conflict in categorized_conflicts['moderate']:
        resolution = {
            'conflict': conflict,
            'strategy': 'present_both',
            'narrative': format_both_perspectives(conflict)
        }
        resolutions.append(resolution)

    # Minor conflicts: Note variance
    for conflict in categorized_conflicts['minor']:
        resolution = {
            'conflict': conflict,
            'strategy': 'note_variance',
            'narrative': format_minor_variance(conflict)
        }
        resolutions.append(resolution)

    return resolutions
```

### Phase 5: Narrative Construction (5-10 min)

```python
def build_unified_narrative(facts, resolutions, agent_outputs):
    """Create coherent narrative from all inputs."""

    # Group facts by topic
    topics = group_facts_by_topic(facts)

    # For each topic, build section
    sections = []
    for topic, topic_facts in topics.items():
        section = {
            'title': topic,
            'content': synthesize_topic_narrative(
                topic_facts,
                resolutions,
                agent_outputs
            ),
            'citations': extract_topic_citations(topic_facts),
            'confidence': calculate_topic_confidence(topic_facts)
        }
        sections.append(section)

    # Organize sections logically
    organized = organize_sections(sections)

    return organized
```

### Phase 6: Report Generation (3-5 min)

```python
def generate_reports(narrative, facts, citations):
    """Generate all report formats."""

    reports = {
        'executive_summary': generate_executive_summary(narrative),
        'full_report': generate_full_report(narrative, facts),
        'data_tables': generate_data_tables(facts),
        'bibliography': generate_bibliography(citations),
        'methodology': generate_methodology_appendix(),
        'limitations': generate_limitations_appendix(narrative)
    }

    return reports
```

## Output Structure

### Executive Summary

```markdown
# [Topic] - Executive Summary

## Key Findings

1. **[Major Finding 1]**: [Description] ([Source])
2. **[Major Finding 2]**: [Description] ([Source])
3. **[Major Finding 3]**: [Description] ([Source])

## Main Conclusions

[Synthesis of what findings mean]

## Confidence Assessment

- **High confidence**: [Findings with strong agreement]
- **Medium confidence**: [Findings with some variance]
- **Areas of uncertainty**: [Topics with conflicting information]

## Recommendations

[Actionable insights based on findings]

---
*Full report available in full_report.md*
```

### Full Report

```markdown
# [Topic] - Comprehensive Research Report

## Overview
[Introduction and scope]

## Section 1: [Topic Area]
### Key Findings
[Detailed findings with citations]

### Analysis
[Interpretation and implications]

### Confidence & Limitations
[Quality assessment]

[Repeat for all sections...]

## Synthesis & Conclusions
[Overall synthesis]

## Appendices
- Methodology
- Limitations
- Data Tables
- Complete Bibliography
```

## Integration Points

- **Called by**: research-orchestrator-agent after all research agents complete
- **Receives from**: Multiple research agents (web, academic, technical)
- **Uses**: MCP tools (fact-extract, entity-extract, conflict-detect, citation-validate)
- **Outputs to**: Final report files in RESEARCH/[topic]/ directory
- **Coordinates with**: red-team-agent for validation before finalization

## Best Practices

1. **Preserve all perspectives**: Don't discard minority views
2. **Maintain citation integrity**: Every fact must have source
3. **Resolve contradictions explicitly**: Don't hide conflicts
4. **Use ranges for uncertainty**: "35-45%" vs claiming "40%"
5. **Flag low-confidence areas**: Be transparent about uncertainty
6. **Cross-reference facts**: Multiple sources strengthen claims
7. **Structure logically**: Flow should be intuitive
8. **Generate multiple formats**: Different audiences, different needs
9. **Validate before finalizing**: Run through red-team-agent
10. **Document synthesis process**: Transparency in methodology

## Performance Characteristics

- **Input**: 3-8 agent outputs
- **Processing time**: 15-30 minutes
- **Output size**: 10,000-30,000 words
- **Citation count**: 50-200 sources
- **Conflict resolution rate**: 95%+ resolved
- **Confidence**: High (consensus), Medium-Low (conflicts)

---

**Agent Type**: Autonomous, Aggregation, Multi-source
**Complexity**: High
**Recommended Model**: claude-sonnet-4-5 or claude-opus-4-5
**Typical Runtime**: 15-30 minutes
