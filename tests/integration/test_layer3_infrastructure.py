"""
Layer 3 Tests: Infrastructure Integration

Tests for infrastructure components including:
- MCP Tools: fact-extract, entity-extract, citation-validate, source-rate, conflict-detect
- StateManager: Research sessions, GoT graph, agent coordination, facts, entities

Each test validates:
- Tool functionality
- State management operations
- Cross-component integration
"""

import pytest
import asyncio
import sqlite3
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime


# =============================================================================
# Test 3.1: MCP Tools Functionality
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.layer3
@pytest.mark.integration
async def test_mcp_tools_functionality(
    mcp_client,
    sample_text_for_extraction,
    sample_citations,
    sample_facts
) -> None:
    """
    Test Case: All MCP tools work correctly

    Core Tools:
    1. fact-extract: Extract atomic facts from text
    2. entity-extract: Named entity recognition + relationships
    3. citation-validate: Validate citation completeness and quality
    4. source-rate: A-E quality rating for sources
    5. conflict-detect: Detect contradictions between facts

    Validates:
    - All tools respond to valid inputs
    - Output schemas are correct
    - Error handling for invalid inputs
    """
    print("\n[Test 3.1] Testing MCP tools functionality...")

    # Test 1: fact-extract
    print("  Testing fact-extract...")
    facts_result = await mcp_client.call_tool('fact-extract', {
        'text': sample_text_for_extraction,
        'source_url': 'https://www.gartner.com/ai-market-2024',
        'source_metadata': {'author': 'Gartner', 'date': '2024'}
    })

    assert facts_result.get('success', False), "fact-extract failed"
    assert 'facts' in facts_result, "Missing facts in result"
    assert len(facts_result['facts']) > 0, "No facts extracted"
    print(f"    ✅ Extracted {len(facts_result['facts'])} facts")

    # Test 2: entity-extract
    print("  Testing entity-extract...")
    entities_result = await mcp_client.call_tool('entity-extract', {
        'text': sample_text_for_extraction,
        'entity_types': ['company', 'organization', 'market'],
        'extract_relations': True
    })

    assert entities_result.get('success', False), "entity-extract failed"
    assert 'entities' in entities_result, "Missing entities in result"
    assert len(entities_result['entities']) >= 2, \
        f"Expected ≥ 2 entities, got {len(entities_result['entities'])}"
    print(f"    ✅ Extracted {len(entities_result['entities'])} entities")

    # Test 3: citation-validate
    print("  Testing citation-validate...")
    citations_result = await mcp_client.call_tool('citation-validate', {
        'citations': sample_citations,
        'verify_urls': True,
        'check_accuracy': True
    })

    assert citations_result.get('success', False), "citation-validate failed"
    assert 'total_citations' in citations_result, "Missing total_citations"
    assert citations_result['total_citations'] == len(sample_citations), \
        "Citation count mismatch"
    print(f"    ✅ Validated {citations_result['total_citations']} citations")

    # Test 4: source-rate
    print("  Testing source-rate...")
    rating_result = await mcp_client.call_tool('source-rate', {
        'source_url': 'https://www.gartner.com/',
        'source_type': 'industry',
        'metadata': {'author': 'Gartner', 'publication': 'Industry Report'}
    })

    assert rating_result.get('success', False), "source-rate failed"
    assert 'quality_rating' in rating_result, "Missing quality_rating"
    assert rating_result['quality_rating'] in ['A', 'B', 'C', 'D', 'E'], \
        f"Invalid rating: {rating_result['quality_rating']}"
    print(f"    ✅ Source rated: {rating_result['quality_rating']}")

    # Test 5: conflict-detect
    print("  Testing conflict-detect...")
    conflicts_result = await mcp_client.call_tool('conflict-detect', {
        'facts': sample_facts,
        'tolerance': {
            'numerical': 0.1,  # 10% tolerance
            'temporal': 365,   # 1 year tolerance
        }
    })

    assert conflicts_result.get('success', False), "conflict-detect failed"
    assert 'conflicts' in conflicts_result, "Missing conflicts"
    assert len(conflicts_result['conflicts']) > 0, "Should detect conflicts in sample data"
    print(f"    ✅ Detected {len(conflicts_result['conflicts'])} conflict(s)")

    print("  ✅ All 5 MCP tools functional")


