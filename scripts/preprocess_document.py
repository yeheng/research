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

try:
    import html2text

    HAS_HTML2TEXT = True
except ImportError:
    HAS_HTML2TEXT = False

try:
    from simhash_dedup import DuplicationDetector, SimHash

    HAS_SIMHASH = True
except (ImportError, ModuleNotFoundError):
    HAS_SIMHASH = False

try:
    from state_manager import StateManager

    HAS_STATE_MANAGER = True
except ImportError:
    HAS_STATE_MANAGER = False


# Global fingerprint registry for deduplication (in-memory across processing)
_FINGERPRINT_REGISTRY = {}

# Entity extraction patterns
ENTITY_PATTERNS = {
    "company": [
        # Common tech companies
        r"\b(OpenAI|Microsoft|Google|Apple|Amazon|Meta|Anthropic|DeepMind|NVIDIA|Tesla|IBM|Oracle|Salesforce|Adobe|Intel|AMD|Qualcomm|Samsung|Huawei|Alibaba|Tencent|Baidu|ByteDance)\b",
        # Generic company patterns
        r"\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:Inc\.|Corp\.|LLC|Ltd\.?|Company|Co\.|Corporation|Group|Holdings)\b",
    ],
    "technology": [
        r"\b(GPT-[0-9]+|GPT[0-9]+|BERT|Transformer|LLM|CNN|RNN|LSTM|GAN|VAE|ViT|CLIP|DALL[-·]?E|Stable Diffusion|Midjourney|Claude|Gemini|PaLM|LLaMA|Mistral|ChatGPT|Copilot)\b",
        r"\b(Machine Learning|Deep Learning|Neural Network|Natural Language Processing|NLP|Computer Vision|Reinforcement Learning|AI|Artificial Intelligence)\b",
    ],
    "product": [
        r"\b(ChatGPT|GitHub Copilot|Bing Chat|Google Bard|Claude AI|Gemini Pro|GPT-4 Turbo)\b",
    ],
    "person": [
        r"\b(Sam Altman|Satya Nadella|Sundar Pichai|Elon Musk|Mark Zuckerberg|Dario Amodei|Demis Hassabis|Jensen Huang|Tim Cook|Jeff Bezos)\b",
    ],
    "market": [
        r"\b(AI (?:in )?Healthcare|FinTech|EdTech|AdTech|RegTech|InsurTech|HealthTech|BioTech|CleanTech|AgTech|FoodTech|PropTech|LegalTech|MarTech|HRTech|RetailTech)\b",
        r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)* Market)\b",
    ],
}

RELATION_PATTERNS = {
    "invests_in": [
        r"(\w+(?:\s+\w+)?)\s+invest(?:ed|s|ing)?\s+(?:\$[\d.]+\s*(?:billion|million|B|M))?\s*in\s+(\w+(?:\s+\w+)?)",
        r"(\w+(?:\s+\w+)?)\s+(?:led|participated in)\s+(?:a\s+)?(?:\$[\d.]+\s*(?:billion|million|B|M)\s+)?(?:funding|investment)\s+(?:round\s+)?(?:in|for)\s+(\w+(?:\s+\w+)?)",
    ],
    "competes_with": [
        r"(\w+(?:\s+\w+)?)\s+compet(?:es|ing|ed)\s+with\s+(\w+(?:\s+\w+)?)",
        r"(\w+(?:\s+\w+)?)\s+(?:is|are)\s+(?:a\s+)?(?:rival|competitor)(?:s)?\s+(?:of|to)\s+(\w+(?:\s+\w+)?)",
    ],
    "partners_with": [
        r"(\w+(?:\s+\w+)?)\s+partner(?:ed|s|ing)?\s+with\s+(\w+(?:\s+\w+)?)",
        r"(\w+(?:\s+\w+)?)\s+(?:announced|formed|entered)\s+(?:a\s+)?partnership\s+with\s+(\w+(?:\s+\w+)?)",
    ],
    "uses": [
        r"(\w+(?:\s+\w+)?)\s+(?:uses|using|powered by|built on|leverages)\s+(\w+(?:\s+\w+)?)",
    ],
    "created_by": [
        r"(\w+(?:\s+\w+)?)\s+(?:was\s+)?(?:created|developed|built|made)\s+by\s+(\w+(?:\s+\w+)?)",
    ],
    "acquired": [
        r"(\w+(?:\s+\w+)?)\s+acquir(?:ed|es|ing)\s+(\w+(?:\s+\w+)?)",
        r"(\w+(?:\s+\w+)?)\s+(?:bought|purchased)\s+(\w+(?:\s+\w+)?)",
    ],
}


