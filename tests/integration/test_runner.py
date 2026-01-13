"""
Integration Test Runner for Deep Research Framework v2.0

This module provides utilities for running integration tests across
all three architectural layers with proper reporting and cleanup.
"""

import os
import sys
import time
import asyncio
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
import json


class TestStatus(Enum):
    """Test execution status."""
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"


@dataclass
class TestResult:
    """Result of a single test execution."""
    test_name: str
    status: TestStatus
    duration: float = 0.0
    error_message: str = ""
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "test_name": self.test_name,
            "status": self.status.value,
            "duration": self.duration,
            "error_message": self.error_message,
            "details": self.details
        }


@dataclass
class TestSuiteResult:
    """Result of a test suite execution."""
    suite_name: str
    tests: List[TestResult] = field(default_factory=list)
    total_duration: float = 0.0
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    errors: int = 0

    def add_result(self, result: TestResult) -> None:
        """Add a test result to the suite."""
        self.tests.append(result)
        self.total_duration += result.duration

        if result.status == TestStatus.PASSED:
            self.passed += 1
        elif result.status == TestStatus.FAILED:
            self.failed += 1
        elif result.status == TestStatus.SKIPPED:
            self.skipped += 1
        elif result.status == TestStatus.ERROR:
            self.errors += 1

    def summary(self) -> str:
        """Generate a summary string."""
        total = len(self.tests)
        pass_rate = (self.passed / total * 100) if total > 0 else 0

        return (
            f"Suite: {self.suite_name}\n"
            f"  Total: {total} | "
            f"Passed: {self.passed} | "
            f"Failed: {self.failed} | "
            f"Skipped: {self.skipped} | "
            f"Errors: {self.errors}\n"
            f"  Pass Rate: {pass_rate:.1f}% | "
            f"Duration: {self.total_duration:.2f}s"
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "suite_name": self.suite_name,
            "total_tests": len(self.tests),
            "passed": self.passed,
            "failed": self.failed,
            "skipped": self.skipped,
            "errors": self.errors,
            "pass_rate": (self.passed / len(self.tests) * 100) if self.tests else 0,
            "total_duration": self.total_duration,
            "tests": [t.to_dict() for t in self.tests]
        }


