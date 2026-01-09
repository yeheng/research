# Deep Research Methodology with Graph of Thoughts

## Overview

This document provides comprehensive methodology for conducting AI-driven deep research using the Graph of Thoughts (GoT) framework. This approach autonomously conducts multi-step research through iterative searching, reading, analyzing, and synthesizing information with explicit citations.

**Key Features:**

- 7-phase structured research process
- Graph of Thoughts for complex reasoning and optimization
- Multi-agent parallel deployment (3-8 agents)
- Rigorous citation standards with A-E quality ratings
- Chain-of-Verification to prevent hallucinations
- Self-contained implementation using Task agents

**Important Notes:**

- All research outputs saved in `RESEARCH/[topic_name]/` directory
- Break down large documents into smaller files to avoid context limitations
- Use TodoWrite to track task completion throughout execution
- Maintain graph state when using GoT Controller

---

## Understanding Graph of Thoughts

Graph of Thoughts is a reasoning framework where:

- **Thoughts = Nodes**: Each research finding or synthesis is a node with a unique ID
- **Edges = Dependencies**: Connect parent thoughts to child thoughts
- **Transformations**: Operations that create (Generate), merge (Aggregate), or improve (Refine) thoughts
- **Scoring**: Every thought is evaluated 0-10 for quality based on citation density, source credibility, claim verification, comprehensiveness, and logical coherence
- **Pruning**: Low-scoring branches are abandoned using KeepBestN(n) operations
- **Frontier**: Active nodes available for expansion

The system explores multiple research paths in parallel, scores them, and finds optimal solutions through graph traversal.

### GoT Transformation Operations

| Operation | Purpose | Example |
|-----------|---------|---------|
| **Generate(k)** | Create k new thoughts from a parent | Generate(3) → 3 diverse research angles |
| **Aggregate(k)** | Merge k thoughts into one stronger thought | Aggregate(3) → 1 comprehensive synthesis |
| **Refine(1)** | Improve a thought without adding new content | Refine(node_5) → Enhanced clarity and depth |
| **Score** | Evaluate thought quality (0-10) | Based on citations, accuracy, completeness |
| **KeepBestN(n)** | Prune to keep only top n nodes per level | KeepBestN(5) → Retain best 5 paths |

### Graph State Structure

```json
{
  "nodes": {
    "n1": {
      "text": "Research finding with citations",
      "score": 8.5,
      "type": "root|generated|aggregated|refined",
      "depth": 0,
      "sources": ["url1", "url2"]
    }
  },
  "edges": [
    {"from": "n1", "to": "n2", "operation": "Generate"}
  ],
  "frontier": ["n2", "n3"],
  "budget": {
    "tokens_used": 15000,
    "max_tokens": 50000
  }
}
```

### Graph Traversal Strategy

The Controller maintains the graph and decides which transformations to apply:

1. **Early Depth (0-2)**: Aggressive Generate(3) to explore search space
2. **Mid Depth (2-3)**: Mix of Generate for promising paths + Refine for weak nodes
3. **Late Depth (3-4)**: Aggregate best branches + final Refine
4. **Pruning**: Keep only top 5 nodes per depth level
5. **Termination**: When best node scores 9+ or depth exceeds 4

---

## The 7-Phase Deep Research Process

### Phase 1: Question Scoping

**Objective:** Transform vague questions into structured research prompts

**Activities:**

- Clarify the research question with the user through structured dialogue
- Define output format and success criteria
- Identify constraints, scope boundaries, and desired tone
- Determine target audience and technical depth
- Create unambiguous query with clear parameters

**User Interaction - Ask clarifying questions about:**

- Specific focus areas
- Output format requirements (report, presentation, analysis)
- Geographic and time scope
- Target audience (technical team, executives, general)
- Special requirements (data, visualizations, comparisons)

**Deliverable:** Structured research prompt with clear objectives

---

### Phase 2: Retrieval Planning

**Objective:** Create a comprehensive research execution plan

**Activities:**