def extract_entities(text: str) -> dict:
    """Extract named entities from text using pattern matching.

    Args:
        text: Document text to extract entities from

    Returns:
        Dictionary with entities by type and mention counts
    """
    entities = {}
    mention_counts = {}

    for entity_type, patterns in ENTITY_PATTERNS.items():
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                # Handle tuple matches from groups
                name = match if isinstance(match, str) else match[0]
                name = name.strip()

                # Skip very short or generic matches
                if len(name) < 2 or name.lower() in ["the", "a", "an", "is", "are"]:
                    continue

                # Normalize name
                normalized = name.title() if len(name) > 3 else name.upper()

                if normalized not in entities:
                    entities[normalized] = {
                        "name": normalized,
                        "type": entity_type,
                        "aliases": set(),
                        "mention_count": 0,
                    }

                entities[normalized]["mention_count"] += 1
                if name != normalized:
                    entities[normalized]["aliases"].add(name)

    # Convert sets to lists for JSON serialization
    for entity in entities.values():
        entity["aliases"] = list(entity["aliases"])

    return entities


def extract_relations(text: str, entities: dict) -> list:
    """Extract relationships between entities from text.

    Args:
        text: Document text to extract relations from
        entities: Dictionary of known entities

    Returns:
        List of relationship tuples (source, target, relation_type, evidence)
    """
    relations = []
    entity_names = set(entities.keys())

    for relation_type, patterns in RELATION_PATTERNS.items():
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                groups = match.groups()
                if len(groups) >= 2:
                    source = groups[0].strip().title()
                    target = groups[1].strip().title()

                    # Only include if at least one is a known entity
                    source_known = source in entity_names or any(
                        source.lower() in e.lower() for e in entity_names
                    )
                    target_known = target in entity_names or any(
                        target.lower() in e.lower() for e in entity_names
                    )

                    if source_known or target_known:
                        # Get context (surrounding text)
                        start = max(0, match.start() - 50)
                        end = min(len(text), match.end() + 50)
                        evidence = text[start:end].strip()

                        relations.append({
                            "source": source,
                            "target": target,
                            "relation": relation_type,
                            "evidence": evidence,
                            "confidence": 0.7 if source_known and target_known else 0.5,
                        })

    return relations


def extract_cooccurrences(text: str, entities: dict, window_size: int = 200) -> list:
    """Extract co-occurrences of entities within text windows.

    Args:
        text: Document text
        entities: Dictionary of known entities
        window_size: Character window size for co-occurrence detection

    Returns:
        List of co-occurrence records
    """
    cooccurrences = {}
    entity_names = list(entities.keys())

    # Find all entity positions
    entity_positions = []
    for name in entity_names:
        for match in re.finditer(re.escape(name), text, re.IGNORECASE):
            entity_positions.append((match.start(), match.end(), name))

    # Sort by position
    entity_positions.sort(key=lambda x: x[0])

    # Find co-occurrences within window
    for i, (start_a, end_a, name_a) in enumerate(entity_positions):
        for start_b, end_b, name_b in entity_positions[i + 1:]:
            if start_b - end_a > window_size:
                break

            if name_a != name_b:
                pair = tuple(sorted([name_a, name_b]))
                if pair not in cooccurrences:
                    cooccurrences[pair] = {
                        "entity_a": pair[0],
                        "entity_b": pair[1],
                        "count": 0,
                        "contexts": [],
                    }

                cooccurrences[pair]["count"] += 1
                if len(cooccurrences[pair]["contexts"]) < 3:
                    context_start = max(0, start_a - 20)
                    context_end = min(len(text), end_b + 20)
                    context = text[context_start:context_end].strip()
                    if context not in cooccurrences[pair]["contexts"]:
                        cooccurrences[pair]["contexts"].append(context)

    return list(cooccurrences.values())


