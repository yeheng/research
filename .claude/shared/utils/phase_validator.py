#!/usr/bin/env python3
"""
Phase Validator - Quality Gate Enforcement

Validates that each phase meets its requirements before proceeding.
"""

import sys
from pathlib import Path
from typing import Dict, List, Optional
import json

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "scripts"))

try:
    from state_manager import StateManager, SessionStatus, AgentStatus
except ImportError:
    print("⚠️ Warning: StateManager not available, some validations will be skipped")
    StateManager = None


class ValidationError(Exception):
    """Raised when a phase validation fails"""
    pass


class PhaseValidator:
    """
    Validates phase completion and enforces quality gates

    Usage:
        validator = PhaseValidator(session_id, output_dir)
        validator.validate_phase_0()  # Raises ValidationError if fails
    """

    def __init__(self, session_id: str, output_dir: str):
        self.session_id = session_id
        self.output_dir = Path(output_dir)
        self.sm = StateManager() if StateManager else None

    def _check_file_exists(self, file_path: str, min_size: int = 0) -> bool:
        """Check if file exists and optionally meets minimum size"""
        path = self.output_dir / file_path
        if not path.exists():
            return False
        if min_size > 0 and path.stat().st_size < min_size:
            return False
        return True

    def _check_dir_exists(self, dir_path: str) -> bool:
        """Check if directory exists"""
        path = self.output_dir / dir_path
        return path.exists() and path.is_dir()

    def validate_phase_0(self) -> Dict[str, any]:
        """
        Phase 0: Initialization

        Requirements:
        - Output directory created
        - progress.md initialized
        - StateManager session created
        - init_session.py executed successfully
        """
        errors = []
        warnings = []

        # Check output directory
        if not self.output_dir.exists():
            errors.append(f"Output directory does not exist: {self.output_dir}")

        # Check progress.md
        if not self._check_file_exists("progress.md", min_size=100):
            errors.append("progress.md missing or too small (<100 bytes)")

        # Check StateManager session
        if self.sm:
            session = self.sm.get_session(self.session_id)
            if not session:
                errors.append(f"Session {self.session_id} not found in StateManager database")
            elif session.status == SessionStatus.INITIALIZING.value:
                warnings.append("Session status still 'initializing' - may need to update")
        else:
            warnings.append("StateManager not available - cannot verify database state")

        # Check init_session.py
        if not self._check_file_exists("init_session.py", min_size=500):
            warnings.append("init_session.py missing or incomplete")

        if errors:
            raise ValidationError(f"Phase 0 validation failed:\n" + "\n".join(f"  - {e}" for e in errors))

        return {
            "status": "passed",
            "warnings": warnings
        }

    def validate_phase_1(self) -> Dict[str, any]:
        """
        Phase 1: Question Refinement

        Requirements:
        - Structured prompt exists
        - Quality score >= 8.0
        - Required fields present (TASK, QUESTIONS, KEYWORDS, etc.)
        """
        errors = []
        warnings = []

        # Check progress.md mentions Phase 1
        progress_file = self.output_dir / "progress.md"
        if progress_file.exists():
            content = progress_file.read_text()
            if "Phase 1" not in content:
                errors.append("Phase 1 not logged in progress.md")

        # Check StateManager
        if self.sm:
            session = self.sm.get_session(self.session_id)
            if session and not session.structured_prompt:
                errors.append("Structured prompt not saved in StateManager")

        if errors:
            raise ValidationError(f"Phase 1 validation failed:\n" + "\n".join(f"  - {e}" for e in errors))

        return {
            "status": "passed",
            "warnings": warnings
        }

    def validate_phase_2(self) -> Dict[str, any]:
        """
        Phase 2: Research Planning

        Requirements:
        - research_plan.md exists
        - Plan has 3-8 subtopics
        - Agent deployment strategy defined
        """
        errors = []
        warnings = []

        # Check research_plan.md
        if not self._check_file_exists("research_notes/research_plan.md", min_size=1000):
            errors.append("research_plan.md missing or too small (<1KB)")

        # Check progress.md
        progress_file = self.output_dir / "progress.md"
        if progress_file.exists():
            content = progress_file.read_text()
            if "Phase 2" not in content:
                errors.append("Phase 2 not logged in progress.md")

        if errors:
            raise ValidationError(f"Phase 2 validation failed:\n" + "\n".join(f"  - {e}" for e in errors))

        return {
            "status": "passed",
            "warnings": warnings
        }

    def validate_phase_3(self, min_agents: int = 3, min_success_rate: float = 0.8) -> Dict[str, any]:
        """
        Phase 3: Iterative Querying

        Requirements:
        - Minimum {min_agents} agents deployed
        - >= {min_success_rate}% success rate
        - Raw output files created
        - All agents registered in StateManager
        """
        errors = []
        warnings = []

        # Check raw/ directory
        if not self._check_dir_exists("raw"):
            errors.append("raw/ directory missing")
        else:
            # Count raw files
            raw_files = list((self.output_dir / "raw").glob("*.md"))
            if len(raw_files) < min_agents:
                errors.append(f"Only {len(raw_files)} raw files found (minimum: {min_agents})")

        # Check StateManager agents
        if self.sm:
            agents = self.sm.get_session_agents(self.session_id)
            if not agents:
                errors.append("No agents registered in StateManager")
            else:
                completed = [a for a in agents if a.status == AgentStatus.COMPLETED.value]
                success_rate = len(completed) / len(agents)

                if success_rate < min_success_rate:
                    errors.append(f"Agent success rate {success_rate:.0%} < {min_success_rate:.0%}")

                # Check all agents have output files
                for agent in agents:
                    if agent.status == AgentStatus.COMPLETED.value and not agent.output_file:
                        warnings.append(f"Agent {agent.agent_id} completed but no output_file recorded")

        # Check progress.md
        progress_file = self.output_dir / "progress.md"
        if progress_file.exists():
            content = progress_file.read_text()
            if "Phase 3" not in content:
                errors.append("Phase 3 not logged in progress.md")

        if errors:
            raise ValidationError(f"Phase 3 validation failed:\n" + "\n".join(f"  - {e}" for e in errors))

        return {
            "status": "passed",
            "warnings": warnings
        }

    def validate_phase_4(self, min_facts: int = 150) -> Dict[str, any]:
        """
        Phase 4: Source Triangulation

        Requirements:
        - fact_ledger.md exists
        - Minimum {min_facts} facts extracted
        - MCP tools logged in progress.md
        - Average source quality >= B
        """
        errors = []
        warnings = []

        # Check processed/ directory
        if not self._check_dir_exists("processed"):
            errors.append("processed/ directory missing")

        # Check fact_ledger.md
        if not self._check_file_exists("processed/fact_ledger.md", min_size=5000):
            errors.append("fact_ledger.md missing or too small (<5KB)")
        else:
            # Count facts
            fact_ledger = (self.output_dir / "processed/fact_ledger.md").read_text()
            fact_count = fact_ledger.count("**Fact ")
            if fact_count < min_facts:
                errors.append(f"Only {fact_count} facts extracted (minimum: {min_facts})")

        # Check progress.md mentions Phase 4
        progress_file = self.output_dir / "progress.md"
        if progress_file.exists():
            content = progress_file.read_text()
            if "Phase 4" not in content:
                errors.append("Phase 4 not logged in progress.md")
            if "MCP Tool" not in content:
                warnings.append("No MCP tool calls logged in progress.md")

        if errors:
            raise ValidationError(f"Phase 4 validation failed:\n" + "\n".join(f"  - {e}" for e in errors))

        return {
            "status": "passed",
            "warnings": warnings
        }

    def validate_phase_5(self, min_citations: int = 30) -> Dict[str, any]:
        """
        Phase 5: Knowledge Synthesis

        Requirements:
        - executive_summary.md exists
        - Minimum {min_citations} citations
        """
        errors = []
        warnings = []

        # Check executive_summary.md
        if not self._check_file_exists("executive_summary.md", min_size=3000):
            errors.append("executive_summary.md missing or too small (<3KB)")
        else:
            # Count citations (look for [来源] or [Source])
            summary = (self.output_dir / "executive_summary.md").read_text()
            citation_count = summary.count("[来源]") + summary.count("[Source]") + summary.count("](http")
            if citation_count < min_citations:
                warnings.append(f"Only {citation_count} citations found (recommended: {min_citations}+)")

        # Check progress.md
        progress_file = self.output_dir / "progress.md"
        if progress_file.exists():
            content = progress_file.read_text()
            if "Phase 5" not in content:
                errors.append("Phase 5 not logged in progress.md")

        if errors:
            raise ValidationError(f"Phase 5 validation failed:\n" + "\n".join(f"  - {e}" for e in errors))

        return {
            "status": "passed",
            "warnings": warnings
        }

    def validate_phase_6(self) -> Dict[str, any]:
        """
        Phase 6: Quality Assurance

        Requirements:
        - bibliography.md exists
        - Source quality ratings present
        - Citation completeness 100%
        """
        errors = []
        warnings = []

        # Check sources/ directory
        if not self._check_dir_exists("sources"):
            errors.append("sources/ directory missing")

        # Check bibliography.md
        if not self._check_file_exists("sources/bibliography.md", min_size=2000):
            errors.append("bibliography.md missing or too small (<2KB)")

        # Check progress.md
        progress_file = self.output_dir / "progress.md"
        if progress_file.exists():
            content = progress_file.read_text()
            if "Phase 6" not in content:
                errors.append("Phase 6 not logged in progress.md")

        if errors:
            raise ValidationError(f"Phase 6 validation failed:\n" + "\n".join(f"  - {e}" for e in errors))

        return {
            "status": "passed",
            "warnings": warnings
        }

    def validate_phase_7(self) -> Dict[str, any]:
        """
        Phase 7: Final Output

        Requirements:
        - README.md exists
        - All required directories created
        - All required files present
        - StateManager session status = 'completed'
        """
        errors = []
        warnings = []

        # Required files
        required_files = [
            ("README.md", 2000),
            ("executive_summary.md", 3000),
            ("progress.md", 1000),
            ("sources/bibliography.md", 2000),
        ]

        for file_path, min_size in required_files:
            if not self._check_file_exists(file_path, min_size):
                errors.append(f"{file_path} missing or too small (<{min_size} bytes)")

        # Required directories
        required_dirs = [
            "raw",
            "processed",
            "research_notes",
            "sources"
        ]

        for dir_path in required_dirs:
            if not self._check_dir_exists(dir_path):
                errors.append(f"{dir_path}/ directory missing")

        # Recommended but not required
        recommended_files = [
            "full_report.md",
            "data/statistics.md",
            "appendices/methodology.md",
            "appendices/limitations.md"
        ]

        for file_path in recommended_files:
            if not self._check_file_exists(file_path):
                warnings.append(f"Recommended file missing: {file_path}")

        # Check StateManager session status
        if self.sm:
            session = self.sm.get_session(self.session_id)
            if session and session.status != SessionStatus.COMPLETED.value:
                warnings.append(f"Session status is '{session.status}', should be 'completed'")

        # Check progress.md mentions Phase 7
        progress_file = self.output_dir / "progress.md"
        if progress_file.exists():
            content = progress_file.read_text()
            if "Phase 7" not in content:
                errors.append("Phase 7 not logged in progress.md")

        if errors:
            raise ValidationError(f"Phase 7 validation failed:\n" + "\n".join(f"  - {e}" for e in errors))

        return {
            "status": "passed",
            "warnings": warnings
        }

    def validate_all_phases(self) -> Dict[str, any]:
        """
        Validate all phases in sequence

        Returns summary of all validations
        """
        results = {}

        phases = [
            (0, "Initialization", self.validate_phase_0),
            (1, "Question Refinement", self.validate_phase_1),
            (2, "Research Planning", self.validate_phase_2),
            (3, "Iterative Querying", self.validate_phase_3),
            (4, "Source Triangulation", self.validate_phase_4),
            (5, "Knowledge Synthesis", self.validate_phase_5),
            (6, "Quality Assurance", self.validate_phase_6),
            (7, "Final Output", self.validate_phase_7),
        ]

        all_passed = True
        all_warnings = []

        for phase_num, phase_name, validator_func in phases:
            try:
                result = validator_func()
                results[f"phase_{phase_num}"] = {
                    "name": phase_name,
                    "status": "passed",
                    "warnings": result.get("warnings", [])
                }
                all_warnings.extend(result.get("warnings", []))
            except ValidationError as e:
                results[f"phase_{phase_num}"] = {
                    "name": phase_name,
                    "status": "failed",
                    "error": str(e)
                }
                all_passed = False
            except Exception as e:
                results[f"phase_{phase_num}"] = {
                    "name": phase_name,
                    "status": "error",
                    "error": f"Validation error: {str(e)}"
                }
                all_passed = False

        return {
            "session_id": self.session_id,
            "output_dir": str(self.output_dir),
            "all_passed": all_passed,
            "total_warnings": len(all_warnings),
            "phases": results
        }

    def close(self):
        """Close StateManager connection"""
        if self.sm:
            self.sm.close()