- Break main question into 3-5 subtopics
- Generate specific search queries for each subtopic
- Select appropriate data sources (academic, industry, news)
- Plan multi-agent deployment strategy (3-8 agents)
- Use GoT to model the research as a graph of operations
- Create research plan for user approval

**Subtopic Breakdown Template:**

1. Current state and trends
2. Key challenges and limitations
3. Future developments and predictions
4. Case studies and real-world applications
5. Expert opinions and industry perspectives

**Agent Deployment Planning:**

- 3-5 Web Research Agents: Current information, trends, news
- 1-2 Academic/Technical Agents: Papers, specifications, methodologies
- 1 Cross-Reference Agent: Fact-checking and verification

**Deliverable:** Detailed research plan with agent deployment strategy for user approval

---

### Phase 3: Iterative Querying

**Objective:** Execute systematic information gathering with parallel agents

**Activities:**

- Deploy 3-8 specialized research agents in parallel
- Execute searches systematically across multiple sources
- Navigate and extract relevant information
- Formulate new queries based on findings (ReAct pattern)
- Apply GoT operations for complex reasoning
- Use multiple search modalities (WebSearch, WebFetch, Puppeteer)

**Tools:**

- **WebSearch**: General web searches for finding relevant sources
- **WebFetch**: Extract and analyze content from specific URLs
- **mcp__puppeteer__**: Browser automation for JavaScript-heavy sites
- **Task**: Deploy autonomous agents for multi-step operations

**Agent Types:**

- **Web Research Agents (3-5)**: Current information, trends, news, real-world data
- **Academic/Technical Agents (1-2)**: Research papers, technical specifications, methodologies
- **Cross-Reference Agent (1)**: Fact-checking, verification, cross-validation

**Deliverable:** Raw research findings from all agents with source URLs and confidence ratings

---

### Phase 4: Source Triangulation

**Objective:** Validate and cross-reference all findings

**Activities:**

- Compare findings across multiple sources
- Validate claims with cross-references (minimum 2+ sources for critical claims)
- Handle inconsistencies and contradictions
- Assess source credibility using A-E rating system
- Use GoT scoring functions to evaluate information quality
- Apply Chain-of-Verification techniques

**Validation Protocol:**

1. **Primary Sources Only** - Link to original research, not secondary reporting
2. **Archive Links** - For time-sensitive content, include archive.org links
3. **Multiple Confirmations** - Critical claims need 2+ independent sources
4. **Conflicting Data** - Note when sources disagree and explain discrepancies
5. **Source Quality Ratings** - Apply A-E scale to every source

**Deliverable:** Validated findings with confidence ratings and source quality assessments

---

### Phase 5: Knowledge Synthesis

**Objective:** Combine findings into coherent narrative

**Activities:**

- Structure content logically with clear sections
- Write comprehensive sections with proper flow
- Include inline citations for every factual claim
- Add data visualizations when relevant
- Use GoT Aggregate operations to merge findings
- Apply Chain-of-Density for information compression

**Synthesis Process:**

1. Collect all agent findings
2. Identify overlaps and contradictions
3. Resolve conflicts with evidence
4. Create unified narrative
5. Maintain source attribution from each agent

**Chain-of-Density Approach:**

1. First pass: Extract key points (low density)
2. Second pass: Add supporting details and context
3. Third pass: Compress while preserving all critical information
4. Final pass: Maximum density with all essential facts and citations

**Deliverable:** Draft research report with inline citations

---

### Phase 6: Quality Assurance

**Objective:** Ensure accuracy and completeness

**Activities:**

- Check for hallucinations and unsupported claims
- Verify all citations match content
- Ensure completeness and clarity
- Apply Chain-of-Verification techniques
- Use GoT ground truth operations for validation
- Run citation validator on final document

**Quality Checklist:**

- [ ] Every claim has a verifiable source
- [ ] Multiple sources corroborate key findings
- [ ] Contradictions are acknowledged and explained
- [ ] Sources are recent and authoritative
- [ ] No hallucinations or unsupported claims
- [ ] Clear logical flow from evidence to conclusions
- [ ] Proper citation format throughout

