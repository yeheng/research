# Deep Research MCP Server

## Phase 1 Refactoring - COMPLETED ✅
## Phase 2 Implementation - COMPLETED ✅
## Phase 3A (High Priority) - COMPLETED ✅

This directory contains the MCP (Model Context Protocol) server infrastructure for the Deep Research Framework.

### What Was Completed

#### Task 15: Centralized StateManager ✅

- **Location**: `scripts/state_manager.py`
- **Database**: `.claude/mcp-server/state/research_state.db`
- **Schema**: `.claude/mcp-server/state/schema.sql`
- **Features**:
  - Thread-safe SQLite backend with WAL mode
  - Complete data classes for type safety
  - ACID-compliant transactions
  - Support for all research components (sessions, GoT, agents, facts, entities, citations)

#### Task 1: MCP Server Infrastructure ✅

- **Package Configuration**: `package.json` with MCP SDK dependencies
- **TypeScript Config**: `tsconfig.json` for ES2022/Node16
- **Main Server**: `src/index.ts` with 5 tool definitions
- **JSON Schemas**: `schemas/` directory with fact, entity, and citation schemas

#### Phase 2: MCP Tool Implementations ✅

All 5 MCP tools have been implemented and tested:

- **Task 2**: `fact-extract` tool ✅
  - Extracts atomic facts from text with source attribution
  - Supports multiple value types (number, currency, percentage, date, text)
  - Calculates extraction quality score

- **Task 3**: `entity-extract` tool ✅
  - Named entity recognition (companies, people, technologies)
  - Relationship extraction with confidence scores
  - Entity deduplication and normalization

- **Task 4**: `citation-validate` tool ✅
  - Validates citation completeness (author, date, URL)
  - Identifies missing fields and issues
  - Reports validation statistics

- **Task 5**: `source-rate` tool ✅
  - Rates sources on A-E quality scale
  - Provides justification and credibility indicators
  - Supports academic, industry, news, blog, and official sources

- **Task 6**: `conflict-detect` tool ✅
  - Detects numerical conflicts between facts
  - Classifies severity (critical, moderate, minor)
  - Groups facts by entity and attribute

#### Phase 3A: Production Readiness (High Priority) ✅

- **Task 10**: Error Handling & Logging ✅
  - Structured logging with JSON output to stderr
  - Custom error classes (ValidationError, ProcessingError, etc.)
  - Comprehensive error context and stack traces
  - All tools updated with proper error handling

- **Task 7**: Python MCP Client ✅
  - `scripts/mcp_client.py` - Python wrapper for MCP tools
  - Methods for all 5 tools (extract_facts, extract_entities, etc.)
  - Automatic JSON parsing and error handling
  - Tested and working

### Directory Structure

```
.claude/mcp-server/
├── package.json              # Node.js package configuration
├── tsconfig.json             # TypeScript configuration
├── test-tools.js             # Test script for MCP tools
├── PHASE3_PLAN.md            # Phase 3 implementation plan
├── README.md                 # This file
├── src/
│   ├── index.ts             # Main MCP server (tool definitions & handlers)
│   ├── utils/               # Utilities ✅
│   │   ├── logger.ts        # Structured logging
│   │   └── errors.ts        # Custom error classes
│   └── tools/               # Tool implementations ✅
│       ├── fact-extract.ts
│       ├── entity-extract.ts
│       ├── citation-validate.ts
│       ├── source-rate.ts
│       └── conflict-detect.ts
├── dist/                    # Compiled JavaScript output
│   ├── index.js
│   ├── utils/
│   └── tools/
├── schemas/                 # JSON schemas for validation
│   ├── fact.json
│   ├── entity.json
│   └── citation.json
└── state/                   # State management
    ├── schema.sql           # Database schema
    └── research_state.db    # SQLite database

scripts/
└── mcp_client.py            # Python MCP client wrapper ✅
```

### MCP Tools Status

| Tool | Purpose | Status |
|------|---------|--------|
| `fact-extract` | Extract atomic facts from text with source attribution | ✅ Implemented & Tested |
| `entity-extract` | Extract named entities and relationships | ✅ Implemented & Tested |
| `citation-validate` | Validate citations for completeness and quality | ✅ Implemented & Tested |
| `source-rate` | Rate source quality on A-E scale | ✅ Implemented & Tested |
| `conflict-detect` | Detect conflicts between facts | ✅ Implemented & Tested |

### Installation

Before using the MCP server, install dependencies:

```bash
cd .claude/mcp-server
npm install
```

### Building

Compile TypeScript to JavaScript:

```bash
npm run build
```

### Running

Start the MCP server:

```bash
npm start
```

Or run in development mode with auto-rebuild:

```bash
npm run dev
```

### Testing

Test all MCP tools with the included test script:

```bash
cd .claude/mcp-server
node test-tools.js
```

Expected output:
```
Testing MCP Tools...

1. Testing fact-extract...
✓ fact-extract works
  Facts extracted: 1

2. Testing entity-extract...
✓ entity-extract works
  Entities found: 2
  Relationships found: 1

3. Testing citation-validate...
✓ citation-validate works
  Total citations: 2
  Complete citations: 1
  Issues found: 3

4. Testing source-rate...
✓ source-rate works
  Quality rating: A
  Justification: Peer-reviewed academic source

5. Testing conflict-detect...
✓ conflict-detect works
  Conflicts detected: 1
  Severity: {"critical":0,"moderate":1,"minor":0}

✅ All tests completed!
```

You can also test the Python MCP client:

```bash
python3 scripts/mcp_client.py
```

Expected output:
```
Testing MCP Client...

1. Testing fact extraction...
   ✓ Extracted 1 facts

2. Testing entity extraction...
   ✓ Found 2 entities
   ✓ Found 1 relationships

✅ All MCP client tests passed!
```

Test the StateManager:

```bash
python3 scripts/state_manager.py
```

### Next Steps (Phase 3B)

With Phase 1, Phase 2, and Phase 3A completed, Phase 3B will focus on:

1. **Task 8**: Batch Processing - Process multiple items in parallel
2. **Task 9**: Caching Layer - Reduce redundant processing
3. **Task 11**: API Documentation - Comprehensive usage guides

See `PHASE3_PLAN.md` for detailed implementation plan.