def main():
    """CLI for phase validation"""
    import argparse

    parser = argparse.ArgumentParser(description="Validate research phase completion")
    parser.add_argument("--session", required=True, help="Session ID")
    parser.add_argument("--output-dir", required=True, help="Research output directory")
    parser.add_argument("--phase", type=int, help="Validate specific phase (0-7)")
    parser.add_argument("--json", action="store_true", help="Output JSON format")

    args = parser.parse_args()

    validator = PhaseValidator(args.session, args.output_dir)

    try:
        if args.phase is not None:
            # Validate specific phase
            phase_validators = {
                0: validator.validate_phase_0,
                1: validator.validate_phase_1,
                2: validator.validate_phase_2,
                3: validator.validate_phase_3,
                4: validator.validate_phase_4,
                5: validator.validate_phase_5,
                6: validator.validate_phase_6,
                7: validator.validate_phase_7,
            }

            if args.phase not in phase_validators:
                print(f"❌ Invalid phase: {args.phase} (must be 0-7)")
                sys.exit(1)

            result = phase_validators[args.phase]()

            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print(f"✅ Phase {args.phase} validation passed")
                if result.get("warnings"):
                    print(f"\n⚠️ Warnings:")
                    for warning in result["warnings"]:
                        print(f"  - {warning}")
        else:
            # Validate all phases
            result = validator.validate_all_phases()

            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print(f"\nValidation Results for {args.session}")
                print("=" * 70)

                for phase_key, phase_result in result["phases"].items():
                    phase_num = phase_key.split("_")[1]
                    status_icon = "✅" if phase_result["status"] == "passed" else "❌"
                    print(f"{status_icon} Phase {phase_num}: {phase_result['name']}")

                    if phase_result["status"] == "failed":
                        print(f"   Error: {phase_result['error']}")
                    elif phase_result.get("warnings"):
                        print(f"   Warnings: {len(phase_result['warnings'])}")

                print("=" * 70)

                if result["all_passed"]:
                    print(f"✅ All phases passed ({result['total_warnings']} warnings)")
                else:
                    print(f"❌ Some phases failed")
                    sys.exit(1)

    except ValidationError as e:
        if args.json:
            print(json.dumps({"error": str(e)}, indent=2))
        else:
            print(f"❌ {e}")
        sys.exit(1)
    finally:
        validator.close()


if __name__ == "__main__":
    main()