**Deliverable:** Quality-assured research report

---

### Phase 7: Output & Packaging

**Objective:** Format and deliver final research

**Activities:**

- Format for optimal readability
- Create executive summary (1-2 pages)
- Generate proper bibliography with source quality ratings
- Organize into folder structure
- Export in requested format
- Include methodology and limitations documentation

**Output Structure:**

```
RESEARCH/[topic_name]/
├── README.md                    # Overview and navigation guide
├── executive_summary.md         # 1-2 page key findings
├── full_report.md               # Complete analysis (20-50 pages)
├── data/
│   ├── raw_data.csv
│   ├── processed_data.json
│   └── statistics_summary.md
├── visuals/
│   ├── charts/
│   ├── graphs/
│   └── descriptions.md
├── sources/
│   ├── bibliography.md
│   ├── source_quality_table.md  # A-E ratings
│   └── screenshots/
├── research_notes/
│   ├── agent_1_findings.md
│   ├── agent_2_findings.md
│   └── synthesis_notes.md
└── appendices/
    ├── methodology.md
    ├── limitations.md
    └── future_research.md
```

**Deliverable:** Complete research package in RESEARCH/[topic_name]/ directory

---

## Multi-Agent Deployment Strategy

### Overview

Deploy multiple Task agents in parallel to maximize research efficiency and coverage. This approach mirrors how a research team would divide work among specialists.

### Agent Deployment Protocol

**Step 1: Create Research Plan**

- Break down main question into specific subtopics
- Assign one agent per subtopic/research angle
- Define clear task boundaries to minimize redundancy

**Step 2: Launch Parallel Agents**
Use multiple Task tool invocations in a single response. Each agent receives:

- Clear description of their research focus
- Specific instructions on what to find
- Expected output format with citation requirements
- List of tools to use (WebSearch, WebFetch, Puppeteer)

**Step 3: Coordinate Results**
After agents complete their tasks:

- Compile findings from all agents
- Identify overlaps and contradictions
- Synthesize into coherent narrative
- Maintain source attribution from each agent

### Agent Prompt Templates

#### General Research Agent Template

```
Research [specific aspect] of [main topic]. Use the following tools:
1. Start with WebSearch to find relevant sources
2. Use WebFetch to extract content from promising URLs
3. If sites require JavaScript, use mcp__puppeteer__puppeteer_navigate and screenshot

Focus on finding:
- Recent information (prioritize last 2 years)
- Authoritative sources
- Specific data/statistics
- Multiple perspectives

For every factual claim, provide:
1. Direct quote or specific data point
2. Author/organization name
3. Publication year
4. Full title
5. Direct URL/DOI
6. Confidence rating (High/Medium/Low)

Never make claims without sources. If uncertain, state 'Source needed' rather than guessing.

Provide a structured summary with all source URLs.
```

#### Technical Research Agent Template

```
Find technical/academic information about [topic aspect].

Tools to use:
1. WebSearch for academic papers and technical resources
2. WebFetch for PDF extraction and content analysis
3. mcp__filesystem__ tools to save important findings

Look for:
- Peer-reviewed papers
- Technical specifications
- Methodologies and frameworks
- Scientific evidence

Include proper academic citations with DOI/PMID when available.
```

#### Verification Agent Template

```
Verify the following claims about [topic]:
[List key claims to verify]

Use multiple search queries with WebSearch to find:
- Supporting evidence
- Contradicting information
- Original sources

Rate confidence: High/Medium/Low for each claim.
Explain any contradictions found.
Cross-reference at least 2 independent sources for critical claims.
```

### Best Practices

1. **Clear Task Boundaries**: Each agent should have distinct, non-overlapping focus
2. **Comprehensive Prompts**: Include all necessary context and citation requirements
3. **Parallel Execution**: Launch all agents in one response for maximum efficiency
4. **Result Integration**: Plan synthesis strategy before launching agents
5. **Quality Control**: Always include at least one verification agent

### Example Multi-Agent Deployment

