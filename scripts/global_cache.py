#!/usr/bin/env python3
"""
Global Knowledge Cache - Cross-session knowledge persistence.

Manages a global knowledge base that persists across research sessions,
enabling reuse of previously analyzed content, facts, and entity graphs.

IMPORTANT: This is DIFFERENT from other caching mechanisms:
- MCP Cache (cache-manager.ts): In-memory, single-session deduplication
- StateManager: Session-specific state (per-research database)
- GlobalCache: Cross-session persistent knowledge (shared across all research)

Use cases:
- Avoid re-fetching the same URL across different research topics
- Reuse fact extractions from previously analyzed content
- Build cumulative entity knowledge graph over time

Usage:
    python3 scripts/global_cache.py init                      # Initialize global cache
    python3 scripts/global_cache.py check <url>               # Check if URL is cached
    python3 scripts/global_cache.py get <url>                 # Get cached content
    python3 scripts/global_cache.py store <url> <file>        # Store content in cache
    python3 scripts/global_cache.py facts <entity>            # Query cached facts
    python3 scripts/global_cache.py stats                     # Show cache statistics
    python3 scripts/global_cache.py clean [--max-age DAYS]    # Clean stale entries

Location: ~/.claude/global_knowledge_base/
"""

import argparse
import hashlib
import json
import os
import shutil
import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional


# Default global cache location
DEFAULT_CACHE_DIR = Path.home() / ".claude" / "global_knowledge_base"

# Cache TTL settings (in days)
CACHE_TTL = {
    "static_content": 90,      # Papers, specifications
    "dynamic_content": 7,       # News, blogs
    "market_data": 30,          # Market reports
    "regulatory": 14,           # Regulatory updates
    "default": 30,              # Default TTL
}

# Content type detection patterns
CONTENT_TYPE_PATTERNS = {
    "static_content": [
        "arxiv.org", "doi.org", "ieee.org", "acm.org",
        ".pdf", "specification", "standard", "rfc"
    ],
    "dynamic_content": [
        "news", "blog", "techcrunch", "theverge", "wired",
        "medium.com", "substack"
    ],
    "market_data": [
        "gartner", "forrester", "mckinsey", "statista",
        "grandviewresearch", "marketsandmarkets"
    ],
    "regulatory": [
        ".gov", "regulation", "compliance", "fda", "ema",
        "sec.gov", "ftc.gov"
    ],
}


