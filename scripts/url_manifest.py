#!/usr/bin/env python3
"""
URL Manifest Manager for Deep Research Agent

Manages a global URL cache to prevent duplicate downloads across parallel agents.
Each agent must check the manifest before fetching a URL.

Now integrates with global_cache.py for cross-session persistence.

Usage:
    # Check if URL exists (checks both local and global cache)
    python3 scripts/url_manifest.py check "https://example.com/article" --topic my_topic

    # Register a new URL (stores in both local manifest and global cache)
    python3 scripts/url_manifest.py register "https://example.com/article" --topic my_topic --local data/raw/article.html

    # List all cached URLs
    python3 scripts/url_manifest.py list --topic my_topic

    # Sync local manifest with global cache
    python3 scripts/url_manifest.py sync --topic my_topic
"""

import sys
import os
import json
import hashlib
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse
from typing import Optional, Dict, List

# Try to import global cache
try:
    from global_cache import GlobalCache
    HAS_GLOBAL_CACHE = True
except ImportError:
    try:
        from scripts.global_cache import GlobalCache
        HAS_GLOBAL_CACHE = True
    except ImportError:
        HAS_GLOBAL_CACHE = False


class URLManifest:
    """Manages URL to local file mappings with global cache integration."""

    def __init__(self, topic: str, use_global_cache: bool = True):
        self.topic = topic
        self.manifest_path = Path(f"RESEARCH/{topic}/url_manifest.json")
        self.manifest_path.parent.mkdir(parents=True, exist_ok=True)
        self.data = self._load()

        # Initialize global cache if available
        self.global_cache = None
        if use_global_cache and HAS_GLOBAL_CACHE:
            try:
                self.global_cache = GlobalCache()
                self.global_cache._ensure_init()
            except Exception:
                self.global_cache = None

    def _load(self) -> Dict:
        """Load manifest from disk."""
        if self.manifest_path.exists():
            try:
                with open(self.manifest_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass
        return {"urls": {}, "created": datetime.now().isoformat()}

    def _save(self):
        """Save manifest to disk."""
        self.data["updated"] = datetime.now().isoformat()
        with open(self.manifest_path, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=2)

    def _normalize_url(self, url: str) -> str:
        """Normalize URL for consistent lookups."""
        parsed = urlparse(url)
        # Remove trailing slashes, fragments, normalize scheme
        normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/')}"
        if parsed.query:
            normalized += f"?{parsed.query}"
        return normalized.lower()

    def _url_hash(self, url: str) -> str:
        """Generate a short hash for URL."""
        return hashlib.md5(self._normalize_url(url).encode()).hexdigest()[:12]

    def check(self, url: str) -> Optional[Dict]:
        """
        Check if URL is already cached (local manifest + global cache).

        Returns:
            Dict with local_path and metadata if exists, None otherwise
        """
        normalized = self._normalize_url(url)

        # First check local manifest
        local_result = self.data["urls"].get(normalized)
        if local_result:
            return {**local_result, "source": "local"}

        # Then check global cache
        if self.global_cache:
            global_result = self.global_cache.check_url(url)
            if global_result.get("cached") and not global_result.get("stale"):
                # Found in global cache, add source info
                return {
                    "url": url,
                    "normalized": normalized,
                    "local_raw": None,
                    "local_processed": global_result.get("cache_path"),
                    "hash": global_result.get("content_hash"),
                    "registered": global_result.get("first_cached"),
                    "metadata": {
                        "title": global_result.get("title"),
                        "content_type": global_result.get("content_type"),
                        "access_count": global_result.get("access_count"),
                    },
                    "source": "global_cache",
                    "global_cache_path": global_result.get("cache_path"),
                }

        return None

    def register(self, url: str, local_path: str, metadata: Optional[Dict] = None) -> Dict:
        """
        Register a URL with its local file path.
        Also stores in global cache for cross-session persistence.

        Args:
            url: The source URL
            local_path: Path to local file (raw or processed)
            metadata: Optional metadata (title, fetch_time, etc.)

        Returns:
            The registered entry
        """
        normalized = self._normalize_url(url)

        entry = {
            "url": url,
            "normalized": normalized,
            "local_raw": local_path,
            "local_processed": None,
            "hash": self._url_hash(url),
            "registered": datetime.now().isoformat(),
            "metadata": metadata or {},
            "topics_used": [self.topic],
        }

        # Check if processed version exists
        raw_path = Path(local_path)
        if "raw" in str(raw_path):
            processed_path = str(raw_path).replace("/raw/", "/processed/").replace(".html", "_cleaned.md")
            if Path(processed_path).exists():
                entry["local_processed"] = processed_path

        self.data["urls"][normalized] = entry
        self._save()

        # Also store in global cache if available
        if self.global_cache and raw_path.exists():
            try:
                with open(raw_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                self.global_cache.store_url(
                    url=url,
                    content=content,
                    title=metadata.get("title") if metadata else None,
                    topic=self.topic,
                    metadata=metadata,
                )
                entry["global_cache_stored"] = True
            except Exception as e:
                entry["global_cache_error"] = str(e)

        return entry

    def update_processed(self, url: str, processed_path: str) -> Optional[Dict]:
        """Update the processed file path for a URL."""
        normalized = self._normalize_url(url)
        if normalized in self.data["urls"]:
            self.data["urls"][normalized]["local_processed"] = processed_path
            self._save()
            return self.data["urls"][normalized]
        return None

    def list_urls(self) -> List[Dict]:
        """List all registered URLs."""
        return list(self.data["urls"].values())

    def get_stats(self) -> Dict:
        """Get manifest statistics including global cache info."""
        urls = self.data["urls"]
        processed_count = sum(1 for u in urls.values() if u.get("local_processed"))
        stats = {
            "topic": self.topic,
            "local_manifest": {
                "total_urls": len(urls),
                "processed_count": processed_count,
                "unprocessed_count": len(urls) - processed_count,
                "created": self.data.get("created"),
                "updated": self.data.get("updated"),
            },
            "global_cache_available": self.global_cache is not None,
        }

        # Add global cache stats if available
        if self.global_cache:
            try:
                global_stats = self.global_cache.get_stats()
                stats["global_cache"] = global_stats
            except Exception as e:
                stats["global_cache_error"] = str(e)

        return stats

    def sync_to_global(self) -> Dict:
        """Sync local manifest entries to global cache."""
        if not self.global_cache:
            return {"status": "skipped", "reason": "Global cache not available"}

        synced = 0
        errors = []

        for normalized, entry in self.data["urls"].items():
            try:
                local_path = entry.get("local_raw")
                if local_path and Path(local_path).exists():
                    with open(local_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()

                    self.global_cache.store_url(
                        url=entry["url"],
                        content=content,
                        title=entry.get("metadata", {}).get("title"),
                        topic=self.topic,
                        metadata=entry.get("metadata"),
                    )
                    synced += 1
            except Exception as e:
                errors.append({"url": entry["url"], "error": str(e)})

        return {
            "status": "success",
            "synced": synced,
            "total": len(self.data["urls"]),
            "errors": errors,
        }

    def remove(self, url: str) -> bool:
        """Remove a URL from the manifest."""
        normalized = self._normalize_url(url)
        if normalized in self.data["urls"]:
            del self.data["urls"][normalized]
            self._save()
            return True
        return False


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python3 url_manifest.py <command> [args]",
            "commands": [
                "check <url> --topic <name>",
                "register <url> --topic <name> --local <path>",
                "list --topic <name>",
                "stats --topic <name>",
                "sync --topic <name>"
            ],
            "status": "failed"
        }))
        sys.exit(1)

    command = sys.argv[1]

    # Parse arguments
    args = sys.argv[2:]
    topic = "default"
    local_path = None
    url = None

    i = 0
    positional = []
    while i < len(args):
        if args[i] == "--topic" and i + 1 < len(args):
            topic = args[i + 1]
            i += 2
        elif args[i] == "--local" and i + 1 < len(args):
            local_path = args[i + 1]
            i += 2
        else:
            positional.append(args[i])
            i += 1

    if positional:
        url = positional[0]

    manifest = URLManifest(topic)

    if command == "check":
        if not url:
            print(json.dumps({"error": "Missing URL", "status": "failed"}))
            sys.exit(1)

        result = manifest.check(url)
        if result:
            print(json.dumps({
                "status": "found",
                "cached": True,
                "entry": result,
                "message": f"URL already cached. Use local file: {result.get('local_processed') or result.get('local_raw')}"
            }))
        else:
            print(json.dumps({
                "status": "not_found",
                "cached": False,
                "message": "URL not in cache. Safe to fetch."
            }))

    elif command == "register":
        if not url:
            print(json.dumps({"error": "Missing URL", "status": "failed"}))
            sys.exit(1)
        if not local_path:
            print(json.dumps({"error": "Missing --local path", "status": "failed"}))
            sys.exit(1)

        entry = manifest.register(url, local_path)
        print(json.dumps({
            "status": "success",
            "registered": True,
            "entry": entry
        }))

    elif command == "list":
        urls = manifest.list_urls()
        print(json.dumps({
            "status": "success",
            "count": len(urls),
            "urls": urls
        }, indent=2))

    elif command == "stats":
        stats = manifest.get_stats()
        print(json.dumps({
            "status": "success",
            "stats": stats
        }, indent=2))

    elif command == "sync":
        result = manifest.sync_to_global()
        print(json.dumps({
            "status": "success",
            "sync_result": result
        }, indent=2))

    else:
        print(json.dumps({"error": f"Unknown command: {command}", "status": "failed"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
