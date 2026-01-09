#!/usr/bin/env python3
"""
Document Preprocessing Script for Deep Research Agent

This script cleans and processes raw HTML/PDF documents to reduce token consumption
by removing ads, navigation, styles, and other non-essential content.

Usage:
    python3 scripts/preprocess_document.py <input_file>

Example:
    python3 scripts/preprocess_document.py RESEARCH/topic/data/raw/source.html

Output:
    Cleaned markdown file in RESEARCH/topic/data/processed/
    JSON status with token savings
"""

import sys
import os
import json
import re
from pathlib import Path

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False


def clean_html(raw_html: str) -> str:
    """Remove scripts, styles, navigation, keeping only core text content."""
    if not HAS_BS4:
        # Fallback: basic regex cleaning if BeautifulSoup not available
        text = re.sub(r'<script[^>]*>.*?</script>', '', raw_html, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<nav[^>]*>.*?</nav>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<footer[^>]*>.*?</footer>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<header[^>]*>.*?</header>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<aside[^>]*>.*?</aside>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    soup = BeautifulSoup(raw_html, 'html.parser')

    # Remove interference elements
    tags_to_remove = [
        "script", "style", "nav", "footer", "header",
        "aside", "iframe", "noscript", "form", "button",
        "input", "select", "textarea", "svg", "canvas",
        "advertisement", "ad", "banner", "popup", "modal"
    ]

    for tag in soup(tags_to_remove):
        tag.extract()

    # Remove elements by common ad/nav class names
    ad_patterns = [
        'ad', 'ads', 'advertisement', 'banner', 'sidebar',
        'nav', 'navigation', 'menu', 'footer', 'header',
        'popup', 'modal', 'overlay', 'cookie', 'newsletter',
        'social', 'share', 'comment', 'related', 'recommended'
    ]

    for pattern in ad_patterns:
        for element in soup.find_all(class_=re.compile(pattern, re.I)):
            element.extract()
        for element in soup.find_all(id=re.compile(pattern, re.I)):
            element.extract()

    # Extract text with newlines
    text = soup.get_text(separator='\n')

    # Clean whitespace
    lines = (line.strip() for line in text.splitlines())
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    text = '\n'.join(chunk for chunk in chunks if chunk)

    # Remove excessive newlines
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text


def extract_metadata(soup_or_text, doc_type: str) -> dict:
    """Extract metadata from document."""
    metadata = {
        "title": "",
        "description": "",
        "author": "",
        "date": ""
    }

    if HAS_BS4 and doc_type == "html":
        try:
            soup = BeautifulSoup(soup_or_text, 'html.parser') if isinstance(soup_or_text, str) else soup_or_text

            # Title
            title_tag = soup.find('title')
            if title_tag:
                metadata["title"] = title_tag.get_text().strip()

            # Meta description
            desc_meta = soup.find('meta', attrs={'name': 'description'})
            if desc_meta:
                metadata["description"] = desc_meta.get('content', '')

            # Author
            author_meta = soup.find('meta', attrs={'name': 'author'})
            if author_meta:
                metadata["author"] = author_meta.get('content', '')

            # Date
            date_meta = soup.find('meta', attrs={'name': re.compile(r'date|published', re.I)})
            if date_meta:
                metadata["date"] = date_meta.get('content', '')
        except Exception:
            pass

    return metadata


def estimate_tokens(text: str) -> int:
    """Estimate token count (rough approximation: 1 token ~ 4 characters for English)."""
    return len(text) // 4


def process_file(input_path: str) -> dict:
    """Process a single file and return status."""
    input_path = Path(input_path).resolve()

    if not input_path.exists():
        return {"error": f"File not found: {input_path}", "status": "failed"}

    # Determine output path
    # Expected structure: RESEARCH/topic/data/raw/file.html -> RESEARCH/topic/data/processed/file_cleaned.md
    try:
        parts = input_path.parts
        raw_idx = parts.index('raw')
        base_parts = parts[:raw_idx]
        processed_dir = Path(*base_parts) / "processed"
    except ValueError:
        # Fallback: put processed file next to raw file
        processed_dir = input_path.parent.parent / "processed"

    processed_dir.mkdir(parents=True, exist_ok=True)

    filename = input_path.name
    name_without_ext = input_path.stem
    output_path = processed_dir / f"{name_without_ext}_cleaned.md"

    # Read file
    try:
        with open(input_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception as e:
        return {"error": f"Failed to read file: {e}", "status": "failed"}

    original_tokens = estimate_tokens(content)

    # Determine document type and process
    if input_path.suffix.lower() in ['.html', '.htm'] or '<html' in content[:500].lower():
        cleaned_text = clean_html(content)
        doc_type = "html"
        metadata = extract_metadata(content, "html")
    elif input_path.suffix.lower() == '.pdf':
        # PDF processing would require additional libraries (PyPDF2, pdfplumber)
        # For now, just pass through
        cleaned_text = content
        doc_type = "pdf"
        metadata = {}
    else:
        # Assume plain text
        cleaned_text = content
        doc_type = "text"
        metadata = {}

    cleaned_tokens = estimate_tokens(cleaned_text)
    saved_tokens = original_tokens - cleaned_tokens

    # Build output with YAML frontmatter
    frontmatter = f"""---
original: {input_path}
original_tokens: {original_tokens}
cleaned_tokens: {cleaned_tokens}
saved_tokens: {saved_tokens}
type: {doc_type}
title: {metadata.get('title', '')}
author: {metadata.get('author', '')}
date: {metadata.get('date', '')}
---

"""

    # Write output
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(frontmatter)
            f.write(cleaned_text)
    except Exception as e:
        return {"error": f"Failed to write file: {e}", "status": "failed"}

    return {
        "status": "success",
        "input_path": str(input_path),
        "output_path": str(output_path),
        "original_tokens": original_tokens,
        "cleaned_tokens": cleaned_tokens,
        "saved_tokens": saved_tokens,
        "savings_percent": round((saved_tokens / original_tokens * 100) if original_tokens > 0 else 0, 1),
        "doc_type": doc_type
    }


def process_directory(input_dir: str) -> list:
    """Process all files in a directory."""
    input_path = Path(input_dir).resolve()
    results = []

    if not input_path.is_dir():
        return [{"error": f"Not a directory: {input_dir}"}]

    for file_path in input_path.glob('*'):
        if file_path.is_file() and file_path.suffix.lower() in ['.html', '.htm', '.txt', '.md']:
            result = process_file(str(file_path))
            results.append(result)

    return results


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python3 preprocess_document.py <input_file_or_directory>",
            "status": "failed"
        }))
        sys.exit(1)

    input_path = sys.argv[1]

    if os.path.isdir(input_path):
        results = process_directory(input_path)
        print(json.dumps({"status": "success", "results": results}, indent=2))
    else:
        result = process_file(input_path)
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