When researching "AI in Healthcare", deploy agents as follows:

**Agent 1**: "Research current AI applications in healthcare - focus on clinical diagnosis and treatment"
**Agent 2**: "Find challenges and ethical concerns in medical AI - regulatory and privacy issues"
**Agent 3**: "Investigate future AI healthcare innovations - emerging technologies and predictions"
**Agent 4**: "Gather case studies of successful AI healthcare implementations - ROI and outcomes"
**Agent 5**: "Cross-reference and verify key statistics about AI healthcare impact - validate claims"

---

## Graph of Thoughts Implementation

### Core GoT Implementation

When deep research is requested, deploy a GoT Controller that maintains graph state and orchestrates transformations:

#### GoT Execution Loop

```
repeat until DONE {
    1. Select frontier thoughts with Ranker R (top-3 highest scoring)
    2. For each selected thought, choose Transformation T:
       - If depth < 2: Generate(3) to explore branches
       - If score < 7: Refine(1) to improve quality
       - If multiple good paths: Aggregate(k) to merge
    3. Deploy transformation agents and await results
    4. Update graph with new nodes, edges, and scores
    5. Prune: KeepBestN(5) at each depth level
    6. Exit when max_score > 9 or depth > 4
}
```

### Transformation Agent Templates

#### Generate Agent Template

```
Task: "GoT Generate - Node [ID] Branch [k]"

You are Generate transformation creating branch [k] from parent thought:
"[PARENT_THOUGHT]"

Your specific exploration angle: [ANGLE]
- Angle 1: Current state and evidence
- Angle 2: Challenges and limitations
- Angle 3: Future implications

Execute:
1. WebSearch for "[TOPIC] [ANGLE]" - find 5 sources
2. Score each source quality (1-10)
3. WebFetch top 3 sources
4. Synthesize findings into coherent thought (200-400 words)
5. Self-score your thought (0-10) based on:
   - Claim accuracy
   - Citation density
   - Novel insights
   - Coherence

Return:
{
  "thought": "your synthesized findings with inline citations",
  "score": float,
  "sources": ["url1", "url2", "url3"],
  "operation": "Generate",
  "parent": "[PARENT_ID]"
}
```

#### Aggregate Agent Template

```
Task: "GoT Aggregate - Nodes [IDs]"

You are Aggregate transformation combining these [k] thoughts:

[THOUGHT_1]
Score: [SCORE_1]

[THOUGHT_2]
Score: [SCORE_2]

Combine into ONE stronger unified thought that:
- Preserves all important claims
- Resolves contradictions
- Maintains all citations
- Achieves higher quality than any input

Self-score the result (0-10).

Return:
{
  "thought": "aggregated synthesis",
  "score": float,
  "operation": "Aggregate",
  "parents": [parent_ids]
}
```

#### Refine Agent Template

```
Task: "GoT Refine - Node [ID]"

You are Refine transformation improving this thought:
"[CURRENT_THOUGHT]"
Current score: [SCORE]

Improve by:
1. Fact-check claims using WebSearch
2. Add missing context/nuance
3. Strengthen weak arguments
4. Fix citation issues
5. Enhance clarity

Do NOT add new major points - only refine existing content.

Self-score improvement (0-10).

Return refined thought with updated score.
```

### Complete GoT Research Example

**User Request:** "Deep research CRISPR gene editing safety"

**Iteration 1: Initialize and Explore**

1. Controller Agent creates root node: "Research CRISPR gene editing safety"
2. Generate(3) deploys 3 parallel agents exploring:
   - Current evidence and success rates
   - Safety concerns and limitations
   - Future implications and regulations
3. Results: 3 thoughts with scores (6.8, 8.2, 7.5)
4. Graph state saved with frontier = [n3(8.2), n2(7.5), n4(6.8)]

**Iteration 2: Deepen Best Paths**

1. Controller examines frontier, decides:
   - n3 (8.2): High score → Generate(3) for deeper exploration
   - n2 (7.5): Medium → Generate(2)
   - n4 (6.8): Low → Refine(1) to improve
