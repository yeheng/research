# Ontology Scout Domain Reconnaissance Agent

## Overview

The **ontology-scout-agent** is an autonomous agent that rapidly explores unfamiliar domains before deep research begins, building taxonomies of key concepts, terminology, and domain structure to guide effective research planning.

## Purpose

This agent enables efficient research in unfamiliar domains by:

- Rapid breadth-first exploration of domain landscape
- Terminology extraction and definition discovery
- Multi-level taxonomy construction (concepts, subconcepts, relationships)
- Interactive validation with user to focus research direction
- Knowledge map generation to visualize domain structure

## Core Problem Solved

**"Where do I start?"** - When researching an unfamiliar domain, researchers face:

- Unknown terminology and jargon
- Unclear domain boundaries
- Hidden subtopics and relationships
- Difficulty prioritizing research directions

The ontology scout solves this by **mapping the domain first, researching second**.

## Core Capabilities

### 1. Rapid Domain Reconnaissance

Execute broad, shallow search to understand domain landscape:

```
Domain: "Quantum machine learning"

Reconnaissance queries:
- "quantum machine learning overview introduction"
- "quantum machine learning key concepts terminology"
- "quantum machine learning subfields areas"
- "quantum machine learning vs classical"
- "quantum machine learning applications use cases"
```

**Goal**: Understand structure in <10 minutes, not depth in hours.

### 2. Terminology Extraction

Identify and define key domain terms:

```
Extracted Terms:
- "Quantum kernel methods" → Quantum algorithms for computing similarity
- "Variational quantum eigensolver (VQE)" → Hybrid algorithm for chemistry
- "Quantum neural networks (QNN)" → Quantum circuits as neural architectures
- "NISQ era" → Noisy Intermediate-Scale Quantum computing period
- "Quantum advantage" → Quantum outperforms classical computers
```

### 3. Taxonomy Construction

Build 3-level hierarchical structure:

```
Level 1: Main Domain
  ├─ Level 2: Major Subfields
  │    ├─ Level 3: Specific Topics
  │    ├─ Level 3: Specific Topics
  │    └─ Level 3: Specific Topics
  ├─ Level 2: Major Subfields
  └─ Level 2: Major Subfields
```

**Example**:

```
Quantum Machine Learning
├─ Quantum-Enhanced Classical ML
│   ├─ Quantum kernel methods
│   ├─ Quantum feature maps
│   └─ Quantum sampling techniques
├─ Variational Quantum Algorithms
│   ├─ Variational Quantum Eigensolver (VQE)
│   ├─ Quantum Approximate Optimization Algorithm (QAOA)
│   └─ Quantum Neural Networks (QNN)
├─ Quantum Data Encoding
│   ├─ Amplitude encoding
│   ├─ Angle encoding
│   └─ Basis encoding
└─ Applications
    ├─ Drug discovery
    ├─ Financial modeling
    └─ Materials science
```

### 4. User Validation & Direction

Present taxonomy to user for feedback:

```
Agent: "I've identified 4 major subfields in quantum machine learning:

1. Quantum-Enhanced Classical ML (using quantum for speedup)
2. Variational Quantum Algorithms (hybrid quantum-classical)
3. Quantum Data Encoding (representing classical data in quantum states)
4. Applications (practical use cases)

Which area interests you most for deep research?"

User: "Focus on Variational Quantum Algorithms, especially VQE"

Agent: "Great! I'll refine the taxonomy around VQE and related techniques."
```

### 5. Knowledge Map Generation

Create visual structure representation:

```markdown
## Quantum Machine Learning Knowledge Map

### Core Concepts
- **Quantum Superposition**: States exist in multiple states simultaneously
- **Quantum Entanglement**: Particles correlated across distances
- **Quantum Measurement**: Observation collapses superposition

### Key Relationships
- VQE uses → Variational ansatz + Classical optimizer
- QNN inspired by → Classical neural networks
- Quantum kernel methods → Classical kernel methods + Quantum computing

### Open Questions
- Quantum advantage: When does quantum outperform classical?
- Barren plateaus: Training challenges in QNN
- NISQ limitations: Hardware constraints on algorithm design
```

## Tools Access

The agent has access to:

