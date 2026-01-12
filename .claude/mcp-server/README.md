# Deep Research MCP Server

## Phase 1 Refactoring - COMPLETED ✅

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

### Directory Structure

```
.claude/mcp-server/
├── package.json              # Node.js package configuration
├── tsconfig.json             # TypeScript configuration
├── README.md                 # This file
├── src/
│   ├── index.ts             # Main MCP server (tool definitions & handlers)
│   └── tools/               # Tool implementations (to be created in Phase 2)
│       ├── fact-extract.ts
│       ├── entity-extract.ts
│       ├── citation-validate.ts
│       ├── source-rate.ts
│       └── conflict-detect.ts
├── schemas/                 # JSON schemas for validation
│   ├── fact.json
│   ├── entity.json
│   └── citation.json
└── state/                   # State management
    ├── schema.sql           # Database schema
    └── research_state.db    # SQLite database
```

### MCP Tools Defined

| Tool | Purpose | Status |
|------|---------|--------|
| `fact-extract` | Extract atomic facts from text with source attribution | Schema ✅, Implementation pending |
| `entity-extract` | Extract named entities and relationships | Schema ✅, Implementation pending |
| `citation-validate` | Validate citations for completeness and quality | Schema ✅, Implementation pending |
| `source-rate` | Rate source quality on A-E scale | Defined ✅, Implementation pending |
| `conflict-detect` | Detect conflicts between facts | Defined ✅, Implementation pending |

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

### Next Steps (Phase 2)

According to the refactoring plan, Phase 2 will implement the MCP tools:

1. **Task 2**: Implement `fact-extract` tool
   - Port logic from `.claude/skills/fact-extractor`
   - Add JSON schema validation
   - Implement batch processing

2. **Task 3**: Implement `entity-extract` tool
   - Port NER logic from `.claude/skills/entity-extractor`
   - Add relationship detection
   - Track co-occurrences

3. **Task 4**: Implement `citation-validate` tool
   - Port validation logic from `.claude/skills/citation-validator`
   - Add URL accessibility checks
   - Implement quality scoring

4. **Task 5**: Implement `source-rate` tool
   - Extract from citation-validator
   - Define A-E rating criteria
   - Add justification generation

5. **Task 6**: Implement `conflict-detect` tool
   - Extract from fact-extractor
   - Implement comparison algorithms
   - Add explanation generation

### Testing

After Phase 2 implementation, test the MCP server:

```bash
# Run StateManager tests
python3 scripts/state_manager.py

# Test MCP tools (after implementation)
npm test
```
