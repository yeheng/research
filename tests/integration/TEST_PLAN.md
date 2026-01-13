# Integration Test Plan - Deep Research Framework v2.0

## Overview

This document outlines the comprehensive integration testing strategy for the refactored Deep Research Framework, covering all three architectural layers and their interactions.

## Test Architecture

```
┌─────────────────────────────────────┐
│  Layer 1 Tests: Skills              │
│  - question-refiner validation      │
│  - research-planner execution       │
│  - research-executor invocation     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Layer 2 Tests: Agents              │
│  - research-orchestrator workflow   │
│  - got-agent optimization           │
│  - red-team-agent validation        │
│  - synthesizer-agent aggregation    │
│  - ontology-scout-agent recon       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Layer 3 Tests: Infrastructure      │
│  - MCP tools functionality          │
│  - StateManager operations          │
│  - Cross-layer integration          │
└─────────────────────────────────────┘
```

---

## Test Categories

### Category 1: Unit Integration Tests
**Purpose**: Test individual component integration
**Execution Time**: 5-10 minutes per test
**Coverage Target**: 80%+

### Category 2: Workflow Integration Tests
**Purpose**: Test complete research workflows
**Execution Time**: 20-45 minutes per test
**Coverage Target**: All 7 phases

### Category 3: Failure Recovery Tests
**Purpose**: Test error handling and recovery
**Execution Time**: 15-30 minutes per test
**Coverage Target**: All critical failure modes

### Category 4: Performance Tests
**Purpose**: Test scalability and resource usage
**Execution Time**: 30-60 minutes per test
**Coverage Target**: Token budgets, time limits

---

## Layer 1 Tests: Skills Integration

### Test 1.1: question-refiner Validation

**Test Case**: Transform raw question → validated structured prompt

```python
def test_question_refiner_validation():
    """Test question refinement with validation"""

    # Input
    raw_question = "What is quantum computing?"

    # Execute skill
    result = invoke_skill('question-refiner', raw_question)

    # Assertions
    assert result['research_type'] in ['exploratory', 'comparative', ...]
    assert 'task' in result
    assert 'context' in result
    assert len(result['questions']) >= 3
    assert len(result['keywords']) >= 5
    assert result['quality_score'] >= 8.0

    # Validation
    assert validate_json_schema(result, structured_prompt_schema)

    print("✅ question-refiner validation passed")
```

**Expected Outcome**: Structured prompt with quality score ≥ 8.0

---

### Test 1.2: research-planner Execution

**Test Case**: Generate complete research plan from structured prompt

```python
def test_research_planner_execution():
    """Test research plan generation"""

    # Input (from question-refiner)
    structured_prompt = {...}

    # Execute skill
    plan = invoke_skill('research-planner', structured_prompt)

    # Assertions
    assert 3 <= len(plan['subtopics']) <= 7
    assert plan['agents']['total'] <= 8
    assert plan['resource_estimation']['time_minutes'] <= 90
    assert plan['resource_estimation']['cost_usd'] > 0

    # Verify each subtopic has search strategies
    for subtopic in plan['subtopics']:
        assert 3 <= len(subtopic['search_queries']) <= 5

    print("✅ research-planner execution passed")
```

**Expected Outcome**: Valid research plan with resource estimates

---

### Test 1.3: research-executor Invocation

**Test Case**: Validate prompt and invoke orchestrator agent

```python
def test_research_executor_invocation():
    """Test research executor skill"""

    # Input
    structured_prompt = {...}

    # Execute skill (should invoke agent)
    result = invoke_skill('research-executor', structured_prompt)

    # Assertions
    assert result['status'] in ['completed', 'failed']
    assert 'output_directory' in result
    assert result['output_directory'].startswith('RESEARCH/')

    # Verify agent was invoked
    assert result['agent_invoked'] == 'research-orchestrator'
    assert 'agent_execution_time' in result

    print("✅ research-executor invocation passed")
```

**Expected Outcome**: Agent successfully invoked, results returned

---