def save_entity_extraction(
    session_id: str,
    entities: dict,
    relations: list,
    cooccurrences: list,
    output_dir: Path,
    db_path: str = None,
) -> dict:
    """Save extracted entities to files and optionally to database.

    Args:
        session_id: Research session ID
        entities: Extracted entities
        relations: Extracted relations
        cooccurrences: Extracted co-occurrences
        output_dir: Directory to save JSON files
        db_path: Optional path to SQLite database

    Returns:
        Summary of saved data
    """
    output_dir = Path(output_dir)
    entity_graph_dir = output_dir / "entity_graph"
    entity_graph_dir.mkdir(parents=True, exist_ok=True)

    # Save to JSON files
    entities_file = entity_graph_dir / "entities.json"
    edges_file = entity_graph_dir / "edges.json"
    cooccurrences_file = entity_graph_dir / "cooccurrences.json"

    with open(entities_file, "w", encoding="utf-8") as f:
        json.dump({
            "session_id": session_id,
            "entities": list(entities.values()),
        }, f, indent=2, ensure_ascii=False)

    with open(edges_file, "w", encoding="utf-8") as f:
        json.dump({
            "session_id": session_id,
            "edges": relations,
        }, f, indent=2, ensure_ascii=False)

    with open(cooccurrences_file, "w", encoding="utf-8") as f:
        json.dump({
            "session_id": session_id,
            "cooccurrences": cooccurrences,
        }, f, indent=2, ensure_ascii=False)

    # Optionally save to database
    db_saved = False
    if HAS_STATE_MANAGER and db_path:
        try:
            sm = StateManager(db_path)
            entity_id_map = {}

            # Create entities
            for entity in entities.values():
                entity_id = sm.create_entity(
                    session_id=session_id,
                    name=entity["name"],
                    entity_type=entity["type"],
                )
                entity_id_map[entity["name"]] = entity_id

                # Add aliases
                for alias in entity.get("aliases", []):
                    sm.add_entity_alias(entity["name"], alias)

            # Create edges
            for rel in relations:
                source_id = entity_id_map.get(rel["source"])
                target_id = entity_id_map.get(rel["target"])

                if source_id and target_id:
                    sm.create_entity_edge(
                        session_id=session_id,
                        source_entity_id=source_id,
                        target_entity_id=target_id,
                        relation_type=rel["relation"],
                        confidence=rel.get("confidence", 0.5),
                        evidence=rel.get("evidence"),
                    )

            db_saved = True
        except Exception as e:
            print(f"Warning: Failed to save to database: {e}", file=sys.stderr)

    return {
        "entities_count": len(entities),
        "relations_count": len(relations),
        "cooccurrences_count": len(cooccurrences),
        "files_saved": [str(entities_file), str(edges_file), str(cooccurrences_file)],
        "db_saved": db_saved,
    }


def convert_table_to_markdown(table_element) -> str:
    """Convert an HTML table to Markdown format, preserving structure."""
    if not HAS_BS4:
        return ""

    rows = table_element.find_all("tr")
    if not rows:
        return ""

    markdown_rows = []
    header_processed = False

    for row in rows:
        cells = row.find_all(["th", "td"])
        if not cells:
            continue

        cell_texts = []
        for cell in cells:
            text = cell.get_text(strip=True).replace("|", "\\|")
            text = " ".join(text.split())
            cell_texts.append(text)

        row_text = "| " + " | ".join(cell_texts) + " |"
        markdown_rows.append(row_text)

        if row.find("th") or not header_processed:
            separator = "| " + " | ".join(["---"] * len(cells)) + " |"
            markdown_rows.append(separator)
            header_processed = True

    return "\n".join(markdown_rows)


def extract_tables(soup) -> list:
    """Extract all tables from HTML and convert to Markdown."""
    tables = []
    for table in soup.find_all("table"):
        md_table = convert_table_to_markdown(table)
        if md_table and len(md_table) > 20:
            tables.append(md_table)
        table.extract()
    return tables


