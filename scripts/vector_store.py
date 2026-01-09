#!/usr/bin/env python3
"""
Vector Store for Deep Research Agent - RAG Support

This module provides local vector storage capabilities for the Synthesizer
to query knowledge bases instead of reading entire documents.

Supports:
- ChromaDB (recommended)
- FAISS (fallback)
- Simple in-memory store (minimal dependencies)

Usage:
    # Index a document
    python3 scripts/vector_store.py index RESEARCH/topic/data/processed/document.md

    # Query the knowledge base
    python3 scripts/vector_store.py query "market growth rate" --topic topic_name

    # List indexed documents
    python3 scripts/vector_store.py list --topic topic_name
"""

import sys
import os
import json
import hashlib
import re
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime

# Try to import vector DB libraries
try:
    import chromadb
    from chromadb.config import Settings
    HAS_CHROMA = True
except ImportError:
    HAS_CHROMA = False

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


@dataclass
class DocumentChunk:
    """Represents a chunk of text from a document."""
    id: str
    content: str
    source_file: str
    chunk_index: int
    metadata: Dict
    embedding: Optional[List[float]] = None


class SimpleVectorStore:
    """
    Simple in-memory vector store using TF-IDF-like scoring.
    No external dependencies required.
    """

    def __init__(self, store_path: str):
        self.store_path = Path(store_path)
        self.store_path.mkdir(parents=True, exist_ok=True)
        self.index_file = self.store_path / "index.json"
        self.chunks: List[DocumentChunk] = []
        self.vocab: Dict[str, int] = {}
        self._load()

    def _load(self):
        """Load index from disk."""
        if self.index_file.exists():
            try:
                with open(self.index_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.chunks = [DocumentChunk(**c) for c in data.get('chunks', [])]
                    self.vocab = data.get('vocab', {})
            except Exception:
                self.chunks = []
                self.vocab = {}

    def _save(self):
        """Save index to disk."""
        data = {
            'chunks': [asdict(c) for c in self.chunks],
            'vocab': self.vocab,
            'updated': datetime.now().isoformat()
        }
        with open(self.index_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

    def _tokenize(self, text: str) -> List[str]:
        """Simple tokenization."""
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        tokens = text.split()
        # Remove stopwords
        stopwords = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
                    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
                    'would', 'could', 'should', 'may', 'might', 'must', 'shall',
                    'of', 'to', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
                    'as', 'or', 'and', 'but', 'if', 'then', 'that', 'this'}
        return [t for t in tokens if t not in stopwords and len(t) > 2]

    def _compute_tf(self, tokens: List[str]) -> Dict[str, float]:
        """Compute term frequency."""
        tf = {}
        for token in tokens:
            tf[token] = tf.get(token, 0) + 1
        # Normalize
        max_freq = max(tf.values()) if tf else 1
        return {k: v / max_freq for k, v in tf.items()}

    def _score_relevance(self, query_tokens: List[str], chunk_tokens: List[str]) -> float:
        """Score relevance between query and chunk using TF overlap."""
        query_set = set(query_tokens)
        chunk_tf = self._compute_tf(chunk_tokens)

        score = 0.0
        for token in query_set:
            if token in chunk_tf:
                score += chunk_tf[token]

        # Normalize by query length
        return score / len(query_set) if query_set else 0.0

    def add_document(self, file_path: str, chunk_size: int = 500, overlap: int = 50) -> int:
        """
        Add a document to the vector store.

        Args:
            file_path: Path to the document
            chunk_size: Number of words per chunk
            overlap: Number of words to overlap between chunks

        Returns:
            Number of chunks added
        """
        file_path = Path(file_path).resolve()

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        # Read document
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        # Extract YAML frontmatter if present
        metadata = {}
        if content.startswith('---'):
            try:
                end_idx = content.index('---', 3)
                frontmatter = content[3:end_idx]
                content = content[end_idx + 3:]
                for line in frontmatter.strip().split('\n'):
                    if ':' in line:
                        key, value = line.split(':', 1)
                        metadata[key.strip()] = value.strip()
            except ValueError:
                pass

        # Remove existing chunks from this file
        self.chunks = [c for c in self.chunks if c.source_file != str(file_path)]

        # Split into chunks
        words = content.split()
        chunks_added = 0

        for i in range(0, len(words), chunk_size - overlap):
            chunk_words = words[i:i + chunk_size]
            if len(chunk_words) < 50:  # Skip very small chunks
                continue

            chunk_text = ' '.join(chunk_words)
            chunk_id = hashlib.md5(f"{file_path}:{i}".encode()).hexdigest()[:12]

            chunk = DocumentChunk(
                id=chunk_id,
                content=chunk_text,
                source_file=str(file_path),
                chunk_index=chunks_added,
                metadata=metadata
            )

            self.chunks.append(chunk)
            chunks_added += 1

            # Update vocabulary
            tokens = self._tokenize(chunk_text)
            for token in tokens:
                self.vocab[token] = self.vocab.get(token, 0) + 1

        self._save()
        return chunks_added

    def query(self, query: str, top_k: int = 5) -> List[Tuple[DocumentChunk, float]]:
        """
        Query the vector store.

        Args:
            query: Search query
            top_k: Number of results to return

        Returns:
            List of (chunk, score) tuples
        """
        query_tokens = self._tokenize(query)

        results = []
        for chunk in self.chunks:
            chunk_tokens = self._tokenize(chunk.content)
            score = self._score_relevance(query_tokens, chunk_tokens)
            if score > 0:
                results.append((chunk, score))

        # Sort by score descending
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

    def list_documents(self) -> List[Dict]:
        """List all indexed documents."""
        docs = {}
        for chunk in self.chunks:
            if chunk.source_file not in docs:
                docs[chunk.source_file] = {
                    'path': chunk.source_file,
                    'chunks': 0,
                    'metadata': chunk.metadata
                }
            docs[chunk.source_file]['chunks'] += 1
        return list(docs.values())

    def delete_document(self, file_path: str) -> int:
        """Remove a document from the store."""
        file_path = str(Path(file_path).resolve())
        original_count = len(self.chunks)
        self.chunks = [c for c in self.chunks if c.source_file != file_path]
        removed = original_count - len(self.chunks)
        if removed > 0:
            self._save()
        return removed


class ChromaVectorStore:
    """
    ChromaDB-based vector store with proper embeddings.
    Requires: pip install chromadb
    """

    def __init__(self, store_path: str, collection_name: str = "research"):
        if not HAS_CHROMA:
            raise ImportError("ChromaDB not installed. Run: pip install chromadb")

        self.store_path = Path(store_path)
        self.store_path.mkdir(parents=True, exist_ok=True)

        self.client = chromadb.PersistentClient(
            path=str(self.store_path),
            settings=Settings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )

    def add_document(self, file_path: str, chunk_size: int = 500, overlap: int = 50) -> int:
        """Add document to ChromaDB."""
        file_path = Path(file_path).resolve()

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        # Extract metadata
        metadata = {"source": str(file_path)}
        if content.startswith('---'):
            try:
                end_idx = content.index('---', 3)
                frontmatter = content[3:end_idx]
                content = content[end_idx + 3:]
                for line in frontmatter.strip().split('\n'):
                    if ':' in line:
                        key, value = line.split(':', 1)
                        metadata[key.strip()] = value.strip()
            except ValueError:
                pass

        # Delete existing chunks
        try:
            existing = self.collection.get(where={"source": str(file_path)})
            if existing['ids']:
                self.collection.delete(ids=existing['ids'])
        except Exception:
            pass

        # Chunk and add
        words = content.split()
        chunks_added = 0
        ids, documents, metadatas = [], [], []

        for i in range(0, len(words), chunk_size - overlap):
            chunk_words = words[i:i + chunk_size]
            if len(chunk_words) < 50:
                continue

            chunk_text = ' '.join(chunk_words)
            chunk_id = hashlib.md5(f"{file_path}:{i}".encode()).hexdigest()[:12]

            ids.append(chunk_id)
            documents.append(chunk_text)
            metadatas.append({**metadata, "chunk_index": chunks_added})
            chunks_added += 1

        if ids:
            self.collection.add(ids=ids, documents=documents, metadatas=metadatas)

        return chunks_added

    def query(self, query: str, top_k: int = 5) -> List[Dict]:
        """Query ChromaDB."""
        results = self.collection.query(query_texts=[query], n_results=top_k)

        output = []
        for i, doc_id in enumerate(results['ids'][0]):
            output.append({
                'id': doc_id,
                'content': results['documents'][0][i],
                'metadata': results['metadatas'][0][i],
                'distance': results['distances'][0][i] if 'distances' in results else None
            })
        return output

    def list_documents(self) -> List[Dict]:
        """List indexed documents."""
        all_data = self.collection.get()
        docs = {}
        for i, meta in enumerate(all_data['metadatas']):
            source = meta.get('source', 'unknown')
            if source not in docs:
                docs[source] = {'path': source, 'chunks': 0, 'metadata': meta}
            docs[source]['chunks'] += 1
        return list(docs.values())


def get_store(topic: str, use_chroma: bool = True) -> object:
    """Get appropriate vector store for a topic."""
    base_path = Path(f"RESEARCH/{topic}/knowledge_store")

    if use_chroma and HAS_CHROMA:
        return ChromaVectorStore(str(base_path), collection_name=topic)
    else:
        return SimpleVectorStore(str(base_path))


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python3 vector_store.py <command> [args]",
            "commands": ["index <file>", "query <text> --topic <name>", "list --topic <name>"],
            "status": "failed"
        }))
        sys.exit(1)

    command = sys.argv[1]

    # Parse --topic argument
    topic = "default"
    args = sys.argv[2:]
    if "--topic" in args:
        idx = args.index("--topic")
        if idx + 1 < len(args):
            topic = args[idx + 1]
            args = args[:idx] + args[idx + 2:]

    store = get_store(topic, use_chroma=HAS_CHROMA)

    if command == "index":
        if not args:
            print(json.dumps({"error": "Missing file path", "status": "failed"}))
            sys.exit(1)
        file_path = args[0]
        try:
            chunks = store.add_document(file_path)
            print(json.dumps({
                "status": "success",
                "file": file_path,
                "chunks_indexed": chunks,
                "store_type": "chroma" if HAS_CHROMA else "simple"
            }))
        except Exception as e:
            print(json.dumps({"error": str(e), "status": "failed"}))

    elif command == "query":
        if not args:
            print(json.dumps({"error": "Missing query text", "status": "failed"}))
            sys.exit(1)
        query_text = ' '.join(args)
        results = store.query(query_text, top_k=5)

        if isinstance(store, SimpleVectorStore):
            output = [{
                'id': r[0].id,
                'content': r[0].content[:500] + '...' if len(r[0].content) > 500 else r[0].content,
                'source': r[0].source_file,
                'score': round(r[1], 4)
            } for r in results]
        else:
            output = results

        print(json.dumps({"status": "success", "results": output}, indent=2))

    elif command == "list":
        docs = store.list_documents()
        print(json.dumps({"status": "success", "documents": docs}, indent=2))

    else:
        print(json.dumps({"error": f"Unknown command: {command}", "status": "failed"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
