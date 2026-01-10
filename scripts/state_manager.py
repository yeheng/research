"""
State Manager - SQLite-based state management for multi-agent research framework.

Replaces JSON file-based state management to prevent race conditions and enable
concurrent-safe operations across multiple parallel research agents.

Features:
- Atomic operations with SQLite transactions
- Graph of Thoughts (GoT) node management
- Agent heartbeat tracking
- Complex queries for synthesis and analysis
"""

import sqlite3
import json
import threading
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path
from contextlib import contextmanager


class StateManager:
    """Thread-safe state manager using SQLite for concurrent agent operations."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls, db_path: str = None):
        """Singleton pattern to ensure single database connection pool."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, db_path: str = None):
        """Initialize state manager with SQLite database.

        Args:
            db_path: Path to SQLite database file. Defaults to .research_state.db
        """
        if hasattr(self, "_initialized"):
            return

        self.db_path = db_path or str(Path.cwd() / ".research_state.db")
        self._local = threading.local()
        self._initialize_database()
        self._initialized = True

    @contextmanager
    def _get_connection(self):
        """Get thread-local database connection with automatic commit/rollback."""
        if not hasattr(self._local, "conn"):
            self._local.conn = sqlite3.connect(
                self.db_path, check_same_thread=False, timeout=30.0
            )
            self._local.conn.row_factory = sqlite3.Row
            # Enable WAL mode for better concurrent access
            self._local.conn.execute("PRAGMA journal_mode=WAL")
            self._local.conn.execute("PRAGMA synchronous=NORMAL")

        try:
            yield self._local.conn
            self._local.conn.commit()
        except Exception as e:
            self._local.conn.rollback()
            raise e

    def _initialize_database(self):
        """Create database schema if not exists."""
        with self._get_connection() as conn:
            # GoT nodes table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS nodes (
                    id TEXT PRIMARY KEY,
                    parent_id TEXT,
                    content TEXT NOT NULL,
                    score REAL DEFAULT 0.0,
                    status TEXT DEFAULT 'pending',
                    depth INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    meta TEXT,
                    FOREIGN KEY (parent_id) REFERENCES nodes(id)
                )
            """)

            # Agent heartbeats table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_heartbeats (
                    agent_id TEXT PRIMARY KEY,
                    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    current_action TEXT,
                    status TEXT DEFAULT 'active',
                    meta TEXT
                )
            """)

            # Research sessions table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS research_sessions (
                    session_id TEXT PRIMARY KEY,
                    topic TEXT NOT NULL,
                    status TEXT DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP,
                    meta TEXT
                )
            """)

            # Create indexes for performance
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_nodes_parent
                ON nodes(parent_id)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_nodes_status
                ON nodes(status)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_nodes_score
                ON nodes(score DESC)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_agent_status
                ON agent_heartbeats(status)
            """)

            # ==================== Fact Ledger Tables ====================
            # Atomic facts storage (Optimization #1)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS facts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    entity TEXT NOT NULL,
                    attribute TEXT NOT NULL,
                    value TEXT NOT NULL,
                    value_type TEXT DEFAULT 'text',
                    value_numeric REAL,
                    unit TEXT,
                    confidence TEXT CHECK(confidence IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
                    context TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES research_sessions(session_id)
                )
            """)

            # Fact-source links (many-to-many)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS fact_sources (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fact_id INTEGER NOT NULL,
                    source_url TEXT NOT NULL,
                    source_title TEXT,
                    source_author TEXT,
                    source_date TEXT,
                    source_quality TEXT CHECK(source_quality IN ('A', 'B', 'C', 'D', 'E')),
                    page_number TEXT,
                    excerpt TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (fact_id) REFERENCES facts(id) ON DELETE CASCADE
                )
            """)

            # Fact conflicts tracking
            conn.execute("""
                CREATE TABLE IF NOT EXISTS fact_conflicts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fact_id_a INTEGER NOT NULL,
                    fact_id_b INTEGER NOT NULL,
                    conflict_type TEXT CHECK(conflict_type IN ('numerical', 'temporal', 'causal', 'scope', 'methodological')),
                    severity TEXT CHECK(severity IN ('critical', 'moderate', 'minor')),
                    description TEXT,
                    resolution TEXT,
                    resolved_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (fact_id_a) REFERENCES facts(id) ON DELETE CASCADE,
                    FOREIGN KEY (fact_id_b) REFERENCES facts(id) ON DELETE CASCADE
                )
            """)

            # ==================== Entity Graph Tables (Optimization #2) ====================
            # Entities table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS entities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    name TEXT NOT NULL,
                    entity_type TEXT,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Entity aliases for normalization
            conn.execute("""
                CREATE TABLE IF NOT EXISTS entity_aliases (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    canonical_name TEXT NOT NULL,
                    alias TEXT NOT NULL UNIQUE
                )
            """)

            # Entity relationship edges
            conn.execute("""
                CREATE TABLE IF NOT EXISTS entity_edges (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    source_entity_id INTEGER NOT NULL,
                    target_entity_id INTEGER NOT NULL,
                    relation_type TEXT,
                    confidence REAL DEFAULT 0.5,
                    evidence TEXT,
                    source_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (source_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
                    FOREIGN KEY (target_entity_id) REFERENCES entities(id) ON DELETE CASCADE
                )
            """)

            # Entity co-occurrence records
            conn.execute("""
                CREATE TABLE IF NOT EXISTS entity_cooccurrence (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entity_a_id INTEGER NOT NULL,
                    entity_b_id INTEGER NOT NULL,
                    cooccurrence_count INTEGER DEFAULT 1,
                    context_snippets TEXT,
                    FOREIGN KEY (entity_a_id) REFERENCES entities(id) ON DELETE CASCADE,
                    FOREIGN KEY (entity_b_id) REFERENCES entities(id) ON DELETE CASCADE
                )
            """)

            # ==================== Interrupt Events Table (Optimization #4) ====================
            conn.execute("""
                CREATE TABLE IF NOT EXISTS interrupt_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    condition TEXT,
                    message TEXT,
                    user_response TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved_at TIMESTAMP
                )
            """)

            # ==================== Indexes for new tables ====================
            conn.execute("CREATE INDEX IF NOT EXISTS idx_facts_session ON facts(session_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_facts_entity ON facts(entity)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_facts_entity_attribute ON facts(entity, attribute)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_fact_sources_fact ON fact_sources(fact_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_fact_conflicts_facts ON fact_conflicts(fact_id_a, fact_id_b)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_entities_session ON entities(session_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_entity_edges_source ON entity_edges(source_entity_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_entity_edges_target ON entity_edges(target_entity_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_interrupt_session ON interrupt_events(session_id)")

    # ==================== Node Management Methods ====================

    def create_node(
        self,
        node_id: str,
        content: str,
        parent_id: Optional[str] = None,
        score: float = 0.0,
        depth: int = 0,
        meta: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Create a new GoT node.

        Args:
            node_id: Unique identifier for the node
            content: Node content (research findings, subtopic, etc.)
            parent_id: Parent node ID (None for root nodes)
            score: Initial quality score (0-10)
            depth: Depth in the research tree
            meta: Additional metadata as dictionary

        Returns:
            True if created successfully, False if node already exists
        """
        try:
            with self._get_connection() as conn:
                conn.execute(
                    """
                    INSERT INTO nodes (id, parent_id, content, score, depth, meta)
                    VALUES (?, ?, ?, ?, ?, ?)
                """,
                    (
                        node_id,
                        parent_id,
                        content,
                        score,
                        depth,
                        json.dumps(meta) if meta else None,
                    ),
                )
                return True
        except sqlite3.IntegrityError:
            return False

    def update_node(
        self,
        node_id: str,
        content: Optional[str] = None,
        score: Optional[float] = None,
        status: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Update an existing node.

        Args:
            node_id: Node to update
            content: New content (if provided)
            score: New score (if provided)
            status: New status (if provided)
            meta: New metadata (if provided)

        Returns:
            True if updated successfully
        """
        updates = []
        params = []

        if content is not None:
            updates.append("content = ?")
            params.append(content)
        if score is not None:
            updates.append("score = ?")
            params.append(score)
        if status is not None:
            updates.append("status = ?")
            params.append(status)
        if meta is not None:
            updates.append("meta = ?")
            params.append(json.dumps(meta))

        if not updates:
            return False

        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(node_id)

        with self._get_connection() as conn:
            conn.execute(
                f"""
                UPDATE nodes
                SET {", ".join(updates)}
                WHERE id = ?
            """,
                params,
            )
            return conn.total_changes > 0

    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a node by ID.

        Args:
            node_id: Node identifier

        Returns:
            Node data as dictionary or None if not found
        """
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT * FROM nodes WHERE id = ?
            """,
                (node_id,),
            )
            row = cursor.fetchone()
            if row:
                return self._row_to_dict(row)
            return None

    def get_children(self, parent_id: str) -> List[Dict[str, Any]]:
        """Get all child nodes of a parent.

        Args:
            parent_id: Parent node ID

        Returns:
            List of child nodes
        """
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT * FROM nodes
                WHERE parent_id = ?
                ORDER BY score DESC, created_at ASC
            """,
                (parent_id,),
            )
            return [self._row_to_dict(row) for row in cursor.fetchall()]

    def get_top_nodes(
        self, limit: int = 10, min_score: float = 0.0
    ) -> List[Dict[str, Any]]:
        """Get top-scoring nodes.

        Args:
            limit: Maximum number of nodes to return
            min_score: Minimum score threshold

        Returns:
            List of top nodes sorted by score
        """
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT * FROM nodes
                WHERE score >= ?
                ORDER BY score DESC, created_at ASC
                LIMIT ?
            """,
                (min_score, limit),
            )
            return [self._row_to_dict(row) for row in cursor.fetchall()]

    def query_nodes(
        self,
        keyword: Optional[str] = None,
        min_score: Optional[float] = None,
        status: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Complex query for nodes with multiple filters.

        Args:
            keyword: Search in content (case-insensitive)
            min_score: Minimum score threshold
            status: Filter by status
            limit: Maximum results

        Returns:
            List of matching nodes
        """
        conditions = []
        params = []

        if keyword:
            conditions.append("content LIKE ?")
            params.append(f"%{keyword}%")
        if min_score is not None:
            conditions.append("score >= ?")
            params.append(min_score)
        if status:
            conditions.append("status = ?")
            params.append(status)

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)

        with self._get_connection() as conn:
            cursor = conn.execute(
                f"""
                SELECT * FROM nodes
                {where_clause}
                ORDER BY score DESC, created_at ASC
                LIMIT ?
            """,
                params,
            )
            return [self._row_to_dict(row) for row in cursor.fetchall()]

    # ==================== Agent Heartbeat Methods ====================

    def register_agent(
        self, agent_id: str, meta: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Register a new agent or update existing one.

        Args:
            agent_id: Unique agent identifier
            meta: Agent metadata

        Returns:
            True if successful
        """
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO agent_heartbeats
                (agent_id, last_seen, status, meta)
                VALUES (?, CURRENT_TIMESTAMP, 'active', ?)
            """,
                (agent_id, json.dumps(meta) if meta else None),
            )
            return True

    def update_agent_heartbeat(
        self,
        agent_id: str,
        current_action: Optional[str] = None,
        status: Optional[str] = None,
    ) -> bool:
        """Update agent heartbeat and status.

        Args:
            agent_id: Agent identifier
            current_action: Current action description
            status: Agent status (active, idle, completed, failed)

        Returns:
            True if successful
        """
        updates = ["last_seen = CURRENT_TIMESTAMP"]
        params = []

        if current_action is not None:
            updates.append("current_action = ?")
            params.append(current_action)
        if status is not None:
            updates.append("status = ?")
            params.append(status)

        params.append(agent_id)

        with self._get_connection() as conn:
            conn.execute(
                f"""
                UPDATE agent_heartbeats
                SET {", ".join(updates)}
                WHERE agent_id = ?
            """,
                params,
            )
            return conn.total_changes > 0

    def get_active_agents(self) -> List[Dict[str, Any]]:
        """Get all active agents.

        Returns:
            List of active agent records
        """
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT * FROM agent_heartbeats
                WHERE status = 'active'
                ORDER BY last_seen DESC
            """)
            return [self._row_to_dict(row) for row in cursor.fetchall()]

    # ==================== Session Management Methods ====================

    def create_session(
        self, session_id: str, topic: str, meta: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Create a new research session.

        Args:
            session_id: Unique session identifier
            topic: Research topic
            meta: Session metadata

        Returns:
            True if created successfully
        """
        try:
            with self._get_connection() as conn:
                conn.execute(
                    """
                    INSERT INTO research_sessions (session_id, topic, meta)
                    VALUES (?, ?, ?)
                """,
                    (session_id, topic, json.dumps(meta) if meta else None),
                )
                return True
        except sqlite3.IntegrityError:
            return False

    def complete_session(self, session_id: str) -> bool:
        """Mark a session as completed.

        Args:
            session_id: Session identifier

        Returns:
            True if successful
        """
        with self._get_connection() as conn:
            conn.execute(
                """
                UPDATE research_sessions
                SET status = 'completed', completed_at = CURRENT_TIMESTAMP
                WHERE session_id = ?
            """,
                (session_id,),
            )
            return conn.total_changes > 0

    # ==================== Utility Methods ====================

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert SQLite row to dictionary.

        Args:
            row: SQLite row object

        Returns:
            Dictionary representation
        """
        result = dict(row)
        # Parse JSON fields
        if "meta" in result and result["meta"]:
            try:
                result["meta"] = json.loads(result["meta"])
            except json.JSONDecodeError:
                result["meta"] = None
        return result

    def prune_low_score_nodes(self, threshold: float = 5.0) -> int:
        """Remove nodes below score threshold (circuit breaking).

        Args:
            threshold: Minimum score to keep

        Returns:
            Number of nodes deleted
        """
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                DELETE FROM nodes WHERE score < ?
            """,
                (threshold,),
            )
            return cursor.rowcount

    def keep_best_n(self, n: int, parent_id: Optional[str] = None) -> int:
        """Keep only top N nodes (GoT KeepBestN operation).

        Args:
            n: Number of top nodes to keep
            parent_id: If provided, only prune children of this parent

        Returns:
            Number of nodes deleted
        """
        with self._get_connection() as conn:
            if parent_id:
                # Get IDs of nodes to keep
                cursor = conn.execute(
                    """
                    SELECT id FROM nodes
                    WHERE parent_id = ?
                    ORDER BY score DESC
                    LIMIT ?
                """,
                    (parent_id, n),
                )
                keep_ids = [row[0] for row in cursor.fetchall()]

                if not keep_ids:
                    return 0

                placeholders = ",".join("?" * len(keep_ids))
                cursor = conn.execute(
                    f"""
                    DELETE FROM nodes
                    WHERE parent_id = ? AND id NOT IN ({placeholders})
                """,
                    [parent_id] + keep_ids,
                )
            else:
                # Global pruning
                cursor = conn.execute(
                    """
                    SELECT id FROM nodes
                    ORDER BY score DESC
                    LIMIT ?
                """,
                    (n,),
                )
                keep_ids = [row[0] for row in cursor.fetchall()]

                if not keep_ids:
                    return 0

                placeholders = ",".join("?" * len(keep_ids))
                cursor = conn.execute(
                    f"""
                    DELETE FROM nodes WHERE id NOT IN ({placeholders})
                """,
                    keep_ids,
                )

            return cursor.rowcount

    def get_statistics(self) -> Dict[str, Any]:
        """Get overall statistics about the research state.

        Returns:
            Dictionary with statistics
        """
        with self._get_connection() as conn:
            stats = {}

            # Node statistics
            cursor = conn.execute("SELECT COUNT(*) FROM nodes")
            stats["total_nodes"] = cursor.fetchone()[0]

            cursor = conn.execute("SELECT AVG(score) FROM nodes")
            stats["avg_score"] = cursor.fetchone()[0] or 0.0

            cursor = conn.execute('SELECT COUNT(*) FROM nodes WHERE status = "pending"')
            stats["pending_nodes"] = cursor.fetchone()[0]

            cursor = conn.execute(
                'SELECT COUNT(*) FROM nodes WHERE status = "complete"'
            )
            stats["completed_nodes"] = cursor.fetchone()[0]

            # Agent statistics
            cursor = conn.execute(
                'SELECT COUNT(*) FROM agent_heartbeats WHERE status = "active"'
            )
            stats["active_agents"] = cursor.fetchone()[0]

            return stats

    def clear_all(self):
        """Clear all data (use with caution)."""
        with self._get_connection() as conn:
            conn.execute("DELETE FROM nodes")
            conn.execute("DELETE FROM agent_heartbeats")
            conn.execute("DELETE FROM research_sessions")

    def export_graph(self) -> Dict[str, Any]:
        """Export entire graph structure for visualization or backup.

        Returns:
            Dictionary with nodes and edges
        """
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM nodes ORDER BY created_at")
            nodes = [self._row_to_dict(row) for row in cursor.fetchall()]

            edges = []
            for node in nodes:
                if node["parent_id"]:
                    edges.append({"from": node["parent_id"], "to": node["id"]})

            return {"nodes": nodes, "edges": edges}

    def check_circuit_break(
        self, node_id: str, consecutive_threshold: int = 3, score_threshold: float = 5.0
    ) -> Dict[str, Any]:
        children = self.get_children(node_id)

        if len(children) < consecutive_threshold:
            return {
                "should_break": False,
                "reason": "insufficient_data",
                "children_count": len(children),
            }

        children_sorted = sorted(children, key=lambda x: x["created_at"])
        recent_children = children_sorted[-consecutive_threshold:]
        recent_scores = [child["score"] for child in recent_children]

        all_low = all(score < score_threshold for score in recent_scores)

        if all_low:
            return {
                "should_break": True,
                "reason": "consecutive_low_scores",
                "consecutive_count": consecutive_threshold,
                "scores": recent_scores,
                "avg_score": sum(recent_scores) / len(recent_scores),
                "threshold": score_threshold,
                "affected_nodes": [child["id"] for child in recent_children],
            }

        return {
            "should_break": False,
            "reason": "scores_acceptable",
            "scores": recent_scores,
            "avg_score": sum(recent_scores) / len(recent_scores),
        }

    def execute_circuit_break(
        self, node_id: str, reason: str = "consecutive_low_scores"
    ) -> Dict[str, Any]:
        meta = self.get_node(node_id)
        if meta:
            current_meta = meta.get("meta", {})
            current_meta["circuit_broken"] = True
            current_meta["circuit_break_reason"] = reason
            current_meta["circuit_break_timestamp"] = datetime.now().isoformat()
            self.update_node(node_id, status="circuit_broken", meta=current_meta)

        descendants = self._get_all_descendants(node_id)

        pruned_count = 0
        with self._get_connection() as conn:
            for desc_id in descendants:
                conn.execute("DELETE FROM nodes WHERE id = ?", (desc_id,))
                pruned_count += 1

        return {
            "success": True,
            "node_id": node_id,
            "reason": reason,
            "pruned_count": pruned_count,
            "pruned_nodes": descendants,
        }

    def _get_all_descendants(self, node_id: str) -> List[str]:
        descendants = []
        children = self.get_children(node_id)

        for child in children:
            descendants.append(child["id"])
            descendants.extend(self._get_all_descendants(child["id"]))

        return descendants

    def extend_branch_budget(
        self,
        node_id: str,
        additional_depth: int = 2,
        additional_tokens: int = 10000,
        reason: str = "high_quality_node",
    ) -> bool:
        node = self.get_node(node_id)
        if not node:
            return False

        current_meta = node.get("meta") or {}
        current_meta["extended_depth"] = (
            current_meta.get("extended_depth", 0) + additional_depth
        )
        current_meta["extended_tokens"] = (
            current_meta.get("extended_tokens", 0) + additional_tokens
        )
        current_meta["extension_reason"] = reason
        current_meta["extension_timestamp"] = datetime.now().isoformat()
        current_meta["max_depth"] = (
            current_meta.get("max_depth", node.get("depth", 0)) + additional_depth
        )

        return self.update_node(node_id, meta=current_meta)

    def calculate_information_entropy(
        self, new_node_ids: List[str], existing_node_ids: List[str]
    ) -> Dict[str, Any]:
        new_content = []
        for node_id in new_node_ids:
            node = self.get_node(node_id)
            if node:
                new_content.append(node.get("content", ""))

        existing_content = []
        for node_id in existing_node_ids:
            node = self.get_node(node_id)
            if node:
                existing_content.append(node.get("content", ""))

        new_keywords = self._extract_keywords(" ".join(new_content))
        existing_keywords = self._extract_keywords(" ".join(existing_content))

        if not new_keywords or not existing_keywords:
            return {
                "entropy": 1.0,
                "interpretation": "high_novelty",
                "new_keyword_count": len(new_keywords),
                "existing_keyword_count": len(existing_keywords),
                "overlap_count": 0,
            }

        overlap = new_keywords & existing_keywords
        union = new_keywords | existing_keywords
        unique_new = new_keywords - existing_keywords

        entropy = len(unique_new) / len(new_keywords) if new_keywords else 0.0

        if entropy > 0.7:
            interpretation = "high_novelty"
        elif entropy > 0.4:
            interpretation = "moderate_novelty"
        elif entropy > 0.2:
            interpretation = "low_novelty"
        else:
            interpretation = "duplicate_content"

        return {
            "entropy": entropy,
            "interpretation": interpretation,
            "new_keyword_count": len(new_keywords),
            "existing_keyword_count": len(existing_keywords),
            "unique_new_keywords": len(unique_new),
            "overlap_count": len(overlap),
            "overlap_ratio": len(overlap) / len(union) if union else 0,
            "recommendation": "continue" if entropy > 0.2 else "stop_exploration",
        }

    def _extract_keywords(self, text: str) -> set:
        import re

        words = re.findall(r"\w+", text.lower())

        stop_words = {
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
            "from",
            "as",
            "is",
            "was",
            "are",
            "were",
            "been",
            "be",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
            "must",
            "can",
            "this",
            "that",
            "these",
            "those",
            "it",
            "its",
            "which",
            "what",
            "who",
            "when",
            "where",
        }

        keywords = {word for word in words if len(word) > 3 and word not in stop_words}

        return keywords

    def get_branch_health(self, node_id: str) -> Dict[str, Any]:
        descendants = self._get_all_descendants(node_id)

        if not descendants:
            return {"health": "unknown", "reason": "no_descendants", "node_count": 0}

        scores = []
        with self._get_connection() as conn:
            for desc_id in descendants:
                cursor = conn.execute(
                    "SELECT score FROM nodes WHERE id = ?", (desc_id,)
                )
                row = cursor.fetchone()
                if row:
                    scores.append(row["score"])

        if not scores:
            return {
                "health": "unknown",
                "reason": "no_scores",
                "node_count": len(descendants),
            }

        avg_score = sum(scores) / len(scores)
        max_score = max(scores)
        min_score = min(scores)

        if avg_score >= 8.0:
            health = "excellent"
            recommendation = "continue_and_extend"
        elif avg_score >= 6.0:
            health = "good"
            recommendation = "continue"
        elif avg_score >= 4.0:
            health = "fair"
            recommendation = "monitor"
        else:
            health = "poor"
            recommendation = "consider_circuit_break"

        return {
            "health": health,
            "recommendation": recommendation,
            "node_count": len(descendants),
            "avg_score": avg_score,
            "max_score": max_score,
            "min_score": min_score,
            "score_distribution": {
                "excellent (9-10)": sum(1 for s in scores if s >= 9),
                "good (7-8.9)": sum(1 for s in scores if 7 <= s < 9),
                "fair (5-6.9)": sum(1 for s in scores if 5 <= s < 7),
                "poor (0-4.9)": sum(1 for s in scores if s < 5),
            },
        }

    # ==================== Fact Ledger Methods (Optimization #1) ====================

    def create_fact(
        self,
        session_id: str,
        entity: str,
        attribute: str,
        value: str,
        value_type: str = "text",
        value_numeric: Optional[float] = None,
        unit: Optional[str] = None,
        confidence: str = "Medium",
        context: Optional[str] = None,
    ) -> int:
        """Create a new atomic fact.

        Args:
            session_id: Research session ID
            entity: Entity being described (e.g., "AI Healthcare Market")
            attribute: Attribute being measured (e.g., "Size 2023")
            value: The value as string (e.g., "$22.4B")
            value_type: Type of value (number, date, percentage, currency, text)
            value_numeric: Parsed numeric value for comparisons
            unit: Unit of measurement
            confidence: High, Medium, or Low
            context: Additional interpretation context

        Returns:
            Fact ID
        """
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO facts (session_id, entity, attribute, value, value_type,
                                   value_numeric, unit, confidence, context)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (session_id, entity, attribute, value, value_type,
                 value_numeric, unit, confidence, context),
            )
            return cursor.lastrowid

    def add_fact_source(
        self,
        fact_id: int,
        source_url: str,
        source_title: Optional[str] = None,
        source_author: Optional[str] = None,
        source_date: Optional[str] = None,
        source_quality: Optional[str] = None,
        page_number: Optional[str] = None,
        excerpt: Optional[str] = None,
    ) -> int:
        """Add a source to a fact.

        Args:
            fact_id: Fact to link
            source_url: URL of the source
            source_title: Title of source document
            source_author: Author or organization
            source_date: Publication date
            source_quality: A-E quality rating
            page_number: Page number if applicable
            excerpt: Original text excerpt containing the fact

        Returns:
            Source link ID
        """
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO fact_sources (fact_id, source_url, source_title, source_author,
                                          source_date, source_quality, page_number, excerpt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (fact_id, source_url, source_title, source_author,
                 source_date, source_quality, page_number, excerpt),
            )
            return cursor.lastrowid

    def get_fact(self, fact_id: int) -> Optional[Dict[str, Any]]:
        """Get a fact by ID with its sources.

        Args:
            fact_id: Fact ID

        Returns:
            Fact with sources or None
        """
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM facts WHERE id = ?", (fact_id,)
            )
            row = cursor.fetchone()
            if not row:
                return None

            fact = self._row_to_dict(row)

            # Get sources
            cursor = conn.execute(
                "SELECT * FROM fact_sources WHERE fact_id = ?", (fact_id,)
            )
            fact["sources"] = [self._row_to_dict(r) for r in cursor.fetchall()]

            return fact

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
            entity: Filter by entity name (partial match)
            attribute: Filter by attribute (partial match)
            min_confidence: Minimum confidence level
            value_type: Filter by value type
            limit: Maximum results

        Returns:
            List of matching facts with sources
        """
        conditions = ["session_id = ?"]
        params: List[Any] = [session_id]

        if entity:
            conditions.append("entity LIKE ?")
            params.append(f"%{entity}%")
        if attribute:
            conditions.append("attribute LIKE ?")
            params.append(f"%{attribute}%")
        if min_confidence:
            confidence_order = {"High": 3, "Medium": 2, "Low": 1}
            min_level = confidence_order.get(min_confidence, 1)
            confidence_conditions = [
                c for c, v in confidence_order.items() if v >= min_level
            ]
            placeholders = ",".join("?" * len(confidence_conditions))
            conditions.append(f"confidence IN ({placeholders})")
            params.extend(confidence_conditions)
        if value_type:
            conditions.append("value_type = ?")
            params.append(value_type)

        params.append(limit)
        where_clause = " AND ".join(conditions)

        with self._get_connection() as conn:
            cursor = conn.execute(
                f"""
                SELECT * FROM facts
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ?
            """,
                params,
            )

            facts = []
            for row in cursor.fetchall():
                fact = self._row_to_dict(row)
                # Get sources for each fact
                src_cursor = conn.execute(
                    "SELECT * FROM fact_sources WHERE fact_id = ?",
                    (fact["id"],),
                )
                fact["sources"] = [self._row_to_dict(r) for r in src_cursor.fetchall()]
                facts.append(fact)

            return facts

    def detect_conflicts(self, session_id: str) -> List[Dict[str, Any]]:
        """Detect conflicts between facts in a session.

        Finds facts with the same entity + attribute but different values.

        Args:
            session_id: Research session ID

        Returns:
            List of detected conflicts
        """
        with self._get_connection() as conn:
            # Find groups with multiple different values
            cursor = conn.execute(
                """
                SELECT entity, attribute, COUNT(DISTINCT value) as value_count
                FROM facts
                WHERE session_id = ?
                GROUP BY entity, attribute
                HAVING value_count > 1
            """,
                (session_id,),
            )

            conflicts = []
            for group in cursor.fetchall():
                entity, attribute = group["entity"], group["attribute"]

                # Get all facts in this group
                fact_cursor = conn.execute(
                    """
                    SELECT * FROM facts
                    WHERE session_id = ? AND entity = ? AND attribute = ?
                    ORDER BY created_at
                """,
                    (session_id, entity, attribute),
                )

                group_facts = [self._row_to_dict(r) for r in fact_cursor.fetchall()]

                # Calculate severity based on numeric difference
                severity = "minor"
                if len(group_facts) >= 2:
                    numeric_values = [
                        f["value_numeric"]
                        for f in group_facts
                        if f["value_numeric"] is not None
                    ]
                    if len(numeric_values) >= 2:
                        max_val = max(numeric_values)
                        min_val = min(numeric_values)
                        if max_val > 0:
                            diff_pct = (max_val - min_val) / max_val * 100
                            if diff_pct > 20:
                                severity = "critical"
                            elif diff_pct > 5:
                                severity = "moderate"

                conflicts.append({
                    "entity": entity,
                    "attribute": attribute,
                    "facts": group_facts,
                    "conflict_type": "numerical" if group_facts[0]["value_numeric"] else "scope",
                    "severity": severity,
                })

            return conflicts

    def create_conflict(
        self,
        fact_id_a: int,
        fact_id_b: int,
        conflict_type: str,
        severity: str,
        description: str,
    ) -> int:
        """Record a conflict between two facts.

        Args:
            fact_id_a: First fact ID
            fact_id_b: Second fact ID
            conflict_type: Type of conflict
            severity: critical, moderate, or minor
            description: Description of the conflict

        Returns:
            Conflict ID
        """
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO fact_conflicts (fact_id_a, fact_id_b, conflict_type, severity, description)
                VALUES (?, ?, ?, ?, ?)
            """,
                (fact_id_a, fact_id_b, conflict_type, severity, description),
            )
            return cursor.lastrowid

    def resolve_conflict(self, conflict_id: int, resolution: str) -> bool:
        """Mark a conflict as resolved.

        Args:
            conflict_id: Conflict ID
            resolution: Resolution explanation

        Returns:
            True if successful
        """
        with self._get_connection() as conn:
            conn.execute(
                """
                UPDATE fact_conflicts
                SET resolution = ?, resolved_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """,
                (resolution, conflict_id),
            )
            return conn.total_changes > 0

    def get_statistics_table(self, session_id: str) -> Dict[str, Any]:
        """Generate key statistics table from facts.

        Args:
            session_id: Research session ID

        Returns:
            Statistics summary
        """
        with self._get_connection() as conn:
            # Get high-confidence numerical facts
            cursor = conn.execute(
                """
                SELECT f.*, fs.source_author, fs.source_date, fs.source_quality
                FROM facts f
                LEFT JOIN fact_sources fs ON f.id = fs.fact_id
                WHERE f.session_id = ?
                  AND f.confidence = 'High'
                  AND f.value_numeric IS NOT NULL
                ORDER BY f.entity, f.attribute
            """,
                (session_id,),
            )

            stats = []
            for row in cursor.fetchall():
                stats.append({
                    "entity": row["entity"],
                    "attribute": row["attribute"],
                    "value": row["value"],
                    "source": f"{row['source_author'] or 'Unknown'}, {row['source_date'] or 'N/A'}",
                    "quality": row["source_quality"] or "N/A",
                })

            # Get conflict count
            conflict_cursor = conn.execute(
                """
                SELECT COUNT(*) as count
                FROM fact_conflicts fc
                JOIN facts f ON fc.fact_id_a = f.id
                WHERE f.session_id = ? AND fc.resolved_at IS NULL
            """,
                (session_id,),
            )
            unresolved_conflicts = conflict_cursor.fetchone()["count"]

            # Get total fact counts
            count_cursor = conn.execute(
                """
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN confidence = 'High' THEN 1 ELSE 0 END) as high_confidence,
                    SUM(CASE WHEN confidence = 'Medium' THEN 1 ELSE 0 END) as medium_confidence,
                    SUM(CASE WHEN confidence = 'Low' THEN 1 ELSE 0 END) as low_confidence
                FROM facts
                WHERE session_id = ?
            """,
                (session_id,),
            )
            counts = self._row_to_dict(count_cursor.fetchone())

            return {
                "statistics": stats,
                "unresolved_conflicts": unresolved_conflicts,
                "fact_counts": counts,
            }

    # ==================== Entity Graph Methods (Optimization #2) ====================

    def create_entity(
        self,
        session_id: str,
        name: str,
        entity_type: Optional[str] = None,
        description: Optional[str] = None,
    ) -> int:
        """Create a new entity.

        Args:
            session_id: Research session ID
            name: Entity name
            entity_type: Type (company, person, technology, market)
            description: Entity description

        Returns:
            Entity ID
        """
        # Check for existing entity with same canonical name
        canonical = self.get_canonical_name(name)

        with self._get_connection() as conn:
            # Check if entity already exists
            cursor = conn.execute(
                "SELECT id FROM entities WHERE session_id = ? AND name = ?",
                (session_id, canonical),
            )
            existing = cursor.fetchone()
            if existing:
                return existing["id"]

            cursor = conn.execute(
                """
                INSERT INTO entities (session_id, name, entity_type, description)
                VALUES (?, ?, ?, ?)
            """,
                (session_id, canonical, entity_type, description),
            )
            return cursor.lastrowid

    def add_entity_alias(self, canonical_name: str, alias: str) -> bool:
        """Add an alias for an entity.

        Args:
            canonical_name: The standard name
            alias: Alternative name

        Returns:
            True if added successfully
        """
        try:
            with self._get_connection() as conn:
                conn.execute(
                    "INSERT INTO entity_aliases (canonical_name, alias) VALUES (?, ?)",
                    (canonical_name, alias),
                )
                return True
        except sqlite3.IntegrityError:
            return False

    def get_canonical_name(self, name: str) -> str:
        """Get canonical name for an entity.

        Args:
            name: Entity name or alias

        Returns:
            Canonical name or original name if no alias found
        """
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT canonical_name FROM entity_aliases WHERE alias = ?",
                (name,),
            )
            row = cursor.fetchone()
            return row["canonical_name"] if row else name

    def create_entity_edge(
        self,
        session_id: str,
        source_entity_id: int,
        target_entity_id: int,
        relation_type: str,
        confidence: float = 0.5,
        evidence: Optional[str] = None,
        source_url: Optional[str] = None,
    ) -> int:
        """Create an edge between two entities.

        Args:
            session_id: Research session ID
            source_entity_id: Source entity
            target_entity_id: Target entity
            relation_type: Type of relationship
            confidence: Confidence score (0-1)
            evidence: Supporting evidence
            source_url: Source URL

        Returns:
            Edge ID
        """
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO entity_edges (session_id, source_entity_id, target_entity_id,
                                          relation_type, confidence, evidence, source_url)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (session_id, source_entity_id, target_entity_id,
                 relation_type, confidence, evidence, source_url),
            )
            return cursor.lastrowid

    def get_related_entities(
        self,
        entity_id: int,
        relation_type: Optional[str] = None,
        direction: str = "both",
    ) -> List[Dict[str, Any]]:
        """Get entities related to a given entity.

        Args:
            entity_id: Entity to find relations for
            relation_type: Filter by relation type
            direction: 'outgoing', 'incoming', or 'both'

        Returns:
            List of related entities with relationship info
        """
        results = []

        with self._get_connection() as conn:
            if direction in ("outgoing", "both"):
                query = """
                    SELECT e.*, ee.relation_type, ee.confidence, ee.evidence, 'outgoing' as direction
                    FROM entities e
                    JOIN entity_edges ee ON e.id = ee.target_entity_id
                    WHERE ee.source_entity_id = ?
                """
                params: List[Any] = [entity_id]
                if relation_type:
                    query += " AND ee.relation_type = ?"
                    params.append(relation_type)

                cursor = conn.execute(query, params)
                results.extend([self._row_to_dict(r) for r in cursor.fetchall()])

            if direction in ("incoming", "both"):
                query = """
                    SELECT e.*, ee.relation_type, ee.confidence, ee.evidence, 'incoming' as direction
                    FROM entities e
                    JOIN entity_edges ee ON e.id = ee.source_entity_id
                    WHERE ee.target_entity_id = ?
                """
                params = [entity_id]
                if relation_type:
                    query += " AND ee.relation_type = ?"
                    params.append(relation_type)

                cursor = conn.execute(query, params)
                results.extend([self._row_to_dict(r) for r in cursor.fetchall()])

        return results

    def record_cooccurrence(
        self,
        entity_a_id: int,
        entity_b_id: int,
        context: str,
    ) -> None:
        """Record a co-occurrence between two entities.

        Args:
            entity_a_id: First entity
            entity_b_id: Second entity
            context: Context snippet where they appeared together
        """
        # Ensure consistent ordering
        if entity_a_id > entity_b_id:
            entity_a_id, entity_b_id = entity_b_id, entity_a_id

        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT id, cooccurrence_count, context_snippets
                FROM entity_cooccurrence
                WHERE entity_a_id = ? AND entity_b_id = ?
            """,
                (entity_a_id, entity_b_id),
            )
            existing = cursor.fetchone()

            if existing:
                snippets = json.loads(existing["context_snippets"] or "[]")
                snippets.append(context)
                conn.execute(
                    """
                    UPDATE entity_cooccurrence
                    SET cooccurrence_count = cooccurrence_count + 1,
                        context_snippets = ?
                    WHERE id = ?
                """,
                    (json.dumps(snippets[-10:]), existing["id"]),  # Keep last 10
                )
            else:
                conn.execute(
                    """
                    INSERT INTO entity_cooccurrence (entity_a_id, entity_b_id, cooccurrence_count, context_snippets)
                    VALUES (?, ?, 1, ?)
                """,
                    (entity_a_id, entity_b_id, json.dumps([context])),
                )

    # ==================== Interrupt Event Methods (Optimization #4) ====================

    def create_interrupt(
        self,
        session_id: str,
        condition: str,
        message: str,
    ) -> int:
        """Create an interrupt event.

        Args:
            session_id: Research session ID
            condition: Condition that triggered the interrupt
            message: Message to show user

        Returns:
            Interrupt event ID
        """
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO interrupt_events (session_id, condition, message)
                VALUES (?, ?, ?)
            """,
                (session_id, condition, message),
            )
            return cursor.lastrowid

    def resolve_interrupt(self, interrupt_id: int, user_response: str) -> bool:
        """Record user response and resolve interrupt.

        Args:
            interrupt_id: Interrupt event ID
            user_response: User's response

        Returns:
            True if successful
        """
        with self._get_connection() as conn:
            conn.execute(
                """
                UPDATE interrupt_events
                SET user_response = ?, resolved_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """,
                (user_response, interrupt_id),
            )
            return conn.total_changes > 0

    def get_pending_interrupts(self, session_id: str) -> List[Dict[str, Any]]:
        """Get unresolved interrupt events.

        Args:
            session_id: Research session ID

        Returns:
            List of pending interrupts
        """
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT * FROM interrupt_events
                WHERE session_id = ? AND resolved_at IS NULL
                ORDER BY created_at DESC
            """,
                (session_id,),
            )
            return [self._row_to_dict(r) for r in cursor.fetchall()]
