#!/usr/bin/env python3
"""
URL Manifest Manager for Deep Research Agent

Manages a global URL cache to prevent duplicate downloads across parallel agents.
Each agent must check the manifest before fetching a URL.

Usage:
    # Check if URL exists
    python3 scripts/url_manifest.py check "https://example.com/article" --topic my_topic

    # Register a new URL
    python3 scripts/url_manifest.py register "https://example.com/article" --topic my_topic --local data/raw/article.html

    # List all cached URLs
    python3 scripts/url_manifest.py list --topic my_topic
"""

import sys
import os
import json
import hashlib
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse
from typing import Optional, Dict, List


class URLManifest:
    """Manages URL to local file mappings."""

    def __init__(self, topic: str):
        self.topic = topic
        self.manifest_path = Path(f"RESEARCH/{topic}/url_manifest.json")
        self.manifest_path.parent.mkdir(parents=True, exist_ok=True)
        self.data = self._load()

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
        Check if URL is already cached.

        Returns:
            Dict with local_path and metadata if exists, None otherwise
        """
        normalized = self._normalize_url(url)
        return self.data["urls"].get(normalized)

    def register(self, url: str, local_path: str, metadata: Optional[Dict] = None) -> Dict:
        """
        Register a URL with its local file path.

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
            "metadata": metadata or {}
        }

        # Check if processed version exists
        raw_path = Path(local_path)
        if "raw" in str(raw_path):
            processed_path = str(raw_path).replace("/raw/", "/processed/").replace(".html", "_cleaned.md")
            if Path(processed_path).exists():
                entry["local_processed"] = processed_path

        self.data["urls"][normalized] = entry
        self._save()
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
        """Get manifest statistics."""
        urls = self.data["urls"]
        processed_count = sum(1 for u in urls.values() if u.get("local_processed"))
        return {
            "total_urls": len(urls),
            "processed_count": processed_count,
            "unprocessed_count": len(urls) - processed_count,
            "created": self.data.get("created"),
            "updated": self.data.get("updated")
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
                "stats --topic <name>"
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
        }))

    else:
        print(json.dumps({"error": f"Unknown command: {command}", "status": "failed"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
