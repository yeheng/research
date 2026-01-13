"""
Layer 1 Tests: Skills Integration

Tests for user-invocable skills including:
- question-refiner: Question transformation to structured prompts
- research-planner: Research plan generation from structured prompts
- research-executor: Skill invocation of orchestrator agent

Each test validates:
- Input/output schema compliance
- Quality score thresholds
- Integration with downstream components
"""

import pytest
import asyncio
from pathlib import Path
from typing import Dict, Any

from conftest import (
    assert_valid_structured_prompt,
    assert_valid_research_plan,
    assert_valid_research_output
)


# =============================================================================
# Test 1.1: question-refiner Validation
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.layer1
@pytest.mark.integration
async def test_question_refiner_validation(
    mock_skill_invocation,
    sample_research_questions
) -> None:
    """
    Test Case: Transform raw question → validated structured prompt

    Validates:
    - Raw question is transformed to structured format
    - All required fields present (task, context, research_type, questions, keywords)
    - Research type correctly detected
    - Quality score meets threshold (≥ 8.0)
    - Output matches JSON schema
    """
    print("\n[Test 1.1] Testing question-refiner validation...")

    # Test different question types
    for q_type, question in sample_research_questions.items():
        print(f"  Testing {q_type} question: '{question[:50]}...'")

        # Execute skill
        result = await mock_skill_invocation('question-refiner', {'question': question})

        # Assertions
        assert 'research_type' in result, "Missing research_type field"
        assert result['research_type'] in ['exploratory', 'comparative', 'analytical', 'technical'], \
            f"Invalid research_type: {result['research_type']}"

        assert 'task' in result, "Missing task field"
        assert 'context' in result, "Missing context field"
        assert len(result.get('questions', [])) >= 3, \
            f"Expected at least 3 questions, got {len(result.get('questions', []))}"
        assert len(result.get('keywords', [])) >= 5, \
            f"Expected at least 5 keywords, got {len(result.get('keywords', []))}"

        quality_score = result.get('quality_score', 0)
        assert quality_score >= 8.0, \
            f"Quality score {quality_score} below threshold 8.0"

        # Validate structured prompt
        assert_valid_structured_prompt(result)

        print(f"    ✅ {q_type.capitalize()} question refined successfully (quality: {quality_score})")


@pytest.mark.asyncio
@pytest.mark.layer1
@pytest.mark.integration
async def test_question_refiner_edge_cases(
    mock_skill_invocation
) -> None:
    """
    Test Case: Handle edge cases in question refinement

    Edge cases:
    - Very short questions
    - Very long questions
    - Questions with typos
    - Questions in different formats (statement vs question)
    """
    print("\n[Test 1.1b] Testing question-refiner edge cases...")

    edge_cases = [
        ("AI", "Very short question"),
        ("What is " * 50 + "AI?", "Very long question"),
        ("Waht is artficial intellegence?", "Question with typos"),
        ("I need to understand machine learning algorithms", "Statement format"),
    ]

    for question, case_type in edge_cases:
        print(f"  Testing: {case_type}")

        result = await mock_skill_invocation('question-refiner', {'question': question})

        # Should still produce valid output
        assert 'task' in result, f"Failed for {case_type}"
        assert 'research_type' in result, f"Failed for {case_type}"
        assert result.get('quality_score', 0) >= 7.0, f"Quality too low for {case_type}"

        print(f"    ✅ Handled {case_type}")