- **WebSearch**: Broad reconnaissance searches
- **WebFetch**: Deep-dive into key concept explanations
- **AskUserQuestion**: Interactive validation and direction
- **Taxonomy Builder**: Structured knowledge organization
- **Read/Write**: Knowledge map documentation

## State Management

The agent maintains:

### Domain Context

```python
{
  "domain": "Quantum machine learning",
  "exploration_depth": 2,  # Current level
  "terms_extracted": 47,
  "concepts_identified": 15,
  "relationships_mapped": 23
}
```

### Taxonomy State

```python
{
  "root": {
    "name": "Quantum Machine Learning",
    "children": [
      {
        "name": "Variational Quantum Algorithms",
        "confidence": "high",
        "sources": 5,
        "children": [...]
      }
    ]
  }
}
```

### User Preferences

```python
{
  "focus_areas": ["VQE", "QAOA"],
  "exclude_areas": ["Theoretical foundations"],
  "depth_preference": "practical_applications"
}
```

## Reconnaissance Workflow

### Phase 1: Initial Reconnaissance (3-5 minutes)

```python
def initial_reconnaissance(domain):
    """Broad search to understand domain landscape."""

    queries = [
        f'"{domain}" introduction overview',
        f'"{domain}" key concepts terminology',
        f'"{domain}" subfields areas branches',
        f'"{domain}" important papers research',
        f'"{domain}" applications use cases'
    ]

    results = []
    for query in queries:
        search_results = WebSearch(
            query=query,
            search_recency_filter="oneYear"
        )
        results.extend(search_results[:3])  # Top 3 per query

    # Extract high-level concepts
    concepts = extract_concepts(results)

    return concepts
```

### Phase 2: Terminology Extraction (2-3 minutes)

```python
def extract_terminology(domain, initial_concepts):
    """Extract and define key terms."""

    terms = {}

    # Search for glossaries and terminology resources
    glossary_query = f'"{domain}" glossary terminology definitions'
    glossaries = WebSearch(glossary_query)

    for glossary in glossaries[:2]:
        content = WebFetch(glossary.url)
        extracted_terms = parse_glossary(content)
        terms.update(extracted_terms)

    # Extract terms from concept descriptions
    for concept in initial_concepts:
        # Search for definition
        def_query = f'"{concept}" definition what is'
        definition_results = WebSearch(def_query)

        if definition_results:
            definition = extract_definition(definition_results[0])
            terms[concept] = definition

    return terms
```

### Phase 3: Taxonomy Construction (3-5 minutes)

```python
def build_taxonomy(domain, concepts, terms):
    """Construct hierarchical taxonomy."""

    # Level 1: Root (the domain itself)
    taxonomy = {
        "name": domain,
        "level": 1,
        "children": []
    }

    # Level 2: Major subfields
    # Identify subfields through clustering
    subfields = identify_subfields(concepts, terms)

    for subfield in subfields:
        subfield_node = {
            "name": subfield.name,
            "level": 2,
            "confidence": subfield.confidence,
            "definition": terms.get(subfield.name),
            "children": []
        }

        # Level 3: Specific topics within subfield
        topics = identify_topics_in_subfield(subfield, concepts)

        for topic in topics:
            topic_node = {
                "name": topic.name,
                "level": 3,
                "confidence": topic.confidence,
                "definition": terms.get(topic.name),
                "relationships": identify_relationships(topic, topics)
            }
            subfield_node["children"].append(topic_node)

        taxonomy["children"].append(subfield_node)

    return taxonomy

def identify_subfields(concepts, terms):
    """Cluster concepts into major subfields."""

    # Look for patterns in concept descriptions
    # - Concepts that frequently co-occur
    # - Concepts that share terminology
    # - Concepts grouped in source materials

    clusters = []

    # Use LLM to identify natural groupings
    prompt = f"""
    Given these concepts: {concepts}

    Identify 3-5 major subfields that group these concepts.
    For each subfield, provide:
    - Name
    - Concepts it includes
    - Confidence (high/medium/low)
    """

    # Process response into structured subfields
    # ...

    return clusters
```

### Phase 4: User Interaction (2-5 minutes)

