#!/usr/bin/env python3
"""
Entity Graph CLI - Command-line interface for entity-relationship graph management.

Provides tools for creating, querying, and analyzing entity graphs extracted
from research documents. Integrates with StateManager for database operations.

Usage:
    python3 scripts/entity_graph.py create <session_id> <entities_json_file>
    python3 scripts/entity_graph.py add-edge <session_id> <source> <target> <relation>
    python3 scripts/entity_graph.py query <session_id> --entity <name> [--depth 2]
    python3 scripts/entity_graph.py related <session_id> <entity_name> [--relation <type>]
    python3 scripts/entity_graph.py cooccurrence <session_id> [--min-count 2]
    python3 scripts/entity_graph.py export <session_id> [--format json|dot|md]
    python3 scripts/entity_graph.py alias <canonical_name> <alias>
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Set

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from state_manager import StateManager


class EntityGraph:
    """CLI interface for entity graph operations."""

    def __init__(self, db_path: Optional[str] = None):
        """Initialize entity graph with database connection.

        Args:
            db_path: Optional path to SQLite database
        """
        self.state_manager = StateManager(db_path)

    def create_entities_from_json(
        self, session_id: str, entities_file: str
    ) -> Dict[str, Any]:
        """Create entities and edges from a JSON file.

        Args:
            session_id: Research session ID
            entities_file: Path to JSON file containing entities and edges

        Returns:
            Summary of created entities and edges
        """
        with open(entities_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        entities_created = 0
        edges_created = 0
        aliases_created = 0
        errors = []

        # Create entities first
        entity_id_map = {}  # Map name to ID
        entities_list = data.get("entities", [])

        for i, entity in enumerate(entities_list):
            try:
                name = entity.get("name", "")
                if not name:
                    errors.append({"index": i, "error": "Missing entity name"})
                    continue

                entity_id = self.state_manager.create_entity(
                    session_id=session_id,
                    name=name,
                    entity_type=entity.get("type"),
                    description=entity.get("description"),
                )
                entity_id_map[name] = entity_id
                entities_created += 1

                # Add aliases if present
                for alias in entity.get("aliases", []):
                    if self.state_manager.add_entity_alias(name, alias):
                        aliases_created += 1

            except Exception as e:
                errors.append({"index": i, "error": str(e), "entity": entity})

        # Create edges
        edges_list = data.get("edges", [])

        for i, edge in enumerate(edges_list):
            try:
                source_name = edge.get("source")
                target_name = edge.get("target")
                relation = edge.get("relation", "related_to")

                # Get or create source entity
                if source_name not in entity_id_map:
                    source_id = self.state_manager.create_entity(
                        session_id=session_id, name=source_name
                    )
                    entity_id_map[source_name] = source_id
                else:
                    source_id = entity_id_map[source_name]

                # Get or create target entity
                if target_name not in entity_id_map:
                    target_id = self.state_manager.create_entity(
                        session_id=session_id, name=target_name
                    )
                    entity_id_map[target_name] = target_id
                else:
                    target_id = entity_id_map[target_name]

                self.state_manager.create_entity_edge(
                    session_id=session_id,
                    source_entity_id=source_id,
                    target_entity_id=target_id,
                    relation_type=relation,
                    confidence=edge.get("confidence", 0.5),
                    evidence=edge.get("evidence"),
                    source_url=edge.get("source_url"),
                )
                edges_created += 1

            except Exception as e:
                errors.append({"index": i, "error": str(e), "edge": edge})

        return {
            "entities_created": entities_created,
            "edges_created": edges_created,
            "aliases_created": aliases_created,
            "errors": errors,
        }

    def add_edge(
        self,
        session_id: str,
        source_name: str,
        target_name: str,
        relation_type: str,
        confidence: float = 0.5,
        evidence: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Add an edge between two entities (creating entities if needed).

        Args:
            session_id: Research session ID
            source_name: Source entity name
            target_name: Target entity name
            relation_type: Type of relationship
            confidence: Confidence score (0-1)
            evidence: Supporting evidence text

        Returns:
            Edge creation result
        """
        # Create or get source entity
        source_id = self.state_manager.create_entity(
            session_id=session_id, name=source_name
        )

        # Create or get target entity
        target_id = self.state_manager.create_entity(
            session_id=session_id, name=target_name
        )

        # Create edge
        edge_id = self.state_manager.create_entity_edge(
            session_id=session_id,
            source_entity_id=source_id,
            target_entity_id=target_id,
            relation_type=relation_type,
            confidence=confidence,
            evidence=evidence,
        )

        return {
            "edge_id": edge_id,
            "source_id": source_id,
            "target_id": target_id,
            "relation": relation_type,
        }

    def get_entity_by_name(
        self, session_id: str, name: str
    ) -> Optional[Dict[str, Any]]:
        """Get entity by name (checking aliases too).

        Args:
            session_id: Research session ID
            name: Entity name or alias

        Returns:
            Entity data or None
        """
        canonical = self.state_manager.get_canonical_name(name)

        with self.state_manager._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT * FROM entities
                WHERE session_id = ? AND name = ?
            """,
                (session_id, canonical),
            )
            row = cursor.fetchone()
            if row:
                return self.state_manager._row_to_dict(row)
        return None

    def get_related_entities(
        self,
        session_id: str,
        entity_name: str,
        relation_type: Optional[str] = None,
        direction: str = "both",
        depth: int = 1,
    ) -> List[Dict[str, Any]]:
        """Get entities related to a given entity with optional depth traversal.

        Args:
            session_id: Research session ID
            entity_name: Entity name to find relations for
            relation_type: Filter by relation type
            direction: 'outgoing', 'incoming', or 'both'
            depth: How many hops to traverse (1 = direct relations only)

        Returns:
            List of related entities with relationship info
        """
        entity = self.get_entity_by_name(session_id, entity_name)
        if not entity:
            return []

        visited: Set[int] = {entity["id"]}
        results = []

        def traverse(entity_id: int, current_depth: int, path: List[str]):
            if current_depth > depth:
                return

            related = self.state_manager.get_related_entities(
                entity_id=entity_id,
                relation_type=relation_type,
                direction=direction,
            )

            for rel in related:
                if rel["id"] not in visited:
                    visited.add(rel["id"])
                    rel["depth"] = current_depth
                    rel["path"] = path + [rel["relation_type"]]
                    results.append(rel)

                    # Continue traversal
                    if current_depth < depth:
                        traverse(
                            rel["id"],
                            current_depth + 1,
                            path + [rel["relation_type"]],
                        )

        traverse(entity["id"], 1, [])
        return results

    def get_cooccurrences(
        self, session_id: str, min_count: int = 1
    ) -> List[Dict[str, Any]]:
        """Get entity co-occurrence data.

        Args:
            session_id: Research session ID
            min_count: Minimum co-occurrence count

        Returns:
            List of co-occurrence records
        """
        with self.state_manager._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT
                    e1.name as entity_a,
                    e2.name as entity_b,
                    ec.cooccurrence_count,
                    ec.context_snippets
                FROM entity_cooccurrence ec
                JOIN entities e1 ON ec.entity_a_id = e1.id
                JOIN entities e2 ON ec.entity_b_id = e2.id
                WHERE e1.session_id = ?
                  AND ec.cooccurrence_count >= ?
                ORDER BY ec.cooccurrence_count DESC
            """,
                (session_id, min_count),
            )

            results = []
            for row in cursor.fetchall():
                record = dict(row)
                if record["context_snippets"]:
                    try:
                        record["context_snippets"] = json.loads(
                            record["context_snippets"]
                        )
                    except json.JSONDecodeError:
                        pass
                results.append(record)

            return results

    def record_cooccurrence(
        self, session_id: str, entity_a_name: str, entity_b_name: str, context: str
    ) -> None:
        """Record a co-occurrence between two entities.

        Args:
            session_id: Research session ID
            entity_a_name: First entity name
            entity_b_name: Second entity name
            context: Context snippet where they appeared together
        """
        # Get or create entities
        entity_a_id = self.state_manager.create_entity(
            session_id=session_id, name=entity_a_name
        )
        entity_b_id = self.state_manager.create_entity(
            session_id=session_id, name=entity_b_name
        )

        self.state_manager.record_cooccurrence(entity_a_id, entity_b_id, context)

    def export_graph_json(self, session_id: str) -> str:
        """Export entity graph as JSON.

        Args:
            session_id: Research session ID

        Returns:
            JSON string of graph data
        """
        with self.state_manager._get_connection() as conn:
            # Get entities
            cursor = conn.execute(
                """
                SELECT * FROM entities WHERE session_id = ?
            """,
                (session_id,),
            )
            entities = [self.state_manager._row_to_dict(row) for row in cursor.fetchall()]

            # Get edges
            cursor = conn.execute(
                """
                SELECT ee.*, e1.name as source_name, e2.name as target_name
                FROM entity_edges ee
                JOIN entities e1 ON ee.source_entity_id = e1.id
                JOIN entities e2 ON ee.target_entity_id = e2.id
                WHERE ee.session_id = ?
            """,
                (session_id,),
            )
            edges = [self.state_manager._row_to_dict(row) for row in cursor.fetchall()]

        return json.dumps(
            {
                "session_id": session_id,
                "exported_at": datetime.now().isoformat(),
                "entities": entities,
                "edges": edges,
            },
            indent=2,
            ensure_ascii=False,
        )

    def export_graph_dot(self, session_id: str) -> str:
        """Export entity graph as DOT format for visualization.

        Args:
            session_id: Research session ID

        Returns:
            DOT format string
        """
        with self.state_manager._get_connection() as conn:
            # Get entities
            cursor = conn.execute(
                """
                SELECT id, name, entity_type FROM entities WHERE session_id = ?
            """,
                (session_id,),
            )
            entities = list(cursor.fetchall())

            # Get edges
            cursor = conn.execute(
                """
                SELECT e1.name as source, e2.name as target, ee.relation_type, ee.confidence
                FROM entity_edges ee
                JOIN entities e1 ON ee.source_entity_id = e1.id
                JOIN entities e2 ON ee.target_entity_id = e2.id
                WHERE ee.session_id = ?
            """,
                (session_id,),
            )
            edges = list(cursor.fetchall())

        lines = [
            f'digraph "{session_id}" {{',
            "  rankdir=LR;",
            "  node [shape=box, style=filled, fillcolor=lightblue];",
            "",
        ]

        # Node definitions
        for entity in entities:
            label = entity["name"].replace('"', '\\"')
            entity_type = entity["entity_type"] or "unknown"
            lines.append(f'  "{label}" [label="{label}\\n({entity_type})"];')

        lines.append("")

        # Edge definitions
        for edge in edges:
            source = edge["source"].replace('"', '\\"')
            target = edge["target"].replace('"', '\\"')
            relation = edge["relation_type"] or "related_to"
            confidence = edge["confidence"] or 0.5
            lines.append(
                f'  "{source}" -> "{target}" [label="{relation}" penwidth={confidence * 2 + 0.5}];'
            )

        lines.append("}")

        return "\n".join(lines)

    def export_graph_markdown(self, session_id: str) -> str:
        """Export entity graph as Markdown.

        Args:
            session_id: Research session ID

        Returns:
            Markdown formatted graph summary
        """
        with self.state_manager._get_connection() as conn:
            # Get entities by type
            cursor = conn.execute(
                """
                SELECT entity_type, COUNT(*) as count
                FROM entities
                WHERE session_id = ?
                GROUP BY entity_type
            """,
                (session_id,),
            )
            type_counts = list(cursor.fetchall())

            # Get entities
            cursor = conn.execute(
                """
                SELECT * FROM entities WHERE session_id = ?
                ORDER BY entity_type, name
            """,
                (session_id,),
            )
            entities = list(cursor.fetchall())

            # Get edges
            cursor = conn.execute(
                """
                SELECT e1.name as source, e2.name as target, ee.relation_type, ee.confidence
                FROM entity_edges ee
                JOIN entities e1 ON ee.source_entity_id = e1.id
                JOIN entities e2 ON ee.target_entity_id = e2.id
                WHERE ee.session_id = ?
                ORDER BY ee.relation_type, e1.name
            """,
                (session_id,),
            )
            edges = list(cursor.fetchall())

        lines = [
            f"# Entity Graph - {session_id}",
            "",
            f"*Generated: {datetime.now().isoformat()}*",
            "",
            "## Summary",
            "",
            f"- **Total Entities**: {len(entities)}",
            f"- **Total Relationships**: {len(edges)}",
            "",
            "### Entity Types",
            "",
            "| Type | Count |",
            "|------|-------|",
        ]

        for row in type_counts:
            entity_type = row["entity_type"] or "Unknown"
            lines.append(f"| {entity_type} | {row['count']} |")

        lines.extend(
            [
                "",
                "## Entities",
                "",
            ]
        )

        current_type = None
        for entity in entities:
            entity_type = entity["entity_type"] or "Unknown"
            if entity_type != current_type:
                lines.append(f"### {entity_type}")
                lines.append("")
                current_type = entity_type

            desc = f" - {entity['description']}" if entity["description"] else ""
            lines.append(f"- **{entity['name']}**{desc}")

        lines.extend(
            [
                "",
                "## Relationships",
                "",
                "| Source | Relation | Target | Confidence |",
                "|--------|----------|--------|------------|",
            ]
        )

        for edge in edges:
            conf = f"{edge['confidence']:.0%}" if edge["confidence"] else "N/A"
            lines.append(
                f"| {edge['source']} | {edge['relation_type']} | {edge['target']} | {conf} |"
            )

        return "\n".join(lines)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Entity Graph CLI - Manage entity-relationship graphs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create entities from JSON file
  python3 scripts/entity_graph.py create session_123 entities.json

  # Add a relationship between entities
  python3 scripts/entity_graph.py add-edge session_123 "OpenAI" "Microsoft" "invested_in"

  # Find related entities
  python3 scripts/entity_graph.py related session_123 "OpenAI" --relation "competes_with"

  # Get related entities with 2-hop traversal
  python3 scripts/entity_graph.py query session_123 --entity "OpenAI" --depth 2

  # Get co-occurrence data
  python3 scripts/entity_graph.py cooccurrence session_123 --min-count 3

  # Export graph to DOT format for visualization
  python3 scripts/entity_graph.py export session_123 --format dot > graph.dot

  # Add an alias for an entity
  python3 scripts/entity_graph.py alias "OpenAI" "Open AI"
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Create command
    create_parser = subparsers.add_parser("create", help="Create entities from JSON")
    create_parser.add_argument("session_id", help="Research session ID")
    create_parser.add_argument("entities_file", help="Path to JSON file")
    create_parser.add_argument("--db", help="Path to SQLite database", default=None)

    # Add-edge command
    edge_parser = subparsers.add_parser("add-edge", help="Add edge between entities")
    edge_parser.add_argument("session_id", help="Research session ID")
    edge_parser.add_argument("source", help="Source entity name")
    edge_parser.add_argument("target", help="Target entity name")
    edge_parser.add_argument("relation", help="Relation type")
    edge_parser.add_argument(
        "--confidence", type=float, default=0.5, help="Confidence (0-1)"
    )
    edge_parser.add_argument("--evidence", help="Supporting evidence")
    edge_parser.add_argument("--db", help="Path to SQLite database", default=None)

    # Query command
    query_parser = subparsers.add_parser("query", help="Query entity graph")
    query_parser.add_argument("session_id", help="Research session ID")
    query_parser.add_argument("--entity", required=True, help="Entity name to query")
    query_parser.add_argument(
        "--depth", type=int, default=1, help="Traversal depth (default: 1)"
    )
    query_parser.add_argument("--relation", help="Filter by relation type")
    query_parser.add_argument("--db", help="Path to SQLite database", default=None)

    # Related command
    related_parser = subparsers.add_parser("related", help="Find related entities")
    related_parser.add_argument("session_id", help="Research session ID")
    related_parser.add_argument("entity_name", help="Entity name")
    related_parser.add_argument("--relation", help="Filter by relation type")
    related_parser.add_argument(
        "--direction",
        choices=["outgoing", "incoming", "both"],
        default="both",
        help="Edge direction",
    )
    related_parser.add_argument("--db", help="Path to SQLite database", default=None)

    # Cooccurrence command
    cooc_parser = subparsers.add_parser("cooccurrence", help="Get co-occurrence data")
    cooc_parser.add_argument("session_id", help="Research session ID")
    cooc_parser.add_argument(
        "--min-count", type=int, default=1, help="Minimum co-occurrence count"
    )
    cooc_parser.add_argument("--db", help="Path to SQLite database", default=None)

    # Export command
    export_parser = subparsers.add_parser("export", help="Export entity graph")
    export_parser.add_argument("session_id", help="Research session ID")
    export_parser.add_argument(
        "--format",
        "-f",
        choices=["json", "dot", "md"],
        default="json",
        help="Export format",
    )
    export_parser.add_argument("--output", "-o", help="Output file path")
    export_parser.add_argument("--db", help="Path to SQLite database", default=None)

    # Alias command
    alias_parser = subparsers.add_parser("alias", help="Add entity alias")
    alias_parser.add_argument("canonical_name", help="Canonical entity name")
    alias_parser.add_argument("alias", help="Alias to add")
    alias_parser.add_argument("--db", help="Path to SQLite database", default=None)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    # Initialize graph
    graph = EntityGraph(getattr(args, "db", None))

    try:
        if args.command == "create":
            result = graph.create_entities_from_json(args.session_id, args.entities_file)
            print(f"Created {result['entities_created']} entities")
            print(f"Created {result['edges_created']} edges")
            print(f"Created {result['aliases_created']} aliases")
            if result["errors"]:
                print(f"Errors: {len(result['errors'])}")
                for err in result["errors"][:5]:
                    print(f"  - {err['error']}")

        elif args.command == "add-edge":
            result = graph.add_edge(
                session_id=args.session_id,
                source_name=args.source,
                target_name=args.target,
                relation_type=args.relation,
                confidence=args.confidence,
                evidence=args.evidence,
            )
            print(f"Created edge: {args.source} --[{args.relation}]--> {args.target}")
            print(f"Edge ID: {result['edge_id']}")

        elif args.command == "query":
            results = graph.get_related_entities(
                session_id=args.session_id,
                entity_name=args.entity,
                relation_type=args.relation,
                depth=args.depth,
            )
            if results:
                print(f"Found {len(results)} related entities:")
                for rel in results:
                    path = " -> ".join(rel.get("path", []))
                    print(f"  [{rel['depth']}] {rel['name']} ({rel.get('entity_type', 'N/A')})")
                    print(f"      via: {path}")
            else:
                print("No related entities found")

        elif args.command == "related":
            entity = graph.get_entity_by_name(args.session_id, args.entity_name)
            if not entity:
                print(f"Entity not found: {args.entity_name}")
                sys.exit(1)

            results = graph.state_manager.get_related_entities(
                entity_id=entity["id"],
                relation_type=args.relation,
                direction=args.direction,
            )
            if results:
                print(f"Related to {args.entity_name}:")
                for rel in results:
                    direction = rel.get("direction", "")
                    print(
                        f"  [{direction}] {rel['name']} via {rel['relation_type']} (conf: {rel.get('confidence', 'N/A')})"
                    )
            else:
                print("No related entities found")

        elif args.command == "cooccurrence":
            results = graph.get_cooccurrences(args.session_id, args.min_count)
            if results:
                print(f"Co-occurrences (min count: {args.min_count}):")
                for cooc in results:
                    print(
                        f"  {cooc['entity_a']} <-> {cooc['entity_b']}: {cooc['cooccurrence_count']} times"
                    )
            else:
                print("No co-occurrences found")

        elif args.command == "export":
            if args.format == "json":
                output = graph.export_graph_json(args.session_id)
            elif args.format == "dot":
                output = graph.export_graph_dot(args.session_id)
            elif args.format == "md":
                output = graph.export_graph_markdown(args.session_id)

            if args.output:
                Path(args.output).write_text(output, encoding="utf-8")
                print(f"Exported to {args.output}")
            else:
                print(output)

        elif args.command == "alias":
            success = graph.state_manager.add_entity_alias(
                args.canonical_name, args.alias
            )
            if success:
                print(f"Added alias: '{args.alias}' -> '{args.canonical_name}'")
            else:
                print(f"Alias already exists or failed to add")

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
