#!/usr/bin/env python3
"""
Agent Status Synchronization for Deep Research Framework

Tracks real-time progress of parallel research agents using StateManager.

Usage:
    python3 scripts/agent_status.py <session_id> <agent_id> <phase> [progress] [findings]
    python3 scripts/agent_status.py --list <session_id>
    python3 scripts/agent_status.py --stats <session_id>

Dependencies:
    - StateManager (for database operations)

Integrates with:
    - Research Orchestrator Agent
    - Progress logging system
"""

import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional, Any

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from state_manager import StateManager, ResearchAgent, AgentStatus as AgentStatusEnum


class AgentStatusTracker:
    """Track and sync agent status using StateManager."""

    def __init__(self, session_id: str, db_path: Optional[str] = None):
        """Initialize agent status tracker.

        Args:
            session_id: Research session ID
            db_path: Optional path to SQLite database
        """
        self.session_id = session_id
        self.state_manager = StateManager(db_path)

    def register_agent(
        self,
        agent_id: str,
        agent_type: str,
        focus: Optional[str] = None,
    ) -> ResearchAgent:
        """Register a new agent in the session.

        Args:
            agent_id: Unique agent identifier
            agent_type: Type of agent (e.g., 'web-research', 'academic')
            focus: Agent's research focus

        Returns:
            Created ResearchAgent instance
        """
        agent = ResearchAgent(
            agent_id=agent_id,
            session_id=self.session_id,
            agent_type=agent_type,
            focus=focus,
            status=AgentStatusEnum.PENDING.value,
        )
        return self.state_manager.register_agent(agent)

    def update(
        self,
        agent_id: str,
        phase: str,
        progress: int,
        findings_count: int = 0,
        error: Optional[str] = None,
    ) -> bool:
        """Update agent status.

        Args:
            agent_id: Agent identifier
            phase: Current phase (e.g., 'researching', 'complete', 'failed')
            progress: Progress percentage (0-100)
            findings_count: Number of findings collected
            error: Error message if failed

        Returns:
            True if update succeeded
        """
        # Map phase to status enum
        status_map = {
            'pending': AgentStatusEnum.PENDING.value,
            'running': AgentStatusEnum.RUNNING.value,
            'researching': AgentStatusEnum.RUNNING.value,
            'complete': AgentStatusEnum.COMPLETED.value,
            'completed': AgentStatusEnum.COMPLETED.value,
            'failed': AgentStatusEnum.FAILED.value,
            'timeout': AgentStatusEnum.TIMEOUT.value,
        }
        status = status_map.get(phase.lower(), AgentStatusEnum.RUNNING.value)

        # Update status
        self.state_manager.update_agent_status(agent_id, status, error)

        # Update progress and findings
        return self.state_manager.update_agent(
            agent_id,
            findings_count=findings_count,
        )

    def get_all_status(self) -> Dict[str, Any]:
        """Get status of all agents in session.

        Returns:
            Dictionary with agent statuses
        """
        agents = self.state_manager.get_session_agents(self.session_id)
        return {
            "session_id": self.session_id,
            "agents": {
                agent.agent_id: {
                    "type": agent.agent_type,
                    "focus": agent.focus,
                    "status": agent.status,
                    "findings_count": agent.findings_count,
                    "error_message": agent.error_message,
                }
                for agent in agents
            },
        }

    def get_statistics(self) -> Dict[str, Any]:
        """Get agent statistics for session.

        Returns:
            Statistics dictionary
        """
        return self.state_manager.get_agent_statistics(self.session_id)

    def mark_complete(self, agent_id: str) -> bool:
        """Mark agent as complete.

        Args:
            agent_id: Agent identifier

        Returns:
            True if update succeeded
        """
        return self.state_manager.update_agent_status(
            agent_id, AgentStatusEnum.COMPLETED.value
        )

    def mark_failed(self, agent_id: str, error: str) -> bool:
        """Mark agent as failed.

        Args:
            agent_id: Agent identifier
            error: Error message

        Returns:
            True if update succeeded
        """
        return self.state_manager.update_agent_status(
            agent_id, AgentStatusEnum.FAILED.value, error
        )


def main():
    """CLI entry point."""
    import argparse
    import json

    parser = argparse.ArgumentParser(
        description="Agent Status Tracker - Track parallel research agent progress",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Update agent status
  python3 scripts/agent_status.py session_123 agent_001 researching 50 12

  # List all agent statuses
  python3 scripts/agent_status.py --list session_123

  # Get agent statistics
  python3 scripts/agent_status.py --stats session_123
        """,
    )

    parser.add_argument("--list", metavar="SESSION", help="List all agents in session")
    parser.add_argument("--stats", metavar="SESSION", help="Get session statistics")
    parser.add_argument("--db", help="Path to SQLite database", default=None)
    parser.add_argument("session_id", nargs="?", help="Research session ID")
    parser.add_argument("agent_id", nargs="?", help="Agent ID")
    parser.add_argument("phase", nargs="?", help="Current phase")
    parser.add_argument("progress", nargs="?", type=int, default=0, help="Progress %")
    parser.add_argument("findings", nargs="?", type=int, default=0, help="Findings count")

    args = parser.parse_args()

    if args.list:
        tracker = AgentStatusTracker(args.list, args.db)
        status = tracker.get_all_status()
        print(json.dumps(status, indent=2))
    elif args.stats:
        tracker = AgentStatusTracker(args.stats, args.db)
        stats = tracker.get_statistics()
        print(json.dumps(stats, indent=2))
    elif args.session_id and args.agent_id and args.phase:
        tracker = AgentStatusTracker(args.session_id, args.db)
        tracker.update(args.agent_id, args.phase, args.progress, args.findings)
        print(f"Updated {args.agent_id}: {args.phase} ({args.progress}%)")
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