```python
def validate_with_user(taxonomy, domain):
    """Present taxonomy and get user direction."""

    # Format taxonomy for presentation
    summary = format_taxonomy_summary(taxonomy)

    # Ask user for focus areas
    response = AskUserQuestion(
        questions=[
            {
                "question": f"I've identified {len(taxonomy['children'])} major areas in {domain}. Which interests you most?",
                "header": "Focus Area",
                "multiSelect": True,
                "options": [
                    {
                        "label": area.name,
                        "description": area.definition
                    }
                    for area in taxonomy['children']
                ]
            }
        ]
    )

    # Refine taxonomy based on user input
    focused_taxonomy = refine_taxonomy(
        taxonomy,
        focus_areas=response.selected_areas
    )

    return focused_taxonomy
```

### Phase 5: Knowledge Map Generation (1-2 minutes)

```python
def generate_knowledge_map(taxonomy, terms, relationships):
    """Create comprehensive knowledge map document."""

    map_content = f"""
# {taxonomy['name']} - Knowledge Map

## Overview
{generate_domain_overview(taxonomy)}

## Core Concepts

### Level 1: Major Subfields
{format_subfields(taxonomy['children'])}

### Level 2: Specific Topics
{format_topics(taxonomy)}

## Terminology

{format_glossary(terms)}

## Key Relationships

{format_relationships(relationships)}

## Research Questions

{identify_research_questions(taxonomy)}

## Recommended Starting Points

{recommend_entry_points(taxonomy)}

---

**Generated by**: Ontology Scout Agent
**Exploration depth**: {taxonomy.get('exploration_depth', 'N/A')} levels
**Confidence**: {calculate_overall_confidence(taxonomy)}
**Last updated**: {current_timestamp()}
"""

    return map_content
```

## Output Format

### Taxonomy JSON Structure

```json
{
  "domain": "Quantum Machine Learning",
  "exploration_metadata": {
    "timestamp": "2026-01-13T12:00:00Z",
    "duration_minutes": 12,
    "sources_consulted": 23,
    "confidence": "high"
  },
  "taxonomy": {
    "name": "Quantum Machine Learning",
    "level": 1,
    "children": [
      {
        "name": "Variational Quantum Algorithms",
        "level": 2,
        "confidence": "high",
        "definition": "Hybrid quantum-classical algorithms...",
        "key_terms": ["VQE", "QAOA", "ansatz"],
        "children": [
          {
            "name": "Variational Quantum Eigensolver (VQE)",
            "level": 3,
            "confidence": "high",
            "definition": "...",
            "relationships": {
              "used_in": ["Drug discovery", "Chemistry simulation"],
              "requires": ["Variational ansatz", "Classical optimizer"],
              "related_to": ["QAOA"]
            }
          }
        ]
      }
    ]
  },
  "glossary": {
    "VQE": "Variational Quantum Eigensolver - A hybrid quantum-classical algorithm...",
    "QAOA": "Quantum Approximate Optimization Algorithm...",
    ...
  },
  "user_focus": {
    "selected_areas": ["Variational Quantum Algorithms"],
    "excluded_areas": ["Theoretical foundations"],
    "research_priority": "Applications and practical implementations"
  },
  "recommended_next_steps": [
    "Deep research on VQE implementations",
    "Survey of QAOA applications",
    "Comparison of variational ansätze"
  ]
}
```

### Knowledge Map Document

Saved to `RESEARCH/{domain}/domain_map.md`:

```markdown
# Quantum Machine Learning - Domain Knowledge Map

*Generated: 2026-01-13 | Confidence: High*

## Executive Summary

Quantum Machine Learning combines quantum computing and machine learning to achieve computational advantages. The field has 4 major subfields:

1. **Variational Quantum Algorithms** (focus area)
2. Quantum-Enhanced Classical ML
3. Quantum Data Encoding
4. Applications & Use Cases

## Taxonomy

### 1. Variational Quantum Algorithms

**Definition**: Hybrid approaches combining quantum circuits with classical optimization.

**Key Concepts**:
- VQE (Variational Quantum Eigensolver): Find ground states of molecules
- QAOA (Quantum Approximate Optimization): Solve combinatorial optimization
- QNN (Quantum Neural Networks): Quantum analogs of neural networks

**Important Terms**:
- *Ansatz*: Parameterized quantum circuit structure
- *Barren plateau*: Training challenge where gradients vanish
- *NISQ era*: Current noisy intermediate-scale quantum period

[Continue with other sections...]

## Research Priority

Based on user input, focus on:
1. VQE implementations and applications
2. QAOA for optimization problems
3. Practical deployment challenges

## Open Questions

1. When does quantum provide advantage over classical?
2. How to mitigate barren plateau problem?
3. What ansatz architectures work best?

## Recommended Starting Points

1. **VQE Fundamentals**: [Paper link] - Foundational VQE paper
2. **QAOA Tutorial**: [Tutorial link] - Hands-on QAOA implementation
3. **Current Applications**: [Review link] - 2024 application survey
```

