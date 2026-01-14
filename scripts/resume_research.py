#!/usr/bin/env python3
"""
Resume Research Session - Checkpoint Recovery

Automatically resume research sessions from the last successful checkpoint.
Supports recovery from any phase (Phase 3-7) after interruption or failure.

Features:
- Detects current phase from session state
- Skips completed agents in Phase 3
- Resumes from appropriate phase
- Validates output files before resuming

Usage:
    # Resume from command line
    python3 scripts/resume_research.py --session research-20240115-001

    # Resume programmatically
    from scripts.resume_research import resume_research
    result = resume_research("research-20240115-001")

Exit Codes:
    0 - Successfully resumed or already completed
    1 - Session not found or not resumable
    2 - Unknown phase or invalid state
"""

import sys
import os
from pathlib import Path
from typing import Dict, Any, Optional
from dataclasses import dataclass

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.state_manager import (
    StateManager,
    SessionStatus,
    AgentStatus
)


@dataclass
class ResumeStatus:
    """Result of resume operation"""
    status: str
    message: str
    phase: Optional[int] = None
    completed_agents: int = 0
    pending_agents: int = 0
    output_directory: Optional[str] = None
    next_action: Optional[str] = None


def resume_research(session_id: str) -> ResumeStatus:
    """
    Resume research session from last checkpoint

    Args:
        session_id: Session ID to resume

    Returns:
        ResumeStatus with details about resumption

    Raises:
        ValueError: If session not found
    """
    sm = StateManager()

    try:
        # Load session
        session = sm.get_session(session_id)

        if not session:
            raise ValueError(f"Session not found: {session_id}")

        # Check if already completed
        if session.status == SessionStatus.COMPLETED.value:
            return ResumeStatus(
                status='already_completed',
                message=f'Session {session_id} already completed',
                output_directory=session.output_directory,
                next_action='View results in output directory'
            )

        # Check if resumable
        resumable_states = [
            SessionStatus.EXECUTING.value,
            SessionStatus.SYNTHESIZING.value,
            SessionStatus.VALIDATING.value,
            SessionStatus.FAILED.value  # Allow retry on failure
        ]

        if session.status not in resumable_states:
            return ResumeStatus(
                status='not_resumable',
                message=f'Session in "{session.status}" state, cannot resume. '
                        f'Resumable states: {resumable_states}',
                next_action='Start a new research session'
            )

        # Detect current phase
        phase_info = detect_current_phase(sm, session_id)

        print(f"\n{'='*60}")
        print(f"Resuming Research Session")
        print(f"{'='*60}")
        print(f"Session ID: {session_id}")
        print(f"Topic: {session.research_topic}")
        print(f"Status: {session.status}")
        print(f"Current Phase: {phase_info['phase']}")
        print(f"{'='*60}\n")

        # Resume from appropriate phase
        if phase_info['phase'] == 3:
            return resume_from_phase_3(sm, session_id, phase_info)
        elif phase_info['phase'] == 4:
            return resume_from_phase_4(sm, session_id, phase_info)
        elif phase_info['phase'] == 5:
            return resume_from_phase_5(sm, session_id, phase_info)
        elif phase_info['phase'] >= 6:
            return ResumeStatus(
                status='advanced_phase',
                message=f'Session in Phase {phase_info["phase"]}, '
                        'manual intervention may be required',
                phase=phase_info['phase'],
                next_action='Use research-executor skill to continue'
            )
        else:
            return ResumeStatus(
                status='unknown_phase',
                message='Cannot determine phase to resume from',
                next_action='Check session state manually'
            )

    finally:
        sm.close()


