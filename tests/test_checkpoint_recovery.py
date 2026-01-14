"""
Test Checkpoint Recovery Functionality

Simulates research session interruptions and tests automatic recovery.

Run:
    python3 tests/test_checkpoint_recovery.py
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.state_manager import (
    StateManager,
    ResearchSession,
    ResearchAgent,
    ResearchType,
    SessionStatus,
    AgentStatus
)
from scripts.resume_research import (
    resume_research,
    detect_current_phase,
    validate_session_files
)


def test_partial_agent_completion():
    """Test 1: Resume from partial agent completion"""
    print("=" * 60)
    print("TEST 1: Partial Agent Completion")
    print("=" * 60)

    sm = StateManager()
    session_id = "test-checkpoint-001"

    try:
        # Create test session
        print("\n1. Creating test session...")
        session = ResearchSession(
            session_id=session_id,
            research_topic="Test Checkpoint Recovery",
            research_type=ResearchType.DEEP.value,
            status=SessionStatus.EXECUTING.value,
            output_directory=f"RESEARCH/test-checkpoint-001"
        )
        sm.create_session(session)

        # Create output directory
        output_dir = Path(session.output_directory)
        output_dir.mkdir(parents=True, exist_ok=True)
        raw_dir = output_dir / "raw"
        raw_dir.mkdir(exist_ok=True)

        # Register 5 agents (simulate Phase 3)
        print("2. Registering 5 agents...")
        agent_ids = []
        for i in range(1, 6):
            agent_id = f"agent_{i:02d}"
            agent = ResearchAgent(
                agent_id=agent_id,
                session_id=session_id,
                agent_type="web-research",
                agent_role=f"Research agent {i}",
                status=AgentStatus.DEPLOYING.value,
                focus_description=f"Focus area {i}"
            )
            sm.register_agent(agent)
            agent_ids.append(agent_id)

        # Mark first 3 agents as completed
        print("3. Marking 3 agents as completed...")
        for i in range(3):
            agent_id = agent_ids[i]

            # Create mock output file
            output_file = raw_dir / f"agent_{i+1:02d}.md"
            with open(output_file, 'w') as f:
                f.write(f"# Agent {i+1} Results\n\nMock research findings...")

            # Update status
            sm.update_agent_status(agent_id, AgentStatus.COMPLETED.value)
            sm.update_agent(agent_id, output_file=f"raw/agent_{i+1:02d}.md")

        # Mark agent 4 as failed
        print("4. Marking agent 4 as failed...")
        sm.update_agent_status(agent_ids[3], AgentStatus.FAILED.value)

        # Agent 5 remains in DEPLOYING state (interrupted)

        # Test phase detection
        print("\n5. Testing phase detection...")
        phase_info = detect_current_phase(sm, session_id)

        print(f"   Phase: {phase_info['phase']}")
        print(f"   Description: {phase_info['description']}")
        print(f"   Completed agents: {phase_info.get('completed_agents', 0)}")
        print(f"   Pending agents: {phase_info.get('pending_agents', 0)}")

        assert phase_info['phase'] == 3, "Should detect Phase 3"
        assert phase_info['completed_agents'] == 3, "Should find 3 completed agents"
        assert phase_info['pending_agents'] == 2, "Should find 2 pending agents"

        # Test resume
        print("\n6. Testing resume...")
        result = resume_research(session_id)

        print(f"   Status: {result.status}")
        print(f"   Message: {result.message}")
        print(f"   Completed: {result.completed_agents}")
        print(f"   Pending: {result.pending_agents}")

        assert result.status == 'phase_3_partial', "Should be partial completion"
        assert result.completed_agents == 3, "Should report 3 completed"
        assert result.pending_agents == 2, "Should report 2 pending"

        print("\n✓ TEST 1 PASSED: Partial completion detected correctly")
        return True

    except Exception as e:
        print(f"\n✗ TEST 1 FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        # Cleanup
        print("\n7. Cleaning up...")
        sm.delete_session(session_id)
        if output_dir.exists():
            import shutil
            shutil.rmtree(output_dir)
        sm.close()


def test_all_agents_completed():
    """Test 2: All agents completed, ready for Phase 4"""
    print("\n" + "=" * 60)
    print("TEST 2: All Agents Completed")
    print("=" * 60)

    sm = StateManager()
    session_id = "test-checkpoint-002"

    try:
        # Create session
        print("\n1. Creating test session...")
        session = ResearchSession(
            session_id=session_id,
            research_topic="Test All Completed",
            research_type=ResearchType.DEEP.value,
            status=SessionStatus.EXECUTING.value,
            output_directory=f"RESEARCH/test-checkpoint-002"
        )
        sm.create_session(session)

        # Create directories
        output_dir = Path(session.output_directory)
        output_dir.mkdir(parents=True, exist_ok=True)
        raw_dir = output_dir / "raw"
        raw_dir.mkdir(exist_ok=True)

        # Register and complete all agents
        print("2. Completing all 3 agents...")
        for i in range(1, 4):
            agent_id = f"agent_{i:02d}"

            # Register
            agent = ResearchAgent(
                agent_id=agent_id,
                session_id=session_id,
                agent_type="web-research",
                agent_role=f"Agent {i}",
                status=AgentStatus.DEPLOYING.value
            )
            sm.register_agent(agent)

            # Create output
            output_file = raw_dir / f"agent_{i:02d}.md"
            with open(output_file, 'w') as f:
                f.write(f"# Agent {i} Results\n")

            # Mark completed
            sm.update_agent_status(agent_id, AgentStatus.COMPLETED.value)
            sm.update_agent(agent_id, output_file=f"raw/agent_{i:02d}.md")

        # Test phase detection
        print("\n3. Testing phase detection...")
        phase_info = detect_current_phase(sm, session_id)

        print(f"   Phase: {phase_info['phase']}")
        print(f"   Completed: {phase_info.get('completed_agents', 0)}")

        assert phase_info['phase'] == 3, "Should still be Phase 3"
        assert phase_info['completed_agents'] == 3, "All agents completed"

        # Test resume
        print("\n4. Testing resume...")
        result = resume_research(session_id)

        print(f"   Status: {result.status}")
        print(f"   Message: {result.message}")

        assert result.status == 'phase_3_complete', "Should be Phase 3 complete"
        assert result.pending_agents == 0, "No pending agents"

        print("\n✓ TEST 2 PASSED: All agents completion detected")
        return True

    except Exception as e:
        print(f"\n✗ TEST 2 FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        # Cleanup
        print("\n5. Cleaning up...")
        sm.delete_session(session_id)
        if output_dir.exists():
            import shutil
            shutil.rmtree(output_dir)
        sm.close()


def test_file_validation():
    """Test 3: File validation"""
    print("\n" + "=" * 60)
    print("TEST 3: File Validation")
    print("=" * 60)

    sm = StateManager()
    session_id = "test-checkpoint-003"

    try:
        # Create session
        print("\n1. Creating test session with files...")
        session = ResearchSession(
            session_id=session_id,
            research_topic="Test File Validation",
            research_type=ResearchType.DEEP.value,
            status=SessionStatus.EXECUTING.value,
            output_directory=f"RESEARCH/test-checkpoint-003"
        )
        sm.create_session(session)

        # Create directories and files
        output_dir = Path(session.output_directory)
        output_dir.mkdir(parents=True, exist_ok=True)
        raw_dir = output_dir / "raw"
        raw_dir.mkdir(exist_ok=True)

        # Register agent with output file
        agent = ResearchAgent(
            agent_id="agent_01",
            session_id=session_id,
            agent_type="web-research",
            agent_role="Agent 1",
            status=AgentStatus.COMPLETED.value,
            output_file="raw/agent_01.md"
        )
        sm.register_agent(agent)

        # Create actual file
        output_file = raw_dir / "agent_01.md"
        with open(output_file, 'w') as f:
            f.write("# Agent 1 Results\n" * 100)

        # Validate
        print("\n2. Validating files...")
        validation = validate_session_files(session_id)

        print(f"   Output dir exists: {validation['output_dir_exists']}")
        print(f"   Raw dir exists: {validation['raw_dir_exists']}")
        print(f"   Agent outputs: {len(validation['agent_outputs'])}")

        if validation['agent_outputs']:
            output = validation['agent_outputs'][0]
            print(f"   File exists: {output['exists']}")
            print(f"   File size: {output['size']} bytes")

        assert validation['output_dir_exists'], "Output dir should exist"
        assert validation['raw_dir_exists'], "Raw dir should exist"
        assert len(validation['agent_outputs']) == 1, "Should find 1 agent output"
        assert validation['agent_outputs'][0]['exists'], "File should exist"
        assert validation['agent_outputs'][0]['size'] > 0, "File should have content"

        print("\n✓ TEST 3 PASSED: File validation working")
        return True

    except Exception as e:
        print(f"\n✗ TEST 3 FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        # Cleanup
        print("\n3. Cleaning up...")
        sm.delete_session(session_id)
        if output_dir.exists():
            import shutil
            shutil.rmtree(output_dir)
        sm.close()


def test_already_completed():
    """Test 4: Session already completed"""
    print("\n" + "=" * 60)
    print("TEST 4: Already Completed Session")
    print("=" * 60)

    sm = StateManager()
    session_id = "test-checkpoint-004"

    try:
        # Create completed session
        print("\n1. Creating completed session...")
        session = ResearchSession(
            session_id=session_id,
            research_topic="Test Already Completed",
            research_type=ResearchType.DEEP.value,
            status=SessionStatus.COMPLETED.value,
            output_directory="RESEARCH/test-completed"
        )
        sm.create_session(session)

        # Try to resume
        print("\n2. Attempting to resume completed session...")
        result = resume_research(session_id)

        print(f"   Status: {result.status}")
        print(f"   Message: {result.message}")

        assert result.status == 'already_completed', "Should detect completion"

        print("\n✓ TEST 4 PASSED: Completed session detected")
        return True

    except Exception as e:
        print(f"\n✗ TEST 4 FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        # Cleanup
        print("\n3. Cleaning up...")
        sm.delete_session(session_id)
        sm.close()


def run_all_tests():
    """Run all checkpoint recovery tests"""
    print("\n" + "╔" + "=" * 58 + "╗")
    print("║  Checkpoint Recovery Test Suite                         ║")
    print("╚" + "=" * 58 + "╝")

    results = []

    # Test 1: Partial agent completion
    try:
        result = test_partial_agent_completion()
        results.append(("Partial Agent Completion", result))
    except Exception as e:
        print(f"\nTest 1 crashed: {e}")
        results.append(("Partial Agent Completion", False))

    # Test 2: All agents completed
    try:
        result = test_all_agents_completed()
        results.append(("All Agents Completed", result))
    except Exception as e:
        print(f"\nTest 2 crashed: {e}")
        results.append(("All Agents Completed", False))

    # Test 3: File validation
    try:
        result = test_file_validation()
        results.append(("File Validation", result))
    except Exception as e:
        print(f"\nTest 3 crashed: {e}")
        results.append(("File Validation", False))

    # Test 4: Already completed
    try:
        result = test_already_completed()
        results.append(("Already Completed", result))
    except Exception as e:
        print(f"\nTest 4 crashed: {e}")
        results.append(("Already Completed", False))

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
        print("\n✅ All tests passed! Checkpoint recovery working correctly.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(run_all_tests())