## Layer 2 Tests: Agent Integration

### Test 2.1: research-orchestrator-agent Full Workflow

**Test Case**: Execute complete 7-phase research workflow

```python
def test_orchestrator_full_workflow():
    """Test complete 7-phase research execution"""

    # Input
    research_prompt = {...}

    # Execute agent
    agent_id = invoke_agent('research-orchestrator', research_prompt)

    # Monitor progress
    for phase in range(1, 8):
        status = wait_for_phase_completion(agent_id, phase)
        assert status['phase'] == phase
        assert status['status'] == 'completed'

    # Final result
    result = get_agent_result(agent_id)

    # Assertions
    assert result['phases_completed'] == 7
    assert result['quality_score'] >= 8.0
    assert result['citations_count'] >= 30
    assert os.path.exists(result['output_directory'])

    # Verify output files
    output_dir = result['output_directory']
    assert os.path.exists(f'{output_dir}/executive_summary.md')
    assert os.path.exists(f'{output_dir}/full_report.md')
    assert os.path.exists(f'{output_dir}/sources/bibliography.md')

    print("✅ orchestrator full workflow passed")
```

**Expected Outcome**: All 7 phases completed, quality ≥ 8.0, complete output

---

### Test 2.2: got-agent Graph Optimization

**Test Case**: GoT operations for research path optimization

```python
def test_got_agent_optimization():
    """Test Graph of Thoughts agent"""

    # Input
    research_question = "AI market size 2024"
    config = {
        'token_budget': 50000,
        'quality_threshold': 8.5,
        'max_depth': 3
    }

    # Execute agent
    agent_id = invoke_agent('got-agent', research_question, config)

    # Monitor operations
    operations = []
    while not is_complete(agent_id):
        op = get_latest_operation(agent_id)
        operations.append(op)
        time.sleep(5)

    # Assertions
    assert any(op['type'] == 'Generate' for op in operations)
    assert any(op['type'] == 'Score' for op in operations)
    assert any(op['type'] == 'Aggregate' for op in operations)

    # Verify final result
    result = get_agent_result(agent_id)
    assert result['final_score'] >= config['quality_threshold']
    assert result['tokens_used'] <= config['token_budget']

    print("✅ got-agent optimization passed")
```

**Expected Outcome**: Quality threshold reached within budget

---

### Test 2.3: red-team-agent Validation

**Test Case**: Adversarial validation of research findings

```python
def test_red_team_validation():
    """Test red team adversarial validation"""

    # Input: Research findings with claims
    findings = {
        'claims': [
            {'claim': 'AI market is $184B in 2024', 'source': '...'},
            {'claim': 'NVIDIA has 80% market share', 'source': '...'}
        ]
    }

    # Execute agent
    agent_id = invoke_agent('red-team-agent', findings)
    result = get_agent_result(agent_id)

    # Assertions
    assert 'validation_results' in result
    assert len(result['validation_results']) == len(findings['claims'])

    for validation in result['validation_results']:
        assert validation['decision'] in ['Accept', 'Refine', 'Reject']
        assert 'counter_evidence' in validation
        assert 'confidence_adjustment' in validation

    print("✅ red-team validation passed")
```

**Expected Outcome**: Each claim validated with decision and reasoning

---

### Test 2.4: synthesizer-agent Aggregation

**Test Case**: Aggregate findings from multiple agents

```python
def test_synthesizer_aggregation():
    """Test synthesizer agent findings aggregation"""

    # Input: Outputs from 5 research agents
    agent_outputs = [
        {'agent_id': 'agent_1', 'findings': '...', 'citations': [...]},
        {'agent_id': 'agent_2', 'findings': '...', 'citations': [...]},
        # ... 3 more agents
    ]

    # Execute agent
    agent_id = invoke_agent('synthesizer-agent', agent_outputs)
    result = get_agent_result(agent_id)

    # Assertions
    assert 'synthesized_report' in result
    assert result['total_citations'] >= 30
    assert 'conflicts_detected' in result
    assert 'conflicts_resolved' in result

    # Verify narrative coherence
    report = result['synthesized_report']
    assert len(report.split('\n\n')) >= 5  # Multiple paragraphs

    print("✅ synthesizer aggregation passed")
```

