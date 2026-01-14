"""
GoT Node Summarizer - Token Optimization Module
Version: 1.0.0

Provides automatic compression of GoT nodes using fast LLM summarization.
Achieves 10:1 compression ratio (default) while preserving key information.

Target Performance:
- Compression: 10:1 ratio (configurable)
- Speed: ~100ms per node (using Haiku)
- Token Savings: 80% for depth-4 GoT (500k → 100k tokens)

Usage:
    from scripts.node_summarizer import NodeSummarizer

    summarizer = NodeSummarizer()
    summary = summarizer.compress_node(content="Long content...", target_ratio=0.1)
"""

import os
from typing import Optional, Dict, Any
from dataclasses import dataclass


@dataclass
class CompressionResult:
    """Result of node compression"""
    summary: str
    original_tokens: int
    summary_tokens: int
    actual_ratio: float
    compression_time_ms: float


class NodeSummarizer:
    """
    Compresses GoT node content using fast LLM summarization.

    Uses Claude Haiku for optimal speed/quality tradeoff.
    """

    def __init__(
        self,
        model: str = "glm-4.7",
        default_ratio: float = 0.1
    ):
        """
        Initialize node summarizer.

        Args:
            model: LLM model to use (default: Haiku for speed)
            default_ratio: Default compression ratio (0.1 = 10:1)
        """
        self.model = model
        self.default_ratio = default_ratio

        # Initialize Anthropic client
        try:
            import anthropic
            self.client = anthropic.Anthropic(
                api_key="a887d72b96e84cc6895e42bd9e9b6cab.7wTFZFgYBLAdQ9Gq",
                base_url="https://open.bigmodel.cn/api/anthropic"
            )
        except ImportError:
            raise ImportError(
                "anthropic package not installed. "
                "Run: pip install anthropic"
            )

    def estimate_tokens(self, text: str) -> int:
        """
        Estimate token count for text.

        Uses rough approximation: 1 token ≈ 4 characters

        Args:
            text: Input text

        Returns:
            Estimated token count
        """
        return len(text) // 4

    def compress_node(
        self,
        content: str,
        target_ratio: Optional[float] = None,
        preserve_citations: bool = True
    ) -> CompressionResult:
        """
        Compress GoT node content to summary.

        Args:
            content: Full node content
            target_ratio: Compression ratio (default: 0.1 = 10:1)
            preserve_citations: Keep citation references

        Returns:
            CompressionResult with summary and metrics
        """
        import time

        start_time = time.time()

        if target_ratio is None:
            target_ratio = self.default_ratio

        # Calculate target length
        original_tokens = self.estimate_tokens(content)
        target_tokens = int(original_tokens * target_ratio)

        # Build compression prompt
        prompt = self._build_compression_prompt(
            content=content,
            target_tokens=target_tokens,
            preserve_citations=preserve_citations
        )

        # Call LLM for compression
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=target_tokens + 100,  # Small buffer
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            summary = message.content[0].text

        except Exception as e:
            raise RuntimeError(f"Compression failed: {e}")

        # Calculate metrics
        summary_tokens = self.estimate_tokens(summary)
        actual_ratio = summary_tokens / original_tokens if original_tokens > 0 else 0
        compression_time = (time.time() - start_time) * 1000  # ms

        return CompressionResult(
            summary=summary,
            original_tokens=original_tokens,
            summary_tokens=summary_tokens,
            actual_ratio=actual_ratio,
            compression_time_ms=compression_time
        )

    def _build_compression_prompt(
        self,
        content: str,
        target_tokens: int,
        preserve_citations: bool
    ) -> str:
        """Build compression prompt for LLM."""
        citation_instruction = ""
        if preserve_citations:
            citation_instruction = "\n- Keep all citation references [Author, Year]"

        return f"""Compress the following research content to approximately {target_tokens} tokens while preserving key information:

Original Content:
{content}

Compression Guidelines:
- Extract core findings and facts
- Maintain numerical data and statistics
- Preserve entity names and relationships{citation_instruction}
- Remove verbose explanations and redundancy
- Target length: ~{target_tokens} tokens

Compressed Summary:"""

    def compress_batch(
        self,
        nodes: list[Dict[str, Any]],
        target_ratio: Optional[float] = None,
        max_concurrency: int = 5
    ) -> list[CompressionResult]:
        """
        Compress multiple nodes in parallel.

        Args:
            nodes: List of dicts with 'node_id' and 'content'
            target_ratio: Compression ratio
            max_concurrency: Max parallel compressions

        Returns:
            List of CompressionResult objects
        """
        import concurrent.futures

        results = []

        with concurrent.futures.ThreadPoolExecutor(max_workers=max_concurrency) as executor:
            futures = {
                executor.submit(
                    self.compress_node,
                    node['content'],
                    target_ratio
                ): node['node_id']
                for node in nodes
            }

            for future in concurrent.futures.as_completed(futures):
                node_id = futures[future]
                try:
                    result = future.result()
                    results.append({
                        'node_id': node_id,
                        'result': result
                    })
                except Exception as e:
                    results.append({
                        'node_id': node_id,
                        'error': str(e)
                    })

        return results