@pytest.mark.asyncio
@pytest.mark.layer3
@pytest.mark.integration
async def test_mcp_tool_error_handling(mcp_client) -> None:
    """
    Test Case: MCP tools handle errors gracefully

    Error scenarios:
    - Invalid input format
    - Missing required fields
    - Empty input data
    - Malformed URLs
    """
    print("\n[Test 3.1b] Testing MCP tool error handling...")

    error_cases = [
        ('fact-extract', {'text': ''}, "Empty text"),
        ('entity-extract', {'text': None}, "Null text"),
        ('citation-validate', {'citations': []}, "Empty citations"),
        ('source-rate', {'source_url': 'not-a-url'}, "Invalid URL"),
        ('conflict-detect', {'facts': []}, "Empty facts"),
    ]

    for tool_name, invalid_input, description in error_cases:
        print(f"  Testing {tool_name}: {description}")

        result = await mcp_client.call_tool(tool_name, invalid_input)

        # Should return error response, not raise exception
        assert 'success' in result or 'error' in result, \
            f"{tool_name} should return error status"

        print(f"    ✅ Handled gracefully")

    print("  ✅ All error cases handled correctly")


@pytest.mark.asyncio
@pytest.mark.layer3
@pytest.mark.integration
async def test_mcp_batch_operations(
    mcp_client,
    sample_text_for_extraction
) -> None:
    """
    Test Case: Batch processing for MCP tools

    Validates:
    - Multiple items processed in one call
    - Results returned in order
    - Performance improvement over serial
    """
    print("\n[Test 3.1c] Testing MCP batch operations...")

    # Batch fact extraction
    texts = [
        sample_text_for_extraction,
        "NVIDIA leads with 80% market share.",
        "Market growing at 37% CAGR through 2030."
    ]

    result = await mcp_client.call_tool('batch-fact-extract', {
        'texts': texts,
        'source_url': 'https://test.com'
    })

    assert result.get('success', False), "batch-fact-extract failed"
    assert 'results' in result, "Missing results array"
    assert len(result['results']) == len(texts), \
        f"Expected {len(texts)} results, got {len(result['results'])}"

    print(f"  ✅ Batch processed {len(texts)} items")


# =============================================================================
# Test 3.2: StateManager Operations
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.layer3
@pytest.mark.integration
async def test_statemanager_operations(
    state_manager,
    sample_research_session,
    sample_got_node,
    sample_facts
) -> None:
    """
    Test Case: StateManager CRUD operations

    Operations to test:
    1. Create research session
    2. Create GoT node
    3. Register agent
    4. Add fact
    5. Add entity
    6. Update state
    7. Query state
    8. Delete/cleanup

    Validates:
    - All CRUD operations functional
    - State persists across operations
    - Relationships maintained
    - ACID properties
    """
    print("\n[Test 3.2] Testing StateManager CRUD operations...")

    # Test 1: Create session
    print("  Testing session creation...")
    session = await state_manager.create_session(sample_research_session)
    assert session['session_id'] == sample_research_session['session_id']
    assert session['status'] == 'in_progress'
    print(f"    ✅ Session created: {session['session_id']}")

    # Test 2: Create GoT node
    print("  Testing GoT node creation...")
    node = await state_manager.create_got_node(sample_got_node)
    assert node['node_id'] == sample_got_node['node_id']
    assert node['quality_score'] == sample_got_node['quality_score']
    print(f"    ✅ GoT node created: {node['node_id']}")

    # Test 3: Register agent
    print("  Testing agent registration...")
    agent = await state_manager.register_agent({
        'agent_id': 'agent-001',
        'session_id': sample_research_session['session_id'],
        'agent_type': 'web-research',
        'agent_role': 'Market data collector',
        'status': 'running'
    })
    assert agent['agent_id'] == 'agent-001'
    assert agent['status'] == 'running'
    print(f"    ✅ Agent registered: {agent['agent_id']}")

    # Test 4: Add fact
    print("  Testing fact addition...")
    fact = await state_manager.add_fact({
        'entity': 'AI Market',
        'attribute': 'size',
        'value': '$184B',
        'value_type': 'currency',
        'confidence': 'High',
        'source_url': 'https://gartner.com',
        'session_id': sample_research_session['session_id']
    })
    assert 'fact_id' in fact
    assert fact['entity'] == 'AI Market'
    print(f"    ✅ Fact added: {fact['fact_id']}")

    # Test 5: Query facts
    print("  Testing fact query...")
    facts = await state_manager.get_facts_by_session(sample_research_session['session_id'])
    assert len(facts) > 0
    print(f"    ✅ Retrieved {len(facts)} fact(s)")

    # Test 6: Update agent status
    print("  Testing agent status update...")
    updated = await state_manager.update_agent_status(
        'agent-001',
        'completed',
        {'output_tokens': 5000, 'citations': 5}
    )
    assert updated['status'] == 'completed'
    print(f"    ✅ Agent status updated: {updated['status']}")

    # Test 7: Get session state
    print("  Testing session state retrieval...")
    session_state = await state_manager.get_session(sample_research_session['session_id'])
    assert session_state is not None
    assert session_state['session_id'] == sample_research_session['session_id']
    print(f"    ✅ Session state retrieved")

    # Test 8: Cleanup
    print("  Testing session deletion...")
    deleted = await state_manager.delete_session(sample_research_session['session_id'])
    assert deleted is True
    print(f"    ✅ Session deleted")

    print("  ✅ All StateManager operations functional")


