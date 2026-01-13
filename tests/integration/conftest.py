"""
Integration test configuration and fixtures for Deep Research Framework v2.0

This module provides pytest fixtures and configuration for running
integration tests across all three architectural layers:
- Layer 1: Skills
- Layer 2: Agents
- Layer 3: Infrastructure (MCP Tools, StateManager)
"""

import os
import sys
import pytest
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any, Generator, Optional
from unittest.mock import Mock, MagicMock, AsyncMock
import json

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / ".claude"))
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))


# =============================================================================
# Test Configuration
# =============================================================================

@pytest.fixture(scope="session")
def test_config() -> Dict[str, Any]:
    """Global test configuration."""
    return {
        "test_data_dir": PROJECT_ROOT / "tests" / "integration" / "fixtures",
        "test_output_dir": PROJECT_ROOT / "tests" / "integration" / "outputs",
        "research_output_dir": PROJECT_ROOT / "RESEARCH",
        "mcp_server_url": "http://localhost:3000",
        "state_manager_db": ":memory:",  # Use in-memory SQLite for tests
        "timeout_seconds": 30,
        "token_budget": 50000,
        "quality_threshold": 8.0,
    }


@pytest.fixture(scope="session")
def ensure_output_dirs(test_config: Dict[str, Any]) -> None:
    """Ensure test output directories exist."""
    for dir_path in [test_config["test_output_dir"], test_config["test_data_dir"]]:
        dir_path.mkdir(parents=True, exist_ok=True)


# =============================================================================
# Temporary Directories
# =============================================================================

@pytest.fixture
def temp_research_dir(test_config: Dict[str, Any]) -> Generator[Path, None, None]:
    """Create a temporary directory for research outputs."""
    temp_dir = Path(test_config["test_output_dir"]) / f"temp_research_{os.getpid()}"
    temp_dir.mkdir(parents=True, exist_ok=True)

    yield temp_dir

    # Cleanup
    if temp_dir.exists():
        shutil.rmtree(temp_dir)


@pytest.fixture
def temp_state_db(test_config: Dict[str, Any]) -> Generator[str, None, None]:
    """Create a temporary database file for StateManager tests."""
    db_path = test_config["test_output_dir"] / f"test_state_{os.getpid()}.db"

    yield str(db_path)

    # Cleanup
    if db_path.exists():
        db_path.unlink()


# =============================================================================
# StateManager Fixtures
# =============================================================================

@pytest.fixture
async def state_manager(temp_state_db: str):
    """Provide a StateManager instance with temporary database."""
    try:
        from scripts.state_manager import StateManager
        sm = StateManager(db_path=temp_state_db)
        yield sm
        await sm.close()
    except ImportError:
        pytest.skip("StateManager not available")


@pytest.fixture
def sample_research_session() -> Dict[str, Any]:
    """Sample research session data for testing."""
    return {
        "session_id": "test-session-001",
        "research_topic": "AI Market Size 2024",
        "research_type": "exploratory",
        "created_at": "2024-01-13T10:00:00Z",
        "status": "in_progress",
        "config": {
            "token_budget": 50000,
            "quality_threshold": 8.0,
            "max_agents": 8,
        }
    }


@pytest.fixture
def sample_got_node() -> Dict[str, Any]:
    """Sample Graph of Thoughts node for testing."""
    return {
        "node_id": "node-001",
        "session_id": "test-session-001",
        "parent_id": None,
        "content": "Initial research question: What is the AI market size in 2024?",
        "operation": "Generate",
        "quality_score": 7.5,
        "depth": 0,
        "children": []
    }


# =============================================================================
# MCP Tools Fixtures
# =============================================================================

@pytest.fixture
def mcp_client(test_config: Dict[str, Any]):
    """Provide an MCP client for testing."""
    try:
        from scripts.mcp_client import MCPClient
        client = MCPClient(server_url=test_config["mcp_server_url"])
        yield client
    except ImportError:
        # Mock client if real one not available
        mock_client = Mock()
        mock_client.call_tool = AsyncMock(return_value={"success": True, "data": {}})
        yield mock_client


@pytest.fixture
def sample_text_for_extraction() -> str:
    """Sample text for fact/entity extraction tests."""
    return """
    The global artificial intelligence market reached $184 billion in 2024,
    according to Gartner. NVIDIA leads the GPU market with approximately 80%
    market share, while AMD holds about 15%. The market is projected to grow
    at a compound annual growth rate (CAGR) of 37.3% from 2024 to 2030.
    Key players include NVIDIA, AMD, Intel, and emerging companies like Cerebras.
    """