2. 6 agents deployed in parallel
3. Best result: "High-fidelity SpCas9 variants reduce off-targets by 95%" (Score: 9.1)

**Iteration 3: Aggregate Strong Branches**

1. Controller sees multiple high scores
2. Aggregate(3) merges best thoughts into comprehensive synthesis
3. Score: 9.3 - exceeds threshold

**Iteration 4: Final Polish**

1. Refine(1) enhances clarity and completeness
2. Final thought scores 9.5
3. Output: Best path through graph becomes research report

**What Makes This True GoT:**

- Graph maintained throughout with nodes, edges, scores
- Multiple paths explored in parallel
- Pruning drops weak branches
- Scoring guides exploration vs exploitation
- Optimal solution found through graph traversal

---

## Citation Requirements & Source Traceability

### Mandatory Citation Standards

**Every factual claim must include:**

1. **Author/Organization** - Who made this claim
2. **Date** - When the information was published
3. **Source Title** - Name of paper, article, or report
4. **URL/DOI** - Direct link to verify the source
5. **Page Numbers** - For lengthy documents (when applicable)

### Citation Formats

**Academic Papers:**

```
(Author et al., Year, p. XX) with full citation in references
Example: (Smith et al., 2023, p. 145)
Full: Smith, J., Johnson, K., & Lee, M. (2023). "Title of Paper." Journal Name, 45(3), 140-156. https://doi.org/10.xxxx/xxxxx
```

**Web Sources:**

```
(Organization, Year, Section Title)
Example: (NIH, 2024, "Treatment Guidelines")
Full: National Institutes of Health. (2024). "Treatment Guidelines for Metabolic Syndrome." Retrieved [date] from https://www.nih.gov/specific-page
```

**Direct Quotes:**

```
"Exact quote from source" (Author, Year, p. XX)
```

### Source Quality Ratings

Rate every source using this A-E scale:

- **A**: Peer-reviewed RCTs, systematic reviews, meta-analyses
- **B**: Cohort studies, case-control studies, clinical guidelines, reputable analysts
- **C**: Expert opinion, case reports, mechanistic studies
- **D**: Preliminary research, preprints, conference abstracts, blogs
- **E**: Anecdotal, theoretical, or speculative

### Source Verification Protocol

1. **Primary Sources Only** - Link to original research, not secondary reporting
2. **Archive Links** - For time-sensitive content, include archive.org links
3. **Multiple Confirmations** - Critical claims need 2+ independent sources
4. **Conflicting Data** - Note when sources disagree and explain discrepancies
5. **Recency Check** - Prioritize sources from last 2 years when relevant

### Traceability Requirements

**For Medical/Health Information:**

- PubMed ID (PMID) when available
- Clinical trial registration numbers
- FDA/regulatory body references
- Version/update dates for guidelines

**For Genetic Information:**

- dbSNP rs numbers
- Gene database links (OMIM, GeneCards)
- Population frequency sources (gnomAD, 1000 Genomes)
- Effect size sources with confidence intervals

**For Statistical Claims:**

- Sample sizes
- P-values and confidence intervals
- Statistical methods used
- Data availability statements

### Source Documentation Structure

Each research output must include:

1. **Inline Citations** - Throughout the text
2. **References Section** - Full bibliography at end
3. **Source Quality Table** - Rating each source A-E
4. **Verification Checklist** - Confirming each claim is sourced
5. **Data Availability** - Where raw data can be accessed

### Example Implementation

**Poor Citation:**
"Studies show that metformin reduces diabetes risk."

**Proper Citation:**
"The Diabetes Prevention Program demonstrated that metformin reduces diabetes incidence by 31% over 2.8 years in high-risk individuals (Knowler et al., 2002, NEJM, PMID: 11832527, <https://doi.org/10.1056/NEJMoa012512>)"

### Red Flags for Unreliable Sources

- No author attribution
- Missing publication dates
- Broken or suspicious URLs
- Claims without data
- Conflicts of interest not disclosed
- Predatory journals
- Retracted papers (check RetractionWatch)

