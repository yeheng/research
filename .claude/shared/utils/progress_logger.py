#!/usr/bin/env python3
"""
Progress Logger - Structured progress.md Management

Provides helper functions for token-efficient progress logging.
"""

import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional


class ProgressLogger:
    """
    Token-efficient progress logger

    Features:
    - Append-only writes (never re-reads entire file)
    - Structured format for easy parsing
    - References files instead of duplicating content
    - Compact table formats
    """

    def __init__(self, progress_file_path: str):
        self.progress_path = Path(progress_file_path)

    @staticmethod
    def timestamp() -> str:
        """Generate ISO 8601 timestamp"""
        return datetime.utcnow().isoformat() + "Z"

    def initialize(self, session_id: str, topic: str, quality_target: float = 9.0):
        """
        Initialize progress log file

        Creates file with header and session information
        """
        content = f"""# Research Progress Log

## Session Information
- **Session ID**: {session_id}
- **Topic**: {topic}
- **Started**: {self.timestamp()}
- **Status**: initializing
- **Quality Target**: {quality_target}/10

---

## Phase Execution

"""
        self.progress_path.write_text(content)
        print(f"✓ Progress log initialized: {self.progress_path}")

    def append(self, content: str):
        """Append content to progress log"""
        with open(self.progress_path, 'a', encoding='utf-8') as f:
            f.write(content)

    def log_phase_start(self, phase_num: int, phase_name: str, details: Optional[str] = None):
        """
        Log phase start

        Example:
            logger.log_phase_start(3, "Iterative Querying", "Deploying 5 agents")
        """
        entry = f"""
### [{self.timestamp()}] Phase {phase_num}: {phase_name}
- **Status**: in_progress
"""
        if details:
            entry += f"- **Details**: {details}\n"

        self.append(entry)
        print(f"📝 Logged: Phase {phase_num} started")

    def log_phase_complete(self, phase_num: int, phase_name: str, summary: str, output_files: Optional[List[str]] = None):
        """
        Log phase completion

        Example:
            logger.log_phase_complete(
                3, "Iterative Querying",
                "5 agents deployed, 100% success rate",
                ["raw/agent_01.md", "raw/agent_02.md"]
            )
        """
        # Find and update status line
        content = self.progress_path.read_text()
        phase_marker = f"Phase {phase_num}: {phase_name}"

        if phase_marker in content:
            # Update existing entry
            content = content.replace(
                f"{phase_marker}\n- **Status**: in_progress",
                f"{phase_marker}\n- **Status**: completed"
            )
            self.progress_path.write_text(content)

        # Append completion details
        entry = f"- **Summary**: {summary}\n"
        if output_files:
            entry += f"- **Output Files**: {', '.join(output_files)}\n"

        self.append(entry)
        print(f"✅ Logged: Phase {phase_num} completed")

    def create_agent_table(self):
        """
        Create agent deployments table

        Call this before logging first agent
        """
        entry = """
## Agent Deployments

| Agent ID | Type | Focus | Status | Output File | Findings |
|----------|------|-------|--------|-------------|----------|
"""
        self.append(entry)

    def log_agent_deployment(self, agent_id: str, agent_type: str, focus: str):
        """Log agent deployment"""
        entry = f"| {agent_id} | {agent_type} | {focus} | deploying | - | - |\n"
        self.append(entry)
        print(f"🚀 Logged: Agent {agent_id} deployed")

    def log_agent_completion(self, agent_id: str, output_file: str, findings_summary: str):
        """
        Log agent completion

        Updates the agent's row in the table
        """
        # Read current content
        content = self.progress_path.read_text()

        # Find agent row and update
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if agent_id in line and 'deploying' in line:
                # Update status, output file, and findings
                lines[i] = f"| {agent_id} | - | - | ✓ completed | {output_file} | {findings_summary} |"
                break

        # Write back
        self.progress_path.write_text('\n'.join(lines))
        print(f"✅ Logged: Agent {agent_id} completed")

    def create_mcp_table(self):
        """
        Create MCP tool invocations table

        Call this before logging first MCP call
        """
        entry = """
## MCP Tool Invocations

| Timestamp | Tool | Input | Output Summary | Cached |
|-----------|------|-------|----------------|--------|
"""
        self.append(entry)

    def log_mcp_call(self, tool_name: str, input_desc: str, output_summary: str, cached: bool = False):
        """
        Log MCP tool call

        Example:
            logger.log_mcp_call(
                "fact-extract",
                "agent_01.md (21KB)",
                "87 facts extracted",
                cached=False
            )
        """
        entry = f"| {self.timestamp()} | {tool_name} | {input_desc} | {output_summary} | {'Yes' if cached else 'No'} |\n"
        self.append(entry)

    def log_quality_gate(self, phase_num: int, status: str, details: Optional[Dict] = None):
        """
        Log quality gate result

        Example:
            logger.log_quality_gate(3, "PASSED", {
                "agents_success_rate": "100%",
                "total_sources": "60+"
            })
        """
        entry = f"""
**Phase {phase_num} Quality Gate**: {'✓ PASSED' if status == 'PASSED' else '✗ FAILED'}
"""
        if details:
            for key, value in details.items():
                entry += f"- {key.replace('_', ' ').title()}: {value}\n"

        self.append(entry)
        print(f"🎯 Logged: Phase {phase_num} quality gate {status}")

    def log_error(self, error_code: str, message: str, recovery_action: str):
        """
        Log error and recovery

        Example:
            logger.log_error("E003", "Agent 4 timeout", "Retry with extended timeout")
        """
        entry = f"\n⚠️ [{self.timestamp()}] {error_code}: {message}\n  - **Recovery**: {recovery_action}\n"
        self.append(entry)
        print(f"⚠️ Logged: Error {error_code}")

    def update_session_status(self, status: str):
        """
        Update session status in header

        Statuses: initializing, planning, executing, synthesizing, validating, completed, failed
        """
        content = self.progress_path.read_text()
        content = content.replace(
            f"- **Status**: {self._get_current_status(content)}",
            f"- **Status**: {status}"
        )
        self.progress_path.write_text(content)
        print(f"📊 Updated session status: {status}")

    def _get_current_status(self, content: str) -> str:
        """Extract current status from content"""
        for line in content.split('\n'):
            if '- **Status**:' in line:
                return line.split(':')[1].strip()
        return "unknown"

    def finalize(self, summary_stats: Dict[str, any]):
        """
        Add final summary to progress log

        Example:
            logger.finalize({
                "total_agents": 5,
                "total_sources": 60,
                "total_facts": 179,
                "execution_time_minutes": 32,
                "quality_score": 9.2
            })
        """
        entry = f"""
---

## Execution Summary

- **Total Agents**: {summary_stats.get('total_agents', 'N/A')}
- **Total Sources**: {summary_stats.get('total_sources', 'N/A')}
- **Total Facts**: {summary_stats.get('total_facts', 'N/A')}
- **Execution Time**: {summary_stats.get('execution_time_minutes', 'N/A')} minutes
- **Quality Score**: {summary_stats.get('quality_score', 'N/A')}/10
- **Completed**: {self.timestamp()}

---

**Research Status**: ✅ Complete
"""
        self.append(entry)
        self.update_session_status("completed")
        print(f"🎉 Progress log finalized")