class IntegrationTestRunner:
    """
    Main test runner for integration tests.

    Supports:
    - Running tests by layer/category
    - Parallel test execution
    - Detailed reporting (console, JSON, HTML)
    - Cleanup and teardown
    - Retry logic for flaky tests
    """

    def __init__(
        self,
        output_dir: Optional[Path] = None,
        verbose: bool = False,
        parallel: bool = False,
        retry_failed: int = 0
    ):
        """
        Initialize the test runner.

        Args:
            output_dir: Directory for test outputs and reports
            verbose: Enable verbose output
            parallel: Run tests in parallel
            retry_failed: Number of times to retry failed tests
        """
        self.output_dir = output_dir or Path(__file__).parent / "outputs"
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.verbose = verbose
        self.parallel = parallel
        self.retry_failed = retry_failed

        self.suites: Dict[str, TestSuiteResult] = {}

    async def run_test(
        self,
        test_func: callable,
        test_name: str,
        **kwargs
    ) -> TestResult:
        """
        Run a single test function.

        Args:
            test_func: The test function to execute
            test_name: Name of the test
            **kwargs: Arguments to pass to the test function

        Returns:
            TestResult object
        """
        result = TestResult(test_name=test_name, status=TestStatus.RUNNING)

        if self.verbose:
            print(f"  Running: {test_name}...", end=" ", flush=True)

        start_time = time.time()

        try:
            # Check if test is async
            if asyncio.iscoroutinefunction(test_func):
                await test_func(**kwargs)
            else:
                test_func(**kwargs)

            result.status = TestStatus.PASSED
            if self.verbose:
                print("✅ PASSED")

        except AssertionError as e:
            result.status = TestStatus.FAILED
            result.error_message = str(e)
            if self.verbose:
                print(f"❌ FAILED: {e}")

        except Exception as e:
            result.status = TestStatus.ERROR
            result.error_message = f"{type(e).__name__}: {e}"
            if self.verbose:
                print(f"⚠️ ERROR: {e}")

        finally:
            result.duration = time.time() - start_time

        return result

    async def run_suite(
        self,
        suite_name: str,
        tests: List[callable],
        **kwargs
    ) -> TestSuiteResult:
        """
        Run a suite of tests.

        Args:
            suite_name: Name of the test suite
            tests: List of test functions to run
            **kwargs: Arguments to pass to all test functions

        Returns:
            TestSuiteResult object
        """
        suite_result = TestSuiteResult(suite_name=suite_name)

        print(f"\n{'='*60}")
        print(f"Running Test Suite: {suite_name}")
        print(f"Tests: {len(tests)}")
        print(f"{'='*60}\n")

        for test_func in tests:
            test_name = test_func.__name__
            result = await self.run_test(test_func, test_name, **kwargs)
            suite_result.add_result(result)

            # Retry failed tests if configured
            if result.status == TestStatus.FAILED and self.retry_failed > 0:
                for attempt in range(self.retry_failed):
                    print(f"    Retrying ({attempt + 1}/{self.retry_failed})...", end=" ")
                    retry_result = await self.run_test(test_func, test_name, **kwargs)

                    if retry_result.status == TestStatus.PASSED:
                        print("✅ Retry passed!")
                        suite_result.tests[-1] = retry_result
                        suite_result.failed -= 1
                        suite_result.passed += 1
                        break
                    else:
                        print("❌ Retry failed")

        self.suites[suite_name] = suite_result
        print(f"\n{suite_result.summary()}\n")

        return suite_result

    async def run_layer1_tests(self) -> TestSuiteResult:
        """Run Layer 1 tests (Skills integration)."""
        from test_layer1_skills import (
            test_question_refiner_validation,
            test_research_planner_execution,
            test_research_executor_invocation
        )

        tests = [
            test_question_refiner_validation,
            test_research_planner_execution,
            test_research_executor_invocation
        ]

        return await self.run_suite("Layer 1: Skills Integration", tests)

    async def run_layer2_tests(self) -> TestSuiteResult:
        """Run Layer 2 tests (Agents integration)."""
        from test_layer2_agents import (
            test_orchestrator_full_workflow,
            test_got_agent_optimization,
            test_red_team_validation,
            test_synthesizer_aggregation,
            test_ontology_scout_reconnaissance
        )

        tests = [
            test_orchestrator_full_workflow,
            test_got_agent_optimization,
            test_red_team_validation,
            test_synthesizer_aggregation,
            test_ontology_scout_reconnaissance
        ]

        return await self.run_suite("Layer 2: Agents Integration", tests)

    async def run_layer3_tests(self) -> TestSuiteResult:
        """Run Layer 3 tests (Infrastructure integration)."""
        from test_layer3_infrastructure import (
            test_mcp_tools_functionality,
            test_statemanager_operations
        )

        tests = [
            test_mcp_tools_functionality,
            test_statemanager_operations
        ]

        return await self.run_suite("Layer 3: Infrastructure Integration", tests)

    async def run_workflow_tests(self) -> TestSuiteResult:
        """Run end-to-end workflow tests."""
        from test_workflows import (
            test_simple_exploratory_research,
            test_standard_comparative_research,
            test_complex_deep_research_with_got
        )

        tests = [
            test_simple_exploratory_research,
            test_standard_comparative_research,
            test_complex_deep_research_with_got
        ]

        return await self.run_suite("Workflow Integration", tests)

    async def run_recovery_tests(self) -> TestSuiteResult:
        """Run failure recovery tests."""
        from test_recovery import (
            test_agent_timeout_recovery,
            test_quality_threshold_refinement
        )

        tests = [
            test_agent_timeout_recovery,
            test_quality_threshold_refinement
        ]

        return await self.run_suite("Failure Recovery", tests)

    async def run_performance_tests(self) -> TestSuiteResult:
        """Run performance tests."""
        from test_performance import (
            test_token_budget_compliance,
            test_parallel_agent_execution
        )

        tests = [
            test_token_budget_compliance,
            test_parallel_agent_execution
        ]

        return await self.run_suite("Performance", tests)

    async def run_all_tests(self) -> Dict[str, TestSuiteResult]:
        """Run all test suites."""
        print("\n" + "="*60)
        print("Deep Research Framework v2.0 - Integration Tests")
        print("="*60)

        all_results = {}

        # Run all suites
        all_results["layer1"] = await self.run_layer1_tests()
        all_results["layer2"] = await self.run_layer2_tests()
        all_results["layer3"] = await self.run_layer3_tests()
        all_results["workflows"] = await self.run_workflow_tests()
        all_results["recovery"] = await self.run_recovery_tests()
        all_results["performance"] = await self.run_performance_tests()

        # Generate final report
        self._generate_final_report(all_results)

        return all_results

    def _generate_final_report(self, results: Dict[str, TestSuiteResult]) -> None:
        """Generate final test report."""
        total_tests = sum(len(s.tests) for s in results.values())
        total_passed = sum(s.passed for s in results.values())
        total_failed = sum(s.failed for s in results.values())
        total_skipped = sum(s.skipped for s in results.values())
        total_errors = sum(s.errors for s in results.values())
        total_duration = sum(s.total_duration for s in results.values())

        pass_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0

        print("\n" + "="*60)
        print("FINAL TEST REPORT")
        print("="*60)
        print(f"Total Tests:  {total_tests}")
        print(f"Passed:       {total_passed} ✅")
        print(f"Failed:       {total_failed} ❌")
        print(f"Skipped:      {total_skipped} ⏭️")
        print(f"Errors:       {total_errors} ⚠️")
        print(f"Pass Rate:    {pass_rate:.1f}%")
        print(f"Duration:     {total_duration:.2f}s")
        print("="*60)

        # Save JSON report
        report_path = self.output_dir / "test_report.json"
        with open(report_path, "w") as f:
            json.dump(
                {
                    "summary": {
                        "total_tests": total_tests,
                        "passed": total_passed,
                        "failed": total_failed,
                        "skipped": total_skipped,
                        "errors": total_errors,
                        "pass_rate": pass_rate,
                        "total_duration": total_duration
                    },
                    "suites": {k: v.to_dict() for k, v in results.items()}
                },
                f,
                indent=2
            )
        print(f"\nDetailed report saved to: {report_path}")


