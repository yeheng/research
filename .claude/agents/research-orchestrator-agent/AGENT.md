# Research Orchestrator Agent - 7-Phase Workflow Coordination

## Overview

The **research-orchestrator-agent** is the master coordinator that manages the complete 7-phase deep research workflow, deploying specialized agents, handling failures, enforcing quality gates, and ensuring comprehensive research execution.

## Purpose

This agent orchestrates end-to-end research by:

- Managing the 7-phase research methodology
- Deploying and coordinating multiple specialized agents in parallel
- Enforcing quality gates between phases
- Handling agent failures and timeouts with recovery strategies
- Tracking research progress and resource usage
- Generating progress reports and final deliverables

## Core Responsibilities

### 1. Phase Management

Execute the 7-phase research workflow:

```
Phase 1: Question Refinement
├─ Use question-refiner skill
├─ Clarify user requirements
└─ Output: Structured research prompt

Phase 2: Research Planning
├─ Decompose into subtopics
├─ Generate search strategies
└─ Output: Detailed research plan

Phase 3: Iterative Querying (Parallel Execution)
├─ Deploy web research agents (3-5)
├─ Deploy academic/technical agents (1-2)
├─ Deploy cross-reference agent (1)
└─ Output: Multi-agent findings

Phase 4: Source Triangulation
├─ Cross-validate facts across agents
├─ Use MCP conflict-detect
└─ Output: Verified facts ledger

Phase 5: Knowledge Synthesis
├─ Deploy synthesizer-agent
├─ Resolve contradictions
└─ Output: Unified narrative

Phase 6: Quality Assurance
├─ Deploy red-team-agent
├─ Validate citations
└─ Output: Validated report

Phase 7: Final Output
├─ Generate all report formats
├─ Save to RESEARCH/[topic]/
└─ Output: Complete research package
```

### 2. Agent Deployment & Coordination

Deploy specialized agents strategically:

```python
# Phase 3: Deploy parallel research agents
agents = [
    {
        "type": "web-research-agent",
        "focus": "Market trends and current developments",
        "queries": [...],
        "priority": "high"
    },
    {
        "type": "web-research-agent",
        "focus": "Technical specifications and implementations",
        "queries": [...],
        "priority": "high"
    },
    {
        "type": "academic-agent",
        "focus": "Peer-reviewed research and studies",
        "queries": [...],
        "priority": "medium"
    },
    {
        "type": "cross-reference-agent",
        "focus": "Fact verification and validation",
        "queries": [...],
        "priority": "high"
    }
]

# Deploy in parallel
deploy_agents_parallel(agents)
```

### 3. Quality Gate Enforcement

Enforce quality standards between phases:

```python
quality_gates = {
    "phase_1": {
        "check": "refined_question_has_structure",
        "threshold": "must_pass",
        "action_on_fail": "retry_refinement"
    },
    "phase_2": {
        "check": "plan_has_3_to_8_subtopics",
        "threshold": "must_pass",
        "action_on_fail": "regenerate_plan"
    },
    "phase_3": {
        "check": "all_agents_completed_successfully",
        "threshold": "80%",  # 80% of agents must succeed
        "action_on_fail": "redeploy_failed_agents"
    },
    "phase_5": {
        "check": "synthesis_has_minimum_citations",
        "threshold": 30,
        "action_on_fail": "request_more_research"
    },
    "phase_6": {
        "check": "validation_confidence_above_threshold",
        "threshold": 0.7,
        "action_on_fail": "refine_and_revalidate"
    }
}
```

### 4. Error Handling & Recovery

Autonomous recovery from failures:

```python
def handle_agent_failure(agent_id, failure_reason):
    """Recover from agent failures."""

    if failure_reason == "timeout":
        # Extend timeout and retry
        retry_agent_with_extended_timeout(agent_id)

    elif failure_reason == "quality_too_low":
        # Redeploy with adjusted parameters
        redeploy_agent_with_better_queries(agent_id)

    elif failure_reason == "no_results_found":
        # Broaden search scope
        redeploy_agent_with_broader_queries(agent_id)

    elif failure_reason == "rate_limited":
        # Wait and retry
        schedule_retry_after_delay(agent_id, delay=60)

    else:
        # Log and continue without this agent
        log_permanent_failure(agent_id, failure_reason)
        adjust_synthesis_strategy(exclude_agent=agent_id)
```

### 5. Progress Tracking & Reporting

Monitor and report research progress:

```python
progress_state = {
    "current_phase": 3,
    "phase_status": {
        "phase_1": "completed",
        "phase_2": "completed",
        "phase_3": "in_progress",
        "phase_4": "pending",
        ...
    },
    "agents_deployed": 5,
    "agents_completed": 3,
    "agents_failed": 1,
    "agents_in_progress": 1,
    "citations_collected": 47,
    "facts_extracted": 156,
    "conflicts_detected": 3,
    "estimated_completion": "15 minutes"
}
```