def clean_html(raw_html: str) -> str:
    """Remove scripts, styles, navigation, keeping only core text content.
    Preserves tables by converting them to Markdown format.
    """
    if not HAS_BS4:
        # Fallback: basic regex cleaning if BeautifulSoup not available
        text = re.sub(
            r"<script[^>]*>.*?</script>", "", raw_html, flags=re.DOTALL | re.IGNORECASE
        )
        text = re.sub(
            r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE
        )
        text = re.sub(r"<nav[^>]*>.*?</nav>", "", text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(
            r"<footer[^>]*>.*?</footer>", "", text, flags=re.DOTALL | re.IGNORECASE
        )
        text = re.sub(
            r"<header[^>]*>.*?</header>", "", text, flags=re.DOTALL | re.IGNORECASE
        )
        text = re.sub(
            r"<aside[^>]*>.*?</aside>", "", text, flags=re.DOTALL | re.IGNORECASE
        )
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    soup = BeautifulSoup(raw_html, "html.parser")

    # Extract tables FIRST before removing other elements
    extracted_tables = extract_tables(soup)

    # Remove interference elements
    tags_to_remove = [
        "script",
        "style",
        "nav",
        "footer",
        "header",
        "aside",
        "iframe",
        "noscript",
        "form",
        "button",
        "input",
        "select",
        "textarea",
        "svg",
        "canvas",
        "advertisement",
        "ad",
        "banner",
        "popup",
        "modal",
    ]

    for tag in soup(tags_to_remove):
        tag.extract()

    # Remove elements by common ad/nav class names
    ad_patterns = [
        "ad",
        "ads",
        "advertisement",
        "banner",
        "sidebar",
        "nav",
        "navigation",
        "menu",
        "footer",
        "header",
        "popup",
        "modal",
        "overlay",
        "cookie",
        "newsletter",
        "social",
        "share",
        "comment",
        "related",
        "recommended",
    ]

    for pattern in ad_patterns:
        for element in soup.find_all(class_=re.compile(pattern, re.I)):
            element.extract()
        for element in soup.find_all(id=re.compile(pattern, re.I)):
            element.extract()

    # Use html2text if available for better Markdown conversion
    if HAS_HTML2TEXT:
        h = html2text.HTML2Text()
        h.ignore_links = False
        h.ignore_images = True
        h.ignore_emphasis = False
        h.body_width = 0  # Don't wrap lines
        h.unicode_snob = True
        h.skip_internal_links = True
        h.inline_links = True
        text = h.handle(str(soup))
    else:
        # Fallback: Extract text with newlines
        text = soup.get_text(separator="\n")

    # Clean whitespace
    lines = (line.strip() for line in text.splitlines())
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    text = "\n".join(chunk for chunk in chunks if chunk)

    # Remove excessive newlines
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Append extracted tables at the end with section header
    if extracted_tables:
        text += "\n\n## Extracted Data Tables\n\n"
        text += "\n\n---\n\n".join(extracted_tables)

    return text


def extract_metadata(soup_or_text, doc_type: str) -> dict:
    """Extract metadata from document."""
    metadata = {"title": "", "description": "", "author": "", "date": ""}

    if HAS_BS4 and doc_type == "html":
        try:
            soup = (
                BeautifulSoup(soup_or_text, "html.parser")
                if isinstance(soup_or_text, str)
                else soup_or_text
            )

            # Title
            title_tag = soup.find("title")
            if title_tag:
                metadata["title"] = title_tag.get_text().strip()

            # Meta description
            desc_meta = soup.find("meta", attrs={"name": "description"})
            if desc_meta:
                metadata["description"] = desc_meta.get("content", "")

            # Author
            author_meta = soup.find("meta", attrs={"name": "author"})
            if author_meta:
                metadata["author"] = author_meta.get("content", "")

            # Date
            date_meta = soup.find(
                "meta", attrs={"name": re.compile(r"date|published", re.I)}
            )
            if date_meta:
                metadata["date"] = date_meta.get("content", "")
        except Exception:
            pass

    return metadata


def estimate_tokens(text: str) -> int:
    """Estimate token count (rough approximation: 1 token ~ 4 characters for English)."""
    return len(text) // 4


def _check_duplicate(url_or_path: str, content: str) -> dict:
    """Check if content is duplicate using SimHash.

    Args:
        url_or_path: URL or file path as identifier
        content: Document content to check

    Returns:
        Dictionary with duplicate status and fingerprint
    """
    # Try to import SimHash at runtime (more reliable than module-level import)
    try:
        from scripts.simhash_dedup import SimHash

        has_simhash = True
    except (ImportError, ModuleNotFoundError):
        has_simhash = False

    if not has_simhash:
        return {"is_duplicate": False, "fingerprint": None, "original_url": None}

    global _FINGERPRINT_REGISTRY

    if not _FINGERPRINT_REGISTRY:
        manifest_path = (
            Path.cwd() / "RESEARCH" / "current" / "content_fingerprints.json"
        )
        if manifest_path.exists():
            try:
                with open(manifest_path, "r") as f:
                    _FINGERPRINT_REGISTRY = json.load(f)
            except Exception:
                _FINGERPRINT_REGISTRY = {}

    simhash = SimHash()
    current_fingerprint = simhash.compute(content)

    for existing_url, existing_fp in _FINGERPRINT_REGISTRY.items():
        distance = simhash.hamming_distance(current_fingerprint, existing_fp)
        if distance <= 3:
            return {
                "is_duplicate": True,
                "fingerprint": current_fingerprint,
                "original_url": existing_url,
            }

    _FINGERPRINT_REGISTRY[url_or_path] = current_fingerprint
    manifest_path = Path.cwd() / "RESEARCH" / "current" / "content_fingerprints.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_path, "w") as f:
        json.dump(_FINGERPRINT_REGISTRY, f)

    return {
        "is_duplicate": False,
        "fingerprint": current_fingerprint,
        "original_url": None,
    }


def process_file(input_path: str) -> dict:
    """Process a single file and return status."""
    input_path = Path(input_path).resolve()

    if not input_path.exists():
        return {"error": f"File not found: {input_path}", "status": "failed"}

    # Determine output path
    # Expected structure: RESEARCH/topic/data/raw/file.html -> RESEARCH/topic/data/processed/file_cleaned.md
    try:
        parts = input_path.parts
        raw_idx = parts.index("raw")
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
        with open(input_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except Exception as e:
        return {"error": f"Failed to read file: {e}", "status": "failed"}

    original_tokens = estimate_tokens(content)

    # Determine document type and process
    if (
        input_path.suffix.lower() in [".html", ".htm"]
        or "<html" in content[:500].lower()
    ):
        cleaned_text = clean_html(content)
        doc_type = "html"
        metadata = extract_metadata(content, "html")
    elif input_path.suffix.lower() == ".pdf":
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
title: {metadata.get("title", "")}
author: {metadata.get("author", "")}
date: {metadata.get("date", "")}
---

"""

    # Write output
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(frontmatter)
            f.write(cleaned_text)
    except Exception as e:
        return {"error": f"Failed to write file: {e}", "status": "failed"}

    # SimHash content deduplication
    dedup_result = _check_duplicate(input_path, cleaned_text)
    if dedup_result["is_duplicate"]:
        return {
            "status": "duplicate",
            "original_url": dedup_result["original_url"],
            "input_path": str(input_path),
            "output_path": None,
            "original_tokens": original_tokens,
            "cleaned_tokens": cleaned_tokens,
            "saved_tokens": saved_tokens,
            "savings_percent": round(
                (saved_tokens / original_tokens * 100) if original_tokens > 0 else 0, 1
            ),
            "doc_type": doc_type,
            "duplicate_of": dedup_result["original_url"],
        }

    # Entity extraction
    entity_result = None
    try:
        entities = extract_entities(cleaned_text)
        if entities:
            relations = extract_relations(cleaned_text, entities)
            cooccurrences = extract_cooccurrences(cleaned_text, entities)

            # Determine data directory for entity graph output
            try:
                parts = input_path.parts
                raw_idx = parts.index("raw")
                data_dir = Path(*parts[:raw_idx])
            except ValueError:
                data_dir = processed_dir.parent

            # Try to extract session_id from path (RESEARCH/<topic>/data/...)
            try:
                research_idx = parts.index("RESEARCH")
                session_id = parts[research_idx + 1] if research_idx + 1 < len(parts) else "unknown"
            except ValueError:
                session_id = "unknown"

            entity_result = {
                "entities_count": len(entities),
                "relations_count": len(relations),
                "cooccurrences_count": len(cooccurrences),
            }

            # Save entity extraction results
            if entities:
                save_entity_extraction(
                    session_id=session_id,
                    entities=entities,
                    relations=relations,
                    cooccurrences=cooccurrences,
                    output_dir=data_dir,
                )
    except Exception as e:
        entity_result = {"error": str(e)}

    return {
        "status": "success",
        "input_path": str(input_path),
        "output_path": str(output_path),
        "original_tokens": original_tokens,
        "cleaned_tokens": cleaned_tokens,
        "saved_tokens": saved_tokens,
        "savings_percent": round(
            (saved_tokens / original_tokens * 100) if original_tokens > 0 else 0, 1
        ),
        "doc_type": doc_type,
        "content_hash": dedup_result["fingerprint"],
        "entity_extraction": entity_result,
    }


def process_directory(input_dir: str) -> list:
    """Process all files in a directory."""
    input_path = Path(input_dir).resolve()
    results = []

    if not input_path.is_dir():
        return [{"error": f"Not a directory: {input_dir}"}]

    for file_path in input_path.glob("*"):
        if file_path.is_file() and file_path.suffix.lower() in [
            ".html",
            ".htm",
            ".txt",
            ".md",
        ]:
            result = process_file(str(file_path))
            results.append(result)

    return results


def main():
    if len(sys.argv) < 2:
        print(
            json.dumps(
                {
                    "error": "Usage: python3 preprocess_document.py <input_file_or_directory>",
                    "status": "failed",
                }
            )
        )
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