**Expected Outcome**: Coherent narrative with resolved conflicts

---

### Test 2.5: ontology-scout-agent Reconnaissance

**Test Case**: Domain reconnaissance and taxonomy building

```python
def test_ontology_scout_reconnaissance():
    """Test ontology scout domain mapping"""

    # Input: Unfamiliar domain
    domain = "Quantum Machine Learning"

    # Execute agent
    agent_id = invoke_agent('ontology-scout-agent', domain)
    result = get_agent_result(agent_id)

    # Assertions
    assert 'taxonomy' in result
    assert len(result['taxonomy']['level_2']) >= 3
    assert 'key_terminology' in result
    assert len(result['key_terminology']) >= 10

    # Verify execution time < 10 minutes
    assert result['execution_time_seconds'] < 600

    print("✅ ontology scout reconnaissance passed")
```

**Expected Outcome**: 3-level taxonomy built in <10 minutes

---

## Layer 3 Tests: Infrastructure Integration

### Test 3.1: MCP Tools Functionality

**Test Case**: All MCP tools work correctly

```python
def test_mcp_tools_functionality():
    """Test all MCP tools"""

    # Test fact-extract
    facts = call_mcp_tool('fact-extract', {
        'text': 'The AI market reached $184B in 2024.',
        'source_url': 'https://example.com'
    })
    assert len(facts['facts']) > 0

    # Test entity-extract
    entities = call_mcp_tool('entity-extract', {
        'text': 'NVIDIA and AMD compete in the GPU market.',
        'entity_types': ['company']
    })
    assert len(entities['entities']) >= 2

    # Test citation-validate
    validation = call_mcp_tool('citation-validate', {
        'citations': [{'author': 'Smith', 'date': '2024', 'title': 'AI Report', 'url': 'https://example.com'}]
    })
    assert validation['total_citations'] == 1

    # Test source-rate
    rating = call_mcp_tool('source-rate', {
        'source_url': 'https://scholar.google.com/...',
        'source_type': 'academic'
    })
    assert rating['quality_rating'] == 'A'

    # Test conflict-detect
    conflicts = call_mcp_tool('conflict-detect', {
        'facts': [
            {'entity': 'AI Market', 'attribute': 'size', 'value': '184'},
            {'entity': 'AI Market', 'attribute': 'size', 'value': '210'}
        ]
    })
    assert len(conflicts['conflicts']) > 0

    print("✅ MCP tools functionality passed")
```

**Expected Outcome**: All 5 core tools functional

---

### Test 3.2: StateManager Operations

**Test Case**: State management across research lifecycle

```python
def test_statemanager_operations():
    """Test StateManager CRUD operations"""

    from scripts.state_manager import StateManager, ResearchSession, GoTNode

    sm = StateManager()

    # Create session
    session = sm.create_session(ResearchSession(
        session_id='test-001',
        research_topic='Test Topic'
    ))
    assert session.session_id == 'test-001'

    # Create GoT node
    node = sm.create_got_node(GoTNode(
        node_id='node-001',
        session_id='test-001',
        content='Test content',
        quality_score=8.5
    ))
    assert node.quality_score == 8.5

    # Register agent
    from scripts.state_manager import ResearchAgent
    agent = sm.register_agent(ResearchAgent(
        agent_id='agent-001',
        session_id='test-001',
        agent_type='web-research',
        agent_role='Market data'
    ))
    assert agent.agent_id == 'agent-001'

    # Add fact
    from scripts.state_manager import Fact
    fact = sm.add_fact(Fact(
        entity='AI Market',
        attribute='size',
        value='$184B',
        session_id='test-001'
    ))
    assert fact.fact_id is not None

    # Cleanup
    sm.delete_session('test-001')
    sm.close()

    print("✅ StateManager operations passed")
```

