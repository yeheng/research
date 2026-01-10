#!/usr/bin/env python3
"""
Fact Ledger CLI - Command-line interface for atomic fact management.

Provides tools for creating, querying, and managing atomic facts extracted
from research agent outputs. Integrates with StateManager for database operations.

Usage:
    python3 scripts/fact_ledger.py create <session_id> <facts_json_file>
    python3 scripts/fact_ledger.py query <session_id> [--entity <entity>] [--attribute <attr>]
    python3 scripts/fact_ledger.py conflicts <session_id>
    python3 scripts/fact_ledger.py statistics <session_id> [--output <file>]
    python3 scripts/fact_ledger.py export <session_id> [--format md|json|csv]
"""

import argparse
import json
import sys
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from state_manager import StateManager


class FactLedger:
    """CLI interface for fact ledger operations."""

    def __init__(self, db_path: Optional[str] = None):
        """Initialize fact ledger with database connection.

        Args:
            db_path: Optional path to SQLite database
        """
        self.state_manager = StateManager(db_path)

    def parse_value(self, value: str) -> tuple[Optional[float], str, Optional[str]]:
        """Parse a value string to extract numeric value, type, and unit.

        Args:
            value: Value string like "$22.4B", "37.5%", "2024-01-15"

        Returns:
            Tuple of (numeric_value, value_type, unit)
        """
        value = value.strip()

        # Currency patterns
        currency_match = re.match(
            r"^\$?([\d,.]+)\s*(B|billion|M|million|K|thousand|T|trillion)?$",
            value,
            re.IGNORECASE,
        )
        if currency_match:
            num_str = currency_match.group(1).replace(",", "")
            multiplier = 1.0
            unit_suffix = currency_match.group(2)
            if unit_suffix:
                unit_suffix = unit_suffix.upper()
                if unit_suffix in ("B", "BILLION"):
                    multiplier = 1e9
                    unit = "USD billion"
                elif unit_suffix in ("M", "MILLION"):
                    multiplier = 1e6
                    unit = "USD million"
                elif unit_suffix in ("K", "THOUSAND"):
                    multiplier = 1e3
                    unit = "USD thousand"
                elif unit_suffix in ("T", "TRILLION"):
                    multiplier = 1e12
                    unit = "USD trillion"
                else:
                    unit = "USD"
            else:
                unit = "USD"
            try:
                numeric = float(num_str)
                # Store in billions for consistency
                if multiplier >= 1e9:
                    numeric = numeric
                elif multiplier == 1e6:
                    numeric = numeric / 1000
                elif multiplier == 1e3:
                    numeric = numeric / 1e6
                elif multiplier == 1e12:
                    numeric = numeric * 1000
                return numeric, "currency", unit
            except ValueError:
                pass

        # Percentage patterns
        pct_match = re.match(r"^([\d,.]+)\s*%$", value)
        if pct_match:
            try:
                numeric = float(pct_match.group(1).replace(",", ""))
                return numeric, "percentage", "percent"
            except ValueError:
                pass

        # Date patterns
        date_patterns = [
            r"^\d{4}-\d{2}-\d{2}$",  # 2024-01-15
            r"^\d{4}$",  # 2024
            r"^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}$",
        ]
        for pattern in date_patterns:
            if re.match(pattern, value, re.IGNORECASE):
                return None, "date", None

        # Plain number
        plain_match = re.match(r"^([\d,.]+)$", value)
        if plain_match:
            try:
                numeric = float(plain_match.group(1).replace(",", ""))
                return numeric, "number", None
            except ValueError:
                pass

        # Default to text
        return None, "text", None

    def create_facts_from_json(
        self, session_id: str, facts_file: str
    ) -> Dict[str, Any]:
        """Create facts from a JSON file.

        Args:
            session_id: Research session ID
            facts_file: Path to JSON file containing facts

        Returns:
            Summary of created facts
        """
        with open(facts_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Handle both array and object with "facts" key
        facts_list = data if isinstance(data, list) else data.get("facts", [])

        created = 0
        errors = []

        for i, fact in enumerate(facts_list):
            try:
                # Parse value to get numeric and type
                value = fact.get("value", "")
                numeric, value_type, unit = self.parse_value(value)

                # Override with provided values if present
                if "value_type" in fact:
                    value_type = fact["value_type"]
                if "value_numeric" in fact:
                    numeric = fact["value_numeric"]
                if "unit" in fact:
                    unit = fact["unit"]

                # Create fact
                fact_id = self.state_manager.create_fact(
                    session_id=session_id,
                    entity=fact.get("entity", "Unknown"),
                    attribute=fact.get("attribute", "Unknown"),
                    value=value,
                    value_type=value_type,
                    value_numeric=numeric,
                    unit=unit,
                    confidence=fact.get("confidence", "Medium"),
                    context=fact.get("context"),
                )

                # Add source if present
                source = fact.get("source", {})
                if source and isinstance(source, dict):
                    self.state_manager.add_fact_source(
                        fact_id=fact_id,
                        source_url=source.get("url", ""),
                        source_title=source.get("title"),
                        source_author=source.get("author"),
                        source_date=source.get("date"),
                        source_quality=source.get("quality"),
                        page_number=source.get("page_number"),
                        excerpt=source.get("excerpt"),
                    )

                created += 1

            except Exception as e:
                errors.append({"index": i, "error": str(e), "fact": fact})

        return {
            "created": created,
            "total": len(facts_list),
            "errors": errors,
        }

    def query_facts(
        self,
        session_id: str,
        entity: Optional[str] = None,
        attribute: Optional[str] = None,
        min_confidence: Optional[str] = None,
        value_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Query facts with filters.

        Args:
            session_id: Research session ID
            entity: Filter by entity name
            attribute: Filter by attribute
            min_confidence: Minimum confidence level
            value_type: Filter by value type
            limit: Maximum results

        Returns:
            List of matching facts
        """
        return self.state_manager.query_facts(
            session_id=session_id,
            entity=entity,
            attribute=attribute,
            min_confidence=min_confidence,
            value_type=value_type,
            limit=limit,
        )

    def detect_conflicts(self, session_id: str) -> List[Dict[str, Any]]:
        """Detect conflicts between facts.

        Args:
            session_id: Research session ID

        Returns:
            List of detected conflicts
        """
        return self.state_manager.detect_conflicts(session_id)

    def get_statistics(self, session_id: str) -> Dict[str, Any]:
        """Get statistics table data.

        Args:
            session_id: Research session ID

        Returns:
            Statistics data
        """
        return self.state_manager.get_statistics_table(session_id)

    def export_statistics_markdown(self, session_id: str) -> str:
        """Export statistics as Markdown table.

        Args:
            session_id: Research session ID

        Returns:
            Markdown formatted statistics
        """
        stats = self.get_statistics(session_id)

        lines = [
            f"# Key Statistics - {session_id}",
            "",
            f"*Generated: {datetime.now().isoformat()}*",
            "",
            "## Summary",
            "",
            f"- **Total Facts**: {stats['fact_counts']['total']}",
            f"- **High Confidence**: {stats['fact_counts']['high_confidence']}",
            f"- **Medium Confidence**: {stats['fact_counts']['medium_confidence']}",
            f"- **Low Confidence**: {stats['fact_counts']['low_confidence']}",
            f"- **Unresolved Conflicts**: {stats['unresolved_conflicts']}",
            "",
            "## Key Statistics Table",
            "",
            "| Entity | Attribute | Value | Source | Quality |",
            "|--------|-----------|-------|--------|---------|",
        ]

        for stat in stats["statistics"]:
            lines.append(
                f"| {stat['entity']} | {stat['attribute']} | {stat['value']} | {stat['source']} | {stat['quality']} |"
            )

        # Add conflicts section if any
        conflicts = self.detect_conflicts(session_id)
        if conflicts:
            lines.extend(
                [
                    "",
                    "## Data Conflicts",
                    "",
                    "| Entity | Attribute | Values | Severity |",
                    "|--------|-----------|--------|----------|",
                ]
            )

            for conflict in conflicts:
                values = ", ".join(
                    [f.get("value", "?") for f in conflict.get("facts", [])]
                )
                lines.append(
                    f"| {conflict['entity']} | {conflict['attribute']} | {values} | {conflict['severity']} |"
                )

        lines.extend(
            [
                "",
                "---",
                f"*Auto-generated from fact ledger. {stats['fact_counts']['high_confidence']} high-confidence facts, {stats['unresolved_conflicts']} conflicts detected.*",
            ]
        )

        return "\n".join(lines)

    def export_facts_json(self, session_id: str) -> str:
        """Export all facts as JSON.

        Args:
            session_id: Research session ID

        Returns:
            JSON string
        """
        facts = self.query_facts(session_id, limit=1000)
        return json.dumps(
            {
                "session_id": session_id,
                "exported_at": datetime.now().isoformat(),
                "facts": facts,
            },
            indent=2,
            ensure_ascii=False,
        )

    def export_facts_csv(self, session_id: str) -> str:
        """Export facts as CSV.

        Args:
            session_id: Research session ID

        Returns:
            CSV string
        """
        facts = self.query_facts(session_id, limit=1000)

        lines = ["entity,attribute,value,value_type,value_numeric,unit,confidence,context,source_url,source_author,source_quality"]

        for fact in facts:
            source = fact.get("sources", [{}])[0] if fact.get("sources") else {}
            line = ",".join(
                [
                    f'"{fact.get("entity", "")}"',
                    f'"{fact.get("attribute", "")}"',
                    f'"{fact.get("value", "")}"',
                    f'"{fact.get("value_type", "")}"',
                    str(fact.get("value_numeric", "")),
                    f'"{fact.get("unit", "")}"',
                    f'"{fact.get("confidence", "")}"',
                    f'"{fact.get("context", "")}"',
                    f'"{source.get("source_url", "")}"',
                    f'"{source.get("source_author", "")}"',
                    f'"{source.get("source_quality", "")}"',
                ]
            )
            lines.append(line)

        return "\n".join(lines)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Fact Ledger CLI - Manage atomic facts for research",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create facts from JSON file
  python3 scripts/fact_ledger.py create session_123 facts.json

  # Query facts by entity
  python3 scripts/fact_ledger.py query session_123 --entity "AI Healthcare"

  # Detect conflicts
  python3 scripts/fact_ledger.py conflicts session_123

  # Export statistics to markdown
  python3 scripts/fact_ledger.py statistics session_123 --output stats.md

  # Export all facts as JSON
  python3 scripts/fact_ledger.py export session_123 --format json
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Create command
    create_parser = subparsers.add_parser("create", help="Create facts from JSON file")
    create_parser.add_argument("session_id", help="Research session ID")
    create_parser.add_argument("facts_file", help="Path to JSON file containing facts")
    create_parser.add_argument(
        "--db", help="Path to SQLite database", default=None
    )

    # Query command
    query_parser = subparsers.add_parser("query", help="Query facts")
    query_parser.add_argument("session_id", help="Research session ID")
    query_parser.add_argument("--entity", help="Filter by entity name")
    query_parser.add_argument("--attribute", help="Filter by attribute")
    query_parser.add_argument(
        "--confidence", help="Minimum confidence (High, Medium, Low)"
    )
    query_parser.add_argument("--type", dest="value_type", help="Filter by value type")
    query_parser.add_argument(
        "--limit", type=int, default=100, help="Maximum results"
    )
    query_parser.add_argument("--db", help="Path to SQLite database", default=None)

    # Conflicts command
    conflicts_parser = subparsers.add_parser(
        "conflicts", help="Detect fact conflicts"
    )
    conflicts_parser.add_argument("session_id", help="Research session ID")
    conflicts_parser.add_argument(
        "--db", help="Path to SQLite database", default=None
    )

    # Statistics command
    stats_parser = subparsers.add_parser(
        "statistics", help="Generate statistics table"
    )
    stats_parser.add_argument("session_id", help="Research session ID")
    stats_parser.add_argument("--output", "-o", help="Output file path")
    stats_parser.add_argument("--db", help="Path to SQLite database", default=None)

    # Export command
    export_parser = subparsers.add_parser("export", help="Export facts")
    export_parser.add_argument("session_id", help="Research session ID")
    export_parser.add_argument(
        "--format",
        "-f",
        choices=["json", "csv", "md"],
        default="json",
        help="Export format",
    )
    export_parser.add_argument("--output", "-o", help="Output file path")
    export_parser.add_argument("--db", help="Path to SQLite database", default=None)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    # Initialize ledger
    ledger = FactLedger(getattr(args, "db", None))

    try:
        if args.command == "create":
            result = ledger.create_facts_from_json(args.session_id, args.facts_file)
            print(f"Created {result['created']}/{result['total']} facts")
            if result["errors"]:
                print(f"Errors: {len(result['errors'])}")
                for err in result["errors"][:5]:  # Show first 5 errors
                    print(f"  - Index {err['index']}: {err['error']}")

        elif args.command == "query":
            facts = ledger.query_facts(
                session_id=args.session_id,
                entity=args.entity,
                attribute=args.attribute,
                min_confidence=args.confidence,
                value_type=args.value_type,
                limit=args.limit,
            )
            print(json.dumps(facts, indent=2, ensure_ascii=False))

        elif args.command == "conflicts":
            conflicts = ledger.detect_conflicts(args.session_id)
            if conflicts:
                print(f"Found {len(conflicts)} conflict(s):")
                for conflict in conflicts:
                    print(
                        f"\n  [{conflict['severity'].upper()}] {conflict['entity']} - {conflict['attribute']}"
                    )
                    for fact in conflict["facts"]:
                        print(f"    - {fact['value']} (confidence: {fact['confidence']})")
            else:
                print("No conflicts detected")

        elif args.command == "statistics":
            output = ledger.export_statistics_markdown(args.session_id)
            if args.output:
                Path(args.output).write_text(output, encoding="utf-8")
                print(f"Statistics written to {args.output}")
            else:
                print(output)

        elif args.command == "export":
            if args.format == "json":
                output = ledger.export_facts_json(args.session_id)
            elif args.format == "csv":
                output = ledger.export_facts_csv(args.session_id)
            elif args.format == "md":
                output = ledger.export_statistics_markdown(args.session_id)

            if args.output:
                Path(args.output).write_text(output, encoding="utf-8")
                print(f"Exported to {args.output}")
            else:
                print(output)

    except FileNotFoundError as e:
        print(f"Error: File not found - {e}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON - {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
