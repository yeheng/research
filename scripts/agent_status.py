#!/usr/bin/env python3
"""
Agent Status Synchronization for Deep Research Framework

Tracks real-time progress of parallel research agents.
"""

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional

class AgentStatus:
    """Track and sync agent status across parallel execution."""

    def __init__(self, topic: str, agent_id: str):
        self.topic = topic
        self.agent_id = agent_id
        self.status_file = Path(f"RESEARCH/{topic}/research_notes/agent_status.json")
        self.status_file.parent.mkdir(parents=True, exist_ok=True)

    def _load_status(self) -> Dict:
        """Load current status from file."""
        if self.status_file.exists():
            try:
                with open(self.status_file, 'r') as f:
                    return json.load(f)
            except Exception:
                return {"agents": {}}
        return {"agents": {}}

    def _save_status(self, status: Dict):
        """Save status to file."""
        with open(self.status_file, 'w') as f:
            json.dump(status, f, indent=2)

    def update(self, phase: str, progress: int, findings_count: int = 0, error: Optional[str] = None):
        """Update agent status."""
        status = self._load_status()

        status["agents"][self.agent_id] = {
            "phase": phase,
            "progress": progress,
            "findings_count": findings_count,
            "error": error,
            "last_update": datetime.now().isoformat()
        }

        self._save_status(status)

    def get_all_status(self) -> Dict:
        """Get status of all agents."""
        return self._load_status()

    def mark_complete(self):
        """Mark agent as complete."""
        self.update(phase="complete", progress=100)

    def mark_failed(self, error: str):
        """Mark agent as failed."""
        self.update(phase="failed", progress=0, error=error)


# CLI usage
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 4:
        print("Usage: python3 agent_status.py <topic> <agent_id> <phase> [progress] [findings]")
        sys.exit(1)

    topic = sys.argv[1]
    agent_id = sys.argv[2]
    phase = sys.argv[3]
    progress = int(sys.argv[4]) if len(sys.argv) > 4 else 0
    findings = int(sys.argv[5]) if len(sys.argv) > 5 else 0

    status = AgentStatus(topic, agent_id)
    status.update(phase, progress, findings)
    print(f"Updated {agent_id}: {phase} ({progress}%)")
