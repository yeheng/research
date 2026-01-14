"""
Deep Research Framework - Centralized State Manager
Version: 2.0.0 (Refactored)

Provides thread-safe, ACID-compliant state management for:
- Research sessions with complete lifecycle tracking
- Graph of Thoughts (GoT) operations and history
- Research agent coordination and monitoring
- Fact ledger with source attribution and conflict detection
- Entity graph with relationships
- Citations with quality validation

Changes from v1.0:
- Unified schema using external schema.sql
- Complete data classes for type safety
- Enhanced session status tracking
- Agent lifecycle management (not just heartbeats)
- Citation quality tracking
- Improved concurrent access patterns
"""

import sqlite3
import json
import threading
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum


# ============================================================================
# Enums and Type Definitions
# ============================================================================

class ResearchType(Enum):
    """Type of research being conducted"""
    DEEP = "deep"
    QUICK = "quick"
    CUSTOM = "custom"


class SessionStatus(Enum):
    """Research session lifecycle states"""
    INITIALIZING = "initializing"
    PLANNING = "planning"
    EXECUTING = "executing"
    SYNTHESIZING = "synthesizing"
    VALIDATING = "validating"
    COMPLETED = "completed"
    FAILED = "failed"


class NodeType(Enum):
    """GoT node types"""
    ROOT = "root"
    BRANCH = "branch"
    LEAF = "leaf"


class NodeStatus(Enum):
    """GoT node states"""
    ACTIVE = "active"
    PRUNED = "pruned"
    AGGREGATED = "aggregated"
    REFINED = "refined"


class AgentStatus(Enum):
    """Research agent lifecycle states"""
    DEPLOYING = "deploying"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"


class GoTOperation(Enum):
    """Graph of Thoughts operations"""
    GENERATE = "Generate"
    AGGREGATE = "Aggregate"
    REFINE = "Refine"
    SCORE = "Score"
    PRUNE = "Prune"


class ValueType(Enum):
    """Types of fact values"""
    NUMBER = "number"
    DATE = "date"
    PERCENTAGE = "percentage"
    CURRENCY = "currency"
    TEXT = "text"


class Confidence(Enum):
    """Confidence levels for facts"""
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class SourceQuality(Enum):
    """Source quality ratings (A-E scale)"""
    A = "A"  # Peer-reviewed, systematic reviews, RCTs
    B = "B"  # Cohort studies, clinical guidelines, reputable analysts
    C = "C"  # Expert opinion, case reports, mechanistic studies
    D = "D"  # Preprints, preliminary research, industry blogs
    E = "E"  # Anecdotal, theoretical, speculative


class ConflictType(Enum):
    """Types of fact conflicts"""
    NUMERICAL = "numerical"
    TEMPORAL = "temporal"
    SCOPE = "scope"
    METHODOLOGICAL = "methodological"


class ConflictSeverity(Enum):
    """Severity levels for conflicts"""
    CRITICAL = "critical"
    MODERATE = "moderate"
    MINOR = "minor"


# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class ResearchSession:
    """Research session with complete metadata"""
    session_id: str
    research_topic: str
    research_type: str = ResearchType.DEEP.value
    status: str = SessionStatus.INITIALIZING.value
    structured_prompt: Optional[str] = None
    research_plan: Optional[str] = None
    output_directory: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    error_log: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    completed_at: Optional[str] = None


@dataclass
class GoTNode:
    """Graph of Thoughts node with token optimization"""
    node_id: str
    session_id: str
    content: str
    parent_id: Optional[str] = None
    node_type: str = NodeType.BRANCH.value
    quality_score: Optional[float] = None
    depth: int = 0
    status: str = NodeStatus.ACTIVE.value
    summary: Optional[str] = None  # Compressed version for token efficiency
    compression_ratio: float = 0.1  # Target 10:1 compression (10% of original)
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class ResearchAgent:
    """Research agent with lifecycle tracking"""
    agent_id: str
    session_id: str
    agent_type: str
    agent_role: str
    status: str = AgentStatus.DEPLOYING.value
    focus_description: Optional[str] = None
    search_queries: Optional[List[str]] = None
    output_file: Optional[str] = None
    token_usage: int = 0
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    deployed_at: Optional[str] = None
    completed_at: Optional[str] = None


@dataclass
class Fact:
    """Atomic fact with source attribution"""
    entity: str
    attribute: str
    value: str
    session_id: str
    value_type: str = ValueType.TEXT.value
    confidence: str = Confidence.MEDIUM.value
    agent_id: Optional[str] = None
    source_url: Optional[str] = None
    source_title: Optional[str] = None
    source_author: Optional[str] = None
    source_date: Optional[str] = None
    source_quality: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    fact_id: Optional[int] = None
    extraction_timestamp: Optional[str] = None