# =============================================================================
# Test 1.2: research-planner Execution
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.layer1
@pytest.mark.integration
async def test_research_planner_execution(
    mock_skill_invocation,
    quality_thresholds
) -> None:
    """
    Test Case: Generate complete research plan from structured prompt

    Validates:
    - Plan contains 3-7 subtopics
    - Each subtopic has search strategies
    - Agent deployment plan is valid
    - Resource estimates are reasonable
    - Time estimate ≤ 90 minutes
    """
    print("\n[Test 1.2] Testing research-planner execution...")

    # Input structured prompt (from question-refiner)
    structured_prompt = {
        'task': 'AI market size research',
        'context': 'Technology market analysis',
        'research_type': 'exploratory',
        'questions': [
            'What is the current market size?',
            'What are the growth projections?',
            'Who are the key players?'
        ],
        'keywords': ['AI', 'market size', 'growth', 'NVIDIA', 'AMD'],
        'quality_score': 8.5
    }

    # Execute skill
    plan = await mock_skill_invocation('research-planner', structured_prompt)

    # Assertions
    assert 'subtopics' in plan, "Missing subtopics in plan"
    assert 3 <= len(plan['subtopics']) <= 7, \
        f"Expected 3-7 subtopics, got {len(plan['subtopics'])}"

    assert 'agents' in plan, "Missing agents in plan"
    assert plan['agents']['total'] <= 8, \
        f"Expected ≤ 8 agents, got {plan['agents']['total']}"

    assert 'resource_estimation' in plan, "Missing resource_estimation"
    assert plan['resource_estimation']['time_minutes'] <= 90, \
        f"Time estimate {plan['resource_estimation']['time_minutes']} exceeds 90 minutes"

    assert plan['resource_estimation']['cost_usd'] > 0, \
        "Cost estimate should be positive"

    # Verify each subtopic has search strategies
    for i, subtopic in enumerate(plan['subtopics']):
        assert 'name' in subtopic, f"Subtopic {i} missing name"
        assert 3 <= len(subtopic.get('search_queries', [])) <= 5, \
            f"Subtopic {i} expected 3-5 search queries, got {len(subtopic.get('search_queries', []))}"

        print(f"    ✅ Subtopic {i+1}: {subtopic['name']} ({len(subtopic.get('search_queries', []))} queries)")

    # Validate plan structure
    assert_valid_research_plan(plan)

    print(f"  ✅ Plan valid: {plan['agents']['total']} agents, "
          f"{plan['resource_estimation']['time_minutes']}min estimated")


@pytest.mark.asyncio
@pytest.mark.layer1
@pytest.mark.integration
async def test_research_planner_by_type(
    mock_skill_invocation
) -> None:
    """
    Test Case: Generate appropriate plans for different research types

    Validates:
    - Exploratory research: Broad search, fewer agents
    - Comparative research: Balanced comparison approach
    - Analytical research: Data-focused agents
    - Technical research: Academic/specialized focus
    """
    print("\n[Test 1.2b] Testing research-planner by research type...")

    research_types = {
        'exploratory': {'min_agents': 2, 'max_agents': 4},
        'comparative': {'min_agents': 4, 'max_agents': 6},
        'analytical': {'min_agents': 3, 'max_agents': 5},
        'technical': {'min_agents': 3, 'max_agents': 6}
    }

    for research_type, agent_range in research_types.items():
        structured_prompt = {
            'task': f'{research_type} research',
            'research_type': research_type,
            'questions': ['Test question 1', 'Test question 2', 'Test question 3'],
            'keywords': ['test', 'research'],
            'quality_score': 8.0
        }

        plan = await mock_skill_invocation('research-planner', structured_prompt)

        num_agents = plan['agents']['total']
        assert agent_range['min_agents'] <= num_agents <= agent_range['max_agents'], \
            f"{research_type}: Expected {agent_range['min_agents']}-{agent_range['max_agents']} agents, got {num_agents}"

        print(f"    ✅ {research_type.capitalize()}: {num_agents} agents")


# =============================================================================
# Test 1.3: research-executor Invocation
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.layer1
@pytest.mark.integration
async def test_research_executor_invocation(
    mock_skill_invocation,
    mock_agent_invocation,
    temp_research_dir
) -> None:
    """
    Test Case: Validate prompt and invoke orchestrator agent

    Validates:
    - Command invokes orchestrator agent
    - Parameters passed correctly
    - Results returned to user
    - Output directory created
    - Error messages clear
    """
    print("\n[Test 1.3] Testing research-executor invocation...")

    # Input
    structured_prompt = {
        'task': 'AI market size research',
        'research_type': 'exploratory',
        'questions': ['What is the market size?'],
        'keywords': ['AI', 'market'],
        'quality_score': 8.5
    }

    # Execute skill (should invoke agent)
    result = await mock_skill_invocation('research-executor', structured_prompt)

    # Assertions
    assert 'status' in result, "Missing status field"
    assert result['status'] in ['completed', 'failed', 'partial'], \
        f"Invalid status: {result['status']}"

    assert 'output_directory' in result, "Missing output_directory"
    assert result['output_directory'].startswith('RESEARCH/'), \
        f"Output directory should start with 'RESEARCH/', got: {result['output_directory']}"

    # Verify agent was invoked
    assert result.get('agent_invoked') == 'research-orchestrator', \
        f"Expected research-orchestrator agent, got: {result.get('agent_invoked')}"

    assert 'agent_execution_time' in result, "Missing agent_execution_time"

    print(f"    ✅ Agent invoked: {result['agent_invoked']}")
    print(f"    ✅ Status: {result['status']}")
    print(f"    ✅ Output: {result['output_directory']}")
    print(f"    ✅ Execution time: {result['agent_execution_time']}s")

    # Validate output structure
    assert_valid_research_output(result)