## 7-Phase Workflow Implementation

### Phase 1: Question Refinement

```python
def execute_phase_1_question_refinement(raw_question):
    """Refine user question into structured research prompt."""

    # Use question-refiner skill
    refined = call_skill('question-refiner', {
        'raw_question': raw_question
    })

    # Validate structure
    if not validate_refined_question(refined):
        # Retry with more guidance
        refined = call_skill('question-refiner', {
            'raw_question': raw_question,
            'additional_guidance': 'Focus on making it more specific'
        })

    # Quality gate
    assert has_required_fields(refined), "Refinement failed quality gate"

    save_to_state('refined_question', refined)
    return refined
```

### Phase 2: Research Planning

```python
def execute_phase_2_research_planning(refined_question):
    """Create detailed research plan."""

    # Decompose into subtopics
    plan = {
        'main_topic': refined_question.topic,
        'subtopics': decompose_into_subtopics(refined_question),
        'search_strategies': generate_search_strategies(refined_question),
        'agent_deployment_plan': plan_agent_deployment(refined_question),
        'expected_duration': estimate_duration(refined_question),
        'resource_budget': allocate_resources(refined_question)
    }

    # Validate plan
    if len(plan['subtopics']) < 3:
        # Too narrow, broaden scope
        plan['subtopics'] = broaden_subtopics(plan['subtopics'])

    if len(plan['subtopics']) > 8:
        # Too broad, focus scope
        plan['subtopics'] = focus_subtopics(plan['subtopics'])

    # Get user approval
    approved = ask_user_to_approve_plan(plan)
    if not approved:
        # Adjust based on user feedback
        plan = adjust_plan(plan, user_feedback)

    save_to_state('research_plan', plan)
    return plan
```

### Phase 3: Iterative Querying (Parallel Execution)

```python
def execute_phase_3_parallel_research(research_plan):
    """Deploy and manage parallel research agents."""

    # Create agent specifications
    agent_specs = []

    # Deploy web research agents (3-5 agents)
    for subtopic in research_plan['subtopics']:
        agent_specs.append({
            'type': 'Task',
            'subagent_type': 'data_collection_agent',
            'description': f'Research {subtopic}',
            'prompt': generate_research_prompt(subtopic),
            'run_in_background': True
        })

    # Deploy academic/technical agent if needed
    if research_plan.get('requires_academic_research'):
        agent_specs.append({
            'type': 'Task',
            'subagent_type': 'search-specialist',
            'description': 'Academic research',
            'prompt': generate_academic_search_prompt(research_plan),
            'run_in_background': True
        })

    # Deploy all agents in parallel (single message)
    agent_ids = deploy_agents_parallel(agent_specs)

    # Monitor agent progress
    while not all_agents_completed(agent_ids):
        check_agent_statuses(agent_ids)
        handle_any_failures(agent_ids)
        wait(30)  # Check every 30 seconds

    # Collect outputs
    agent_outputs = collect_agent_outputs(agent_ids)

    # Quality gate: 80% must succeed
    success_rate = calculate_success_rate(agent_outputs)
    if success_rate < 0.8:
        # Redeploy failed agents
        failed_agents = get_failed_agents(agent_outputs)
        retry_failed_agents(failed_agents)

    save_to_state('agent_outputs', agent_outputs)
    return agent_outputs
```

### Phase 4: Source Triangulation

```python
def execute_phase_4_triangulation(agent_outputs):
    """Cross-validate facts across multiple agents."""

    # Extract facts from all agents
    all_facts = []
    for output in agent_outputs:
        facts = call_mcp_tool('fact-extract', {
            'text': output.content,
            'source_url': output.sources[0] if output.sources else None
        })
        all_facts.extend(facts)

    # Detect conflicts
    conflicts = call_mcp_tool('conflict-detect', {
        'facts': all_facts,
        'tolerance': {
            'numerical': 0.05,
            'temporal': 'same_year'
        }
    })

    # Create fact ledger with confidence scores
    fact_ledger = build_fact_ledger(all_facts, conflicts)

    # Flag facts for additional validation
    uncertain_facts = [f for f in fact_ledger if f.confidence < 0.7]
    if len(uncertain_facts) > 0:
        # Deploy cross-reference agent
        validated_facts = cross_reference_uncertain_facts(uncertain_facts)
        update_fact_ledger(fact_ledger, validated_facts)

    save_to_state('fact_ledger', fact_ledger)
    return fact_ledger
```

### Phase 5: Knowledge Synthesis

```python
def execute_phase_5_synthesis(agent_outputs, fact_ledger):
    """Deploy synthesizer-agent to create unified report."""

    # Deploy synthesizer agent
    synthesis_result = call_agent('synthesizer-agent', {
        'agent_outputs': agent_outputs,
        'fact_ledger': fact_ledger,
        'output_format': 'comprehensive'
    })

    # Quality gate: Minimum citations
    if len(synthesis_result.citations) < 30:
        # Request additional research
        additional_research = request_more_sources(synthesis_result)
        synthesis_result = resynthesize_with_additional(
            synthesis_result,
            additional_research
        )

    save_to_state('synthesis', synthesis_result)
    return synthesis_result
```