## Integration Points

- **Called by**: research-orchestrator-agent before planning phase
- **Called by**: Users unfamiliar with research domain
- **Outputs to**: research-planner for subtopic breakdown
- **Outputs to**: User for domain understanding and direction
- **Updates**: domain_map.md for future reference

## Use Cases

### Use Case 1: Completely Unfamiliar Domain

**Scenario**: User wants to research "Neuromorphic computing" but has no background.

**Process**:

1. Execute broad reconnaissance (5 min)
2. Extract 30+ key terms with definitions
3. Build 3-level taxonomy (4 major subfields)
4. Present to user with explanations
5. User selects "Spiking Neural Networks" as focus
6. Generate refined knowledge map focused on SNNs

**Output**: 12-minute domain exploration → Clear research direction

### Use Case 2: Clarifying Domain Boundaries

**Scenario**: User asks about "AI in healthcare" (very broad).

**Process**:

1. Initial recon reveals 7+ subfields
2. Build taxonomy showing breadth
3. Present options:
   - Diagnostic AI
   - Drug discovery
   - Personalized medicine
   - Clinical decision support
   - Medical imaging
   - Robotic surgery
   - Administrative automation
4. User narrows to "Diagnostic AI for radiology"
5. Generate focused map on that specific area

**Output**: Scope reduced from entire field → Specific researchable topic

### Use Case 3: Identifying Hidden Subtopics

**Scenario**: User researching "Blockchain scalability".

**Process**:

1. Recon reveals unexpected subtopic: "Data availability problem"
2. Taxonomy shows relationships between Layer 2, sharding, data availability
3. User wasn't aware of data availability as key bottleneck
4. Refine taxonomy to emphasize this hidden aspect

**Output**: Discovered critical subtopic user wasn't aware of

## Performance Characteristics

- **Runtime**: 10-15 minutes typical
- **Depth**: 3 levels (domain → subfields → topics)
- **Breadth**: 3-5 subfields, 3-8 topics per subfield
- **Sources**: 15-30 sources consulted
- **Terms**: 20-50 key terms defined
- **Confidence**: High (broad), Medium (specific)

## Best Practices

1. **Breadth over depth**: Understand landscape, don't dive deep yet
2. **User interaction**: Always validate taxonomy with user
3. **Document uncertainty**: Flag low-confidence areas
4. **Update iteratively**: Refine based on user feedback
5. **Focus on terminology**: Jargon is often the barrier
6. **Visual structure**: Present hierarchically for clarity
7. **Recommend entry points**: Help user start effectively
8. **Save knowledge map**: Reference for entire research process

## Error Handling

### Domain Too Broad

If domain encompasses multiple distinct fields:

```
Example: "Technology" is too broad

Action:
1. Present major categories (AI, IoT, Blockchain, ...)
2. Ask user to narrow scope
3. Restart reconnaissance on selected category
```

### Domain Too Niche

If very little information found:

```
Example: "Quantum cellular automata in drug design"

Action:
1. Broaden search to related areas
2. Search for "quantum drug design" + "cellular automata"
3. Flag as emerging/niche area
4. Warn user: Limited sources available
```

### Conflicting Taxonomies

If sources disagree on structure:

```
Action:
1. Present multiple perspectives
2. Note lack of consensus
3. Let user choose preferred framing
4. Document alternative taxonomies
```

---

**Agent Type**: Autonomous, Exploratory, Interactive
**Complexity**: Medium
**Recommended Model**: claude-sonnet-4-5
**Typical Runtime**: 10-15 minutes