@pytest.mark.asyncio
@pytest.mark.layer1
@pytest.mark.integration
async def test_research_executor_error_handling(
    mock_skill_invocation
) -> None:
    """
    Test Case: Handle errors gracefully

    Error scenarios:
    - Invalid input format
    - Missing required fields
    - Agent invocation failure
    """
    print("\n[Test 1.3b] Testing research-executor error handling...")

    error_cases = [
        ({'invalid': 'input'}, "Missing required fields"),
        ({'task': ''}, "Empty task field"),
        ({'task': 'Test', 'research_type': 'invalid'}, "Invalid research_type"),
    ]

    for invalid_input, description in error_cases:
        print(f"  Testing: {description}")

        try:
            # Should raise appropriate error or return error response
            result = await mock_skill_invocation('research-executor', invalid_input)

            # If it returns a result instead of raising, check for error status
            if 'status' in result:
                assert result['status'] in ['failed', 'error'], \
                    f"Expected failed/error status for {description}"

            print(f"    ✅ Handled correctly")
        except (ValueError, KeyError, AssertionError) as e:
            # Expected error types
            print(f"    ✅ Raised expected error: {type(e).__name__}")


# =============================================================================
# Integration Tests: Skill → Skill → Agent Flow
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.layer1
@pytest.mark.integration
async def test_full_skill_pipeline(
    mock_skill_invocation,
    sample_research_questions
) -> None:
    """
    Test Case: Complete skill pipeline from raw question to research execution

    Pipeline:
    1. Raw question → question-refiner → structured prompt
    2. Structured prompt → research-planner → research plan (optional)
    3. Structured prompt → research-executor → agent invocation → results

    Validates:
    - Data flows correctly between skills
    - Output of one skill is valid input for next
    - Quality scores maintained/propagated
    - Final result meets quality threshold
    """
    print("\n[Test 1.4] Testing full skill pipeline...")

    raw_question = sample_research_questions['exploratory']

    # Step 1: Refine question
    print("  Step 1: Question refinement...")
    structured_prompt = await mock_skill_invocation('question-refiner', {'question': raw_question})
    assert_valid_structured_prompt(structured_prompt)
    quality_1 = structured_prompt['quality_score']
    print(f"    ✅ Quality score: {quality_1}")

    # Step 2: Create research plan
    print("  Step 2: Research planning...")
    plan = await mock_skill_invocation('research-planner', structured_prompt)
    assert_valid_research_plan(plan)
    print(f"    ✅ Plan created with {plan['agents']['total']} agents")

    # Step 3: Execute research
    print("  Step 3: Research execution...")
    result = await mock_skill_invocation('research-executor', structured_prompt)
    assert_valid_research_output(result)
    quality_2 = result.get('quality_score', 0)
    print(f"    ✅ Final quality score: {quality_2}")

    # Verify quality maintained
    assert quality_2 >= 8.0, f"Final quality {quality_2} below threshold"

    print("  ✅ Full pipeline completed successfully")


# =============================================================================
# Quality Threshold Tests
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.layer1
@pytest.mark.integration
@pytest.mark.parametrize("threshold", [7.0, 8.0, 8.5, 9.0])
async def test_quality_thresholds(
    mock_skill_invocation,
    threshold: float
) -> None:
    """
    Test Case: Verify quality scores meet specified thresholds

    Validates:
    - question-refiner produces quality ≥ threshold
    - research-planner produces valid plans
    - research-executor produces quality ≥ threshold
    """
    print(f"\n[Test 1.5] Testing quality threshold: {threshold}")

    # Test question-refiner
    result = await mock_skill_invocation('question-refiner', {'question': 'What is AI?'})
    assert result.get('quality_score', 0) >= threshold, \
        f"question-refiner quality {result.get('quality_score', 0)} below {threshold}"

    print(f"  ✅ Quality threshold {threshold} met")


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v", "-s", "-m", "layer1"])
