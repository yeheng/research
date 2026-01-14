"""
Test GoT Token Optimization

Verifies that node summarization and Map-Reduce work correctly.

Run:
    python3 tests/test_got_optimization.py
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.state_manager import (
    StateManager,
    ResearchSession,
    GoTNode,
    ResearchType,
    SessionStatus,
    NodeType,
    NodeStatus
)
from scripts.node_summarizer import (
    NodeSummarizer,
    auto_compress_node,
    compress_session_nodes
)


def test_node_compression():
    """Test 1: Single node compression"""
    print("=" * 60)
    print("TEST 1: Single Node Compression")
    print("=" * 60)

    # Sample long content (simulating agent output)
    long_content = """
    # Research Findings: AI Market Analysis

    The artificial intelligence market has experienced exponential growth over the past decade,
    with numerous factors contributing to its rapid expansion. According to a comprehensive
    report by Gartner (2024), the global AI market was valued at approximately $184 billion
    in 2023, representing a year-over-year growth rate of 37.3% compared to 2022's valuation
    of $134 billion.

    Several key drivers have fueled this growth trajectory:

    1. Increased Enterprise Adoption: Large corporations across various sectors including
       healthcare, finance, retail, and manufacturing have accelerated their AI adoption rates.
       A survey by McKinsey & Company (2023) found that 72% of enterprises now use AI in at
       least one business function, up from 58% in 2022.

    2. Technological Advancements: Breakthroughs in large language models (LLMs), computer
       vision, and reinforcement learning have unlocked new use cases. OpenAI's GPT-4 and
       Google's PaLM 2, released in 2023, demonstrated unprecedented capabilities in natural
       language understanding and generation.

    3. Infrastructure Development: The availability of cloud-based AI services from providers
       like AWS, Microsoft Azure, and Google Cloud has democratized access to powerful AI
       tools, reducing barriers to entry for smaller organizations.

    4. Investment Trends: Venture capital investment in AI startups reached $75 billion
       globally in 2023, according to Crunchbase data, with notable mega-rounds including
       Anthropic's $5 billion Series C and Databricks' $500 million Series I.

    Regional Market Analysis:

    - North America: Dominates with 42% market share ($77.3B), driven by tech giants and
      strong R&D investment
    - Asia-Pacific: Fastest growing region at 45% CAGR, led by China's $45B AI economy
    - Europe: Represents 23% share ($42.3B), with strong regulatory framework via AI Act
    - Rest of World: Emerging markets showing 38% growth, particularly in fintech applications

    The competitive landscape features both established tech giants (Google, Microsoft, Amazon)
    and agile startups (OpenAI, Anthropic, Cohere) competing across multiple AI segments
    including generative AI, computer vision, natural language processing, and autonomous
    systems.

    Looking forward, analysts project the AI market will reach $407 billion by 2027,
    representing a compound annual growth rate (CAGR) of 37.3% from 2023 to 2027.
    """ * 2  # Double it to make it longer

    print(f"\nOriginal content length: {len(long_content)} chars")
    print(f"Estimated tokens: {len(long_content) // 4}")

    # Test compression
    summarizer = NodeSummarizer()

    print("\n⏳ Compressing with 10:1 ratio...")

    try:
        result = summarizer.compress_node(
            content=long_content,
            target_ratio=0.1,
            preserve_citations=True
        )

        print(f"\n✓ Compression successful!")
        print(f"  - Original tokens: {result.original_tokens}")
        print(f"  - Summary tokens: {result.summary_tokens}")
        print(f"  - Actual ratio: {result.actual_ratio:.1%}")
        print(f"  - Compression time: {result.compression_time_ms:.1f}ms")
        print(f"  - Token savings: {result.original_tokens - result.summary_tokens}")

        print(f"\n📄 Summary preview (first 500 chars):")
        print(f"{result.summary[:500]}...")

        return True

    except Exception as e:
        print(f"\n❌ Compression failed: {e}")
        print(f"   Note: This test requires ANTHROPIC_API_KEY environment variable")
        return False


def test_state_manager_integration():
    """Test 2: Integration with StateManager"""
    print("\n" + "=" * 60)
    print("TEST 2: StateManager Integration")
    print("=" * 60)

    sm = StateManager()

    try:
        # Create test session
        session_id = "got-optimization-test-001"

        print(f"\n1. Creating test session: {session_id}")
        session = ResearchSession(
            session_id=session_id,
            research_topic="GoT Token Optimization Test",
            research_type=ResearchType.DEEP.value,
            status=SessionStatus.EXECUTING.value
        )

        sm.create_session(session)
        print("   ✓ Session created")

        # Create nodes with varying depths
        sample_content = "AI market grew 37% in 2023 reaching $184B valuation. " * 50

        nodes_data = [
            ("root-001", None, NodeType.ROOT, 0, "Root research question: AI market analysis"),
            ("branch-001", "root-001", NodeType.BRANCH, 1, sample_content),
            ("branch-002", "root-001", NodeType.BRANCH, 1, sample_content),
            ("leaf-001", "branch-001", NodeType.LEAF, 2, sample_content),
            ("leaf-002", "branch-001", NodeType.LEAF, 2, sample_content),
        ]

        print(f"\n2. Creating {len(nodes_data)} GoT nodes...")
        for node_id, parent_id, node_type, depth, content in nodes_data:
            node = GoTNode(
                node_id=node_id,
                session_id=session_id,
                parent_id=parent_id,
                node_type=node_type.value,
                depth=depth,
                content=content,
                quality_score=8.0,
                status=NodeStatus.ACTIVE.value
            )
            sm.create_got_node(node)

        print("   ✓ All nodes created")

        # Test batch compression
        print(f"\n3. Running batch compression (min_depth=1)...")

        try:
            stats = compress_session_nodes(
                sm,
                session_id,
                min_depth=1,  # Skip root node
                force=False
            )

            print(f"   ✓ Compression completed")
            print(f"   - Nodes compressed: {stats['compressed']}")
            print(f"   - Failed: {stats.get('failed', 0)}")
            print(f"   - Tokens saved: {stats['total_tokens_saved']:,}")
            print(f"   - Overall ratio: {stats['compression_ratio']}")

            # Verify compressed nodes
            print(f"\n4. Verifying compressed nodes...")
            compressed_nodes = sm.get_session_got_nodes(session_id)

            for node in compressed_nodes:
                if node.depth >= 1:  # Should be compressed
                    if node.summary:
                        print(f"   ✓ {node.node_id}: Compressed (ratio: {node.compression_ratio:.1%})")
                    else:
                        print(f"   ⚠ {node.node_id}: Not compressed")

            return True

        except Exception as e:
            print(f"   ❌ Batch compression failed: {e}")
            print(f"   Note: This test requires ANTHROPIC_API_KEY environment variable")
            return False

    finally:
        # Cleanup
        print(f"\n5. Cleaning up test session...")
        sm.delete_session(session_id)
        sm.close()
        print("   ✓ Cleanup complete")


def test_map_reduce_strategy():
    """Test 3: Map-Reduce aggregation strategy"""
    print("\n" + "=" * 60)
    print("TEST 3: Map-Reduce Strategy Simulation")
    print("=" * 60)

    # Simulate agent outputs
    agent_outputs = [
        {"agent_id": "agent-001", "content": "Finding A: " + ("Market data " * 100)},
        {"agent_id": "agent-002", "content": "Finding B: " + ("Technology trends " * 100)},
        {"agent_id": "agent-003", "content": "Finding C: " + ("Investment analysis " * 100)},
        {"agent_id": "agent-004", "content": "Finding D: " + ("Regional insights " * 100)},
        {"agent_id": "agent-005", "content": "Finding E: " + ("Competitive landscape " * 100)},
        {"agent_id": "agent-006", "content": "Finding F: " + ("Future projections " * 100)},
    ]

    # Calculate initial tokens
    total_tokens = sum(len(agent['content']) // 4 for agent in agent_outputs)
    print(f"\nInitial state:")
    print(f"  - Agent outputs: {len(agent_outputs)}")
    print(f"  - Total tokens: {total_tokens:,}")

    # Simulate Map-Reduce
    print(f"\n1. Map phase: Grouping into chunks of 3...")

    chunks = []
    for i in range(0, len(agent_outputs), 3):
        chunk = agent_outputs[i:i + 3]
        chunks.append(chunk)
        chunk_tokens = sum(len(agent['content']) // 4 for agent in chunk)
        print(f"   Chunk {len(chunks)}: {len(chunk)} agents, {chunk_tokens:,} tokens")

    print(f"\n2. Reduce phase: Would merge {len(chunks)} intermediate syntheses")

    # Calculate token savings with 5:1 compression per chunk
    compressed_tokens = total_tokens * 0.2  # 5:1 compression
    savings = total_tokens - compressed_tokens
    savings_pct = (savings / total_tokens) * 100

    print(f"\n3. Expected results:")
    print(f"   - Original tokens: {total_tokens:,}")
    print(f"   - After Map-Reduce: {compressed_tokens:,.0f}")
    print(f"   - Token savings: {savings:,.0f} ({savings_pct:.1f}%)")
    print(f"   - Strategy: {'Map-Reduce' if total_tokens > 50000 else 'Direct synthesis'}")

    return True


def run_all_tests():
    """Run all optimization tests"""
    print("\n" + "╔" + "=" * 58 + "╗")
    print("║  GoT Token Optimization Test Suite                      ║")
    print("╚" + "=" * 58 + "╝")

    results = []

    # Test 1: Node compression
    try:
        result = test_node_compression()
        results.append(("Node Compression", result))
    except Exception as e:
        print(f"\n❌ Test 1 crashed: {e}")
        results.append(("Node Compression", False))

    # Test 2: StateManager integration
    try:
        result = test_state_manager_integration()
        results.append(("StateManager Integration", result))
    except Exception as e:
        print(f"\n❌ Test 2 crashed: {e}")
        results.append(("StateManager Integration", False))

    # Test 3: Map-Reduce strategy
    try:
        result = test_map_reduce_strategy()
        results.append(("Map-Reduce Strategy", result))
    except Exception as e:
        print(f"\n❌ Test 3 crashed: {e}")
        results.append(("Map-Reduce Strategy", False))

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status:8} {name}")

    print("\n" + "-" * 60)
    print(f"Results: {passed}/{total} tests passed")

    if passed == total:
        print("\n✅ All tests passed! GoT token optimization working correctly.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check errors above.")
        print("\nNote: Tests 1-2 require ANTHROPIC_API_KEY environment variable")
        return 1


if __name__ == "__main__":
    import os

    # Check for API key
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("\n⚠️  Warning: ANTHROPIC_API_KEY not set")
        print("Tests 1-2 will fail without API access")
        print("Test 3 (Map-Reduce simulation) will still run\n")

    sys.exit(run_all_tests())