**Expected Outcome**: All CRUD operations functional

---

## Workflow Integration Tests

### Test 4.1: Simple Exploratory Research

**Test Case**: End-to-end simple research workflow

```python
def test_simple_exploratory_research():
    """Test complete simple research workflow"""

    # Phase 1: Question Refinement
    raw_question = "What is quantum computing?"
    structured_prompt = invoke_skill('question-refiner', raw_question)
    assert structured_prompt['research_type'] == 'exploratory'

    # Phase 2: Research Planning (optional)
    plan = invoke_skill('research-planner', structured_prompt)
    assert plan['agents']['total'] <= 3  # Simple research
    assert plan['resource_estimation']['time_minutes'] <= 30

    # Phase 3: Research Execution
    result = invoke_skill('research-executor', structured_prompt)
    assert result['status'] == 'completed'

    # Verify output
    output_dir = result['output_directory']
    assert os.path.exists(f'{output_dir}/executive_summary.md')

    # Verify quality
    assert result['quality_score'] >= 8.0
    assert result['citations_count'] >= 10

    print("✅ Simple exploratory research passed")
```

**Expected Outcome**: Complete workflow < 30 min, quality ≥ 8.0

---

### Test 4.2: Standard Comparative Research

**Test Case**: End-to-end comparative research

```python
def test_standard_comparative_research():
    """Test complete comparative research workflow"""

    raw_question = "Compare React vs Vue for enterprise applications"

    # Execute workflow
    structured_prompt = invoke_skill('question-refiner', raw_question)
    assert structured_prompt['research_type'] == 'comparative'

    result = invoke_skill('research-executor', structured_prompt)

    # Verify comparative structure
    report = read_file(f"{result['output_directory']}/full_report.md")
    assert 'React' in report
    assert 'Vue' in report
    assert 'Comparison' in report or 'vs' in report

    # Verify quality
    assert result['quality_score'] >= 8.0
    assert result['execution_time_minutes'] <= 60

    print("✅ Standard comparative research passed")
```

**Expected Outcome**: Balanced comparison, quality ≥ 8.0

---

### Test 4.3: Complex Deep Research with GoT

**Test Case**: Complex research using GoT optimization

```python
def test_complex_deep_research_with_got():
    """Test complex research with Graph of Thoughts"""

    raw_question = "Comprehensive analysis of AI chip market"

    # Execute workflow (should auto-enable GoT for complex topics)
    structured_prompt = invoke_skill('question-refiner', raw_question)
    result = invoke_skill('research-executor', structured_prompt)

    # Verify GoT was used
    assert result['got_enabled'] == True
    assert 'got_graph_file' in result

    # Verify complex output
    assert result['subtopics_count'] >= 5
    assert result['agents_deployed'] >= 6
    assert result['citations_count'] >= 50

    # Verify quality optimization
    assert result['quality_score'] >= 8.5
    assert result['execution_time_minutes'] <= 90

    print("✅ Complex deep research with GoT passed")
```

**Expected Outcome**: GoT optimization, quality ≥ 8.5, comprehensive output

---

## Failure Recovery Tests

### Test 5.1: Agent Timeout Recovery

**Test Case**: Handle agent timeout gracefully

```python
def test_agent_timeout_recovery():
    """Test agent timeout handling"""

    # Simulate timeout-prone research
    result = invoke_skill('research-executor', {
        ...
        'execution_config': {'max_time_minutes': 1}  # Very short
    })

    # Should return partial results
    assert result['status'] == 'partial'
    assert 'completed_phases' in result
    assert result['completed_phases'] < 7

    print("✅ Agent timeout recovery passed")
```

**Expected Outcome**: Graceful degradation with partial results

---

### Test 5.2: Quality Threshold Refinement

**Test Case**: Automatic refinement when quality < threshold

```python
def test_quality_threshold_refinement():
    """Test automatic refinement on low quality"""

    # Mock low-quality initial result
    result = invoke_skill('research-executor', {...})

    # Verify refinement was attempted
    assert 'refinement_attempts' in result
    assert result['refinement_attempts'] <= 2

    # Final quality should meet threshold
    assert result['final_quality_score'] >= 8.0

    print("✅ Quality threshold refinement passed")
```

