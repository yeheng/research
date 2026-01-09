"""
SimHash Deduplication - Content-based deduplication for research documents.

Uses SimHash algorithm to detect near-duplicate content across different URLs.
Prevents token waste from processing identical content from multiple sources.
"""

import hashlib
import re
from typing import List, Set, Optional, Dict, Any
from collections import defaultdict


class SimHash:
    """SimHash implementation for document similarity detection."""

    def __init__(self, hash_bits: int = 64):
        """Initialize SimHash.

        Args:
            hash_bits: Number of bits in hash (default 64)
        """
        self.hash_bits = hash_bits

    def _tokenize(self, text: str) -> List[str]:
        """Tokenize text into words.

        Args:
            text: Input text

        Returns:
            List of tokens
        """
        # Convert to lowercase and extract words
        text = text.lower()
        tokens = re.findall(r'\w+', text)
        return tokens

    def _hash_token(self, token: str) -> int:
        """Hash a token to integer.

        Args:
            token: Token string

        Returns:
            Hash value as integer
        """
        hash_obj = hashlib.md5(token.encode('utf-8'))
        return int(hash_obj.hexdigest(), 16)

    def compute(self, text: str) -> int:
        """Compute SimHash for text.

        Args:
            text: Input text

        Returns:
            SimHash value as integer
        """
        tokens = self._tokenize(text)
        if not tokens:
            return 0

        # Initialize vector
        v = [0] * self.hash_bits

        # Process each token
        for token in tokens:
            token_hash = self._hash_token(token)

            # Update vector based on hash bits
            for i in range(self.hash_bits):
                if token_hash & (1 << i):
                    v[i] += 1
                else:
                    v[i] -= 1

        # Generate final hash
        fingerprint = 0
        for i in range(self.hash_bits):
            if v[i] > 0:
                fingerprint |= (1 << i)

        return fingerprint

    def hamming_distance(self, hash1: int, hash2: int) -> int:
        """Calculate Hamming distance between two hashes.

        Args:
            hash1: First hash
            hash2: Second hash

        Returns:
            Hamming distance (number of differing bits)
        """
        x = hash1 ^ hash2
        distance = 0
        while x:
            distance += 1
            x &= x - 1
        return distance


class DuplicationDetector:
    """Detect and manage duplicate documents."""

    def __init__(self, threshold: int = 3):
        """Initialize detector.

        Args:
            threshold: Hamming distance threshold for duplicates
        """
        self.threshold = threshold
        self.simhash = SimHash()
        self.fingerprints: Dict[str, int] = {}

    def add_document(self, doc_id: str, text: str) -> bool:
        """Add document and check for duplicates.

        Args:
            doc_id: Document identifier
            text: Document text

        Returns:
            True if document is unique, False if duplicate
        """
        fingerprint = self.simhash.compute(text)

        # Check against existing fingerprints
        for existing_id, existing_fp in self.fingerprints.items():
            distance = self.simhash.hamming_distance(fingerprint, existing_fp)
            if distance <= self.threshold:
                print(f"Duplicate detected: {doc_id} similar to {existing_id}")
                return False

        # Add to collection
        self.fingerprints[doc_id] = fingerprint
        return True