@pytest.fixture
def sample_citations() -> list[Dict[str, Any]]:
    """Sample citations for validation tests."""
    return [
        {
            "claim": "AI market reached $184B in 2024",
            "author": "Gartner",
            "date": "2024",
            "title": "AI Market Analysis",
            "url": "https://www.gartner.com/en/insights/ai-market-2024",
            "accessed": "2024-01-13"
        },
        {
            "claim": "NVIDIA has 80% GPU market share",
            "author": "Jon Peddie Research",
            "date": "2024",
            "title": "GPU Market Share Report",
            "url": "https://www.jonpeddie.com/",
            "accessed": "2024-01-13"
        },
        {
            "claim": "Invalid citation without URL",
            "author": "Unknown",
            "date": "2024",
            "title": "Missing URL",
            "url": "",
            "accessed": "2024-01-13"
        }
    ]


@pytest.fixture
def sample_facts() -> list[Dict[str, Any]]:
    """Sample facts for conflict detection tests."""
    return [
        {
            "entity": "AI Market",
            "attribute": "size",
            "value": "184",
            "value_type": "number",
            "unit": "billion_usd",
            "confidence": "High",
            "source": {
                "url": "https://www.gartner.com/",
                "author": "Gartner",
                "date": "2024"
            }
        },
        {
            "entity": "AI Market",
            "attribute": "size",
            "value": "210",
            "value_type": "number",
            "unit": "billion_usd",
            "confidence": "Medium",
            "source": {
                "url": "https://www.idc.com/",
                "author": "IDC",
                "date": "2024"
            }
        },
        {
            "entity": "NVIDIA",
            "attribute": "market_share",
            "value": "80",
            "value_type": "percentage",
            "unit": "percent",
            "confidence": "High",
            "source": {
                "url": "https://www.jonpeddie.com/",
                "author": "Jon Peddie Research",
                "date": "2024"
            }
        }
    ]


# =============================================================================
# Skill Mocks
# =============================================================================