@dataclass
class Entity:
    """Named entity from research"""
    entity_name: str
    entity_type: str
    session_id: str
    aliases: Optional[List[str]] = None
    description: Optional[str] = None
    mention_count: int = 1
    metadata: Optional[Dict[str, Any]] = None
    entity_id: Optional[int] = None
    first_seen_at: Optional[str] = None


@dataclass
class EntityRelationship:
    """Relationship between two entities"""
    source_entity_id: int
    target_entity_id: int
    relation_type: str
    session_id: str
    confidence: Optional[float] = None
    evidence: Optional[str] = None
    source_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    relationship_id: Optional[int] = None
    detected_at: Optional[str] = None


@dataclass
class Citation:
    """Citation with quality validation"""
    claim: str
    session_id: str
    agent_id: Optional[str] = None
    author: Optional[str] = None
    publication_date: Optional[str] = None
    title: Optional[str] = None
    url: Optional[str] = None
    page_numbers: Optional[str] = None
    quality_rating: Optional[str] = None
    url_accessible: Optional[bool] = None
    complete: bool = False
    metadata: Optional[Dict[str, Any]] = None
    citation_id: Optional[int] = None
    validation_timestamp: Optional[str] = None


# ============================================================================
# State Manager
# ============================================================================

class StateManager:
    """
    Thread-safe, centralized state management for Deep Research Framework.

    Features:
    - ACID-compliant SQLite backend
    - Thread-safe operations with connection pooling
    - Automatic timestamp management
    - JSON serialization for complex types
    - Comprehensive error handling
    - External schema management

    Usage:
        sm = StateManager()  # Uses default location
        session = sm.create_session(ResearchSession(...))
        sm.close()
    """

    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize StateManager.

        Args:
            db_path: Path to SQLite database file. If None, uses default location.
        """
        if db_path is None:
            project_root = Path(__file__).parent.parent
            db_path = str(project_root / ".claude" / "mcp-server" / "state" / "research_state.db")

        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        # Thread-local storage for connections
        self._local = threading.local()

        # Initialize database
        self._initialize_database()

    def _get_connection(self) -> sqlite3.Connection:
        """Get thread-local database connection."""
        if not hasattr(self._local, 'connection'):
            self._local.connection = sqlite3.connect(
                str(self.db_path),
                check_same_thread=False,
                timeout=30.0
            )
            self._local.connection.row_factory = sqlite3.Row
            # Enable foreign keys
            self._local.connection.execute("PRAGMA foreign_keys = ON")
            # Enable WAL mode for better concurrent access
            self._local.connection.execute("PRAGMA journal_mode=WAL")
        return self._local.connection

    @contextmanager
    def _transaction(self):
        """Context manager for database transactions."""
        conn = self._get_connection()
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e

    def _initialize_database(self):
        """Initialize database with schema from schema.sql."""
        schema_path = self.db_path.parent / "schema.sql"

        if not schema_path.exists():
            raise FileNotFoundError(
                f"Schema file not found at {schema_path}. "
                "Please ensure schema.sql is in the same directory as the database."
            )

        with open(schema_path, 'r') as f:
            schema_sql = f.read()

        with self._transaction() as conn:
            conn.executescript(schema_sql)

    def close(self):
        """Close database connection."""
        if hasattr(self._local, 'connection'):
            self._local.connection.close()
            delattr(self._local, 'connection')

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert SQLite row to dictionary with JSON parsing."""
        result = dict(row)

        # Parse JSON fields
        json_fields = ['metadata']
        for field in json_fields:
            if field in result and result[field]:
                try:
                    result[field] = json.loads(result[field])
                except (json.JSONDecodeError, TypeError):
                    result[field] = None

        return result

    # ========================================================================
    # Research Session Operations
    # ========================================================================

    def create_session(self, session: ResearchSession) -> ResearchSession:
        """
        Create a new research session.

        Args:
            session: ResearchSession object with required fields

        Returns:
            Created session with timestamps

        Raises:
            sqlite3.IntegrityError: If session_id already exists
        """
        with self._transaction() as conn:
            conn.execute("""
                INSERT INTO research_sessions
                (session_id, research_topic, research_type, status, structured_prompt,
                 research_plan, output_directory, metadata, error_log)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                session.session_id,
                session.research_topic,
                session.research_type,
                session.status,
                session.structured_prompt,
                session.research_plan,
                session.output_directory,
                json.dumps(session.metadata) if session.metadata else None,
                session.error_log
            ))

        return self.get_session(session.session_id)

    def get_session(self, session_id: str) -> Optional[ResearchSession]:
        """Get research session by ID."""
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT * FROM research_sessions WHERE session_id = ?",
            (session_id,)
        )
        row = cursor.fetchone()

        if row is None:
            return None

        data = self._row_to_dict(row)
        return ResearchSession(**data)

    def update_session_status(
        self,
        session_id: str,
        status: str,
        error_log: Optional[str] = None
    ) -> bool:
        """
        Update session status.

        Args:
            session_id: Session to update
            status: New status (from SessionStatus enum)
            error_log: Optional error message if status is FAILED

        Returns:
            True if updated successfully
        """
        with self._transaction() as conn:
            params = [status]
            sql = "UPDATE research_sessions SET status = ?"

            if status == SessionStatus.COMPLETED.value:
                sql += ", completed_at = CURRENT_TIMESTAMP"

            if error_log:
                sql += ", error_log = ?"
                params.append(error_log)

            sql += " WHERE session_id = ?"
            params.append(session_id)

            cursor = conn.execute(sql, params)
            return cursor.rowcount > 0

    def update_session(self, session_id: str, **kwargs) -> bool:
        """
        Update session fields.

        Args:
            session_id: Session to update
            **kwargs: Fields to update (structured_prompt, research_plan, metadata, etc.)

        Returns:
            True if updated successfully
        """
        if not kwargs:
            return False

        # Convert metadata to JSON if present
        if 'metadata' in kwargs and kwargs['metadata'] is not None:
            kwargs['metadata'] = json.dumps(kwargs['metadata'])

        set_clause = ", ".join(f"{k} = ?" for k in kwargs.keys())
        values = list(kwargs.values()) + [session_id]

        with self._transaction() as conn:
            cursor = conn.execute(
                f"UPDATE research_sessions SET {set_clause} WHERE session_id = ?",
                values
            )
            return cursor.rowcount > 0

    def list_sessions(
        self,
        status: Optional[str] = None,
        limit: int = 100
    ) -> List[ResearchSession]:
        """
        List research sessions.

        Args:
            status: Filter by status (optional)
            limit: Maximum number of sessions to return

        Returns:
            List of research sessions
        """
        conn = self._get_connection()

        sql = "SELECT * FROM research_sessions"
        params = []

        if status:
            sql += " WHERE status = ?"
            params.append(status)

        sql += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        cursor = conn.execute(sql, params)

        sessions = []
        for row in cursor.fetchall():
            data = self._row_to_dict(row)
            sessions.append(ResearchSession(**data))

        return sessions

    def delete_session(self, session_id: str) -> bool:
        """
        Delete a session and all related data (cascading).

        Args:
            session_id: Session to delete

        Returns:
            True if deleted successfully
        """
        with self._transaction() as conn:
            cursor = conn.execute(
                "DELETE FROM research_sessions WHERE session_id = ?",
                (session_id,)
            )
            return cursor.rowcount > 0

    # ========================================================================
    # Graph of Thoughts Operations
    # ========================================================================

    def create_got_node(self, node: GoTNode) -> GoTNode:
        """Create a GoT node with optional summary for token optimization."""
        with self._transaction() as conn:
            conn.execute("""
                INSERT INTO got_nodes
                (node_id, session_id, parent_id, node_type, content,
                 quality_score, depth, status, summary, compression_ratio, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                node.node_id,
                node.session_id,
                node.parent_id,
                node.node_type,
                node.content,
                node.quality_score,
                node.depth,
                node.status,
                node.summary,
                node.compression_ratio,
                json.dumps(node.metadata) if node.metadata else None
            ))

        return self.get_got_node(node.node_id)

    def get_got_node(self, node_id: str) -> Optional[GoTNode]:
        """Get GoT node by ID."""
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT * FROM got_nodes WHERE node_id = ?",
            (node_id,)
        )
        row = cursor.fetchone()

        if row is None:
            return None

        data = self._row_to_dict(row)
        return GoTNode(**data)

    def update_got_node(self, node_id: str, **kwargs) -> bool:
        """Update GoT node fields."""
        if not kwargs:
            return False

        if 'metadata' in kwargs and kwargs['metadata'] is not None:
            kwargs['metadata'] = json.dumps(kwargs['metadata'])

        set_clause = ", ".join(f"{k} = ?" for k in kwargs.keys())
        values = list(kwargs.values()) + [node_id]

        with self._transaction() as conn:
            cursor = conn.execute(
                f"UPDATE got_nodes SET {set_clause} WHERE node_id = ?",
                values
            )
            return cursor.rowcount > 0

    def get_session_got_nodes(
        self,
        session_id: str,
        status: Optional[str] = None
    ) -> List[GoTNode]:
        """Get all GoT nodes for a session."""
        conn = self._get_connection()

        sql = "SELECT * FROM got_nodes WHERE session_id = ?"
        params = [session_id]

        if status:
            sql += " AND status = ?"
            params.append(status)

        sql += " ORDER BY depth, created_at"

        cursor = conn.execute(sql, params)

        nodes = []
        for row in cursor.fetchall():
            data = self._row_to_dict(row)
            nodes.append(GoTNode(**data))

        return nodes

    def get_node_children(self, parent_id: str) -> List[GoTNode]:
        """Get all children of a node."""
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT * FROM got_nodes WHERE parent_id = ? ORDER BY quality_score DESC",
            (parent_id,)
        )

        nodes = []
        for row in cursor.fetchall():
            data = self._row_to_dict(row)
            nodes.append(GoTNode(**data))

        return nodes

    def log_got_operation(
        self,
        session_id: str,
        operation_type: str,
        node_ids: List[str],
        parameters: Optional[Dict] = None,
        result: Optional[Dict] = None
    ) -> int:
        """
        Log a GoT operation for debugging and analysis.

        Args:
            session_id: Research session
            operation_type: Type of operation (from GoTOperation enum)
            node_ids: List of affected node IDs
            parameters: Operation parameters
            result: Operation result

        Returns:
            Operation log ID
        """
        with self._transaction() as conn:
            cursor = conn.execute("""
                INSERT INTO got_operations
                (session_id, operation_type, node_ids, parameters, result)
                VALUES (?, ?, ?, ?, ?)
            """, (
                session_id,
                operation_type,
                json.dumps(node_ids),
                json.dumps(parameters) if parameters else None,
                json.dumps(result) if result else None
            ))
            return cursor.lastrowid

    def get_got_operations(
        self,
        session_id: str,
        operation_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get GoT operation history for a session."""
        conn = self._get_connection()

        sql = "SELECT * FROM got_operations WHERE session_id = ?"
        params = [session_id]

        if operation_type:
            sql += " AND operation_type = ?"
            params.append(operation_type)

        sql += " ORDER BY timestamp DESC"

        cursor = conn.execute(sql, params)

        operations = []
        for row in cursor.fetchall():
            data = self._row_to_dict(row)
            # Parse JSON arrays
            if data['node_ids']:
                data['node_ids'] = json.loads(data['node_ids'])
            operations.append(data)

        return operations

    def prune_nodes(self, node_ids: List[str]) -> int:
        """
        Mark multiple nodes as pruned.

        Args:
            node_ids: List of node IDs to prune

        Returns:
            Number of nodes pruned
        """
        if not node_ids:
            return 0

        with self._transaction() as conn:
            placeholders = ','.join('?' * len(node_ids))
            cursor = conn.execute(
                f"UPDATE got_nodes SET status = ? WHERE node_id IN ({placeholders})",
                [NodeStatus.PRUNED.value] + node_ids
            )
            return cursor.rowcount

    def keep_best_n(self, session_id: str, n: int, parent_id: Optional[str] = None) -> int:
        """
        Keep only top N nodes by quality score (GoT KeepBestN operation).

        Args:
            session_id: Research session
            n: Number of nodes to keep
            parent_id: If provided, only prune children of this parent

        Returns:
            Number of nodes pruned
        """
        conn = self._get_connection()

        if parent_id:
            # Get IDs of nodes to keep
            cursor = conn.execute("""
                SELECT node_id FROM got_nodes
                WHERE parent_id = ? AND status = ?
                ORDER BY quality_score DESC
                LIMIT ?
            """, (parent_id, NodeStatus.ACTIVE.value, n))
        else:
            # Global pruning
            cursor = conn.execute("""
                SELECT node_id FROM got_nodes
                WHERE session_id = ? AND status = ?
                ORDER BY quality_score DESC
                LIMIT ?
            """, (session_id, NodeStatus.ACTIVE.value, n))

        keep_ids = [row['node_id'] for row in cursor.fetchall()]

        if not keep_ids:
            return 0

        # Prune all other active nodes
        with self._transaction() as conn:
            placeholders = ','.join('?' * len(keep_ids))

            if parent_id:
                cursor = conn.execute(f"""
                    UPDATE got_nodes
                    SET status = ?
                    WHERE parent_id = ? AND status = ? AND node_id NOT IN ({placeholders})
                """, [NodeStatus.PRUNED.value, parent_id, NodeStatus.ACTIVE.value] + keep_ids)
            else:
                cursor = conn.execute(f"""
                    UPDATE got_nodes
                    SET status = ?
                    WHERE session_id = ? AND status = ? AND node_id NOT IN ({placeholders})
                """, [NodeStatus.PRUNED.value, session_id, NodeStatus.ACTIVE.value] + keep_ids)

            return cursor.rowcount

    # ========================================================================
    # Research Agent Operations
    # ========================================================================

    def register_agent(self, agent: ResearchAgent) -> ResearchAgent:
        """Register a new research agent."""
        with self._transaction() as conn:
            conn.execute("""
                INSERT INTO research_agents
                (agent_id, session_id, agent_type, agent_role, status,
                 focus_description, search_queries, output_file,
                 token_usage, error_message, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                agent.agent_id,
                agent.session_id,
                agent.agent_type,
                agent.agent_role,
                agent.status,
                agent.focus_description,
                json.dumps(agent.search_queries) if agent.search_queries else None,
                agent.output_file,
                agent.token_usage,
                agent.error_message,
                json.dumps(agent.metadata) if agent.metadata else None
            ))

        return self.get_agent(agent.agent_id)

    def get_agent(self, agent_id: str) -> Optional[ResearchAgent]:
        """Get research agent by ID."""
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT * FROM research_agents WHERE agent_id = ?",
            (agent_id,)
        )
        row = cursor.fetchone()

        if row is None:
            return None

        data = self._row_to_dict(row)
        # Parse search_queries
        if data['search_queries']:
            data['search_queries'] = json.loads(data['search_queries'])

        return ResearchAgent(**data)

    def update_agent_status(
        self,
        agent_id: str,
        status: str,
        error_message: Optional[str] = None
    ) -> bool:
        """Update agent status."""
        with self._transaction() as conn:
            params = [status]
            sql = "UPDATE research_agents SET status = ?"

            if status == AgentStatus.COMPLETED.value:
                sql += ", completed_at = CURRENT_TIMESTAMP"

            if error_message:
                sql += ", error_message = ?"
                params.append(error_message)

            sql += " WHERE agent_id = ?"
            params.append(agent_id)

            cursor = conn.execute(sql, params)
            return cursor.rowcount > 0

    def update_agent(self, agent_id: str, **kwargs) -> bool:
        """Update agent fields."""
        if not kwargs:
            return False

        # Convert JSON fields
        if 'search_queries' in kwargs and kwargs['search_queries'] is not None:
            kwargs['search_queries'] = json.dumps(kwargs['search_queries'])
        if 'metadata' in kwargs and kwargs['metadata'] is not None:
            kwargs['metadata'] = json.dumps(kwargs['metadata'])

        set_clause = ", ".join(f"{k} = ?" for k in kwargs.keys())
        values = list(kwargs.values()) + [agent_id]

        with self._transaction() as conn:
            cursor = conn.execute(
                f"UPDATE research_agents SET {set_clause} WHERE agent_id = ?",
                values
            )
            return cursor.rowcount > 0

    def get_session_agents(
        self,
        session_id: str,
        status: Optional[str] = None
    ) -> List[ResearchAgent]:
        """Get all agents for a session."""
        conn = self._get_connection()

        sql = "SELECT * FROM research_agents WHERE session_id = ?"
        params = [session_id]

        if status:
            sql += " AND status = ?"
            params.append(status)

        sql += " ORDER BY deployed_at"

        cursor = conn.execute(sql, params)

        agents = []
        for row in cursor.fetchall():
            data = self._row_to_dict(row)
            if data['search_queries']:
                data['search_queries'] = json.loads(data['search_queries'])
            agents.append(ResearchAgent(**data))

        return agents

    def get_agent_statistics(self, session_id: str) -> Dict[str, Any]:
        """Get agent statistics for a session."""
        conn = self._get_connection()

        cursor = conn.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as running,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as failed,
                SUM(token_usage) as total_tokens
            FROM research_agents
            WHERE session_id = ?
        """, (AgentStatus.RUNNING.value, AgentStatus.COMPLETED.value,
              AgentStatus.FAILED.value, session_id))

        row = cursor.fetchone()
        return self._row_to_dict(row)

    # ========================================================================
    # Fact Ledger Operations
    # ========================================================================

    def add_fact(self, fact: Fact) -> Fact:
        """Add a fact to the ledger."""
        with self._transaction() as conn:
            cursor = conn.execute("""
                INSERT INTO facts
                (session_id, agent_id, entity, attribute, value, value_type,
                 confidence, source_url, source_title, source_author,
                 source_date, source_quality, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                fact.session_id,
                fact.agent_id,
                fact.entity,
                fact.attribute,
                fact.value,
                fact.value_type,
                fact.confidence,
                fact.source_url,
                fact.source_title,
                fact.source_author,
                fact.source_date,
                fact.source_quality,
                json.dumps(fact.metadata) if fact.metadata else None
            ))
            fact.fact_id = cursor.lastrowid

        return self.get_fact(fact.fact_id)

    def get_fact(self, fact_id: int) -> Optional[Fact]:
        """Get fact by ID."""
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT * FROM facts WHERE fact_id = ?",
            (fact_id,)
        )
        row = cursor.fetchone()

        if row is None:
            return None

        data = self._row_to_dict(row)
        return Fact(**data)

    def query_facts(
        self,
        session_id: str,
        entity: Optional[str] = None,
        attribute: Optional[str] = None,
        confidence: Optional[str] = None
    ) -> List[Fact]:
        """
        Query facts from the ledger.

        Args:
            session_id: Research session
            entity: Filter by entity (optional)
            attribute: Filter by attribute (optional)
            confidence: Minimum confidence level (optional)

        Returns:
            List of matching facts
        """
        conn = self._get_connection()

        sql = "SELECT * FROM facts WHERE session_id = ?"
        params = [session_id]

        if entity:
            sql += " AND entity = ?"
            params.append(entity)

        if attribute:
            sql += " AND attribute = ?"
            params.append(attribute)

        if confidence:
            sql += " AND confidence = ?"
            params.append(confidence)

        sql += " ORDER BY extraction_timestamp DESC"

        cursor = conn.execute(sql, params)

        facts = []
        for row in cursor.fetchall():
            data = self._row_to_dict(row)
            facts.append(Fact(**data))

        return facts

    def add_fact_conflict(
        self,
        session_id: str,
        entity: str,
        attribute: str,
        conflict_type: str,
        severity: str,
        fact_ids: List[int],
        explanation: Optional[str] = None
    ) -> int:
        """Record a fact conflict."""
        with self._transaction() as conn:
            cursor = conn.execute("""
                INSERT INTO fact_conflicts
                (session_id, entity, attribute, conflict_type, severity,
                 fact_ids, explanation)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                session_id,
                entity,
                attribute,
                conflict_type,
                severity,
                json.dumps(fact_ids),
                explanation
            ))
            return cursor.lastrowid

    def get_conflicts(
        self,
        session_id: str,
        resolved: Optional[bool] = None
    ) -> List[Dict]:
        """Get fact conflicts for a session."""
        conn = self._get_connection()

        sql = "SELECT * FROM fact_conflicts WHERE session_id = ?"
        params = [session_id]

        if resolved is not None:
            sql += " AND resolved = ?"
            params.append(resolved)

        sql += " ORDER BY severity DESC, detected_at DESC"

        cursor = conn.execute(sql, params)

        conflicts = []
        for row in cursor.fetchall():
            data = self._row_to_dict(row)
            data['fact_ids'] = json.loads(data['fact_ids'])
            data['resolved'] = bool(data['resolved'])
            conflicts.append(data)

        return conflicts

    def resolve_conflict(self, conflict_id: int, resolution_note: str) -> bool:
        """Mark a conflict as resolved."""
        with self._transaction() as conn:
            cursor = conn.execute("""
                UPDATE fact_conflicts
                SET resolved = TRUE, resolution_note = ?
                WHERE conflict_id = ?
            """, (resolution_note, conflict_id))
            return cursor.rowcount > 0

    # ========================================================================
    # Entity Graph Operations
    # ========================================================================

    def add_entity(self, entity: Entity) -> Entity:
        """Add or update an entity."""
        with self._transaction() as conn:
            try:
                cursor = conn.execute("""
                    INSERT INTO entities
                    (session_id, entity_name, entity_type, aliases,
                     description, mention_count, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    entity.session_id,
                    entity.entity_name,
                    entity.entity_type,
                    json.dumps(entity.aliases) if entity.aliases else None,
                    entity.description,
                    entity.mention_count,
                    json.dumps(entity.metadata) if entity.metadata else None
                ))
                entity.entity_id = cursor.lastrowid
            except sqlite3.IntegrityError:
                # Entity already exists, increment mention count
                conn.execute("""
                    UPDATE entities
                    SET mention_count = mention_count + 1
                    WHERE session_id = ? AND entity_name = ? AND entity_type = ?
                """, (entity.session_id, entity.entity_name, entity.entity_type))

                cursor = conn.execute("""
                    SELECT entity_id FROM entities
                    WHERE session_id = ? AND entity_name = ? AND entity_type = ?
                """, (entity.session_id, entity.entity_name, entity.entity_type))
                entity.entity_id = cursor.fetchone()['entity_id']

        return self.get_entity(entity.entity_id)

    def get_entity(self, entity_id: int) -> Optional[Entity]:
        """Get entity by ID."""
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT * FROM entities WHERE entity_id = ?",
            (entity_id,)
        )
        row = cursor.fetchone()

        if row is None:
            return None

        data = self._row_to_dict(row)
        if data['aliases']:
            data['aliases'] = json.loads(data['aliases'])

        return Entity(**data)

    def find_entity(
        self,
        session_id: str,
        entity_name: str,
        entity_type: str
    ) -> Optional[Entity]:
        """Find entity by name and type."""
        conn = self._get_connection()
        cursor = conn.execute("""
            SELECT * FROM entities
            WHERE session_id = ? AND entity_name = ? AND entity_type = ?
        """, (session_id, entity_name, entity_type))
        row = cursor.fetchone()

        if row is None:
            return None

        data = self._row_to_dict(row)
        if data['aliases']:
            data['aliases'] = json.loads(data['aliases'])

        return Entity(**data)

    def add_relationship(self, relationship: EntityRelationship) -> EntityRelationship:
        """Add an entity relationship."""
        with self._transaction() as conn:
            cursor = conn.execute("""
                INSERT INTO entity_relationships
                (session_id, source_entity_id, target_entity_id, relation_type,
                 confidence, evidence, source_url, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                relationship.session_id,
                relationship.source_entity_id,
                relationship.target_entity_id,
                relationship.relation_type,
                relationship.confidence,
                relationship.evidence,
                relationship.source_url,
                json.dumps(relationship.metadata) if relationship.metadata else None
            ))
            relationship.relationship_id = cursor.lastrowid

        return self.get_relationship(relationship.relationship_id)

    def get_relationship(self, relationship_id: int) -> Optional[EntityRelationship]:
        """Get relationship by ID."""
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT * FROM entity_relationships WHERE relationship_id = ?",
            (relationship_id,)
        )
        row = cursor.fetchone()

        if row is None:
            return None

        data = self._row_to_dict(row)
        return EntityRelationship(**data)

    def get_entity_graph(
        self,
        session_id: str
    ) -> Tuple[List[Entity], List[EntityRelationship]]:
        """Get all entities and relationships for a session."""
        conn = self._get_connection()

        # Get entities
        cursor = conn.execute(
            "SELECT * FROM entities WHERE session_id = ? ORDER BY mention_count DESC",
            (session_id,)
        )

        entities = []
        for row in cursor.fetchall():
            data = self._row_to_dict(row)
            if data['aliases']:
                data['aliases'] = json.loads(data['aliases'])
            entities.append(Entity(**data))

        # Get relationships
        cursor = conn.execute(
            "SELECT * FROM entity_relationships WHERE session_id = ? ORDER BY confidence DESC",
            (session_id,)
        )

        relationships = []
        for row in cursor.fetchall():
            data = self._row_to_dict(row)
            relationships.append(EntityRelationship(**data))

        return entities, relationships

    # ========================================================================
    # Citation Operations
    # ========================================================================

    def add_citation(self, citation: Citation) -> Citation:
        """Add a citation."""
        with self._transaction() as conn:
            cursor = conn.execute("""
                INSERT INTO citations
                (session_id, agent_id, claim, author, publication_date, title,
                 url, page_numbers, quality_rating, url_accessible, complete, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                citation.session_id,
                citation.agent_id,
                citation.claim,
                citation.author,
                citation.publication_date,
                citation.title,
                citation.url,
                citation.page_numbers,
                citation.quality_rating,
                citation.url_accessible,
                citation.complete,
                json.dumps(citation.metadata) if citation.metadata else None
            ))
            citation.citation_id = cursor.lastrowid

        return self.get_citation(citation.citation_id)

    def get_citation(self, citation_id: int) -> Optional[Citation]:
        """Get citation by ID."""
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT * FROM citations WHERE citation_id = ?",
            (citation_id,)
        )
        row = cursor.fetchone()

        if row is None:
            return None

        data = self._row_to_dict(row)
        if data.get('url_accessible') is not None:
            data['url_accessible'] = bool(data['url_accessible'])
        data['complete'] = bool(data['complete'])

        return Citation(**data)

    def update_citation_validation(
        self,
        citation_id: int,
        quality_rating: str,
        url_accessible: bool,
        complete: bool
    ) -> bool:
        """Update citation validation results."""
        with self._transaction() as conn:
            cursor = conn.execute("""
                UPDATE citations
                SET quality_rating = ?, url_accessible = ?, complete = ?,
                    validation_timestamp = CURRENT_TIMESTAMP
                WHERE citation_id = ?
            """, (quality_rating, url_accessible, complete, citation_id))
            return cursor.rowcount > 0

    def get_session_citations(self, session_id: str) -> List[Citation]:
        """Get all citations for a session."""
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT * FROM citations WHERE session_id = ? ORDER BY quality_rating",
            (session_id,)
        )

        citations = []
        for row in cursor.fetchall():
            data = self._row_to_dict(row)
            if data.get('url_accessible') is not None:
                data['url_accessible'] = bool(data['url_accessible'])
            data['complete'] = bool(data['complete'])
            citations.append(Citation(**data))

        return citations

    def get_citation_statistics(self, session_id: str) -> Dict[str, Any]:
        """Get citation statistics for a session."""
        conn = self._get_connection()

        cursor = conn.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN complete = 1 THEN 1 ELSE 0 END) as complete,
                SUM(CASE WHEN url_accessible = 1 THEN 1 ELSE 0 END) as accessible,
                SUM(CASE WHEN quality_rating = 'A' THEN 1 ELSE 0 END) as quality_a,
                SUM(CASE WHEN quality_rating = 'B' THEN 1 ELSE 0 END) as quality_b,
                SUM(CASE WHEN quality_rating = 'C' THEN 1 ELSE 0 END) as quality_c,
                SUM(CASE WHEN quality_rating = 'D' THEN 1 ELSE 0 END) as quality_d,
                SUM(CASE WHEN quality_rating = 'E' THEN 1 ELSE 0 END) as quality_e
            FROM citations
            WHERE session_id = ?
        """, (session_id,))

        row = cursor.fetchone()
        return self._row_to_dict(row)

    # ========================================================================
    # Utility Operations
    # ========================================================================

    def get_session_statistics(self, session_id: str) -> Dict[str, Any]:
        """Get comprehensive statistics for a session."""
        return {
            'session': self.get_session(session_id),
            'agents': self.get_agent_statistics(session_id),
            'got_nodes': len(self.get_session_got_nodes(session_id)),
            'facts': len(self.query_facts(session_id)),
            'entities': len(self.get_entity_graph(session_id)[0]),
            'citations': self.get_citation_statistics(session_id),
            'conflicts': len(self.get_conflicts(session_id, resolved=False))
        }

    def export_session(self, session_id: str) -> Dict[str, Any]:
        """Export complete session data for backup or analysis."""
        entities, relationships = self.get_entity_graph(session_id)

        return {
            'session': asdict(self.get_session(session_id)),
            'agents': [asdict(a) for a in self.get_session_agents(session_id)],
            'got_nodes': [asdict(n) for n in self.get_session_got_nodes(session_id)],
            'got_operations': self.get_got_operations(session_id),
            'facts': [asdict(f) for f in self.query_facts(session_id)],
            'conflicts': self.get_conflicts(session_id),
            'entities': [asdict(e) for e in entities],
            'relationships': [asdict(r) for r in relationships],
            'citations': [asdict(c) for c in self.get_session_citations(session_id)],
            'statistics': self.get_session_statistics(session_id)
        }


# ============================================================================
# Convenience Functions
# ============================================================================

def get_default_state_manager() -> StateManager:
    """Get default StateManager instance."""
    return StateManager()


# ============================================================================
# Example Usage
# ============================================================================

if __name__ == "__main__":
    # Basic functionality test
    sm = StateManager()

    # Create a test session
    session = ResearchSession(
        session_id="test-refactored-001",
        research_topic="Testing Refactored StateManager",
        research_type=ResearchType.DEEP.value,
        status=SessionStatus.INITIALIZING.value
    )

    created_session = sm.create_session(session)
    print(f"✓ Created session: {created_session.session_id}")

    # Retrieve it
    retrieved = sm.get_session("test-refactored-001")
    print(f"✓ Retrieved session: {retrieved.research_topic}")

    # Update status
    sm.update_session_status(
        "test-refactored-001",
        SessionStatus.PLANNING.value
    )
    print("✓ Updated session status")

    # Create a GoT node
    root_node = GoTNode(
        node_id="root-001",
        session_id="test-refactored-001",
        content="Root research question",
        node_type=NodeType.ROOT.value,
        quality_score=8.5
    )
    sm.create_got_node(root_node)
    print("✓ Created GoT node")

    # Register an agent
    agent = ResearchAgent(
        agent_id="agent-001",
        session_id="test-refactored-001",
        agent_type="web-research",
        agent_role="Market data collection",
        status=AgentStatus.RUNNING.value
    )
    sm.register_agent(agent)
    print("✓ Registered agent")

    # Add a fact
    fact = Fact(
        entity="AI Market",
        attribute="Size 2024",
        value="$184B",
        value_type=ValueType.CURRENCY.value,
        confidence=Confidence.HIGH.value,
        session_id="test-refactored-001",
        source_quality=SourceQuality.A.value
    )
    sm.add_fact(fact)
    print("✓ Added fact")

    # Add an entity
    entity = Entity(
        entity_name="OpenAI",
        entity_type="company",
        session_id="test-refactored-001",
        description="AI research company"
    )
    sm.add_entity(entity)
    print("✓ Added entity")

    # Add a citation
    citation = Citation(
        claim="AI market size is $184B in 2024",
        session_id="test-refactored-001",
        author="Gartner",
        publication_date="2024-01",
        url="https://www.gartner.com/example",
        quality_rating=SourceQuality.A.value,
        complete=True
    )
    sm.add_citation(citation)
    print("✓ Added citation")

    # Get statistics
    stats = sm.get_session_statistics("test-refactored-001")
    print(f"\n✓ Session Statistics:")
    print(f"  - Agents: {stats['agents']['total']}")
    print(f"  - GoT Nodes: {stats['got_nodes']}")
    print(f"  - Facts: {stats['facts']}")
    print(f"  - Entities: {stats['entities']}")
    print(f"  - Citations: {stats['citations']['total']}")

    sm.close()
    print("\n✅ StateManager v2.0 test completed successfully!")