# ============================================================================
# Integration with StateManager
# ============================================================================

def auto_compress_node(
    state_manager,
    node_id: str,
    force: bool = False
) -> bool:
    """
    Automatically compress a GoT node if not already compressed.

    Args:
        state_manager: StateManager instance
        node_id: Node to compress
        force: Force recompression if already exists

    Returns:
        True if compressed successfully
    """
    # Get node
    node = state_manager.get_got_node(node_id)
    if not node:
        raise ValueError(f"Node not found: {node_id}")

    # Skip if already compressed
    if node.summary and not force:
        return False

    # Compress
    summarizer = NodeSummarizer()
    result = summarizer.compress_node(node.content)

    # Update node
    state_manager.update_got_node(
        node_id,
        summary=result.summary,
        compression_ratio=result.actual_ratio,
        metadata={
            **(node.metadata or {}),
            'compression': {
                'original_tokens': result.original_tokens,
                'summary_tokens': result.summary_tokens,
                'compression_time_ms': result.compression_time_ms
            }
        }
    )

    return True


def compress_session_nodes(
    state_manager,
    session_id: str,
    min_depth: int = 1,
    force: bool = False
) -> Dict[str, Any]:
    """
    Compress all nodes in a session (batch operation).

    Args:
        state_manager: StateManager instance
        session_id: Research session
        min_depth: Minimum depth to compress (default: 1, skip root)
        force: Force recompression

    Returns:
        Summary statistics
    """
    # Get nodes to compress
    all_nodes = state_manager.get_session_got_nodes(session_id)
    nodes_to_compress = [
        node for node in all_nodes
        if node.depth >= min_depth and (force or not node.summary)
    ]

    if not nodes_to_compress:
        return {
            'compressed': 0,
            'skipped': len(all_nodes),
            'total_tokens_saved': 0,
            'compression_ratio': 'N/A (no nodes to compress)'
        }

    # Batch compress
    summarizer = NodeSummarizer()
    results = summarizer.compress_batch([
        {'node_id': node.node_id, 'content': node.content}
        for node in nodes_to_compress
    ])

    # Update nodes
    total_tokens_saved = 0
    successful = 0

    for item in results:
        if 'error' in item:
            continue

        result = item['result']
        state_manager.update_got_node(
            item['node_id'],
            summary=result.summary,
            compression_ratio=result.actual_ratio
        )

        total_tokens_saved += (result.original_tokens - result.summary_tokens)
        successful += 1

    return {
        'compressed': successful,
        'failed': len(results) - successful,
        'total_tokens_saved': total_tokens_saved,
        'compression_ratio': f"{(1 - (sum(r['result'].summary_tokens for r in results if 'result' in r) / sum(r['result'].original_tokens for r in results if 'result' in r))):.1%}"
    }


# ============================================================================
# CLI Interface
# ============================================================================

if __name__ == "__main__":
    import argparse
    import sys
    from pathlib import Path

    # Add parent directory to path
    sys.path.insert(0, str(Path(__file__).parent.parent))

    from scripts.state_manager import StateManager

    parser = argparse.ArgumentParser(description="Compress GoT nodes for token optimization")
    parser.add_argument("--session", required=True, help="Session ID to compress")
    parser.add_argument("--force", action="store_true", help="Force recompression")
    parser.add_argument("--min-depth", type=int, default=1, help="Minimum depth to compress")
    parser.add_argument("--node-id", help="Compress specific node ID only")

    args = parser.parse_args()

    # Initialize
    sm = StateManager()

    try:
        if args.node_id:
            # Single node compression
            print(f"Compressing node {args.node_id}...")
            success = auto_compress_node(sm, args.node_id, force=args.force)

            if success:
                node = sm.get_got_node(args.node_id)
                print(f"✓ Compressed successfully")
                print(f"  Compression ratio: {node.compression_ratio:.1%}")
            else:
                print("✓ Already compressed (use --force to recompress)")

        else:
            # Session-wide compression
            print(f"Compressing session {args.session}...")
            stats = compress_session_nodes(
                sm,
                args.session,
                min_depth=args.min_depth,
                force=args.force
            )

            print(f"\n✓ Compression completed:")
            print(f"  - Nodes compressed: {stats['compressed']}")
            print(f"  - Failed: {stats.get('failed', 0)}")
            print(f"  - Tokens saved: {stats['total_tokens_saved']:,}")
            print(f"  - Compression ratio: {stats['compression_ratio']}")

    finally:
        sm.close()
