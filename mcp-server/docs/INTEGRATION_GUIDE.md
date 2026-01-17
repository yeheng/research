# Integration Guide

This guide explains how to integrate MCP tools with existing skills and workflows.

## Prerequisites

1. **Node.js 18+** installed
2. **MCP Server built**: `npm run build` in `.claude/mcp-server/`
3. **Python 3.8+** (for Python client)

## Python Integration

### Using the MCP Client (v2.0)

**v2.0 Features**:
- ✅ Persistent connection (95% faster than v1.0)
- ✅ Automatic connection recovery
- ✅ Thread-safe operations
- ✅ Context manager support

**Basic Usage**:

```python
from scripts.mcp_client import MCPClient

# Recommended: Use context manager for automatic cleanup
with MCPClient() as client:
    # Extract facts
    result = client.extract_facts(
        text="The AI market was valued at $22.4 billion in 2023.",
        source_url="https://example.com/report"
    )
    print(f"Extracted {result['metadata']['total_facts']} facts")

    # Extract entities
    entities = client.extract_entities(
        text="Microsoft invested in OpenAI to develop AI technologies.",
        extract_relations=True
    )
    print(f"Found {entities['metadata']['total_entities']} entities")

# Or manual management
client = MCPClient()
try:
    result = client.extract_facts(text="...", source_url="...")
finally:
    client.close()  # Important: Close persistent connection
```

**Advanced Examples**:

```python
with MCPClient() as client:
    # Validate citations
    citations = client.validate_citations([
        {"claim": "AI is growing", "author": "John Doe", "date": "2024", "url": "https://example.com"}
    ])
    print(f"Complete: {citations['complete_citations']}/{citations['total_citations']}")

    # Rate sources
    rating = client.rate_source(
        source_url="https://nature.com/article",
        source_type="academic"
    )
    print(f"Quality: {rating['quality_rating']}")

    # Detect conflicts
    conflicts = client.detect_conflicts([
        {"entity": "Revenue", "attribute": "2024", "value": "100", "value_type": "currency", "source": "A"},
        {"entity": "Revenue", "attribute": "2024", "value": "120", "value_type": "currency", "source": "B"}
    ])
    print(f"Conflicts: {conflicts['total_conflicts']}")
```

### Updating Skills to Use MCP

#### Before (Inline Logic)

```python
# .claude/skills/fact-extractor/instructions.md
# Contains complex extraction logic inline
```

#### After (MCP Integration)

```python
from scripts.mcp_client import MCPClient

def extract_facts_from_research(text, source_url):
    """Extract facts using MCP tool (v2.0)."""
    with MCPClient() as client:
        return client.extract_facts(text=text, source_url=source_url)
```

### Batch Processing

## Direct Node.js Integration

```javascript
import { factExtract } from './dist/tools/fact-extract.js';
import { entityExtract } from './dist/tools/entity-extract.js';

// Single extraction
const result = await factExtract({
  text: 'Revenue was $100 million in 2024.',
  source_url: 'https://example.com'
});

const facts = JSON.parse(result.content[0].text);
console.log(facts.facts);
```

## Batch Processing

### Python Batch Processing

```python
# Process multiple items efficiently
texts = [
    {"text": "Apple revenue was $394B", "source_url": "https://apple.com"},
    {"text": "Google revenue was $280B", "source_url": "https://google.com"},
    {"text": "Microsoft revenue was $198B", "source_url": "https://microsoft.com"},
]

# Sequential (slow)
for item in texts:
    result = client.extract_facts(**item)

# Better: Use batch tool via Node.js
```

### JavaScript Batch Processing

```javascript
import { batchFactExtract } from './dist/tools/batch-tools.js';

const result = await batchFactExtract({
  items: [
    { text: 'Apple revenue was $394B', source_url: 'https://apple.com' },
    { text: 'Google revenue was $280B', source_url: 'https://google.com' },
    { text: 'Microsoft revenue was $198B', source_url: 'https://microsoft.com' },
  ],
  options: {
    maxConcurrency: 5,  // Process 5 items in parallel
    useCache: true,     // Enable caching
    stopOnError: false, // Continue on errors
  }
});

const parsed = JSON.parse(result.content[0].text);
console.log(`Processed ${parsed.summary.total} items in ${parsed.summary.totalTimeMs}ms`);
```

## Integrating with Research Workflow

### 1. Question Refiner → Research Planning

```python
# In question-refiner skill
# Use entity-extract to identify key concepts
entities = client.extract_entities(question)
key_concepts = [e['name'] for e in entities['entities']]
```

### 2. Research Agent → Fact Collection

```python
# Each research agent collects facts
collected_facts = []
for source in sources:
    facts = client.extract_facts(source['content'], source['url'])
    collected_facts.extend(facts['facts'])
```

### 3. Synthesizer → Conflict Resolution

```python
# Detect conflicts before synthesis
conflicts = client.detect_conflicts(collected_facts)
if conflicts['total_conflicts'] > 0:
    # Handle conflicts before synthesis
    for conflict in conflicts['conflicts']:
        # Resolution logic
        pass
```

### 4. Citation Validator → Final QA

```python
# Validate all citations before publishing
validation = client.validate_citations(report_citations)
if validation['complete_citations'] < validation['total_citations']:
    # Fix incomplete citations
    for issue in validation['issues']:
        # Handle issues
        pass
```

## MCP Server Configuration

### Claude Desktop Integration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "deep-research": {
      "command": "node",
      "args": ["/path/to/.claude/mcp-server/dist/index.js"]
    }
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level (DEBUG, INFO, WARN, ERROR) | INFO |
| `CACHE_TTL` | Default cache TTL in milliseconds | 300000 |
| `MAX_CONCURRENCY` | Default batch concurrency | 5 |

## Troubleshooting

### "MCP server not found"

```bash
cd .claude/mcp-server
npm install
npm run build
```

### "Tool timeout"

Increase timeout in Python client:

```python
result = subprocess.run(..., timeout=60)  # 60 seconds
```

### Cache issues

Clear cache and retry:

```javascript
import { clearAllCaches } from './dist/tools/batch-tools.js';
await clearAllCaches();
```

## Best Practices

1. **Use Batch Tools** for processing more than 3 items
2. **Enable Caching** for repeated similar queries
3. **Validate Early** - run citation-validate before final synthesis
4. **Monitor Performance** - check cache stats periodically
5. **Handle Errors Gracefully** - always wrap in try/catch