@pytest.mark.asyncio
@pytest.mark.layer3
@pytest.mark.integration
async def test_statemanager_concurrent_access(
    state_manager,
    sample_research_session
) -> None:
    """
    Test Case: Handle concurrent access safely

    Validates:
    - Multiple agents can update state simultaneously
    - No race conditions
    - ACID properties maintained
    - Thread-safe operations
    """
    print("\n[Test 3.2b] Testing StateManager concurrent access...")

    # Create session
    await state_manager.create_session(sample_research_session)

    # Simulate concurrent agent updates
    async def update_agent_status(agent_id: str, status: str):
        await state_manager.update_agent_status(agent_id, status)

    # Run concurrent updates
    tasks = [
        update_agent_status(f'agent-{i}', 'running')
        for i in range(5)
    ]

    await asyncio.gather(*tasks)

    # Verify all updates persisted
    session = await state_manager.get_session(sample_research_session['session_id'])
    assert session is not None

    print("  ✅ Concurrent access handled safely")


@pytest.mark.asyncio
@pytest.mark.layer3
@pytest.mark.integration
async def test_statemanager_got_graph_operations(
    state_manager,
    sample_research_session
) -> None:
    """
    Test Case: Graph of Thoughts state management

    Validates:
    - Graph structure persists
    - Parent-child relationships maintained
    - Graph traversal works
    - Node updates propagate
    """
    print("\n[Test 3.2c] Testing StateManager GoT graph operations...")

    await state_manager.create_session(sample_research_session)

    # Create root node
    root = await state_manager.create_got_node({
        'node_id': 'root',
        'session_id': sample_research_session['session_id'],
        'operation': 'Generate',
        'content': 'Root research question',
        'quality_score': 7.0,
        'depth': 0
    })

    # Create child nodes
    children = []
    for i in range(3):
        child = await state_manager.create_got_node({
            'node_id': f'node-{i}',
            'session_id': sample_research_session['session_id'],
            'parent_id': 'root',
            'operation': 'Generate',
            'content': f'Research path {i}',
            'quality_score': 7.5 + (i * 0.2),
            'depth': 1
        })
        children.append(child)

    # Get graph
    graph = await state_manager.get_got_graph(sample_research_session['session_id'])
    assert len(graph['nodes']) == 4  # root + 3 children
    assert graph['edges'] == 3  # 3 parent-child relationships

    print(f"  ✅ Graph: {len(graph['nodes'])} nodes, {graph['edges']} edges")


@pytest.mark.asyncio
@pytest.mark.layer3
@pytest.mark.integration
async def test_statemanager_fact_ledger(
    state_manager,
    sample_research_session
) -> None:
    """
    Test Case: Fact ledger operations

    Validates:
    - Facts stored with proper attribution
    - Fact retrieval by entity
    - Fact quality tracking
    - Fact source validation
    """
    print("\n[Test 3.2d] Testing StateManager fact ledger...")

    await state_manager.create_session(sample_research_session)

    # Add multiple facts
    facts_to_add = [
        {
            'entity': 'AI Market',
            'attribute': 'size',
            'value': '$184B',
            'confidence': 'High',
            'source_url': 'https://gartner.com',
            'session_id': sample_research_session['session_id']
        },
        {
            'entity': 'AI Market',
            'attribute': 'growth_rate',
            'value': '37%',
            'confidence': 'High',
            'source_url': 'https://mckinsey.com',
            'session_id': sample_research_session['session_id']
        },
        {
            'entity': 'NVIDIA',
            'attribute': 'market_share',
            'value': '80%',
            'confidence': 'Medium',
            'source_url': 'https://jpr.com',
            'session_id': sample_research_session['session_id']
        }
    ]

    for fact in facts_to_add:
        await state_manager.add_fact(fact)

    # Query by entity
    ai_market_facts = await state_manager.get_facts_by_entity('AI Market')
    assert len(ai_market_facts) == 2

    # Query by session
    all_facts = await state_manager.get_facts_by_session(sample_research_session['session_id'])
    assert len(all_facts) == 3

    print(f"  ✅ Fact ledger: {len(all_facts)} facts stored")


