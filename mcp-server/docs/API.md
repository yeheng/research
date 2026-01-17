# MCP Server API Reference

## Overview

The Deep Research MCP Server provides 12 tools for research data processing:

- **5 Core Tools**: Basic data extraction and validation
- **5 Batch Tools**: Parallel processing with caching
- **2 Cache Tools**: Cache management

## Core Tools

### fact-extract

Extract atomic facts from text with source attribution.

**Input Schema:**

```json
{
  "text": "string (required)",
  "source_url": "string (optional)",
  "source_metadata": {
    "title": "string",
    "author": "string",
    "date": "string"
  }
}
```

**Output:**

```json
{
  "facts": [
    {
      "entity": "AI market",
      "attribute": "value",
      "value": "22.4billion",
      "value_type": "currency",
      "confidence": "Medium",
      "source": {
        "url": "https://example.com",
        "title": "Report Title"
      }
    }
  ],
  "extraction_quality": 7.5,
  "metadata": {
    "total_facts": 1,
    "processing_time_ms": 5
  }
}
```

---

### entity-extract

Extract named entities and relationships from text.

**Input Schema:**

```json
{
  "text": "string (required)",
  "entity_types": ["company", "person", "technology"],
  "extract_relations": true
}
```

**Output:**

```json
{
  "entities": [
    {
      "name": "Microsoft",
      "type": "company",
      "aliases": [],
      "description": null
    }
  ],
  "edges": [
    {
      "source": "Microsoft",
      "target": "OpenAI",
      "relation": "invests_in",
      "confidence": 0.7,
      "evidence": "Microsoft invested in OpenAI"
    }
  ],
  "metadata": {
    "total_entities": 2,
    "total_relationships": 1
  }
}
```

---

### citation-validate

Validate citations for completeness and quality.

**Input Schema:**

```json
{
  "citations": [
    {
      "claim": "string (required)",
      "author": "string",
      "date": "string",
      "title": "string",
      "url": "string"
    }
  ],
  "verify_urls": false,
  "check_accuracy": false
}
```

**Output:**

```json
{
  "total_citations": 2,
  "complete_citations": 1,
  "quality_distribution": {
    "A": 0, "B": 1, "C": 0, "D": 0, "E": 1
  },
  "issues": [
    {
      "citation_index": 1,
      "field": "author",
      "issue": "missing",
      "severity": "warning"
    }
  ]
}
```

---

### source-rate

Rate source quality on A-E scale.

**Input Schema:**

```json
{
  "source_url": "string (required)",
  "source_type": "academic|industry|news|blog|official",
  "metadata": {}
}
```

**Output:**

```json
{
  "quality_rating": "A",
  "justification": "Peer-reviewed academic source",
  "credibility_indicators": [
    "peer_reviewed",
    "institutional_affiliation"
  ]
}
```

**Rating Criteria:**

- **A**: Peer-reviewed, academic (.edu, .gov, nature.com, etc.)
- **B**: Industry reports, official company sources
- **C**: News sites, established media
- **D**: Blogs, personal sites
- **E**: Unknown or untrusted sources

---

### conflict-detect

Detect conflicts between facts.

**Input Schema:**

```json
{
  "facts": [
    {
      "entity": "string",
      "attribute": "string",
      "value": "string",
      "value_type": "number|currency|percentage|date|text",
      "source": "string"
    }
  ],
  "tolerance": {
    "numerical_threshold": 0.1
  }
}
```

**Output:**

```json
{
  "total_conflicts": 1,
  "conflicts": [
    {
      "entity": "AI Market",
      "attribute": "Size 2024",
      "type": "numerical",
      "severity": "moderate",
      "values": ["22.4", "28.5"],
      "sources": ["Source A", "Source B"],
      "difference_percentage": 27.2,
      "possible_explanation": "Different measurement methodologies"
    }
  ],
  "severity_summary": {
    "critical": 0,
    "moderate": 1,
    "minor": 0
  }
}
```

---

## Batch Processing Tools

All batch tools share the same input schema:

**Input Schema:**

```json
{
  "items": [/* array of inputs for the corresponding core tool */],
  "options": {
    "maxConcurrency": 5,
    "useCache": true,
    "stopOnError": false
  }
}
```

**Output:**

```json
{
  "tool": "batch-fact-extract",
  "results": [
    {
      "id": "item_0",
      "success": true,
      "data": {/* core tool output */},
      "error": null,
      "processingTimeMs": 5
    }
  ],
  "summary": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "totalTimeMs": 15,
    "avgTimeMs": 5,
    "cacheHitRate": 0.33
  }
}
```

### Available Batch Tools

| Tool | Description |
|------|-------------|
| `batch-fact-extract` | Process multiple texts for fact extraction |
| `batch-entity-extract` | Extract entities from multiple texts |
| `batch-citation-validate` | Validate multiple citations |
| `batch-source-rate` | Rate multiple sources |
| `batch-conflict-detect` | Detect conflicts in multiple fact sets |

---

## Cache Management Tools

### cache-stats

Get cache statistics for all tool caches.

**Input:** None required

**Output:**

```json
{
  "factCache": {
    "size": 10,
    "hits": 25,
    "misses": 5,
    "hitRate": 0.83
  },
  "entityCache": {
    "size": 8,
    "hits": 12,
    "misses": 3,
    "hitRate": 0.8
  },
  "citationCache": { ... },
  "sourceRatingCache": { ... },
  "conflictCache": { ... }
}
```

---

### cache-clear

Clear all tool caches.

**Input:** None required

**Output:**

```json
{
  "success": true,
  "message": "All caches cleared"
}
```

---

## Error Handling

All tools return errors in a consistent format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: {error_message}"
    }
  ],
  "isError": true
}
```

### Error Types

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid input parameters |
| `PROCESSING_ERROR` | Error during data processing |
| `RESOURCE_ERROR` | External resource unavailable |
| `DATA_FORMAT_ERROR` | Invalid data format |
| `CONFIGURATION_ERROR` | Server configuration issue |

---

## Performance Tips

1. **Use Batch Tools** for processing multiple items (10x faster than sequential)
2. **Enable Caching** for repeated queries (`useCache: true`)
3. **Adjust Concurrency** based on your workload (`maxConcurrency: 5` default)
4. **Monitor Cache Stats** to optimize hit rates
5. **Clear Cache** periodically for fresh data

## Cache Configuration

| Cache | Default TTL | Max Size |
|-------|-------------|----------|
| `factCache` | 10 minutes | 500 |
| `entityCache` | 10 minutes | 500 |
| `citationCache` | 30 minutes | 200 |
| `sourceRatingCache` | 60 minutes | 1000 |
| `conflictCache` | 5 minutes | 200 |