async def main():
    """Main entry point for running tests."""
    parser = argparse.ArgumentParser(
        description="Run integration tests for Deep Research Framework"
    )
    parser.add_argument(
        "--layer",
        choices=["1", "2", "3", "all"],
        default="all",
        help="Which layer to test (default: all)"
    )
    parser.add_argument(
        "--suite",
        choices=["layer1", "layer2", "layer3", "workflows", "recovery", "performance", "all"],
        default="all",
        help="Which test suite to run (default: all)"
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    parser.add_argument(
        "-p", "--parallel",
        action="store_true",
        help="Run tests in parallel"
    )
    parser.add_argument(
        "--retry",
        type=int,
        default=0,
        help="Number of times to retry failed tests"
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Output directory for test reports"
    )

    args = parser.parse_args()

    runner = IntegrationTestRunner(
        output_dir=args.output_dir,
        verbose=args.verbose,
        parallel=args.parallel,
        retry_failed=args.retry
    )

    if args.suite == "all":
        await runner.run_all_tests()
    elif args.suite == "layer1":
        await runner.run_layer1_tests()
    elif args.suite == "layer2":
        await runner.run_layer2_tests()
    elif args.suite == "layer3":
        await runner.run_layer3_tests()
    elif args.suite == "workflows":
        await runner.run_workflow_tests()
    elif args.suite == "recovery":
        await runner.run_recovery_tests()
    elif args.suite == "performance":
        await runner.run_performance_tests()


if __name__ == "__main__":
    asyncio.run(main())