@pytest.fixture
def mock_skill_invocation():
    """Mock skill invocation function."""
    async def mock_invoke(skill_name: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Mock skill invocation with predefined responses."""
        responses = {
            "question-refiner": {
                "task": "AI market size research",
                "context": "Technology market analysis",
                "research_type": "exploratory",
                "questions": [
                    "What is the current market size?",
                    "What are the growth projections?",
                    "Who are the key players?"
                ],
                "keywords": ["AI", "market size", "growth", "NVIDIA", "AMD"],
                "quality_score": 8.5,
                "timestamp": "2024-01-13T10:00:00Z"
            },
            "research-planner": {
                "subtopics": [
                    {
                        "name": "Market Size and Revenue",
                        "search_queries": ["AI market size 2024", "AI revenue forecast"],
                        "estimated_time_minutes": 15
                    },
                    {
                        "name": "Key Players",
                        "search_queries": ["NVIDIA AMD Intel AI market share"],
                        "estimated_time_minutes": 10
                    }
                ],
                "agents": {
                    "total": 3,
                    "web_research": 2,
                    "academic": 1
                },
                "resource_estimation": {
                    "time_minutes": 45,
                    "cost_usd": 2.50
                }
            },
            "research-executor": {
                "status": "completed",
                "output_directory": "RESEARCH/ai-market-size-2024",
                "agent_invoked": "research-orchestrator",
                "agent_execution_time": 1800,
                "quality_score": 8.7,
                "citations_count": 25
            }
        }

        return responses.get(skill_name, {"status": "unknown"})

    return mock_invoke


# =============================================================================
# Agent Mocks
# =============================================================================

@pytest.fixture
def mock_agent_invocation():
    """Mock agent invocation and monitoring."""
    class MockAgent:
        def __init__(self):
            self.agents = {}
            self.agent_counter = 0

        async def invoke(self, agent_type: str, input_data: Dict[str, Any]) -> str:
            """Invoke an agent and return its ID."""
            agent_id = f"agent_{agent_type}_{self.agent_counter}"
            self.agent_counter += 1

            self.agents[agent_id] = {
                "agent_type": agent_type,
                "status": "running",
                "input": input_data,
                "start_time": "2024-01-13T10:00:00Z",
                "result": None
            }

            return agent_id

        async def get_result(self, agent_id: str) -> Optional[Dict[str, Any]]:
            """Get agent result."""
            if agent_id not in self.agents:
                return None

            agent = self.agents[agent_id]

            # Simulate different agent results
            if agent["agent_type"] == "research-orchestrator":
                return {
                    "agent_id": agent_id,
                    "status": "completed",
                    "phases_completed": 7,
                    "quality_score": 8.5,
                    "citations_count": 35,
                    "output_directory": "RESEARCH/test-research",
                    "execution_time_seconds": 2400
                }
            elif agent["agent_type"] == "got-agent":
                return {
                    "agent_id": agent_id,
                    "status": "completed",
                    "final_score": 8.7,
                    "tokens_used": 45000,
                    "operations": ["Generate", "Score", "Aggregate", "Prune"],
                    "graph_nodes": 12
                }
            elif agent["agent_type"] == "red-team-agent":
                return {
                    "agent_id": agent_id,
                    "status": "completed",
                    "validation_results": [
                        {
                            "claim": "AI market is $184B",
                            "decision": "Accept",
                            "counter_evidence": None,
                            "confidence_adjustment": 0
                        },
                        {
                            "claim": "NVIDIA has 90% share",
                            "decision": "Refine",
                            "counter_evidence": "Sources indicate 70-85%",
                            "confidence_adjustment": -0.5
                        }
                    ]
                }
            elif agent["agent_type"] == "synthesizer-agent":
                return {
                    "agent_id": agent_id,
                    "status": "completed",
                    "synthesized_report": "Comprehensive analysis of AI market...",
                    "total_citations": 35,
                    "conflicts_detected": 2,
                    "conflicts_resolved": 2
                }
            elif agent["agent_type"] == "ontology-scout-agent":
                return {
                    "agent_id": agent_id,
                    "status": "completed",
                    "taxonomy": {
                        "level_1": ["Artificial Intelligence"],
                        "level_2": ["Machine Learning", "Deep Learning", "NLP"],
                        "level_3": ["Neural Networks", "Transformers", "LLMs"]
                    },
                    "key_terminology": ["neural network", "training", "inference", "model"],
                    "execution_time_seconds": 480
                }

            return None

        async def wait_for_completion(self, agent_id: str, timeout: int = 300):
            """Wait for agent to complete."""
            import asyncio
            await asyncio.sleep(0.1)  # Simulate minimal wait
            self.agents[agent_id]["status"] = "completed"

    return MockAgent()


# =============================================================================
# Test Data Fixtures
# =============================================================================

@pytest.fixture
def sample_research_questions() -> Dict[str, str]:
    """Sample research questions for different types."""
    return {
        "exploratory": "What is quantum computing and how does it work?",
        "comparative": "Compare React vs Vue for enterprise applications",
        "analytical": "Analyze the trends in AI chip market for 2024",
        "technical": "How does transformer architecture work in LLMs?"
    }


@pytest.fixture
def quality_thresholds() -> Dict[str, float]:
    """Quality threshold configurations for testing."""
    return {
        "minimum": 7.0,
        "standard": 8.0,
        "high": 8.5,
        "excellent": 9.0
    }


# =============================================================================
# Utility Functions
# =============================================================================

def assert_valid_structured_prompt(result: Dict[str, Any]) -> None:
    """Assert that a structured prompt has all required fields."""
    required_fields = ["task", "context", "research_type", "questions", "keywords"]
    for field in required_fields:
        assert field in result, f"Missing required field: {field}"

    assert result["research_type"] in ["exploratory", "comparative", "analytical", "technical"]
    assert len(result["questions"]) >= 3
    assert len(result["keywords"]) >= 5
    assert result.get("quality_score", 0) >= 7.0


def assert_valid_research_plan(plan: Dict[str, Any]) -> None:
    """Assert that a research plan has all required fields."""
    assert "subtopics" in plan
    assert 3 <= len(plan["subtopics"]) <= 7
    assert "agents" in plan
    assert plan["agents"]["total"] <= 8
    assert "resource_estimation" in plan
    assert plan["resource_estimation"]["time_minutes"] <= 90

    for subtopic in plan["subtopics"]:
        assert "name" in subtopic
        assert 3 <= len(subtopic.get("search_queries", [])) <= 5


def assert_valid_research_output(result: Dict[str, Any]) -> None:
    """Assert that research output meets quality standards."""
    assert result["status"] in ["completed", "partial", "failed"]
    assert "output_directory" in result
    assert result["output_directory"].startswith("RESEARCH/")
    assert result.get("quality_score", 0) >= 8.0
    assert result.get("citations_count", 0) >= 10


# =============================================================================
# Markers for Test Categories
# =============================================================================

def pytest_configure(config):
    """Configure custom pytest markers."""
    config.addinivalue_line(
        "markers", "layer1: Tests for Layer 1 (Skills)"
    )
    config.addinivalue_line(
        "markers", "layer2: Tests for Layer 2 (Agents)"
    )
    config.addinivalue_line(
        "markers", "layer3: Tests for Layer 3 (Infrastructure)"
    )
    config.addinivalue_line(
        "markers", "workflow: Tests for complete workflows"
    )
    config.addinivalue_line(
        "markers", "recovery: Tests for failure recovery"
    )
    config.addinivalue_line(
        "markers", "performance: Tests for performance validation"
    )
    config.addinivalue_line(
        "markers", "slow: Marks tests as slow running"
    )
    config.addinivalue_line(
        "markers", "integration: Integration tests (vs unit tests)"
    )