def create_progress_template(session_id: str, topic: str, output_dir: str) -> str:
    """
    Helper function to create and initialize progress log

    Returns path to created file
    """
    progress_file = os.path.join(output_dir, "progress.md")
    logger = ProgressLogger(progress_file)
    logger.initialize(session_id, topic)
    return progress_file


# Example usage
if __name__ == "__main__":
    # Demo
    import tempfile
    import shutil

    # Create temp directory
    temp_dir = tempfile.mkdtemp()
    print(f"Demo output: {temp_dir}")

    try:
        # Initialize
        logger = ProgressLogger(os.path.join(temp_dir, "progress.md"))
        logger.initialize("demo-session-001", "AI Market Analysis", quality_target=9.0)

        # Log Phase 0
        logger.log_phase_start(0, "Initialization", "Setting up directories")
        logger.log_phase_complete(0, "Initialization", "Directories created, StateManager initialized")

        # Log Phase 3 with agents
        logger.log_phase_start(3, "Iterative Querying", "Deploying 3 agents")
        logger.create_agent_table()

        logger.log_agent_deployment("agent_01", "web-research", "Market trends")
        logger.log_agent_deployment("agent_02", "academic", "Technical papers")

        logger.log_agent_completion("agent_01", "raw/agent_01.md", "45 sources, 87 facts")
        logger.log_agent_completion("agent_02", "raw/agent_02.md", "23 sources, 54 facts")

        logger.log_quality_gate(3, "PASSED", {
            "agents_success_rate": "100%",
            "total_sources": "68"
        })

        logger.log_phase_complete(3, "Iterative Querying", "2 agents completed successfully")

        # Log Phase 4 with MCP
        logger.log_phase_start(4, "Source Triangulation", "Processing with MCP tools")
        logger.create_mcp_table()

        logger.log_mcp_call("fact-extract", "agent_01.md (21KB)", "87 facts extracted", False)
        logger.log_mcp_call("fact-extract", "agent_02.md (18KB)", "54 facts extracted", False)
        logger.log_mcp_call("conflict-detect", "141 facts", "2 conflicts detected", False)

        logger.log_phase_complete(4, "Source Triangulation", "141 facts extracted, 2 conflicts resolved",
                                   ["processed/fact_ledger.md"])

        # Finalize
        logger.finalize({
            "total_agents": 2,
            "total_sources": 68,
            "total_facts": 141,
            "execution_time_minutes": 15,
            "quality_score": 9.2
        })

        # Display result
        print("\n" + "=" * 70)
        print("DEMO PROGRESS LOG:")
        print("=" * 70)
        print(Path(os.path.join(temp_dir, "progress.md")).read_text())

    finally:
        # Cleanup
        shutil.rmtree(temp_dir)