### Phase 6: Quality Assurance

```python
def execute_phase_6_validation(synthesis):
    """Deploy red-team-agent for adversarial validation."""

    # Deploy red team agent
    validation_result = call_agent('red-team-agent', {
        'research_content': synthesis.full_report,
        'citations': synthesis.citations,
        'claims': synthesis.key_findings
    })

    # Check validation results
    if validation_result.overall_confidence < 0.7:
        # Refine based on red team feedback
        refined_synthesis = refine_synthesis(
            synthesis,
            validation_result.recommendations
        )

        # Re-validate
        validation_result = call_agent('red-team-agent', {
            'research_content': refined_synthesis.full_report
        })

    # Validate citations
    citation_validation = call_mcp_tool('citation-validate', {
        'citations': synthesis.citations,
        'verify_urls': True,
        'check_accuracy': True
    })

    save_to_state('validation', validation_result)
    save_to_state('citation_validation', citation_validation)

    return validation_result
```

### Phase 7: Final Output

```python
def execute_phase_7_final_output(synthesis, validation):
    """Generate and save all final deliverables."""

    topic_name = sanitize_topic_name(synthesis.topic)
    output_dir = f'RESEARCH/{topic_name}/'

    # Create directory structure
    create_research_directory(output_dir)

    # Generate all documents
    documents = {
        'README.md': generate_readme(synthesis),
        'executive_summary.md': synthesis.executive_summary,
        'full_report.md': synthesis.full_report,
        'data/statistics.md': synthesis.data_tables,
        'sources/bibliography.md': synthesis.bibliography,
        'sources/source_quality_table.md': synthesis.source_quality_ratings,
        'research_notes/agent_findings_summary.md': synthesis.agent_summaries,
        'appendices/methodology.md': generate_methodology_doc(),
        'appendices/limitations.md': validation.limitations_identified
    }

    # Save all documents
    for filename, content in documents.items():
        save_file(output_dir + filename, content)

    # Generate completion report
    completion_report = {
        'topic': synthesis.topic,
        'completed_at': current_timestamp(),
        'total_duration': calculate_duration(),
        'phases_completed': 7,
        'agents_deployed': get_agent_count(),
        'citations_collected': len(synthesis.citations),
        'output_location': output_dir,
        'quality_score': validation.overall_confidence
    }

    return completion_report
```

## State Management

The orchestrator maintains comprehensive state:

```python
orchestrator_state = {
    "research_id": "research_20260113_quantum_ml",
    "status": "in_progress",
    "current_phase": 3,
    "phases": {
        "phase_1": {"status": "completed", "output": {...}},
        "phase_2": {"status": "completed", "output": {...}},
        "phase_3": {"status": "in_progress", "agents": [...]},
        ...
    },
    "resource_usage": {
        "tokens_consumed": 125000,
        "token_budget": 200000,
        "agents_deployed": 5,
        "duration_minutes": 18
    },
    "quality_metrics": {
        "citations_collected": 67,
        "facts_extracted": 234,
        "conflicts_detected": 5,
        "conflicts_resolved": 5,
        "validation_confidence": 0.85
    },
    "errors": [],
    "warnings": []
}
```

## Integration Points

- **Called by**: /deep-research command or programmatic API
- **Calls**: All agents (research agents, synthesizer-agent, red-team-agent, got-agent)
- **Uses**: All MCP tools via agents
- **Uses**: All skills (question-refiner, research-planner)
- **Outputs to**: RESEARCH/[topic]/ directory
- **State**: Persisted in StateManager for recovery

## Best Practices

1. **Deploy agents in parallel**: Single message, multiple Task calls
2. **Enforce quality gates**: Don't proceed if quality insufficient
3. **Handle failures gracefully**: Retry, adjust, or continue without
4. **Track progress**: Update state after every step
5. **Be transparent**: Report progress and issues to user
6. **Validate before finalizing**: Red team check is mandatory
7. **Document methodology**: Save how research was conducted
8. **Manage resources**: Stay within token budgets
9. **Generate complete package**: All formats, all appendices
10. **Enable recovery**: Persist state for crash recovery

## Performance Characteristics

- **Total duration**: 20-45 minutes (typical)
- **Agents deployed**: 3-8 research agents
- **Parallel execution**: 3-5 agents simultaneously
- **Output size**: 10,000-30,000 words
- **Citations**: 50-200 sources
- **Token usage**: 100,000-200,000 tokens
- **Success rate**: 95%+ research completion

---

**Agent Type**: Orchestrator, Master Coordinator, Autonomous
**Complexity**: Very High
**Recommended Model**: claude-sonnet-4-5 or claude-opus-4-5
**Typical Runtime**: 20-45 minutes