def detect_current_phase(sm: StateManager, session_id: str) -> Dict[str, Any]:
    """
    Detect which phase the session is currently in

    Args:
        sm: StateManager instance
        session_id: Session to check

    Returns:
        Dict with phase number and details
    """
    session = sm.get_session(session_id)

    # Phase 1-2: Planning (no agents deployed yet)
    agents = sm.get_session_agents(session_id)
    if not agents:
        return {
            'phase': 2,
            'description': 'Planning phase - no agents deployed',
            'completed': False
        }

    # Phase 3: Agent deployment and querying
    completed_agents = [a for a in agents if a.status == AgentStatus.COMPLETED.value]
    failed_agents = [a for a in agents if a.status in [AgentStatus.FAILED.value, AgentStatus.TIMEOUT.value]]
    running_agents = [a for a in agents if a.status == AgentStatus.RUNNING.value]

    # Still in Phase 3 if any agents are pending or running
    if running_agents or (len(completed_agents) < len(agents)):
        return {
            'phase': 3,
            'description': 'Phase 3: Agent deployment',
            'completed_agents': len(completed_agents),
            'total_agents': len(agents),
            'pending_agents': len(agents) - len(completed_agents),
            'failed_agents': len(failed_agents)
        }

    # All agents completed - check if Phase 4 started
    # Phase 4: MCP processing (check for processed directory)
    if session.output_directory:
        processed_dir = Path(session.output_directory) / "processed"
        fact_ledger = processed_dir / "fact_ledger.md"

        # If fact ledger doesn't exist, we're either at end of Phase 3 or start of Phase 4
        if not fact_ledger.exists():
            # All agents completed but no fact ledger = ready for Phase 4
            return {
                'phase': 3,
                'description': 'Phase 3: Complete, ready for Phase 4',
                'completed_agents': len(completed_agents),  # Use consistent key
                'total_agents': len(agents),
                'pending_agents': 0,
                'fact_ledger_exists': False,
                'phase_3_complete': True
            }

        # Phase 5: Synthesis
        synthesis_file = processed_dir / "synthesis.md"
        if not synthesis_file.exists():
            return {
                'phase': 5,
                'description': 'Phase 5: Synthesis',
                'fact_ledger_exists': True,
                'synthesis_exists': False
            }

        # Phase 6+: Later phases
        return {
            'phase': 6,
            'description': 'Phase 6+: Advanced processing',
            'all_files_present': True
        }

    # All agents completed but no output directory set = Phase 3 complete
    return {
        'phase': 3,
        'description': 'Phase 3: Complete',
        'completed_agents': len(completed_agents),  # Use consistent key
        'total_agents': len(agents),
        'pending_agents': 0,
        'phase_3_complete': True
    }


def resume_from_phase_3(
    sm: StateManager,
    session_id: str,
    phase_info: Dict[str, Any]
) -> ResumeStatus:
    """
    Resume from Phase 3 (agent deployment)

    Args:
        sm: StateManager instance
        session_id: Session to resume
        phase_info: Phase detection info

    Returns:
        ResumeStatus with resumption details
    """
    completed = phase_info.get('completed_agents', 0)
    total = phase_info.get('total_agents', 0)
    pending = phase_info.get('pending_agents', 0)

    if pending == 0:
        # All agents completed, ready for Phase 4
        print("✓ All agents completed successfully")
        print("→ Ready to proceed to Phase 4 (MCP Processing)")

        return ResumeStatus(
            status='phase_3_complete',
            message=f'Phase 3 complete: {completed}/{total} agents finished',
            phase=3,
            completed_agents=completed,
            pending_agents=0,
            next_action='Call research-orchestrator-agent to continue from Phase 4'
        )
    else:
        # Partial completion - can resume remaining agents
        print(f"⚠️  Phase 3 partially complete: {completed}/{total} agents finished")
        print(f"→  {pending} agents still pending")
        print(f"\nTo resume:")
        print(f"  1. Use research-orchestrator-agent with --resume flag")
        print(f"  2. Or call execute_phase_3_with_recovery() directly")

        return ResumeStatus(
            status='phase_3_partial',
            message=f'Phase 3 partial: {completed}/{total} agents complete, {pending} pending',
            phase=3,
            completed_agents=completed,
            pending_agents=pending,
            next_action='Resume remaining agents using research-orchestrator-agent'
        )


def resume_from_phase_4(
    sm: StateManager,
    session_id: str,
    phase_info: Dict[str, Any]
) -> ResumeStatus:
    """
    Resume from Phase 4 (MCP processing)

    Args:
        sm: StateManager instance
        session_id: Session to resume
        phase_info: Phase detection info

    Returns:
        ResumeStatus with resumption details
    """
    agents_count = phase_info.get('agents_completed', 0)
    fact_ledger_exists = phase_info.get('fact_ledger_exists', False)

    if fact_ledger_exists:
        print("✓ Phase 4 (MCP processing) already complete")
        print("→ Ready to proceed to Phase 5 (Synthesis)")

        return ResumeStatus(
            status='phase_4_complete',
            message='Phase 4 complete, ready for synthesis',
            phase=4,
            completed_agents=agents_count,
            next_action='Proceed to Phase 5 synthesis'
        )
    else:
        print(f"⚠️  Phase 4 not complete: fact ledger not found")
        print(f"→  Need to process {agents_count} agent outputs")

        return ResumeStatus(
            status='phase_4_pending',
            message=f'Phase 4 pending: {agents_count} outputs need processing',
            phase=4,
            completed_agents=agents_count,
            next_action='Run MCP processing on agent outputs'
        )