---

## Advanced Research Methodologies

### Chain-of-Verification (CoVe)

To prevent hallucinations:

1. Generate initial research findings
2. Create verification questions for each claim
3. Search for evidence to answer verification questions
4. Revise findings based on verification results
5. Repeat until all claims are verified

### Chain-of-Density (CoD) Summarization

When processing sources, use iterative refinement to increase information density:

1. First pass: Extract key points (low density)
2. Second pass: Add supporting details and context
3. Third pass: Compress while preserving all critical information
4. Final pass: Maximum density with all essential facts and citations

### ReAct Pattern (Reason + Act)

Agents should follow this loop:

1. **Reason**: Analyze what information is needed
2. **Act**: Execute search or retrieval action
3. **Observe**: Process the results
4. **Reason**: Determine if more information needed
5. **Repeat**: Continue until sufficient evidence gathered

### Multi-Agent Orchestration Roles

For complex topics, deploy specialized agents:

- **Planner Agent**: Decomposes research into subtopics
- **Search Agents**: Execute queries and retrieve sources
- **Synthesis Agents**: Combine findings from multiple sources
- **Critic Agents**: Verify claims and check for errors
- **Editor Agent**: Polishes final output

### Human-in-the-Loop Checkpoints

Critical intervention points:

1. **After Planning**: Approve research strategy
2. **During Verification**: Expert review of technical claims
3. **Before Finalization**: Stakeholder sign-off
4. **Post-Delivery**: Feedback incorporation

---

## Implementation Tools

### Core Tools

1. **WebSearch**: Built-in web search capability for finding relevant sources
2. **WebFetch**: For extracting and analyzing content from specific URLs
3. **Read/Write**: For managing research documents locally
4. **Task**: For spawning autonomous agents for complex multi-step operations
5. **TodoWrite**: For tracking research progress

### MCP Server Tools

1. **mcp__filesystem__**: File system operations (read, write, search files)
2. **mcp__puppeteer__**: Browser automation for dynamic web content
   - Navigate to pages requiring JavaScript
   - Take screenshots of web content
   - Extract data from interactive websites
   - Fill forms and interact with web elements

### Web Research Strategy

- **Primary**: Use WebSearch tool for general web searches
- **Secondary**: Use WebFetch for extracting content from specific URLs
- **Advanced**: Use mcp__puppeteer__ for sites requiring interaction or JavaScript rendering
- **Note**: When MCP web fetch tools become available, prefer them over WebFetch

### Tool Usage Instructions

**WebSearch Usage:**

```
Use WebSearch with specific queries:
- Include key terms in quotes for exact matches
- Use domain filtering for authoritative sources
- Try multiple query variations
```

**WebFetch Usage:**

```
After WebSearch identifies URLs:
1. Use WebFetch with targeted prompts
2. Ask for specific information extraction
3. Request summaries of long content
```

**Puppeteer MCP Usage:**

```
For JavaScript-heavy sites:
1. mcp__puppeteer__puppeteer_navigate to URL
2. mcp__puppeteer__puppeteer_screenshot for visual content
3. mcp__puppeteer__puppeteer_evaluate to extract dynamic data
```

---

## Mitigation Strategies

### Hallucination Prevention

- Always ground statements in source material
- Use Chain-of-Verification for critical claims
- Cross-reference multiple sources
- Explicitly state uncertainty when appropriate
- Never make claims without sources - state "Source needed" if uncertain

### Coverage Optimization

- Use diverse search queries
- Check multiple perspectives
- Include recent sources (check dates)
- Acknowledge limitations and gaps
- Search across different source types (academic, industry, news)

### Citation Management

- Track source URLs and access dates
- Quote relevant passages verbatim when needed
- Maintain source-to-statement mapping
- Use consistent citation format
- Create bibliography as research progresses

---

## User Interaction Protocol

### Initial Question Gathering Phase

When a user requests deep research, engage in structured dialogue to gather all necessary information before beginning research.

### Required Information Checklist

Before starting research, clarify:

**1. Core Research Question**