**Expected Outcome**: Quality improved through refinement

---

## Performance Tests

### Test 6.1: Token Budget Compliance

**Test Case**: Verify agents stay within token budgets

```python
def test_token_budget_compliance():
    """Test token budget compliance"""

    result = invoke_skill('research-executor', {
        ...
        'execution_config': {
            'token_budget_per_agent': 15000
        }
    })

    # Verify token usage
    for agent in result['agents']:
        assert agent['tokens_used'] <= 15000

    print("✅ Token budget compliance passed")
```

**Expected Outcome**: All agents respect token limits

---

### Test 6.2: Parallel Agent Execution

**Test Case**: Verify agents execute in parallel

```python
def test_parallel_agent_execution():
    """Test parallel agent deployment"""

    start_time = time.time()
    result = invoke_skill('research-executor', {...})
    execution_time = time.time() - start_time

    # With 5 agents executing in parallel,
    # total time should be ~1x (not 5x)
    agents_deployed = result['agents_deployed']
    expected_sequential_time = agents_deployed * 10  # minutes
    assert execution_time < expected_sequential_time * 0.3  # 30% of sequential

    print("✅ Parallel agent execution passed")
```

**Expected Outcome**: Parallel execution significantly faster than sequential

---

## Test Execution Strategy

### Phase 1: Layer Tests (Week 1)
- Run Tests 1.1-1.3 (Skills)
- Run Tests 2.1-2.5 (Agents)
- Run Tests 3.1-3.2 (Infrastructure)
- **Target**: 100% pass rate on unit integration

### Phase 2: Workflow Tests (Week 2)
- Run Tests 4.1-4.3 (End-to-end workflows)
- **Target**: All workflows complete successfully

### Phase 3: Stress Tests (Week 3)
- Run Tests 5.1-5.2 (Failure recovery)
- Run Tests 6.1-6.2 (Performance)
- **Target**: Graceful degradation, performance within bounds

---

## Success Criteria

| Category | Metric | Target |
|----------|--------|--------|
| **Unit Integration** | Pass rate | 100% |
| **Workflow Integration** | Pass rate | 100% |
| **Failure Recovery** | Graceful degradation | Yes |
| **Performance** | Within budget/time limits | Yes |
| **Coverage** | Code coverage | ≥ 80% |

---

## Continuous Integration

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Python
        uses: actions/setup-python@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          cd .claude/mcp-server && npm install
      - name: Run integration tests
        run: |
          python -m pytest tests/integration/ -v
      - name: Generate coverage report
        run: |
          coverage run -m pytest tests/integration/
          coverage report -m
```

---

## Manual Test Checklist

- [ ] Test 1.1: question-refiner validation
- [ ] Test 1.2: research-planner execution
- [ ] Test 1.3: research-executor invocation
- [ ] Test 2.1: orchestrator full workflow
- [ ] Test 2.2: got-agent optimization
- [ ] Test 2.3: red-team validation
- [ ] Test 2.4: synthesizer aggregation
- [ ] Test 2.5: ontology scout reconnaissance
- [ ] Test 3.1: MCP tools functionality
- [ ] Test 3.2: StateManager operations
- [ ] Test 4.1: Simple exploratory research
- [ ] Test 4.2: Standard comparative research
- [ ] Test 4.3: Complex deep research with GoT
- [ ] Test 5.1: Agent timeout recovery
- [ ] Test 5.2: Quality threshold refinement
- [ ] Test 6.1: Token budget compliance
- [ ] Test 6.2: Parallel agent execution

**Total**: 17 integration tests

---

**Next Steps**:
1. Implement test harness (`tests/integration/test_runner.py`)
2. Create test fixtures and mocks
3. Set up CI/CD pipeline
4. Execute tests and iterate on failures
5. Achieve 80%+ coverage before production deployment