class GlobalCache:
    """Manages the global knowledge cache."""

    def __init__(self, cache_dir: Optional[Path] = None):
        """Initialize global cache.

        Args:
            cache_dir: Optional custom cache directory
        """
        self.cache_dir = cache_dir or DEFAULT_CACHE_DIR
        self.url_cache_dir = self.cache_dir / "url_cache"
        self.fact_cache_dir = self.cache_dir / "fact_cache"
        self.entity_cache_dir = self.cache_dir / "entity_graph"
        self.vector_store_dir = self.cache_dir / "vector_store"

        self.db_path = self.cache_dir / "global_cache.db"
        self._initialized = False

    def init(self) -> Dict[str, Any]:
        """Initialize the global cache directory structure and database.

        Returns:
            Initialization status
        """
        # Create directories
        for dir_path in [
            self.cache_dir,
            self.url_cache_dir,
            self.fact_cache_dir,
            self.entity_cache_dir,
            self.vector_store_dir,
        ]:
            dir_path.mkdir(parents=True, exist_ok=True)

        # Initialize database
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript("""
                -- URL cache index
                CREATE TABLE IF NOT EXISTS url_cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT UNIQUE NOT NULL,
                    content_hash TEXT NOT NULL,
                    cache_path TEXT NOT NULL,
                    content_type TEXT DEFAULT 'default',
                    title TEXT,
                    first_cached TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_modified TIMESTAMP,
                    access_count INTEGER DEFAULT 1,
                    topics_used TEXT DEFAULT '[]',
                    metadata TEXT DEFAULT '{}'
                );

                -- Fact cache index
                CREATE TABLE IF NOT EXISTS fact_cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entity TEXT NOT NULL,
                    attribute TEXT NOT NULL,
                    value TEXT NOT NULL,
                    value_numeric REAL,
                    source_url TEXT,
                    source_quality TEXT,
                    first_cached TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_verified TIMESTAMP,
                    topics_used TEXT DEFAULT '[]',
                    UNIQUE(entity, attribute, value)
                );

                -- Entity cache index
                CREATE TABLE IF NOT EXISTS entity_cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    entity_type TEXT,
                    description TEXT,
                    aliases TEXT DEFAULT '[]',
                    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    topics_used TEXT DEFAULT '[]'
                );

                -- Relationship cache
                CREATE TABLE IF NOT EXISTS relationship_cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_entity TEXT NOT NULL,
                    target_entity TEXT NOT NULL,
                    relation_type TEXT NOT NULL,
                    confidence REAL DEFAULT 0.5,
                    evidence TEXT,
                    source_url TEXT,
                    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    topics_used TEXT DEFAULT '[]',
                    UNIQUE(source_entity, target_entity, relation_type)
                );

                -- Create indexes
                CREATE INDEX IF NOT EXISTS idx_url_cache_hash ON url_cache(content_hash);
                CREATE INDEX IF NOT EXISTS idx_fact_cache_entity ON fact_cache(entity);
                CREATE INDEX IF NOT EXISTS idx_entity_cache_type ON entity_cache(entity_type);
                CREATE INDEX IF NOT EXISTS idx_relationship_source ON relationship_cache(source_entity);
                CREATE INDEX IF NOT EXISTS idx_relationship_target ON relationship_cache(target_entity);
            """)

        self._initialized = True
        return {
            "status": "success",
            "cache_dir": str(self.cache_dir),
            "db_path": str(self.db_path),
            "directories_created": [
                str(self.url_cache_dir),
                str(self.fact_cache_dir),
                str(self.entity_cache_dir),
                str(self.vector_store_dir),
            ],
        }

    def _ensure_init(self):
        """Ensure cache is initialized."""
        if not self._initialized and not self.db_path.exists():
            self.init()
        self._initialized = True

    def _get_content_type(self, url: str) -> str:
        """Determine content type from URL.

        Args:
            url: URL to analyze

        Returns:
            Content type string
        """
        url_lower = url.lower()
        for content_type, patterns in CONTENT_TYPE_PATTERNS.items():
            for pattern in patterns:
                if pattern in url_lower:
                    return content_type
        return "default"

    def _compute_hash(self, content: str) -> str:
        """Compute SHA256 hash of content.

        Args:
            content: Content to hash

        Returns:
            Hash string
        """
        return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]

    def check_url(self, url: str) -> Dict[str, Any]:
        """Check if a URL is in the cache.

        Args:
            url: URL to check

        Returns:
            Cache status and metadata
        """
        self._ensure_init()

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                """
                SELECT * FROM url_cache WHERE url = ?
                """,
                (url,),
            )
            row = cursor.fetchone()

            if row:
                # Check if cache is stale
                content_type = row["content_type"]
                ttl_days = CACHE_TTL.get(content_type, CACHE_TTL["default"])
                last_accessed = datetime.fromisoformat(row["last_accessed"])
                is_stale = datetime.now() - last_accessed > timedelta(days=ttl_days)

                # Update access count and timestamp
                conn.execute(
                    """
                    UPDATE url_cache
                    SET access_count = access_count + 1,
                        last_accessed = CURRENT_TIMESTAMP
                    WHERE url = ?
                    """,
                    (url,),
                )

                return {
                    "cached": True,
                    "stale": is_stale,
                    "cache_path": row["cache_path"],
                    "content_hash": row["content_hash"],
                    "content_type": content_type,
                    "title": row["title"],
                    "first_cached": row["first_cached"],
                    "last_accessed": row["last_accessed"],
                    "access_count": row["access_count"] + 1,
                    "ttl_days": ttl_days,
                    "topics_used": json.loads(row["topics_used"]),
                }

        return {"cached": False, "url": url}

    def store_url(
        self,
        url: str,
        content: str,
        title: Optional[str] = None,
        topic: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Store URL content in cache.

        Args:
            url: URL being cached
            content: Content to cache
            title: Optional page title
            topic: Optional research topic using this URL
            metadata: Optional additional metadata

        Returns:
            Storage result
        """
        self._ensure_init()

        content_hash = self._compute_hash(content)
        content_type = self._get_content_type(url)

        # Generate cache file path
        cache_filename = f"{content_hash}.md"
        cache_path = self.url_cache_dir / cache_filename

        # Write content to cache file
        with open(cache_path, "w", encoding="utf-8") as f:
            f.write(content)

        # Update database
        topics_used = [topic] if topic else []

        with sqlite3.connect(self.db_path) as conn:
            try:
                conn.execute(
                    """
                    INSERT INTO url_cache (url, content_hash, cache_path, content_type, title, topics_used, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        url,
                        content_hash,
                        str(cache_path),
                        content_type,
                        title,
                        json.dumps(topics_used),
                        json.dumps(metadata or {}),
                    ),
                )
            except sqlite3.IntegrityError:
                # URL already exists, update it
                existing = self.check_url(url)
                existing_topics = existing.get("topics_used", [])
                if topic and topic not in existing_topics:
                    existing_topics.append(topic)

                conn.execute(
                    """
                    UPDATE url_cache
                    SET content_hash = ?,
                        cache_path = ?,
                        title = COALESCE(?, title),
                        topics_used = ?,
                        last_accessed = CURRENT_TIMESTAMP
                    WHERE url = ?
                    """,
                    (
                        content_hash,
                        str(cache_path),
                        title,
                        json.dumps(existing_topics),
                        url,
                    ),
                )

        return {
            "status": "success",
            "url": url,
            "cache_path": str(cache_path),
            "content_hash": content_hash,
            "content_type": content_type,
            "ttl_days": CACHE_TTL.get(content_type, CACHE_TTL["default"]),
        }

    def get_cached_content(self, url: str) -> Optional[str]:
        """Get cached content for a URL.

        Args:
            url: URL to retrieve

        Returns:
            Cached content or None
        """
        cache_info = self.check_url(url)

        if cache_info.get("cached") and not cache_info.get("stale"):
            cache_path = Path(cache_info["cache_path"])
            if cache_path.exists():
                with open(cache_path, "r", encoding="utf-8") as f:
                    return f.read()

        return None

    def store_fact(
        self,
        entity: str,
        attribute: str,
        value: str,
        value_numeric: Optional[float] = None,
        source_url: Optional[str] = None,
        source_quality: Optional[str] = None,
        topic: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Store a fact in the global cache.

        Args:
            entity: Entity name
            attribute: Attribute name
            value: Value string
            value_numeric: Optional numeric value for comparison
            source_url: Source URL
            source_quality: Source quality rating (A-E)
            topic: Research topic

        Returns:
            Storage result
        """
        self._ensure_init()

        topics_used = [topic] if topic else []

        with sqlite3.connect(self.db_path) as conn:
            try:
                conn.execute(
                    """
                    INSERT INTO fact_cache
                    (entity, attribute, value, value_numeric, source_url, source_quality, topics_used)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        entity,
                        attribute,
                        value,
                        value_numeric,
                        source_url,
                        source_quality,
                        json.dumps(topics_used),
                    ),
                )
                fact_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            except sqlite3.IntegrityError:
                # Fact already exists, update topics
                cursor = conn.execute(
                    """
                    SELECT id, topics_used FROM fact_cache
                    WHERE entity = ? AND attribute = ? AND value = ?
                    """,
                    (entity, attribute, value),
                )
                row = cursor.fetchone()
                if row:
                    fact_id = row[0]
                    existing_topics = json.loads(row[1])
                    if topic and topic not in existing_topics:
                        existing_topics.append(topic)
                        conn.execute(
                            """
                            UPDATE fact_cache SET topics_used = ? WHERE id = ?
                            """,
                            (json.dumps(existing_topics), fact_id),
                        )
                else:
                    fact_id = None

        return {
            "status": "success",
            "fact_id": fact_id,
            "entity": entity,
            "attribute": attribute,
            "value": value,
        }

    def query_facts(
        self,
        entity: Optional[str] = None,
        attribute: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Query facts from the global cache.

        Args:
            entity: Filter by entity name
            attribute: Filter by attribute name
            limit: Maximum results

        Returns:
            List of matching facts
        """
        self._ensure_init()

        query = "SELECT * FROM fact_cache WHERE 1=1"
        params = []

        if entity:
            query += " AND entity LIKE ?"
            params.append(f"%{entity}%")

        if attribute:
            query += " AND attribute LIKE ?"
            params.append(f"%{attribute}%")

        query += f" ORDER BY first_cached DESC LIMIT {limit}"

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def store_entity(
        self,
        name: str,
        entity_type: Optional[str] = None,
        description: Optional[str] = None,
        aliases: Optional[List[str]] = None,
        topic: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Store an entity in the global cache.

        Args:
            name: Entity name
            entity_type: Type of entity
            description: Entity description
            aliases: List of aliases
            topic: Research topic

        Returns:
            Storage result
        """
        self._ensure_init()

        topics_used = [topic] if topic else []
        aliases_json = json.dumps(aliases or [])

        with sqlite3.connect(self.db_path) as conn:
            try:
                conn.execute(
                    """
                    INSERT INTO entity_cache (name, entity_type, description, aliases, topics_used)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (name, entity_type, description, aliases_json, json.dumps(topics_used)),
                )
                entity_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            except sqlite3.IntegrityError:
                # Entity exists, update
                cursor = conn.execute(
                    "SELECT id, topics_used, aliases FROM entity_cache WHERE name = ?",
                    (name,),
                )
                row = cursor.fetchone()
                if row:
                    entity_id = row[0]
                    existing_topics = json.loads(row[1])
                    existing_aliases = json.loads(row[2])

                    if topic and topic not in existing_topics:
                        existing_topics.append(topic)

                    for alias in aliases or []:
                        if alias not in existing_aliases:
                            existing_aliases.append(alias)

                    conn.execute(
                        """
                        UPDATE entity_cache
                        SET topics_used = ?,
                            aliases = ?,
                            entity_type = COALESCE(?, entity_type),
                            description = COALESCE(?, description),
                            last_updated = CURRENT_TIMESTAMP
                        WHERE id = ?
                        """,
                        (
                            json.dumps(existing_topics),
                            json.dumps(existing_aliases),
                            entity_type,
                            description,
                            entity_id,
                        ),
                    )
                else:
                    entity_id = None

        return {
            "status": "success",
            "entity_id": entity_id,
            "name": name,
            "entity_type": entity_type,
        }

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics.

        Returns:
            Cache statistics
        """
        self._ensure_init()

        stats = {
            "cache_dir": str(self.cache_dir),
            "db_size_mb": round(self.db_path.stat().st_size / (1024 * 1024), 2) if self.db_path.exists() else 0,
        }

        with sqlite3.connect(self.db_path) as conn:
            # URL cache stats
            cursor = conn.execute("SELECT COUNT(*) FROM url_cache")
            stats["url_cache_count"] = cursor.fetchone()[0]

            cursor = conn.execute("SELECT SUM(access_count) FROM url_cache")
            stats["total_url_accesses"] = cursor.fetchone()[0] or 0

            # Fact cache stats
            cursor = conn.execute("SELECT COUNT(*) FROM fact_cache")
            stats["fact_cache_count"] = cursor.fetchone()[0]

            cursor = conn.execute("SELECT COUNT(DISTINCT entity) FROM fact_cache")
            stats["unique_entities_with_facts"] = cursor.fetchone()[0]

            # Entity cache stats
            cursor = conn.execute("SELECT COUNT(*) FROM entity_cache")
            stats["entity_cache_count"] = cursor.fetchone()[0]

            # Relationship cache stats
            cursor = conn.execute("SELECT COUNT(*) FROM relationship_cache")
            stats["relationship_cache_count"] = cursor.fetchone()[0]

            # Content type distribution
            cursor = conn.execute(
                """
                SELECT content_type, COUNT(*) as count
                FROM url_cache
                GROUP BY content_type
                """
            )
            stats["content_type_distribution"] = {
                row[0]: row[1] for row in cursor.fetchall()
            }

            # Calculate cache directory size
            total_size = 0
            for path in self.url_cache_dir.glob("*"):
                if path.is_file():
                    total_size += path.stat().st_size
            stats["url_cache_size_mb"] = round(total_size / (1024 * 1024), 2)

        return stats

    def clean_stale(self, max_age_days: Optional[int] = None) -> Dict[str, Any]:
        """Clean stale cache entries.

        Args:
            max_age_days: Optional override for max age

        Returns:
            Cleanup results
        """
        self._ensure_init()

        cleaned = {"urls": 0, "files_removed": 0, "bytes_freed": 0}

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row

            # Find stale URLs
            cursor = conn.execute(
                """
                SELECT id, cache_path, content_type, last_accessed
                FROM url_cache
                """
            )

            urls_to_remove = []
            for row in cursor.fetchall():
                content_type = row["content_type"]
                ttl_days = max_age_days or CACHE_TTL.get(content_type, CACHE_TTL["default"])
                last_accessed = datetime.fromisoformat(row["last_accessed"])

                if datetime.now() - last_accessed > timedelta(days=ttl_days):
                    urls_to_remove.append((row["id"], row["cache_path"]))

            # Remove stale entries
            for url_id, cache_path in urls_to_remove:
                cache_file = Path(cache_path)
                if cache_file.exists():
                    cleaned["bytes_freed"] += cache_file.stat().st_size
                    cache_file.unlink()
                    cleaned["files_removed"] += 1

                conn.execute("DELETE FROM url_cache WHERE id = ?", (url_id,))
                cleaned["urls"] += 1

        cleaned["bytes_freed_mb"] = round(cleaned["bytes_freed"] / (1024 * 1024), 2)
        return cleaned


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Global Knowledge Cache - Cross-session knowledge persistence",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Init command
    subparsers.add_parser("init", help="Initialize global cache")

    # Check command
    check_parser = subparsers.add_parser("check", help="Check if URL is cached")
    check_parser.add_argument("url", help="URL to check")

    # Get command
    get_parser = subparsers.add_parser("get", help="Get cached content")
    get_parser.add_argument("url", help="URL to retrieve")

    # Store command
    store_parser = subparsers.add_parser("store", help="Store content in cache")
    store_parser.add_argument("url", help="URL being cached")
    store_parser.add_argument("file", help="File containing content")
    store_parser.add_argument("--title", help="Page title")
    store_parser.add_argument("--topic", help="Research topic")

    # Facts command
    facts_parser = subparsers.add_parser("facts", help="Query cached facts")
    facts_parser.add_argument("entity", nargs="?", help="Entity to query")
    facts_parser.add_argument("--attribute", help="Filter by attribute")
    facts_parser.add_argument("--limit", type=int, default=50, help="Max results")

    # Stats command
    subparsers.add_parser("stats", help="Show cache statistics")

    # Clean command
    clean_parser = subparsers.add_parser("clean", help="Clean stale entries")
    clean_parser.add_argument("--max-age", type=int, help="Max age in days")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    cache = GlobalCache()

    try:
        if args.command == "init":
            result = cache.init()
            print(json.dumps(result, indent=2))

        elif args.command == "check":
            result = cache.check_url(args.url)
            print(json.dumps(result, indent=2))

        elif args.command == "get":
            content = cache.get_cached_content(args.url)
            if content:
                print(content)
            else:
                print(f"URL not in cache or stale: {args.url}", file=sys.stderr)
                sys.exit(1)

        elif args.command == "store":
            with open(args.file, "r", encoding="utf-8") as f:
                content = f.read()
            result = cache.store_url(
                url=args.url,
                content=content,
                title=args.title,
                topic=args.topic,
            )
            print(json.dumps(result, indent=2))

        elif args.command == "facts":
            results = cache.query_facts(
                entity=args.entity,
                attribute=args.attribute,
                limit=args.limit,
            )
            print(json.dumps(results, indent=2))

        elif args.command == "stats":
            result = cache.get_stats()
            print(json.dumps(result, indent=2))

        elif args.command == "clean":
            result = cache.clean_stale(max_age_days=args.max_age)
            print(json.dumps(result, indent=2))

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
