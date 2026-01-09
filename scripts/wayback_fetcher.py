"""
Wayback Machine Fetcher - Dead link defense with Internet Archive integration.

Automatically falls back to archived versions when URLs are unavailable.
Integrates with preprocess_document.py to handle 404/403/timeout errors.
"""

import requests
import json
from typing import Optional, Dict, Any
from datetime import datetime
import time


class WaybackFetcher:
    """Fetch archived versions of URLs from Internet Archive."""

    WAYBACK_API = "https://archive.org/wayback/available"
    WAYBACK_CDX_API = "https://web.archive.org/cdx/search/cdx"

    def __init__(self, timeout: int = 10):
        """Initialize Wayback fetcher.

        Args:
            timeout: Request timeout in seconds
        """
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Research Bot) DeepResearch/1.0'
        })

    def check_availability(self, url: str) -> Optional[Dict[str, Any]]:
        """Check if archived version exists for URL.

        Args:
            url: Target URL to check

        Returns:
            Dictionary with archive info or None if not available
        """
        try:
            response = self.session.get(
                self.WAYBACK_API,
                params={'url': url},
                timeout=self.timeout
            )
            response.raise_for_status()

            data = response.json()

            if 'archived_snapshots' in data and 'closest' in data['archived_snapshots']:
                snapshot = data['archived_snapshots']['closest']
                if snapshot.get('available'):
                    return {
                        'available': True,
                        'url': snapshot['url'],
                        'timestamp': snapshot['timestamp'],
                        'status': snapshot.get('status', 'unknown')
                    }

            return None

        except Exception as e:
            print(f"Error checking Wayback availability: {e}")
            return None

    def fetch_archived_content(self, url: str) -> Optional[str]:
        """Fetch content from archived version of URL.

        Args:
            url: Target URL to fetch

        Returns:
            Archived content as string or None if unavailable
        """
        archive_info = self.check_availability(url)

        if not archive_info:
            return None

        try:
            archived_url = archive_info['url']
            response = self.session.get(archived_url, timeout=self.timeout)
            response.raise_for_status()
            return response.text

        except Exception as e:
            print(f"Error fetching archived content: {e}")
            return None

    def get_snapshot_list(self, url: str, limit: int = 10) -> list:
        """Get list of available snapshots for URL.

        Args:
            url: Target URL
            limit: Maximum number of snapshots to return

        Returns:
            List of snapshot dictionaries
        """
        try:
            response = self.session.get(
                self.WAYBACK_CDX_API,
                params={
                    'url': url,
                    'output': 'json',
                    'limit': limit
                },
                timeout=self.timeout
            )
            response.raise_for_status()

            data = response.json()
            if len(data) > 1:
                # First row is headers
                headers = data[0]
                snapshots = []
                for row in data[1:]:
                    snapshot = dict(zip(headers, row))
                    snapshots.append(snapshot)
                return snapshots

            return []

        except Exception as e:
            print(f"Error getting snapshot list: {e}")
            return []

    def format_archived_citation(self, url: str, archive_info: Dict[str, Any]) -> str:
        """Format citation with archived version note.

        Args:
            url: Original URL
            archive_info: Archive information dictionary

        Returns:
            Formatted citation string
        """
        timestamp = archive_info.get('timestamp', '')
        archived_url = archive_info.get('url', '')

        # Parse timestamp (format: YYYYMMDDhhmmss)
        if len(timestamp) >= 8:
            year = timestamp[:4]
            month = timestamp[4:6]
            day = timestamp[6:8]
            date_str = f"{year}-{month}-{day}"
        else:
            date_str = "unknown date"

        return f"{url} (Archived version from {date_str}: {archived_url})"


def fetch_with_fallback(url: str, timeout: int = 10) -> Dict[str, Any]:
    """Fetch URL with automatic fallback to Wayback Machine.

    Args:
        url: Target URL to fetch
        timeout: Request timeout in seconds

    Returns:
        Dictionary with status, content, and metadata
    """
    result = {
        'success': False,
        'content': None,
        'source': 'original',
        'url': url,
        'archived_url': None,
        'error': None
    }

    # Try original URL first
    try:
        response = requests.get(url, timeout=timeout, headers={
            'User-Agent': 'Mozilla/5.0 (Research Bot) DeepResearch/1.0'
        })
        response.raise_for_status()
        result['success'] = True
        result['content'] = response.text
        return result

    except requests.exceptions.RequestException as e:
        result['error'] = str(e)
        print(f"Failed to fetch {url}: {e}")

    # Fallback to Wayback Machine
    print(f"Attempting Wayback Machine fallback for {url}...")
    wayback = WaybackFetcher(timeout=timeout)
    archive_info = wayback.check_availability(url)

    if archive_info:
        content = wayback.fetch_archived_content(url)
        if content:
            result['success'] = True
            result['content'] = content
            result['source'] = 'wayback'
            result['archived_url'] = archive_info['url']
            result['citation'] = wayback.format_archived_citation(url, archive_info)
            print(f"Successfully retrieved archived version from {archive_info['timestamp']}")
        else:
            result['error'] = "Archive found but failed to fetch content"
    else:
        result['error'] = "No archived version available"

    return result