- Main topic or question to investigate
- Specific aspects or angles of interest
- What problem are you trying to solve?

**2. Output Requirements**

- Desired format (report, presentation, analysis, etc.)
- Length expectations (executive summary vs comprehensive report)
- File structure preferences (single document vs folder with multiple files)
- Visual requirements (charts, graphs, diagrams, images)

**3. Scope & Boundaries**

- Geographic focus (global, specific countries/regions)
- Time period (current, historical, future projections)
- Industry or domain constraints
- What should be excluded from research?

**4. Sources & Credibility**

- Preferred source types (academic, industry, news, etc.)
- Any sources to prioritize or avoid
- Required credibility level (peer-reviewed only, industry reports ok, etc.)

**5. Deliverable Structure**

- Folder organization preferences
- Naming conventions for files
- Whether to include:
  - Raw research notes
  - Source PDFs/screenshots
  - Data files (CSV, JSON)
  - Visualization source files

**6. Special Requirements**

- Specific data or statistics needed
- Comparison frameworks to use
- Regulatory or compliance considerations
- Target audience for the research

### Question Templates

**1. Topic Clarification**

- "What specific aspects of [topic] are most important for your needs?"
- "Are you looking for current state analysis, historical trends, or future predictions?"

**2. Output Specification**

- "Would you prefer a single comprehensive report or multiple focused documents?"
- "Do you need visualizations? If so, what types would be most helpful?"

**3. Scope Definition**

- "Are there any geographic regions or time periods I should focus on?"
- "What level of technical detail is appropriate for your audience?"

**4. Source Preferences**

- "Do you have any preferred sources or databases I should prioritize?"
- "Are there any sources or viewpoints I should avoid?"

**5. Delivery Format**

- "How would you like the files organized?"
- "Do you need the raw research data or just the final analysis?"

### Research Plan Approval

Before executing research:

1. Present subtopic breakdown
2. Show agent deployment strategy
3. Describe expected output structure
4. Get user approval to proceed

---

## Key Principles of Deep Research

### Iterative Refinement

Deep research is not linear - it's a continuous loop of:

1. **Search**: Find relevant information
2. **Read**: Extract key insights
3. **Refine**: Generate new queries based on findings
4. **Verify**: Cross-check claims across sources
5. **Synthesize**: Combine into coherent narrative
6. **Repeat**: Continue until comprehensive coverage

### Why This Outperforms Manual Research

- **Breadth**: AI can process 20+ sources in minutes vs days for humans
- **Depth**: Multi-step reasoning uncovers non-obvious connections
- **Consistency**: Systematic approach ensures no gaps
- **Traceability**: Every claim linked to source
- **Efficiency**: Handles low-level tasks, freeing humans for analysis
- **Parallel Processing**: Multiple agents work simultaneously

### State Management

Throughout the research process, maintain:

- Current research questions
- Sources visited and their quality scores
- Extracted claims and verification status
- Graph state (for GoT implementation)
- Progress tracking against original plan
- Agent findings and synthesis notes

---

## Ready to Begin

This methodology provides everything needed for Graph of Thoughts deep research:

- **Self-contained** - No external files or dependencies required
- **Automatic execution** - Deploys immediately when you request research
- **True GoT implementation** - Graph state, scoring, pruning, and optimization
- **Uses available tools** - WebSearch, WebFetch, Task agents, Puppeteer
- **Transparent process** - Saves graph states and execution traces
- **Rigorous quality** - Citation validation and verification protocols

### To Start Deep Research

Simply say: **"Deep research [your topic]"**

**The system will:**

1. Ask clarifying questions if needed
2. Deploy a GoT Controller to manage the graph
3. Launch transformation agents (Generate, Refine, Aggregate)
4. Explore multiple research paths with scoring
5. Deliver the optimal research findings with complete citations

**No Python setup, no API keys, no external frameworks needed** - everything runs using the Task agent system to implement proper Graph of Thoughts reasoning.

---

*For quick reference, see [CLAUDE.md](CLAUDE.md). For system architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md).*