def resume_from_phase_5(
    sm: StateManager,
    session_id: str,
    phase_info: Dict[str, Any]
) -> ResumeStatus:
    """
    Resume from Phase 5 (synthesis)

    Args:
        sm: StateManager instance
        session_id: Session to resume
        phase_info: Phase detection info

    Returns:
        ResumeStatus with resumption details
    """
    synthesis_exists = phase_info.get('synthesis_exists', False)

    if synthesis_exists:
        print("✓ Phase 5 (Synthesis) already complete")
        print("→ Ready to proceed to Phase 6 (Validation)")

        return ResumeStatus(
            status='phase_5_complete',
            message='Phase 5 complete, ready for validation',
            phase=5,
            next_action='Proceed to Phase 6 validation'
        )
    else:
        print("⚠️  Phase 5 not complete: synthesis not found")
        print("→  Need to run synthesis on fact ledger")

        return ResumeStatus(
            status='phase_5_pending',
            message='Phase 5 pending: synthesis needed',
            phase=5,
            next_action='Run synthesis on fact ledger'
        )


def validate_session_files(session_id: str) -> Dict[str, bool]:
    """
    Validate that all expected files exist for session

    Args:
        session_id: Session to validate

    Returns:
        Dict of file validation results
    """
    sm = StateManager()

    try:
        session = sm.get_session(session_id)
        if not session or not session.output_directory:
            return {'valid': False, 'reason': 'No output directory'}

        output_dir = Path(session.output_directory)

        # Check directories
        raw_dir = output_dir / "raw"
        processed_dir = output_dir / "processed"

        validation = {
            'output_dir_exists': output_dir.exists(),
            'raw_dir_exists': raw_dir.exists(),
            'processed_dir_exists': processed_dir.exists(),
            'agent_outputs': []
        }

        # Check agent output files
        if raw_dir.exists():
            agents = sm.get_session_agents(
                session_id,
                status=AgentStatus.COMPLETED.value
            )

            for agent in agents:
                if agent.output_file:
                    file_path = output_dir / agent.output_file
                    validation['agent_outputs'].append({
                        'agent_id': agent.agent_id,
                        'file': agent.output_file,
                        'exists': file_path.exists(),
                        'size': file_path.stat().st_size if file_path.exists() else 0
                    })

        return validation

    finally:
        sm.close()


def main():
    """CLI entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Resume research session from checkpoint",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Resume session
  python3 scripts/resume_research.py --session research-20240115-001

  # Validate session files only
  python3 scripts/resume_research.py --session research-20240115-001 --validate

  # Show session status
  python3 scripts/resume_research.py --session research-20240115-001 --status
        """
    )

    parser.add_argument(
        "--session",
        required=True,
        help="Session ID to resume"
    )

    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate session files only (don't resume)"
    )

    parser.add_argument(
        "--status",
        action="store_true",
        help="Show session status only (don't resume)"
    )

    args = parser.parse_args()

    try:
        if args.validate:
            # Validate files
            print(f"\nValidating session: {args.session}")
            validation = validate_session_files(args.session)

            print("\nValidation Results:")
            print(f"  Output directory: {'✓' if validation['output_dir_exists'] else '✗'}")
            print(f"  Raw directory: {'✓' if validation['raw_dir_exists'] else '✗'}")
            print(f"  Processed directory: {'✓' if validation['processed_dir_exists'] else '✗'}")

            if validation['agent_outputs']:
                print(f"\n  Agent Outputs:")
                for output in validation['agent_outputs']:
                    status = '✓' if output['exists'] else '✗'
                    size = f"({output['size']:,} bytes)" if output['exists'] else "(missing)"
                    print(f"    {status} {output['agent_id']}: {output['file']} {size}")

            return 0

        elif args.status:
            # Show status only
            sm = StateManager()
            try:
                session = sm.get_session(args.session)
                if not session:
                    print(f"Session not found: {args.session}")
                    return 1

                phase_info = detect_current_phase(sm, args.session)

                print(f"\nSession Status:")
                print(f"  ID: {session.session_id}")
                print(f"  Topic: {session.research_topic}")
                print(f"  Status: {session.status}")
                print(f"  Phase: {phase_info['phase']} - {phase_info['description']}")
                print(f"  Created: {session.created_at}")

                if 'completed_agents' in phase_info:
                    print(f"  Agents: {phase_info['completed_agents']}/{phase_info['total_agents']} completed")

            finally:
                sm.close()

            return 0

        else:
            # Resume session
            result = resume_research(args.session)

            print(f"\n{'='*60}")
            print("Resume Result")
            print(f"{'='*60}")
            print(f"Status: {result.status}")
            print(f"Message: {result.message}")
            if result.phase:
                print(f"Phase: {result.phase}")
            if result.completed_agents:
                print(f"Completed Agents: {result.completed_agents}")
            if result.pending_agents:
                print(f"Pending Agents: {result.pending_agents}")
            if result.next_action:
                print(f"\nNext Action: {result.next_action}")
            print(f"{'='*60}\n")

            # Return appropriate exit code
            if result.status in ['already_completed', 'phase_3_complete', 'phase_4_complete', 'phase_5_complete']:
                return 0
            elif result.status in ['not_resumable', 'unknown_phase']:
                return 1
            else:
                return 2

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
