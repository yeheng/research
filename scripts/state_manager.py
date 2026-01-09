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
        if hasattr(self, '_initialized'):
            return

        self.db_path = db_path or str(Path.cwd() / '.research_state.db')
        self._local = threading.local()
        self._initialize_database()
        self._initialized = True

    @contextmanager
    def _get_connection(self):
        """Get thread-local database connection with automatic commit/rollback."""
        if not hasattr(self._local, 'conn'):
            self._local.conn = sqlite3.connect(
                self.db_path,
                check_same_thread=False,
                timeout=30.0
            )
            self._local.conn.row_factory = sqlite3.Row
            # Enable WAL mode for better concurrent access
            self._local.conn.execute('PRAGMA journal_mode=WAL')
            self._local.conn.execute('PRAGMA synchronous=NORMAL')

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
            conn.execute('''
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
            ''')

            # Agent heartbeats table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS agent_heartbeats (
                    agent_id TEXT PRIMARY KEY,
                    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    current_action TEXT,
                    status TEXT DEFAULT 'active',
                    meta TEXT
                )
            ''')

            # Research sessions table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS research_sessions (
                    session_id TEXT PRIMARY KEY,
                    topic TEXT NOT NULL,
                    status TEXT DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP,
                    meta TEXT
                )
            ''')

            # Create indexes for performance
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_nodes_parent
                ON nodes(parent_id)
            ''')
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_nodes_status
                ON nodes(status)
            ''')
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_nodes_score
                ON nodes(score DESC)
            ''')
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_agent_status
                ON agent_heartbeats(status)
            ''')

    # ==================== Node Management Methods ====================

    def create_node(
        self,
        node_id: str,
        content: str,
        parent_id: Optional[str] = None,
        score: float = 0.0,
        depth: int = 0,
        meta: Optional[Dict[str, Any]] = None
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
                conn.execute('''
                    INSERT INTO nodes (id, parent_id, content, score, depth, meta)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    node_id,
                    parent_id,
                    content,
                    score,
                    depth,
                    json.dumps(meta) if meta else None
                ))
                return True
        except sqlite3.IntegrityError:
            return False

    def update_node(
        self,
        node_id: str,
        content: Optional[str] = None,
        score: Optional[float] = None,
        status: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None
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
            updates.append('content = ?')
            params.append(content)
        if score is not None:
            updates.append('score = ?')
            params.append(score)
        if status is not None:
            updates.append('status = ?')
            params.append(status)
        if meta is not None:
            updates.append('meta = ?')
            params.append(json.dumps(meta))

        if not updates:
            return False

        updates.append('updated_at = CURRENT_TIMESTAMP')
        params.append(node_id)

        with self._get_connection() as conn:
            conn.execute(f'''
                UPDATE nodes
                SET {', '.join(updates)}
                WHERE id = ?
            ''', params)
            return conn.total_changes > 0

    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a node by ID.

        Args:
            node_id: Node identifier

        Returns:
            Node data as dictionary or None if not found
        """
        with self._get_connection() as conn:
            cursor = conn.execute('''
                SELECT * FROM nodes WHERE id = ?
            ''', (node_id,))
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
            cursor = conn.execute('''
                SELECT * FROM nodes
                WHERE parent_id = ?
                ORDER BY score DESC, created_at ASC
            ''', (parent_id,))
            return [self._row_to_dict(row) for row in cursor.fetchall()]

    def get_top_nodes(self, limit: int = 10, min_score: float = 0.0) -> List[Dict[str, Any]]:
        """Get top-scoring nodes.

        Args:
            limit: Maximum number of nodes to return
            min_score: Minimum score threshold

        Returns:
            List of top nodes sorted by score
        """
        with self._get_connection() as conn:
            cursor = conn.execute('''
                SELECT * FROM nodes
                WHERE score >= ?
                ORDER BY score DESC, created_at ASC
                LIMIT ?
            ''', (min_score, limit))
            return [self._row_to_dict(row) for row in cursor.fetchall()]

    def query_nodes(
        self,
        keyword: Optional[str] = None,
        min_score: Optional[float] = None,
        status: Optional[str] = None,
        limit: int = 100
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
            conditions.append('content LIKE ?')
            params.append(f'%{keyword}%')
        if min_score is not None:
            conditions.append('score >= ?')
            params.append(min_score)
        if status:
            conditions.append('status = ?')
            params.append(status)

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)

        with self._get_connection() as conn:
            cursor = conn.execute(f'''
                SELECT * FROM nodes
                {where_clause}
                ORDER BY score DESC, created_at ASC
                LIMIT ?
            ''', params)
            return [self._row_to_dict(row) for row in cursor.fetchall()]

    # ==================== Agent Heartbeat Methods ====================

    def register_agent(self, agent_id: str, meta: Optional[Dict[str, Any]] = None) -> bool:
        """Register a new agent or update existing one.

        Args:
            agent_id: Unique agent identifier
            meta: Agent metadata

        Returns:
            True if successful
        """
        with self._get_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO agent_heartbeats
                (agent_id, last_seen, status, meta)
                VALUES (?, CURRENT_TIMESTAMP, 'active', ?)
            ''', (agent_id, json.dumps(meta) if meta else None))
            return True

    def update_agent_heartbeat(
        self,
        agent_id: str,
        current_action: Optional[str] = None,
        status: Optional[str] = None
    ) -> bool:
        """Update agent heartbeat and status.

        Args:
            agent_id: Agent identifier
            current_action: Current action description
            status: Agent status (active, idle, completed, failed)

        Returns:
            True if successful
        """
        updates = ['last_seen = CURRENT_TIMESTAMP']
        params = []

        if current_action is not None:
            updates.append('current_action = ?')
            params.append(current_action)
        if status is not None:
            updates.append('status = ?')
            params.append(status)

        params.append(agent_id)

        with self._get_connection() as conn:
            conn.execute(f'''
                UPDATE agent_heartbeats
                SET {', '.join(updates)}
                WHERE agent_id = ?
            ''', params)
            return conn.total_changes > 0

    def get_active_agents(self) -> List[Dict[str, Any]]:
        """Get all active agents.

        Returns:
            List of active agent records
        """
        with self._get_connection() as conn:
            cursor = conn.execute('''
                SELECT * FROM agent_heartbeats
                WHERE status = 'active'
                ORDER BY last_seen DESC
            ''')
            return [self._row_to_dict(row) for row in cursor.fetchall()]

    # ==================== Session Management Methods ====================

    def create_session(
        self,
        session_id: str,
        topic: str,
        meta: Optional[Dict[str, Any]] = None
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
                conn.execute('''
                    INSERT INTO research_sessions (session_id, topic, meta)
                    VALUES (?, ?, ?)
                ''', (session_id, topic, json.dumps(meta) if meta else None))
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
            conn.execute('''
                UPDATE research_sessions
                SET status = 'completed', completed_at = CURRENT_TIMESTAMP
                WHERE session_id = ?
            ''', (session_id,))
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
        if 'meta' in result and result['meta']:
            try:
                result['meta'] = json.loads(result['meta'])
            except json.JSONDecodeError:
                result['meta'] = None
        return result

    def prune_low_score_nodes(self, threshold: float = 5.0) -> int:
        """Remove nodes below score threshold (circuit breaking).

        Args:
            threshold: Minimum score to keep

        Returns:
            Number of nodes deleted
        """
        with self._get_connection() as conn:
            cursor = conn.execute('''
                DELETE FROM nodes WHERE score < ?
            ''', (threshold,))
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
                cursor = conn.execute('''
                    SELECT id FROM nodes
                    WHERE parent_id = ?
                    ORDER BY score DESC
                    LIMIT ?
                ''', (parent_id, n))
                keep_ids = [row[0] for row in cursor.fetchall()]

                if not keep_ids:
                    return 0

                placeholders = ','.join('?' * len(keep_ids))
                cursor = conn.execute(f'''
                    DELETE FROM nodes
                    WHERE parent_id = ? AND id NOT IN ({placeholders})
                ''', [parent_id] + keep_ids)
            else:
                # Global pruning
                cursor = conn.execute('''
                    SELECT id FROM nodes
                    ORDER BY score DESC
                    LIMIT ?
                ''', (n,))
                keep_ids = [row[0] for row in cursor.fetchall()]

                if not keep_ids:
                    return 0

                placeholders = ','.join('?' * len(keep_ids))
                cursor = conn.execute(f'''
                    DELETE FROM nodes WHERE id NOT IN ({placeholders})
                ''', keep_ids)

            return cursor.rowcount

    def get_statistics(self) -> Dict[str, Any]:
        """Get overall statistics about the research state.

        Returns:
            Dictionary with statistics
        """
        with self._get_connection() as conn:
            stats = {}

            # Node statistics
            cursor = conn.execute('SELECT COUNT(*) FROM nodes')
            stats['total_nodes'] = cursor.fetchone()[0]

            cursor = conn.execute('SELECT AVG(score) FROM nodes')
            stats['avg_score'] = cursor.fetchone()[0] or 0.0

            cursor = conn.execute('SELECT COUNT(*) FROM nodes WHERE status = "pending"')
            stats['pending_nodes'] = cursor.fetchone()[0]

            cursor = conn.execute('SELECT COUNT(*) FROM nodes WHERE status = "complete"')
            stats['completed_nodes'] = cursor.fetchone()[0]

            # Agent statistics
            cursor = conn.execute('SELECT COUNT(*) FROM agent_heartbeats WHERE status = "active"')
            stats['active_agents'] = cursor.fetchone()[0]

            return stats

    def clear_all(self):
        """Clear all data (use with caution)."""
        with self._get_connection() as conn:
            conn.execute('DELETE FROM nodes')
            conn.execute('DELETE FROM agent_heartbeats')
            conn.execute('DELETE FROM research_sessions')

    def export_graph(self) -> Dict[str, Any]:
        """Export entire graph structure for visualization or backup.

        Returns:
            Dictionary with nodes and edges
        """
        with self._get_connection() as conn:
            cursor = conn.execute('SELECT * FROM nodes ORDER BY created_at')
            nodes = [self._row_to_dict(row) for row in cursor.fetchall()]

            edges = []
            for node in nodes:
                if node['parent_id']:
                    edges.append({
                        'from': node['parent_id'],
                        'to': node['id']
                    })

            return {
                'nodes': nodes,
                'edges': edges
            }
