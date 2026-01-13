# Deep Research MCP Server

## Status: All Phases COMPLETED ✅

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ | MCP Server Infrastructure & StateManager |
| Phase 2 | ✅ | Core Tool Implementations (5 tools) |
| Phase 3A | ✅ | Error Handling, Logging, Python Client |
| Phase 3B | ✅ | Batch Processing, Caching, Documentation |

This directory contains the MCP (Model Context Protocol) server infrastructure for the Deep Research Framework.

## MCP Tools Overview

### Core Tools (5)

| Tool | Purpose | Status |
|------|---------|--------|
| `fact-extract` | Extract atomic facts from text with source attribution | ✅ |
| `entity-extract` | Extract named entities and relationships | ✅ |
| `citation-validate` | Validate citations for completeness and quality | ✅ |
| `source-rate` | Rate source quality on A-E scale | ✅ |
| `conflict-detect` | Detect conflicts between facts | ✅ |

### Batch Processing Tools (5)

| Tool | Purpose | Status |
|------|---------|--------|
| `batch-fact-extract` | Process multiple texts in parallel | ✅ |
| `batch-entity-extract` | Extract from multiple texts | ✅ |
| `batch-citation-validate` | Validate multiple citations | ✅ |
| `batch-source-rate` | Rate multiple sources | ✅ |
| `batch-conflict-detect` | Detect conflicts in batches | ✅ |

### Cache Management Tools (2)

| Tool | Purpose | Status |
|------|---------|--------|
| `cache-stats` | Get cache statistics (hits, misses, hit rate) | ✅ |
| `cache-clear` | Clear all tool caches | ✅ |

## Directory Structure

```
.claude/mcp-server/
├── package.json              # Node.js configuration
├── tsconfig.json             # TypeScript configuration
├── test-tools.js             # Comprehensive test script
├── PHASE3_PLAN.md            # Implementation plan (completed)
├── README.md                 # This file
├── src/
│   ├── index.ts              # MCP server (12 tools)
│   ├── cache/
│   │   └── cache-manager.ts  # TTL cache with LRU eviction
│   ├── utils/
│   │   ├── batch.ts          # Parallel processing utilities
│   │   ├── logger.ts         # Structured JSON logging
│   │   └── errors.ts         # Custom error classes
│   └── tools/
│       ├── fact-extract.ts
│       ├── entity-extract.ts
│       ├── citation-validate.ts
│       ├── source-rate.ts
│       ├── conflict-detect.ts
│       └── batch-tools.ts    # Batch processing implementations
├── dist/                     # Compiled JavaScript
├── docs/
│   ├── API.md                # Complete API reference
│   ├── INTEGRATION_GUIDE.md  # Skills integration guide
│   └── EXAMPLES.md           # Usage examples
├── schemas/
│   ├── fact.json
│   ├── entity.json
│   └── citation.json
└── state/
    ├── schema.sql
    └── research_state.db

scripts/
└── mcp_client.py             # Python MCP client
```

## Quick Start

### Installation

```bash
cd .claude/mcp-server
npm install
npm run build
```

### Testing

```bash
node test-tools.js
```

Expected output:

```
Testing MCP Tools v2.0...

==================================================
PART 1: Core Tools
==================================================
✓ fact-extract works
✓ entity-extract works
✓ citation-validate works
✓ source-rate works
✓ conflict-detect works

==================================================
PART 2: Batch Processing Tools
==================================================
✓ batch-fact-extract works
✓ batch-entity-extract works
✓ batch-source-rate works

==================================================
PART 3: Cache Management
==================================================
✓ cache-stats works
✓ cache-clear works

==================================================
✅ All tests completed!
==================================================
```

### Python Client

```bash
python3 scripts/mcp_client.py
```

## Usage Examples

### Single Item Processing

```javascript
import { factExtract } from './dist/tools/fact-extract.js';

const result = await factExtract({
  text: 'The AI market was valued at $22.4 billion in 2023.',
  source_url: 'https://example.com/report'
});
```

### Batch Processing (10x faster)

```javascript
import { batchFactExtract } from './dist/tools/batch-tools.js';

const result = await batchFactExtract({
  items: [
    { text: 'Apple revenue was $394B', source_url: 'https://apple.com' },
    { text: 'Google revenue was $280B', source_url: 'https://google.com' },
    { text: 'Microsoft revenue was $198B', source_url: 'https://microsoft.com' },
  ],
  options: {
    maxConcurrency: 5,  // Process 5 in parallel
    useCache: true      // Enable caching
  }
});
```

### Python Integration

```python
from scripts.mcp_client import MCPClient

client = MCPClient()
result = client.extract_facts(
    text="The AI market was valued at $22.4 billion.",
    source_url="https://example.com"
)
```

## Cache Configuration

| Cache | TTL | Max Size |
|-------|-----|----------|
| Facts | 10 min | 500 |
| Entities | 10 min | 500 |
| Citations | 30 min | 200 |
| Source Ratings | 60 min | 1000 |
| Conflicts | 5 min | 200 |

## Batch Processing Options

| Option | Default | Description |
|--------|---------|-------------|
| `maxConcurrency` | 5 | Parallel operations |
| `useCache` | true | Enable caching |
| `stopOnError` | false | Stop on first error |

## Documentation

- **[API Reference](docs/API.md)** - Complete tool documentation
- **[Integration Guide](docs/INTEGRATION_GUIDE.md)** - Skills integration
- **[Examples](docs/EXAMPLES.md)** - Usage examples

## Claude Desktop Integration

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

## What Was Completed

### Phase 1: Infrastructure

- StateManager (`scripts/state_manager.py`)
- MCP Server setup with TypeScript
- JSON schemas for data validation

### Phase 2: Core Tools

- 5 core tools implemented and tested
- Pattern-based extraction
- Quality scoring

### Phase 3A: Production Readiness

- Structured logging (`src/utils/logger.ts`)
- Custom error classes (`src/utils/errors.ts`)
- Python client (`scripts/mcp_client.py`)

### Phase 3B: Advanced Features

- Batch processing (`src/utils/batch.ts`, `src/tools/batch-tools.ts`)
- Caching layer (`src/cache/cache-manager.ts`)
- Complete documentation (`docs/`)
