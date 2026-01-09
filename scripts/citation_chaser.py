"""
Citation Chaser - Recursive reference tracking for deep research.

Automatically extracts and chases citations from high-quality sources to find
primary sources and related research. Integrates with research agents to
expand the research frontier.
"""

import re
import requests
from typing import List, Dict, Any, Optional, Set
from pathlib import Path
import json


class CitationChaser:
    """Extract and chase citations from research documents."""

    def __init__(self, similarity_threshold: float = 0.7):
        """Initialize citation chaser.

        Args:
            similarity_threshold: Minimum similarity score for citation relevance
        """
        self.similarity_threshold = similarity_threshold
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Research Bot) DeepResearch/1.0'
        })

    def extract_references(self, text: str) -> List[Dict[str, str]]:
        """Extract references from document text.

        Args:
            text: Document text content

        Returns:
            List of reference dictionaries
        """
        references = []

        # Pattern 1: Numbered references [1], [2], etc.
        numbered_pattern = r'\[(\d+)\]\s*(.+?)(?=\[\d+\]|$)'

        # Pattern 2: Author-year citations (Smith, 2024)
        author_year_pattern = r'([A-Z][a-z]+(?:\s+et\s+al\.)?),?\s+\((\d{4})\)'

        # Pattern 3: DOI patterns
        doi_pattern = r'(?:doi:|DOI:)\s*(10\.\d{4,}/[^\s]+)'

        # Pattern 4: URL patterns in references
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'

        # Extract numbered references
        matches = re.finditer(numbered_pattern, text, re.MULTILINE | re.DOTALL)
        for match in matches:
            ref_num = match.group(1)
            ref_text = match.group(2).strip()

            # Extract DOI if present
            doi_match = re.search(doi_pattern, ref_text)
            doi = doi_match.group(1) if doi_match else None

            # Extract URL if present
            url_match = re.search(url_pattern, ref_text)
            url = url_match.group(0) if url_match else None

            references.append({
                'number': ref_num,
                'text': ref_text,
                'doi': doi,
                'url': url,
                'type': 'numbered'
            })

        return references

    def extract_title_from_reference(self, ref_text: str) -> Optional[str]:
        """Extract title from reference text.

        Args:
            ref_text: Reference text

        Returns:
            Extracted title or None
        """
        # Common patterns for titles in references
        # Pattern 1: Title in quotes
        quote_pattern = r'"([^"]+)"'
        match = re.search(quote_pattern, ref_text)
        if match:
            return match.group(1)

        # Pattern 2: Title after author and year
        # Example: Smith, J. (2024). Title of Paper. Journal Name.
        title_pattern = r'\(\d{4}\)\.\s*([^.]+)\.'
        match = re.search(title_pattern, ref_text)
        if match:
            return match.group(1).strip()

        return None

    def calculate_relevance(self, title: str, research_topic: str) -> float:
        """Calculate relevance score between title and research topic.

        Args:
            title: Citation title
            research_topic: Current research topic

        Returns:
            Relevance score (0-1)
        """
        # Simple keyword-based relevance (can be enhanced with embeddings)
        title_lower = title.lower()
        topic_lower = research_topic.lower()

        # Extract keywords from topic
        topic_words = set(re.findall(r'\w+', topic_lower))
        title_words = set(re.findall(r'\w+', title_lower))

        # Calculate Jaccard similarity
        if not topic_words or not title_words:
            return 0.0

        intersection = topic_words & title_words
        union = topic_words | title_words

        return len(intersection) / len(union) if union else 0.0

    def chase_citations(
        self,
        document_text: str,
        research_topic: str,
        max_citations: int = 10
    ) -> List[Dict[str, Any]]:
        """Chase citations from document and rank by relevance.

        Args:
            document_text: Source document text
            research_topic: Current research topic
            max_citations: Maximum citations to return

        Returns:
            List of relevant citations with metadata
        """
        references = self.extract_references(document_text)
        relevant_citations = []

        for ref in references:
            title = self.extract_title_from_reference(ref['text'])
            if not title:
                continue

            relevance = self.calculate_relevance(title, research_topic)

            if relevance >= self.similarity_threshold:
                relevant_citations.append({
                    'title': title,
                    'reference_text': ref['text'],
                    'doi': ref.get('doi'),
                    'url': ref.get('url'),
                    'relevance_score': relevance
                })

        # Sort by relevance and return top N
        relevant_citations.sort(key=lambda x: x['relevance_score'], reverse=True)
        return relevant_citations[:max_citations]
