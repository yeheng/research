#!/usr/bin/env python3
"""
MCP Client Wrapper

Provides Python interface to MCP tools running in Node.js server.
"""

import json
import subprocess
import sys
from typing import Dict, List, Optional, Any
from pathlib import Path


class MCPClient:
    """Client for interacting with MCP tools"""

    def __init__(self, server_path: Optional[str] = None):
        """
        Initialize MCP client

        Args:
            server_path: Path to MCP server directory (default: .claude/mcp-server)
        """
        if server_path is None:
            # Default to .claude/mcp-server relative to project root
            self.server_path = Path(__file__).parent.parent / ".claude" / "mcp-server"
        else:
            self.server_path = Path(server_path)

        self.server_script = self.server_path / "dist" / "index.js"

        if not self.server_script.exists():
            raise FileNotFoundError(
                f"MCP server not found at {self.server_script}. "
                "Run 'npm run build' in .claude/mcp-server first."
            )

    def _call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Call an MCP tool by directly importing and calling the compiled JS module

        Args:
            tool_name: Name of the tool to call
            arguments: Tool arguments

        Returns:
            Tool response as dictionary
        """
        # Map tool names to file names and function names
        tool_map = {
            "fact-extract": ("fact-extract.js", "factExtract"),
            "entity-extract": ("entity-extract.js", "entityExtract"),
            "citation-validate": ("citation-validate.js", "citationValidate"),
            "source-rate": ("source-rate.js", "sourceRate"),
            "conflict-detect": ("conflict-detect.js", "conflictDetect")
        }

        if tool_name not in tool_map:
            raise ValueError(f"Unknown tool: {tool_name}")

        tool_file, func_name = tool_map[tool_name]
        tool_path = self.server_path / "dist" / "tools" / tool_file

        # Create a simple Node.js script to call the tool
        script = f"""
const tool = require('{tool_path}');
const args = {json.dumps(arguments)};

async function run() {{
    try {{
        const result = await tool.{func_name}(args);
        console.log(JSON.stringify(result));
    }} catch (error) {{
        console.error(JSON.stringify({{error: error.message}}));
        process.exit(1);
    }}
}}

run();
"""

        try:
            result = subprocess.run(
                ["node", "-e", script],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=str(self.server_path)
            )

            if result.returncode != 0:
                raise RuntimeError(f"Tool failed: {result.stderr}")

            response = json.loads(result.stdout)

            # Extract text content from MCP response format
            if "content" in response and len(response["content"]) > 0:
                return json.loads(response["content"][0]["text"])

            return response

        except subprocess.TimeoutExpired:
            raise TimeoutError(f"Tool {tool_name} timed out")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON: {e}\nOutput: {result.stdout}")

    def extract_facts(
        self,
        text: str,
        source_url: Optional[str] = None,
        source_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Extract atomic facts from text

        Args:
            text: Text to extract facts from
            source_url: Source URL
            source_metadata: Additional source metadata

        Returns:
            Dictionary with facts, quality score, and metadata
        """
        args = {"text": text}
        if source_url:
            args["source_url"] = source_url
        if source_metadata:
            args["source_metadata"] = source_metadata

        return self._call_tool("fact-extract", args)

    def extract_entities(
        self,
        text: str,
        entity_types: Optional[List[str]] = None,
        extract_relations: bool = False
    ) -> Dict[str, Any]:
        """
        Extract named entities and relationships

        Args:
            text: Text to extract entities from
            entity_types: Types of entities to extract
            extract_relations: Whether to extract relationships

        Returns:
            Dictionary with entities, edges, and metadata
        """
        args = {"text": text, "extract_relations": extract_relations}
        if entity_types:
            args["entity_types"] = entity_types

        return self._call_tool("entity-extract", args)

    def validate_citations(
        self,
        citations: List[Dict[str, Any]],
        verify_urls: bool = False,
        check_accuracy: bool = False
    ) -> Dict[str, Any]:
        """
        Validate citations for completeness

        Args:
            citations: List of citation objects
            verify_urls: Whether to verify URL accessibility
            check_accuracy: Whether to check citation accuracy

        Returns:
            Dictionary with validation results and issues
        """
        args = {
            "citations": citations,
            "verify_urls": verify_urls,
            "check_accuracy": check_accuracy
        }
        return self._call_tool("citation-validate", args)

    def rate_source(
        self,
        source_url: str,
        source_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Rate source quality on A-E scale

        Args:
            source_url: URL of the source
            source_type: Type of source (academic, industry, news, blog, official)
            metadata: Additional metadata

        Returns:
            Dictionary with quality rating and justification
        """
        args = {"source_url": source_url}
        if source_type:
            args["source_type"] = source_type
        if metadata:
            args["metadata"] = metadata

        return self._call_tool("source-rate", args)

    def detect_conflicts(
        self,
        facts: List[Dict[str, Any]],
        tolerance: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Detect conflicts between facts

        Args:
            facts: List of fact objects
            tolerance: Conflict tolerance settings

        Returns:
            Dictionary with conflicts and severity summary
        """
        args = {"facts": facts}
        if tolerance:
            args["tolerance"] = tolerance

        return self._call_tool("conflict-detect", args)


# Test code
if __name__ == "__main__":
    print("Testing MCP Client...\n")

    try:
        client = MCPClient()

        # Test 1: Fact extraction
        print("1. Testing fact extraction...")
        result = client.extract_facts(
            text="The AI market was valued at $22.4 billion in 2023.",
            source_url="https://example.com/report"
        )
        print(f"   ✓ Extracted {result['metadata']['total_facts']} facts")

        # Test 2: Entity extraction
        print("\n2. Testing entity extraction...")
        result = client.extract_entities(
            text="Microsoft invested in OpenAI to develop AI technologies.",
            extract_relations=True
        )
        print(f"   ✓ Found {result['metadata']['total_entities']} entities")
        print(f"   ✓ Found {result['metadata']['total_relationships']} relationships")

        print("\n✅ All MCP client tests passed!")

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