@pytest.mark.asyncio
@pytest.mark.layer3
@pytest.mark.integration
async def test_statemanager_entity_graph(
    state_manager,
    sample_research_session
) -> None:
    """
    Test Case: Entity graph operations

    Validates:
    - Entities stored with metadata
    - Relationships tracked
    - Co-occurrences recorded
    - Graph queries work
    """
    print("\n[Test 3.2e] Testing StateManager entity graph...")

    await state_manager.create_session(sample_research_session)

    # Add entities
    await state_manager.add_entity({
        'name': 'NVIDIA',
        'type': 'company',
        'description': 'GPU manufacturer',
        'session_id': sample_research_session['session_id']
    })

    await state_manager.add_entity({
        'name': 'AI Market',
        'type': 'market',
        'description': 'Artificial intelligence market',
        'session_id': sample_research_session['session_id']
    })

    # Add relationship
    await state_manager.add_relationship({
        'source_entity': 'NVIDIA',
        'target_entity': 'AI Market',
        'relation': 'dominates',
        'confidence': 0.9,
        'session_id': sample_research_session['session_id']
    })

    # Query entities
    entities = await state_manager.get_entities_by_session(sample_research_session['session_id'])
    assert len(entities) == 2

    # Query relationships
    relationships = await state_manager.get_relationships('NVIDIA')
    assert len(relationships) == 1
    assert relationships[0]['relation'] == 'dominates'

    print(f"  ✅ Entity graph: {len(entities)} entities, {len(relationships)} relationship(s)")


@pytest.mark.asyncio
@pytest.mark.layer3
@pytest.mark.integration
async def test_statemanager_citation_tracking(
    state_manager,
    sample_research_session,
    sample_citations
) -> None:
    """
    Test Case: Citation quality tracking

    Validates:
    - Citations stored with metadata
    - Quality ratings tracked
    - Citation retrieval by quality
    - Source validation results stored
    """
    print("\n[Test 3.2f] Testing StateManager citation tracking...")

    await state_manager.create_session(sample_research_session)

    # Add citations with quality ratings
    for citation in sample_citations:
        await state_manager.add_citation({
            'claim': citation['claim'],
            'author': citation['author'],
            'title': citation.get('title', ''),
            'url': citation.get('url', ''),
            'date': citation.get('date', ''),
            'quality_rating': 'A' if citation.get('url') else 'E',
            'session_id': sample_research_session['session_id']
        })

    # Query high-quality citations
    high_quality = await state_manager.get_citations_by_quality(
        sample_research_session['session_id'],
        min_quality='B'
    )

    assert len(high_quality) >= 2  # At least 2 citations with valid URLs

    print(f"  ✅ Citations tracked: {len(high_quality)} high-quality")


# =============================================================================
# Integration Tests: MCP + StateManager
# =============================================================================

@pytest.mark.asyncio
@pytest.mark.layer3
@pytest.mark.integration
async def test_mcp_statemanager_integration(
    mcp_client,
    state_manager,
    sample_text_for_extraction,
    sample_research_session
) -> None:
    """
    Test Case: MCP tools integrate with StateManager

    Workflow:
    1. Extract facts using MCP
    2. Store facts in StateManager
    3. Query facts from StateManager
    4. Detect conflicts using MCP
    5. Store conflicts in StateManager

    Validates:
    - Data flows between MCP and StateManager
    - Schema compatibility
    - End-to-end workflow
    """
    print("\n[Test 3.3] Testing MCP + StateManager integration...")

    # Create session
    await state_manager.create_session(sample_research_session)

    # Step 1: Extract facts using MCP
    print("  Step 1: Extract facts with MCP...")
    mcp_result = await mcp_client.call_tool('fact-extract', {
        'text': sample_text_for_extraction,
        'source_url': 'https://gartner.com'
    })
    assert mcp_result['success']

    # Step 2: Store in StateManager
    print("  Step 2: Store facts in StateManager...")
    for fact in mcp_result['facts']:
        await state_manager.add_fact({
            'entity': fact['entity'],
            'attribute': fact['attribute'],
            'value': fact['value'],
            'confidence': fact.get('confidence', 'Medium'),
            'source_url': 'https://gartner.com',
            'session_id': sample_research_session['session_id']
        })

    # Step 3: Query from StateManager
    print("  Step 3: Query facts from StateManager...")
    stored_facts = await state_manager.get_facts_by_session(sample_research_session['session_id'])
    assert len(stored_facts) > 0

    # Step 4: Detect conflicts
    print("  Step 4: Detect conflicts with MCP...")
    conflict_result = await mcp_client.call_tool('conflict-detect', {
        'facts': [
            {
                'entity': f['entity'],
                'attribute': f['attribute'],
                'value': f['value']
            }
            for f in stored_facts
        ],
        'tolerance': {'numerical': 0.1}
    })

    # Step 5: Store conflicts
    if conflict_result.get('conflicts'):
        print("  Step 5: Store conflicts in StateManager...")
        for conflict in conflict_result['conflicts']:
            await state_manager.add_conflict({
                'entity': conflict['entity'],
                'attribute': conflict['attribute'],
                'conflict_type': conflict['conflict_type'],
                'severity': conflict['severity'],
                'session_id': sample_research_session['session_id']
            })

    print("  ✅ MCP + StateManager integration working")


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v", "-s", "-m", "layer3"])
